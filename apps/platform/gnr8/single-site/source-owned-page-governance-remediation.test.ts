import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";
import {
  applySourceOwnedPageGovernanceRemediation,
  createSourceOwnedPageGovernanceRemediationPlan,
  type SourceOwnedPageGovernanceRemediationDependencies,
  type SourceOwnedPageGovernanceRemediationInput,
} from "./source-owned-page-governance-remediation";
import type {
  SingleSiteEvidenceItemRow,
  SingleSiteMigrationRefRow,
  SingleSiteMigrationRow,
  SingleSiteReviewEventRow,
  SingleSiteSourceEvidenceReviewRow,
} from "./single-site-state-writer-repository";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "source-owned-page-governance-remediation.ts");
const TENANT_ID = "6a09c2d9-12c3-4c19-a466-0c29ae2f723e";
const CLIENT_ID = "e61d1982-068f-4d84-bb6f-c3fbfc93f39b";
const SITE_ID = "a03fcb5b-6ad9-4b19-a682-4c06f998881a";
const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const REVIEW_ID = "40c0b86c-0349-4b7c-89c2-bfdef7e9fea3";
const RUNTIME_SITE_ID = "site_57d9665a3a5867edf6ef";
const SITE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";
const SOURCE_URL = "https://www.chs.si/";
const SOURCE_PACKAGE = "url-import-snapshot:imported-url-site-6cba4d2b35d630b5";
const SOURCE_WATERMARK = "imported-url-site-6cba4d2b35d630b5";

function input(overrides: Partial<SourceOwnedPageGovernanceRemediationInput> = {}): SourceOwnedPageGovernanceRemediationInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    sourceEvidenceReviewId: REVIEW_ID,
    sourceUrl: SOURCE_URL,
    sourceEvidencePackageKey: SOURCE_PACKAGE,
    sourceWatermark: SOURCE_WATERMARK,
    runtimeSiteId: RUNTIME_SITE_ID,
    candidateSiteVersionId: SITE_VERSION_ID,
    runtimeArtifactId: ARTIFACT_ID,
    routePath: "/",
    idempotencyKey: "gnr8-cutline-61-chs-si-page-governance-source-remediation-20260829",
    correlationId: "gnr8-cutline-61-chs-si-page-governance-20260829",
    actor: "operator:cutline-61",
    ...overrides,
  };
}

