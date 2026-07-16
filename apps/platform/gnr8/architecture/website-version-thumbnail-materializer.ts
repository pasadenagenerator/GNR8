import { sha256Hex } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  loadGeneratedProposalBundleByIteration,
  type GeneratedProposalBundleArtifactRecord,
  type GeneratedProposalBundleIteration,
} from "./generated-proposal-bundle-persistence";
import { getGenerationPreviewBundleAvailability } from "./generation-evolution-preview-boundary";
import { buildWebsiteVersionThumbnailArtifact } from "./website-version-thumbnail-builder";
import {
  WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT,
  type WebsiteVersionThumbnailArtifact,
  type WebsiteVersionThumbnailMediaType,
  type WebsiteVersionThumbnailViewport,
} from "./website-version-thumbnail-contract";
import {
  persistWebsiteVersionThumbnail,
  type WebsiteVersionThumbnailPersistenceOptions,
} from "./website-version-thumbnail-persistence";

export type WebsiteVersionThumbnailMaterializationMode = "dry_run" | "persist";

export type WebsiteVersionThumbnailImageBytes = {
  bytes: Buffer;
  mediaType: WebsiteVersionThumbnailMediaType;
  width: number;
  height: number;
};

export type WebsiteVersionThumbnailMaterializationResult =
  | {
      ok: true;
      mode: WebsiteVersionThumbnailMaterializationMode;
      wrote: boolean;
      artifact: WebsiteVersionThumbnailArtifact;
      diagnostics: string[];
    }
  | {
      ok: false;
      mode: WebsiteVersionThumbnailMaterializationMode;
      wrote: false;
      code: string;
      message: string;
      diagnostics: string[];
    };

export type WebsiteVersionThumbnailMaterializerOptions = WebsiteVersionThumbnailPersistenceOptions & {
  now?: string;
  viewport?: WebsiteVersionThumbnailViewport;
  basePreviewUrl?: string;
  browserCookieHeader?: string | null;
  getRawImportedSiteArtifact?: (siteVersionId: string, options?: RuntimeStoreDbOptions) => Promise<RawImportedSiteArtifact | null>;
  getRawTemplateSiteAsset?: (input: {
    siteVersionId: string;
    filePath: string;
    artifactId?: string | null;
    dbClient?: RuntimeStoreDbOptions["dbClient"];
  }) => Promise<{ mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer } | null>;
  captureGeneratedPreview?: (input: {
    siteVersionId: string;
    iteration: GeneratedProposalBundleIteration;
    previewUrl: string;
    viewport: WebsiteVersionThumbnailViewport;
    cookieHeader: string | null;
  }) => Promise<WebsiteVersionThumbnailImageBytes>;
};

function captureEvidence(summary: RuntimeImportProvenanceSummary | null | undefined): NonNullable<RuntimeImportProvenanceSummary["captureEvidence"]> | null {
  return summary?.captureEvidence ?? null;
}

