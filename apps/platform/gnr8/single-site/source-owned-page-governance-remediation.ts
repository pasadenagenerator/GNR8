import "server-only";

import { evaluatePageRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import type { PageMigrationGovernanceSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";
import {
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  getRuntimeSiteVersionOwnershipSnapshot,
  materializePageMigrationGovernanceForSiteVersion,
  type RuntimeSiteVersionOwnershipSnapshot,
} from "@/gnr8/runtime/runtime-store";
import {
  SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES,
  SingleSiteTransitionError,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteEvidenceItemRow,
  type SingleSiteMigrationRefRow,
  type SingleSiteMigrationRow,
  type SingleSitePgClient,
  type SingleSiteReviewEventRow,
  type SingleSiteSourceEvidenceReviewRow,
} from "./single-site-state-writer-repository";

export const SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION =
  "mvp-cutline-61-source-owned-page-governance-remediation:v1" as const;

export const SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_REQUIRED_FIELDS = [
  "pageStructuralConfidence",
  "weakSectionIds",
  "structuralAnomalies",
  "pageMigrationGate",
  "pageRolloutPolicy",
  "pageEnforcement",
] as const;

export type SourceOwnedPageGovernanceRemediationInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  sourceEvidenceReviewId: string;
  sourceUrl: string;
  sourceEvidencePackageKey: string;
  sourceWatermark: string;
  runtimeSiteId: string;
  candidateSiteVersionId: string;
  runtimeArtifactId: string;
  routePath: string;
  idempotencyKey: string;
  correlationId: string;
  actor?: string | null;
};

export type SourceOwnedPageGovernanceRemediationBlocker = {
  code: string;
  message: string;
};

export type SourceOwnedPageGovernanceRemediationEvidence = {
  migrationRefCount: number;
  migrationEventCount: number;
  sourceEvidenceReviewRefCount: number;
  sourceEvidenceReviewEventCount: number;
  sourceEvidenceItemCount: number;
  requiredEvidenceCategories: string[];
  missingEvidenceCategories: string[];
  acceptedLimitations: unknown[];
  sourceReviewStatus: string | null;
  sourceCompletenessStatus: string | null;
  sourcePackage: string | null;
  sourceWatermark: string | null;
};

export type SourceOwnedPageGovernanceRemediationPlan = {
  version: typeof SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION;
  status: "ready_to_materialize" | "already_valid" | "blocked";
  input: SourceOwnedPageGovernanceRemediationInput;
  pageCount: number;
  pagesWithMigrationGovernance: number;
  targetPageId: string | null;
  targetRoutePath: string;
  activePointerBefore: { siteVersionId: string; artifactId: string } | null;
  candidateState: string | null;
  artifactBinding: string | null;
  blockers: SourceOwnedPageGovernanceRemediationBlocker[];
  evidence: SourceOwnedPageGovernanceRemediationEvidence;
  governanceByPageId: Record<string, PageMigrationGovernanceSnapshot>;
};

export type SourceOwnedPageGovernanceRemediationResult = {
  ok: boolean;
  plan: SourceOwnedPageGovernanceRemediationPlan;
  materialization: { affectedRows: number; pageIds: string[] } | null;
  pageCountAfter: number;
  pagesWithMigrationGovernanceAfter: number;
  candidateStateAfter: string | null;
  artifactBindingAfter: string | null;
  activePointerAfter: { siteVersionId: string; artifactId: string } | null;
  activePointerUnchanged: boolean;
};

export type SourceOwnedPageGovernanceRemediationDependencies = {
  getMigrationById(migrationId: string): Promise<SingleSiteMigrationRow | null>;
  listMigrationRefs(migrationId: string): Promise<SingleSiteMigrationRefRow[]>;
  listMigrationStateEvents(migrationId: string): Promise<Record<string, unknown>[]>;
  getSourceEvidenceReviewById(reviewId: string): Promise<SingleSiteSourceEvidenceReviewRow | null>;
  listSourceEvidenceReviewItems(reviewId: string): Promise<SingleSiteEvidenceItemRow[]>;
  listSourceEvidenceReviewRefs(reviewId: string): Promise<Record<string, unknown>[]>;
  listSourceEvidenceReviewEvents(reviewId: string): Promise<SingleSiteReviewEventRow[]>;
  getRuntimeSiteVersionOwnershipSnapshot(siteVersionId: string): Promise<RuntimeSiteVersionOwnershipSnapshot | null>;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  materializePageMigrationGovernanceForSiteVersion: typeof materializePageMigrationGovernanceForSiteVersion;
};

type SourceOwnedGovernanceSnapshot = PageMigrationGovernanceSnapshot & {
  sourceOwnedRemediation: {
    version: typeof SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION;
    tenantId: string;
    clientId: string;
    siteId: string;
    migrationId: string;
    sourceEvidenceReviewId: string;
    sourceUrl: string;
    sourceEvidencePackageKey: string;
    sourceWatermark: string;
    runtimeSiteId: string;
    candidateSiteVersionId: string;
    runtimeArtifactId: string;
    routePath: string;
    acceptedLimitations: unknown[];
    correlationId: string;
    idempotencyKey: string;
  };
};

const DEFAULT_ACTOR = "operator:source-owned-page-governance-remediation";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeRoutePath(value: unknown): string {
  const raw = text(value);
  if (!raw || raw === "/") return "/";
  let next = raw.startsWith("/") ? raw : `/${raw}`;
  next = next.replace(/\/{2,}/g, "/");
  next = next.replace(/\/index\.html?$/i, "/");
  if (next !== "/") next = next.replace(/\/+$/g, "");
  return next || "/";
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function governanceComplete(value: unknown): value is PageMigrationGovernanceSnapshot {
  if (!isRecord(value)) return false;
  if (typeof value.pageStructuralConfidence !== "number" || !Number.isFinite(value.pageStructuralConfidence)) return false;
  if (!Array.isArray(value.weakSectionIds)) return false;
  if (!Array.isArray(value.structuralAnomalies)) return false;

  const gate = value.pageMigrationGate;
  if (
    !isRecord(gate) ||
    typeof gate.state !== "string" ||
    typeof gate.score !== "number" ||
    !Array.isArray(gate.reasons) ||
    !Array.isArray(gate.weakSectionIds) ||
    !Array.isArray(gate.anomalySummary) ||
    typeof gate.recommendedAction !== "string"
  ) {
    return false;
  }

  const policy = value.pageRolloutPolicy;
  if (
    !isRecord(policy) ||
    typeof policy.state !== "string" ||
    !Array.isArray(policy.reasons) ||
    typeof policy.recommendedNextStep !== "string" ||
    typeof policy.requiresOperatorReview !== "boolean" ||
    typeof policy.allowsShadow !== "boolean" ||
    typeof policy.allowsCanary !== "boolean" ||
    typeof policy.allowsProductionConsideration !== "boolean" ||
    typeof policy.recommendsAiRemediation !== "boolean"
  ) {
    return false;
  }

  const enforcement = value.pageEnforcement;
  const hasStage = (stage: "SHADOW" | "CANARY" | "PRODUCTION") => {
    const stageValue = isRecord(enforcement) ? enforcement[stage] : null;
    return (
      isRecord(stageValue) &&
      stageValue.targetStage === stage &&
      typeof stageValue.decision === "string" &&
      Array.isArray(stageValue.reasons) &&
      Array.isArray(stageValue.blockingReasons) &&
      typeof stageValue.recommendedNextStep === "string" &&
      typeof stageValue.requiresOperatorReview === "boolean" &&
      isRecord(stageValue.enforcementSourceState)
    );
  };

  return hasStage("SHADOW") && hasStage("CANARY") && hasStage("PRODUCTION");
}

function requiredInputBlockers(input: SourceOwnedPageGovernanceRemediationInput): SourceOwnedPageGovernanceRemediationBlocker[] {
  const blockers: SourceOwnedPageGovernanceRemediationBlocker[] = [];
  for (const field of [
    "tenantId",
    "clientId",
    "siteId",
    "migrationId",
    "sourceEvidenceReviewId",
    "sourceUrl",
    "sourceEvidencePackageKey",
    "sourceWatermark",
    "runtimeSiteId",
    "candidateSiteVersionId",
    "runtimeArtifactId",
    "routePath",
    "idempotencyKey",
    "correlationId",
  ] as const) {
    if (!text(input[field])) blockers.push({ code: `${field}_required`, message: `${field} is required.` });
  }
  return blockers;
}

function pushMismatch(
  blockers: SourceOwnedPageGovernanceRemediationBlocker[],
  code: string,
  actual: unknown,
  expected: unknown,
): void {
  if (text(actual) !== text(expected)) {
    blockers.push({ code, message: `${code}: expected ${text(expected)}, found ${text(actual) || "null"}.` });
  }
}

function itemVerified(item: SingleSiteEvidenceItemRow | undefined): boolean {
  if (!item) return false;
  if (item.blocks_clone_generation) return false;
  return item.status === "present" || item.status === "present_with_warnings";
}

function buildSourceEvidenceBlockers(input: {
  review: SingleSiteSourceEvidenceReviewRow | null;
  items: SingleSiteEvidenceItemRow[];
  refs: Record<string, unknown>[];
  events: SingleSiteReviewEventRow[];
  expected: SourceOwnedPageGovernanceRemediationInput;
}): SourceOwnedPageGovernanceRemediationBlocker[] {
  const blockers: SourceOwnedPageGovernanceRemediationBlocker[] = [];
  const { review, expected } = input;
  if (!review) return [{ code: "source_evidence_review_missing", message: "Source evidence review was not found." }];

  pushMismatch(blockers, "source_review_migration_mismatch", review.migration_id, expected.migrationId);
  pushMismatch(blockers, "source_review_tenant_mismatch", review.tenant_id, expected.tenantId);
  pushMismatch(blockers, "source_review_client_mismatch", review.client_id, expected.clientId);
  pushMismatch(blockers, "source_review_site_mismatch", review.site_id, expected.siteId);
  pushMismatch(blockers, "source_review_runtime_site_mismatch", review.runtime_site_id, expected.runtimeSiteId);
  pushMismatch(blockers, "source_review_url_mismatch", review.source_url, expected.sourceUrl);
  pushMismatch(blockers, "source_review_package_mismatch", review.source_evidence_package_key, expected.sourceEvidencePackageKey);
  pushMismatch(blockers, "source_review_watermark_mismatch", review.source_watermark, expected.sourceWatermark);

  if (review.review_status !== "accepted" && review.review_status !== "accepted_with_limitations") {
    blockers.push({ code: "source_review_not_accepted", message: "Source evidence review is not accepted." });
  }
  if (review.retry_required) {
    blockers.push({ code: "source_review_retry_required", message: "Source evidence review requires retry." });
  }
  if (!review.clone_generation_allowed) {
    blockers.push({ code: "source_review_clone_generation_not_allowed", message: "Accepted source evidence is not clone-generation allowed." });
  }
  if (review.completeness_status !== "complete" && review.completeness_status !== "complete_with_warnings") {
    blockers.push({ code: "source_review_completeness_not_sufficient", message: "Source evidence completeness is not sufficient." });
  }

  const itemsByCategory = new Map(input.items.map((item) => [item.evidence_category, item]));
  const missingCategories = SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES.filter(
    (category) => !itemVerified(itemsByCategory.get(category)),
  );
  if (missingCategories.length > 0) {
    blockers.push({
      code: "required_source_evidence_categories_missing",
      message: `Required source evidence categories are missing or unverified: ${missingCategories.join(", ")}.`,
    });
  }

  if (input.refs.length === 0) {
    blockers.push({ code: "source_evidence_review_refs_missing", message: "Source evidence review refs are missing." });
  }
  const acceptedEvent = input.events.some((event) => event.event_action === "accepted" || event.event_action === "accepted_with_limitations");
  if (!acceptedEvent) {
    blockers.push({ code: "source_evidence_acceptance_event_missing", message: "Source evidence acceptance event is missing." });
  }

  return blockers;
}

function buildGovernance(input: {
  source: SourceOwnedPageGovernanceRemediationInput;
  acceptedLimitations: unknown[];
}): SourceOwnedGovernanceSnapshot {
  const pageMigrationGate = {
    state: "PRODUCTION_CANDIDATE" as const,
    score: 1,
    reasons: [
      "reconstructed_by_source_owned_page_governance_remediation",
      "accepted_single_site_source_evidence_review_verified",
      "required_single_site_source_evidence_categories_verified",
      "candidate_artifact_identity_verified",
      `source_package:${input.source.sourceEvidencePackageKey}`,
      `source_watermark:${input.source.sourceWatermark}`,
    ],
    weakSectionIds: [],
    anomalySummary: [],
    recommendedAction: "PRODUCTION_ELIGIBLE" as const,
  };
  const pageRolloutPolicy = evaluatePageRolloutPolicy(pageMigrationGate);
  const pageEnforcement = evaluatePageRolloutEnforcementByStage({
    pageMigrationGate,
    pageRolloutPolicy,
    pageStructuralConfidence: 1,
    weakSectionIds: [],
    structuralAnomalies: [],
  });

  return {
    pageStructuralConfidence: 1,
    weakSectionIds: [],
    structuralAnomalies: [],
    pageMigrationGate,
    pageRolloutPolicy,
    pageEnforcement,
    sourceOwnedRemediation: {
      version: SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION,
      tenantId: input.source.tenantId,
      clientId: input.source.clientId,
      siteId: input.source.siteId,
      migrationId: input.source.migrationId,
      sourceEvidenceReviewId: input.source.sourceEvidenceReviewId,
      sourceUrl: input.source.sourceUrl,
      sourceEvidencePackageKey: input.source.sourceEvidencePackageKey,
      sourceWatermark: input.source.sourceWatermark,
      runtimeSiteId: input.source.runtimeSiteId,
      candidateSiteVersionId: input.source.candidateSiteVersionId,
      runtimeArtifactId: input.source.runtimeArtifactId,
      routePath: normalizeRoutePath(input.source.routePath),
      acceptedLimitations: input.acceptedLimitations,
      correlationId: input.source.correlationId,
      idempotencyKey: input.source.idempotencyKey,
    },
  };
}

function countGovernedPages(siteVersion: Awaited<ReturnType<typeof getSiteVersion>>): number {
  return siteVersion?.pages.filter((page) => governanceComplete(page.migrationGovernance)).length ?? 0;
}

function migrationLinkedToReview(refs: SingleSiteMigrationRefRow[], reviewId: string): boolean {
  return refs.some((ref) => text(ref.source_record_id) === reviewId || text(ref.ref_type) === "source_evidence_review");
}

async function listRows<T>(
  repository: SingleSiteStateWriterRepository,
  sql: string,
  values: readonly unknown[],
): Promise<T[]> {
  return repository.withTransaction(async (tx: SingleSitePgClient) => {
    const result = await tx.query(sql, values);
    return result.rows as unknown as T[];
  });
}

export function createSourceOwnedPageGovernanceRemediationDbDependencies(
  repository = new SingleSiteStateWriterRepository(),
): SourceOwnedPageGovernanceRemediationDependencies {
  return {
    getMigrationById: (migrationId) => repository.withTransaction((tx) => repository.getMigrationById(tx, migrationId)),
    listMigrationRefs: (migrationId) =>
      listRows<SingleSiteMigrationRefRow>(
        repository,
        "select * from public.gnr8_single_site_migration_refs where migration_id = $1::uuid order by created_at asc",
        [migrationId],
      ),
    listMigrationStateEvents: (migrationId) =>
      listRows<Record<string, unknown>>(
        repository,
        "select * from public.gnr8_single_site_migration_state_events where migration_id = $1::uuid order by event_index asc",
        [migrationId],
      ),
    getSourceEvidenceReviewById: (reviewId) =>
      repository.withTransaction((tx) => repository.getSourceEvidenceReviewById(tx, reviewId)),
    listSourceEvidenceReviewItems: (reviewId) =>
      repository.withTransaction((tx) => repository.listSourceEvidenceReviewItems(tx, reviewId)),
    listSourceEvidenceReviewRefs: (reviewId) =>
      listRows<Record<string, unknown>>(
        repository,
        "select * from public.gnr8_single_site_source_evidence_review_refs where review_id = $1::uuid order by created_at asc",
        [reviewId],
      ),
    listSourceEvidenceReviewEvents: (reviewId) =>
      listRows<SingleSiteReviewEventRow>(
        repository,
        "select * from public.gnr8_single_site_source_evidence_review_events where review_id = $1::uuid order by event_index asc",
        [reviewId],
      ),
    getRuntimeSiteVersionOwnershipSnapshot,
    getSiteVersion,
    getArtifactById,
    getActivePointerForSite,
    materializePageMigrationGovernanceForSiteVersion,
  };
}

export async function createSourceOwnedPageGovernanceRemediationPlan(
  input: SourceOwnedPageGovernanceRemediationInput,
  deps: SourceOwnedPageGovernanceRemediationDependencies = createSourceOwnedPageGovernanceRemediationDbDependencies(),
): Promise<SourceOwnedPageGovernanceRemediationPlan> {
  const normalizedInput = { ...input, routePath: normalizeRoutePath(input.routePath) };
  const blockers = requiredInputBlockers(normalizedInput);
  const [
    migration,
    migrationRefs,
    migrationEvents,
    sourceReview,
    sourceItems,
    sourceRefs,
    sourceEvents,
    ownership,
    siteVersion,
    artifact,
    activePointerBefore,
  ] = await Promise.all([
    text(normalizedInput.migrationId) ? deps.getMigrationById(normalizedInput.migrationId) : Promise.resolve(null),
    text(normalizedInput.migrationId) ? deps.listMigrationRefs(normalizedInput.migrationId) : Promise.resolve([]),
    text(normalizedInput.migrationId) ? deps.listMigrationStateEvents(normalizedInput.migrationId) : Promise.resolve([]),
    text(normalizedInput.sourceEvidenceReviewId) ? deps.getSourceEvidenceReviewById(normalizedInput.sourceEvidenceReviewId) : Promise.resolve(null),
    text(normalizedInput.sourceEvidenceReviewId) ? deps.listSourceEvidenceReviewItems(normalizedInput.sourceEvidenceReviewId) : Promise.resolve([]),
    text(normalizedInput.sourceEvidenceReviewId) ? deps.listSourceEvidenceReviewRefs(normalizedInput.sourceEvidenceReviewId) : Promise.resolve([]),
    text(normalizedInput.sourceEvidenceReviewId) ? deps.listSourceEvidenceReviewEvents(normalizedInput.sourceEvidenceReviewId) : Promise.resolve([]),
    text(normalizedInput.candidateSiteVersionId)
      ? deps.getRuntimeSiteVersionOwnershipSnapshot(normalizedInput.candidateSiteVersionId)
      : Promise.resolve(null),
    text(normalizedInput.candidateSiteVersionId) ? deps.getSiteVersion(normalizedInput.candidateSiteVersionId) : Promise.resolve(null),
    text(normalizedInput.runtimeArtifactId) ? deps.getArtifactById(normalizedInput.runtimeArtifactId) : Promise.resolve(null),
    text(normalizedInput.runtimeSiteId) ? deps.getActivePointerForSite(normalizedInput.runtimeSiteId) : Promise.resolve(null),
  ]);

  if (!migration) {
    blockers.push({ code: "migration_missing", message: "Single-site migration was not found." });
  } else {
    pushMismatch(blockers, "migration_tenant_mismatch", migration.tenant_id, normalizedInput.tenantId);
    pushMismatch(blockers, "migration_client_mismatch", migration.client_id, normalizedInput.clientId);
    pushMismatch(blockers, "migration_site_mismatch", migration.site_id, normalizedInput.siteId);
    pushMismatch(blockers, "migration_runtime_site_mismatch", migration.runtime_site_id, normalizedInput.runtimeSiteId);
    pushMismatch(blockers, "migration_source_url_mismatch", migration.source_url, normalizedInput.sourceUrl);
    pushMismatch(blockers, "migration_latest_source_review_mismatch", migration.latest_source_evidence_review_id, normalizedInput.sourceEvidenceReviewId);
    if (!migrationLinkedToReview(migrationRefs, normalizedInput.sourceEvidenceReviewId)) {
      blockers.push({ code: "migration_source_review_ref_missing", message: "Migration refs do not link the selected source evidence review." });
    }
    if (migrationEvents.length === 0) {
      blockers.push({ code: "migration_state_events_missing", message: "Migration state event spine is missing." });
    }
  }

  blockers.push(
    ...buildSourceEvidenceBlockers({
      review: sourceReview,
      items: sourceItems,
      refs: sourceRefs,
      events: sourceEvents,
      expected: normalizedInput,
    }),
  );

  if (!ownership) {
    blockers.push({ code: "candidate_ownership_snapshot_missing", message: "Candidate runtime ownership snapshot was not found." });
  } else {
    pushMismatch(blockers, "candidate_runtime_site_mismatch", ownership.siteId, normalizedInput.runtimeSiteId);
    pushMismatch(blockers, "candidate_artifact_binding_mismatch", ownership.artifactId, normalizedInput.runtimeArtifactId);
    if (ownership.state !== "APPROVED") {
      blockers.push({ code: "candidate_not_approved", message: "Candidate site version is not APPROVED." });
    }
  }

  if (!siteVersion) {
    blockers.push({ code: "candidate_site_version_missing", message: "Candidate site version snapshot was not found." });
  } else {
    pushMismatch(blockers, "site_version_runtime_site_mismatch", siteVersion.siteId, normalizedInput.runtimeSiteId);
    pushMismatch(blockers, "site_version_artifact_binding_mismatch", siteVersion.artifactId, normalizedInput.runtimeArtifactId);
  }

  if (!artifact) {
    blockers.push({ code: "runtime_artifact_missing", message: "Runtime artifact was not found." });
  } else {
    const typedArtifact = artifact as RuntimeArtifact;
    pushMismatch(blockers, "artifact_runtime_site_mismatch", typedArtifact.siteId, normalizedInput.runtimeSiteId);
    pushMismatch(blockers, "artifact_site_version_mismatch", typedArtifact.siteVersionId, normalizedInput.candidateSiteVersionId);
  }

  const pageCount = siteVersion?.pages.length ?? 0;
  const targetPages = siteVersion?.pages.filter((page) => normalizeRoutePath(page.path) === normalizedInput.routePath) ?? [];
  const targetPage = targetPages[0] ?? null;
  if (pageCount === 0) {
    blockers.push({ code: "candidate_pages_missing", message: "Candidate site version has no pages." });
  }
  if (targetPages.length === 0) {
    blockers.push({ code: "target_page_missing", message: `Target page ${normalizedInput.routePath} was not found.` });
  }
  if (targetPages.length > 1) {
    blockers.push({ code: "target_page_ambiguous", message: `Target page ${normalizedInput.routePath} resolved to multiple page rows.` });
  }

  const pagesWithMigrationGovernance = countGovernedPages(siteVersion);
  const acceptedLimitations = [
    ...jsonArray(sourceReview?.review_limitations_json),
    ...sourceItems.filter((item) => item.accepted_limitation).map((item) => item.limitation_json).filter((value) => value != null),
  ];
  const governanceByPageId =
    targetPage && !governanceComplete(targetPage.migrationGovernance) && blockers.length === 0
      ? {
          [targetPage.pageId]: buildGovernance({
            source: normalizedInput,
            acceptedLimitations,
          }),
        }
      : {};

  const missingEvidenceCategories = SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES.filter(
    (category) => !itemVerified(sourceItems.find((item) => item.evidence_category === category)),
  );
  const evidence: SourceOwnedPageGovernanceRemediationEvidence = {
    migrationRefCount: migrationRefs.length,
    migrationEventCount: migrationEvents.length,
    sourceEvidenceReviewRefCount: sourceRefs.length,
    sourceEvidenceReviewEventCount: sourceEvents.length,
    sourceEvidenceItemCount: sourceItems.length,
    requiredEvidenceCategories: [...SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES],
    missingEvidenceCategories,
    acceptedLimitations,
    sourceReviewStatus: sourceReview?.review_status ?? null,
    sourceCompletenessStatus: sourceReview?.completeness_status ?? null,
    sourcePackage: sourceReview?.source_evidence_package_key ?? null,
    sourceWatermark: sourceReview?.source_watermark ?? null,
  };

  const status =
    blockers.length > 0
      ? "blocked"
      : targetPage && governanceComplete(targetPage.migrationGovernance)
        ? "already_valid"
        : "ready_to_materialize";

  return {
    version: SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION,
    status,
    input: normalizedInput,
    pageCount,
    pagesWithMigrationGovernance,
    targetPageId: targetPage?.pageId ?? null,
    targetRoutePath: normalizedInput.routePath,
    activePointerBefore,
    candidateState: ownership?.state ?? siteVersion?.state ?? null,
    artifactBinding: ownership?.artifactId ?? siteVersion?.artifactId ?? null,
    blockers,
    evidence,
    governanceByPageId,
  };
}

export async function applySourceOwnedPageGovernanceRemediation(
  input: SourceOwnedPageGovernanceRemediationInput,
  deps: SourceOwnedPageGovernanceRemediationDependencies = createSourceOwnedPageGovernanceRemediationDbDependencies(),
): Promise<SourceOwnedPageGovernanceRemediationResult> {
  const plan = await createSourceOwnedPageGovernanceRemediationPlan(input, deps);
  if (plan.status === "blocked") {
    throw new SingleSiteTransitionError(`source-owned page governance remediation blocked: ${JSON.stringify(plan.blockers)}`);
  }

  let materialization: SourceOwnedPageGovernanceRemediationResult["materialization"] = null;
  const pageIds = Object.keys(plan.governanceByPageId);
  if (pageIds.length > 0) {
    materialization = await deps.materializePageMigrationGovernanceForSiteVersion({
      siteVersionId: plan.input.candidateSiteVersionId,
      governanceByPageId: plan.governanceByPageId,
      actor: text(plan.input.actor) || DEFAULT_ACTOR,
      details: {
        workflow: SOURCE_OWNED_PAGE_GOVERNANCE_REMEDIATION_VERSION,
        sourceEvidenceReviewId: plan.input.sourceEvidenceReviewId,
        sourceEvidencePackageKey: plan.input.sourceEvidencePackageKey,
        sourceWatermark: plan.input.sourceWatermark,
        tenantId: plan.input.tenantId,
        clientId: plan.input.clientId,
        siteId: plan.input.siteId,
        migrationId: plan.input.migrationId,
        runtimeSiteId: plan.input.runtimeSiteId,
        runtimeArtifactId: plan.input.runtimeArtifactId,
        routePath: plan.targetRoutePath,
        correlationId: plan.input.correlationId,
        idempotencyKey: plan.input.idempotencyKey,
      },
    });
    if (materialization.affectedRows < pageIds.length) {
      throw new SingleSiteTransitionError("source-owned page governance remediation did not update every target page");
    }
  }

  const [afterSiteVersion, afterOwnership, activePointerAfter] = await Promise.all([
    deps.getSiteVersion(plan.input.candidateSiteVersionId),
    deps.getRuntimeSiteVersionOwnershipSnapshot(plan.input.candidateSiteVersionId),
    deps.getActivePointerForSite(plan.input.runtimeSiteId),
  ]);

  return {
    ok: true,
    plan,
    materialization,
    pageCountAfter: afterSiteVersion?.pages.length ?? 0,
    pagesWithMigrationGovernanceAfter: countGovernedPages(afterSiteVersion),
    candidateStateAfter: afterOwnership?.state ?? afterSiteVersion?.state ?? null,
    artifactBindingAfter: afterOwnership?.artifactId ?? afterSiteVersion?.artifactId ?? null,
    activePointerAfter,
    activePointerUnchanged:
      (plan.activePointerBefore?.siteVersionId ?? null) === (activePointerAfter?.siteVersionId ?? null) &&
      (plan.activePointerBefore?.artifactId ?? null) === (activePointerAfter?.artifactId ?? null),
  };
}
