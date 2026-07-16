import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  buildSourceContentVisualContinuityProjection,
  validateSourceContentVisualContinuityProjection,
  type NormalizedSourceScreenshotInput,
} from "./source-content-visual-continuity-projection-builder";
import type {
  ContinuityDiagnostic,
  ContinuityValidationResult,
  SourceContentVisualContinuityProjection,
} from "./source-content-visual-continuity-projection-contract";
import {
  loadSourceWebsiteUnderstandingProjection,
  type SourceWebsiteUnderstandingProjectionLoaderOptions,
} from "./source-website-understanding-projection-loader";

type LoaderSiteVersion = Pick<CanonicalSiteVersionSnapshot, "id" | "siteId" | "createdAt" | "importProvenanceSummary">;

export type SourceContentVisualContinuityProjectionLoaderOptions = SourceWebsiteUnderstandingProjectionLoaderOptions & RuntimeStoreDbOptions & {
  generatedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<LoaderSiteVersion | null>;
};

export type SourceContentVisualContinuityProjectionLoaderResult =
  | {
    status: "valid" | "partial";
    projection: SourceContentVisualContinuityProjection;
    validation: ContinuityValidationResult;
    diagnostics: ContinuityDiagnostic[];
  }
  | {
    status: "blocked" | "invalid";
    projection: SourceContentVisualContinuityProjection | null;
    validation: ContinuityValidationResult;
    diagnostics: ContinuityDiagnostic[];
  };

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions): Promise<LoaderSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

function screenshotInputs(summary: RuntimeImportProvenanceSummary | null | undefined, siteVersionId: string): NormalizedSourceScreenshotInput[] {
  const captureEvidence = summary?.captureEvidence;
  const paths: Array<{ path: string; completeness: NonNullable<NormalizedSourceScreenshotInput["completeness"]> }> = [];
  if (captureEvidence?.renderedViewportScreenshotPath) {
    paths.push({ path: captureEvidence.renderedViewportScreenshotPath, completeness: "viewport" });
  }
  if (captureEvidence?.renderedFullpageScreenshotPath) {
    paths.push({ path: captureEvidence.renderedFullpageScreenshotPath, completeness: "full_page" });
  }
  for (const path of captureEvidence?.screenshotPaths ?? []) {
    paths.push({ path, completeness: "unknown" });
  }
  const unique = new Map<string, NormalizedSourceScreenshotInput>();
  for (const item of paths) {
    const safePath = item.path.replace(/^\/+/, "");
    if (!safePath || safePath.includes("..")) continue;
    unique.set(safePath, {
      screenshotId: `source-screenshot:${siteVersionId}:${safePath}`,
      routePath: "/",
      sourceUrl: null,
      viewport: item.completeness === "viewport" ? "viewport" : item.completeness === "full_page" ? "full_page" : null,
      dimensions: null,
      capturedAt: summary?.captureJob?.completedAt ?? null,
      completeness: item.completeness,
      safeAccessRef: null,
      evidenceRefs: [`runtime-import:capture-evidence:${safePath}`],
      availability: "available",
    });
  }
  return [...unique.values()].sort((left, right) => left.screenshotId.localeCompare(right.screenshotId));
}

function resultStatus(input: {
  projection: SourceContentVisualContinuityProjection | null;
  validation: ContinuityValidationResult;
}): SourceContentVisualContinuityProjectionLoaderResult["status"] {
  if (!input.projection) return "blocked";
  if (!input.validation.valid) return "invalid";
  return input.projection.readiness.readyForDesignEnrichment ? "valid" : "partial";
}

export async function loadSourceContentVisualContinuityProjection(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: SourceContentVisualContinuityProjectionLoaderOptions;
}): Promise<SourceContentVisualContinuityProjectionLoaderResult> {
  const options = input.options ?? {};
  const wuResult = await loadSourceWebsiteUnderstandingProjection({
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    options,
  });
  if (!wuResult.projection) {
    return {
      status: "blocked",
      projection: null,
      validation: { valid: false, errors: ["Source Website Understanding projection is unavailable"], warnings: [] },
      diagnostics: wuResult.diagnostics.map((item) => ({ code: item.code, message: item.message, sourceRefs: item.sourceRefs })),
    };
  }
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  const screenshots = screenshotInputs(siteVersion?.importProvenanceSummary ?? null, input.siteVersionId);
  const projection = buildSourceContentVisualContinuityProjection({
    sourceWebsiteUnderstandingProjection: wuResult.projection,
    generatedAt: options.generatedAt,
    sourceScreenshots: screenshots,
  });
  const validation = validateSourceContentVisualContinuityProjection(projection);
  const diagnostics = [
    ...projection.diagnostics,
    ...(siteVersion ? [] : [{ code: "SITE_VERSION_RELOAD_UNAVAILABLE", message: "Site version could not be reloaded for screenshot reference composition.", sourceRefs: [input.siteVersionId] }]),
  ];
  const status = resultStatus({ projection, validation });
  return { status, projection, validation, diagnostics } as SourceContentVisualContinuityProjectionLoaderResult;
}
