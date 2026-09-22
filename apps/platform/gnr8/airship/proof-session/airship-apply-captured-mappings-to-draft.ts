import "server-only";

import {
  AirshipSingleSiteDraftService,
  type AirshipSingleSiteDraftActor,
  type AirshipSingleSiteDraftEdit,
  type AirshipSingleSiteDraftRecord,
  type AirshipSingleSiteDraftSeed,
} from "../../single-site/airship-single-site-draft-service";
import type {
  AirshipCapturedDiffToDraftMappingEntry,
  AirshipCapturedDiffToDraftMappingResult,
} from "./airship-captured-diff-to-draft-mapper";

export const AIRSHIP_APPLY_CAPTURED_MAPPINGS_TO_DRAFT_VERSION = "airship-adapter-08-apply-captured-mappings-to-draft:v1" as const;

type SupportedDraftFieldKey = NonNullable<AirshipSingleSiteDraftEdit["fieldKey"]>;

export type ApplyAirshipCapturedMappingsToDraftInput = {
  migrationId: string;
  draftSeed: AirshipSingleSiteDraftSeed;
  expectedDraft: {
    id?: string | null;
    version: number;
  };
  mapping: AirshipCapturedDiffToDraftMappingResult;
  confirmed: boolean;
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  service?: Pick<AirshipSingleSiteDraftService, "readCurrentDraft" | "updateDraftEditText">;
};

export type AppliedAirshipCapturedDraftField = {
  draftEditId: string;
  draftFieldKey: SupportedDraftFieldKey;
  previousText: string;
  nextText: string;
  changedElementMarker: string | null;
  sectionMarker: string | null;
};

export type SkippedAirshipCapturedDraftMapping = {
  draftFieldKey: string | null;
  changedElementMarker: string | null;
  sectionMarker: string | null;
  confidence: AirshipCapturedDiffToDraftMappingEntry["confidence"];
  reason: string;
};

export type ApplyAirshipCapturedMappingsToDraftReadback = {
  status: "applied" | "rejected";
  proofOnly: true;
  serviceVersion: typeof AIRSHIP_APPLY_CAPTURED_MAPPINGS_TO_DRAFT_VERSION;
  readback: string;
  nextRecommendedAction: "Apply / generate preview";
  appliedCount: number;
  skippedCount: number;
  draft: {
    idBefore: string | null;
    versionBefore: number | null;
    idAfter: string | null;
    versionAfter: number | null;
  };
  appliedFieldNames: SupportedDraftFieldKey[];
  changedDraftFields: AppliedAirshipCapturedDraftField[];
  skippedMappings: SkippedAirshipCapturedDraftMapping[];
  safety: {
    explicitConfirmationRequired: true;
    confirmed: boolean;
    noArtifactRegeneration: true;
    noPreviewRegeneration: true;
    noPublishMutation: true;
    noLivePointerMutation: true;
    noDnsMutation: true;
    noProviderMutation: true;
    noSourceCaptureImport: true;
  };
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
  };
  diagnostics: string[];
};

const SUPPORTED_DRAFT_FIELD_KEYS = new Set<SupportedDraftFieldKey>(["headline", "subheading", "ctaLabel"]);

