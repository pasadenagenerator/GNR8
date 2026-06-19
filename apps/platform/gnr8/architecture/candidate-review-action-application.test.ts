import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  applyCandidateReviewAction,
  type CandidateReviewActionApplicationInput,
} from "./candidate-review-action-application";
import type { CandidateReviewActionRequest } from "./candidate-review-action-contract";
import type { CandidateReviewPackage } from "./candidate-review-contract";
import {
  CandidateReviewPersistenceConflictError,
  type CandidateReviewPackageArtifactRecord,
  type CandidateReviewPackageProvenanceSummary,
} from "./candidate-review-persistence";

const SITE_VERSION_ID = "site-version-review-action";
const DRY_RUN_ID = "dry-run-review-action";
const DISCOVERY_ARTIFACT_ID = "candidate-discovery-artifact-review-action";
const CANDIDATE_ID = "candidate:route:%2F";
const BASE_ARTIFACT_ID = "candidate-review-package-base";

function discoveryResult(): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:review-action",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-19T07:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: ["route"],
    candidates: [{
      candidateId: CANDIDATE_ID,
      candidateType: "route",
      candidateStatus: "valid",
      confidence: { level: "HIGH", reasons: ["Fixture evidence"] },
      sourceEvidenceRefs: [{ refId: "evidence-1", sourceKind: "evidence_capture_baseline" }],
      sourceDryRunRefs: [{ refId: "dry-run-output-1", sourceKind: "limited_dry_run_output" }],
      limitations: [],
      diagnostics: [],
      routePath: "/",
    }],
    limitations: [],
    diagnostics: [],
  };
}

function emptyPackage(): CandidateReviewPackage {
  return {
    reviewPackageId: `candidate-review:${DISCOVERY_ARTIFACT_ID}`,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewEvents: [],
    latestDecisions: [],
    reviewedCandidateCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    deferredCount: 0,
    diagnostics: [],
    createdAt: "2026-06-19T08:00:00.000Z",
  };
}

function artifact(
  packageValue: CandidateReviewPackage = emptyPackage(),
  artifactId = BASE_ARTIFACT_ID,
): CandidateReviewPackageArtifactRecord {
  return {
    kind: "candidate_review_package",
    artifactKind: "candidate_review_package",
    artifactVersion: 1,
    artifactId,
    reviewPackageId: packageValue.reviewPackageId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewedCandidateCount: packageValue.reviewedCandidateCount,
    approvedCount: packageValue.approvedCount,
    rejectedCount: packageValue.rejectedCount,
    deferredCount: packageValue.deferredCount,
    contractVersion: "8D-11",
    createdAt: packageValue.createdAt,
    persistedAt: "2026-06-19T08:01:00.000Z",
    validationStatus: "valid",
    package: structuredClone(packageValue),
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_PASSED"],
  };
}

function action(
  actionType: CandidateReviewActionRequest["actionType"] = "approve",
  overrides: Partial<CandidateReviewActionRequest> = {},
): CandidateReviewActionRequest {
  return {
    actionId: `action-${actionType}`,
    actionType,
    actor: { actorRef: "human:superadmin-1", actorRole: "superadmin" },
    target: {
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
      candidateId: CANDIDATE_ID,
      candidateReviewPackageArtifactId: BASE_ARTIFACT_ID,
    },
    rationale: `Human chose ${actionType}.`,
    requestedAt: "2026-06-19T09:00:00.000Z",
    ...overrides,
  };
}

