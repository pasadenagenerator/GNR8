import assert from "node:assert/strict";
import test from "node:test";

import { createAirshipProofWorkflowRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/proof-workflow/airship-proof-workflow-route-handlers";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const HERO_HEADLINE_BEFORE = "The CHS team helps your IT change with every technology wave.";
const HERO_HEADLINE_AFTER = "The XXX team helps your IT change with every technology wave.";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/proof-workflow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function preparedReadback() {
  return {
    proofOnly: true,
    localManualOnly: true,
    serviceVersion: "airship-adapter-09-proof-workflow-orchestrator:v1",
    status: "prepared",
    workspacePath: "/tmp/gnr8-airship-proof/session-1",
    targetUrl: "http://127.0.0.1:4178/",
    expectedAirshipSessionUrl: "http://127.0.0.1:4179/",
    manualAirshipCommand: {
      executable: "npx",
      args: ["@airshiplabs/cli"],
      cwd: "/tmp/gnr8-airship-proof/session-1",
      commandLine: "npx @airshiplabs/cli --target http://127.0.0.1:4178/",
      manualOnly: true,
      launchesProcess: false,
      description: "Manual Airship sidecar command.",
    },
    initialHashes: [{ path: "index.html", hash: "initial" }],
    finalHashes: [],
    mappingSummary: null,
    appliedCount: 0,
    skippedCount: 0,
    draft: { idBefore: null, versionBefore: null, idAfter: null, versionAfter: null },
    readback: "Airship proof workspace prepared for manual local editing.",
    nextRecommendedAction: "Start local runner, run manual Airship CLI command, then capture changes",
    safety: { proofOnlyManualLocal: true, noAutoLaunch: true },
    mutationFlags: {
      draftDataMutation: false,
      runtimeVersionMutation: false,
      activePointerMutation: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      artifactRegeneration: false,
      previewRegeneration: false,
      sourceCaptureImport: false,
      dnsMutation: false,
      providerMutation: false,
      editorRouteReplacement: false,
    },
    warnings: [],
    diagnostics: ["airship_proof_workflow_prepared"],
    preparedSession: {
      proofOnly: true,
      localManualOnly: true,
      selectedArtifact: {
        key: "chs-polished-demo",
        migrationId: MIGRATION_ID,
        importedSite: "chs.si",
        sourceUrl: "https://www.chs.si/",
        runtimeSiteId: "runtime-chs",
        siteVersionId: "site-version-chs",
        artifactId: "artifact-chs",
        htmlPath: "/",
      },
      workspacePath: "/tmp/gnr8-airship-proof/session-1",
      targetUrl: "http://127.0.0.1:4178/",
      targetPort: 4178,
      sessionPort: 4179,
      expectedAirshipSessionUrl: "http://127.0.0.1:4179/",
      healthReadbackUrl: null,
      localRunnerCommand: {
        executable: "pnpm",
        args: ["dev"],
        cwd: "/tmp/gnr8-airship-proof/session-1",
        commandLine: "pnpm dev",
        manualOnly: true,
        launchesProcess: false,
        description: "Manual local static runner command.",
      },
      manualAirshipCommand: {
        executable: "npx",
        args: ["@airshiplabs/cli"],
        cwd: "/tmp/gnr8-airship-proof/session-1",
        commandLine: "npx @airshiplabs/cli --target http://127.0.0.1:4178/",
        manualOnly: true,
        launchesProcess: false,
        description: "Manual Airship sidecar command.",
      },
      initialHashes: [{ path: "index.html", hash: "initial" }],
      adapterSession: { sessionId: "session-1" },
      warnings: [],
      safety: {
        proofOnlyGuard: true,
        noAutoLaunch: true,
        noLivePointerMutation: true,
        noPublishMutation: true,
        noDnsMutation: true,
        noProviderMutation: true,
        noSourceCaptureImport: true,
        noDraftPersistence: true,
      },
    },
  };
}

function exactHeadlineMappingEntry(overrides: Record<string, unknown> = {}) {
  return {
    changeKind: "text",
    changedElementMarker: "hero-headline",
    elementIndex: null,
    sectionMarker: "hero",
    previousText: HERO_HEADLINE_BEFORE,
    nextText: HERO_HEADLINE_AFTER,
    draftFieldKey: "headline",
    confidence: "exact",
    reason: "Known Airship hero headline marker maps to the hero headline draft field.",
    readback: "hero-headline maps to draft field headline with exact confidence.",
    safeToApplyLater: true,
    ...overrides,
  };
}

function mappedReadback(options: { entries?: Array<Record<string, unknown>>; draftVersion?: number } = {}) {
  const entries = options.entries ?? [exactHeadlineMappingEntry()];
  const safeEntryCount = entries.filter((entry) => entry.safeToApplyLater === true).length;
  const unsupportedEntryCount = entries.filter((entry) => entry.confidence === "unsupported").length;
  const exactSafeApplyCandidateCount = entries.filter((entry) => entry.confidence === "exact" && entry.safeToApplyLater === true).length;
  const draftVersion = options.draftVersion ?? 3;
  return {
    ...preparedReadback(),
    status: "mapped",
    finalHashes: [{ path: "index.html", hash: "final" }],
    mappingSummary: {
      hasChanges: true,
      entryCount: entries.length,
      safeEntryCount,
      unsupportedEntryCount,
      exactSafeApplyCandidateCount,
    },
    draft: { idBefore: "draft-chs", versionBefore: draftVersion, idAfter: "draft-chs", versionAfter: draftVersion },
    readback: `Mapped ${entries.length} captured HTML change into dry-run draft candidates; ${exactSafeApplyCandidateCount} safe exact candidate, ${unsupportedEntryCount} unsupported readback items.`,
    nextRecommendedAction: "Review mapping readback, then apply with confirmed: true",
    diagnostics: ["airship_proof_workflow_mapped"],
    mappingReadback: { proofOnly: true, localManualOnly: true },
    mapping: {
      status: "mapped",
      proofOnly: true,
      dryRunOnly: true,
      hasChanges: true,
      entries,
      safeEntryCount,
      unsupportedEntryCount,
      readback: "Mapped 1 captured HTML change.",
      context: { migrationId: MIGRATION_ID },
      safety: { noDraftPersistence: true, noArtifactRegeneration: true, noPublishMutation: true },
      diagnostics: { beforeElementCount: 1, afterElementCount: 1, beforeSectionMarkers: [], afterSectionMarkers: [] },
    },
    mappedAgainstDraft: { id: "draft-chs", version: draftVersion },
  };
}

function projection() {
  return {
    migrationId: MIGRATION_ID,
    sourceUrl: "https://www.chs.si/",
    liveSiteUrl: "https://www.chs.si/",
    studioSourceTruth: { tenantId: "tenant", clientId: "client", siteId: "site" },
    previews: {
      originalClone: { siteVersionId: "original", runtimeArtifactId: "original-artifact" },
      currentImprovedPublished: { siteVersionId: "candidate", runtimeArtifactId: "candidate-artifact" },
    },
    draftPanel: {
      drafts: [
        {
          id: "airship-chs-home-hero-headline",
          fieldKey: "headline",
          sectionKey: "hero",
          targetSectionPage: "Homepage / hero headline",
          currentTextContentSummary: "Current",
          proposedTextContent: "Before",
          reasonForChange: "Proof",
          status: "edited",
          previewImpact: "Draft only",
        },
      ],
      draftPreview: { persistence: "saved_airship_draft" },
      persistence: { styleSettings: {} },
    },
  };
}

function fakeDraftService(input: { version?: number; headline?: string } = {}) {
  let current = {
    id: "draft-chs",
    migrationId: MIGRATION_ID,
    version: input.version ?? 3,
    draftEdits: [
      {
        id: "airship-chs-home-hero-headline",
        fieldKey: "headline",
        sectionKey: "hero",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Current",
        proposedTextContent: input.headline ?? "Before",
        reasonForChange: "Proof",
        status: "edited",
        previewImpact: "Draft only",
      },
    ],
  };
  const calls: string[] = [];
  return {
    calls,
    current: () => current,
    service: {
      async readCurrentDraft(migrationId: string) {
        calls.push(`read:${migrationId}`);
        return current;
      },
      async updateDraftEditText(input: { draftEditId: string; proposedTextContent: string; actor: { actorId: string } }) {
        calls.push(`update:${input.draftEditId}`);
        current = {
          ...current,
          version: current.version + 1,
          draftEdits: current.draftEdits.map((edit) =>
            edit.id === input.draftEditId || edit.fieldKey === input.draftEditId
              ? { ...edit, proposedTextContent: input.proposedTextContent, status: "edited" }
              : edit,
          ),
        };
        return current;
      },
    },
  };
}

test("airship proof workflow route requires superadmin before prepare", async () => {
  let prepareCalls = 0;
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: fakeDraftService().service as never,
    prepareAirshipProofWorkflow: async () => {
      prepareCalls += 1;
      return preparedReadback() as never;
    },
  });

  const response = await handlers.POST(request({ actionMode: "prepare", migrationId: MIGRATION_ID }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(prepareCalls, 0);
  assert.equal(body.diagnostics.includes("airship_proof_workflow_superadmin_required"), true);
  assert.equal(body.mutationFlags.publishes, false);
});

test("airship proof workflow prepare returns manual CLI command and workspace readback", async () => {
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fakeDraftService().service as never,
    prepareAirshipProofWorkflow: async () => preparedReadback() as never,
  });

  const response = await handlers.POST(request({ actionMode: "prepare", migrationId: MIGRATION_ID }));
  const body = await response.json() as { ok: boolean; readback: ReturnType<typeof preparedReadback>; labels: string[] };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.readback.workspacePath, "/tmp/gnr8-airship-proof/session-1");
  assert.match(body.readback.manualAirshipCommand.commandLine, /@airshiplabs\/cli/);
  assert.equal(body.readback.manualAirshipCommand.manualOnly, true);
  assert.equal(body.labels.includes("Proof-only"), true);
});

