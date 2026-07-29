import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  deriveSingleSiteCloneStartChildIdempotencyKeys,
  startSingleSiteCloneGeneration,
  type SingleSiteCloneExecutor,
  type SingleSiteCloneStartTransitionService,
  type StartSingleSiteCloneGenerationInput,
} from "./single-site-clone-start-orchestrator";
import type { SingleSiteCloneGenerationGateResult } from "./single-site-clone-generation-gate";
import type { SingleSiteMigrationState, SingleSiteSourceEvidenceReviewStatus, SingleSiteTransitionResult } from "./single-site-state-contracts";
import type { TransitionSingleSiteMigrationInput } from "./single-site-state-transition-service";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-clone-start-orchestrator.ts");
const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "client-orchestrator-test";

function readModel(input: {
  state?: SingleSiteMigrationState;
  reviewStatus?: SingleSiteSourceEvidenceReviewStatus | "missing";
  limitations?: unknown[];
  clientId?: string;
  siteId?: string | null;
  refs?: SingleSiteMigrationReadModel["refs"]["items"];
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
      migrationId: MIGRATION_ID,
      tenantId: "tenant-test",
      clientId: input.clientId ?? CLIENT_ID,
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
      stage: state === "source_evidence_review_required" ? "source_evidence_review" : state.startsWith("clone_") ? "clone" : "terminal",
      stateVersion: 1,
      lifecycle: state === "migration_failed" ? "failed" : "active",
      active: state !== "migration_failed",
      terminal: state === "migration_failed",
      failed: state === "migration_failed",
      cancelled: false,
      closedOut: false,
      terminalAt: state === "migration_failed" ? "2026-07-29T12:00:00.000Z" : null,
    },
    sourceEvidenceReview: {
      reviewId: reviewStatus === "missing" ? null : REVIEW_ID,
      reviewCount: reviewStatus === "missing" ? 0 : 1,
      reviewStatus,
      reviewDecision: reviewStatus === "accepted" ? "accept" : reviewStatus === "accepted_with_limitations" ? "accept_with_limitations" : null,
      completenessStatus: reviewStatus === "missing" ? "missing" : "complete",
      readyForReview: false,
      accepted,
      acceptedWithLimitations: reviewStatus === "accepted_with_limitations",
      acceptedDegradedCapture: reviewStatus === "accepted_with_limitations",
      retryRequired: false,
      rejected: false,
      cloneGenerationAllowed: accepted,
      cloneBlockedByMissingAcceptance: !accepted,
      limitations: input.limitations ?? [],
      missingEvidence: [],
      warnings: [],
      blockers: [],
      diagnostics: {},
      capturedAt: "2026-07-29T12:00:00.000Z",
      freshUntil: null,
      reviewedAt: accepted ? "2026-07-29T12:00:00.000Z" : null,
      reviewerActorId: accepted ? "reviewer-test" : null,
      aafApprovalDecisionId: reviewStatus === "accepted_with_limitations" ? "44444444-4444-4444-8444-444444444444" : null,
      itemCount: accepted ? 10 : 0,
      requiredItemCount: 10,
      requiredMissingCategories: [],
      cloneBlockingItemCount: 0,
      refs: [],
      events: [],
    },
    refs: {
      totalCount: input.refs?.length ?? 0,
      activeCount: input.refs?.filter((ref) => !ref.superseded).length ?? 0,
      staleCount: 0,
      missingRequiredRolesForNextAction: [],
      byRole: {},
      items: input.refs ?? [],
    },
  } as unknown as SingleSiteMigrationReadModel;
}

function baseInput(overrides: Partial<StartSingleSiteCloneGenerationInput> = {}): StartSingleSiteCloneGenerationInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    mode: "execute",
    actor: { actorType: "system", actorId: "clone-orchestrator-test", actorRole: "migration_operator" },
    correlationId: "corr-clone-orchestrator-test",
    idempotencyKey: "idem-clone-orchestrator-test",
    ...overrides,
  };
}