function memoryStore() {
  const discovery = discoveryResult();
  const discoveryArtifact = {
    kind: "candidate_discovery_result",
    artifactKind: "candidate_discovery_result",
    artifactVersion: 1,
    artifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    validationStatus: "valid",
    result: discovery,
  };
  const base = artifact();
  let summary = {
    kind: "runtime_import_provenance_summary_v1",
    candidateDiscoveryResultArtifacts: [discoveryArtifact],
    latestCandidateDiscoveryResultArtifact: discoveryArtifact,
    candidateReviewPackageArtifacts: [base],
    latestCandidateReviewPackageArtifact: base,
  } as unknown as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    discovery,
    base,
    get summary() { return summary as CandidateReviewPackageProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-06-19T09:01:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      compareAndSetSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
        expectedImportProvenanceSummary: RuntimeImportProvenanceSummary | null;
        expectedLatestCandidateReviewPackageArtifactId: string | null;
      }) => {
        const current = (summary as CandidateReviewPackageProvenanceSummary)
          .latestCandidateReviewPackageArtifact?.artifactId ?? null;
        if (current !== input.expectedLatestCandidateReviewPackageArtifactId) return { affectedRows: 0 };
        assert.deepEqual(summary, input.expectedImportProvenanceSummary);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

function applicationInput(
  store: ReturnType<typeof memoryStore>,
  request: CandidateReviewActionRequest,
  latestCandidateReviewPackage: CandidateReviewPackageArtifactRecord = store.base,
): CandidateReviewActionApplicationInput {
  return {
    request,
    latestCandidateReviewPackage,
    candidateDiscoveryResult: store.discovery,
    contractVersion: "8D-11",
    createdAt: "2026-06-19T09:00:30.000Z",
    persistenceOptions: store.options,
  };
}

for (const [actionType, decision, countField] of [
  ["approve", "approved", "approvedCount"],
  ["reject", "rejected", "rejectedCount"],
  ["defer", "deferred", "deferredCount"],
] as const) {
  test(`${actionType} appends and persists one immutable ${decision} decision`, async () => {
    const store = memoryStore();
    const result = await applyCandidateReviewAction(applicationInput(store, action(actionType)));

    assert.equal(result.actionResult.accepted, true);
    assert.equal(result.actionResult.candidateReviewEvent?.decision, decision);
    assert.equal(result.candidateReviewPackage?.reviewEvents.length, 1);
    assert.equal(result.candidateReviewPackage?.latestDecisions[0]?.decision, decision);
    assert.equal(result.candidateReviewPackage?.reviewedCandidateCount, 1);
    assert.equal(result.candidateReviewPackage?.[countField], 1);
    assert.equal(Object.isFrozen(result.candidateReviewPackage), true);
    assert.equal(store.writes, 1);
    assert.equal(
      store.summary.latestCandidateReviewPackageArtifact?.artifactId,
      result.resultingCandidateReviewPackageArtifact?.artifactId,
    );
  });
}

test("a new decision supersedes the current head and recomputes counts", async () => {
  const store = memoryStore();
  const first = await applyCandidateReviewAction(applicationInput(store, action("defer")));
  const latest = store.summary.latestCandidateReviewPackageArtifact!;
  const secondRequest = action("approve", {
    actionId: "action-approve-after-defer",
    target: { ...action().target, candidateReviewPackageArtifactId: latest.artifactId },
    requestedAt: "2026-06-19T10:00:00.000Z",
  });
  const second = await applyCandidateReviewAction(applicationInput(store, secondRequest, latest));

  assert.equal(second.actionResult.candidateReviewEvent?.supersedesReviewEventId,
    first.actionResult.candidateReviewEvent?.reviewEventId);
  assert.equal(second.candidateReviewPackage?.reviewEvents.length, 2);
  assert.equal(second.candidateReviewPackage?.latestDecisions[0]?.decision, "approved");
  assert.equal(second.candidateReviewPackage?.reviewedCandidateCount, 1);
  assert.equal(second.candidateReviewPackage?.approvedCount, 1);
  assert.equal(second.candidateReviewPackage?.deferredCount, 0);
});

test("a stale package artifact is rejected without persistence or rebase", async () => {
  const store = memoryStore();
  const request = action("approve", {
    target: { ...action().target, candidateReviewPackageArtifactId: "stale-artifact" },
  });
  const result = await applyCandidateReviewAction(applicationInput(store, request));
  assert.equal(result.actionResult.accepted, false);
  assert.deepEqual(result.actionResult.diagnostics, ["CANDIDATE_REVIEW_PACKAGE_STALE"]);
  assert.equal(result.candidateReviewPackage, null);
  assert.equal(store.writes, 0);
});

test("an exact replay returns the original event, package, and persistence result", async () => {
  const store = memoryStore();
  const request = action("approve");
  const first = await applyCandidateReviewAction(applicationInput(store, request));
  const replay = await applyCandidateReviewAction(applicationInput(
    store,
    request,
    store.summary.latestCandidateReviewPackageArtifact!,
  ));

  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.actionResult, first.actionResult);
  assert.deepEqual(replay.candidateReviewPackage, first.candidateReviewPackage);
  assert.deepEqual(
    replay.resultingCandidateReviewPackageArtifact,
    first.resultingCandidateReviewPackageArtifact,
  );
  assert.equal(store.writes, 1);
});

test("conflicting reuse of an actionId fails closed", async () => {
  const store = memoryStore();
  const request = action("approve");
  await applyCandidateReviewAction(applicationInput(store, request));
  const conflict = await applyCandidateReviewAction(applicationInput(
    store,
    { ...request, rationale: "A different rationale." },
    store.summary.latestCandidateReviewPackageArtifact!,
  ));

  assert.equal(conflict.actionResult.accepted, false);
  assert.match(conflict.actionResult.diagnostics.join("\n"), /IDEMPOTENCY_CONFLICT/);
  assert.equal(store.writes, 1);
});

test("compare-and-set failure rejects a concurrent pointer change", async () => {
  const store = memoryStore();
  store.options.compareAndSetSiteVersionImportProvenanceSummary = async () => ({ affectedRows: 0 });
  await assert.rejects(
    () => applyCandidateReviewAction(applicationInput(store, action("approve"))),
    (error: unknown) => {
      assert.ok(error instanceof CandidateReviewPersistenceConflictError);
      assert.deepEqual(error.diagnostics, ["CANDIDATE_REVIEW_PACKAGE_STALE"]);
      return true;
    },
  );
  assert.equal(store.writes, 0);
});

test("invalid actors and invalid lineage create no event or package", async () => {
  const store = memoryStore();
  const invalidActor = action() as unknown as { actor: { actorRef: string; actorRole: string } };
  invalidActor.actor.actorRole = "admin";
  const actorResult = await applyCandidateReviewAction(applicationInput(
    store,
    invalidActor as unknown as CandidateReviewActionRequest,
  ));
  assert.equal(actorResult.actionResult.accepted, false);

  const lineageResult = await applyCandidateReviewAction(applicationInput(store, action("approve", {
    target: { ...action().target, dryRunId: "wrong-dry-run" },
  })));
  assert.equal(lineageResult.actionResult.accepted, false);
  assert.equal(store.writes, 0);
});
