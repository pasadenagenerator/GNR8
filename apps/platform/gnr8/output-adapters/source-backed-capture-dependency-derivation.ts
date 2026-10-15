import "server-only";

import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import { stableStringify } from "@/gnr8/runtime/deterministic";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getArtifactById,
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifactFiles,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
  persistRawImportedSiteArtifact,
} from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact, RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import {
  captureAssetsForAdditionalHtmlPages,
  computeLocalPathCandidate,
  type UrlImportFetchManifestEntry,
} from "@/gnr8/validation/runtime/url-single-page-import";

import type { AcceptedSourceFunctionalReductions } from "./source-backed-astro-input";

export type DerivedCaptureResult = {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  rawArtifact: RawImportedSiteArtifact;
  derived: boolean;
};

type FileRow = { path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer };

export async function ensureDependencyCompleteDerivedCapture(input: {
  parentSiteVersion: CanonicalSiteVersionSnapshot;
  parentArtifact: RuntimeArtifact;
  parentRawArtifact: RawImportedSiteArtifact;
  derivedSiteVersionId: string;
  ownershipSiteId: string;
  actor: string;
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
}): Promise<DerivedCaptureResult> {
  const existingVersion = await getSiteVersion(input.derivedSiteVersionId);
  let resumableRawArtifact: RawImportedSiteArtifact | null = null;
  let resumableArtifact: RuntimeArtifact | null = null;
  if (existingVersion) {
    const lineage = existingVersion.importProvenanceSummary?.derivedCapture;
    if (
      existingVersion.siteId !== input.parentSiteVersion.siteId ||
      lineage?.parentSiteVersionId !== input.parentSiteVersion.id ||
      lineage.parentRawArtifactId !== input.parentRawArtifact.id
    ) throw new Error("astro_derived_capture_lineage_conflict");
    [resumableRawArtifact, resumableArtifact] = await Promise.all([
      getRawImportedSiteArtifact(existingVersion.id),
      existingVersion.artifactId ? getArtifactById(existingVersion.artifactId) : Promise.resolve(null),
    ]);
    if (resumableRawArtifact && resumableArtifact) {
      return { siteVersion: existingVersion, artifact: resumableArtifact, rawArtifact: resumableRawArtifact, derived: true };
    }
  }

  const parentFiles = await getRawTemplateSiteArtifactFiles({
    siteVersionId: input.parentSiteVersion.id,
    artifactId: input.parentRawArtifact.id,
  });
  assertFileRowsMatchManifest(parentFiles, input.parentRawArtifact);
  const htmlFiles = parentFiles.filter((file) => /\.html?$/i.test(file.path));
  const stylesheetPlan = planStylesheetDependencies({
    htmlFiles,
    filePaths: new Set(parentFiles.map((file) => file.path)),
    removeFormCaptcha: Boolean(
      input.acceptedFunctionalReductions?.sourceWidgetRemovals?.includes("form-captcha"),
    ),
  });
  if (stylesheetPlan.missingUrls.length === 0 && stylesheetPlan.rewrites.length === 0) {
    return {
      siteVersion: input.parentSiteVersion,
      artifact: input.parentArtifact,
      rawArtifact: input.parentRawArtifact,
      derived: false,
    };
  }

  const workspace = await mkdtemp(join(tmpdir(), "gnr8-derived-capture-"));
  try {
    for (const file of parentFiles) {
      const target = join(workspace, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.bytes);
    }
    const existingManifest: UrlImportFetchManifestEntry[] = stylesheetPlan.rewrites
      .filter((entry) => entry.reused)
      .map((entry, index) => ({
        tag: "link" as const,
        attribute: "href" as const,
        occurrence: index,
        rawRef: entry.from,
        resolvedUrl: entry.from,
        localPath: entry.to.replace(/^\/+/, ""),
        assetKind: "stylesheet" as const,
        fetchStatus: "fetched" as const,
        httpStatus: 200,
        contentType: "text/css",
        byteLength: input.parentRawArtifact.fileMap[entry.to.replace(/^\/+/, "")]?.sizeBytes ?? null,
      }));
    existingManifest.push(...existingCssDependencyManifest({
      parentFiles,
      stylesheetRewrites: stylesheetPlan.rewrites.filter((entry) => entry.reused),
      filePaths: new Set(parentFiles.map((file) => file.path)),
      startingOccurrence: existingManifest.length,
    }));
    const allStylesheetUrls = [
      ...stylesheetPlan.rewrites.filter((entry) => entry.reused).map((entry) => entry.from),
      ...stylesheetPlan.missingUrls,
    ].sort();
    const syntheticHtml = `<!doctype html><html><head>${allStylesheetUrls
      .map((url) => `<link rel="stylesheet" href="${escapeAttribute(url)}">`)
      .join("")}</head><body></body></html>`;
    const capture = await captureAssetsForAdditionalHtmlPages({
      pages: [{
        pageUrl: input.parentRawArtifact.metadata.finalUrl ?? input.parentRawArtifact.metadata.sourceUrl,
        bodyPath: join(workspace, "dependency-probe.html"),
        html: syntheticHtml,
      }],
      snapshotRootDirAbs: workspace,
      existingFetchManifest: existingManifest,
      trustedExternalOrigins: trustedOriginsForStylesheets([
        ...allStylesheetUrls,
        ...importOriginsFromRetainedStylesheets(parentFiles),
      ]),
    });
    if (capture.summary.failedRequiredAssetCount > 0) {
      throw new Error(`astro_derived_capture_dependency_fetch_failed:${capture.summary.failedRequiredResources.join(",")}`);
    }
    const fetchedStylesheetEntries = capture.manifestEntries.filter((entry) =>
      entry.assetKind === "stylesheet" && entry.fetchStatus === "fetched" && entry.resolvedUrl && entry.localPath,
    );
    for (const url of stylesheetPlan.missingUrls) {
      const entry = fetchedStylesheetEntries.find((candidate) => candidate.resolvedUrl === url);
      if (!entry?.localPath) throw new Error(`astro_derived_capture_stylesheet_missing:${url}`);
      stylesheetPlan.rewrites.push({ from: url, to: `/${entry.localPath}`, reused: false });
    }

    const fetchedPaths = [...new Set(capture.manifestEntries
      .filter((entry) => entry.fetchStatus === "fetched" && entry.localPath)
      .map((entry) => entry.localPath!))]
      .filter((filePath) => !input.parentRawArtifact.fileMap[filePath]);
    const newFiles: FileRow[] = [];
    for (const filePath of fetchedPaths.sort()) {
      const bytes = await readFile(join(workspace, ...filePath.split("/")));
      const manifestEntry = capture.manifestEntries.find((entry) => entry.localPath === filePath);
      newFiles.push({
        path: filePath,
        mediaType: mediaTypeFor(filePath, manifestEntry?.contentType ?? null),
        sizeBytes: bytes.byteLength,
        sha256: sha256(bytes),
        bytes,
      });
    }
    const rewrites = stylesheetPlan.rewrites
      .map(({ from, to }) => ({ from, to }))
      .sort((left, right) => left.from.localeCompare(right.from));
    const rewrittenParentFiles = parentFiles.map((file) => {
      if (!/\.html?$/i.test(file.path)) return file;
      const html = rewriteStylesheetReferences(file.bytes.toString("utf8"), rewrites);
      const bytes = Buffer.from(html, "utf8");
      return { ...file, bytes, sizeBytes: bytes.byteLength, sha256: sha256(bytes) };
    });
    const derivedFiles = [...rewrittenParentFiles, ...newFiles]
      .sort((left, right) => left.path.localeCompare(right.path));
    const parentFilesSha256 = filesSha256(parentFiles);
    const derivedFilesSha256 = filesSha256(derivedFiles);
    const provenance = structuredClone(input.parentSiteVersion.importProvenanceSummary ?? {}) as RuntimeImportProvenanceSummary;
    const rewrittenHtmlFiles = rewrittenParentFiles
      .filter((file) => {
        const parent = parentFiles.find((candidate) => candidate.path === file.path);
        return parent && parent.sha256 !== file.sha256;
      })
      .map((file) => ({
        path: file.path,
        beforeSha256: parentFiles.find((candidate) => candidate.path === file.path)!.sha256,
        afterSha256: file.sha256,
        byteSize: file.sizeBytes,
      }));
    refreshDerivedHtmlProvenance(provenance, rewrittenHtmlFiles);
    provenance.derivedCapture = {
      kind: "dependency_complete_derived_capture_v1",
      parentSiteVersionId: input.parentSiteVersion.id,
      parentArtifactId: input.parentArtifact.id,
      parentRawArtifactId: input.parentRawArtifact.id,
      parentFilesSha256,
      derivedFilesSha256,
      dependencyUrls: stylesheetPlan.missingUrls,
      rewrites,
      rewrittenHtmlFiles,
    };
    const createdVersion = existingVersion
      ? { siteVersionId: existingVersion.id }
      : await createSiteVersionFromMigration({
          siteId: input.parentSiteVersion.siteId,
          siteVersionId: input.derivedSiteVersionId,
          sourceUrl: input.parentRawArtifact.metadata.finalUrl ?? input.parentRawArtifact.metadata.sourceUrl,
          actor: input.actor,
          pages: input.parentSiteVersion.pages,
          importProvenanceSummary: provenance,
          rendererCompatibilityVersion: input.parentSiteVersion.rendererCompatibilityVersion,
          createSourceHostBinding: false,
        });
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: createdVersion.siteVersionId,
      ownershipSiteId: input.ownershipSiteId,
    });
    if (resumableRawArtifact) assertFileRowsMatchManifest(derivedFiles, resumableRawArtifact);
    const rawResult = resumableRawArtifact
      ? { artifactId: resumableRawArtifact.id }
      : await persistRawImportedSiteArtifact({
          siteId: input.parentRawArtifact.siteId,
          siteVersionId: createdVersion.siteVersionId,
          entryHtmlPath: input.parentRawArtifact.entryHtmlPath,
          assetBasePath: input.parentRawArtifact.assetBasePath,
          fileRows: derivedFiles,
          metadata: {
            ...input.parentRawArtifact.metadata,
            diagnostics: {
              codes: [...new Set([
                ...input.parentRawArtifact.metadata.diagnostics.codes,
                "DEPENDENCY_COMPLETE_DERIVED_CAPTURE",
              ])],
            },
            assetSummary: {
              persistedAssetCount: derivedFiles.length,
              externalFallbackAssetCount: 0,
            },
          },
        });
    const manifest = {
      ...structuredClone(input.parentArtifact.manifest),
      sourceKind: "dependency_complete_derived_capture",
      parentSiteVersionId: input.parentSiteVersion.id,
      parentArtifactId: input.parentArtifact.id,
      parentRawArtifactId: input.parentRawArtifact.id,
      rawArtifactId: rawResult.artifactId,
      derivedFilesSha256,
    };
    const artifactBundleSha256 = computeRuntimeArtifactBundleSha256({
      htmlByPath: input.parentArtifact.htmlByPath,
      compiledTokenStyles: input.parentArtifact.compiledTokenStyles,
      assetFingerprintMap: input.parentArtifact.assetFingerprintMap,
      manifest,
    });
    if (resumableArtifact && resumableArtifact.bundleSha256 !== artifactBundleSha256) {
      throw new Error("astro_derived_capture_artifact_conflict");
    }
    const createdArtifactId = resumableArtifact?.id ?? (await createArtifact({
        siteId: input.parentArtifact.siteId,
        siteVersionId: createdVersion.siteVersionId,
        rendererCompatibilityVersion: input.parentArtifact.rendererCompatibilityVersion,
        bundleSha256: artifactBundleSha256,
        htmlByPath: input.parentArtifact.htmlByPath,
        compiledTokenStyles: input.parentArtifact.compiledTokenStyles,
        assetFingerprintMap: input.parentArtifact.assetFingerprintMap,
        manifest,
        publishStage: input.parentArtifact.publishStage,
        shadowRestricted: input.parentArtifact.shadowRestricted,
        artifactGovernance: input.parentArtifact.artifactGovernance,
      })).artifactId;
    await bindArtifactToVersion({
      siteVersionId: createdVersion.siteVersionId,
      artifactId: createdArtifactId,
      rendererCompatibilityVersion: input.parentArtifact.rendererCompatibilityVersion,
    });
    const [siteVersion, artifact, rawArtifact] = await Promise.all([
      getSiteVersion(createdVersion.siteVersionId),
      getArtifactById(createdArtifactId),
      getRawImportedSiteArtifact(createdVersion.siteVersionId),
    ]);
    if (!siteVersion || !artifact || !rawArtifact) throw new Error("astro_derived_capture_persistence_incomplete");
    return { siteVersion, artifact, rawArtifact, derived: true };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export function refreshDerivedHtmlProvenance(
  provenance: RuntimeImportProvenanceSummary,
  rewrittenHtmlFiles: Array<{ path: string; afterSha256: string; byteSize: number }>,
): void {
  const byPath = new Map(rewrittenHtmlFiles.map((file) => [file.path, file]));
  const routeMap = provenance.multiPageDiscovery?.rawArtifactAssembly?.routeMap ?? [];
  for (const route of routeMap) {
    const rewritten = byPath.get(route.rawFilePath);
    if (!rewritten) continue;
    route.bodySha256 = rewritten.afterSha256;
    route.byteSize = rewritten.byteSize;
  }

  // The previous validation remains historical evidence, but it cannot be the
  // current result for a newly derived artifact identity.
  const mutable = provenance as RuntimeImportProvenanceSummary & Record<string, unknown>;
  if ("currentRawPreviewValidationEvidence" in mutable) mutable.currentRawPreviewValidationEvidence = null;
  if ("currentMultiPagePreviewValidation" in mutable) mutable.currentMultiPagePreviewValidation = null;
}

