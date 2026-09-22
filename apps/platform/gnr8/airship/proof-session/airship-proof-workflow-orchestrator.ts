import "server-only";

import type {
  AirshipSingleSiteDraftActor,
  AirshipSingleSiteDraftSeed,
  AirshipSingleSiteDraftService,
} from "../../single-site/airship-single-site-draft-service";
import type { BuilderFileHash } from "../adapter/builder-adapter";
import {
  applyAirshipCapturedMappingsToDraft,
  type ApplyAirshipCapturedMappingsToDraftReadback,
} from "./airship-apply-captured-mappings-to-draft";
import type {
  AirshipCapturedDiffToDraftMappingResult,
  AirshipKnownDraftFieldMapping,
} from "./airship-captured-diff-to-draft-mapper";
import {
  captureAirshipProofSessionChanges,
  AIRSHIP_PROOF_SESSION_CHS_MIGRATION_ID,
  mapAirshipProofSessionCapturedDiffToDraft,
  prepareAirshipProofSessionEntry,
  type AirshipProofCaptureReadback,
  type AirshipProofCapturedDiffDraftMappingReadback,
  type AirshipProofSessionReadback,
  type PrepareAirshipProofSessionInput,
  type ProofCommandDescriptor,
} from "./airship-proof-session-entry";
import {
  AirshipLocalSidecarProcessManager,
  type AirshipLocalSidecarCommandDescriptor,
  type AirshipLocalSidecarSessionReadback,
} from "./airship-local-sidecar-process-manager";

export const AIRSHIP_PROOF_WORKFLOW_ORCHESTRATOR_VERSION = "airship-adapter-09-proof-workflow-orchestrator:v1" as const;

export type AirshipProofWorkflowStatus =
  | "prepared"
  | "owned_airship_session_running"
  | "owned_airship_session_health_checked"
  | "owned_airship_session_stopped"
  | "captured"
  | "mapped"
  | "applied_to_draft"
  | "blocked"
  | "failed";

export type AirshipProofWorkflowSafety = {
  proofOnlyManualLocal: true;
  noAutoLaunch: true;
  noPreviewRegeneration: true;
  noArtifactRegeneration: true;
  noPublishMutation: true;
  noLivePointerMutation: true;
  noDnsMutation: true;
  noProviderMutation: true;
  noSourceCaptureImport: true;
  noExternalAiProviderCall: true;
  noCustomerDomainMutation: true;
  noProductionReplacementUi: true;
  currentEditorRouteNotReplaced: true;
};

export type AirshipProofWorkflowDraftRef = {
  id?: string | null;
  version: number;
};

export type AirshipProofWorkflowMappingSummary = {
  hasChanges: boolean;
  entryCount: number;
  safeEntryCount: number;
  unsupportedEntryCount: number;
  exactSafeApplyCandidateCount: number;
};

export type AirshipProofWorkflowDraftReadback = {
  idBefore: string | null;
  versionBefore: number | null;
  idAfter: string | null;
  versionAfter: number | null;
};

type AirshipProofWorkflowBaseReadback = {
  proofOnly: true;
  localManualOnly: true;
  serviceVersion: typeof AIRSHIP_PROOF_WORKFLOW_ORCHESTRATOR_VERSION;
  status: AirshipProofWorkflowStatus;
  workspacePath: string | null;
  manualAirshipCommand: ProofCommandDescriptor | null;
  initialHashes: BuilderFileHash[];
  finalHashes: BuilderFileHash[];
  mappingSummary: AirshipProofWorkflowMappingSummary | null;
  appliedCount: number;
  skippedCount: number;
  appliedFieldNames: string[];
  skippedMappings: ApplyAirshipCapturedMappingsToDraftReadback["skippedMappings"];
  draft: AirshipProofWorkflowDraftReadback;
  readback: string;
  nextRecommendedAction: string;
  safety: AirshipProofWorkflowSafety;
  mutationFlags: {
    draftDataMutation: boolean;
    runtimeVersionMutation: false;
    activePointerMutation: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    artifactRegeneration: false;
    previewRegeneration: false;
    sourceCaptureImport: false;
    dnsMutation: false;
    providerMutation: false;
    editorRouteReplacement: false;
  };
  warnings: string[];
  diagnostics: string[];
};

