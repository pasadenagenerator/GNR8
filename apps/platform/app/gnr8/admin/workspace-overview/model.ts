import fs from "node:fs/promises";
import path from "node:path";
import { createImportManifest } from "@/gnr8/import/import-manifest";
import { importStaticSite } from "@/gnr8/import/runtime/import-static-site";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import {
  STABLE_IMPORT_SNAPSHOT_FIXTURE,
  type StableImportSnapshotFixture,
} from "@/gnr8/runtime/twin/fixtures/stable-import-snapshot";
import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights, TWIN_INSIGHT_DIAGNOSTICS } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations, TWIN_OBSERVATION_DIAGNOSTICS } from "@/gnr8/runtime/twin/twin-observations";
import {
  generateTwinRecommendations,
  TWIN_RECOMMENDATION_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-recommendations";
import {
  generateTwinOptimizationOpportunities,
  TWIN_OPTIMIZATION_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-optimizations";
import {
  scoreOptimizationOpportunities,
  TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-optimization-scoring";
import {
  generateTwinProposalCandidates,
  TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-proposal-candidates";
import {
  generateTwinApprovalPreviews,
  TWIN_APPROVAL_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-approval-preview";
import {
  generateTwinProposalApprovalRecords,
  TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-proposal-approval";
import {
  generateTwinApprovalStateRecords,
  TWIN_APPROVAL_STATE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-approval-state";
import {
  generateTwinApprovalQueueItems,
  TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-approval-queue-preview";
import {
  generateTwinExecutionPlanPreviews,
  TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import {
  generateTwinExecutionArtifactPreviews,
  TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import {
  generateTwinExecutionReadinessRecords,
  TWIN_EXECUTION_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-readiness";
import {
  generateTwinExecutionPackagePreviews,
  TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-package-preview";
import {
  generateTwinExecutionPackageReadinessRecords,
  TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-package-readiness";
import {
  generateTwinExecutionContractPreviews,
  TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-contract-preview";
import {
  generateTwinExecutionContractReadinessRecords,
  TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-contract-readiness";
import {
  generateTwinExecutionBundlePreviews,
  TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-bundle-preview";
import {
  generateTwinExecutionBundleReadinessRecords,
  TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-bundle-readiness";
import {
  generateTwinExecutionAuthorizationPreviewRecords,
  TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-preview";
import {
  generateTwinExecutionAuthorizationReadinessRecords,
  TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-readiness";
import {
  generateTwinExecutionAuthorizationPackageRecords,
  TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-package";
import { InMemoryTwinStore } from "@/gnr8/runtime/twin/twin-store";
import { createTwinOverview } from "@/gnr8/runtime/twin/twin-viewer";

const DEFAULT_IMPORT_SNAPSHOTS_ROOT = path.resolve(
  process.cwd(),
  "apps/platform/gnr8/validation/.out/url-import-snapshots",
);
const DEFAULT_BETA_RUNS_ROOT = path.resolve(process.cwd(), "apps/platform/gnr8/validation/beta-runs");

function countSemanticSections(html: string): number {
  const matches = html.match(/<(section|main|article|nav|aside)\b/gi);
  return matches ? matches.length : 0;
}

function extractDetectedTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return "unknown";
  const title = titleMatch[1]?.replace(/\s+/g, " ").trim();
  return title && title.length > 0 ? title : "unknown";
}

function toSourceEvidenceSummary(input: {
  importManifest: ReturnType<typeof createImportManifest>;
  importOutput: Awaited<ReturnType<typeof importStaticSite>>;
}) {
  const pageCount = input.importManifest.dom.documentCount;
  const sectionCount = input.importOutput.rawDomSnapshot.documents.reduce(
    (sum, document) => sum + countSemanticSections(document.text),
    0,
  );
  const assetCount = input.importManifest.assets.totalAssets;
  const detectedTitle = extractDetectedTitle(input.importOutput.rawDomSnapshot.documents[0]?.text ?? "");
  const detectedHomepagePath = input.importManifest.entryHtmlPath ?? "unknown";

  return {
    pageCount,
    sectionCount,
    assetCount,
    detectedTitle,
    detectedHomepagePath,
    providerStateSummary: "preview/runtime-only",
  } as const;
}

function toTwinIdentityFromImport(input: {
  sourceId: string;
  inputSpecSha256: string;
  inputContentSha256: string;
  requestId: string;
}) {
  const shortSpecHash = input.inputSpecSha256.slice(0, 12);
  const shortContentHash = input.inputContentSha256.slice(0, 12);

  return {
    siteId: `site_${input.sourceId}_${shortSpecHash}`,
    siteVersionId: `site_version_${input.sourceId}_${shortContentHash}`,
    workspaceId: "workspace_website_os_runtime_overview",
    sourceImportId: `import_${input.sourceId}_${shortSpecHash}`,
    requestId: input.requestId,
  };
}

type ImportedSnapshotSelection = {
  snapshotId: string;
  source: "persisted_runtime_import_evidence" | "stable_validation_artifact" | "latest_imported_snapshot" | "bundled_stable_import_snapshot";
} & (
  | {
      snapshotRootDirAbs: string;
      bundledSnapshot: null;
    }
  | {
      snapshotRootDirAbs: null;
      bundledSnapshot: StableImportSnapshotFixture;
    }
);

type ImportSourceDiagnostics = {
  selectedSource: ImportedSnapshotSelection["source"] | "none";
  stableArtifactPath: string | null;
  importedUrlSnapshotDirectory: string | null;
  importedUrlSnapshotCount: number;
  fallbackReason: string | null;
  persistedEvidenceChecked: boolean;
  persistedEvidenceAvailable: boolean;
  persistedEvidenceSelected: boolean;
  persistedEvidenceReason: string | null;
  persistedEvidenceSiteVersionId: string | null;
  persistedEvidenceImportId: string | null;
  persistedEvidenceShapeStatus: "unchecked" | "unavailable" | "valid" | "invalid";
  persistedEvidenceMissingFields: string[];
  persistedEvidenceAvailableFields: string[];
  persistedEvidenceSourceKind: string | null;
  persistedEvidenceBranchDiagnostics: PersistedEvidenceBranchDiagnostics;
};

type ImportedSnapshotResolution = {
  selectedSnapshot: ImportedSnapshotSelection | null;
  selectedPersistedRuntimeEvidence: AdaptedPersistedRuntimeEvidence | null;
  importSourceDiagnostics: ImportSourceDiagnostics;
  diagnostics: string[];
};

type PersistedRuntimeEvidenceCandidate = {
  siteVersionId: string;
  snapshotId: string;
  snapshotRootDirAbs: string;
  importId: string | null;
  updatedAt: string | null;
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
  sourceEvidenceSummary?: {
    pageCount?: number;
    sectionCount?: number;
    assetCount?: number;
    detectedTitle?: string;
    detectedHomepagePath?: string;
  } | null;
};

type SourceEvidenceSummary = {
  pageCount: number;
  sectionCount: number;
  assetCount: number;
  detectedTitle: string;
  detectedHomepagePath: string;
  providerStateSummary: string;
};

type AdaptedPersistedRuntimeEvidence = {
  sourceSiteVersionId: string;
  sourceImportId: string;
  sourceEvidenceSummary: SourceEvidenceSummary;
};

type PersistedRuntimeEvidenceScanResult = {
  availableCount: number;
  invalidCount: number;
  candidates: PersistedRuntimeEvidenceCandidate[];
};

type PersistedEvidenceBranchName =
  | "siteTree"
  | "semanticImport"
  | "multipageImport"
  | "captureEvidence"
  | "renderedCapture";

type PersistedEvidenceBranchType = "object" | "array" | "string" | "number" | "boolean" | "null";

type PersistedEvidenceBranchDiagnostic = {
  present: boolean;
  type: PersistedEvidenceBranchType;
  keys: string[];
  itemCount: number | null;
};

type PersistedEvidenceBranchDiagnostics = Record<PersistedEvidenceBranchName, PersistedEvidenceBranchDiagnostic>;

function toPersistedEvidenceBranchType(value: unknown): PersistedEvidenceBranchType {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "null";
}

function toPersistedEvidenceBranchDiagnostic(value: unknown): PersistedEvidenceBranchDiagnostic {
  const present = value !== undefined;
  const type = toPersistedEvidenceBranchType(value);
  if (type === "object" && value && !Array.isArray(value)) {
    return {
      present,
      type,
      keys: Object.keys(value as Record<string, unknown>).sort(),
      itemCount: null,
    };
  }
  if (type === "array") {
    return {
      present,
      type,
      keys: [],
      itemCount: (value as unknown[]).length,
    };
  }
  return {
    present,
    type,
    keys: [],
    itemCount: null,
  };
}

function toEmptyPersistedEvidenceBranchDiagnostics(): PersistedEvidenceBranchDiagnostics {
  return {
    siteTree: toPersistedEvidenceBranchDiagnostic(undefined),
    semanticImport: toPersistedEvidenceBranchDiagnostic(undefined),
    multipageImport: toPersistedEvidenceBranchDiagnostic(undefined),
    captureEvidence: toPersistedEvidenceBranchDiagnostic(undefined),
    renderedCapture: toPersistedEvidenceBranchDiagnostic(undefined),
  };
}

function toPersistedEvidenceBranchDiagnostics(candidate: PersistedRuntimeEvidenceCandidate): PersistedEvidenceBranchDiagnostics {
  const summary = candidate.importProvenanceSummary as Record<string, unknown> | null;
  return {
    siteTree: toPersistedEvidenceBranchDiagnostic(summary?.siteTree),
    semanticImport: toPersistedEvidenceBranchDiagnostic(summary?.semanticImport),
    multipageImport: toPersistedEvidenceBranchDiagnostic(summary?.multipageImport),
    captureEvidence: toPersistedEvidenceBranchDiagnostic(summary?.captureEvidence),
    renderedCapture: toPersistedEvidenceBranchDiagnostic(summary?.renderedCapture),
  };
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toPersistedRuntimeEvidenceCandidate(input: {
  siteVersionId: unknown;
  importProvenanceSummary: unknown;
  updatedAt: unknown;
}): PersistedRuntimeEvidenceCandidate | null {
  const siteVersionId = toText(input.siteVersionId);
  if (!siteVersionId) return null;
  const summary = (input.importProvenanceSummary ?? null) as RuntimeImportProvenanceSummary | null;
  if (!summary || summary.kind !== "runtime_import_provenance_summary_v1") return null;
  const executionIdentity = summary.executionIdentity ?? null;
  if (!executionIdentity) return null;
  const snapshotId = toText(executionIdentity.snapshotId);
  const snapshotRootDirAbs =
    toText(executionIdentity.snapshotStableRootDirAbs) ?? toText(executionIdentity.snapshotRunRootDirAbs);
  const importId = toText(executionIdentity.snapshotRunId);
  if (!snapshotId || !snapshotRootDirAbs) return null;
  return {
    siteVersionId,
    snapshotId,
    snapshotRootDirAbs,
    importId,
    updatedAt: toText(input.updatedAt),
    importProvenanceSummary: summary,
    sourceEvidenceSummary: null,
  };
}

const REQUIRED_PERSISTED_EVIDENCE_FIELDS = [
  "siteVersionId",
  "importId_or_sourceImportId",
  "pageCount",
  "sectionCount",
  "assetCount",
  "detectedTitle",
  "detectedHomepagePath",
] as const;

function toPersistedEvidenceShapeDiagnostics(candidate: PersistedRuntimeEvidenceCandidate): {
  shapeStatus: "valid" | "invalid";
  missingFields: string[];
  availableFields: string[];
  sourceKind: string | null;
} {
  const available = new Set<string>();
  available.add("siteVersionId");
  if (candidate.importId) available.add("importId");
  const sourceImportId = toText((candidate.importProvenanceSummary as { sourceImportId?: unknown } | null)?.sourceImportId);
  if (sourceImportId) available.add("sourceImportId");
  const summary = candidate.sourceEvidenceSummary;
  if (typeof summary?.pageCount === "number") available.add("pageCount");
  if (typeof summary?.sectionCount === "number") available.add("sectionCount");
  if (typeof summary?.assetCount === "number") available.add("assetCount");
  if (toText(summary?.detectedTitle) != null) available.add("detectedTitle");
  if (toText(summary?.detectedHomepagePath) != null) available.add("detectedHomepagePath");

  const missing = REQUIRED_PERSISTED_EVIDENCE_FIELDS.filter((field) => {
    if (field === "importId_or_sourceImportId") return !(available.has("importId") || available.has("sourceImportId"));
    return !available.has(field);
  });
  const topLevelSafeFields = Object.keys(candidate.importProvenanceSummary ?? {}).sort();
  for (const field of available) topLevelSafeFields.push(field);
  return {
    shapeStatus: missing.length === 0 ? "valid" : "invalid",
    missingFields: missing,
    availableFields: [...new Set(topLevelSafeFields)].sort(),
    sourceKind: toText((candidate.importProvenanceSummary as { kind?: unknown } | null)?.kind),
  };
}

function toPositiveCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function countTreeNodes(value: unknown): number {
  const stack = [value];
  let count = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    count += 1;
    const children = toArray(record.children) ?? toArray(record.nodes) ?? toArray(record.pages) ?? [];
    for (const child of children) stack.push(child);
  }
  return count;
}

function pickFirstText(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = toText(value);
    if (normalized) return normalized;
  }
  return null;
}

function toRuntimeEvidenceSummaryFromPersistedCandidate(
  candidate: PersistedRuntimeEvidenceCandidate,
): AdaptedPersistedRuntimeEvidence | null {
  const direct = candidate.sourceEvidenceSummary;
  const summary = candidate.importProvenanceSummary as Record<string, unknown> | null;
  const executionIdentity = (summary?.executionIdentity ?? null) as Record<string, unknown> | null;
  const semanticImport = toRecord(summary?.semanticImport);
  const siteTree = toRecord(summary?.siteTree);
  const multipageImport = toRecord(summary?.multipageImport);
  const captureEvidence = toRecord(summary?.captureEvidence);
  const renderedCapture = toRecord(summary?.renderedCapture);
  const siteTreeSummary = toRecord(siteTree?.summary);
  const multipageImportSummary = toRecord(multipageImport?.summary);

  const sourceImportId = pickFirstText(candidate.importId, summary?.importId, executionIdentity?.importId, summary?.sourceImportId);
  const sourceSiteVersionId = pickFirstText(candidate.siteVersionId, summary?.siteVersionId, executionIdentity?.siteVersionId);
  const pageCount = [
    toPositiveCount(direct?.pageCount),
    toPositiveCount(siteTreeSummary?.pageCount),
    toPositiveCount(siteTree?.pageCount),
    toPositiveCount(multipageImportSummary?.pageCount),
    toPositiveCount(multipageImport?.pageCount),
    toPositiveCount(countTreeNodes(siteTree?.tree)),
    toPositiveCount(countTreeNodes(multipageImport?.tree)),
  ].find((value): value is number => value != null);
  const sectionCount = [
    toPositiveCount(direct?.sectionCount),
    toPositiveCount(toArray(semanticImport?.sections)?.length),
    toPositiveCount(semanticImport?.sectionCount),
    toPositiveCount(countTreeNodes(siteTree?.tree)),
  ].find((value): value is number => value != null);
  const assetCount = [
    toPositiveCount(direct?.assetCount),
    toPositiveCount(toArray(semanticImport?.assets)?.length),
    toPositiveCount(toArray(captureEvidence?.screenshotPaths)?.length),
    toPositiveCount(toArray(renderedCapture?.screenshots)?.length),
    toPositiveCount(captureEvidence?.assetCount),
    toPositiveCount(renderedCapture?.assetCount),
  ].find((value): value is number => value != null);
  const detectedTitle = pickFirstText(
    direct?.detectedTitle,
    semanticImport?.title,
    semanticImport?.detectedTitle,
    siteTree?.detectedTitle,
    renderedCapture?.detectedTitle,
    siteTree?.title,
    renderedCapture?.title,
    "GNR8 Imported Site",
  );
  const detectedHomepagePath = pickFirstText(
    direct?.detectedHomepagePath,
    siteTreeSummary?.detectedHomepagePath,
    siteTreeSummary?.homepagePath,
    multipageImportSummary?.detectedHomepagePath,
    multipageImportSummary?.homepagePath,
    siteTree?.detectedHomepagePath,
    multipageImport?.detectedHomepagePath,
    siteTree?.homepagePath,
    multipageImport?.homepagePath,
    "index.html",
  );

  if (
    !sourceImportId ||
    !sourceSiteVersionId ||
    pageCount == null ||
    sectionCount == null ||
    assetCount == null ||
    !detectedTitle ||
    !detectedHomepagePath
  ) {
    return null;
  }

  return {
    sourceSiteVersionId,
    sourceImportId,
    sourceEvidenceSummary: {
      pageCount,
      sectionCount,
      assetCount,
      detectedTitle,
      detectedHomepagePath,
      providerStateSummary: "persisted/runtime-import-evidence",
    },
  };
}

async function listPersistedRuntimeEvidenceCandidates(): Promise<PersistedRuntimeEvidenceScanResult> {
  let supabase: any = null;
  try {
    const mod = await import("@/src/supabase/service-role-server");
    supabase = mod.getSupabaseServiceRoleClient();
  } catch {
    supabase = null;
  }
  if (!supabase) return { availableCount: 0, invalidCount: 0, candidates: [] };
  try {
    const result = await supabase
      .from("gnr8_runtime_site_versions")
      .select("id,import_provenance_summary,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (result.error || !Array.isArray(result.data)) return { availableCount: 0, invalidCount: 0, candidates: [] };
    const rows = result.data as Array<{ id: unknown; import_provenance_summary: unknown; updated_at: unknown }>;
    const candidates = rows
      .map((row: { id: unknown; import_provenance_summary: unknown; updated_at: unknown }) =>
        toPersistedRuntimeEvidenceCandidate({
          siteVersionId: row.id,
          importProvenanceSummary: row.import_provenance_summary,
          updatedAt: row.updated_at,
        }),
      )
      .filter((entry: PersistedRuntimeEvidenceCandidate | null): entry is PersistedRuntimeEvidenceCandidate => entry != null);
    return { availableCount: rows.length, invalidCount: rows.length - candidates.length, candidates };
  } catch {
    return { availableCount: 0, invalidCount: 0, candidates: [] };
  }
}

function toProjectRelativePath(absPath: string): string | null {
  const cwd = process.cwd();
  const relative = path.relative(cwd, absPath);
  if (!relative || relative.startsWith("..")) return null;
  return relative;
}

async function resolveImportedSnapshotWithDiagnostics(input?: {
  snapshotsRootDirAbs?: string;
  betaRunsRootDirAbs?: string;
  bundledSnapshotFixture?: StableImportSnapshotFixture | null;
  persistedRuntimeEvidenceCandidates?: PersistedRuntimeEvidenceCandidate[] | null;
}): Promise<ImportedSnapshotResolution> {
  const snapshotsRootDirAbs = input?.snapshotsRootDirAbs ?? DEFAULT_IMPORT_SNAPSHOTS_ROOT;
  const betaRunsRootDirAbs = input?.betaRunsRootDirAbs ?? DEFAULT_BETA_RUNS_ROOT;
  const bundledSnapshotFixture =
    input && "bundledSnapshotFixture" in input ? input.bundledSnapshotFixture : STABLE_IMPORT_SNAPSHOT_FIXTURE;
  const diagnostics: string[] = ["WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED"];
  diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_CHECKED");
  const persistedScanResult =
    input && "persistedRuntimeEvidenceCandidates" in input
      ? {
          availableCount: (input.persistedRuntimeEvidenceCandidates ?? []).length,
          invalidCount: 0,
          candidates: input.persistedRuntimeEvidenceCandidates ?? [],
        }
      : await listPersistedRuntimeEvidenceCandidates();
  const persistedCandidates = persistedScanResult.candidates;
  const persistedEvidenceAvailable = persistedScanResult.availableCount > 0;
  let persistedEvidenceSelected = false;
  let persistedEvidenceReason: string | null = null;
  let persistedEvidenceSiteVersionId: string | null = null;
  let persistedEvidenceImportId: string | null = null;
  let persistedEvidenceShapeStatus: "unchecked" | "unavailable" | "valid" | "invalid" = "unchecked";
  let persistedEvidenceMissingFields: string[] = [];
  let persistedEvidenceAvailableFields: string[] = [];
  let persistedEvidenceSourceKind: string | null = null;
  let persistedEvidenceBranchDiagnostics = toEmptyPersistedEvidenceBranchDiagnostics();
  const persistedSorted = [...persistedCandidates].sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bTime - aTime;
  });
  if (!persistedEvidenceAvailable) {
    persistedEvidenceReason = "persisted_runtime_evidence_unavailable";
    persistedEvidenceShapeStatus = "unavailable";
    diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_UNAVAILABLE");
  } else if (persistedScanResult.invalidCount > 0 && persistedCandidates.length === 0) {
    persistedEvidenceReason = "persisted_runtime_evidence_invalid";
    persistedEvidenceShapeStatus = "invalid";
    persistedEvidenceMissingFields = [...REQUIRED_PERSISTED_EVIDENCE_FIELDS];
    diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID");
  }
  diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_CHECKED");
  let invalidDiagnosticLogged = false;
  let adapterFailedDiagnosticLogged = false;
  for (const candidate of persistedSorted) {
    diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_STARTED");
    const adapted = toRuntimeEvidenceSummaryFromPersistedCandidate(candidate);
    if (adapted) {
      candidate.siteVersionId = adapted.sourceSiteVersionId;
      candidate.importId = adapted.sourceImportId;
      candidate.sourceEvidenceSummary = adapted.sourceEvidenceSummary;
      diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED");
    } else {
      if (!adapterFailedDiagnosticLogged) {
        diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_FAILED");
        adapterFailedDiagnosticLogged = true;
      }
    }
    const shape = toPersistedEvidenceShapeDiagnostics(candidate);
    persistedEvidenceBranchDiagnostics = toPersistedEvidenceBranchDiagnostics(candidate);
    diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_BRANCH_DIAGNOSTICS_CREATED");
    persistedEvidenceShapeStatus = shape.shapeStatus;
    persistedEvidenceMissingFields = shape.missingFields;
    persistedEvidenceAvailableFields = shape.availableFields;
    persistedEvidenceSourceKind = shape.sourceKind;
    diagnostics.push(
      shape.shapeStatus === "valid"
        ? "WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID"
        : "WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_INVALID",
    );
    if (shape.shapeStatus !== "valid" || !adapted) {
      persistedEvidenceReason = "persisted_runtime_evidence_invalid";
      if (!invalidDiagnosticLogged) {
        diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID");
        invalidDiagnosticLogged = true;
      }
      persistedEvidenceSiteVersionId = candidate.siteVersionId;
      persistedEvidenceImportId = candidate.importId;
      continue;
    }
    persistedEvidenceSelected = true;
    persistedEvidenceReason = "persisted_runtime_evidence_selected";
    persistedEvidenceSiteVersionId = candidate.siteVersionId;
    persistedEvidenceImportId = candidate.importId;
    diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED");
    return {
      selectedSnapshot: {
        snapshotId: candidate.snapshotId,
        snapshotRootDirAbs: candidate.snapshotRootDirAbs,
        source: "persisted_runtime_import_evidence",
        bundledSnapshot: null,
      },
      selectedPersistedRuntimeEvidence: adapted,
      importSourceDiagnostics: {
        selectedSource: "persisted_runtime_import_evidence",
        stableArtifactPath: null,
        importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
        importedUrlSnapshotCount: 0,
        fallbackReason: "none",
        persistedEvidenceChecked: true,
        persistedEvidenceAvailable,
        persistedEvidenceSelected,
        persistedEvidenceReason,
        persistedEvidenceSiteVersionId,
        persistedEvidenceImportId,
        persistedEvidenceShapeStatus,
        persistedEvidenceMissingFields,
        persistedEvidenceAvailableFields,
        persistedEvidenceSourceKind,
        persistedEvidenceBranchDiagnostics,
      },
      diagnostics,
    };
  }
  if (persistedEvidenceAvailable && !persistedEvidenceSelected && persistedEvidenceReason == null) {
    persistedEvidenceReason = "persisted_runtime_evidence_invalid";
    if (!invalidDiagnosticLogged) {
      diagnostics.push("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID");
    }
  }

  let stableSnapshotId: string | null = null;
  try {
    const betaRunDirs = await fs.readdir(betaRunsRootDirAbs, { withFileTypes: true });
    for (const dirent of betaRunDirs) {
      if (!dirent.isDirectory()) continue;
      const summaryPath = path.join(betaRunsRootDirAbs, dirent.name, "beta-migration-summary.json");
      try {
        const parsed = JSON.parse(await fs.readFile(summaryPath, "utf8")) as {
          previewStatus?: string;
          simulationStatus?: string;
          snapshotKey?: string;
        };
        const snapshotKey = String(parsed.snapshotKey ?? "").trim();
        if (snapshotKey.startsWith("imported-url-site-") && parsed.previewStatus === "passed" && parsed.simulationStatus === "executed") {
          stableSnapshotId = snapshotKey;
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    stableSnapshotId = null;
  }

  const stableRoot = stableSnapshotId ? path.join(snapshotsRootDirAbs, stableSnapshotId) : null;
  diagnostics.push("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED");
  if (stableRoot) {
    try {
      await fs.access(path.join(stableRoot, "index.html"));
      return {
        selectedSnapshot: {
          snapshotId: stableSnapshotId as string,
          snapshotRootDirAbs: stableRoot,
          source: "stable_validation_artifact",
          bundledSnapshot: null,
        },
        selectedPersistedRuntimeEvidence: null,
        importSourceDiagnostics: {
          selectedSource: "stable_validation_artifact",
          stableArtifactPath: toProjectRelativePath(stableRoot),
          importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
          importedUrlSnapshotCount: 0,
          fallbackReason: null,
          persistedEvidenceChecked: true,
          persistedEvidenceAvailable,
          persistedEvidenceSelected,
          persistedEvidenceReason,
          persistedEvidenceSiteVersionId,
          persistedEvidenceImportId,
          persistedEvidenceShapeStatus,
          persistedEvidenceMissingFields,
          persistedEvidenceAvailableFields,
          persistedEvidenceSourceKind,
          persistedEvidenceBranchDiagnostics,
        },
        diagnostics,
      };
    } catch {
      diagnostics.push("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING");
    }
  } else {
    diagnostics.push("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING");
  }

  diagnostics.push("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED");
  try {
    const dirEntries = await fs.readdir(snapshotsRootDirAbs, { withFileTypes: true });
    const importedSnapshotDirs = dirEntries.filter((entry) => entry.isDirectory() && entry.name.startsWith("imported-url-site-"));
    diagnostics.push(`WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_${importedSnapshotDirs.length}`);

    const snapshots = await Promise.all(
      importedSnapshotDirs.map(async (entry) => {
        const snapshotRootDirAbs = path.join(snapshotsRootDirAbs, entry.name);
        const stat = await fs.stat(snapshotRootDirAbs);
        return { snapshotId: entry.name, snapshotRootDirAbs, mtimeMs: stat.mtimeMs };
      }),
    );
    const sortedByNewest = snapshots.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const snapshot of sortedByNewest) {
      try {
        await fs.access(path.join(snapshot.snapshotRootDirAbs, "index.html"));
        return {
        selectedSnapshot: {
          snapshotId: snapshot.snapshotId,
          snapshotRootDirAbs: snapshot.snapshotRootDirAbs,
          source: "latest_imported_snapshot",
          bundledSnapshot: null,
        },
          selectedPersistedRuntimeEvidence: null,
          importSourceDiagnostics: {
            selectedSource: "latest_imported_snapshot",
            stableArtifactPath: stableRoot ? toProjectRelativePath(stableRoot) : null,
            importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
            importedUrlSnapshotCount: importedSnapshotDirs.length,
            fallbackReason: null,
            persistedEvidenceChecked: true,
            persistedEvidenceAvailable,
            persistedEvidenceSelected,
            persistedEvidenceReason,
            persistedEvidenceSiteVersionId,
            persistedEvidenceImportId,
            persistedEvidenceShapeStatus,
            persistedEvidenceMissingFields,
            persistedEvidenceAvailableFields,
            persistedEvidenceSourceKind,
            persistedEvidenceBranchDiagnostics,
          },
          diagnostics,
        };
      } catch {
        continue;
      }
    }

    diagnostics.push("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED");
    if (bundledSnapshotFixture) {
      diagnostics.push("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED");
      return {
        selectedSnapshot: {
          snapshotId: bundledSnapshotFixture.fixtureId,
          snapshotRootDirAbs: null,
          source: "bundled_stable_import_snapshot",
          bundledSnapshot: bundledSnapshotFixture,
        },
        selectedPersistedRuntimeEvidence: null,
        importSourceDiagnostics: {
          selectedSource: "bundled_stable_import_snapshot",
          stableArtifactPath: stableRoot ? toProjectRelativePath(stableRoot) : null,
          importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
          importedUrlSnapshotCount: importedSnapshotDirs.length,
          fallbackReason: "none",
          persistedEvidenceChecked: true,
          persistedEvidenceAvailable,
          persistedEvidenceSelected,
          persistedEvidenceReason,
          persistedEvidenceSiteVersionId,
          persistedEvidenceImportId,
          persistedEvidenceShapeStatus,
          persistedEvidenceMissingFields,
          persistedEvidenceAvailableFields,
          persistedEvidenceSourceKind,
          persistedEvidenceBranchDiagnostics,
        },
        diagnostics,
      };
    }

    diagnostics.push("WORKSPACE_OVERVIEW_SELECTED_SOURCE_NONE");
    diagnostics.push("WORKSPACE_OVERVIEW_FALLBACK_MODEL_CREATED");
    return {
      selectedSnapshot: null,
      selectedPersistedRuntimeEvidence: null,
      importSourceDiagnostics: {
        selectedSource: "none",
        stableArtifactPath: stableRoot ? toProjectRelativePath(stableRoot) : null,
        importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
        importedUrlSnapshotCount: importedSnapshotDirs.length,
        fallbackReason: "no_imported_snapshot_with_index_html",
        persistedEvidenceChecked: true,
        persistedEvidenceAvailable,
        persistedEvidenceSelected,
        persistedEvidenceReason,
        persistedEvidenceSiteVersionId,
        persistedEvidenceImportId,
        persistedEvidenceShapeStatus,
        persistedEvidenceMissingFields,
        persistedEvidenceAvailableFields,
        persistedEvidenceSourceKind,
        persistedEvidenceBranchDiagnostics,
      },
      diagnostics,
    };
  } catch {
    diagnostics.push("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0");
    diagnostics.push("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED");
    if (bundledSnapshotFixture) {
      diagnostics.push("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED");
      return {
        selectedSnapshot: {
          snapshotId: bundledSnapshotFixture.fixtureId,
          snapshotRootDirAbs: null,
          source: "bundled_stable_import_snapshot",
          bundledSnapshot: bundledSnapshotFixture,
        },
        selectedPersistedRuntimeEvidence: null,
        importSourceDiagnostics: {
          selectedSource: "bundled_stable_import_snapshot",
          stableArtifactPath: stableRoot ? toProjectRelativePath(stableRoot) : null,
          importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
          importedUrlSnapshotCount: 0,
          fallbackReason: "none",
          persistedEvidenceChecked: true,
          persistedEvidenceAvailable,
          persistedEvidenceSelected,
          persistedEvidenceReason,
          persistedEvidenceSiteVersionId,
          persistedEvidenceImportId,
          persistedEvidenceShapeStatus,
          persistedEvidenceMissingFields,
          persistedEvidenceAvailableFields,
          persistedEvidenceSourceKind,
          persistedEvidenceBranchDiagnostics,
        },
        diagnostics,
      };
    }
    diagnostics.push("WORKSPACE_OVERVIEW_SELECTED_SOURCE_NONE");
    diagnostics.push("WORKSPACE_OVERVIEW_FALLBACK_MODEL_CREATED");
    return {
      selectedSnapshot: null,
      selectedPersistedRuntimeEvidence: null,
      importSourceDiagnostics: {
        selectedSource: "none",
        stableArtifactPath: stableRoot ? toProjectRelativePath(stableRoot) : null,
        importedUrlSnapshotDirectory: toProjectRelativePath(snapshotsRootDirAbs),
        importedUrlSnapshotCount: 0,
        fallbackReason: "snapshot_directory_unavailable",
        persistedEvidenceChecked: true,
        persistedEvidenceAvailable,
        persistedEvidenceSelected,
        persistedEvidenceReason,
        persistedEvidenceSiteVersionId,
        persistedEvidenceImportId,
        persistedEvidenceShapeStatus,
        persistedEvidenceMissingFields,
        persistedEvidenceAvailableFields,
        persistedEvidenceSourceKind,
        persistedEvidenceBranchDiagnostics,
      },
      diagnostics,
    };
  }
}

export async function resolveImportedSnapshot(input?: {
  snapshotsRootDirAbs?: string;
  betaRunsRootDirAbs?: string;
  bundledSnapshotFixture?: StableImportSnapshotFixture | null;
  persistedRuntimeEvidenceCandidates?: PersistedRuntimeEvidenceCandidate[] | null;
}): Promise<ImportedSnapshotSelection | null> {
  const resolution = await resolveImportedSnapshotWithDiagnostics(input);
  return resolution.selectedSnapshot;
}

export async function buildWorkspaceOverviewModel(input?: {
  snapshotsRootDirAbs?: string;
  betaRunsRootDirAbs?: string;
  bundledSnapshotFixture?: StableImportSnapshotFixture | null;
  persistedRuntimeEvidenceCandidates?: PersistedRuntimeEvidenceCandidate[] | null;
}) {
  const resolution = await resolveImportedSnapshotWithDiagnostics(input);
  const selectedSnapshot = resolution.selectedSnapshot;

  if (!selectedSnapshot) {
    const nowIso = new Date().toISOString();
    return {
      sourceId: null,
      sourcePath: null,
      sourceKind: "missing_imported_snapshot" as const,
      importSourceDiagnostics: resolution.importSourceDiagnostics,
      observations: [],
      insights: [],
      recommendations: [],
      optimizationOpportunities: [],
      optimizationScores: [],
      proposalCandidates: [],
      approvalPreviews: [],
      proposalApprovalRecords: [],
      approvalStates: [],
      approvalQueueItems: [],
      executionPlanPreviews: [],
      executionArtifactPreviews: [],
      executionReadinessRecords: [],
      executionPackagePreviews: [],
      executionPackageReadinessRecords: [],
      executionContractPreviews: [],
      executionContractReadinessRecords: [],
      executionBundlePreviews: [],
      executionBundleReadinessRecords: [],
      executionAuthorizationPreviews: [],
      executionAuthorizationReadinessRecords: [],
      executionAuthorizationPackageRecords: [],
      overview: {
        twinId: "twin_missing_import",
        siteId: "site_missing_import",
        siteVersionId: "site_version_missing_import",
        workspaceId: "workspace_website_os_runtime_overview",
        environmentScope: "preview",
        status: "failed" as const,
        contentSummary: "No imported site available.",
        designSummary: "No imported site available.",
        experienceSummary: "No imported site available.",
        governanceSummary: "No imported site available.",
        operationalSummary: "No imported site available.",
        lastUpdated: nowIso,
        diagnostics: [],
      },
      diagnostics: [...resolution.diagnostics, "WORKSPACE_OVERVIEW_NO_IMPORTED_SITE_AVAILABLE"],
    };
  }

  if (selectedSnapshot.source === "bundled_stable_import_snapshot") {
    const bundledSnapshot = selectedSnapshot.bundledSnapshot;
    if (!bundledSnapshot) {
      throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: bundled source selected without bundled snapshot");
    }
    const requestId = `workspace-overview-${bundledSnapshot.fixtureId}`;
    const twin = buildWebsiteDigitalTwin({
      siteId: `site_${bundledSnapshot.fixtureId}`,
      siteVersionId: bundledSnapshot.sourceSiteVersionId,
      workspaceId: "workspace_website_os_runtime_overview",
      environmentScope: "preview",
      sourceImportId: bundledSnapshot.sourceImportId,
      sourceModels: ["import_manifest", "raw_dom_snapshot", "asset_registry", "import_diagnostics"],
      sourceEvidenceSummary: {
        pageCount: bundledSnapshot.pageCount,
        sectionCount: bundledSnapshot.sectionCount,
        assetCount: bundledSnapshot.assetCount,
        detectedTitle: bundledSnapshot.detectedTitle,
        detectedHomepagePath: bundledSnapshot.detectedHomepagePath,
        providerStateSummary: bundledSnapshot.providerStateSummary,
      },
      generatedBy: "workspace_overview_runtime_v0",
      nowIso: new Date().toISOString(),
    });
    const store = new InMemoryTwinStore();
    store.saveTwin(twin);
    const storedTwin = store.getTwinBySiteVersion(bundledSnapshot.sourceSiteVersionId);
    if (!storedTwin) {
      throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: stored bundled twin missing for site version");
    }
    const overview = createTwinOverview(storedTwin);
    const observationsDiagnostics: string[] = [TWIN_OBSERVATION_DIAGNOSTICS.STARTED];
    const observations = generateTwinObservations(storedTwin);
    observationsDiagnostics.push(TWIN_OBSERVATION_DIAGNOSTICS.COMPLETED);
    const insightsDiagnostics: string[] = [TWIN_INSIGHT_DIAGNOSTICS.STARTED];
    const insights = generateTwinInsights(observations);
    insightsDiagnostics.push(TWIN_INSIGHT_DIAGNOSTICS.COMPLETED);
    const recommendationDiagnostics: string[] = [TWIN_RECOMMENDATION_DIAGNOSTICS.STARTED];
    const recommendations = generateTwinRecommendations(insights);
    recommendationDiagnostics.push(TWIN_RECOMMENDATION_DIAGNOSTICS.COMPLETED);
    const optimizationDiagnostics: string[] = [TWIN_OPTIMIZATION_DIAGNOSTICS.STARTED];
    const optimizationOpportunities = generateTwinOptimizationOpportunities(recommendations);
    optimizationDiagnostics.push(TWIN_OPTIMIZATION_DIAGNOSTICS.COMPLETED);
    const optimizationScoringDiagnostics: string[] = [TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.STARTED];
    const optimizationScores = scoreOptimizationOpportunities(optimizationOpportunities);
    optimizationScoringDiagnostics.push(TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.COMPLETED);
    const proposalCandidatesDiagnostics: string[] = [TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.STARTED];
    const proposalCandidates = generateTwinProposalCandidates({
      opportunities: optimizationOpportunities,
      scores: optimizationScores,
    });
    proposalCandidatesDiagnostics.push(TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.COMPLETED);
    const approvalPreviewDiagnostics: string[] = [TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.STARTED];
    const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
    approvalPreviewDiagnostics.push(TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.COMPLETED);
    const proposalApprovalDiagnostics: string[] = [TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.STARTED];
    const proposalApprovalRecords = generateTwinProposalApprovalRecords({
      proposalCandidates,
      approvalPreviews,
    });
    proposalApprovalDiagnostics.push(TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.COMPLETED);
    const approvalStateDiagnostics: string[] = [TWIN_APPROVAL_STATE_DIAGNOSTICS.STARTED];
    const approvalStates = generateTwinApprovalStateRecords(proposalApprovalRecords);
    approvalStateDiagnostics.push(TWIN_APPROVAL_STATE_DIAGNOSTICS.COMPLETED);
    const approvalQueuePreviewDiagnostics: string[] = [TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.STARTED];
    const approvalQueueItems = generateTwinApprovalQueueItems(approvalStates, proposalCandidates);
    approvalQueuePreviewDiagnostics.push(TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionPlanPreviewDiagnostics: string[] = [TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.STARTED];
    const executionPlanPreviews = generateTwinExecutionPlanPreviews(approvalPreviews);
    executionPlanPreviewDiagnostics.push(TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionArtifactPreviewDiagnostics: string[] = [TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.STARTED];
    const executionArtifactPreviews = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
    executionArtifactPreviewDiagnostics.push(TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionReadinessDiagnostics: string[] = [TWIN_EXECUTION_READINESS_DIAGNOSTICS.STARTED];
    const executionReadinessRecords = generateTwinExecutionReadinessRecords({
      approvalQueueItems,
      executionPlanPreviews,
      executionArtifactPreviews,
    });
    executionReadinessDiagnostics.push(TWIN_EXECUTION_READINESS_DIAGNOSTICS.COMPLETED);
    const executionPackagePreviewDiagnostics: string[] = [TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.STARTED];
    const executionPackagePreviews = generateTwinExecutionPackagePreviews({
      readinessRecords: executionReadinessRecords,
      executionPlanPreviews,
      executionArtifactPreviews,
    });
    executionPackagePreviewDiagnostics.push(TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionPackageReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionPackageReadinessRecords =
      generateTwinExecutionPackageReadinessRecords(executionPackagePreviews);
    executionPackageReadinessDiagnostics.push(TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.COMPLETED);
    const executionContractPreviewDiagnostics: string[] = [
      TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionContractPreviews =
      generateTwinExecutionContractPreviews(executionPackageReadinessRecords);
    executionContractPreviewDiagnostics.push(TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionContractReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionContractReadinessRecords =
      generateTwinExecutionContractReadinessRecords(executionContractPreviews);
    executionContractReadinessDiagnostics.push(TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.COMPLETED);
    const executionBundlePreviewDiagnostics: string[] = [
      TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionBundlePreviews =
      generateTwinExecutionBundlePreviews(executionContractReadinessRecords);
    executionBundlePreviewDiagnostics.push(TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionBundleReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionBundleReadinessRecords =
      generateTwinExecutionBundleReadinessRecords(executionBundlePreviews);
    executionBundleReadinessDiagnostics.push(TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.COMPLETED);
    const executionAuthorizationPreviewDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationPreviews =
      generateTwinExecutionAuthorizationPreviewRecords(executionBundleReadinessRecords);
    executionAuthorizationPreviewDiagnostics.push(TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionAuthorizationReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationReadinessRecords =
      generateTwinExecutionAuthorizationReadinessRecords(executionAuthorizationPreviews);
    executionAuthorizationReadinessDiagnostics.push(
      TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.COMPLETED,
    );
    const executionAuthorizationPackageDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationPackageRecords =
      generateTwinExecutionAuthorizationPackageRecords(
        executionAuthorizationPreviews,
        executionAuthorizationReadinessRecords,
      );
    executionAuthorizationPackageDiagnostics.push(
      TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.COMPLETED,
    );
    const diagnostics = [
      ...resolution.diagnostics,
      ...storedTwin.diagnostics,
      ...storedTwin.metadata.diagnostics,
      ...store.diagnostics,
      ...overview.diagnostics,
      ...observationsDiagnostics,
      ...insightsDiagnostics,
      ...recommendationDiagnostics,
      ...optimizationDiagnostics,
      ...optimizationScoringDiagnostics,
      ...proposalCandidatesDiagnostics,
      ...approvalPreviewDiagnostics,
      ...proposalApprovalDiagnostics,
      ...approvalStateDiagnostics,
      ...approvalQueuePreviewDiagnostics,
      ...executionAuthorizationPreviewDiagnostics,
      ...executionAuthorizationReadinessDiagnostics,
      ...executionAuthorizationPackageDiagnostics,
      ...executionPlanPreviewDiagnostics,
      ...executionArtifactPreviewDiagnostics,
      ...executionReadinessDiagnostics,
      ...executionPackagePreviewDiagnostics,
      ...executionPackageReadinessDiagnostics,
      ...executionContractPreviewDiagnostics,
      ...executionContractReadinessDiagnostics,
      ...executionBundlePreviewDiagnostics,
      ...executionBundleReadinessDiagnostics,
    ];
    return {
      sourceId: bundledSnapshot.fixtureId,
      sourcePath: null,
      sourceKind: selectedSnapshot.source,
      importSourceDiagnostics: resolution.importSourceDiagnostics,
      observations,
      insights,
      recommendations,
      optimizationOpportunities,
      optimizationScores,
      proposalCandidates,
      approvalPreviews,
      proposalApprovalRecords,
      approvalStates,
      approvalQueueItems,
      executionPlanPreviews,
      executionArtifactPreviews,
      executionReadinessRecords,
      executionPackagePreviews,
      executionPackageReadinessRecords,
      executionContractPreviews,
      executionContractReadinessRecords,
      executionBundlePreviews,
      executionBundleReadinessRecords,
      executionAuthorizationPreviews,
      executionAuthorizationReadinessRecords,
      executionAuthorizationPackageRecords,
      overview,
      diagnostics,
    };
  }

  const requestId = `workspace-overview-${selectedSnapshot.snapshotId}`;
  if (selectedSnapshot.source === "persisted_runtime_import_evidence" && resolution.selectedPersistedRuntimeEvidence) {
    const persisted = resolution.selectedPersistedRuntimeEvidence;
    const twin = buildWebsiteDigitalTwin({
      siteId: `site_${selectedSnapshot.snapshotId}`,
      siteVersionId: persisted.sourceSiteVersionId,
      workspaceId: "workspace_website_os_runtime_overview",
      environmentScope: "preview",
      sourceImportId: persisted.sourceImportId,
      sourceModels: ["import_manifest", "raw_dom_snapshot", "asset_registry", "import_diagnostics"],
      sourceEvidenceSummary: persisted.sourceEvidenceSummary,
      generatedBy: "workspace_overview_runtime_v0",
      nowIso: new Date().toISOString(),
    });
    const store = new InMemoryTwinStore();
    store.saveTwin(twin);
    const storedTwin = store.getTwinBySiteVersion(persisted.sourceSiteVersionId);
    if (!storedTwin) {
      throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: stored persisted twin missing for site version");
    }
    const overview = createTwinOverview(storedTwin);
    const observationsDiagnostics: string[] = [TWIN_OBSERVATION_DIAGNOSTICS.STARTED];
    const observations = generateTwinObservations(storedTwin);
    observationsDiagnostics.push(TWIN_OBSERVATION_DIAGNOSTICS.COMPLETED);
    const insightsDiagnostics: string[] = [TWIN_INSIGHT_DIAGNOSTICS.STARTED];
    const insights = generateTwinInsights(observations);
    insightsDiagnostics.push(TWIN_INSIGHT_DIAGNOSTICS.COMPLETED);
    const recommendationDiagnostics: string[] = [TWIN_RECOMMENDATION_DIAGNOSTICS.STARTED];
    const recommendations = generateTwinRecommendations(insights);
    recommendationDiagnostics.push(TWIN_RECOMMENDATION_DIAGNOSTICS.COMPLETED);
    const optimizationDiagnostics: string[] = [TWIN_OPTIMIZATION_DIAGNOSTICS.STARTED];
    const optimizationOpportunities = generateTwinOptimizationOpportunities(recommendations);
    optimizationDiagnostics.push(TWIN_OPTIMIZATION_DIAGNOSTICS.COMPLETED);
    const optimizationScoringDiagnostics: string[] = [TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.STARTED];
    const optimizationScores = scoreOptimizationOpportunities(optimizationOpportunities);
    optimizationScoringDiagnostics.push(TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.COMPLETED);
    const proposalCandidatesDiagnostics: string[] = [TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.STARTED];
    const proposalCandidates = generateTwinProposalCandidates({
      opportunities: optimizationOpportunities,
      scores: optimizationScores,
    });
    proposalCandidatesDiagnostics.push(TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.COMPLETED);
    const approvalPreviewDiagnostics: string[] = [TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.STARTED];
    const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
    approvalPreviewDiagnostics.push(TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.COMPLETED);
    const proposalApprovalDiagnostics: string[] = [TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.STARTED];
    const proposalApprovalRecords = generateTwinProposalApprovalRecords({
      proposalCandidates,
      approvalPreviews,
    });
    proposalApprovalDiagnostics.push(TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.COMPLETED);
    const approvalStateDiagnostics: string[] = [TWIN_APPROVAL_STATE_DIAGNOSTICS.STARTED];
    const approvalStates = generateTwinApprovalStateRecords(proposalApprovalRecords);
    approvalStateDiagnostics.push(TWIN_APPROVAL_STATE_DIAGNOSTICS.COMPLETED);
    const approvalQueuePreviewDiagnostics: string[] = [TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.STARTED];
    const approvalQueueItems = generateTwinApprovalQueueItems(approvalStates, proposalCandidates);
    approvalQueuePreviewDiagnostics.push(TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionPlanPreviewDiagnostics: string[] = [TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.STARTED];
    const executionPlanPreviews = generateTwinExecutionPlanPreviews(approvalPreviews);
    executionPlanPreviewDiagnostics.push(TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionArtifactPreviewDiagnostics: string[] = [TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.STARTED];
    const executionArtifactPreviews = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
    executionArtifactPreviewDiagnostics.push(TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionReadinessDiagnostics: string[] = [TWIN_EXECUTION_READINESS_DIAGNOSTICS.STARTED];
    const executionReadinessRecords = generateTwinExecutionReadinessRecords({
      approvalQueueItems,
      executionPlanPreviews,
      executionArtifactPreviews,
    });
    executionReadinessDiagnostics.push(TWIN_EXECUTION_READINESS_DIAGNOSTICS.COMPLETED);
    const executionPackagePreviewDiagnostics: string[] = [TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.STARTED];
    const executionPackagePreviews = generateTwinExecutionPackagePreviews({
      readinessRecords: executionReadinessRecords,
      executionPlanPreviews,
      executionArtifactPreviews,
    });
    executionPackagePreviewDiagnostics.push(TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionPackageReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionPackageReadinessRecords =
      generateTwinExecutionPackageReadinessRecords(executionPackagePreviews);
    executionPackageReadinessDiagnostics.push(TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.COMPLETED);
    const executionContractPreviewDiagnostics: string[] = [
      TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionContractPreviews =
      generateTwinExecutionContractPreviews(executionPackageReadinessRecords);
    executionContractPreviewDiagnostics.push(TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionContractReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionContractReadinessRecords =
      generateTwinExecutionContractReadinessRecords(executionContractPreviews);
    executionContractReadinessDiagnostics.push(TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.COMPLETED);
    const executionBundlePreviewDiagnostics: string[] = [
      TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionBundlePreviews =
      generateTwinExecutionBundlePreviews(executionContractReadinessRecords);
    executionBundlePreviewDiagnostics.push(TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionBundleReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionBundleReadinessRecords =
      generateTwinExecutionBundleReadinessRecords(executionBundlePreviews);
    executionBundleReadinessDiagnostics.push(TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.COMPLETED);
    const executionAuthorizationPreviewDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationPreviews =
      generateTwinExecutionAuthorizationPreviewRecords(executionBundleReadinessRecords);
    executionAuthorizationPreviewDiagnostics.push(TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.COMPLETED);
    const executionAuthorizationReadinessDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationReadinessRecords =
      generateTwinExecutionAuthorizationReadinessRecords(executionAuthorizationPreviews);
    executionAuthorizationReadinessDiagnostics.push(
      TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.COMPLETED,
    );
    const executionAuthorizationPackageDiagnostics: string[] = [
      TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.STARTED,
    ];
    const executionAuthorizationPackageRecords =
      generateTwinExecutionAuthorizationPackageRecords(
        executionAuthorizationPreviews,
        executionAuthorizationReadinessRecords,
      );
    executionAuthorizationPackageDiagnostics.push(
      TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.COMPLETED,
    );
    const diagnostics = [
      ...resolution.diagnostics,
      ...storedTwin.diagnostics,
      ...storedTwin.metadata.diagnostics,
      ...store.diagnostics,
      ...overview.diagnostics,
      ...observationsDiagnostics,
      ...insightsDiagnostics,
      ...recommendationDiagnostics,
      ...optimizationDiagnostics,
      ...optimizationScoringDiagnostics,
      ...proposalCandidatesDiagnostics,
      ...approvalPreviewDiagnostics,
      ...proposalApprovalDiagnostics,
      ...approvalStateDiagnostics,
      ...approvalQueuePreviewDiagnostics,
      ...executionAuthorizationPreviewDiagnostics,
      ...executionAuthorizationReadinessDiagnostics,
      ...executionAuthorizationPackageDiagnostics,
      ...executionPlanPreviewDiagnostics,
      ...executionArtifactPreviewDiagnostics,
      ...executionReadinessDiagnostics,
      ...executionPackagePreviewDiagnostics,
      ...executionPackageReadinessDiagnostics,
      ...executionContractPreviewDiagnostics,
      ...executionContractReadinessDiagnostics,
      ...executionBundlePreviewDiagnostics,
      ...executionBundleReadinessDiagnostics,
    ];
    return {
      sourceId: selectedSnapshot.snapshotId,
      sourcePath: selectedSnapshot.snapshotRootDirAbs,
      sourceKind: selectedSnapshot.source,
      importSourceDiagnostics: resolution.importSourceDiagnostics,
      observations,
      insights,
      recommendations,
      optimizationOpportunities,
      optimizationScores,
      proposalCandidates,
      approvalPreviews,
      proposalApprovalRecords,
      approvalStates,
      approvalQueueItems,
      executionPlanPreviews,
      executionArtifactPreviews,
      executionReadinessRecords,
      executionPackagePreviews,
      executionPackageReadinessRecords,
      executionContractPreviews,
      executionContractReadinessRecords,
      executionBundlePreviews,
      executionBundleReadinessRecords,
      executionAuthorizationPreviews,
      executionAuthorizationReadinessRecords,
      executionAuthorizationPackageRecords,
      overview,
      diagnostics,
    };
  }

  if (!selectedSnapshot.snapshotRootDirAbs) {
    throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: filesystem source selected without snapshot root");
  }

  const importOutput = await importStaticSite({
    rootDir: selectedSnapshot.snapshotRootDirAbs,
    requestId,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "index.html",
      assetsDirPath: "assets",
    },
  });

  const importManifest = createImportManifest(importOutput);
  const twinIdentity = toTwinIdentityFromImport({
    sourceId: selectedSnapshot.snapshotId,
    inputSpecSha256: importManifest.fingerprints.inputSpecSha256,
    inputContentSha256: importManifest.fingerprints.inputContentSha256,
    requestId,
  });

  const twin = buildWebsiteDigitalTwin({
    siteId: twinIdentity.siteId,
    siteVersionId: twinIdentity.siteVersionId,
    workspaceId: twinIdentity.workspaceId,
    environmentScope: "preview",
    sourceImportId: twinIdentity.sourceImportId,
    sourceModels: ["import_manifest", "raw_dom_snapshot", "asset_registry", "import_diagnostics"],
    sourceEvidenceSummary: toSourceEvidenceSummary({
      importManifest,
      importOutput,
    }),
    generatedBy: "workspace_overview_runtime_v0",
  });

  const store = new InMemoryTwinStore();
  store.saveTwin(twin);

  const storedTwin = store.getTwinBySiteVersion(twinIdentity.siteVersionId);
  if (!storedTwin) {
    throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: stored twin missing for site version");
  }

  const overview = createTwinOverview(storedTwin);
  const observationsDiagnostics: string[] = [TWIN_OBSERVATION_DIAGNOSTICS.STARTED];
  const observations = generateTwinObservations(storedTwin);
  observationsDiagnostics.push(TWIN_OBSERVATION_DIAGNOSTICS.COMPLETED);
  const insightsDiagnostics: string[] = [TWIN_INSIGHT_DIAGNOSTICS.STARTED];
  const insights = generateTwinInsights(observations);
  insightsDiagnostics.push(TWIN_INSIGHT_DIAGNOSTICS.COMPLETED);
  const recommendationDiagnostics: string[] = [TWIN_RECOMMENDATION_DIAGNOSTICS.STARTED];
  const recommendations = generateTwinRecommendations(insights);
  recommendationDiagnostics.push(TWIN_RECOMMENDATION_DIAGNOSTICS.COMPLETED);
  const optimizationDiagnostics: string[] = [TWIN_OPTIMIZATION_DIAGNOSTICS.STARTED];
  const optimizationOpportunities = generateTwinOptimizationOpportunities(recommendations);
  optimizationDiagnostics.push(TWIN_OPTIMIZATION_DIAGNOSTICS.COMPLETED);
  const optimizationScoringDiagnostics: string[] = [TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.STARTED];
  const optimizationScores = scoreOptimizationOpportunities(optimizationOpportunities);
  optimizationScoringDiagnostics.push(TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.COMPLETED);
  const proposalCandidatesDiagnostics: string[] = [TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.STARTED];
  const proposalCandidates = generateTwinProposalCandidates({
    opportunities: optimizationOpportunities,
    scores: optimizationScores,
  });
  proposalCandidatesDiagnostics.push(TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.COMPLETED);
  const approvalPreviewDiagnostics: string[] = [TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.STARTED];
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  approvalPreviewDiagnostics.push(TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.COMPLETED);
  const proposalApprovalDiagnostics: string[] = [TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.STARTED];
  const proposalApprovalRecords = generateTwinProposalApprovalRecords({
    proposalCandidates,
    approvalPreviews,
  });
  proposalApprovalDiagnostics.push(TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.COMPLETED);
  const approvalStateDiagnostics: string[] = [TWIN_APPROVAL_STATE_DIAGNOSTICS.STARTED];
  const approvalStates = generateTwinApprovalStateRecords(proposalApprovalRecords);
  approvalStateDiagnostics.push(TWIN_APPROVAL_STATE_DIAGNOSTICS.COMPLETED);
  const approvalQueuePreviewDiagnostics: string[] = [TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.STARTED];
  const approvalQueueItems = generateTwinApprovalQueueItems(approvalStates, proposalCandidates);
  approvalQueuePreviewDiagnostics.push(TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionPlanPreviewDiagnostics: string[] = [TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.STARTED];
  const executionPlanPreviews = generateTwinExecutionPlanPreviews(approvalPreviews);
  executionPlanPreviewDiagnostics.push(TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionArtifactPreviewDiagnostics: string[] = [TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.STARTED];
  const executionArtifactPreviews = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
  executionArtifactPreviewDiagnostics.push(TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionReadinessDiagnostics: string[] = [TWIN_EXECUTION_READINESS_DIAGNOSTICS.STARTED];
  const executionReadinessRecords = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  executionReadinessDiagnostics.push(TWIN_EXECUTION_READINESS_DIAGNOSTICS.COMPLETED);
  const executionPackagePreviewDiagnostics: string[] = [TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.STARTED];
  const executionPackagePreviews = generateTwinExecutionPackagePreviews({
    readinessRecords: executionReadinessRecords,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  executionPackagePreviewDiagnostics.push(TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionPackageReadinessDiagnostics: string[] = [
    TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.STARTED,
  ];
  const executionPackageReadinessRecords =
    generateTwinExecutionPackageReadinessRecords(executionPackagePreviews);
  executionPackageReadinessDiagnostics.push(TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.COMPLETED);
  const executionContractPreviewDiagnostics: string[] = [
    TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.STARTED,
  ];
  const executionContractPreviews =
    generateTwinExecutionContractPreviews(executionPackageReadinessRecords);
  executionContractPreviewDiagnostics.push(TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionContractReadinessDiagnostics: string[] = [
    TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.STARTED,
  ];
  const executionContractReadinessRecords =
    generateTwinExecutionContractReadinessRecords(executionContractPreviews);
  executionContractReadinessDiagnostics.push(TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.COMPLETED);
  const executionBundlePreviewDiagnostics: string[] = [
    TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.STARTED,
  ];
  const executionBundlePreviews =
    generateTwinExecutionBundlePreviews(executionContractReadinessRecords);
  executionBundlePreviewDiagnostics.push(TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionBundleReadinessDiagnostics: string[] = [
    TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.STARTED,
  ];
  const executionBundleReadinessRecords =
    generateTwinExecutionBundleReadinessRecords(executionBundlePreviews);
  executionBundleReadinessDiagnostics.push(TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.COMPLETED);
  const executionAuthorizationPreviewDiagnostics: string[] = [
    TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.STARTED,
  ];
  const executionAuthorizationPreviews =
    generateTwinExecutionAuthorizationPreviewRecords(executionBundleReadinessRecords);
  executionAuthorizationPreviewDiagnostics.push(TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.COMPLETED);
  const executionAuthorizationReadinessDiagnostics: string[] = [
    TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.STARTED,
  ];
  const executionAuthorizationReadinessRecords =
    generateTwinExecutionAuthorizationReadinessRecords(executionAuthorizationPreviews);
  executionAuthorizationReadinessDiagnostics.push(
    TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.COMPLETED,
  );
  const executionAuthorizationPackageDiagnostics: string[] = [
    TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.STARTED,
  ];
  const executionAuthorizationPackageRecords =
    generateTwinExecutionAuthorizationPackageRecords(
      executionAuthorizationPreviews,
      executionAuthorizationReadinessRecords,
    );
  executionAuthorizationPackageDiagnostics.push(
    TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.COMPLETED,
  );
  const diagnostics = [
    ...resolution.diagnostics,
    ...storedTwin.diagnostics,
    ...storedTwin.metadata.diagnostics,
    ...store.diagnostics,
    ...overview.diagnostics,
    ...observationsDiagnostics,
    ...insightsDiagnostics,
    ...recommendationDiagnostics,
    ...optimizationDiagnostics,
    ...optimizationScoringDiagnostics,
    ...proposalCandidatesDiagnostics,
    ...approvalPreviewDiagnostics,
    ...proposalApprovalDiagnostics,
    ...approvalStateDiagnostics,
    ...approvalQueuePreviewDiagnostics,
    ...executionAuthorizationPreviewDiagnostics,
    ...executionAuthorizationReadinessDiagnostics,
    ...executionAuthorizationPackageDiagnostics,
    ...executionPlanPreviewDiagnostics,
    ...executionArtifactPreviewDiagnostics,
    ...executionReadinessDiagnostics,
    ...executionPackagePreviewDiagnostics,
    ...executionPackageReadinessDiagnostics,
    ...executionContractPreviewDiagnostics,
    ...executionContractReadinessDiagnostics,
    ...executionBundlePreviewDiagnostics,
    ...executionBundleReadinessDiagnostics,
  ];

  return {
    sourceId: selectedSnapshot.snapshotId,
    sourcePath: selectedSnapshot.snapshotRootDirAbs,
    sourceKind: selectedSnapshot.source,
    importSourceDiagnostics: resolution.importSourceDiagnostics,
    observations,
    insights,
    recommendations,
    optimizationOpportunities,
    optimizationScores,
    proposalCandidates,
    approvalPreviews,
    proposalApprovalRecords,
    approvalStates,
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
    executionReadinessRecords,
    executionPackagePreviews,
    executionPackageReadinessRecords,
    executionContractPreviews,
    executionContractReadinessRecords,
    executionBundlePreviews,
    executionBundleReadinessRecords,
    executionAuthorizationPreviews,
    executionAuthorizationReadinessRecords,
    executionAuthorizationPackageRecords,
    overview,
    diagnostics,
  };
}