function candidateScreenshotPaths(summary: RuntimeImportProvenanceSummary | null | undefined): string[] {
  const evidence = captureEvidence(summary);
  const paths = [
    evidence?.renderedViewportScreenshotPath,
    evidence?.renderedFullpageScreenshotPath,
    ...(evidence?.screenshotPaths ?? []),
  ];
  return [...new Set(paths.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .map((value) => value.replaceAll("\\", "/").replace(/^\/+/, ""))
    .filter((value) => value && !value.includes(".."));
}

function resolvePersistedScreenshotPath(input: {
  candidatePath: string;
  persistedFilePaths: readonly string[];
}): string | null {
  const candidate = input.candidatePath.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  const matches = input.persistedFilePaths
    .map((filePath) => filePath.trim().replaceAll("\\", "/").replace(/^\/+/, ""))
    .filter((filePath) => filePath && (candidate === filePath || candidate.endsWith(`/${filePath}`) || filePath.endsWith(`/${candidate}`)));
  return matches.length === 1 ? matches[0] : null;
}

function pngDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.byteLength < 24) return null;
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function sniffImage(input: { bytes: Buffer; mediaType: string; width?: number | null; height?: number | null }): WebsiteVersionThumbnailImageBytes | null {
  const mediaType = input.mediaType.split(";")[0]?.trim().toLowerCase();
  if (mediaType === "image/png") {
    const dimensions = input.width && input.height ? { width: input.width, height: input.height } : pngDimensions(input.bytes);
    if (!dimensions) return null;
    return { bytes: input.bytes, mediaType: "image/png", ...dimensions };
  }
  if ((mediaType === "image/webp" || mediaType === "image/jpeg") && input.width && input.height) {
    return { bytes: input.bytes, mediaType: mediaType as WebsiteVersionThumbnailMediaType, width: input.width, height: input.height };
  }
  return null;
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions): Promise<CanonicalSiteVersionSnapshot | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultGetRawImportedSiteArtifact(siteVersionId: string, options?: RuntimeStoreDbOptions): Promise<RawImportedSiteArtifact | null> {
  const { getRawImportedSiteArtifact } = await import("../runtime/runtime-store");
  return getRawImportedSiteArtifact(siteVersionId, options);
}

async function defaultGetRawTemplateSiteAsset(input: {
  siteVersionId: string;
  filePath: string;
  artifactId?: string | null;
  dbClient?: RuntimeStoreDbOptions["dbClient"];
}): Promise<{ mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer } | null> {
  const { getRawTemplateSiteAsset } = await import("../runtime/runtime-store");
  return getRawTemplateSiteAsset(input);
}

export async function captureGeneratedPreviewThumbnailWithPlaywright(input: {
  previewUrl: string;
  viewport: WebsiteVersionThumbnailViewport;
  cookieHeader?: string | null;
}): Promise<WebsiteVersionThumbnailImageBytes> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: input.viewport.width, height: input.viewport.height },
      deviceScaleFactor: input.viewport.deviceScaleFactor,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    if (input.cookieHeader) {
      await context.setExtraHTTPHeaders({ cookie: input.cookieHeader });
    }
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(20_000);
    await page.goto(input.previewUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => undefined);
    await page.evaluate(async () => {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready?.catch(() => undefined);
      await Promise.all(Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }));
    });
    await page.waitForTimeout(250);
    const bytes = Buffer.from(await page.screenshot({ type: "png", fullPage: input.viewport.fullPage }));
    const dimensions = pngDimensions(bytes);
    if (!dimensions) throw new Error("Generated preview screenshot did not produce a valid PNG.");
    return { bytes, mediaType: "image/png", ...dimensions };
  } finally {
    await browser.close();
  }
}

function failure(input: {
  mode: WebsiteVersionThumbnailMaterializationMode;
  code: string;
  message: string;
  diagnostics?: string[];
}): WebsiteVersionThumbnailMaterializationResult {
  return { ok: false, mode: input.mode, wrote: false, code: input.code, message: input.message, diagnostics: input.diagnostics ?? [] };
}

async function maybePersist(input: {
  mode: WebsiteVersionThumbnailMaterializationMode;
  artifact: WebsiteVersionThumbnailArtifact;
  siteVersionId: string;
  options: WebsiteVersionThumbnailMaterializerOptions;
  diagnostics: string[];
}): Promise<WebsiteVersionThumbnailMaterializationResult> {
  if (input.mode === "dry_run") {
    return { ok: true, mode: input.mode, wrote: false, artifact: input.artifact, diagnostics: [...input.diagnostics, "DRY_RUN_NO_WRITE"] };
  }
  const persisted = await persistWebsiteVersionThumbnail({
    siteVersionId: input.siteVersionId,
    artifact: input.artifact,
    options: input.options,
  });
  return { ok: true, mode: input.mode, wrote: true, artifact: persisted, diagnostics: [...input.diagnostics, "PERSISTED_THUMBNAIL_ARTIFACT"] };
}