export type AirshipProofWorkflowPreparedReadback = AirshipProofWorkflowBaseReadback & {
  status: "prepared";
  preparedSession: AirshipProofSessionReadback;
};

export type AirshipProofWorkflowCapturedReadback = AirshipProofWorkflowBaseReadback & {
  status: "captured";
  preparedSession: AirshipProofSessionReadback;
  capture: AirshipProofCaptureReadback;
};

export type AirshipProofWorkflowMappedReadback = AirshipProofWorkflowBaseReadback & {
  status: "mapped";
  preparedSession: AirshipProofSessionReadback;
  mappingReadback: AirshipProofCapturedDiffDraftMappingReadback;
  mapping: AirshipCapturedDiffToDraftMappingResult;
  mappedAgainstDraft: AirshipProofWorkflowDraftRef | null;
};

export type AirshipProofWorkflowApplyReadback = AirshipProofWorkflowBaseReadback & {
  status: "applied_to_draft" | "blocked";
  preparedSession: AirshipProofSessionReadback;
  mappingReadback: AirshipProofCapturedDiffDraftMappingReadback;
  mapping: AirshipCapturedDiffToDraftMappingResult;
  mappedAgainstDraft: AirshipProofWorkflowDraftRef | null;
  applyReadback: ApplyAirshipCapturedMappingsToDraftReadback | null;
};

export type PrepareAirshipProofWorkflowInput = PrepareAirshipProofSessionInput;

export type AirshipProofWorkflowOwnedSidecarReadback = AirshipProofWorkflowBaseReadback & {
  status: "owned_airship_session_running" | "owned_airship_session_health_checked" | "owned_airship_session_stopped" | "blocked";
  chsOnly: true;
  adapter16Flow: "one_session_chs_operator_flow";
  sidecarKind: "fixture_sidecar" | "real_airship_cli_sidecar" | "manual_command_only" | "not_owned";
  ownedAirshipSession: AirshipLocalSidecarSessionReadback | null;
  changedFilesCount: number;
  generatedInternalPreviewUrl: string | null;
};

export type StartOwnedAirshipProofWorkflowSessionInput = {
  preparedWorkflow: AirshipProofWorkflowPreparedReadback;
  manager?: AirshipLocalSidecarProcessManager;
  startRealAirshipCli?: boolean;
};

export type OwnedAirshipProofWorkflowSessionInput = {
  preparedWorkflow: AirshipProofWorkflowPreparedReadback;
  ownedAirshipSession: AirshipLocalSidecarSessionReadback;
  manager?: AirshipLocalSidecarProcessManager;
};

export type CaptureAirshipProofWorkflowChangesInput = {
  preparedWorkflow: AirshipProofWorkflowPreparedReadback;
  sampleEditedString?: string | null;
};

export type MapAirshipProofWorkflowChangesInput = {
  preparedWorkflow: AirshipProofWorkflowPreparedReadback | AirshipProofWorkflowCapturedReadback;
  knownDraftFieldMappings?: AirshipKnownDraftFieldMapping[] | null;
  expectedDraft?: AirshipProofWorkflowDraftRef | null;
};

export type ApplyAirshipProofWorkflowMappingsInput = {
  mappedWorkflow: AirshipProofWorkflowMappedReadback;
  migrationId: string;
  draftSeed: AirshipSingleSiteDraftSeed;
  expectedDraft: AirshipProofWorkflowDraftRef;
  confirmed: boolean;
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  service?: Pick<AirshipSingleSiteDraftService, "readCurrentDraft" | "updateDraftEditText">;
};

