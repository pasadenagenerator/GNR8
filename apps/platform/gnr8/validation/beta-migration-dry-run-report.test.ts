import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { stableStringify } from "../migration/runtime/diagnostics";
import {
  createBetaMigrationDryRunReport,
  isBetaMigrationDryRunReport,
} from "./beta-migration-dry-run-report";
import {
  classifyDegradationIssue,
  decideOperatorAction,
  scoreExportQuality,
} from "./beta-migration-scoring";

function fixturePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "./fixtures/dry-run-example-01.json");
}

test("deterministic report creation produces byte-stable output for equivalent input", () => {
  const input = {
    sourceUrl: "https://beta-client.example/landing",
    snapshotId: "imported-url-site-abc123",
    validationSummary: {
      overallStatus: "passed_with_warnings" as const,
      keyDiagnosticCodes: ["unsupported_remote_asset", "missing_local_asset", "missing_local_asset"],
      blockedReasonCodes: [],
    },
    exportScoreAxes: {
      structuralFidelity: 4,
      visualCoherence: 4,
      assetIntegrity: 3,
      contentCompleteness: 4,
      layoutSemanticCorrectness: 4,
    },
    parityFindings: [
      { check: "typography_parity" as const, status: "minor_diff" as const, detail: "Fallback font used." },
      { check: "layout_structure_parity" as const, status: "pass" as const, detail: "Section order preserved." },
    ],
    degradationFindings: [{ issueCode: "FONT_MISMATCH" as const, detail: "Brand font missing." }],
    notes: ["reviewed", "reviewed", "phase1"],
  };

  const report1 = createBetaMigrationDryRunReport(input);
  const report2 = createBetaMigrationDryRunReport(input);

  assert.equal(stableStringify(report1 as unknown as JsonValue), stableStringify(report2 as unknown as JsonValue));
  assert.deepEqual(report1.validationSummary.keyDiagnosticCodes, ["missing_local_asset", "unsupported_remote_asset"]);
  assert.equal(report1.classification, "DEGRADED_ACCEPTABLE");
  assert.equal(report1.operatorDecision, "proceed_with_manual_polish");
});

test("scoring is deterministic and reproducible", () => {
  const scoreA = scoreExportQuality({
    axes: {
      structuralFidelity: 5,
      visualCoherence: 4,
      assetIntegrity: 3,
      contentCompleteness: 4,
      layoutSemanticCorrectness: 5,
    },
  });
  const scoreB = scoreExportQuality({
    axes: {
      structuralFidelity: 5,
      visualCoherence: 4,
      assetIntegrity: 3,
      contentCompleteness: 4,
      layoutSemanticCorrectness: 5,
    },
  });

  assert.deepEqual(scoreA, scoreB);
  assert.equal(scoreA.weightedOverall, 4.2);
  assert.equal(scoreA.normalizedPercent, 84);
});

test("classification mapping matches protocol examples", () => {
  assert.equal(classifyDegradationIssue("MISSING_HERO_IMAGE"), "DEGRADED_UNACCEPTABLE");
  assert.equal(classifyDegradationIssue("MISSING_FAVICON"), "COSMETIC_ONLY");
  assert.equal(classifyDegradationIssue("FONT_MISMATCH"), "DEGRADED_ACCEPTABLE");
  assert.equal(classifyDegradationIssue("BROKEN_LAYOUT_GRID"), "HARD_BLOCKER");
});

test("decision matrix is deterministic for blockers, unacceptable degradation, and score threshold", () => {
  assert.equal(
    decideOperatorAction({ classification: "HARD_BLOCKER", weightedOverallScore: 5 }),
    "stop_beta_migration",
  );
  assert.equal(
    decideOperatorAction({ classification: "DEGRADED_UNACCEPTABLE", weightedOverallScore: 4.5 }),
    "engine_improvement_required",
  );
  assert.equal(
    decideOperatorAction({ classification: "DEGRADED_ACCEPTABLE", weightedOverallScore: 3.5 }),
    "proceed_with_manual_polish",
  );
  assert.equal(
    decideOperatorAction({ classification: "DEGRADED_ACCEPTABLE", weightedOverallScore: 3.49 }),
    "engine_improvement_required",
  );
});

test("example dry-run fixture is valid and internally consistent", () => {
  const raw = fs.readFileSync(fixturePath(), "utf8");
  const parsed = JSON.parse(raw) as unknown;

  assert.equal(isBetaMigrationDryRunReport(parsed), true);
  if (!isBetaMigrationDryRunReport(parsed)) return;

  assert.equal(parsed.classification, "DEGRADED_ACCEPTABLE");
  assert.equal(parsed.operatorDecision, "proceed_with_manual_polish");
  assert.equal(parsed.exportScore.weightedOverall >= 3.5, true);
});