export async function materializeOriginalWebsiteVersionThumbnail(input: {
  siteVersionId: string;
  mode?: WebsiteVersionThumbnailMaterializationMode;
  options?: WebsiteVersionThumbnailMaterializerOptions;
}): Promise<WebsiteVersionThumbnailMaterializationResult> {
  const mode = input.mode ?? "dry_run";
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId) as CanonicalSiteVersionSnapshot | null
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return failure({ mode, code: "SITE_VERSION_UNAVAILABLE", message: "Site version is unavailable." });
  const paths = candidateScreenshotPaths(siteVersion.importProvenanceSummary);
  if (paths.length === 0) return failure({ mode, code: "SOURCE_SCREENSHOT_UNAVAILABLE", message: "No persisted source screenshot reference is available." });

  const getRawArtifact = options.getRawImportedSiteArtifact ?? defaultGetRawImportedSiteArtifact;
  const getAsset = options.getRawTemplateSiteAsset ?? defaultGetRawTemplateSiteAsset;
  const rawArtifact = await getRawArtifact(input.siteVersionId, options);
  if (!rawArtifact) return failure({ mode, code: "RAW_IMPORTED_SITE_UNAVAILABLE", message: "Raw imported site artifact is unavailable." });

  for (const candidatePath of paths) {
    const filePath = resolvePersistedScreenshotPath({ candidatePath, persistedFilePaths: Object.keys(rawArtifact.fileMap) });
    if (!filePath) continue;
    const asset = await getAsset({
      siteVersionId: input.siteVersionId,
      artifactId: rawArtifact.id,
      filePath,
      dbClient: options.dbClient,
    });
    if (!asset) continue;
    if (asset.sha256 !== sha256Hex(asset.bytes)) {
      return failure({ mode, code: "SOURCE_SCREENSHOT_HASH_MISMATCH", message: "Persisted source screenshot hash does not match bytes.", diagnostics: [filePath] });
    }
    const image = sniffImage({ bytes: asset.bytes, mediaType: asset.mediaType });
    if (!image) {
      return failure({ mode, code: "SOURCE_SCREENSHOT_UNSUPPORTED_FORMAT", message: "Source screenshot media type or dimensions are unsupported.", diagnostics: [asset.mediaType, filePath] });
    }
    const artifact = buildWebsiteVersionThumbnailArtifact({
      source: {
        siteVersionId: input.siteVersionId,
        sourceSiteId: siteVersion.siteId,
        dryRunId: null,
        versionKind: "original_source",
        iterationNumber: null,
        sourceArtifactId: rawArtifact.id,
        sourceArtifactKind: "raw_imported_site",
        generatedProposalBundleId: null,
        generatedProposalBundleSha256: null,
        sourceScreenshotArtifactId: `raw_imported_site:${rawArtifact.id}:${filePath}`,
        sourceScreenshotContentHash: asset.sha256,
      },
      captureMethod: "reused_evidence_capture_screenshot",
      captureTimestamp: options.now ?? new Date().toISOString(),
      viewport: {
        width: image.width,
        height: image.height,
        deviceScaleFactor: 1,
        fullPage: candidatePath.includes("fullpage"),
      },
      image: {
        mediaType: image.mediaType,
        width: image.width,
        height: image.height,
        contentBase64: image.bytes.toString("base64"),
      },
      limitations: ["Original source thumbnail reuses exact persisted screenshot evidence; it is presentation-only."],
      diagnostics: [`SOURCE_SCREENSHOT:${filePath}`, "NO_LIVE_SOURCE_CAPTURE"],
    });
    return maybePersist({ mode, artifact, siteVersionId: input.siteVersionId, options, diagnostics: [`selectedSourceScreenshot=${filePath}`] });
  }

  return failure({
    mode,
    code: "SOURCE_SCREENSHOT_BYTES_UNAVAILABLE",
    message: "Source screenshot references exist, but no exact persisted screenshot bytes were safely retrievable.",
    diagnostics: paths,
  });
}