export async function prepareAirshipProofWorkflow(input: PrepareAirshipProofWorkflowInput): Promise<AirshipProofWorkflowPreparedReadback> {
  assertAdapter16ChsOnly(input.migrationId);
  const preparedSession = await prepareAirshipProofSessionEntry(input);
  return {
    ...baseReadback({
      status: "prepared",
      preparedSession,
      finalHashes: [],
      mapping: null,
      appliedCount: 0,
      skippedCount: 0,
      draft: emptyDraftReadback(),
      readback: "Airship proof workspace prepared for manual local editing.",
      nextRecommendedAction: "Start local runner, run manual Airship CLI command, then capture changes",
      warnings: preparedSession.warnings,
      diagnostics: ["airship_proof_workflow_prepared", "manual_airship_cli_only", "no_auto_launch"],
    }),
    status: "prepared",
    preparedSession,
  };
}

export async function startOwnedAirshipProofWorkflowSession(
  input: StartOwnedAirshipProofWorkflowSessionInput,
): Promise<AirshipProofWorkflowOwnedSidecarReadback> {
  assertAdapter16ChsOnly(input.preparedWorkflow.preparedSession.selectedArtifact.migrationId);
  const manager = input.manager ?? defaultAirshipProofWorkflowSidecarManager;
  const session = await manager.startSession({
    sessionId: `owned-${input.preparedWorkflow.preparedSession.adapterSession.sessionId}`,
    workspacePath: input.preparedWorkflow.preparedSession.workspacePath,
    targetPort: input.preparedWorkflow.preparedSession.targetPort,
    airshipPort: input.preparedWorkflow.preparedSession.sessionPort,
    startRealAirshipCli: input.startRealAirshipCli === true,
    airshipCommand: input.startRealAirshipCli === true
      ? undefined
      : airshipFixtureCommand({
        port: input.preparedWorkflow.preparedSession.sessionPort,
        cwd: input.preparedWorkflow.preparedSession.workspacePath,
      }),
  });

  return ownedSidecarReadback({
    status: "owned_airship_session_running",
    preparedWorkflow: input.preparedWorkflow,
    ownedAirshipSession: session,
    sidecarKind: session.realAirshipCliLaunched ? "real_airship_cli_sidecar" : "fixture_sidecar",
    readback: session.realAirshipCliLaunched
      ? "Owned local static target and real Airship CLI sidecar are running for the CHS proof session."
      : "Owned local static target and Airship-like fixture sidecar are running for the CHS proof session.",
    nextRecommendedAction: "Open Airship editor, make CHS text edits, return to GNR8, then stop or capture.",
    diagnostics: [
      "airship_adapter_16_owned_session_started",
      session.realAirshipCliLaunched ? "real_airship_cli_sidecar_launched" : "fixture_sidecar_launched_for_automated_or_local_proof",
    ],
  });
}

export async function healthCheckOwnedAirshipProofWorkflowSession(
  input: OwnedAirshipProofWorkflowSessionInput,
): Promise<AirshipProofWorkflowOwnedSidecarReadback> {
  assertAdapter16ChsOnly(input.preparedWorkflow.preparedSession.selectedArtifact.migrationId);
  const manager = input.manager ?? defaultAirshipProofWorkflowSidecarManager;
  const health = await manager.healthCheck(input.ownedAirshipSession);
  const session: AirshipLocalSidecarSessionReadback = input.ownedAirshipSession.ownedByManager
    ? await manager.status(input.ownedAirshipSession)
    : { ...input.ownedAirshipSession, health, status: localSessionStatusFromHealth(health.status) };

  return ownedSidecarReadback({
    status: "owned_airship_session_health_checked",
    preparedWorkflow: input.preparedWorkflow,
    ownedAirshipSession: session,
    sidecarKind: session.ownedByManager
      ? session.realAirshipCliLaunched ? "real_airship_cli_sidecar" : "fixture_sidecar"
      : "not_owned",
    readback: `Owned Airship session health is ${health.status}.`,
    nextRecommendedAction: health.status === "healthy"
      ? "Open Airship editor or continue editing; return to GNR8 to stop and capture."
      : "Review sidecar process status before opening Airship.",
    diagnostics: ["airship_adapter_16_owned_session_health_checked", `health:${health.status}`],
  });
}

