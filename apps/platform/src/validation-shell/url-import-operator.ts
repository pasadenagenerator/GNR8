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
import { buildEnforcementAdapterDecision, type EnforcementAdapterDecision } from "../../gnr8/migration/enforcement/enforcement-adapter";
import { createImportManifest } from "../../gnr8/import/import-manifest";
import type { JsonValue } from "../../gnr8/import/import-contract";
import { importStaticSite } from "../../gnr8/import/runtime/import-static-site";
import type { PageMigrationGateResult } from "../../gnr8/migration/quality-gates/page-quality-gate";
import type { PageRolloutPolicyResult } from "../../gnr8/migration/policy/page-rollout-policy";
import type { PageEnforcementByStage } from "../../gnr8/migration/enforcement/page-enforcement";
import type { PreviewDocument } from "../../gnr8/migration/preview-document-model";
import type { RenderedCaptureExecutor } from "../../gnr8/import-rendered-capture";

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

type CompareRegionIntent = "header_nav" | "hero" | "body" | "gallery_media" | "form_contact" | "footer_legal";

type ComparePageStructureSummary = {
  detectedRegions: CompareRegionIntent[];
  regionOrder: CompareRegionIntent[];
  regionCounts: Partial<Record<CompareRegionIntent, number>>;
  regionConfidence: Partial<Record<CompareRegionIntent, number>>;
  sectionCount: number;
};

export type UrlImportOperatorCompareMismatchFlag =
  | "HERO_MISMATCH"
  | "SECTION_ORDER_DRIFT"
  | "GALLERY_MISSING"
  | "FORM_MISSING"
  | "CONTACT_DEGRADED"
  | "FOOTER_MISSING"
  | "NAV_MERGED_INTO_CONTENT"
  | "ENFORCEMENT_BLOCKING_STRUCTURAL_MISMATCH";

export type UrlImportOperatorPrimaryPageCompareEvidence = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  sourceSnapshotHtml: string;
  migratedPreviewHtml: string | null;
  sourceStructure: ComparePageStructureSummary;
  migratedStructure: ComparePageStructureSummary;
  mismatchFlags: UrlImportOperatorCompareMismatchFlag[];
  mismatchReasons: string[];
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
        sourceMode: UrlSinglePageImportSnapshot["sourceMode"];
        sourceSelection: UrlSinglePageImportSnapshot["sourceSelection"];
        responseHtmlPathAbs: string;
        entryHtmlPathAbs: string;
        assetsDirAbs: string;
        renderedCapture: UrlSinglePageImportSnapshot["renderedCapture"];
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
        compareEvidence: {
          primaryPage: UrlImportOperatorPrimaryPageCompareEvidence | null;
        };
        enforcementAdapterByStage: {
          SHADOW: EnforcementAdapterDecision;
          CANARY: EnforcementAdapterDecision;
          PRODUCTION: EnforcementAdapterDecision;
        };
        publishStageEligibility: {
          shadow: boolean;
          canary: boolean;
          production: boolean;
        };
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
        renderedCaptureStatus: UrlSinglePageImportSnapshot["renderedCapture"]["status"];
        renderedDomCaptured: boolean;
        screenshotCount: number;
        computedStyleSampleCount: number;
        structureSourceMode: UrlSinglePageImportSnapshot["sourceMode"];
        fidelityStatus: UrlSinglePageImportSnapshot["sourceSelection"]["fidelityStatus"];
        fidelityDegraded: boolean;
        renderedDomQuality: UrlSinglePageImportSnapshot["sourceSelection"]["renderedDomQuality"]["quality"];
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
        sourceMode: UrlSinglePageImportSnapshot["sourceMode"] | null;
        sourceSelection: UrlSinglePageImportSnapshot["sourceSelection"] | null;
        responseHtmlPathAbs: string | null;
        entryHtmlPathAbs: string | null;
        assetsDirAbs: string | null;
        renderedCapture: UrlSinglePageImportSnapshot["renderedCapture"] | null;
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
  const value = stage?.output.previewDocument;
  if (!value || typeof value !== "object") return null;
  return value as PreviewDocument;
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

const COMPARE_REGION_INTENTS: readonly CompareRegionIntent[] = [
  "header_nav",
  "hero",
  "body",
  "gallery_media",
  "form_contact",
  "footer_legal",
];

function toCompareRegionIntent(value: unknown): CompareRegionIntent | null {
  if (
    value === "header_nav" ||
    value === "hero" ||
    value === "body" ||
    value === "gallery_media" ||
    value === "form_contact" ||
    value === "footer_legal"
  ) {
    return value;
  }
  return null;
}

function emptyStructureSummary(): ComparePageStructureSummary {
  return {
    detectedRegions: [],
    regionOrder: [],
    regionCounts: {},
    regionConfidence: {},
    sectionCount: 0,
  };
}

