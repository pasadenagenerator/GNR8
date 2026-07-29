import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateCloneGenerationGate,
  SINGLE_SITE_CLONE_GENERATION_GATE_REASONS,
  type SingleSiteCloneGenerationGateResult,
} from "./single-site-clone-generation-gate";
import type { SingleSiteMigrationState, SingleSiteSourceEvidenceReviewStatus } from "./single-site-state-contracts";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-clone-generation-gate.ts");
const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";

function lifecycle(state: SingleSiteMigrationState) {
  return {
    terminal: state === "migration_closed_out" || state === "migration_failed" || state === "migration_cancelled",
    failed: state === "migration_failed",
    cancelled: state === "migration_cancelled",
    closedOut: state === "migration_closed_out",
  };
}

function readModel(input: {
  state?: SingleSiteMigrationState;
  migrationId?: string | null;
  siteId?: string | null;
  reviewStatus?: SingleSiteSourceEvidenceReviewStatus | "missing";
  reviewId?: string | null;
  cloneGenerationAllowed?: boolean;
  limitations?: unknown[];
} = {}): SingleSiteMigrationReadModel {
  const state = input.state ?? "source_evidence_review_required";
  const reviewStatus = input.reviewStatus ?? "accepted";
  const accepted = reviewStatus === "accepted" || reviewStatus === "accepted_with_limitations";
  return {
    derivedOnly: true,
    mutatesSourceTruth: false,
    nonEnforcing: true,
    sourceTruth: "gnr8_single_site_state_spine",
    readModelVersion: "mvp-7-single-site-state-read-model:v1",
    generatedAt: "2026-07-29T12:00:00.000Z",
    capturedAt: "2026-07-29T12:00:00.000Z",
    migration: {
      migrationId: input.migrationId === undefined ? MIGRATION_ID : input.migrationId,
      tenantId: "tenant-gate-test",
      clientId: "client-gate-test",
      siteId: input.siteId === undefined ? SITE_ID : input.siteId,
      ownershipSiteId: null,
      runtimeSiteId: null,
      sourceUrl: "https://example.test",
      canonicalSourceUrl: "https://example.test/",
      intendedLaunchDomain: "example.test",
      validationSiteNumber: null,
      operatorOwnerActorId: null,
      createdAt: "2026-07-29T12:00:00.000Z",
      updatedAt: "2026-07-29T12:00:00.000Z",
    },
    currentState: {
      state,
      stage: lifecycle(state).terminal ? "terminal" : "source_evidence_review",
      stateVersion: 1,
      lifecycle: state === "migration_failed" ? "failed" : state === "migration_cancelled" ? "cancelled" : state === "migration_closed_out" ? "closed_out" : "active",
      active: !lifecycle(state).terminal,
      terminal: lifecycle(state).terminal,
      failed: lifecycle(state).failed,
      cancelled: lifecycle(state).cancelled,
      closedOut: lifecycle(state).closedOut,
      terminalAt: lifecycle(state).terminal ? "2026-07-29T12:00:00.000Z" : null,
    },
    sourceEvidenceReview: {
      reviewId: reviewStatus === "missing" ? null : input.reviewId === undefined ? REVIEW_ID : input.reviewId,
      reviewCount: reviewStatus === "missing" ? 0 : 1,
      reviewStatus,
      reviewDecision: reviewStatus === "accepted" ? "accept" : reviewStatus === "accepted_with_limitations" ? "accept_with_limitations" : null,
      completenessStatus: reviewStatus === "missing" ? "missing" : "complete",
      readyForReview: reviewStatus === "ready_for_review" || reviewStatus === "review_in_progress",
      accepted,
      acceptedWithLimitations: reviewStatus === "accepted_with_limitations",
      acceptedDegradedCapture: reviewStatus === "accepted_with_limitations",
      retryRequired: reviewStatus === "retry_required",
      rejected: reviewStatus === "rejected",
      cloneGenerationAllowed: input.cloneGenerationAllowed ?? accepted,
      cloneBlockedByMissingAcceptance: !accepted,
      limitations: input.limitations ?? [],
      missingEvidence: [],
      warnings: [],
      blockers: [],
      diagnostics: {},
      capturedAt: "2026-07-29T12:00:00.000Z",
      freshUntil: null,
      reviewedAt: accepted ? "2026-07-29T12:00:00.000Z" : null,
      reviewerActorId: accepted ? "reviewer-1" : null,
      aafApprovalDecisionId: reviewStatus === "accepted_with_limitations" ? "aaf-decision-1" : null,
      itemCount: accepted ? 10 : 0,
      requiredItemCount: 10,
      requiredMissingCategories: [],
      cloneBlockingItemCount: 0,
      refs: [],
      events: [],
    },
  } as unknown as SingleSiteMigrationReadModel;
}