test("airship proof workflow capture and map displays exact mapping summary", async () => {
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fakeDraftService().service as never,
    captureAirshipProofWorkflowChanges: async () => ({ ...preparedReadback(), status: "captured" }) as never,
    mapAirshipProofWorkflowChanges: async () => mappedReadback() as never,
  });

  const response = await handlers.POST(request({
    actionMode: "capture_map",
    migrationId: MIGRATION_ID,
    preparedWorkflow: preparedReadback(),
  }));
  const body = await response.json() as { ok: boolean; readback: { mapped: ReturnType<typeof mappedReadback>; mappingSummary: ReturnType<typeof mappedReadback>["mappingSummary"] } };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.readback.mappingSummary?.exactSafeApplyCandidateCount, 1);
  assert.equal(body.readback.mappingSummary?.unsupportedEntryCount, 0);
  assert.equal(body.readback.mapped.draft.versionBefore, 3);
});

test("airship proof workflow apply without confirmation is rejected", async () => {
  let applyCalls = 0;
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fakeDraftService().service as never,
    applyAirshipProofWorkflowMappings: async () => {
      applyCalls += 1;
      return { ...mappedReadback(), status: "applied_to_draft" } as never;
    },
  });

  const response = await handlers.POST(request({
    actionMode: "apply_confirmed",
    migrationId: MIGRATION_ID,
    mappedWorkflow: mappedReadback(),
    confirmed: false,
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(applyCalls, 0);
  assert.equal(body.diagnostics.includes("airship_proof_workflow_apply_confirmation_required"), true);
  assert.equal(body.mutationFlags.draftDataMutation, false);
});

test("airship proof workflow confirmed apply shows saved-to-draft readback and preserves no-live mutation flags", async () => {
  const fake = fakeDraftService();
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fake.service as never,
    getAirshipSingleSiteEditorReadonlyProjection: async () => projection() as never,
  });

  const response = await handlers.POST(request({
    actionMode: "apply_confirmed",
    migrationId: MIGRATION_ID,
    mappedWorkflow: mappedReadback(),
    confirmed: true,
  }));
  const body = await response.json() as {
    ok: boolean;
    readback: ReturnType<typeof mappedReadback> & {
      appliedFieldNames: string[];
      skippedMappings: Array<{ reason: string }>;
      mutationFlags: Record<string, boolean>;
      safety: Record<string, boolean>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(body.readback.readback, /Captured edits saved to draft/);
  assert.match(body.readback.readback, /Preview not regenerated yet/);
  assert.equal(body.readback.appliedCount, 1);
  assert.deepEqual(body.readback.appliedFieldNames, ["headline"]);
  assert.deepEqual(body.readback.skippedMappings, []);
  assert.equal(body.readback.draft.versionBefore, 3);
  assert.equal(body.readback.draft.versionAfter, 4);
  assert.equal(fake.current().draftEdits.find((edit) => edit.fieldKey === "headline")?.proposedTextContent, HERO_HEADLINE_AFTER);
  assert.equal(body.readback.nextRecommendedAction, "Apply / generate preview");
  assert.equal(body.readback.mutationFlags.publishes, false);
  assert.equal(body.readback.mutationFlags.previewRegeneration, false);
  assert.equal(body.readback.mutationFlags.sourceCaptureImport, false);
  assert.equal(body.readback.mutationFlags.dnsMutation, false);
  assert.equal(body.readback.mutationFlags.providerMutation, false);
  assert.equal(body.readback.safety.noLivePointerMutation, true);
});

test("airship proof workflow route blocks stale draft version before updating draft", async () => {
  const fake = fakeDraftService({ version: 4 });
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fake.service as never,
    getAirshipSingleSiteEditorReadonlyProjection: async () => projection() as never,
  });

  const response = await handlers.POST(request({
    actionMode: "apply_confirmed",
    migrationId: MIGRATION_ID,
    mappedWorkflow: mappedReadback({ draftVersion: 3 }),
    confirmed: true,
  }));
  const body = await response.json() as {
    ok: boolean;
    readback: ReturnType<typeof mappedReadback> & {
      diagnostics: string[];
      appliedFieldNames: string[];
      skippedMappings: Array<{ reason: string }>;
      mutationFlags: Record<string, boolean>;
    };
  };

  assert.equal(response.status, 409);
  assert.equal(body.ok, true);
  assert.equal(body.readback.status, "blocked");
  assert.equal(body.readback.appliedCount, 0);
  assert.deepEqual(body.readback.appliedFieldNames, []);
  assert.equal(body.readback.skippedMappings[0]?.reason, "stale_mapping_blocked");
  assert.equal(body.readback.diagnostics.includes("airship_proof_workflow_stale_mapping_draft_version"), true);
  assert.equal(body.readback.mutationFlags.draftDataMutation, false);
  assert.deepEqual(fake.calls, [`read:${MIGRATION_ID}`]);
});