function migration(overrides: Partial<SingleSiteMigrationRow> = {}): SingleSiteMigrationRow {
  return {
    id: MIGRATION_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    ownership_site_id: SITE_ID,
    runtime_site_id: RUNTIME_SITE_ID,
    site_version_id: null,
    runtime_site_version_id: null,
    source_url: SOURCE_URL,
    canonical_source_url: SOURCE_URL,
    intended_launch_domain: "www.chs.si",
    current_state: "publish_ready",
    current_stage: "launch_publish_recovery",
    state_version: 12,
    operator_owner_actor_id: null,
    current_blocker_count: 0,
    latest_source_evidence_review_id: REVIEW_ID,
    latest_state_event_id: "state-event-1",
    latest_aaf_evidence_package_id: null,
    latest_aaf_audit_event_id: null,
    source_capture_refs_json: {},
    runtime_refs_json: {},
    proposal_refs_json: {},
    aaf_approval_refs_json: {},
    aaf_evidence_refs_json: {},
    aaf_audit_refs_json: {},
    ddom_snapshot_refs_json: {},
    ptt_publish_target_refs_json: {},
    billing_subscription_refs_json: {},
    hosting_entitlement_refs_json: {},
    rollback_refs_json: {},
    closeout_refs_json: {},
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    source_watermark: SOURCE_WATERMARK,
    payload_hash: null,
    validation_site_number: 1,
    created_by_actor_type: "human",
    created_by_actor_id: "operator",
    created_by_actor_display_label: null,
    correlation_id: "corr",
    causation_id: null,
    idempotency_key: "migration-idem",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    terminal_at: null,
    created_at: "2026-08-18T00:00:00.000Z",
    updated_at: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

function sourceReview(overrides: Partial<SingleSiteSourceEvidenceReviewRow> = {}): SingleSiteSourceEvidenceReviewRow {
  return {
    id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    ownership_site_id: SITE_ID,
    runtime_site_id: RUNTIME_SITE_ID,
    site_version_id: null,
    source_url: SOURCE_URL,
    canonical_source_url: SOURCE_URL,
    capture_run_id: "capture-1",
    render_job_id: "render-1",
    source_evidence_package_key: SOURCE_PACKAGE,
    source_watermark: SOURCE_WATERMARK,
    source_hash: "source-hash",
    capture_started_at: "2026-08-18T00:00:00.000Z",
    capture_completed_at: "2026-08-18T00:01:00.000Z",
    evidence_captured_at: "2026-08-18T00:01:00.000Z",
    fresh_until: null,
    completeness_status: "complete_with_warnings",
    review_status: "accepted",
    review_decision: "accept",
    accepted_degraded_capture: false,
    retry_required: false,
    clone_generation_allowed: true,
    review_limitations_json: [{ code: "missing_font_source_evidence", accepted: true }],
    missing_evidence_json: [],
    warnings_json: [],
    blockers_json: [],
    diagnostics_json: {},
    reviewer_actor_type: "human",
    reviewer_actor_id: "reviewer",
    reviewer_actor_role: "source_evidence_reviewer",
    reviewer_actor_display_label: null,
    review_started_at: "2026-08-18T00:02:00.000Z",
    reviewed_at: "2026-08-18T00:03:00.000Z",
    supersedes_review_id: null,
    superseded_by_review_id: null,
    aaf_evidence_package_id: null,
    aaf_approval_request_id: null,
    aaf_approval_decision_id: null,
    aaf_audit_event_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    correlation_id: "corr-review",
    causation_id: null,
    idempotency_key: "review-idem",
    request_id: null,
    metadata_json: {},
    created_at: "2026-08-18T00:00:00.000Z",
    updated_at: "2026-08-18T00:03:00.000Z",
    ...overrides,
  };
}

function evidenceItems(overrides: Partial<SingleSiteEvidenceItemRow>[] = []): SingleSiteEvidenceItemRow[] {
  const categories = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
  return categories.map((category, index) => ({
    id: `item-${category}`,
    review_id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    evidence_category: category,
    status: "present",
    required_for_clone: true,
    blocks_clone_generation: false,
    accepted_limitation: false,
    finding_summary: null,
    ref_ids_json: [],
    limitation_json: {},
    warnings_json: [],
    blocker_json: {},
    reviewer_actor_type: "human",
    reviewer_actor_id: "reviewer",
    reviewer_actor_display_label: null,
    correlation_id: "corr-item",
    idempotency_key: `item-idem-${category}`,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: "2026-08-18T00:00:00.000Z",
    updated_at: "2026-08-18T00:00:00.000Z",
    ...overrides[index],
  }));
}

function siteVersion(overrides: Partial<CanonicalSiteVersionSnapshot> = {}): CanonicalSiteVersionSnapshot {
  return {
    id: SITE_VERSION_ID,
    siteId: RUNTIME_SITE_ID,
    versionNo: 3,
    state: "APPROVED",
    source: "migration",
    actor: "human:gregorzigon:improved-candidate",
    createdAt: "2026-08-21T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: ARTIFACT_ID,
    importProvenanceSummary: null,
    pages: [
      {
        id: "page-version-root",
        siteVersionId: SITE_VERSION_ID,
        pageId: "page_44f18ca16509a5109482",
        path: "/",
        title: "Home | CHS",
        structureModel: { sections: [] },
        contentModel: { sectionProps: {} },
        styleTokens: {},
        assetGraph: [],
        semanticSignals: [],
        migrationGovernance: null,
        source: "migration",
        actor: "test",
        createdAt: "2026-08-21T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function artifact(overrides: Partial<RuntimeArtifact> = {}): RuntimeArtifact {
  return {
    id: ARTIFACT_ID,
    siteId: RUNTIME_SITE_ID,
    siteVersionId: SITE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { paths: ["/"] },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "UNKNOWN",
      siteRolloutPolicyState: "UNKNOWN",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW_ONLY", production: "REVIEW_ONLY" },
      publishStage: "shadow",
    },
    bundleSha256: "bundle",
    createdAt: "2026-08-21T00:00:00.000Z",
    ...overrides,
  };
}

function migrationRef(): SingleSiteMigrationRefRow {
  return {
    id: "migration-ref-source-review",
    migration_id: MIGRATION_ID,
    state_event_id: "state-event-1",
    ref_role: "source_evidence_review",
    ref_type: "source_evidence_review",
    source_system: "gnr8",
    source_table: "gnr8_single_site_source_evidence_reviews",
    source_record_id: REVIEW_ID,
    source_version: null,
    source_watermark: SOURCE_WATERMARK,
    payload_hash: null,
    captured_at: null,
    fresh_until: null,
    superseded_by_ref_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    correlation_id: "corr",
    idempotency_key: "migration-ref-idem",
    metadata_json: {},
    created_at: "2026-08-18T00:00:00.000Z",
  };
}

function reviewEvent(overrides: Partial<SingleSiteReviewEventRow> = {}): SingleSiteReviewEventRow {
  return {
    id: "review-event-accepted",
    review_id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    event_index: 3,
    event_action: "accepted",
    from_status: "review_in_progress",
    to_status: "accepted",
    actor_type: "human",
    actor_id: "reviewer",
    actor_role: "source_evidence_reviewer",
    actor_display_label: null,
    details_json: {},
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    aaf_audit_event_id: null,
    aaf_approval_decision_id: null,
    source_watermark: SOURCE_WATERMARK,
    payload_hash: null,
    correlation_id: "corr",
    causation_id: null,
    idempotency_key: "review-event-idem",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    occurred_at: "2026-08-18T00:03:00.000Z",
    created_at: "2026-08-18T00:03:00.000Z",
    ...overrides,
  };
}

function deps(overrides: Partial<SourceOwnedPageGovernanceRemediationDependencies> = {}) {
  const calls: Array<{ name: string; input?: unknown }> = [];
  let currentSiteVersion = siteVersion();
  const defaultDeps: SourceOwnedPageGovernanceRemediationDependencies = {
    async getMigrationById(migrationId) {
      calls.push({ name: "getMigrationById", input: migrationId });
      return migration();
    },
    async listMigrationRefs(migrationId) {
      calls.push({ name: "listMigrationRefs", input: migrationId });
      return [migrationRef()];
    },
    async listMigrationStateEvents(migrationId) {
      calls.push({ name: "listMigrationStateEvents", input: migrationId });
      return [{ id: "state-event-1", migration_id: migrationId }];
    },
    async getSourceEvidenceReviewById(reviewId) {
      calls.push({ name: "getSourceEvidenceReviewById", input: reviewId });
      return sourceReview();
    },
    async listSourceEvidenceReviewItems(reviewId) {
      calls.push({ name: "listSourceEvidenceReviewItems", input: reviewId });
      return evidenceItems();
    },
    async listSourceEvidenceReviewRefs(reviewId) {
      calls.push({ name: "listSourceEvidenceReviewRefs", input: reviewId });
      return [{ id: "source-ref-1", review_id: reviewId, ref_role: "source_snapshot" }];
    },
    async listSourceEvidenceReviewEvents(reviewId) {
      calls.push({ name: "listSourceEvidenceReviewEvents", input: reviewId });
      return [reviewEvent()];
    },
    async getRuntimeSiteVersionOwnershipSnapshot(siteVersionId) {
      calls.push({ name: "getRuntimeSiteVersionOwnershipSnapshot", input: siteVersionId });
      return {
        id: SITE_VERSION_ID,
        siteId: RUNTIME_SITE_ID,
        versionNo: 3,
        state: currentSiteVersion.state,
        artifactId: ARTIFACT_ID,
        ownershipSiteId: SITE_ID,
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-29T00:00:00.000Z",
      };
    },
    async getSiteVersion(siteVersionId) {
      calls.push({ name: "getSiteVersion", input: siteVersionId });
      return currentSiteVersion;
    },
    async getArtifactById(artifactId) {
      calls.push({ name: "getArtifactById", input: artifactId });
      return artifact();
    },
    async getActivePointerForSite(siteId) {
      calls.push({ name: "getActivePointerForSite", input: siteId });
      return null;
    },
    async materializePageMigrationGovernanceForSiteVersion(materializeInput) {
      calls.push({ name: "materializePageMigrationGovernanceForSiteVersion", input: materializeInput });
      currentSiteVersion = {
        ...currentSiteVersion,
        pages: currentSiteVersion.pages.map((page) => ({
          ...page,
          migrationGovernance: materializeInput.governanceByPageId[page.pageId] ?? page.migrationGovernance,
        })),
      };
      return { affectedRows: Object.keys(materializeInput.governanceByPageId).length, pageIds: Object.keys(materializeInput.governanceByPageId) };
    },
    ...overrides,
  };
  return { calls, deps: defaultDeps };
}

test("builds required migration governance from source-owned evidence and materializes it", async () => {
  const harness = deps();
  const result = await applySourceOwnedPageGovernanceRemediation(input(), harness.deps);

  assert.equal(result.ok, true);
  assert.equal(result.plan.status, "ready_to_materialize");
  assert.equal(result.plan.pageCount, 1);
  assert.equal(result.plan.pagesWithMigrationGovernance, 0);
  assert.equal(result.pagesWithMigrationGovernanceAfter, 1);
  assert.equal(result.activePointerUnchanged, true);

  const materialize = harness.calls.find((call) => call.name === "materializePageMigrationGovernanceForSiteVersion");
  assert.ok(materialize);
  const materializeInput = materialize.input as Parameters<SourceOwnedPageGovernanceRemediationDependencies["materializePageMigrationGovernanceForSiteVersion"]>[0];
  assert.equal(materializeInput.siteVersionId, SITE_VERSION_ID);
  assert.equal(materializeInput.actor, "operator:cutline-61");
  const governance = materializeInput.governanceByPageId.page_44f18ca16509a5109482 as Record<string, unknown>;
  assert.equal(typeof governance.pageStructuralConfidence, "number");
  assert.deepEqual(governance.weakSectionIds, []);
  assert.deepEqual(governance.structuralAnomalies, []);
  assert.ok(governance.pageMigrationGate);
  assert.ok(governance.pageRolloutPolicy);
  assert.ok(governance.pageEnforcement);
  assert.deepEqual((governance.sourceOwnedRemediation as Record<string, unknown>).acceptedLimitations, [
    { code: "missing_font_source_evidence", accepted: true },
  ]);
  assert.equal((governance.sourceOwnedRemediation as Record<string, unknown>).sourceEvidenceReviewId, REVIEW_ID);
  assert.equal((governance.sourceOwnedRemediation as Record<string, unknown>).runtimeArtifactId, ARTIFACT_ID);
});

test("fails closed when source evidence is missing", async () => {
  const harness = deps({
    async getSourceEvidenceReviewById() {
      return null;
    },
  });

  const plan = await createSourceOwnedPageGovernanceRemediationPlan(input(), harness.deps);
  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockers.some((blocker) => blocker.code === "source_evidence_review_missing"));
  assert.equal(harness.calls.some((call) => call.name === "materializePageMigrationGovernanceForSiteVersion"), false);
});

test("fails closed on wrong site, migration, candidate, and artifact identity", async () => {
  const harness = deps({
    async getMigrationById() {
      return migration({ client_id: "wrong-client" });
    },
    async getSourceEvidenceReviewById() {
      return sourceReview({ migration_id: "wrong-migration" });
    },
    async getRuntimeSiteVersionOwnershipSnapshot() {
      return {
        id: SITE_VERSION_ID,
        siteId: "wrong-runtime-site",
        versionNo: 3,
        state: "APPROVED",
        artifactId: "wrong-artifact",
        ownershipSiteId: SITE_ID,
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-29T00:00:00.000Z",
      };
    },
    async getArtifactById() {
      return artifact({ siteVersionId: "wrong-version" });
    },
  });

  const plan = await createSourceOwnedPageGovernanceRemediationPlan(input(), harness.deps);
  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockers.some((blocker) => blocker.code === "migration_client_mismatch"));
  assert.ok(plan.blockers.some((blocker) => blocker.code === "source_review_migration_mismatch"));
  assert.ok(plan.blockers.some((blocker) => blocker.code === "candidate_runtime_site_mismatch"));
  assert.ok(plan.blockers.some((blocker) => blocker.code === "candidate_artifact_binding_mismatch"));
  assert.ok(plan.blockers.some((blocker) => blocker.code === "artifact_site_version_mismatch"));
});

test("does not mutate active pointer or call publish/provider/billing/domain workflows", async () => {
  const source = readFileSync(SOURCE_PATH, "utf8");
  assert.doesNotMatch(source, /publishApprovedSiteVersion|transferRuntimeHostBinding|createApprovalRequest|createApprovalDecision|createGateAttempt|Stripe|Openprovider|provider.*mutation|dns.*mutation/i);

  const harness = deps();
  await applySourceOwnedPageGovernanceRemediation(input(), harness.deps);

  assert.deepEqual(
    harness.calls.map((call) => call.name).filter((name) => !name.startsWith("get") && !name.startsWith("list")),
    ["materializePageMigrationGovernanceForSiteVersion"],
  );
  assert.equal(harness.calls.filter((call) => call.name === "getActivePointerForSite").length, 2);
});