export async function stopOwnedAirshipProofWorkflowSession(
  input: OwnedAirshipProofWorkflowSessionInput,
): Promise<AirshipProofWorkflowOwnedSidecarReadback> {
  assertAdapter16ChsOnly(input.preparedWorkflow.preparedSession.selectedArtifact.migrationId);
  const manager = input.manager ?? defaultAirshipProofWorkflowSidecarManager;
  const session = await manager.stopSession(input.ownedAirshipSession);

  return ownedSidecarReadback({
    status: session.status === "not-owned" ? "blocked" : "owned_airship_session_stopped",
    preparedWorkflow: input.preparedWorkflow,
    ownedAirshipSession: session,
    sidecarKind: session.ownedByManager
      ? session.realAirshipCliLaunched ? "real_airship_cli_sidecar" : "fixture_sidecar"
      : "not_owned",
    readback: session.status === "not-owned"
      ? "No owned Airship session exists in this manager. Manual cleanup may be required; no process was killed by port."
      : "Owned Airship session stopped. Static target and Airship session health now report stopped/unreachable from this manager.",
    nextRecommendedAction: session.status === "not-owned"
      ? "Use the manual cleanup instructions from the readback, then capture after the editor is closed."
      : "Capture changes from the CHS proof workspace, then map captured edits.",
    diagnostics: [
      "airship_adapter_16_owned_session_stop_invoked",
      `cleanup:${session.cleanup.status}`,
      `health:${session.health.status}`,
    ],
  });
}

export async function captureAirshipProofWorkflowChanges(
  input: CaptureAirshipProofWorkflowChangesInput,
): Promise<AirshipProofWorkflowCapturedReadback> {
  const capture = await captureAirshipProofSessionChanges({
    preparedSession: input.preparedWorkflow.preparedSession,
    sampleEditedString: input.sampleEditedString,
  });

  return {
    ...baseReadback({
      status: "captured",
      preparedSession: input.preparedWorkflow.preparedSession,
      finalHashes: capture.currentHashes,
      mapping: null,
      appliedCount: 0,
      skippedCount: 0,
      draft: emptyDraftReadback(),
      readback: capture.indexHtmlChanged
        ? "Captured local Airship proof workspace changes from index.html."
        : "Captured local Airship proof workspace; index.html is unchanged.",
      nextRecommendedAction: capture.indexHtmlChanged ? "Map captured changes to draft candidates" : "Make a manual Airship edit, then capture again",
      warnings: capture.warnings,
      diagnostics: [
        "airship_proof_workflow_captured",
        capture.indexHtmlChanged ? "index_html_changed" : "index_html_unchanged",
      ],
    }),
    status: "captured",
    preparedSession: input.preparedWorkflow.preparedSession,
    capture,
  };
}

export async function mapAirshipProofWorkflowChanges(input: MapAirshipProofWorkflowChangesInput): Promise<AirshipProofWorkflowMappedReadback> {
  const mappingReadback = await mapAirshipProofSessionCapturedDiffToDraft({
    preparedSession: input.preparedWorkflow.preparedSession,
    knownDraftFieldMappings: input.knownDraftFieldMappings,
  });

  return {
    ...baseReadback({
      status: "mapped",
      preparedSession: input.preparedWorkflow.preparedSession,
      finalHashes: finalHashesFor(input.preparedWorkflow),
      mapping: mappingReadback.mapping,
      appliedCount: 0,
      skippedCount: 0,
      draft: input.expectedDraft
        ? {
          idBefore: input.expectedDraft.id ?? null,
          versionBefore: input.expectedDraft.version,
          idAfter: input.expectedDraft.id ?? null,
          versionAfter: input.expectedDraft.version,
        }
        : emptyDraftReadback(),
      readback: mappingReadback.mapping.readback,
      nextRecommendedAction: mappingReadback.mapping.safeEntryCount > 0
        ? "Review mapping readback, then apply with confirmed: true"
        : "Review unsupported mapping readback; no safe automatic draft apply is available",
      warnings: mappingReadback.warnings,
      diagnostics: [
        "airship_proof_workflow_mapped",
        `safe_entry_count:${mappingReadback.mapping.safeEntryCount}`,
        `unsupported_entry_count:${mappingReadback.mapping.unsupportedEntryCount}`,
      ],
    }),
    status: "mapped",
    preparedSession: input.preparedWorkflow.preparedSession,
    mappingReadback,
    mapping: mappingReadback.mapping,
    mappedAgainstDraft: input.expectedDraft ?? null,
  };
}

