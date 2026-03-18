import type { ExecutionMode } from "../../gnr8/migration/execution-plan-model";
import type { ValidationFixtureId, ValidationRunResult } from "../../gnr8/validation/validation-contract";
import { runRealSiteValidation } from "../../gnr8/validation/runtime/run-first-real-site-validation";
import {
  SUPPORTED_VALIDATION_FIXTURE_IDS,
  validationFixtureDirAbs,
  type RealSiteFixtureSpec,
  readValidationFixtureSpec,
} from "../../gnr8/validation/runtime/fixture-spec";

export const BETA_EXPORT_OPERATOR_FIXTURE_ORDER: readonly ValidationFixtureId[] = [...SUPPORTED_VALIDATION_FIXTURE_IDS];
export const BETA_EXPORT_OPERATOR_EXECUTION_MODES: readonly ExecutionMode[] = ["simulation", "materialize"] as const;

export type BetaExportOperatorError = {
  message: string;
  stack: string | null;
};

export type BetaExportOperatorResponse =
  | {
      kind: "beta_export_operator_response_v1";
      ok: true;
      fixtureId: ValidationFixtureId;
      executionMode: ExecutionMode;
      fixtureSpec: RealSiteFixtureSpec;
      fixtureRootDirAbs: string;
      fixtureRoute: string;
      fixtureApiRoute: string;
      result: ValidationRunResult;
      summary: {
        overallValidationStatus: ValidationRunResult["validationSummary"]["overallStatus"];
        approvalStatus: ValidationRunResult["approvalPackage"]["eligibility"]["status"];
        executionPlanEligibility: ValidationRunResult["executionPlan"]["eligibility"]["status"];
        executionStatus: ValidationRunResult["executionResult"]["status"];
        warningCodes: string[];
        blockingReasonCodes: string[];
      };
      error: null;
    }
  | {
      kind: "beta_export_operator_response_v1";
      ok: false;
      fixtureId: ValidationFixtureId;
      executionMode: ExecutionMode;
      fixtureSpec: RealSiteFixtureSpec | null;
      fixtureRootDirAbs: string | null;
      fixtureRoute: string;
      fixtureApiRoute: string;
      result: null;
      summary: null;
      error: BetaExportOperatorError;
    };

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function toFixtureRoute(fixtureId: ValidationFixtureId): string {
  return `/validation/${fixtureId}`;
}

function toFixtureApiRoute(fixtureId: ValidationFixtureId): string {
  return `/api/validation/${fixtureId}`;
}

export async function runBetaExportOperatorFlow(
  input: {
    fixtureId: ValidationFixtureId;
    executionMode: ExecutionMode;
  },
  options?: {
    requestId?: string;
    outputRootDir?: string;
    cleanOutputRoot?: boolean;
  },
): Promise<BetaExportOperatorResponse> {
  const fixtureRoute = toFixtureRoute(input.fixtureId);
  const fixtureApiRoute = toFixtureApiRoute(input.fixtureId);

  let fixtureSpec: RealSiteFixtureSpec | null = null;
  let fixtureRootDirAbs: string | null = null;

  try {
    fixtureSpec = readValidationFixtureSpec(input.fixtureId);
    fixtureRootDirAbs = validationFixtureDirAbs(input.fixtureId);
    const result = await runRealSiteValidation({
      fixtureId: input.fixtureId,
      requestId: options?.requestId ?? `beta-export-operator-${input.fixtureId}-${input.executionMode}`,
      executionMode: input.executionMode,
      outputRootDir: options?.outputRootDir,
      cleanOutputRoot: options?.cleanOutputRoot,
    });

    const warningCodes = uniqueSortedStrings([
      ...result.approvalPackage.eligibility.warningCodes,
      ...result.executionPlan.eligibility.warningCodes,
      ...result.executionResult.warningCodes,
      ...result.migrationRunReport.diagnostics.warnings.codes,
    ]);
    const blockingReasonCodes = uniqueSortedStrings([
      ...result.approvalPackage.eligibility.blockingReasons.map((r) => r.code),
      ...result.executionPlan.eligibility.blockingReasons.map((r) => r.code),
      ...result.executionResult.blockingReasons,
      ...result.migrationRunReport.diagnostics.blocking.codes,
      ...result.validationSummary.diagnostics.blockedReasonCodes,
    ]);

    return {
      kind: "beta_export_operator_response_v1",
      ok: true,
      fixtureId: input.fixtureId,
      executionMode: input.executionMode,
      fixtureSpec,
      fixtureRootDirAbs,
      fixtureRoute,
      fixtureApiRoute,
      result,
      summary: {
        overallValidationStatus: result.validationSummary.overallStatus,
        approvalStatus: result.approvalPackage.eligibility.status,
        executionPlanEligibility: result.executionPlan.eligibility.status,
        executionStatus: result.executionResult.status,
        warningCodes,
        blockingReasonCodes,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? null : null;

    return {
      kind: "beta_export_operator_response_v1",
      ok: false,
      fixtureId: input.fixtureId,
      executionMode: input.executionMode,
      fixtureSpec,
      fixtureRootDirAbs,
      fixtureRoute,
      fixtureApiRoute,
      result: null,
      summary: null,
      error: { message, stack },
    };
  }
}
