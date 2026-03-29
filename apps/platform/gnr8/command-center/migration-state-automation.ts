export type MigrationPipelineStatus = "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR";

type MigrationEvidence = {
  site_status: string | null;
  migration_event_count: number;
  latest_runtime_state: string | null;
  latest_runtime_site_version_id: string | null;
  has_published_runtime_version: boolean;
};

export type MigrationAutomationResult = {
  effective_status: MigrationPipelineStatus;
  derived_status: MigrationPipelineStatus;
  previous_status: MigrationPipelineStatus;
  auto_advanced: boolean;
  automation_reason: string | null;
};

const STATUS_RANK: Record<Exclude<MigrationPipelineStatus, "ERROR">, number> = {
  NOT_STARTED: 0,
  IMPORTED: 1,
  PREVIEW_READY: 2,
  APPROVED: 3,
  LIVE: 4,
};

function toPositiveInt(value: unknown): number {
  const num = Number(value);
  if (Number.isFinite(num) === false) return 0;
  return Math.max(0, Math.floor(num));
}

function looksLikeErrorStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("error") || normalized.includes("fail");
}

function toKnownPipelineStatus(input: string | null | undefined): MigrationPipelineStatus | null {
  const normalized = String(input ?? "").trim().toUpperCase();
  if (
    normalized === "NOT_STARTED" ||
    normalized === "IMPORTED" ||
    normalized === "PREVIEW_READY" ||
    normalized === "APPROVED" ||
    normalized === "LIVE" ||
    normalized === "ERROR"
  ) {
    return normalized;
  }
  return null;
}

function deriveLegacyStatus(evidence: MigrationEvidence): MigrationPipelineStatus {
  const latestStateRaw = evidence.latest_runtime_state;
  if (latestStateRaw) {
    const latestState = String(latestStateRaw).toUpperCase();
    if (latestState === "DRAFT") return "IMPORTED";
    if (latestState === "READY_FOR_REVIEW") return "PREVIEW_READY";
    if (latestState === "APPROVED") return "APPROVED";
    if (latestState === "PUBLISHED") return "LIVE";
    if (latestState === "ARCHIVED") return evidence.has_published_runtime_version ? "LIVE" : "IMPORTED";
    return "ERROR";
  }

  if (looksLikeErrorStatus(evidence.site_status)) return "ERROR";
  if (toPositiveInt(evidence.migration_event_count) > 0) return "IMPORTED";
  return "NOT_STARTED";
}

function deriveCanonicalStatus(evidence: MigrationEvidence): { status: MigrationPipelineStatus; reason: string } {
  const runtimeState = String(evidence.latest_runtime_state ?? "").trim().toUpperCase();
  const hasRuntimeVersion = String(evidence.latest_runtime_site_version_id ?? "").trim().length > 0;
  const hasPublishedVersion = !!evidence.has_published_runtime_version;
  const hasMigrationEvents = toPositiveInt(evidence.migration_event_count) > 0;
  const errorSiteStatus = looksLikeErrorStatus(evidence.site_status);

  if (runtimeState.length > 0) {
    if (runtimeState === "PUBLISHED") return { status: "LIVE", reason: "runtime_state_published" };
    if (runtimeState === "APPROVED") return { status: "APPROVED", reason: "runtime_state_approved" };
    if (runtimeState === "READY_FOR_REVIEW") return { status: "PREVIEW_READY", reason: "runtime_state_ready_for_review" };
    if (runtimeState === "DRAFT") return { status: "IMPORTED", reason: "runtime_state_draft" };
    if (runtimeState === "ARCHIVED") {
      return hasPublishedVersion
        ? { status: "LIVE", reason: "runtime_archived_with_published_history" }
        : { status: "IMPORTED", reason: "runtime_archived_without_published_history" };
    }
    return { status: "ERROR", reason: "runtime_state_unknown" };
  }

  if (hasPublishedVersion) return { status: "LIVE", reason: "published_runtime_history_present" };
  if (hasRuntimeVersion) return { status: "IMPORTED", reason: "runtime_version_present" };
  if (hasMigrationEvents) return { status: "IMPORTED", reason: "migration_evidence_present" };
  if (errorSiteStatus) return { status: "ERROR", reason: "site_status_error" };
  return { status: "NOT_STARTED", reason: "no_migration_evidence" };
}

function canAutoAdvance(previous: MigrationPipelineStatus, derived: MigrationPipelineStatus): boolean {
  if (previous === "ERROR" || derived === "ERROR") return false;
  const previousRank = STATUS_RANK[previous];
  const derivedRank = STATUS_RANK[derived];
  return derivedRank > previousRank;
}

export function resolveMigrationPipelineStatus(input: {
  evidence: MigrationEvidence;
  previous_status?: MigrationPipelineStatus | null;
}): MigrationAutomationResult {
  const explicitPrevious = input.previous_status ?? null;
  const previousStatus = explicitPrevious ?? toKnownPipelineStatus(input.evidence.site_status) ?? deriveLegacyStatus(input.evidence);
  const canonical = deriveCanonicalStatus(input.evidence);
  const autoAdvanced = canAutoAdvance(previousStatus, canonical.status);

  return {
    effective_status: canonical.status,
    derived_status: canonical.status,
    previous_status: previousStatus,
    auto_advanced: autoAdvanced,
    automation_reason: autoAdvanced ? canonical.reason : null,
  };
}