export async function applyAirshipProofWorkflowMappings(
  input: ApplyAirshipProofWorkflowMappingsInput,
): Promise<AirshipProofWorkflowApplyReadback> {
  const staleMappingDiagnostics = validateMappedDraftRef(input.mappedWorkflow.mappedAgainstDraft, input.expectedDraft);
  if (staleMappingDiagnostics.length > 0) {
    return blockedApplyReadback({
      input,
      diagnostics: staleMappingDiagnostics,
      readback: "Captured edits not saved to draft. Mapping was produced against a different draft version. Preview not regenerated yet.",
    });
  }

  const applyReadback = await applyAirshipCapturedMappingsToDraft({
    migrationId: input.migrationId,
    draftSeed: input.draftSeed,
    expectedDraft: input.expectedDraft,
    mapping: input.mappedWorkflow.mapping,
    confirmed: input.confirmed,
    actor: input.actor,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    service: input.service,
  });

  const applied = applyReadback.status === "applied";
  const status = applied ? "applied_to_draft" : "blocked";
  return {
    ...baseReadback({
      status,
      preparedSession: input.mappedWorkflow.preparedSession,
      finalHashes: input.mappedWorkflow.finalHashes,
      mapping: input.mappedWorkflow.mapping,
      appliedCount: applyReadback.appliedCount,
      skippedCount: applyReadback.skippedCount,
      appliedFieldNames: applyReadback.appliedFieldNames,
      skippedMappings: applyReadback.skippedMappings,
      draft: applyReadback.draft,
      readback: applyReadback.readback,
      nextRecommendedAction: applyReadback.nextRecommendedAction,
      warnings: [
        ...input.mappedWorkflow.warnings,
        "Apply step only writes confirmed safe text mappings to the Airship draft.",
        "Preview not regenerated yet.",
      ],
      diagnostics: [
        "airship_proof_workflow_apply_invoked",
        ...applyReadback.diagnostics,
      ],
      draftDataMutation: applyReadback.mutationFlags.draftDataMutation,
    }),
    status,
    preparedSession: input.mappedWorkflow.preparedSession,
    mappingReadback: input.mappedWorkflow.mappingReadback,
    mapping: input.mappedWorkflow.mapping,
    mappedAgainstDraft: input.mappedWorkflow.mappedAgainstDraft,
    applyReadback,
  };
}

function baseReadback(input: {
  status: AirshipProofWorkflowStatus;
  preparedSession: AirshipProofSessionReadback;
  finalHashes: BuilderFileHash[];
  mapping: AirshipCapturedDiffToDraftMappingResult | null;
  appliedCount: number;
  skippedCount: number;
  appliedFieldNames?: string[];
  skippedMappings?: ApplyAirshipCapturedMappingsToDraftReadback["skippedMappings"];
  draft: AirshipProofWorkflowDraftReadback;
  readback: string;
  nextRecommendedAction: string;
  warnings: string[];
  diagnostics: string[];
  draftDataMutation?: boolean;
}): AirshipProofWorkflowBaseReadback {
  return {
    proofOnly: true,
    localManualOnly: true,
    serviceVersion: AIRSHIP_PROOF_WORKFLOW_ORCHESTRATOR_VERSION,
    status: input.status,
    workspacePath: input.preparedSession.workspacePath,
    manualAirshipCommand: input.preparedSession.manualAirshipCommand,
    initialHashes: input.preparedSession.initialHashes,
    finalHashes: input.finalHashes,
    mappingSummary: input.mapping ? summarizeMapping(input.mapping) : null,
    appliedCount: input.appliedCount,
    skippedCount: input.skippedCount,
    appliedFieldNames: input.appliedFieldNames ?? [],
    skippedMappings: input.skippedMappings ?? [],
    draft: input.draft,
    readback: input.readback,
    nextRecommendedAction: input.nextRecommendedAction,
    safety: workflowSafety(),
    mutationFlags: workflowMutationFlags(input.draftDataMutation === true),
    warnings: input.warnings,
    diagnostics: input.diagnostics,
  };
}

