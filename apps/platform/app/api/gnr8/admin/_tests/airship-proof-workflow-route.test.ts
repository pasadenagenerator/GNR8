import assert from "node:assert/strict";
import test from "node:test";

import { createAirshipProofWorkflowRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/proof-workflow/airship-proof-workflow-route-handlers";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";

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

function mappedReadback() {
  return {
    ...preparedReadback(),
    status: "mapped",
    finalHashes: [{ path: "index.html", hash: "final" }],
    mappingSummary: {
      hasChanges: true,
      entryCount: 1,
      safeEntryCount: 1,
      unsupportedEntryCount: 0,
      exactSafeApplyCandidateCount: 1,
    },
    draft: { idBefore: "draft-chs", versionBefore: 3, idAfter: "draft-chs", versionAfter: 3 },
    readback: "Mapped 1 captured HTML change into dry-run draft candidates; 1 safe exact candidate, 0 unsupported readback items.",
    nextRecommendedAction: "Review mapping readback, then apply with confirmed: true",
    diagnostics: ["airship_proof_workflow_mapped"],
    mappingReadback: { proofOnly: true, localManualOnly: true },
    mapping: {
      status: "mapped",
      proofOnly: true,
      dryRunOnly: true,
      hasChanges: true,
      entries: [],
      safeEntryCount: 1,
      unsupportedEntryCount: 0,
      readback: "Mapped 1 captured HTML change.",
      context: { migrationId: MIGRATION_ID },
      safety: { noDraftPersistence: true, noArtifactRegeneration: true, noPublishMutation: true },
      diagnostics: { beforeElementCount: 1, afterElementCount: 1, beforeSectionMarkers: [], afterSectionMarkers: [] },
    },
    mappedAgainstDraft: { id: "draft-chs", version: 3 },
  };
}

function service() {
  return {
    async readCurrentDraft() {
      return {
        id: "draft-chs",
        migrationId: MIGRATION_ID,
        version: 3,
        draftEdits: [],
      };
    },
    async updateDraftEditText() {
      throw new Error("not used by mocked route apply");
    },
  };
}

test("airship proof workflow route requires superadmin before prepare", async () => {
  let prepareCalls = 0;
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: service() as never,
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
    service: service() as never,
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
    service: service() as never,
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
    service: service() as never,
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
  const handlers = createAirshipProofWorkflowRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-proof",
    service: service() as never,
    getAirshipSingleSiteEditorReadonlyProjection: async () => ({
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
    }) as never,
    applyAirshipProofWorkflowMappings: async () => ({
      ...mappedReadback(),
      status: "applied_to_draft",
      appliedCount: 1,
      skippedCount: 0,
      draft: { idBefore: "draft-chs", versionBefore: 3, idAfter: "draft-chs", versionAfter: 4 },
      readback: "Captured edits saved to draft. Preview not regenerated yet.",
      nextRecommendedAction: "Apply / generate preview",
      mutationFlags: {
        draftDataMutation: true,
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
      safety: {
        noPublishMutation: true,
        noLivePointerMutation: true,
        noDnsMutation: true,
        noProviderMutation: true,
        noSourceCaptureImport: true,
      },
    }) as never,
  });

  const response = await handlers.POST(request({
    actionMode: "apply_confirmed",
    migrationId: MIGRATION_ID,
    mappedWorkflow: mappedReadback(),
    confirmed: true,
  }));
  const body = await response.json() as { ok: boolean; readback: ReturnType<typeof mappedReadback> & { mutationFlags: Record<string, boolean>; safety: Record<string, boolean> } };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(body.readback.readback, /Captured edits saved to draft/);
  assert.match(body.readback.readback, /Preview not regenerated yet/);
  assert.equal(body.readback.nextRecommendedAction, "Apply / generate preview");
  assert.equal(body.readback.mutationFlags.publishes, false);
  assert.equal(body.readback.mutationFlags.previewRegeneration, false);
  assert.equal(body.readback.mutationFlags.sourceCaptureImport, false);
  assert.equal(body.readback.mutationFlags.dnsMutation, false);
  assert.equal(body.readback.mutationFlags.providerMutation, false);
  assert.equal(body.readback.safety.noLivePointerMutation, true);
});
