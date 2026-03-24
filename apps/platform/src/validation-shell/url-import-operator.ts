import type { ExecutionMode } from "../../gnr8/migration/execution-plan-model";
import { runLinearMigrationPhase1ApproveExecute } from "../../gnr8/migration/runtime/run-linear-migration-phase1-approve-execute";
import { stableStringify } from "../../gnr8/migration/runtime/diagnostics";
import { importHtmlToPage } from "../../gnr8/importer/html-to-page";
import {
  evaluateSiteMigrationGate,
  type SiteMigrationGateResult,
} from "../../gnr8/migration/quality-gates/site-quality-gate";
import {
  evaluateSiteRolloutPolicy,
  toSiteRolloutPolicyPageResult,
  type SiteRolloutPolicyPageResult,
  type SiteRolloutPolicyResult,
} from "../../gnr8/migration/policy/site-rollout-policy";
import {
  evaluateSiteRolloutEnforcementByStage,
  type SiteEnforcementByStage,
} from "../../gnr8/migration/enforcement/site-enforcement";
import { createImportManifest } from "../../gnr8/import/import-manifest";
import type { JsonValue } from "../../gnr8/import/import-contract";
import { importStaticSite } from "../../gnr8/import/runtime/import-static-site";
import type { PageMigrationGateResult } from "../../gnr8/migration/quality-gates/page-quality-gate";
import type { PageRolloutPolicyResult } from "../../gnr8/migration/policy/page-rollout-policy";
import type { PageEnforcementByStage } from "../../gnr8/migration/enforcement/page-enforcement";

import {
  importPublicSinglePageUrlToSnapshot,
  type UrlSinglePageImportSnapshot,
  type UrlImportDiagnostic,
  type UrlImportFetchManifestEntry,
} from "../../gnr8/validation/runtime/url-single-page-import";

export const URL_IMPORT_OPERATOR_EXECUTION_MODES: readonly ExecutionMode[] = ["simulation", "materialize"] as const;

export type UrlImportOperatorError = {
  message: string;
  stack: string | null;
};

export type UrlImportOperatorPageReviewRecord = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  title: string | null;
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
  pageMigrationGate: PageMigrationGateResult;
  pageRolloutPolicy: PageRolloutPolicyResult;
  pageEnforcement: PageEnforcementByStage;
  weakSectionDetails: Array<{
    sectionId: string;
    intent: string | null;
    structuralConfidence: number | null;
    confidenceComponents: Record<string, unknown> | null;
    anomalies: string[];
  }>;
};

export type UrlImportOperatorResponse =
  | {
      kind: "url_import_operator_response_v1";
      ok: true;
      sourceKind: "imported_url_snapshot";
      sourceUrl: string;
      normalizedUrl: string;
      executionMode: ExecutionMode;
      snapshot: {
        snapshotId: string;
        snapshotRootDirAbs: string;
        entryHtmlPathAbs: string;
        assetsDirAbs: string;
        importDiagnostics: UrlSinglePageImportSnapshot["importDiagnostics"];
        fetchManifest: UrlImportFetchManifestEntry[];
      };
      result: {
        importOutput: Awaited<ReturnType<typeof importStaticSite>>;
        importManifest: ReturnType<typeof createImportManifest>;
        pipelineResult: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["pipeline"];
        previewDocument: unknown | null;
        approvalPackage: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["approvalPackage"];
        executionPlan: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["executionPlan"];
        executionResult: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["executionResult"];
        migrationRunReport: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["report"];
        pageReview: UrlImportOperatorPageReviewRecord[];
        siteMigrationGate: SiteMigrationGateResult;
        siteRolloutPolicy: SiteRolloutPolicyResult;
        siteEnforcement: SiteEnforcementByStage;
      };
      summary: {
        importStatus: ReturnType<typeof createImportManifest>["status"];
        pipelineStatus: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["pipeline"]["status"];
        approvalStatus: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["approvalPackage"]["eligibility"]["status"];
        executionPlanEligibility: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["executionPlan"]["eligibility"]["status"];
        executionStatus: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["executionResult"]["status"];
        reportStatus: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["report"]["overallStatus"];
        warningCodes: string[];
        blockingReasonCodes: string[];
      };
      error: null;
    }
  | {
      kind: "url_import_operator_response_v1";
      ok: false;
      sourceKind: "imported_url_snapshot";
      sourceUrl: string;
      normalizedUrl: string | null;
      executionMode: ExecutionMode;
      snapshot: {
        snapshotId: string | null;
        snapshotRootDirAbs: string | null;
        entryHtmlPathAbs: string | null;
        assetsDirAbs: string | null;
        importDiagnostics: { summary: { infoCount: number; warningCount: number; errorCount: number; fatalCount: number }; issues: UrlImportDiagnostic[] } | null;
        fetchManifest: UrlImportFetchManifestEntry[];
      };
      result: null;
      summary: null;
      error: UrlImportOperatorError;
    };

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function findPreviewDocument(pipeline: Awaited<ReturnType<typeof runLinearMigrationPhase1ApproveExecute>>["pipeline"]) {
  const stage = pipeline.stages.find((s) => s.stageId === "preview_generation");
  return stage?.output.previewDocument ?? null;
}

