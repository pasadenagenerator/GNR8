import {
  type DegradationFinding,
  type ExportScore,
  type ExportScoreAxes,
  type FailureClassification,
  type OperatorDecision,
  classifyDegradationIssue,
  classifyRun,
  decideOperatorAction,
  scoreExportQuality,
} from "./beta-migration-scoring";

export const BETA_MIGRATION_DRY_RUN_REPORT_VERSION = "1.0.0" as const;

export type DryRunExecutionMode = "phase1_url_import_simulation";

export type DryRunParityCheck =
  | "layout_structure_parity"
  | "typography_parity"
  | "spacing_parity_coarse"
  | "imagery_presence_parity"
  | "cta_presence_parity"
  | "navigation_structure_parity"
  | "responsive_sanity_check";

export type DryRunParityStatus = "pass" | "minor_diff" | "major_diff" | "missing";

export type DryRunParityFinding = {
  check: DryRunParityCheck;
  status: DryRunParityStatus;
  detail: string;
};

export type DryRunValidationSummary = {
  overallStatus: "passed" | "passed_with_warnings" | "blocked" | "failed";
  keyDiagnosticCodes: string[];
  blockedReasonCodes: string[];
};

export type ReportDegradationFinding = DegradationFinding & {
  classification: FailureClassification;
};

export type BetaMigrationDryRunReport = {
  kind: "beta_migration_dry_run_report_v1";
  reportVersion: typeof BETA_MIGRATION_DRY_RUN_REPORT_VERSION;
  sourceUrl: string;
  snapshotId: string;
  executionMode: DryRunExecutionMode;
  validationSummary: DryRunValidationSummary;
  exportScore: ExportScore;
  parityFindings: DryRunParityFinding[];
  degradationFindings: ReportDegradationFinding[];
  classification: FailureClassification;
  operatorDecision: OperatorDecision;
  notes: string[];
  timestamp?: string;
};

export type CreateBetaMigrationDryRunReportInput = {
  sourceUrl: string;
  snapshotId: string;
  executionMode?: DryRunExecutionMode;
  validationSummary: DryRunValidationSummary;
  exportScoreAxes: ExportScoreAxes;
  parityFindings: DryRunParityFinding[];
  degradationFindings: DegradationFinding[];
  notes?: string[];
  operatorDecision?: OperatorDecision;
  timestamp?: string;
};

function sortUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sortParityFindings(values: readonly DryRunParityFinding[]): DryRunParityFinding[] {
  return [...values].sort((a, b) => {
    const byCheck = a.check.localeCompare(b.check);
    if (byCheck !== 0) return byCheck;
    return a.detail.localeCompare(b.detail);
  });
}

function normalizeDegradationFindings(values: readonly DegradationFinding[]): ReportDegradationFinding[] {
  return values
    .map((value) => ({
      issueCode: value.issueCode,
      detail: value.detail,
      classification: classifyDegradationIssue(value.issueCode),
    }))
    .sort((a, b) => {
      const byCode = a.issueCode.localeCompare(b.issueCode);
      if (byCode !== 0) return byCode;
      return a.detail.localeCompare(b.detail);
    });
}

export function createBetaMigrationDryRunReport(input: CreateBetaMigrationDryRunReportInput): BetaMigrationDryRunReport {
  const degradationFindings = normalizeDegradationFindings(input.degradationFindings);
  const classification = classifyRun(degradationFindings);
  const exportScore = scoreExportQuality({ axes: input.exportScoreAxes });

  return {
    kind: "beta_migration_dry_run_report_v1",
    reportVersion: BETA_MIGRATION_DRY_RUN_REPORT_VERSION,
    sourceUrl: input.sourceUrl,
    snapshotId: input.snapshotId,
    executionMode: input.executionMode ?? "phase1_url_import_simulation",
    validationSummary: {
      overallStatus: input.validationSummary.overallStatus,
      keyDiagnosticCodes: sortUniqueStrings(input.validationSummary.keyDiagnosticCodes),
      blockedReasonCodes: sortUniqueStrings(input.validationSummary.blockedReasonCodes),
    },
    exportScore,
    parityFindings: sortParityFindings(input.parityFindings),
    degradationFindings,
    classification,
    operatorDecision:
      input.operatorDecision ??
      decideOperatorAction({
        classification,
        weightedOverallScore: exportScore.weightedOverall,
      }),
    notes: sortUniqueStrings(input.notes ?? []),
    ...(input.timestamp ? { timestamp: input.timestamp } : {}),
  };
}

export function isBetaMigrationDryRunReport(value: unknown): value is BetaMigrationDryRunReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<BetaMigrationDryRunReport>;
  if (report.kind !== "beta_migration_dry_run_report_v1") return false;
  if (report.reportVersion !== BETA_MIGRATION_DRY_RUN_REPORT_VERSION) return false;
  if (typeof report.sourceUrl !== "string") return false;
  if (typeof report.snapshotId !== "string") return false;
  if (report.executionMode !== "phase1_url_import_simulation") return false;
  if (!report.validationSummary || typeof report.validationSummary !== "object") return false;
  if (!report.exportScore || typeof report.exportScore !== "object") return false;
  if (!Array.isArray(report.parityFindings)) return false;
  if (!Array.isArray(report.degradationFindings)) return false;
  if (!Array.isArray(report.notes)) return false;
  return true;
}