function fakeDependencies(options: {
  model?: SingleSiteMigrationReadModel | (() => SingleSiteMigrationReadModel);
  executorThrows?: boolean;
  executorStatus?: "completed" | "completed_with_warnings" | "failed";
} = {}) {
  const order: string[] = [];
  const transitions: TransitionSingleSiteMigrationInput[] = [];
  const seenTransitionKeys = new Map<string, SingleSiteTransitionResult>();
  let transitionState = options.model && typeof options.model !== "function" ? options.model.currentState.state : "source_evidence_review_required";
  const model = () => {
    if (typeof options.model === "function") return options.model();
    const base = options.model ?? readModel({ state: transitionState });
    return readModel({
      state: transitionState,
      reviewStatus: base.sourceEvidenceReview.reviewStatus,
      limitations: base.sourceEvidenceReview.limitations,
      clientId: base.migration.clientId,
      siteId: base.migration.siteId,
    });
  };
  const readRepository = {
    async readByMigrationId() {
      order.push("read");
      return model();
    },
  };
  const evaluateGate = async (input: { readModel?: SingleSiteMigrationReadModel | null }): Promise<SingleSiteCloneGenerationGateResult> => {
    order.push("gate");
    const m = input.readModel;
    if (!m) {
      return {
        allowed: false,
        mode: "blocked",
        reason: "migration_not_found",
        migrationId: MIGRATION_ID,
        siteId: null,
        currentState: "missing",
        sourceEvidenceReviewStatus: "missing",
        sourceEvidenceReviewId: null,
        acceptedWithLimitations: false,
        limitations: [],
        missingRequirements: ["single_site_migration"],
        recommendedNextAction: "capture_source_evidence",
        derivedOnly: true,
        mutatesSourceTruth: false,
      };
    }
    const accepted = m.sourceEvidenceReview.reviewStatus === "accepted" || m.sourceEvidenceReview.reviewStatus === "accepted_with_limitations";
    return {
      allowed: accepted && !m.currentState.failed,
      mode: m.sourceEvidenceReview.reviewStatus === "accepted_with_limitations" ? "warning" : accepted ? "allowed" : "blocked",
      reason: m.currentState.failed
        ? "migration_failed"
        : m.sourceEvidenceReview.reviewStatus === "missing"
          ? "source_evidence_missing"
          : m.sourceEvidenceReview.reviewStatus === "accepted_with_limitations"
            ? "source_evidence_accepted_with_limitations"
            : m.sourceEvidenceReview.reviewStatus === "accepted"
              ? "source_evidence_accepted"
              : "source_evidence_not_ready",
      migrationId: MIGRATION_ID,
      siteId: m.migration.siteId,
      currentState: m.currentState.state,
      sourceEvidenceReviewStatus: m.sourceEvidenceReview.reviewStatus,
      sourceEvidenceReviewId: m.sourceEvidenceReview.reviewId,
      acceptedWithLimitations: m.sourceEvidenceReview.acceptedWithLimitations,
      limitations: m.sourceEvidenceReview.limitations,
      missingRequirements: accepted ? [] : ["latest_source_evidence_review"],
      recommendedNextAction: accepted ? "start_clone_generation" : "capture_source_evidence",
      derivedOnly: true,
      mutatesSourceTruth: false,
    };
  };
  const transitionService: SingleSiteCloneStartTransitionService = {
    async transition(input) {
      order.push(`transition:${input.toState}`);
      const existing = seenTransitionKeys.get(input.idempotencyKey);
      if (existing) return { ...existing, reusedExisting: true };
      const result: SingleSiteTransitionResult = {
        migrationId: input.migrationId,
        stateEventId: `event-${seenTransitionKeys.size + 1}`,
        fromState: transitionState,
        toState: input.toState,
        fromStage: "clone",
        toStage: input.toState === "migration_failed" ? "terminal" : "clone",
        stateVersion: seenTransitionKeys.size + 2,
        reusedExisting: false,
      };
      transitions.push(input);
      seenTransitionKeys.set(input.idempotencyKey, result);
      transitionState = input.toState;
      return result;
    },
  };
  let executorCalls = 0;
  const executor: SingleSiteCloneExecutor = {
    async execute(input) {
      order.push("executor");
      executorCalls += 1;
      assert.equal(input.migrationId, MIGRATION_ID);
      assert.equal(input.clientId, CLIENT_ID);
      assert.equal(input.siteId, SITE_ID);
      assert.equal(input.sourceEvidenceReviewId, REVIEW_ID);
      assert.equal(input.idempotencyKey, deriveSingleSiteCloneStartChildIdempotencyKeys(baseInput().idempotencyKey ?? "").executor);
      if (options.executorThrows) throw Object.assign(new Error("renderer failed"), { code: "renderer_failed" });
      return {
        status: options.executorStatus ?? "completed",
        siteVersionRef: { sourceRecordId: "version-1", refType: "runtime_site_version_clone" },
        runtimeArtifactRef: { sourceRecordId: "artifact-1", refType: "runtime_artifact_clone" },
        previewRef: { sourceRecordId: "preview-1", refType: "preview" },
        warnings: options.executorStatus === "completed_with_warnings" ? ["executor warning"] : [],
      };
    },
  };
  return {
    order,
    transitions,
    get executorCalls() {
      return executorCalls;
    },
    readRepository,
    evaluateGate,
    transitionService,
    executor,
  };
}