export function planStylesheetDependencies(input: {
  htmlFiles: FileRow[];
  filePaths: ReadonlySet<string>;
  removeFormCaptcha: boolean;
}): {
  missingUrls: string[];
  rewrites: Array<{ from: string; to: string; reused: boolean }>;
} {
  const urls = new Set<string>();
  for (const file of input.htmlFiles) {
    for (const tag of file.bytes.toString("utf8").matchAll(/<link\b[^>]*>/gi)) {
      const markup = tag[0];
      if (!/\brel\s*=\s*["'][^"']*stylesheet/i.test(markup)) continue;
      const href = markup.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2]?.replaceAll("&amp;", "&").trim() ?? "";
      if (!/^https?:\/\//i.test(href)) continue;
      if (input.removeFormCaptcha && /h-?captcha|g-recaptcha|recaptcha/i.test(href)) continue;
      if (/\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test(href)) continue;
      urls.add(href);
    }
  }
  const rewrites: Array<{ from: string; to: string; reused: boolean }> = [];
  const missingUrls: string[] = [];
  for (const url of [...urls].sort()) {
    const localPath = computeLocalPathCandidate({ resolvedUrl: url, assetKind: "stylesheet" });
    if (input.filePaths.has(localPath)) rewrites.push({ from: url, to: `/${localPath}`, reused: true });
    else missingUrls.push(url);
  }
  return { missingUrls, rewrites };
}

function rewriteStylesheetReferences(html: string, rewrites: Array<{ from: string; to: string }>): string {
  const byUrl = new Map(rewrites.map((entry) => [entry.from, entry.to]));
  return html.replace(/(<link\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gi, (full, prefix, quote, value, closing) => {
    const normalized = String(value).replaceAll("&amp;", "&");
    const replacement = byUrl.get(normalized);
    return replacement ? `${prefix}${quote}${replacement}${closing}` : full;
  });
}

function trustedOriginsForStylesheets(urls: string[]): string[] {
  const origins = new Set<string>();
  for (const value of urls) {
    try { origins.add(new URL(value).origin); } catch { /* rejected by the importer */ }
  }
  if (urls.some((url) => {
    try { return new URL(url).hostname === "fonts.googleapis.com"; } catch { return false; }
  })) {
    origins.add("https://fonts.gstatic.com");
  }
  return [...origins].sort();
}

function importOriginsFromRetainedStylesheets(files: FileRow[]): string[] {
  const origins = new Set<string>();
  for (const file of files.filter((candidate) => /\.css$/i.test(candidate.path))) {
    for (const match of file.bytes.toString("utf8").matchAll(/@import\s+(?:url\(\s*)?["']?(https?:\/\/[^"')\s;]+)/gi)) {
      try { origins.add(new URL(match[1]!).origin); } catch { /* importer reports malformed URLs */ }
    }
  }
  return [...origins].sort();
}

function existingCssDependencyManifest(input: {
  parentFiles: FileRow[];
  stylesheetRewrites: Array<{ from: string; to: string; reused: boolean }>;
  filePaths: ReadonlySet<string>;
  startingOccurrence: number;
}) {
  const entries: Array<{
    tag: "link";
    attribute: "href";
    occurrence: number;
    rawRef: string;
    resolvedUrl: string;
    localPath: string;
    assetKind: "image" | "style_asset";
    fetchStatus: "fetched";
    httpStatus: number;
    contentType: string;
    byteLength: number;
  }> = [];
  let occurrence = input.startingOccurrence;
  for (const stylesheet of input.stylesheetRewrites) {
    const localPath = stylesheet.to.replace(/^\/+/, "");
    const file = input.parentFiles.find((candidate) => candidate.path === localPath);
    if (!file) continue;
    for (const match of file.bytes.toString("utf8").matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const rawRef = (match[2] ?? "").trim();
      if (!rawRef || rawRef.startsWith("data:") || rawRef.startsWith("#")) continue;
      let resolvedUrl: string;
      try { resolvedUrl = new URL(rawRef, stylesheet.from).toString(); } catch { continue; }
      const assetKind = /\.(?:apng|avif|gif|ico|jpe?g|png|svg|webp|bmp|tiff?)(?:[?#]|$)/i.test(resolvedUrl)
        ? "image" as const
        : "style_asset" as const;
      const dependencyPath = computeLocalPathCandidate({ resolvedUrl, assetKind });
      if (!input.filePaths.has(dependencyPath)) continue;
      const dependency = input.parentFiles.find((candidate) => candidate.path === dependencyPath);
      if (!dependency) continue;
      entries.push({
        tag: "link",
        attribute: "href",
        occurrence,
        rawRef,
        resolvedUrl,
        localPath: dependencyPath,
        assetKind,
        fetchStatus: "fetched",
        httpStatus: 200,
        contentType: dependency.mediaType,
        byteLength: dependency.sizeBytes,
      });
      occurrence += 1;
    }
  }
  return entries;
}

function assertFileRowsMatchManifest(files: FileRow[], artifact: RawImportedSiteArtifact): void {
  if (files.length !== Object.keys(artifact.fileMap).length) throw new Error("astro_derived_capture_parent_file_count_mismatch");
  for (const file of files) {
    const expected = artifact.fileMap[file.path];
    if (!expected || file.bytes.byteLength !== expected.sizeBytes || sha256(file.bytes) !== expected.sha256) {
      throw new Error(`astro_derived_capture_parent_file_mismatch:${file.path}`);
    }
  }
}

function filesSha256(files: FileRow[]): string {
  return sha256(Buffer.from(stableStringify(files.map((file) => ({
    path: file.path,
    mediaType: file.mediaType,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
  })).sort((left, right) => left.path.localeCompare(right.path))), "utf8"));
}

function mediaTypeFor(filePath: string, provided: string | null): string {
  if (/\.css$/i.test(filePath)) return "text/css; charset=utf-8";
  if (/\.woff2$/i.test(filePath)) return "font/woff2";
  if (/\.woff$/i.test(filePath)) return "font/woff";
  if (/\.ttf$/i.test(filePath)) return "font/ttf";
  if (/\.svg$/i.test(filePath)) return "image/svg+xml";
  return provided?.trim() || "application/octet-stream";
}

function sha256(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
function escapeAttribute(value: string): string { return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;"); }