async function gate(model: SingleSiteMigrationReadModel | null, migrationId = MIGRATION_ID): Promise<SingleSiteCloneGenerationGateResult> {
  return evaluateCloneGenerationGate({ migrationId, readModel: model });
}

test("clone generation gate is server-only and has no forbidden runtime integrations", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /\b(insert\s+into|update|delete\s+from)\b/i);
  assert.doesNotMatch(source, /from\s+["'][^"']*(runtime-store|generated-website-proposal|billing|stripe|vercel|openprovider|dns|provider|command-center|ops-inbox|publish|rollback|ai)[^"']*["']/i);
  for (const reason of SINGLE_SITE_CLONE_GENERATION_GATE_REASONS) assert.match(source, new RegExp(`"${reason}"`));
});

test("accepted review allows clone generation", async () => {
  const result = await gate(readModel({ reviewStatus: "accepted" }));
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "allowed");
  assert.equal(result.reason, "source_evidence_accepted");
  assert.equal(result.migrationId, MIGRATION_ID);
  assert.equal(result.siteId, SITE_ID);
  assert.equal(result.sourceEvidenceReviewStatus, "accepted");
  assert.equal(result.sourceEvidenceReviewId, REVIEW_ID);
  assert.equal(result.acceptedWithLimitations, false);
  assert.deepEqual(result.limitations, []);
  assert.deepEqual(result.missingRequirements, []);
  assert.equal(result.recommendedNextAction, "start_clone_generation");
  assert.equal(result.derivedOnly, true);
  assert.equal(result.mutatesSourceTruth, false);
});

test("accepted with limitations allows with warning mode and limitations", async () => {
  const limitations = [{ category: "font", reason: "fallback font accepted" }];
  const result = await gate(readModel({ reviewStatus: "accepted_with_limitations", limitations }));
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "warning");
  assert.equal(result.reason, "source_evidence_accepted_with_limitations");
  assert.equal(result.acceptedWithLimitations, true);
  assert.deepEqual(result.limitations, limitations);
  assert.deepEqual(result.missingRequirements, []);
});

