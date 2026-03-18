import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { stableStringify } from "../../gnr8/migration/runtime/diagnostics";
import type { JsonValue } from "../../gnr8/import/import-contract";

import {
  BETA_EXPORT_OPERATOR_FIXTURE_ORDER,
  BETA_EXPORT_OPERATOR_EXECUTION_MODES,
  runBetaExportOperatorFlow,
} from "./beta-export-operator";

test("beta export operator supports explicit fixture and mode sets", () => {
  assert.deepEqual(BETA_EXPORT_OPERATOR_FIXTURE_ORDER, ["real-site-01", "real-site-02", "real-site-03", "friend-site-01"]);
  assert.deepEqual(BETA_EXPORT_OPERATOR_EXECUTION_MODES, ["simulation", "materialize"]);
});

test("beta export operator simulation run returns deterministic structured success output", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "simulation",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.executionMode, "simulation");
  assert.equal(response.result.executionResult.executionMode, "simulation");
  assert.equal(response.result.executionResult.previewHosting.available, false);
  assert.equal(response.result.executionResult.previewHosting.status, "not_available_simulation_mode");
  assert.equal(response.fixtureId, "real-site-01");
  assert.equal(response.result.fixtureId, "real-site-01");
  assert.equal(typeof response.summary.warningCodes.length, "number");
  assert.equal(typeof response.summary.blockingReasonCodes.length, "number");
});

test("beta export operator materialize run surfaces output root path", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-beta-export-operator-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runBetaExportOperatorFlow(
    {
      fixtureId: "real-site-03",
      executionMode: "materialize",
    },
    {
      outputRootDir,
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.result.executionResult.executionMode, "materialize");
  assert.equal(response.result.executionResult.materialization.outputRootPath, outputRootDir);
  assert.ok(response.result.executionResult.materialization.status.startsWith("materialized"));
  assert.ok(response.result.executionResult.materialization.summary.pageFileCount >= 1);
  assert.equal(response.result.executionResult.previewHosting.available, false);
  assert.equal(response.result.executionResult.previewHosting.status, "not_available_unsupported_output_root");
});

test("beta export operator simulation output remains deterministic for identical input", async () => {
  const a = await runBetaExportOperatorFlow({
    fixtureId: "real-site-02",
    executionMode: "simulation",
  });
  const b = await runBetaExportOperatorFlow({
    fixtureId: "real-site-02",
    executionMode: "simulation",
  });

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;

  assert.equal(stableStringify(a.result as unknown as JsonValue), stableStringify(b.result as unknown as JsonValue));
  assert.equal(stableStringify(a.summary as unknown as JsonValue), stableStringify(b.summary as unknown as JsonValue));
});