function blockedApplyReadback(input: {
  input: ApplyAirshipProofWorkflowMappingsInput;
  diagnostics: string[];
  readback: string;
}): AirshipProofWorkflowApplyReadback {
  return {
    ...baseReadback({
      status: "blocked",
      preparedSession: input.input.mappedWorkflow.preparedSession,
      finalHashes: input.input.mappedWorkflow.finalHashes,
      mapping: input.input.mappedWorkflow.mapping,
      appliedCount: 0,
      skippedCount: input.input.mappedWorkflow.mapping.entries.length,
      appliedFieldNames: [],
      skippedMappings: input.input.mappedWorkflow.mapping.entries.map((entry) => ({
        draftFieldKey: entry.draftFieldKey,
        changedElementMarker: entry.changedElementMarker,
        sectionMarker: entry.sectionMarker,
        confidence: entry.confidence,
        reason: "stale_mapping_blocked",
      })),
      draft: {
        idBefore: input.input.expectedDraft.id ?? null,
        versionBefore: input.input.expectedDraft.version,
        idAfter: input.input.expectedDraft.id ?? null,
        versionAfter: input.input.expectedDraft.version,
      },
      readback: input.readback,
      nextRecommendedAction: "Re-map captured changes against the current draft, then apply with confirmed: true",
      warnings: [
        ...input.input.mappedWorkflow.warnings,
        "Fail-closed stale mapping protection blocked draft mutation.",
        "Preview not regenerated yet.",
      ],
      diagnostics: input.diagnostics,
    }),
    status: "blocked",
    preparedSession: input.input.mappedWorkflow.preparedSession,
    mappingReadback: input.input.mappedWorkflow.mappingReadback,
    mapping: input.input.mappedWorkflow.mapping,
    mappedAgainstDraft: input.input.mappedWorkflow.mappedAgainstDraft,
    applyReadback: null,
  };
}

function validateMappedDraftRef(
  mappedAgainstDraft: AirshipProofWorkflowDraftRef | null,
  expectedDraft: AirshipProofWorkflowDraftRef,
): string[] {
  if (!mappedAgainstDraft) return [];
  const diagnostics: string[] = [];
  if (mappedAgainstDraft.id && expectedDraft.id && mappedAgainstDraft.id !== expectedDraft.id) {
    diagnostics.push("airship_proof_workflow_mapping_draft_id_mismatch");
  }
  if (mappedAgainstDraft.version !== expectedDraft.version) {
    diagnostics.push("airship_proof_workflow_stale_mapping_draft_version");
  }
  return diagnostics;
}

function summarizeMapping(mapping: AirshipCapturedDiffToDraftMappingResult): AirshipProofWorkflowMappingSummary {
  return {
    hasChanges: mapping.hasChanges,
    entryCount: mapping.entries.length,
    safeEntryCount: mapping.safeEntryCount,
    unsupportedEntryCount: mapping.unsupportedEntryCount,
    exactSafeApplyCandidateCount: mapping.entries.filter((entry) => entry.confidence === "exact" && entry.safeToApplyLater).length,
  };
}

function finalHashesFor(
  workflow: AirshipProofWorkflowPreparedReadback | AirshipProofWorkflowCapturedReadback,
): BuilderFileHash[] {
  return "capture" in workflow ? workflow.capture.currentHashes : workflow.finalHashes;
}