export async function applyAirshipCapturedMappingsToDraft(
  input: ApplyAirshipCapturedMappingsToDraftInput,
): Promise<ApplyAirshipCapturedMappingsToDraftReadback> {
  const service = input.service ?? new AirshipSingleSiteDraftService();
  const diagnostics = validateProofApplyInput(input);
  if (diagnostics.length > 0) {
    return rejectedReadback({ input, diagnostics, currentDraft: null });
  }

  const currentDraft = await service.readCurrentDraft(input.migrationId);
  const draftDiagnostics = validateCurrentDraft(input, currentDraft);
  if (draftDiagnostics.length > 0 || !currentDraft) {
    return rejectedReadback({ input, diagnostics: draftDiagnostics, currentDraft });
  }

  const skippedMappings: SkippedAirshipCapturedDraftMapping[] = [];
  const candidates = selectSafeApplyCandidates(input.mapping.entries, skippedMappings);
  const draftEditsByField = new Map<SupportedDraftFieldKey, AirshipSingleSiteDraftEdit>();
  for (const edit of currentDraft.draftEdits) {
    if (edit.fieldKey && SUPPORTED_DRAFT_FIELD_KEYS.has(edit.fieldKey) && !draftEditsByField.has(edit.fieldKey)) {
      draftEditsByField.set(edit.fieldKey, edit);
    }
  }

  const dedupedCandidates = dedupeCandidates(candidates, skippedMappings);
  let updatedDraft = currentDraft;
  const changedDraftFields: AppliedAirshipCapturedDraftField[] = [];

  for (const candidate of dedupedCandidates) {
    const draftEdit = draftEditsByField.get(candidate.draftFieldKey);
    const nextText = normalizedText(candidate.entry.nextText);
    if (!draftEdit) {
      skippedMappings.push(skip(candidate.entry, "mapped_draft_field_not_found_in_current_draft"));
      continue;
    }
    if (!nextText) {
      skippedMappings.push(skip(candidate.entry, "mapped_next_text_missing"));
      continue;
    }
    if (draftEdit.proposedTextContent === nextText) {
      skippedMappings.push(skip(candidate.entry, "mapped_value_already_saved_to_draft"));
      continue;
    }

    updatedDraft = await service.updateDraftEditText({
      ...input.draftSeed,
      draftEditId: draftEdit.id,
      proposedTextContent: nextText,
      actor: input.actor,
      correlationId: input.correlationId ?? `airship-captured-apply:${input.migrationId}`,
      idempotencyKey: idempotencyKeyFor(input, draftEdit.id, candidate.entry),
    });
    changedDraftFields.push({
      draftEditId: draftEdit.id,
      draftFieldKey: candidate.draftFieldKey,
      previousText: draftEdit.proposedTextContent,
      nextText,
      changedElementMarker: candidate.entry.changedElementMarker,
      sectionMarker: candidate.entry.sectionMarker,
    });
    const latestEdit = updatedDraft.draftEdits.find((edit) => edit.id === draftEdit.id);
    if (latestEdit) draftEditsByField.set(candidate.draftFieldKey, latestEdit);
  }

  return {
    status: "applied",
    proofOnly: true,
    serviceVersion: AIRSHIP_APPLY_CAPTURED_MAPPINGS_TO_DRAFT_VERSION,
    readback: "Captured edits saved to draft. Preview not regenerated yet.",
    nextRecommendedAction: "Apply / generate preview",
    appliedCount: changedDraftFields.length,
    skippedCount: skippedMappings.length,
    draft: {
      idBefore: currentDraft.id,
      versionBefore: currentDraft.version,
      idAfter: updatedDraft.id,
      versionAfter: updatedDraft.version,
    },
    changedDraftFields,
    appliedFieldNames: changedDraftFields.map((field) => field.draftFieldKey),
    skippedMappings,
    safety: safety(input.confirmed),
    mutationFlags: mutationFlags(changedDraftFields.length > 0),
    diagnostics: [
      "captured_edits_saved_to_draft",
      "preview_not_regenerated_yet",
      "no_artifact_regeneration_invoked",
      "no_publish_live_pointer_dns_provider_or_source_capture_path_invoked",
    ],
  };
}

function validateProofApplyInput(input: ApplyAirshipCapturedMappingsToDraftInput): string[] {
  const diagnostics: string[] = [];
  if (!input.confirmed) diagnostics.push("airship_captured_mapping_apply_confirmation_required");
  if (!input.migrationId || input.migrationId !== input.draftSeed.migrationId) diagnostics.push("airship_captured_mapping_apply_migration_seed_mismatch");
  if (input.mapping.context?.migrationId && input.mapping.context.migrationId !== input.migrationId) {
    diagnostics.push("airship_captured_mapping_apply_mapping_migration_mismatch");
  }
  if (input.mapping.dryRunOnly !== true || input.mapping.proofOnly !== true) {
    diagnostics.push("airship_captured_mapping_apply_proof_mapping_required");
  }
  if (!Number.isInteger(input.expectedDraft.version) || input.expectedDraft.version < 1) {
    diagnostics.push("airship_captured_mapping_apply_expected_draft_version_required");
  }
  return diagnostics;
}

function validateCurrentDraft(
  input: ApplyAirshipCapturedMappingsToDraftInput,
  currentDraft: AirshipSingleSiteDraftRecord | null,
): string[] {
  if (!currentDraft) return ["airship_captured_mapping_apply_current_draft_missing"];
  const diagnostics: string[] = [];
  if (currentDraft.migrationId !== input.migrationId) diagnostics.push("airship_captured_mapping_apply_current_draft_migration_mismatch");
  if (input.expectedDraft.id && currentDraft.id !== input.expectedDraft.id) diagnostics.push("airship_captured_mapping_apply_current_draft_id_mismatch");
  if (currentDraft.version !== input.expectedDraft.version) diagnostics.push("airship_captured_mapping_apply_stale_draft_version");
  return diagnostics;
}