export async function materializeGeneratedWebsiteVersionThumbnail(input: {
  siteVersionId: string;
  iteration: GeneratedProposalBundleIteration;
  mode?: WebsiteVersionThumbnailMaterializationMode;
  options?: WebsiteVersionThumbnailMaterializerOptions;
}): Promise<WebsiteVersionThumbnailMaterializationResult> {
  const mode = input.mode ?? "dry_run";
  const options = input.options ?? {};
  const viewport = options.viewport ?? WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT;
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId) as CanonicalSiteVersionSnapshot | null
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return failure({ mode, code: "SITE_VERSION_UNAVAILABLE", message: "Site version is unavailable." });

  const availability = await getGenerationPreviewBundleAvailability({
    siteVersionId: input.siteVersionId,
    iteration: input.iteration,
    options,
  });
  if (!availability?.available) {
    return failure({
      mode,
      code: "GENERATED_BUNDLE_UNAVAILABLE",
      message: availability?.unavailableReason ?? "Generated Proposal Bundle is unavailable.",
    });
  }
  const bundle = await loadGeneratedProposalBundleByIteration({
    siteVersionId: input.siteVersionId,
    iteration: input.iteration,
    options,
  });
  if (!bundle) return failure({ mode, code: "GENERATED_BUNDLE_UNAVAILABLE", message: "Generated Proposal Bundle could not be loaded." });

  const capture = options.captureGeneratedPreview ?? (async (captureInput: {
    previewUrl: string;
    viewport: WebsiteVersionThumbnailViewport;
    cookieHeader: string | null;
  }) => captureGeneratedPreviewThumbnailWithPlaywright(captureInput));
  const basePreviewUrl = String(options.basePreviewUrl ?? "").replace(/\/$/, "");
  if (!basePreviewUrl && !options.captureGeneratedPreview) {
    return failure({
      mode,
      code: "AUTHENTICATED_CAPTURE_UNAVAILABLE",
      message: "No authenticated preview base URL or injected capture function was provided.",
      diagnostics: ["Generated thumbnail capture did not weaken preview authentication."],
    });
  }
  const previewUrl = basePreviewUrl
    ? `${basePreviewUrl}/gnr8/admin/evolution/${input.siteVersionId}/iterations/${input.iteration}/preview/`
    : `/gnr8/admin/evolution/${input.siteVersionId}/iterations/${input.iteration}/preview/`;
  let image: WebsiteVersionThumbnailImageBytes;
  try {
    image = await capture({
      siteVersionId: input.siteVersionId,
      iteration: input.iteration,
      previewUrl,
      viewport,
      cookieHeader: options.browserCookieHeader ?? null,
    });
  } catch (error) {
    return failure({
      mode,
      code: "GENERATED_PREVIEW_CAPTURE_FAILED",
      message: error instanceof Error ? error.message : "Generated preview capture failed.",
      diagnostics: [`bundleArtifactId=${bundle.artifactId}`],
    });
  }

  const artifact = buildWebsiteVersionThumbnailArtifact({
    source: {
      siteVersionId: input.siteVersionId,
      sourceSiteId: siteVersion.siteId,
      dryRunId: bundle.dryRunId,
      versionKind: "generated_iteration",
      iterationNumber: input.iteration,
      sourceArtifactId: bundle.artifactId,
      sourceArtifactKind: "generated_proposal_bundle",
      generatedProposalBundleId: bundle.artifactId,
      generatedProposalBundleSha256: bundle.bundleSha256,
      sourceScreenshotArtifactId: null,
      sourceScreenshotContentHash: null,
    },
    captureMethod: "rendered_durable_generated_preview",
    captureTimestamp: options.now ?? new Date().toISOString(),
    viewport,
    image: {
      mediaType: image.mediaType,
      width: image.width,
      height: image.height,
      contentBase64: image.bytes.toString("base64"),
    },
    limitations: ["Generated thumbnail derives from the exact durable Generated Proposal Bundle preview and is presentation-only."],
    diagnostics: [
      `generatedProposalBundleId=${bundle.artifactId}`,
      `bundleSha256=${bundle.bundleSha256}`,
      "NO_PROPOSAL_REGENERATION",
      "NO_LOCAL_PROPOSAL_DIRECTORY",
    ],
  });
  return maybePersist({ mode, artifact, siteVersionId: input.siteVersionId, options, diagnostics: [`selectedGeneratedBundle=${bundle.artifactId}`] });
}

export function generatedBundleSummary(bundle: GeneratedProposalBundleArtifactRecord): string {
  return `${bundle.artifactId} ${bundle.bundleSha256} ${bundle.assetCount} asset(s) ${bundle.byteSize} byte(s)`;
}