function summarizeStructureForCompare(page: ReturnType<typeof importHtmlToPage>): ComparePageStructureSummary {
  const regionCounts: Partial<Record<CompareRegionIntent, number>> = {};
  const confidenceBuckets = new Map<CompareRegionIntent, number[]>();
  const regionOrder: CompareRegionIntent[] = [];
  const seenInOrder = new Set<CompareRegionIntent>();

  for (const section of page.sections) {
    const raw = section.props?.layoutStructural;
    if (!raw || typeof raw !== "object") continue;

    const node = raw as Record<string, unknown>;
    const intent = toCompareRegionIntent(node.intent);
    if (!intent) continue;

    regionCounts[intent] = (regionCounts[intent] ?? 0) + 1;
    if (!seenInOrder.has(intent)) {
      seenInOrder.add(intent);
      regionOrder.push(intent);
    }

    if (typeof node.structuralConfidence === "number" && Number.isFinite(node.structuralConfidence)) {
      const bucket = confidenceBuckets.get(intent) ?? [];
      bucket.push(Math.max(0, Math.min(1, node.structuralConfidence)));
      confidenceBuckets.set(intent, bucket);
    }
  }

  const regionConfidence: Partial<Record<CompareRegionIntent, number>> = {};
  for (const intent of COMPARE_REGION_INTENTS) {
    const values = confidenceBuckets.get(intent);
    if (!values || values.length === 0) continue;
    const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
    regionConfidence[intent] = round3(avg);
  }

  return {
    detectedRegions: [...regionOrder],
    regionOrder,
    regionCounts,
    regionConfidence,
    sectionCount: page.sections.length,
  };
}

function hasRegion(summary: ComparePageStructureSummary, intent: CompareRegionIntent): boolean {
  return (summary.regionCounts[intent] ?? 0) > 0;
}

function firstRegionIndex(summary: ComparePageStructureSummary, intent: CompareRegionIntent): number {
  return summary.regionOrder.findIndex((value) => value === intent);
}

function hasSectionOrderDrift(source: ComparePageStructureSummary, migrated: ComparePageStructureSummary): boolean {
  const shared = COMPARE_REGION_INTENTS.filter((intent) => hasRegion(source, intent) && hasRegion(migrated, intent));
  if (shared.length < 2) return false;

  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      const a = shared[i];
      const b = shared[j];
      const sourceOrder = firstRegionIndex(source, a) - firstRegionIndex(source, b);
      const migratedOrder = firstRegionIndex(migrated, a) - firstRegionIndex(migrated, b);
      if (sourceOrder === 0 || migratedOrder === 0) continue;
      if ((sourceOrder < 0 && migratedOrder > 0) || (sourceOrder > 0 && migratedOrder < 0)) return true;
    }
  }
  return false;
}

function deriveMismatchEvidence(input: {
  sourceStructure: ComparePageStructureSummary;
  migratedStructure: ComparePageStructureSummary;
  structuralAnomalies: string[];
}): {
  mismatchFlags: UrlImportOperatorCompareMismatchFlag[];
  mismatchReasons: string[];
} {
  const mismatchFlags = new Set<UrlImportOperatorCompareMismatchFlag>();
  const mismatchReasons = new Set<string>();

  if (hasSectionOrderDrift(input.sourceStructure, input.migratedStructure)) {
    mismatchFlags.add("SECTION_ORDER_DRIFT");
    mismatchReasons.add("section_order_drift_detected");
  }

  const sourceHasHero = hasRegion(input.sourceStructure, "hero");
  const migratedHasHero = hasRegion(input.migratedStructure, "hero");
  const sourceHeroConfidence = input.sourceStructure.regionConfidence.hero ?? null;
  const migratedHeroConfidence = input.migratedStructure.regionConfidence.hero ?? null;
  if (sourceHasHero !== migratedHasHero) {
    mismatchFlags.add("HERO_MISMATCH");
    mismatchReasons.add("hero_region_presence_mismatch");
  } else if (
    sourceHasHero &&
    migratedHasHero &&
    sourceHeroConfidence !== null &&
    migratedHeroConfidence !== null &&
    migratedHeroConfidence + 0.2 < sourceHeroConfidence
  ) {
    mismatchFlags.add("HERO_MISMATCH");
    mismatchReasons.add("hero_confidence_drop_detected");
  }

  if (hasRegion(input.sourceStructure, "gallery_media") && !hasRegion(input.migratedStructure, "gallery_media")) {
    mismatchFlags.add("GALLERY_MISSING");
    mismatchReasons.add("source_gallery_media_missing_in_migrated");
  }

  const sourceHasFormContact = hasRegion(input.sourceStructure, "form_contact");
  const migratedHasFormContact = hasRegion(input.migratedStructure, "form_contact");
  if (sourceHasFormContact && !migratedHasFormContact) {
    mismatchFlags.add("FORM_MISSING");
    mismatchReasons.add("source_form_contact_missing_in_migrated");
  }

  const sourceFormConfidence = input.sourceStructure.regionConfidence.form_contact ?? null;
  const migratedFormConfidence = input.migratedStructure.regionConfidence.form_contact ?? null;
  if (
    sourceHasFormContact &&
    migratedHasFormContact &&
    sourceFormConfidence !== null &&
    migratedFormConfidence !== null &&
    migratedFormConfidence + 0.2 < sourceFormConfidence
  ) {
    mismatchFlags.add("CONTACT_DEGRADED");
    mismatchReasons.add("form_contact_confidence_drop_detected");
  }

  if (hasRegion(input.sourceStructure, "footer_legal") && !hasRegion(input.migratedStructure, "footer_legal")) {
    mismatchFlags.add("FOOTER_MISSING");
    mismatchReasons.add("source_footer_legal_missing_in_migrated");
  }

  if (
    input.structuralAnomalies.includes("nav_merged_into_body") ||
    (hasRegion(input.sourceStructure, "header_nav") && !hasRegion(input.migratedStructure, "header_nav") && hasRegion(input.migratedStructure, "body"))
  ) {
    mismatchFlags.add("NAV_MERGED_INTO_CONTENT");
    mismatchReasons.add("nav_merged_into_body_signal");
  }

  return {
    mismatchFlags: [...mismatchFlags].sort((a, b) => a.localeCompare(b)),
    mismatchReasons: [...mismatchReasons].sort((a, b) => a.localeCompare(b)),
  };
}

