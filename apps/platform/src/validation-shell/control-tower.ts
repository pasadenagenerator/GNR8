import type { ValidationFixtureId } from "@/gnr8/validation/validation-contract";

import { runValidationShellForFixture, type ValidationShellResponse } from "@/src/validation-shell/real-site-01";

export const PHASE1_VALIDATION_FIXTURE_ORDER: readonly ValidationFixtureId[] = ["real-site-01", "real-site-02", "real-site-03"] as const;

export type ValidationControlTowerSuccessRow = {
  kind: "success";
  fixtureId: ValidationFixtureId;
  fixtureRoute: string;
  fixtureApiRoute: string;
  overallValidationStatus: string;
  importManifestStatus: string;
  pipelineStatus: string;
  previewStatus: string;
  approvalStatus: string;
  executionStatus: string;
  runReportOverallStatus: string;
  previewPageCount: number;
  renderedPageCount: number;
  keyDiagnosticCodes: string[];
};

export type ValidationControlTowerFailureRow = {
  kind: "failure";
  fixtureId: ValidationFixtureId;
  fixtureRoute: string;
  fixtureApiRoute: string;
  overallValidationStatus: "failed_to_run";
  importManifestStatus: "failed_to_run";
  pipelineStatus: "failed_to_run";
  previewStatus: "failed_to_run";
  approvalStatus: "failed_to_run";
  executionStatus: "failed_to_run";
  runReportOverallStatus: "failed_to_run";
  previewPageCount: null;
  renderedPageCount: null;
  keyDiagnosticCodes: [];
  failure: {
    message: string;
    stack: string | null;
  };
};

export type ValidationControlTowerRow = ValidationControlTowerSuccessRow | ValidationControlTowerFailureRow;

function toFixtureRoute(fixtureId: ValidationFixtureId): string {
  return `/validation/${fixtureId}`;
}

function toFixtureApiRoute(fixtureId: ValidationFixtureId): string {
  return `/api/validation/${fixtureId}`;
}

function summarizeFixtureResponse(response: ValidationShellResponse): ValidationControlTowerRow {
  if (!response.ok) {
    return {
      kind: "failure",
      fixtureId: response.fixtureId,
      fixtureRoute: toFixtureRoute(response.fixtureId),
      fixtureApiRoute: toFixtureApiRoute(response.fixtureId),
      overallValidationStatus: "failed_to_run",
      importManifestStatus: "failed_to_run",
      pipelineStatus: "failed_to_run",
      previewStatus: "failed_to_run",
      approvalStatus: "failed_to_run",
      executionStatus: "failed_to_run",
      runReportOverallStatus: "failed_to_run",
      previewPageCount: null,
      renderedPageCount: null,
      keyDiagnosticCodes: [],
      failure: {
        message: response.error.message,
        stack: response.error.stack,
      },
    };
  }

  return {
    kind: "success",
    fixtureId: response.fixtureId,
    fixtureRoute: toFixtureRoute(response.fixtureId),
    fixtureApiRoute: toFixtureApiRoute(response.fixtureId),
    overallValidationStatus: response.result.validationSummary.overallStatus,
    importManifestStatus: response.result.importManifest.status,
    pipelineStatus: response.result.pipelineResult.status,
    previewStatus: response.result.previewDocument.status,
    approvalStatus: response.result.approvalPackage.eligibility.status,
    executionStatus: response.result.executionResult.status,
    runReportOverallStatus: response.result.migrationRunReport.overallStatus,
    previewPageCount: response.result.validationSummary.counts.previewPageCount,
    renderedPageCount: response.result.validationSummary.counts.renderedPageCount,
    keyDiagnosticCodes: response.result.validationSummary.diagnostics.keyCodes,
  };
}

/**
 * Runs all current explicit phase-1 fixtures in deterministic order.
 * Each fixture is isolated so one failure is represented as structured row data
 * and never breaks the overall control-tower page rendering.
 */
export async function runValidationControlTower(options?: { requestIdPrefix?: string }): Promise<ValidationControlTowerRow[]> {
  const requestIdPrefix = (options?.requestIdPrefix ?? "validation-control-tower").trim();

  const rows: ValidationControlTowerRow[] = [];
  for (const fixtureId of PHASE1_VALIDATION_FIXTURE_ORDER) {
    try {
      const response = await runValidationShellForFixture(fixtureId, {
        requestId: `${requestIdPrefix}-${fixtureId}`,
      });
      rows.push(summarizeFixtureResponse(response));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack ?? null : null;
      rows.push({
        kind: "failure",
        fixtureId,
        fixtureRoute: toFixtureRoute(fixtureId),
        fixtureApiRoute: toFixtureApiRoute(fixtureId),
        overallValidationStatus: "failed_to_run",
        importManifestStatus: "failed_to_run",
        pipelineStatus: "failed_to_run",
        previewStatus: "failed_to_run",
        approvalStatus: "failed_to_run",
        executionStatus: "failed_to_run",
        runReportOverallStatus: "failed_to_run",
        previewPageCount: null,
        renderedPageCount: null,
        keyDiagnosticCodes: [],
        failure: { message, stack },
      });
    }
  }

  return rows;
}