test("missing migration id fails closed", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput({ migrationId: " " }), deps);
  assert.equal(result.status, "failed_closed");
  assert.equal(result.allowed, false);
  assert.equal(result.executorCalled, false);
  assert.equal(deps.transitions.length, 0);
});

test("missing idempotency key fails closed", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput({ idempotencyKey: " " }), deps);
  assert.equal(result.status, "failed_closed");
  assert.equal(result.allowed, false);
  assert.equal(result.executorCalled, false);
  assert.equal(deps.transitions.length, 0);
});

test("dry-run allowed performs no writes and does not call executor", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput({ mode: "dry_run" }), deps);
  assert.equal(result.status, "dry_run_allowed");
  assert.equal(result.allowed, true);
  assert.equal(result.mutatesSourceTruth, false);
  assert.equal(result.executorCalled, false);
  assert.equal(deps.executorCalls, 0);
  assert.deepEqual(deps.transitions, []);
});

test("dry-run blocked performs no writes and does not call executor", async () => {
  const deps = fakeDependencies({ model: readModel({ reviewStatus: "missing" }) });
  const result = await startSingleSiteCloneGeneration(baseInput({ mode: "dry_run" }), deps);
  assert.equal(result.status, "dry_run_blocked");
  assert.equal(result.allowed, false);
  assert.equal(result.executorCalled, false);
  assert.equal(deps.executorCalls, 0);
  assert.deepEqual(deps.transitions, []);
});

test("execute blocked by missing evidence does not call executor", async () => {
  const deps = fakeDependencies({ model: readModel({ reviewStatus: "missing" }) });
  const result = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(result.status, "blocked");
  assert.equal(result.executorCalled, false);
  assert.equal(deps.executorCalls, 0);
  assert.deepEqual(deps.transitions, []);
});

test("execute allowed calls gate before transition and executor", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(result.status, "completed");
  assert.deepEqual(deps.order.slice(0, 4), ["read", "gate", "transition:clone_generation_started", "executor"]);
  assert.equal(deps.order.indexOf("gate") < deps.order.indexOf("executor"), true);
});

