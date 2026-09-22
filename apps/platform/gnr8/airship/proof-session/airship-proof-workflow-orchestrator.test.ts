import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type {
  AirshipSingleSiteDraftActor,
  AirshipSingleSiteDraftCreateInput,
  AirshipSingleSiteDraftRecord,
} from "../../single-site/airship-single-site-draft-service";
import type { ApplyAirshipCapturedMappingsToDraftInput } from "./airship-apply-captured-mappings-to-draft";
import {
  applyAirshipProofWorkflowMappings,
  captureAirshipProofWorkflowChanges,
  healthCheckOwnedAirshipProofWorkflowSession,
  mapAirshipProofWorkflowChanges,
  prepareAirshipProofWorkflow,
  startOwnedAirshipProofWorkflowSession,
  stopOwnedAirshipProofWorkflowSession,
} from "./airship-proof-workflow-orchestrator";
import { AirshipLocalSidecarProcessManager } from "./airship-local-sidecar-process-manager";

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const HERO_HEADLINE_BEFORE = "The CHS team helps your IT change with every technology wave.";
const HERO_HEADLINE_AFTER = "Captured workflow hero headline";

const actor: AirshipSingleSiteDraftActor = {
  actorId: "superadmin-airship-workflow-test",
  actorType: "human",
  actorRole: "platform_superadmin",
};

async function withWorkspaceRoot<T>(fn: (workspaceRoot: string) => Promise<T>): Promise<T> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "gnr8-airship-proof-workflow-test-"));
  try {
    return await fn(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
  if (!address || typeof address === "string") throw new Error("free_port_unavailable");
  return address.port;
}

function seed(): AirshipSingleSiteDraftCreateInput {
  return {
    migrationId: CHS_MIGRATION_ID,
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: "original-version",
      originalCloneRuntimeArtifactId: "original-artifact",
      improvedCandidateSiteVersionId: "candidate-version",
      improvedCandidateRuntimeArtifactId: "candidate-artifact",
    },
    draftEdits: [
      {
        id: `airship-${CHS_MIGRATION_ID}-home-headline`,
        fieldKey: "headline",
        sectionKey: "hero",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Current source headline.",
        proposedTextContent: "Less risk. More control. Better IT.",
        reasonForChange: "Operator editable hero headline.",
        status: "proposed",
        previewImpact: "Hero headline changes in the Airship draft preview only.",
      },
      {
        id: `airship-${CHS_MIGRATION_ID}-home-subheading`,
        fieldKey: "subheading",
        sectionKey: "hero",
        targetSectionPage: "Homepage / hero subheading",
        currentTextContentSummary: "Current source subheading.",
        proposedTextContent: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions.",
        reasonForChange: "Operator editable hero subheading.",
        status: "proposed",
        previewImpact: "Hero subheading changes in the Airship draft preview only.",
      },
      {
        id: `airship-${CHS_MIGRATION_ID}-home-cta`,
        fieldKey: "ctaLabel",
        sectionKey: "cta",
        targetSectionPage: "Homepage / contact call-to-action",
        currentTextContentSummary: "Current source contact CTA.",
        proposedTextContent: "Contact CHS",
        reasonForChange: "Operator editable CTA label.",
        status: "proposed",
        previewImpact: "CTA label changes in the Airship draft preview only.",
      },
    ],
    metadata: {
      serviceVersion: "airship-3-single-site-draft-service:v1",
      projectionVersion: "airship-1-single-site-editor-readonly:v1",
      previewPersistence: "saved_airship_draft",
      liveSiteUrl: "https://example.test/",
      liveBoundary: "not_applied_to_live_site",
    },
    actor,
  };
}