function inferPageSlug(path: string): string {
  const normalized = String(path ?? "").trim();
  if (!normalized || normalized === "index.html") return "/";
  const indexSuffix = "/index.html";
  const withoutIndex = normalized.endsWith(indexSuffix) ? normalized.slice(0, normalized.length - indexSuffix.length) : normalized;
  const trimmed = withoutIndex.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return "/";
  return `/${trimmed}`;
}

function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.min(1, Math.max(0, value)).toFixed(3));
}

function toWeakSectionDetails(page: ReturnType<typeof importHtmlToPage>): UrlImportOperatorPageReviewRecord["weakSectionDetails"] {
  const weakIds = new Set((page.migrationDiagnostics?.weakSectionIds ?? []).filter((id): id is string => typeof id === "string" && id.trim().length > 0));
  if (weakIds.size === 0) return [];

  const output: UrlImportOperatorPageReviewRecord["weakSectionDetails"] = [];
  for (const section of page.sections) {
    if (!weakIds.has(section.id)) continue;

    const raw = section.props?.layoutStructural;
    const node = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const intentRaw = typeof node?.intent === "string" ? node.intent.trim() : "";
    const structuralConfidenceRaw = typeof node?.structuralConfidence === "number" ? node.structuralConfidence : null;
    const confidenceComponentsRaw =
      node?.confidenceComponents && typeof node.confidenceComponents === "object"
        ? (node.confidenceComponents as Record<string, unknown>)
        : null;
    const anomaliesRaw = Array.isArray(node?.anomalies) ? node!.anomalies : [];

    output.push({
      sectionId: section.id,
      intent: intentRaw.length > 0 ? intentRaw : null,
      structuralConfidence: structuralConfidenceRaw === null ? null : round3(structuralConfidenceRaw),
      confidenceComponents: confidenceComponentsRaw,
      anomalies: [...new Set(anomaliesRaw.filter((value): value is string => typeof value === "string" && value.trim().length > 0))].sort(),
    });
  }

  return output.sort((a, b) => a.sectionId.localeCompare(b.sectionId));
}

