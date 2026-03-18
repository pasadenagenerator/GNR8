import assert from "node:assert/strict";
import test from "node:test";

import { runValidationControlTower, PHASE1_VALIDATION_FIXTURE_ORDER } from "./control-tower";
import { runValidationShellForFixture } from "./real-site-01";

test("control tower returns deterministic fixture order with no failed rows for real phase-1 fixtures", async () => {
  const rows = await runValidationControlTower({ requestIdPrefix: "control-tower-audit-order" });

  assert.deepEqual(
    rows.map((row) => row.fixtureId),
    [...PHASE1_VALIDATION_FIXTURE_ORDER],
  );
  assert.equal(rows.every((row) => row.kind === "success"), true);
});

test("control tower summary fields exactly mirror per-fixture shell runtime artifacts", async () => {
  const rows = await runValidationControlTower({ requestIdPrefix: "control-tower-audit-parity" });

  for (const row of rows) {
    assert.equal(row.kind, "success");
    const shell = await runValidationShellForFixture(row.fixtureId, {
      requestId: `control-tower-audit-shell-${row.fixtureId}`,
    });
    assert.equal(shell.ok, true);
    const result = shell.result;

    assert.equal(row.overallValidationStatus, result.validationSummary.overallStatus);
    assert.equal(row.importManifestStatus, result.importManifest.status);
    assert.equal(row.pipelineStatus, result.pipelineResult.status);
    assert.equal(row.previewStatus, result.previewDocument.status);
    assert.equal(row.approvalStatus, result.approvalPackage.eligibility.status);
    assert.equal(row.executionStatus, result.executionResult.status);
    assert.equal(row.runReportOverallStatus, result.migrationRunReport.overallStatus);
    assert.equal(row.previewPageCount, result.validationSummary.counts.previewPageCount);
    assert.equal(row.renderedPageCount, result.validationSummary.counts.renderedPageCount);
    assert.deepEqual(row.keyDiagnosticCodes, result.validationSummary.diagnostics.keyCodes);
  }
});