function record(input = seed(), overrides: Partial<AirshipSingleSiteDraftRecord> = {}): AirshipSingleSiteDraftRecord {
  return {
    id: `draft-${input.migrationId}`,
    migrationId: input.migrationId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    agencyId: input.agencyId,
    sourceUrl: input.sourceUrl,
    targetSiteVersionRefs: input.targetSiteVersionRefs,
    draftEdits: input.draftEdits,
    draftStatus: "draft",
    version: 3,
    semanticWatermark: "airship-single-site-editor-draft:test",
    metadata: input.metadata,
    createdByActorId: actor.actorId,
    updatedByActorId: actor.actorId,
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function fakeService(initialDraft = record()) {
  let current = initialDraft;
  const calls: string[] = [];
  return {
    calls,
    service: {
      async readCurrentDraft(migrationId: string) {
        calls.push(`read:${migrationId}`);
        return current;
      },
      async updateDraftEditText(input: Parameters<NonNullable<ApplyAirshipCapturedMappingsToDraftInput["service"]>["updateDraftEditText"]>[0]) {
        calls.push(`update:${input.draftEditId}`);
        current = {
          ...current,
          draftEdits: current.draftEdits.map((edit) =>
            edit.id === input.draftEditId
              ? { ...edit, proposedTextContent: input.proposedTextContent, status: "edited" }
              : edit,
          ),
          version: current.version + 1,
          updatedByActorId: input.actor.actorId,
        };
        return current;
      },
    },
    current: () => current,
  };
}

test("prepare returns workspace, command descriptor, and proof-only safety readback", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofWorkflow({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "workflow-prepare",
      targetPort: 4260,
      sessionPort: 4261,
    });

    assert.equal(prepared.status, "prepared");
    assert.equal(prepared.proofOnly, true);
    assert.equal(prepared.localManualOnly, true);
    assert.equal(prepared.workspacePath?.endsWith("workflow-prepare"), true);
    assert.equal(prepared.manualAirshipCommand?.manualOnly, true);
    assert.equal(prepared.manualAirshipCommand?.launchesProcess, false);
    assert.match(prepared.manualAirshipCommand?.commandLine ?? "", /@airshiplabs\/cli/);
    assert.equal(prepared.safety.proofOnlyManualLocal, true);
    assert.equal(prepared.safety.noAutoLaunch, true);
    assert.equal(prepared.safety.currentEditorRouteNotReplaced, true);
    assert.equal(prepared.mutationFlags.previewRegeneration, false);
    assert.equal(prepared.mutationFlags.publishes, false);
  });
});

test("CHS prepare starts owned fixture Airship session, health checks, and stops cleanly", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const manager = new AirshipLocalSidecarProcessManager();
    const targetPort = await freePort();
    const sessionPort = await freePort();
    const prepared = await prepareAirshipProofWorkflow({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "workflow-owned-fixture",
      targetPort,
      sessionPort,
    });
    let owned = await startOwnedAirshipProofWorkflowSession({ preparedWorkflow: prepared, manager });

    try {
      assert.equal(owned.status, "owned_airship_session_running");
      assert.equal(owned.chsOnly, true);
      assert.equal(owned.sidecarKind, "fixture_sidecar");
      assert.equal(owned.ownedAirshipSession?.realAirshipCliLaunched, false);
      assert.equal(owned.ownedAirshipSession?.health.status, "healthy");
      assert.equal(owned.ownedAirshipSession?.staticTargetUrl, `http://127.0.0.1:${targetPort}/`);
      assert.equal(owned.ownedAirshipSession?.airshipSessionUrl, `http://127.0.0.1:${sessionPort}/`);

      const health = await healthCheckOwnedAirshipProofWorkflowSession({
        preparedWorkflow: prepared,
        ownedAirshipSession: owned.ownedAirshipSession,
        manager,
      });
      assert.equal(health.status, "owned_airship_session_health_checked");
      assert.equal(health.ownedAirshipSession?.health.status, "healthy");

      const stopped = await stopOwnedAirshipProofWorkflowSession({
        preparedWorkflow: prepared,
        ownedAirshipSession: owned.ownedAirshipSession,
        manager,
      });
      owned = stopped;
      assert.equal(stopped.status, "owned_airship_session_stopped");
      assert.equal(stopped.ownedAirshipSession?.cleanup.status, "clean");
      assert.equal(stopped.ownedAirshipSession?.health.status, "stopped");
      assert.equal(stopped.mutationFlags.publishes, false);
      assert.equal(stopped.mutationFlags.sourceCaptureImport, false);
      assert.equal(stopped.mutationFlags.dnsMutation, false);
      assert.equal(stopped.mutationFlags.providerMutation, false);
    } finally {
      if (owned.ownedAirshipSession?.status === "running") {
        await stopOwnedAirshipProofWorkflowSession({ preparedWorkflow: prepared, ownedAirshipSession: owned.ownedAirshipSession, manager });
      }
    }
  });
});

test("non-CHS migration blocks ADAPTER 16 proof workflow prepare", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    await assert.rejects(
      () => prepareAirshipProofWorkflow({
        migrationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        workspaceRoot,
        sessionId: "workflow-non-chs",
      }),
      /airship_adapter_16_chs_only_flow/,
    );
  });
});

