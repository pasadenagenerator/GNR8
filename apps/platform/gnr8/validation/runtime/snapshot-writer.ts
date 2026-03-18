import fs from "node:fs";
import path from "node:path";

import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import type { ValidationRunResult } from "../validation-contract";

function writeJsonStable(absPath: string, value: JsonValue): void {
  fs.writeFileSync(absPath, `${stableStringify(value)}\n`, "utf8");
}

export function writeFirstRealSiteValidationSnapshots(input: {
  outDirAbs: string;
  result: ValidationRunResult;
}): { outDirAbs: string; writtenFiles: string[] } {
  const baseDir = path.resolve(input.outDirAbs, input.result.fixtureId);
  fs.mkdirSync(baseDir, { recursive: true });

  const outputs: { rel: string; value: JsonValue }[] = [
    { rel: "validation-summary.json", value: input.result.validationSummary as unknown as JsonValue },
    { rel: "import-output.json", value: input.result.importOutput as unknown as JsonValue },
    { rel: "import-manifest.json", value: input.result.importManifest as unknown as JsonValue },
    { rel: "pipeline-result.json", value: input.result.pipelineResult as unknown as JsonValue },
    { rel: "preview-document.json", value: input.result.previewDocument as unknown as JsonValue },
    { rel: "approval-package.json", value: input.result.approvalPackage as unknown as JsonValue },
    { rel: "execution-plan.json", value: input.result.executionPlan as unknown as JsonValue },
    { rel: "execution-result.json", value: input.result.executionResult as unknown as JsonValue },
    { rel: "migration-run-report.json", value: input.result.migrationRunReport as unknown as JsonValue },
  ];

  for (const o of outputs) writeJsonStable(path.resolve(baseDir, o.rel), o.value);

  return { outDirAbs: baseDir, writtenFiles: outputs.map((o) => o.rel) };
}