test("execute accepted_with_limitations includes warning and limitations", async () => {
  const limitations = [{ category: "font", reason: "fallback accepted" }];
  const deps = fakeDependencies({ model: readModel({ reviewStatus: "accepted_with_limitations", limitations }) });
  const result = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(result.status, "completed");
  assert.equal(result.acceptedWithLimitations, true);
  assert.deepEqual(result.limitations, limitations);
  assert.match(result.warnings.join("\n"), /accepted with limitations/);
  assert.equal(deps.transitions[0]?.aafApprovalDecisionId, "44444444-4444-4444-8444-444444444444");
});

test("execute success records started, completed, and review-required states", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(result.startedStateRecorded, true);
  assert.equal(result.completedStateRecorded, true);
  assert.equal(result.reviewRequiredStateRecorded, true);
  assert.equal(result.failureRecorded, false);
  assert.deepEqual(deps.transitions.map((transition) => transition.toState), [
    "clone_generation_started",
    "clone_generation_completed",
    "clone_review_required",
  ]);
});

test("executor failure records migration_failed and no completed state", async () => {
  const deps = fakeDependencies({ executorThrows: true });
  const result = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(result.status, "failed");
  assert.equal(result.executorCalled, true);
  assert.equal(result.completedStateRecorded, false);
  assert.equal(result.reviewRequiredStateRecorded, false);
  assert.equal(result.failureRecorded, true);
  assert.deepEqual(deps.transitions.map((transition) => transition.toState), ["clone_generation_started", "migration_failed"]);
});

test("idempotent retry does not duplicate transitions when current state already requires review", async () => {
  let currentState: SingleSiteMigrationState = "source_evidence_review_required";
  const completedRefs: SingleSiteMigrationReadModel["refs"]["items"] = [
    {
      id: "ref-version",
      role: "runtime_site_version_clone",
      refType: "runtime_site_version_clone",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_site_versions",
      sourceRecordId: "version-1",
      sourceWatermark: "watermark-1",
      capturedAt: null,
      freshUntil: null,
      stale: false,
      superseded: false,
    },
    {
      id: "ref-artifact",
      role: "runtime_artifact_clone",
      refType: "runtime_artifact_clone",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_artifacts",
      sourceRecordId: "artifact-1",
      sourceWatermark: "watermark-1",
      capturedAt: null,
      freshUntil: null,
      stale: false,
      superseded: false,
    },
  ];
  const deps = fakeDependencies({ model: () => readModel({ state: currentState, refs: currentState === "clone_review_required" ? completedRefs : [] }) });
  const first = await startSingleSiteCloneGeneration(baseInput(), deps);
  currentState = "clone_review_required";
  const second = await startSingleSiteCloneGeneration(baseInput(), deps);
  assert.equal(first.status, "completed");
  assert.equal(second.status, "idempotent_replay");
  assert.equal(second.siteVersionRef?.sourceRecordId, "version-1");
  assert.equal(second.runtimeArtifactRef?.sourceRecordId, "artifact-1");
  assert.equal(deps.executorCalls, 1);
  assert.deepEqual(deps.transitions.map((transition) => transition.toState), [
    "clone_generation_started",
    "clone_generation_completed",
    "clone_review_required",
  ]);
});

test("executor is dependency-injected and required for execute mode", async () => {
  const deps = fakeDependencies();
  const result = await startSingleSiteCloneGeneration(baseInput(), {
    readRepository: deps.readRepository,
    evaluateGate: deps.evaluateGate,
    transitionService: deps.transitionService,
  });
  assert.equal(result.status, "failed_closed");
  assert.equal(result.executorCalled, false);
  assert.equal(deps.transitions.length, 0);
});

test("no publish, domain, billing, proposal, provider, or generic runtime calls occur in source", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(runtime-store|site-actions|generated-website-proposal|billing|stripe|vercel|openprovider|dns|provider|command-center|ops-inbox|publish|rollback|proposal)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(insert\s+into|update\s+public|delete\s+from)\b/i);
});
