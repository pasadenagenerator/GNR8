import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
  CandidateDiscoveryPersistenceValidationError,
  loadCandidateDiscoveryResultById,
  loadLatestCandidateDiscoveryResult,
  persistCandidateDiscoveryResult,
  type CandidateDiscoveryResultProvenanceSummary,
} from "./candidate-discovery-persistence";

const SITE_VERSION_ID = "site-version-candidate-discovery";
const DRY_RUN_ID = "dry-run-candidate-discovery";
const BUILDER_VERSION = "8C-3";
const CONTRACT_VERSION = "8C-1";

function validResult(input: { createdAt?: string; diagnostic?: string } = {}): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:output-1",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: input.createdAt ?? "2026-06-18T08:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: ["route"],
    candidates: [{
      candidateId: "candidate:route:/",
      candidateType: "route",
      candidateStatus: "discovered",
      confidence: { level: "HIGH", reasons: ["SOURCE_CONFIDENCE:HIGH"] },
      sourceEvidenceRefs: [{ refId: "evidence:route:/", sourceKind: "evidence_capture_baseline", routePath: "/" }],
      sourceDryRunRefs: [{ refId: "dry-run:route:/", sourceKind: "limited_dry_run_route_model", routePath: "/" }],
      limitations: [],
      diagnostics: ["ROUTE_CANDIDATE_MAPPED"],
      routePath: "/",
    }],
    limitations: [{
      limitationId: "limitation:source-warning",
      severity: "warning",
      code: "SOURCE_WARNING",
      message: "Source warning retained.",
    }],
    diagnostics: [input.diagnostic ?? "CANDIDATE_DISCOVERY_RESULT_VALID"],
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as CandidateDiscoveryResultProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-06-18T09:00:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(store: ReturnType<typeof memoryStore>, result = validResult(), persistedAt?: string) {
  return persistCandidateDiscoveryResult({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    result,
    builderVersion: BUILDER_VERSION,
    contractVersion: CONTRACT_VERSION,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Candidate Discovery result persists with complete metadata", async () => {
  const store = memoryStore();
  const result = validResult();
  const ref = await persist(store, result);

  assert.equal(ref.kind, CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.discoveryId, result.discoveryId);
  assert.equal(ref.candidateCount, 1);
  assert.deepEqual(ref.candidateTypesPresent, ["route"]);
  assert.equal(ref.validationStatus, "valid");
  assert.equal(ref.limitationCount, 1);
  assert.equal(ref.blockerCount, 0);
  assert.equal(ref.contractVersion, CONTRACT_VERSION);
  assert.equal(ref.builderVersion, BUILDER_VERSION);
  assert.equal(ref.createdAt, result.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["CANDIDATE_DISCOVERY_RESULT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.candidateDiscoveryResultArtifacts?.[0]?.result, result);
});

test("latest and by-id loads return cloned full artifact records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestCandidateDiscoveryResult({ siteVersionId: SITE_VERSION_ID, options: store.options });
  const byId = await loadCandidateDiscoveryResultById({ siteVersionId: SITE_VERSION_ID, artifactId: ref.artifactId, options: store.options });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.result.diagnostics[0] = "MUTATED";
  assert.equal((await loadLatestCandidateDiscoveryResult({ siteVersionId: SITE_VERSION_ID, options: store.options }))?.result.diagnostics[0], "CANDIDATE_DISCOVERY_RESULT_VALID");
  assert.equal(await loadCandidateDiscoveryResultById({ siteVersionId: SITE_VERSION_ID, artifactId: "missing", options: store.options }), null);
});

test("invalid result and invalid lineage are rejected before write", async () => {
  const store = memoryStore();
  const invalid = { ...validResult(), candidateCount: 2 };
  await assert.rejects(() => persist(store, invalid), (error: unknown) => {
    assert.ok(error instanceof CandidateDiscoveryPersistenceValidationError);
    assert.ok(error.validation.errors.includes("candidateCount must equal candidates.length"));
    return true;
  });
  const wrongLineage = { ...validResult(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof CandidateDiscoveryPersistenceValidationError);
    assert.ok(error.validation.errors.includes("result.dryRunId must match persisted dryRunId"));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("forbidden generated fields are rejected recursively and never accepted", async () => {
  const store = memoryStore();
  const topLevel = { ...validResult(), reactOutput: { component: "Forbidden" } } as CandidateDiscoveryResult;
  const nested = {
    ...validResult(),
    candidates: [{ ...validResult().candidates[0], generatedBlocks: [{ kind: "forbidden" }] }],
  } as CandidateDiscoveryResult;

  for (const [result, path] of [[topLevel, "reactOutput"], [nested, "candidates.0.generatedBlocks"]] as const) {
    await assert.rejects(() => persist(store, result), (error: unknown) => {
      assert.ok(error instanceof CandidateDiscoveryPersistenceValidationError);
      assert.ok(error.validation.errors.some((message) => message.includes(`${path} is forbidden`)));
      return true;
    });
  }
  assert.equal(store.writes, 0);
  assert.equal(store.summary.candidateDiscoveryResultArtifacts, undefined);
});

test("equivalent result reuses latest artifact without writing", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = validResult({ createdAt: "2026-06-18T10:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-06-18T11:00:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.candidateDiscoveryResultArtifacts?.length, 1);
  assert.equal(store.summary.latestCandidateDiscoveryResultArtifact?.artifactId, first.artifactId);
});

test("changed result appends history and advances latest pointer", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = validResult({ diagnostic: "CANDIDATE_DISCOVERY_RESULT_VALID_CHANGED" });
  const second = await persist(store, changed, "2026-06-18T09:05:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.candidateDiscoveryResultArtifacts?.length, 2);
  assert.equal(store.summary.latestCandidateDiscoveryResultArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestCandidateDiscoveryResult({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID, options: store.options }))?.artifactId, second.artifactId);
  assert.equal((await loadCandidateDiscoveryResultById({ siteVersionId: SITE_VERSION_ID, artifactId: first.artifactId, options: store.options }))?.artifactId, first.artifactId);
});