function selectSafeApplyCandidates(
  entries: AirshipCapturedDiffToDraftMappingEntry[],
  skippedMappings: SkippedAirshipCapturedDraftMapping[],
): Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }> {
  const candidates: Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }> = [];
  for (const entry of entries) {
    if (entry.confidence !== "exact" || entry.safeToApplyLater !== true) {
      skippedMappings.push(skip(entry, "mapping_not_exact_safe_apply_candidate"));
      continue;
    }
    if (!entry.draftFieldKey || !SUPPORTED_DRAFT_FIELD_KEYS.has(entry.draftFieldKey as SupportedDraftFieldKey)) {
      skippedMappings.push(skip(entry, "mapped_draft_field_not_supported"));
      continue;
    }
    candidates.push({ entry, draftFieldKey: entry.draftFieldKey as SupportedDraftFieldKey });
  }
  return candidates;
}

function dedupeCandidates(
  candidates: Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }>,
  skippedMappings: SkippedAirshipCapturedDraftMapping[],
): Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }> {
  const byField = new Map<SupportedDraftFieldKey, Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }>>();
  for (const candidate of candidates) {
    const existing = byField.get(candidate.draftFieldKey) ?? [];
    byField.set(candidate.draftFieldKey, [...existing, candidate]);
  }

  const deduped: Array<{ entry: AirshipCapturedDiffToDraftMappingEntry; draftFieldKey: SupportedDraftFieldKey }> = [];
  for (const fieldCandidates of byField.values()) {
    const uniqueNextTexts = new Set(fieldCandidates.map((candidate) => normalizedText(candidate.entry.nextText)));
    if (uniqueNextTexts.size > 1) {
      for (const candidate of fieldCandidates) {
        skippedMappings.push(skip(candidate.entry, "multiple_conflicting_mappings_for_draft_field"));
      }
      continue;
    }
    const firstCandidate = fieldCandidates[0];
    if (!firstCandidate) continue;
    deduped.push(firstCandidate);
    for (const candidate of fieldCandidates.slice(1)) {
      skippedMappings.push(skip(candidate.entry, "duplicate_mapping_for_draft_field"));
    }
  }
  return deduped;
}

function normalizedText(value: string | null): string {
  return String(value ?? "").trim();
}

function idempotencyKeyFor(
  input: ApplyAirshipCapturedMappingsToDraftInput,
  draftEditId: string,
  entry: AirshipCapturedDiffToDraftMappingEntry,
): string {
  const prefix = input.idempotencyKey ? `${input.idempotencyKey}:` : "";
  return `${prefix}airship-captured-apply:${input.migrationId}:${input.expectedDraft.version}:${draftEditId}:${entry.changedElementMarker ?? "unknown"}`;
}

function skip(entry: AirshipCapturedDiffToDraftMappingEntry, reason: string): SkippedAirshipCapturedDraftMapping {
  return {
    draftFieldKey: entry.draftFieldKey,
    changedElementMarker: entry.changedElementMarker,
    sectionMarker: entry.sectionMarker,
    confidence: entry.confidence,
    reason,
  };
}

function rejectedReadback(input: {
  input: ApplyAirshipCapturedMappingsToDraftInput;
  diagnostics: string[];
  currentDraft: AirshipSingleSiteDraftRecord | null;
}): ApplyAirshipCapturedMappingsToDraftReadback {
  return {
    status: "rejected",
    proofOnly: true,
    serviceVersion: AIRSHIP_APPLY_CAPTURED_MAPPINGS_TO_DRAFT_VERSION,
    readback: "Captured edits not saved to draft. Preview not regenerated yet.",
    nextRecommendedAction: "Apply / generate preview",
    appliedCount: 0,
    skippedCount: input.input.mapping.entries.length,
    draft: {
      idBefore: input.currentDraft?.id ?? null,
      versionBefore: input.currentDraft?.version ?? null,
      idAfter: input.currentDraft?.id ?? null,
      versionAfter: input.currentDraft?.version ?? null,
    },
    appliedFieldNames: [],
    changedDraftFields: [],
    skippedMappings: input.input.mapping.entries.map((entry) => skip(entry, "apply_rejected")),
    safety: safety(input.input.confirmed),
    mutationFlags: mutationFlags(false),
    diagnostics: input.diagnostics,
  };
}

function safety(confirmed: boolean): ApplyAirshipCapturedMappingsToDraftReadback["safety"] {
  return {
    explicitConfirmationRequired: true,
    confirmed,
    noArtifactRegeneration: true,
    noPreviewRegeneration: true,
    noPublishMutation: true,
    noLivePointerMutation: true,
    noDnsMutation: true,
    noProviderMutation: true,
    noSourceCaptureImport: true,
  };
}

function mutationFlags(draftDataMutation: boolean): ApplyAirshipCapturedMappingsToDraftReadback["mutationFlags"] {
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
  };
}