function buildMigrationPolicyInputsFromImportOutput(input: { importOutput: Awaited<ReturnType<typeof importStaticSite>> }): {
  pageGateResults: Parameters<typeof evaluateSiteMigrationGate>[0]["pageResults"];
  pagePolicyResults: SiteRolloutPolicyPageResult[];
  pageReview: UrlImportOperatorPageReviewRecord[];
} {
  const pageRecords = input.importOutput.rawDomSnapshot.documents
    .map((doc) => {
      const page = importHtmlToPage({
        slug: inferPageSlug(doc.path),
        html: doc.text,
      });
      const pageGate = page.migrationDiagnostics?.pageMigrationGate;
      if (!pageGate) return null;

      return {
        pageId: page.id,
        sourcePath: doc.path,
        isRoot: doc.path === input.importOutput.documentMeta.source.entryHtmlPath,
        title: page.title ?? null,
        pageStructuralConfidence: round3(page.migrationDiagnostics?.pageStructuralConfidence ?? 0),
        weakSectionIds: [...new Set((page.migrationDiagnostics?.weakSectionIds ?? []).filter((id): id is string => typeof id === "string"))].sort(),
        structuralAnomalies: [...new Set((page.migrationDiagnostics?.structuralAnomalies ?? []).filter((v): v is string => typeof v === "string"))].sort(),
        gate: pageGate,
        score: pageGate.score,
        pageRolloutPolicy: page.migrationDiagnostics!.pageRolloutPolicy,
        pageEnforcement: page.migrationDiagnostics!.pageEnforcement,
        weakSectionDetails: toWeakSectionDetails(page),
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  return {
    pageGateResults: pageRecords.map((record) => ({
      pageId: record.pageId,
      sourcePath: record.sourcePath,
      isRoot: record.isRoot,
      gate: record.gate,
    })),
    pagePolicyResults: pageRecords.map((record) =>
      toSiteRolloutPolicyPageResult({
        pageId: record.pageId,
        sourcePath: record.sourcePath,
        isRoot: record.isRoot,
        score: record.score,
        pageGateResult: record.gate,
      }),
    ),
    pageReview: pageRecords
      .map((record) => ({
        pageId: record.pageId,
        sourcePath: record.sourcePath,
        isRoot: record.isRoot,
        title: record.title,
        pageStructuralConfidence: record.pageStructuralConfidence,
        weakSectionIds: record.weakSectionIds,
        structuralAnomalies: record.structuralAnomalies,
        pageMigrationGate: record.gate,
        pageRolloutPolicy: record.pageRolloutPolicy,
        pageEnforcement: record.pageEnforcement,
        weakSectionDetails: record.weakSectionDetails,
      }))
      .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId)),
  };
}

export async function runUrlImportOperatorFlow(
  input: {
    sourceUrl: string;
    executionMode: ExecutionMode;
  },
  options?: {
    requestId?: string;
    outputRootDir?: string;
    cleanOutputRoot?: boolean;
    snapshotRootDirAbs?: string;
    fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  },
): Promise<UrlImportOperatorResponse> {
  let snapshot: UrlSinglePageImportSnapshot | null = null;

  try {
    snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: input.sourceUrl,
      requestId: options?.requestId,
      snapshotRootDirAbs: options?.snapshotRootDirAbs,
      fetchImpl: options?.fetchImpl,
    });

    if (snapshot.importDiagnostics.summary.fatalCount > 0) {
      throw new Error(
        `url_import_snapshot_failed: fatal_diagnostics=${snapshot.importDiagnostics.summary.fatalCount}; source=${snapshot.normalizedUrl}`,
      );
    }

    const importOutput = await importStaticSite({
      rootDir: snapshot.snapshotRootDirAbs,
      requestId: options?.requestId ?? `url-import-${snapshot.snapshotId}-${input.executionMode}`,
      source: {
        kind: "single-entry-html",
        entryHtmlPath: snapshot.fixtureSpec.entryHtmlPath,
        assetsDirPath: snapshot.fixtureSpec.assetsDirPath,
      },
    });
    const importManifest = createImportManifest(importOutput);

    const phase1 = await runLinearMigrationPhase1ApproveExecute(
      { importOutput, importManifest },
      {
        executionMode: input.executionMode,
        ...(input.executionMode === "materialize"
          ? {
              importRootDir: snapshot.snapshotRootDirAbs,
              outputRootDir: options?.outputRootDir,
              cleanOutputRoot: options?.cleanOutputRoot,
            }
          : {}),
      },
    );

    const warningCodes = uniqueSortedStrings([
      ...snapshot.importDiagnostics.issues.filter((d) => d.severity === "warning").map((d) => d.code),
      ...phase1.approvalPackage.eligibility.warningCodes,
      ...phase1.executionPlan.eligibility.warningCodes,
      ...phase1.executionResult.warningCodes,
      ...phase1.report.diagnostics.warnings.codes,
    ]);

    const blockingReasonCodes = uniqueSortedStrings([
      ...phase1.approvalPackage.eligibility.blockingReasons.map((b) => b.code),
      ...phase1.executionPlan.eligibility.blockingReasons.map((b) => b.code),
      ...phase1.executionResult.blockingReasons,
      ...phase1.report.diagnostics.blocking.codes,
      ...phase1.pipeline.diagnostics.filter((d) => d.severity === "fatal" || d.severity === "error").map((d) => d.code),
    ]);
    const migrationPolicyInputs = buildMigrationPolicyInputsFromImportOutput({ importOutput });
    const siteMigrationGate = evaluateSiteMigrationGate({ pageResults: migrationPolicyInputs.pageGateResults });
    const siteRolloutPolicy = evaluateSiteRolloutPolicy({
      siteGateResult: siteMigrationGate,
      pagePolicyResults: migrationPolicyInputs.pagePolicyResults,
    });
    const siteEnforcement = evaluateSiteRolloutEnforcementByStage({
      siteMigrationGate,
      siteRolloutPolicy,
    });

    return {
      kind: "url_import_operator_response_v1",
      ok: true,
      sourceKind: "imported_url_snapshot",
      sourceUrl: input.sourceUrl,
      normalizedUrl: snapshot.normalizedUrl,
      executionMode: input.executionMode,
      snapshot: {
        snapshotId: snapshot.snapshotId,
        snapshotRootDirAbs: snapshot.snapshotRootDirAbs,
        entryHtmlPathAbs: snapshot.entryHtmlPathAbs,
        assetsDirAbs: snapshot.assetsDirAbs,
        importDiagnostics: snapshot.importDiagnostics,
        fetchManifest: snapshot.fetchManifest,
      },
      result: {
        importOutput,
        importManifest,
        pipelineResult: phase1.pipeline,
        previewDocument: findPreviewDocument(phase1.pipeline),
        approvalPackage: phase1.approvalPackage,
        executionPlan: phase1.executionPlan,
        executionResult: phase1.executionResult,
        migrationRunReport: phase1.report,
        pageReview: migrationPolicyInputs.pageReview,
        siteMigrationGate,
        siteRolloutPolicy,
        siteEnforcement,
      },
      summary: {
        importStatus: importManifest.status,
        pipelineStatus: phase1.pipeline.status,
        approvalStatus: phase1.approvalPackage.eligibility.status,
        executionPlanEligibility: phase1.executionPlan.eligibility.status,
        executionStatus: phase1.executionResult.status,
        reportStatus: phase1.report.overallStatus,
        warningCodes,
        blockingReasonCodes,
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack ?? null : null;

    return {
      kind: "url_import_operator_response_v1",
      ok: false,
      sourceKind: "imported_url_snapshot",
      sourceUrl: input.sourceUrl,
      normalizedUrl: snapshot?.normalizedUrl ?? null,
      executionMode: input.executionMode,
      snapshot: {
        snapshotId: snapshot?.snapshotId ?? null,
        snapshotRootDirAbs: snapshot?.snapshotRootDirAbs ?? null,
        entryHtmlPathAbs: snapshot?.entryHtmlPathAbs ?? null,
        assetsDirAbs: snapshot?.assetsDirAbs ?? null,
        importDiagnostics: snapshot?.importDiagnostics ?? null,
        fetchManifest: snapshot?.fetchManifest ?? [],
      },
      result: null,
      summary: null,
      error: { message, stack },
    };
  }
}

export function urlImportOperatorResponseStableJson(response: UrlImportOperatorResponse): string {
  return stableStringify(response as unknown as JsonValue);
}
