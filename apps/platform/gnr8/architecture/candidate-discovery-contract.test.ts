import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyCandidateDiscoveryResult,
  validateCandidateDiscoveryResult,
  type CandidateDiscoveryResult,
} from "./candidate-discovery-contract";

function validResult(): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:dry-run-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    createdAt: "2026-06-18T10:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: ["route"],
    candidates: [{
      candidateId: "candidate:route:%2F",
      candidateType: "route",
      candidateStatus: "discovered",
      confidence: { level: "HIGH", reasons: ["source-model-confidence"] },
      sourceEvidenceRefs: [
        { refId: "evidence-capture-baseline-1", sourceKind: "evidence_capture_baseline" },
      ],
      sourceDryRunRefs: [
        { refId: "limited-dry-run-route:%2F", sourceKind: "limited_dry_run_route_model" },
      ],
      limitations: [],
      diagnostics: ["CANDIDATE_CONTRACT_FIXTURE"],
      routePath: "/",
    }],
    limitations: [],
    diagnostics: ["Contract fixture only; no discovery executed."],
  };
}

test("valid Candidate Discovery result passes", () => {
  assert.deepEqual(validateCandidateDiscoveryResult(validResult()), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("invalid candidate type is rejected", () => {
  const result = validResult() as unknown as Record<string, unknown>;
  (result.candidates as Array<Record<string, unknown>>)[0].candidateType = "hero";
  const validation = validateCandidateDiscoveryResult(result);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /candidateType/);
});

test("invalid candidate status is rejected", () => {
  const result = validResult() as unknown as Record<string, unknown>;
  (result.candidates as Array<Record<string, unknown>>)[0].candidateStatus = "approved";
  const validation = validateCandidateDiscoveryResult(result);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /candidateStatus/);
});

test("missing evidence and Dry Run refs are rejected", () => {
  const result = validResult();
  result.candidates[0].sourceEvidenceRefs = [];
  result.candidates[0].sourceDryRunRefs = [];
  const validation = validateCandidateDiscoveryResult(result);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /sourceEvidenceRefs must contain at least one ref/);
  assert.match(validation.errors.join("\n"), /sourceDryRunRefs must contain at least one ref/);
});

test("forbidden generated fields are rejected recursively", () => {
  for (const field of [
    "reactOutput",
    "generatedOutputs",
    "generatedBlocks",
    "generatedContent",
    "designTokens",
    "publishingArtifacts",
    "reconstructionArtifacts",
  ]) {
    const result = validResult() as unknown as Record<string, unknown>;
    (result.candidates as Array<Record<string, unknown>>)[0].diagnostics = [{ [field]: {} }];
    const validation = validateCandidateDiscoveryResult(result);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});

test("empty result builder copies IDs and remains non-executable", () => {
  const result = createEmptyCandidateDiscoveryResult({
    discoveryId: "candidate-discovery:dry-run-empty",
    siteVersionId: "site-version-empty",
    dryRunId: "dry-run-empty",
    createdAt: "2026-06-18T11:00:00.000Z",
    diagnostics: ["No discovery has run."],
  });
  assert.equal(result.discoveryId, "candidate-discovery:dry-run-empty");
  assert.equal(result.siteVersionId, "site-version-empty");
  assert.equal(result.dryRunId, "dry-run-empty");
  assert.equal(result.candidateCount, 0);
  assert.deepEqual(result.candidateTypesPresent, []);
  assert.deepEqual(result.candidates, []);
  assert.equal("status" in result, false);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
});