function buildPrimaryPageCompareEvidence(input: {
  importOutput: Awaited<ReturnType<typeof importStaticSite>>;
  previewDocument: PreviewDocument | null;
  pageReview: UrlImportOperatorPageReviewRecord[];
  enforcementAdapterByStage: {
    SHADOW: EnforcementAdapterDecision;
    CANARY: EnforcementAdapterDecision;
    PRODUCTION: EnforcementAdapterDecision;
  };
}): UrlImportOperatorPrimaryPageCompareEvidence | null {
  const rootPage =
    input.pageReview.find((page) => page.isRoot) ??
    input.pageReview.slice().sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))[0] ??
    null;
  if (!rootPage) return null;

  const sourceDocument =
    input.importOutput.rawDomSnapshot.documents.find((document) => document.path === rootPage.sourcePath) ??
    input.importOutput.rawDomSnapshot.documents.find((document) => document.path === input.importOutput.documentMeta.source.entryHtmlPath) ??
    input.importOutput.rawDomSnapshot.documents[0] ??
    null;

  const sourceSnapshotHtml = sourceDocument?.text ?? "";
  const previewPage =
    input.previewDocument?.pages.find((page) => page.sourcePath === rootPage.sourcePath) ??
    input.previewDocument?.pages.find((page) => page.isEntry) ??
    input.previewDocument?.pages[0] ??
    null;
  const migratedPreviewHtml = previewPage?.preview.html ?? null;

  const sourceSummary = sourceSnapshotHtml
    ? summarizeStructureForCompare(
        importHtmlToPage({
          slug: inferPageSlug(rootPage.sourcePath),
          html: sourceSnapshotHtml,
        }),
      )
    : emptyStructureSummary();

  const migratedSummary = migratedPreviewHtml
    ? summarizeStructureForCompare(
        importHtmlToPage({
          slug: `${inferPageSlug(rootPage.sourcePath)}-preview`,
          html: migratedPreviewHtml,
        }),
      )
    : emptyStructureSummary();

  const mismatches = deriveMismatchEvidence({
    sourceStructure: sourceSummary,
    migratedStructure: migratedSummary,
    structuralAnomalies: rootPage.structuralAnomalies,
  });
  const enforcementBlocksCanaryOrProduction =
    input.enforcementAdapterByStage.CANARY.decision !== "ALLOW" || input.enforcementAdapterByStage.PRODUCTION.decision !== "ALLOW";
  const hasStructuralMismatch = mismatches.mismatchFlags.length > 0;
  if (enforcementBlocksCanaryOrProduction && hasStructuralMismatch) {
    mismatches.mismatchFlags.push("ENFORCEMENT_BLOCKING_STRUCTURAL_MISMATCH");
    mismatches.mismatchReasons.push("structural_mismatch_is_blocking_publish_enforcement");
  }
  mismatches.mismatchFlags = [...new Set(mismatches.mismatchFlags)].sort((a, b) => a.localeCompare(b));
  mismatches.mismatchReasons = uniqueSortedStrings(mismatches.mismatchReasons);

  return {
    pageId: rootPage.pageId,
    sourcePath: rootPage.sourcePath,
    isRoot: rootPage.isRoot,
    sourceSnapshotHtml,
    migratedPreviewHtml,
    sourceStructure: sourceSummary,
    migratedStructure: migratedSummary,
    mismatchFlags: mismatches.mismatchFlags,
    mismatchReasons: mismatches.mismatchReasons,
  };
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
    renderedCaptureExecutor?: RenderedCaptureExecutor;
  },
): Promise<UrlImportOperatorResponse> {
  let snapshot: UrlSinglePageImportSnapshot | null = null;

  try {
    snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: input.sourceUrl,
      requestId: options?.requestId,
      snapshotRootDirAbs: options?.snapshotRootDirAbs,
      fetchImpl: options?.fetchImpl,
      renderedCaptureExecutor: options?.renderedCaptureExecutor,
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
    const previewDocument = findPreviewDocument(phase1.pipeline);
    const siteMigrationGate = evaluateSiteMigrationGate({ pageResults: migrationPolicyInputs.pageGateResults });
    const siteRolloutPolicy = evaluateSiteRolloutPolicy({
      siteGateResult: siteMigrationGate,
      pagePolicyResults: migrationPolicyInputs.pagePolicyResults,
    });
    const siteEnforcement = evaluateSiteRolloutEnforcementByStage({
      siteMigrationGate,
      siteRolloutPolicy,
    });
    const enforcementAdapterByStage = {
      SHADOW: buildEnforcementAdapterDecision({
        stage: "shadow",
        pageEnforcement: migrationPolicyInputs.pageReview.map((page) => ({
          pageId: page.pageId,
          enforcement: page.pageEnforcement,
        })),
        siteEnforcement,
      }),
      CANARY: buildEnforcementAdapterDecision({
        stage: "canary",
        pageEnforcement: migrationPolicyInputs.pageReview.map((page) => ({
          pageId: page.pageId,
          enforcement: page.pageEnforcement,
        })),
        siteEnforcement,
      }),
      PRODUCTION: buildEnforcementAdapterDecision({
        stage: "production",
        pageEnforcement: migrationPolicyInputs.pageReview.map((page) => ({
          pageId: page.pageId,
          enforcement: page.pageEnforcement,
        })),
        siteEnforcement,
      }),
    } as const;

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
        sourceMode: snapshot.sourceMode,
        sourceSelection: snapshot.sourceSelection,
        responseHtmlPathAbs: snapshot.responseHtmlPathAbs,
        entryHtmlPathAbs: snapshot.entryHtmlPathAbs,
        assetsDirAbs: snapshot.assetsDirAbs,
        renderedCapture: snapshot.renderedCapture,
        importDiagnostics: snapshot.importDiagnostics,
        fetchManifest: snapshot.fetchManifest,
      },
      result: {
        importOutput,
        importManifest,
        pipelineResult: phase1.pipeline,
        previewDocument,
        approvalPackage: phase1.approvalPackage,
        executionPlan: phase1.executionPlan,
        executionResult: phase1.executionResult,
        migrationRunReport: phase1.report,
        pageReview: migrationPolicyInputs.pageReview,
        compareEvidence: {
          primaryPage: buildPrimaryPageCompareEvidence({
            importOutput,
            previewDocument,
            pageReview: migrationPolicyInputs.pageReview,
            enforcementAdapterByStage,
          }),
        },
        enforcementAdapterByStage,
        publishStageEligibility: {
          shadow:
            enforcementAdapterByStage.SHADOW.decision === "ALLOW" || enforcementAdapterByStage.SHADOW.decision === "REVIEW_ONLY",
          canary: enforcementAdapterByStage.CANARY.decision === "ALLOW",
          production: enforcementAdapterByStage.PRODUCTION.decision === "ALLOW",
        },
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
        renderedCaptureStatus: snapshot.renderedCapture.status,
        renderedDomCaptured: snapshot.renderedCapture.documents.length > 0,
        screenshotCount: snapshot.renderedCapture.screenshots.length,
        computedStyleSampleCount: snapshot.renderedCapture.computedStyleSamples.length,
        structureSourceMode: snapshot.sourceMode,
        fidelityStatus: snapshot.sourceSelection.fidelityStatus,
        fidelityDegraded: snapshot.sourceSelection.degraded,
        renderedDomQuality: snapshot.sourceSelection.renderedDomQuality.quality,
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
        sourceMode: snapshot?.sourceMode ?? null,
        sourceSelection: snapshot?.sourceSelection ?? null,
        responseHtmlPathAbs: snapshot?.responseHtmlPathAbs ?? null,
        entryHtmlPathAbs: snapshot?.entryHtmlPathAbs ?? null,
        assetsDirAbs: snapshot?.assetsDirAbs ?? null,
        renderedCapture: snapshot?.renderedCapture ?? null,
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