test("airship proof workflow route skips unsupported and probable mappings", async () => {
  const fake = fakeDraftService();
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: fake.service as never,
    getAirshipSingleSiteEditorReadonlyProjection: async () => projection() as never,
  });
  const unsupported = exactHeadlineMappingEntry({
    changedElementMarker: "unknown-copy",
    draftFieldKey: null,
    confidence: "unsupported",
    safeToApplyLater: false,
    reason: "Unknown marked copy is not a supported draft target.",
  });
  const probable = exactHeadlineMappingEntry({
    changedElementMarker: "hero-body",
    draftFieldKey: "subheading",
    confidence: "probable",
    safeToApplyLater: true,
    reason: "Probable body mapping requires operator review.",
  });

  const response = await handlers.POST(request({
    actionMode: "apply_confirmed",
    migrationId: MIGRATION_ID,
    mappedWorkflow: mappedReadback({ entries: [unsupported, probable] }),
    confirmed: true,
  }));
  const body = await response.json() as {
    ok: boolean;
    readback: ReturnType<typeof mappedReadback> & {
      appliedFieldNames: string[];
      skippedMappings: Array<{ confidence: string; reason: string }>;
      mutationFlags: Record<string, boolean>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.readback.status, "applied_to_draft");
  assert.equal(body.readback.appliedCount, 0);
  assert.equal(body.readback.skippedCount, 2);
  assert.deepEqual(body.readback.appliedFieldNames, []);
  assert.deepEqual(body.readback.skippedMappings.map((item) => item.reason), [
    "mapping_not_exact_safe_apply_candidate",
    "mapping_not_exact_safe_apply_candidate",
  ]);
  assert.deepEqual(body.readback.skippedMappings.map((item) => item.confidence), ["unsupported", "probable"]);
  assert.equal(body.readback.mutationFlags.draftDataMutation, false);
  assert.deepEqual(fake.calls, [`read:${MIGRATION_ID}`, `read:${MIGRATION_ID}`]);
});