test("capture detects changed index.html", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofWorkflow({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "workflow-capture",
    });
    const htmlPath = join(prepared.workspacePath ?? "", "index.html");
    const html = await readFile(htmlPath, "utf8");
    await writeFile(htmlPath, html.replace(HERO_HEADLINE_BEFORE, HERO_HEADLINE_AFTER), "utf8");

    const captured = await captureAirshipProofWorkflowChanges({
      preparedWorkflow: prepared,
      sampleEditedString: HERO_HEADLINE_AFTER,
    });

    assert.equal(captured.status, "captured");
    assert.equal(captured.capture.indexHtmlChanged, true);
    assert.equal(captured.capture.sampleEditedStringFound, true);
    assert.equal(captured.finalHashes.some((hash) => hash.path === "index.html"), true);
    assert.equal(captured.nextRecommendedAction, "Map captured changes to draft candidates");
  });
});

test("map returns exact hero headline mapping from captured change", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareEditedWorkflow(workspaceRoot, "workflow-map");
    const captured = await captureAirshipProofWorkflowChanges({ preparedWorkflow: prepared });
    const mapped = await mapAirshipProofWorkflowChanges({
      preparedWorkflow: captured,
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
    });

    assert.equal(mapped.status, "mapped");
    assert.equal(mapped.mappingSummary?.entryCount, 1);
    assert.equal(mapped.mappingSummary?.safeEntryCount, 1);
    assert.equal(mapped.mapping.entries[0]?.changedElementMarker, "hero-headline");
    assert.equal(mapped.mapping.entries[0]?.draftFieldKey, "headline");
    assert.equal(mapped.mapping.entries[0]?.confidence, "exact");
    assert.equal(mapped.mapping.entries[0]?.nextText, HERO_HEADLINE_AFTER);
    assert.equal(mapped.draft.versionBefore, 3);
  });
});

test("apply with confirmation writes safe mapping to draft and keeps preview pending", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const mapped = await prepareCapturedAndMapped(workspaceRoot, "workflow-apply-confirmed");
    const fake = fakeService();

    const applied = await applyAirshipProofWorkflowMappings({
      mappedWorkflow: mapped,
      migrationId: CHS_MIGRATION_ID,
      draftSeed: seed(),
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
      confirmed: true,
      actor,
      service: fake.service,
    });

    assert.equal(applied.status, "applied_to_draft");
    assert.equal(applied.appliedCount, 1);
    assert.equal(applied.skippedCount, 0);
    assert.deepEqual(applied.appliedFieldNames, ["headline"]);
    assert.deepEqual(applied.skippedMappings, []);
    assert.equal(applied.draft.versionBefore, 3);
    assert.equal(applied.draft.versionAfter, 4);
    assert.equal(fake.current().draftEdits.find((edit) => edit.fieldKey === "headline")?.proposedTextContent, HERO_HEADLINE_AFTER);
    assert.match(applied.readback, /Captured edits saved to draft/);
    assert.match(applied.readback, /Preview not regenerated yet/);
    assert.equal(applied.nextRecommendedAction, "Apply / generate preview");
    assert.equal(applied.mutationFlags.draftDataMutation, true);
    assert.equal(applied.mutationFlags.previewRegeneration, false);
  });
});

test("apply without confirmation is rejected", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const mapped = await prepareCapturedAndMapped(workspaceRoot, "workflow-apply-unconfirmed");
    const fake = fakeService();

    const applied = await applyAirshipProofWorkflowMappings({
      mappedWorkflow: mapped,
      migrationId: CHS_MIGRATION_ID,
      draftSeed: seed(),
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
      confirmed: false,
      actor,
      service: fake.service,
    });

    assert.equal(applied.status, "blocked");
    assert.equal(applied.appliedCount, 0);
    assert.deepEqual(applied.appliedFieldNames, []);
    assert.equal(applied.applyReadback?.diagnostics.includes("airship_captured_mapping_apply_confirmation_required"), true);
    assert.equal(fake.calls.length, 0);
  });
});