function emptyDraftReadback(): AirshipProofWorkflowDraftReadback {
  return {
    idBefore: null,
    versionBefore: null,
    idAfter: null,
    versionAfter: null,
  };
}

function workflowSafety(): AirshipProofWorkflowSafety {
  return {
    proofOnlyManualLocal: true,
    noAutoLaunch: true,
    noPreviewRegeneration: true,
    noArtifactRegeneration: true,
    noPublishMutation: true,
    noLivePointerMutation: true,
    noDnsMutation: true,
    noProviderMutation: true,
    noSourceCaptureImport: true,
    noExternalAiProviderCall: true,
    noCustomerDomainMutation: true,
    noProductionReplacementUi: true,
    currentEditorRouteNotReplaced: true,
  };
}

function workflowMutationFlags(draftDataMutation: boolean): AirshipProofWorkflowBaseReadback["mutationFlags"] {
  return {
    draftDataMutation,
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
  };
}

export const defaultAirshipProofWorkflowSidecarManager = new AirshipLocalSidecarProcessManager();

function assertAdapter16ChsOnly(migrationId: string): void {
  if (migrationId !== AIRSHIP_PROOF_SESSION_CHS_MIGRATION_ID) {
    throw new Error("airship_adapter_16_chs_only_flow");
  }
}

function ownedSidecarReadback(input: {
  status: AirshipProofWorkflowOwnedSidecarReadback["status"];
  preparedWorkflow: AirshipProofWorkflowPreparedReadback;
  ownedAirshipSession: AirshipLocalSidecarSessionReadback;
  sidecarKind: AirshipProofWorkflowOwnedSidecarReadback["sidecarKind"];
  readback: string;
  nextRecommendedAction: string;
  diagnostics: string[];
}): AirshipProofWorkflowOwnedSidecarReadback {
  return {
    ...baseReadback({
      status: input.status,
      preparedSession: input.preparedWorkflow.preparedSession,
      finalHashes: input.preparedWorkflow.finalHashes,
      mapping: null,
      appliedCount: 0,
      skippedCount: 0,
      appliedFieldNames: [],
      skippedMappings: [],
      draft: input.preparedWorkflow.draft,
      readback: input.readback,
      nextRecommendedAction: input.nextRecommendedAction,
      warnings: [
        ...input.preparedWorkflow.warnings,
        ...input.ownedAirshipSession.warnings,
        "ADAPTER 16 one-session operator flow is CHS-only and local/proof-only.",
      ],
      diagnostics: input.diagnostics,
    }),
    status: input.status,
    chsOnly: true,
    adapter16Flow: "one_session_chs_operator_flow",
    sidecarKind: input.sidecarKind,
    ownedAirshipSession: input.ownedAirshipSession,
    changedFilesCount: 0,
    generatedInternalPreviewUrl: null,
  };
}

function airshipFixtureCommand(input: { port: number; cwd: string }): AirshipLocalSidecarCommandDescriptor {
  const script = [
    "const http = require('node:http');",
    "const port = Number(process.argv[1]);",
    "const server = http.createServer((request, response) => {",
    "response.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'});",
    "response.end('<!doctype html><html><body><main><h1>Airship fixture sidecar</h1><p>Local fixture for GNR8 CHS proof flow.</p></main></body></html>');",
    "});",
    "server.listen(port, '127.0.0.1');",
    "process.on('SIGTERM', () => server.close(() => process.exit(0)));",
  ].join("");
  const args = ["-e", script, String(input.port)];
  return {
    executable: process.execPath,
    args,
    cwd: input.cwd,
    commandLine: [process.execPath, ...args].join(" "),
    description: "Airship-like local HTTP fixture sidecar for CHS proof workflow tests and local dry runs.",
  };
}

function localSessionStatusFromHealth(
  healthStatus: AirshipLocalSidecarSessionReadback["health"]["status"],
): AirshipLocalSidecarSessionReadback["status"] {
  if (healthStatus === "healthy") return "running";
  if (healthStatus === "stopped") return "stopped";
  if (healthStatus === "not-owned") return "not-owned";
  return "failed";
}