test("missing review blocks", async () => {
  const result = await gate(readModel({ reviewStatus: "missing" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_missing");
  assert.deepEqual(result.missingRequirements, ["latest_source_evidence_review"]);
  assert.equal(result.recommendedNextAction, "capture_source_evidence");
});

test("ready_for_review blocks", async () => {
  const result = await gate(readModel({ reviewStatus: "ready_for_review" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_not_ready");
  assert.equal(result.recommendedNextAction, "review_source_evidence");
});

test("review_in_progress blocks", async () => {
  const result = await gate(readModel({ reviewStatus: "review_in_progress" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_review_in_progress");
  assert.equal(result.recommendedNextAction, "review_source_evidence");
});

test("retry_required blocks", async () => {
  const result = await gate(readModel({ reviewStatus: "retry_required" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_retry_required");
  assert.equal(result.recommendedNextAction, "retry_capture");
});

test("rejected blocks", async () => {
  const result = await gate(readModel({ reviewStatus: "rejected" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_rejected");
  assert.equal(result.recommendedNextAction, "retry_capture");
});

test("superseded blocks unless accepted replacement is latest", async () => {
  const superseded = await gate(readModel({ reviewStatus: "superseded" }));
  const acceptedReplacement = await gate(readModel({ reviewStatus: "accepted", reviewId: "replacement-review" }));
  assert.equal(superseded.allowed, false);
  assert.equal(superseded.reason, "source_evidence_superseded");
  assert.deepEqual(superseded.missingRequirements, ["accepted_source_evidence_replacement"]);
  assert.equal(acceptedReplacement.allowed, true);
  assert.equal(acceptedReplacement.reason, "source_evidence_accepted");
  assert.equal(acceptedReplacement.sourceEvidenceReviewId, "replacement-review");
});

test("failed migration blocks", async () => {
  const result = await gate(readModel({ state: "migration_failed", reviewStatus: "accepted" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "migration_failed");
  assert.deepEqual(result.missingRequirements, ["active_migration"]);
});

test("cancelled migration blocks", async () => {
  const result = await gate(readModel({ state: "migration_cancelled", reviewStatus: "accepted" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "migration_cancelled");
  assert.deepEqual(result.missingRequirements, ["active_migration"]);
});

test("closed migration blocks", async () => {
  const result = await gate(readModel({ state: "migration_closed_out", reviewStatus: "accepted" }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "migration_terminal");
  assert.equal(result.recommendedNextAction, "no_action_required");
});

test("missing identity blocks", async () => {
  const missingInput = await evaluateCloneGenerationGate({});
  const blankReadModelId = await gate(readModel({ migrationId: " " }), "");
  const mismatched = await gate(readModel({ migrationId: MIGRATION_ID }), "different-migration");
  assert.equal(missingInput.reason, "unsafe_missing_identity");
  assert.deepEqual(missingInput.missingRequirements, ["migration_id"]);
  assert.equal(blankReadModelId.reason, "unsafe_missing_identity");
  assert.deepEqual(blankReadModelId.missingRequirements, ["migration_id"]);
  assert.equal(mismatched.reason, "unsafe_missing_identity");
  assert.deepEqual(mismatched.missingRequirements, ["matching_migration_id"]);
});

test("read model unavailable blocks", async () => {
  const result = await evaluateCloneGenerationGate({
    migrationId: MIGRATION_ID,
    repository: {
      async readByMigrationId() {
        throw new Error("read store unavailable");
      },
    },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "read_model_unavailable");
  assert.equal(result.currentState, "unavailable");
  assert.equal(result.sourceEvidenceReviewStatus, "unavailable");
  assert.deepEqual(result.missingRequirements, ["read_model"]);
});

test("migration not found blocks", async () => {
  const result = await gate(null);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "migration_not_found");
  assert.equal(result.currentState, "missing");
  assert.deepEqual(result.missingRequirements, ["single_site_migration"]);
});

test("accepted status without cloneGenerationAllowed blocks as not ready", async () => {
  const result = await gate(readModel({ reviewStatus: "accepted", cloneGenerationAllowed: false }));
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "source_evidence_not_ready");
  assert.deepEqual(result.missingRequirements, ["clone_generation_allowed_source_evidence_review"]);
});

test("deterministic result stability", async () => {
  const model = readModel({ reviewStatus: "accepted_with_limitations", limitations: [{ reason: "accepted limitation" }] });
  const first = await gate(model);
  const second = await gate(model);
  assert.deepEqual(second, first);
  assert.deepEqual(Object.keys(first), [
    "allowed",
    "mode",
    "reason",
    "migrationId",
    "siteId",
    "currentState",
    "sourceEvidenceReviewStatus",
    "sourceEvidenceReviewId",
    "acceptedWithLimitations",
    "limitations",
    "missingRequirements",
    "recommendedNextAction",
    "derivedOnly",
    "mutatesSourceTruth",
  ]);
});

test("no mutation behavior for supplied read model", async () => {
  const model = readModel({ reviewStatus: "accepted_with_limitations", limitations: [{ reason: "bounded" }] });
  const before = JSON.stringify(model);
  await gate(model);
  assert.equal(JSON.stringify(model), before);
});