test("unsupported mapping is skipped", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofWorkflow({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "workflow-unsupported",
    });
    const htmlPath = join(prepared.workspacePath ?? "", "index.html");
    const html = await readFile(htmlPath, "utf8");
    await writeFile(htmlPath, html.replace("CHS Airship MVP demo", "CHS Airship MVP demo changed outside markers"), "utf8");
    const captured = await captureAirshipProofWorkflowChanges({ preparedWorkflow: prepared });
    const mapped = await mapAirshipProofWorkflowChanges({
      preparedWorkflow: captured,
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
    });
    const fake = fakeService();

    const applied = await applyAirshipProofWorkflowMappings({
      mappedWorkflow: mapped,
      migrationId: CHS_MIGRATION_ID,
      draftSeed: seed(),
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
      confirmed: true,
      actor,
      service: fake.service,
    });

    assert.equal(mapped.mapping.entries[0]?.confidence, "unsupported");
    assert.equal(applied.status, "applied_to_draft");
    assert.equal(applied.appliedCount, 0);
    assert.equal(applied.skippedCount, 1);
    assert.deepEqual(applied.appliedFieldNames, []);
    assert.equal(applied.applyReadback?.skippedMappings[0]?.reason, "mapping_not_exact_safe_apply_candidate");
    assert.deepEqual(fake.calls, [`read:${CHS_MIGRATION_ID}`]);
  });
});

test("stale mapped draft version is rejected before draft mutation", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const mapped = await prepareCapturedAndMapped(workspaceRoot, "workflow-stale-version");
    const fake = fakeService(record(seed(), { version: 4 }));

    const applied = await applyAirshipProofWorkflowMappings({
      mappedWorkflow: mapped,
      migrationId: CHS_MIGRATION_ID,
      draftSeed: seed(),
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 4 },
      confirmed: true,
      actor,
      service: fake.service,
    });

    assert.equal(applied.status, "blocked");
    assert.equal(applied.appliedCount, 0);
    assert.deepEqual(applied.appliedFieldNames, []);
    assert.equal(applied.skippedMappings[0]?.reason, "stale_mapping_blocked");
    assert.equal(applied.diagnostics.includes("airship_proof_workflow_stale_mapping_draft_version"), true);
    assert.equal(applied.applyReadback, null);
    assert.equal(fake.calls.length, 0);
  });
});

test("final readback exposes no auto-launch, preview, publish, live, provider, or editor-route mutation flags", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const mapped = await prepareCapturedAndMapped(workspaceRoot, "workflow-safety-flags");
    const fake = fakeService();
    const applied = await applyAirshipProofWorkflowMappings({
      mappedWorkflow: mapped,
      migrationId: CHS_MIGRATION_ID,
      draftSeed: seed(),
      expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
      confirmed: true,
      actor,
      service: fake.service,
    });

    assert.equal(applied.safety.noAutoLaunch, true);
    assert.equal(applied.safety.noPreviewRegeneration, true);
    assert.equal(applied.safety.noPublishMutation, true);
    assert.equal(applied.safety.noLivePointerMutation, true);
    assert.equal(applied.safety.noDnsMutation, true);
    assert.equal(applied.safety.noProviderMutation, true);
    assert.equal(applied.safety.noSourceCaptureImport, true);
    assert.equal(applied.safety.currentEditorRouteNotReplaced, true);
    assert.equal(applied.mutationFlags.previewRegeneration, false);
    assert.equal(applied.mutationFlags.publishes, false);
    assert.equal(applied.mutationFlags.activePointerMutation, false);
    assert.equal(applied.mutationFlags.editorRouteReplacement, false);
    assert.match(applied.readback, /Preview not regenerated yet/);
  });
});

async function prepareEditedWorkflow(workspaceRoot: string, sessionId: string) {
  const prepared = await prepareAirshipProofWorkflow({
    migrationId: CHS_MIGRATION_ID,
    workspaceRoot,
    sessionId,
  });
  const htmlPath = join(prepared.workspacePath ?? "", "index.html");
  const html = await readFile(htmlPath, "utf8");
  await writeFile(htmlPath, html.replace(HERO_HEADLINE_BEFORE, HERO_HEADLINE_AFTER), "utf8");
  return prepared;
}

async function prepareCapturedAndMapped(workspaceRoot: string, sessionId: string) {
  const prepared = await prepareEditedWorkflow(workspaceRoot, sessionId);
  const captured = await captureAirshipProofWorkflowChanges({ preparedWorkflow: prepared });
  return mapAirshipProofWorkflowChanges({
    preparedWorkflow: captured,
    expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
  });
}
