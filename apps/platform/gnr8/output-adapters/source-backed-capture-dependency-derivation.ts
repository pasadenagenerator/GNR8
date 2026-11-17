import { routeMapFromProvenance } from "@/gnr8/runtime/raw-template-route-map-resolver";
import "server-only";
import { recoverRelocalizedCssReferences, retainedStylesheetSourceUrl, resolveRetainedCssDependencyPath } from "@/gnr8/validation/runtime/retained-css-dependency-path";
export { resolveRetainedCssDependencyPath } from "@/gnr8/validation/runtime/retained-css-dependency-path";

import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { parse, serialize, type DefaultTreeAdapterMap } from "parse5";

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
import { findProvablyUnusedCssDependencies } from "./source-backed-css-dependency-analysis";
import { writeRawImportGitArchive } from '../site/raw-import-git-archive';
import { writeGeneratedArtifactGitArchive } from '../site/generated-artifact-git-archive';
import { GeneratedArtifactGitCache } from '../site/generated-artifact-git-cache';

export type DerivedCaptureResult = {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  rawArtifact: RawImportedSiteArtifact;
  derived: boolean;
};

export function assertDerivedCaptureGitResumeLineage(input:{
  parentRawArtifact:RawImportedSiteArtifact;
  derivedSiteVersionId:string;
  resumableRawArtifact:RawImportedSiteArtifact|null;
  resumableArtifact:RuntimeArtifact|null;
}):void{
  const parentRef=input.parentRawArtifact.metadata.gitArchive;
  if(!parentRef)return;
  if(input.resumableRawArtifact){
    const ref=input.resumableRawArtifact.metadata.gitArchive;
    if(!ref)throw new Error('astro_derived_capture_raw_git_lineage_missing');
    if(ref.manifestPath!==`raw-import/${input.derivedSiteVersionId}/.gnr8-import-manifest.json`||
      stableStringify(ref.scope)!==stableStringify(parentRef.scope))
      throw new Error('astro_derived_capture_raw_git_lineage_mismatch');
  }
  if(input.resumableArtifact){
    const ref=input.resumableArtifact.manifest.generatedGitArchive as {manifestPath?:unknown;scope?:unknown}|undefined;
    if(!ref)throw new Error('astro_derived_capture_generated_git_lineage_missing');
    if(ref.manifestPath!==`generated/${input.derivedSiteVersionId}/.gnr8-generated-manifest.json`||
      stableStringify(ref.scope)!==stableStringify(parentRef.scope))
      throw new Error('astro_derived_capture_generated_git_lineage_mismatch');
  }
}

type FileRow = { path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer };

export type DependencyAcquisitionEvidence = {
  sourceUrl: string;
  effectiveUrl: string;
  retrievedAt: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  provenance: "fresh-public-fetch-not-original-capture" | "reused-public-fetch-not-original-capture";
};

/** Call only after assertPersistedCaptureDependencyEvidence validates the owner
 * and file rows. The shared resolver never guesses targets from basenames.
 */
export function restoreRetainedStylesheetReferences(files: FileRow[]): {
  files: FileRow[];
  rewrites: Array<{ from: string; to: string; reused: boolean }>;
  changed: boolean;
} {
  const manifest = files.find((file) => file.path === "url-fetch-manifest.json");
  const filePaths = new Set(files.map((file) => file.path));
  const rewrites: Array<{ from: string; to: string; reused: boolean }> = [];
  let changed = false;
  const restoredFiles = files.map((file) => {
    if (!manifest || !/(?:^text\/css\b|\.css$)/i.test(`${file.mediaType} ${file.path}`)) return file;
    const sourceUrl = retainedStylesheetSourceUrl({
      bytes: manifest.bytes,
      expectedSha256: manifest.sha256,
      expectedSizeBytes: manifest.sizeBytes,
      stylesheetPath: file.path,
    });
    if (!sourceUrl) return file;
    rewrites.push({ from: sourceUrl, to: `/${file.path}`, reused: true });
    const original = file.bytes.toString("utf8");
    const css = recoverRelocalizedCssReferences({
      css: original,
      stylesheetPath: file.path,
      stylesheetSourceUrl: sourceUrl,
      filePaths,
    });
    if (css === original) return file;
    changed = true;
    const bytes = Buffer.from(css, "utf8");
    return { ...file, bytes, sizeBytes: bytes.byteLength, sha256: sha256(bytes) };
  });
  return { files: restoredFiles, rewrites, changed };
}

export function planRetainedThemeScriptDependencies(input:{htmlFiles:Array<{bytes:Buffer}>;sourceUrl?:string;filePaths:ReadonlySet<string>}):string[]{
  if(!input.sourceUrl)return [];
  const source=new URL(input.sourceUrl), urls=new Set<string>();
  const walk=(node:DefaultTreeAdapterMap['node'])=>{
    if('tagName'in node&&node.tagName==='script'){
      const src=node.attrs.find(a=>a.name==='src')?.value;
      if(src)try{const url=new URL(src,source);
        // Fetch for byte verification only; these concatenated theme bundles
        // are never executed. The downstream reviewed-hash gate still applies.
        if(url.protocol==='https:'&&!url.username&&!url.password&&url.hostname.replace(/^www\./,'')===source.hostname.replace(/^www\./,'')&&
          /^\/wp-content\/cache\/wpfc-minified\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.js$/.test(url.pathname)&&
          !input.filePaths.has(src.replace(/^\//,''))&&!input.filePaths.has(computeLocalPathCandidate({resolvedUrl:url.href,assetKind:'script'})))urls.add(url.href);
      }catch{/* Unrecognized URLs remain subject to the normal source gate. */}
    }
    if('childNodes'in node)node.childNodes.forEach(walk);
  };
  input.htmlFiles.forEach(file=>walk(parse(file.bytes.toString('utf8'))));
  if(urls.size>16)throw Error('retained_theme_script_dependency_limit');
  return [...urls].sort();
}

const capturePersistence = { getSiteVersion, getArtifactById, getRawImportedSiteArtifact,
  getRawTemplateSiteArtifactFiles, createSiteVersionFromMigration, linkRuntimeSiteVersionOwnershipIfAllowed,
  persistRawImportedSiteArtifact, createArtifact, bindArtifactToVersion };

export async function ensureDependencyCompleteDerivedCapture(input: {
  parentSiteVersion: CanonicalSiteVersionSnapshot;
  parentArtifact: RuntimeArtifact;
  parentRawArtifact: RawImportedSiteArtifact;
  derivedSiteVersionId: string;
  ownershipSiteId: string;
  actor: string;
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
  retainedFunctions?: import('@gnr8/runtime-contracts').RetainedFunctions;
  /** Internal operator acquisition boundary. The normal importer still checks
   * responses and closes the graph; this is not exposed in action payloads.
   */
  dependencyAcquisition?: {
    fetchImpl: NonNullable<Parameters<typeof captureAssetsForAdditionalHtmlPages>[0]["fetchImpl"]>;
    evidence: DependencyAcquisitionEvidence[];
  };
}, persistence = capturePersistence): Promise<DerivedCaptureResult> {
  let parentSiteVersion = input.parentSiteVersion;
  let parentArtifact = input.parentArtifact;
  let parentRawArtifact = input.parentRawArtifact;
  let derivedSiteVersionId = input.derivedSiteVersionId;
  let existingVersion = await persistence.getSiteVersion(derivedSiteVersionId);
  let resumableRawArtifact: RawImportedSiteArtifact | null = null;
  let resumableArtifact: RuntimeArtifact | null = null;
  let followedImmutableDerivedCapture = false;
  for (let depth = 0; existingVersion; depth += 1) {
    if (depth >= 8) throw new Error("astro_derived_capture_lineage_depth_exceeded");
    const lineage = existingVersion.importProvenanceSummary?.derivedCapture;
    if (
      existingVersion.siteId !== parentSiteVersion.siteId ||
      lineage?.parentSiteVersionId !== parentSiteVersion.id ||
      lineage.parentRawArtifactId !== parentRawArtifact.id
    ) throw new Error("astro_derived_capture_lineage_conflict");
    [resumableRawArtifact, resumableArtifact] = await Promise.all([
      persistence.getRawImportedSiteArtifact(existingVersion.id),
      existingVersion.artifactId ? getArtifactById(existingVersion.artifactId) : Promise.resolve(null),
    ]);
    assertDerivedCaptureGitResumeLineage({parentRawArtifact,derivedSiteVersionId:existingVersion.id,
      resumableRawArtifact,resumableArtifact});
    if (resumableRawArtifact && resumableArtifact) {
      parentSiteVersion = existingVersion;
      parentArtifact = resumableArtifact;
      parentRawArtifact = resumableRawArtifact;
      followedImmutableDerivedCapture = true;
      derivedSiteVersionId = deriveDependencySuccessorSiteVersionId(existingVersion.id);
      existingVersion = await persistence.getSiteVersion(derivedSiteVersionId);
      resumableRawArtifact = null;
      resumableArtifact = null;
      continue;
    }
    break;
  }

  const persistedParentFiles = await persistence.getRawTemplateSiteArtifactFiles({
    siteVersionId: parentSiteVersion.id,
    artifactId: parentRawArtifact.id,
  });
  const inheritedCaptureRewrites = parentSiteVersion.importProvenanceSummary?.derivedCapture?.rewrites ?? [];
  assertPersistedCaptureDependencyEvidence({
    files: persistedParentFiles,
    artifact: parentRawArtifact,
    expectedArtifactId: typeof parentArtifact.manifest.rawArtifactId === "string"
      ? parentArtifact.manifest.rawArtifactId
      : parentRawArtifact.id,
    expectedSiteId: parentSiteVersion.siteId,
    expectedSiteVersionId: parentSiteVersion.id,
    ownedRewrites: inheritedCaptureRewrites,
  });
  // Restore only aliases proven by the intact capture manifest, after ownership
  // and every persisted file's integrity have been checked. These same bytes
  // feed planning, acquisition and immutable persistence.
  const restored = restoreRetainedStylesheetReferences(persistedParentFiles);
  const parentFiles = restored.files;
  const excludedRoutes = new Set((input.retainedFunctions?.excludedRoutes ?? (input.acceptedFunctionalReductions?.kind === "retained-presentation-v1"
    ? input.acceptedFunctionalReductions.excludedRoutes ?? [] : [])).map(entry=>entry.path.replace(/\/$/,'')));
  const servedHtmlPaths = new Set([
    parentRawArtifact.entryHtmlPath,
    ...routeMapFromProvenance(parentSiteVersion.importProvenanceSummary)
      .filter(route => !excludedRoutes.has(route.routePath.replace(/\/$/, "")))
      .map(route => route.rawFilePath),
  ]);
  // Plan dependencies only for the approved output scope. Parent rows and bytes
  // remain intact, including shared assets and the excluded historical HTML.
  const htmlFiles = parentFiles.filter((file) => servedHtmlPaths.has(file.path));
  const missingScriptUrls = input.retainedFunctions ? planRetainedThemeScriptDependencies({htmlFiles,
    sourceUrl:parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
    filePaths:new Set(parentFiles.map(file=>file.path))}) : [];
  const pageUrls = new Map(routeMapFromProvenance(parentSiteVersion.importProvenanceSummary)
    .map(route => [route.rawFilePath, route.finalUrl ?? route.sourceUrl]));
  const lazyImagePlan = planRetainedFallbackImages({
    htmlFiles, filePaths: new Set(Object.keys(parentRawArtifact.fileMap)),
    sourceUrl: parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
    pageUrls,
    sourceMediaLinks: input.acceptedFunctionalReductions?.kind === 'retained-source-links-v1' ? input.acceptedFunctionalReductions.sourceMediaLinks : undefined,
  });
  const stylesheetPlan = planStylesheetDependencies({
    htmlFiles,
    sourceUrl: parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
    filePaths: new Set(parentFiles.map((file) => file.path)),
    removeFormCaptcha: Boolean(
      input.acceptedFunctionalReductions?.sourceWidgetRemovals?.includes("form-captcha"),
    ),
  });
  const inheritedStylesheetRewrites = inheritedCaptureRewrites
    .filter(entry => parentFiles.some(file => file.path === entry.to.replace(/^\/+/, "") && /^text\/css\b/i.test(file.mediaType)))
    .filter((entry) => !restored.rewrites.some((restoredEntry) => restoredEntry.to === entry.to))
    .map((entry) => ({ ...entry, reused: true }));
  inheritedStylesheetRewrites.push(...restored.rewrites);
  const inheritedStylesheetPaths = new Set([...inheritedStylesheetRewrites, ...stylesheetPlan.rewrites].map((entry) => entry.to.replace(/^\/+/, "")));
  const retainedLocalStylesheetRoots = planRetainedLocalStylesheetRoots({
    htmlFiles,
    filePaths: new Set(parentFiles.map((file) => file.path)),
    sourceUrl: parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
  }).filter((entry) => !inheritedStylesheetPaths.has(entry.to.replace(/^\/+/, "")));
  const retainedStylesheetRewrites = mergeStylesheetRewrites([
    ...inheritedStylesheetRewrites,
    ...stylesheetPlan.rewrites,
    ...retainedLocalStylesheetRoots,
  ]).filter((entry) => parentFiles.some((file) => file.path === entry.to.replace(/^\/+/, "")));
  const retainedStylesheetImportPlan = planRetainedStylesheetImports({
    files: parentFiles,
    stylesheetRewrites: retainedStylesheetRewrites,
    filePaths: new Set(parentFiles.map((file) => file.path)),
  });
  const inheritedUnusedCssDependencies = parentSiteVersion.importProvenanceSummary?.derivedCapture?.unusedCssDependencies ?? [];
  const unusedCssDependencies = [
    ...inheritedUnusedCssDependencies,
    ...retainedStylesheetRewrites
    .filter((entry) => entry.reused)
    .flatMap((stylesheet) => {
      const stylesheetPath = stylesheet.to.replace(/^\/+/, "");
      const file = parentFiles.find((candidate) => candidate.path === stylesheetPath);
      if (!file) return [];
      return findProvablyUnusedCssDependencies({
        css: file.bytes.toString("utf8"),
        stylesheetUrl: stylesheet.from,
        htmlDocuments: htmlFiles.map((htmlFile) => htmlFile.bytes.toString("utf8")),
      }).map((dependency) => ({ stylesheetPath, ...dependency }));
    }),
  ].filter((entry, index, all) => all.findIndex((candidate) =>
    candidate.stylesheetPath === entry.stylesheetPath && candidate.resolvedUrl === entry.resolvedUrl,
  ) === index).sort((left, right) => left.resolvedUrl.localeCompare(right.resolvedUrl));
  const retainedStaticDependencyPlan = planReachableRetainedStaticDependencies({
    files: parentFiles,
    stylesheetRewrites: retainedStylesheetRewrites,
    filePaths: new Set(parentFiles.map((file) => file.path)),
    rootStylesheetPaths: retainedStylesheetRewrites.map((entry) => entry.to.replace(/^\/+/, "")),
    knownUnusedDependencyUrls: unusedCssDependencies.map((entry) => entry.resolvedUrl),
  });
  if (
    stylesheetPlan.missingUrls.length === 0 &&
    stylesheetPlan.rewrites.length === 0 &&
    retainedStylesheetImportPlan.missingUrls.length === 0 &&
    retainedStaticDependencyPlan.missingUrls.length === 0 &&
    lazyImagePlan.length === 0 &&
    missingScriptUrls.length === 0 &&
    !restored.changed
  ) {
    return {
      siteVersion: parentSiteVersion,
      artifact: parentArtifact,
      rawArtifact: parentRawArtifact,
      derived: followedImmutableDerivedCapture,
    };
  }

  const workspace = await mkdtemp(join(tmpdir(), "gnr8-derived-capture-"));
  try {
    for (const file of parentFiles) {
      const target = join(workspace, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.bytes);
    }
    const existingManifest: UrlImportFetchManifestEntry[] = retainedStylesheetRewrites
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
        byteLength: parentRawArtifact.fileMap[entry.to.replace(/^\/+/, "")]?.sizeBytes ?? null,
      }));
    existingManifest.push(...existingCssDependencyManifest({
      parentFiles,
      stylesheetRewrites: retainedStylesheetRewrites,
      filePaths: new Set(parentFiles.map((file) => file.path)),
      startingOccurrence: existingManifest.length,
    }));
    const missingStylesheetUrls = [...new Set([
      ...stylesheetPlan.missingUrls,
      ...retainedStylesheetImportPlan.missingUrls,
    ])].sort();
    const allStylesheetUrls = [...new Set([
      ...retainedStylesheetRewrites.map((entry) => entry.from),
      ...missingStylesheetUrls,
    ])].sort();
    const syntheticHtml = `<!doctype html><html><head>${allStylesheetUrls
      .map((url) => `<link rel="stylesheet" href="${escapeAttribute(url)}">`)
      .join("")}${missingScriptUrls.map(url=>`<script src="${escapeAttribute(url)}"></script>`).join('')}</head><body>${[...new Set(lazyImagePlan.map(entry => entry.sourceUrl))]
        .map(url => `<img src="${escapeAttribute(url)}">`).join("")}</body></html>`;
    const capture = await captureAssetsForAdditionalHtmlPages({
      pages: [{
        pageUrl: parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
        bodyPath: join(workspace, "dependency-probe.html"),
        html: syntheticHtml,
      }],
      snapshotRootDirAbs: workspace,
      existingFetchManifest: existingManifest,
      fetchImpl: input.dependencyAcquisition?.fetchImpl,
      retainedScriptDependencyUrls: missingScriptUrls,
      trustedExternalOrigins: trustedOriginsForStylesheets([
        ...allStylesheetUrls,
        ...importOriginsFromRetainedStylesheets(parentFiles),
        ...retainedStaticDependencyPlan.missingUrls,
      ]),
      knownUnusedStylesheetDependencyUrls: unusedCssDependencies.map((entry) => entry.resolvedUrl),
    });
    if (capture.summary.failedRequiredAssetCount > 0) {
      throw new Error(`astro_derived_capture_dependency_fetch_failed:${capture.summary.failedRequiredResources.join(",")}`);
    }
    for(const url of missingScriptUrls)if(!capture.manifestEntries.some(entry=>entry.assetKind==='script'&&entry.fetchStatus==='fetched'&&entry.resolvedUrl===url))
      throw new Error('astro_derived_capture_theme_script_missing');
    const fetchedStylesheetEntries = capture.manifestEntries.filter((entry) =>
      entry.assetKind === "stylesheet" && entry.fetchStatus === "fetched" && entry.resolvedUrl && entry.localPath,
    );
    const fetchedStylesheetRewrites: Array<{ from: string; to: string; reused: boolean }> = [];
    for (const url of missingStylesheetUrls) {
      const entry = fetchedStylesheetEntries.find((candidate) => candidate.resolvedUrl === url);
      if (!entry?.localPath) throw new Error(`astro_derived_capture_stylesheet_missing:${url}`);
      fetchedStylesheetRewrites.push({ from: url, to: `/${entry.localPath}`, reused: false });
      if (stylesheetPlan.missingUrls.includes(url)) {
        stylesheetPlan.rewrites.push({ from: url, to: `/${entry.localPath}`, reused: false });
      }
    }

    const fetchedPaths = [...new Set(capture.manifestEntries
      .filter((entry) => entry.fetchStatus === "fetched" && entry.localPath)
      .map((entry) => entry.localPath!))]
      .filter((filePath) => !parentRawArtifact.fileMap[filePath]);
    const fetchedStaticDependencyEntries = capture.manifestEntries.filter((entry) =>
      entry.fetchStatus === "fetched" &&
      entry.localPath &&
      entry.resolvedUrl &&
      retainedStaticDependencyPlan.missingUrls.includes(entry.resolvedUrl),
    );
    const fallbackImageRewrites = lazyImagePlan.map(image => {
      const entry = capture.manifestEntries.find(entry => entry.assetKind === "image" && entry.fetchStatus === "fetched" && entry.resolvedUrl === image.sourceUrl && entry.localPath);
      if (!entry?.localPath) throw new Error(`astro_derived_capture_fallback_image_missing:${image.sourceUrl}`);
      return { ...image, to: `/${entry.localPath}` };
    });
    const missingFetchedStaticDependencies = retainedStaticDependencyPlan.missingUrls.filter((url) =>
      !fetchedStaticDependencyEntries.some((entry) => entry.resolvedUrl === url),
    );
    if (missingFetchedStaticDependencies.length > 0) {
      throw new Error(`astro_derived_capture_static_dependency_missing:${missingFetchedStaticDependencies.join(",")}`);
    }
    if (missingStylesheetUrls.length === 0 && retainedStaticDependencyPlan.missingUrls.length > 0 && lazyImagePlan.length === 0) {
      const expectedStaticPaths = new Set(fetchedStaticDependencyEntries.map((entry) => entry.localPath!));
      const unexpectedPaths = fetchedPaths.filter((filePath) => !expectedStaticPaths.has(filePath));
      if (unexpectedPaths.length > 0 || expectedStaticPaths.size !== retainedStaticDependencyPlan.missingUrls.length) {
        throw new Error(`astro_derived_capture_static_supplement_scope_mismatch:${unexpectedPaths.join(",")}`);
      }
    }
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
    if (input.dependencyAcquisition?.evidence.length) {
      const sources = input.dependencyAcquisition.evidence.map((source) => {
        const entry = capture.manifestEntries.find((candidate) => candidate.resolvedUrl &&
          dependencyRequestUrl(candidate.resolvedUrl) === dependencyRequestUrl(source.sourceUrl) && candidate.fetchStatus === "fetched");
        if (!entry?.localPath || !Number.isFinite(Date.parse(source.retrievedAt)) ||
          !/^[a-f0-9]{64}$/.test(source.sha256) || !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes <= 0) {
          throw new Error("astro_derived_capture_acquisition_evidence_invalid");
        }
        return { ...source, localPath: entry.localPath };
      }).sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl));
      const bytes = Buffer.from(stableStringify({
        kind: "derived_dependency_acquisition_v1",
        parentSiteVersionId: parentSiteVersion.id,
        parentRawArtifactId: parentRawArtifact.id,
        sources,
      }), "utf8");
      const digest = sha256(bytes);
      const path = `dependency-acquisition/${digest}.json`;
      if (!parentRawArtifact.fileMap[path]) newFiles.push({ path, mediaType: "application/json", sizeBytes: bytes.length, sha256: digest, bytes });
    }
    const rewrites = mergeStylesheetRewrites([
      ...retainedStylesheetRewrites,
      ...stylesheetPlan.rewrites,
      ...fetchedStylesheetRewrites,
      ...fetchedStaticDependencyEntries.map((entry) => ({
        from: entry.resolvedUrl!,
        to: `/${entry.localPath!}`,
        reused: false,
      })),
      ...fallbackImageRewrites.map(image => ({from:image.sourceUrl,to:image.to,reused:false})),
    ])
      .map(({ from, to }) => ({ from, to }))
      .sort((left, right) => left.from.localeCompare(right.from));
    const rewrittenParentFiles = await Promise.all(parentFiles.map(async (file) => {
      if (/\.html?$/i.test(file.path)) {
        if (!servedHtmlPaths.has(file.path)) return file;
        let html = rewriteStylesheetReferences(file.bytes.toString("utf8"), rewrites,
          parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl);
        html = rewriteRetainedFallbackImages(html, fallbackImageRewrites.filter(image => image.htmlPath === file.path));
        const bytes = Buffer.from(html, "utf8");
        return { ...file, bytes, sizeBytes: bytes.byteLength, sha256: sha256(bytes) };
      }
      if (/(?:^text\/css\b|\.css$)/i.test(`${file.mediaType} ${file.path}`)) {
        const bytes = await readFile(join(workspace, ...file.path.split("/")));
        return { ...file, bytes, sizeBytes: bytes.byteLength, sha256: sha256(bytes) };
      }
      return file;
    }));
    const derivedFiles = [...rewrittenParentFiles, ...newFiles]
      .sort((left, right) => left.path.localeCompare(right.path));
    const unresolvedDependencies = findUnresolvedRetainedStylesheetDependencies({
      files: derivedFiles,
      rootStylesheetPaths: [...new Set([
        ...retainedStaticDependencyPlan.reachableStylesheetPaths,
        ...fetchedStylesheetEntries.map((entry) => entry.localPath!),
      ])],
      knownUnusedDependencyUrls: unusedCssDependencies.map((entry) => entry.resolvedUrl),
      stylesheetSourceUrlsByPath: Object.fromEntries(retainedStylesheetRewrites.map((entry) => [
        entry.to.replace(/^\/+/, ""),
        entry.from,
      ])),
    });
    if (unresolvedDependencies.length > 0) {
      throw new Error(`astro_derived_capture_dependency_closure_incomplete:${unresolvedDependencies.join(",")}`);
    }
    const parentFilesSha256 = filesSha256(persistedParentFiles);
    const derivedFilesSha256 = filesSha256(derivedFiles);
    const provenance = structuredClone(parentSiteVersion.importProvenanceSummary ?? {}) as RuntimeImportProvenanceSummary;
    const rewrittenHtmlFiles = rewrittenParentFiles
      .filter((file) => /\.html?$/i.test(file.path))
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
    if (missingStylesheetUrls.length === 0 && retainedStaticDependencyPlan.missingUrls.length > 0 && lazyImagePlan.length === 0 && rewrittenHtmlFiles.length > 0) {
      throw new Error(`astro_derived_capture_static_supplement_html_changed:${rewrittenHtmlFiles.map((file) => file.path).join(",")}`);
    }
    refreshDerivedHtmlProvenance(provenance, rewrittenHtmlFiles);
    provenance.derivedCapture = {
      kind: "dependency_complete_derived_capture_v1",
      parentSiteVersionId: parentSiteVersion.id,
      parentArtifactId: parentArtifact.id,
      parentRawArtifactId: parentRawArtifact.id,
      parentFilesSha256,
      derivedFilesSha256,
      dependencyUrls: [...new Set([
        ...missingStylesheetUrls,
        ...missingScriptUrls,
        ...lazyImagePlan.map(image => image.sourceUrl),
        ...fetchedStaticDependencyEntries.map((entry) => entry.resolvedUrl!),
      ])].sort(),
      unusedCssDependencies,
      rewrites,
      rewrittenHtmlFiles,
    };
    const parentGitArchive = parentRawArtifact.metadata.gitArchive;
    const derivedGitArchive = parentGitArchive && !resumableRawArtifact
      ? await (async () => {
          if (parentGitArchive.scope.siteId !== input.ownershipSiteId)
            throw new Error('astro_derived_capture_git_ownership_mismatch');
          const {resolvedGitHubTarget} = await import('../stacki/stacki-github-config');
          const {GitHubStackiStore} = await import('../stacki/stacki-github-store');
          const scope = parentGitArchive.scope;
          const storeScope = {...scope,siteVersionId:derivedSiteVersionId};
          const target = await resolvedGitHubTarget(storeScope);
          if(!target)throw Error('source_capture_git_target_missing');
          const store = new GitHubStackiStore(storeScope,target);
          const archive = await writeRawImportGitArchive({scope,runtimeSiteId:parentRawArtifact.siteId,
            siteVersionId:derivedSiteVersionId,files:derivedFiles,target},
          {repository:()=>store.rawImportRepository(derivedSiteVersionId)});
          return {scope,repository:archive.repository,commit:archive.commit,
            manifestPath:archive.manifestPath,manifestSha256:archive.manifestSha256};
        })()
      : undefined;
    const createdVersion = existingVersion
      ? { siteVersionId: existingVersion.id }
      : await persistence.createSiteVersionFromMigration({
          siteId: parentSiteVersion.siteId,
          siteVersionId: derivedSiteVersionId,
          sourceUrl: parentRawArtifact.metadata.finalUrl ?? parentRawArtifact.metadata.sourceUrl,
          actor: input.actor,
          pages: parentSiteVersion.pages,
          importProvenanceSummary: provenance,
          rendererCompatibilityVersion: parentSiteVersion.rendererCompatibilityVersion,
          createSourceHostBinding: false,
        });
    await persistence.linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: createdVersion.siteVersionId,
      ownershipSiteId: input.ownershipSiteId,
    });
    if (resumableRawArtifact) assertFileRowsMatchManifest(derivedFiles, resumableRawArtifact);
    const rawResult = resumableRawArtifact
      ? { artifactId: resumableRawArtifact.id }
      : await persistence.persistRawImportedSiteArtifact({
          siteId: parentRawArtifact.siteId,
          siteVersionId: createdVersion.siteVersionId,
          entryHtmlPath: parentRawArtifact.entryHtmlPath,
          assetBasePath: parentRawArtifact.assetBasePath,
          fileRows: derivedFiles,
          metadata: {
            ...parentRawArtifact.metadata,
            gitArchive: derivedGitArchive,
            diagnostics: {
              codes: [...new Set([
                ...parentRawArtifact.metadata.diagnostics.codes,
                "DEPENDENCY_COMPLETE_DERIVED_CAPTURE",
              ])],
            },
            assetSummary: {
              persistedAssetCount: derivedFiles.length,
              externalFallbackAssetCount: 0,
            },
          },
        });
    const {generatedGitArchive: _parentGeneratedGitArchive, ...parentManifest} = parentArtifact.manifest;
    const manifestBase = {
      ...structuredClone(parentManifest),
      sourceKind: "dependency_complete_derived_capture",
      parentSiteVersionId: parentSiteVersion.id,
      parentArtifactId: parentArtifact.id,
      parentRawArtifactId: parentRawArtifact.id,
      rawArtifactId: rawResult.artifactId,
      derivedFilesSha256,
    };
    const existingGeneratedGitArchive = resumableArtifact?.manifest.generatedGitArchive;
    const effectiveDerivedGitArchive = derivedGitArchive ?? resumableRawArtifact?.metadata.gitArchive;
    if (effectiveDerivedGitArchive && effectiveDerivedGitArchive.manifestPath !==
      `raw-import/${createdVersion.siteVersionId}/.gnr8-import-manifest.json`)
      throw new Error('astro_derived_capture_raw_git_lineage_mismatch');
    if (existingGeneratedGitArchive && (
      typeof existingGeneratedGitArchive !== 'object' ||
      (existingGeneratedGitArchive as {manifestPath?:unknown}).manifestPath !==
        `generated/${createdVersion.siteVersionId}/.gnr8-generated-manifest.json`
    )) throw new Error('astro_derived_capture_generated_git_lineage_mismatch');
    const generatedGitArchive = existingGeneratedGitArchive ?? (effectiveDerivedGitArchive && !resumableArtifact
      ? await (async () => {
          const {resolvedGitHubTarget} = await import('../stacki/stacki-github-config');
          const {GitHubStackiStore} = await import('../stacki/stacki-github-store');
          const scope = effectiveDerivedGitArchive.scope;
          const storeScope = {...scope,siteVersionId:createdVersion.siteVersionId};
          const target = await resolvedGitHubTarget(storeScope);
          if(!target)throw Error('source_capture_git_target_missing');
          const store = new GitHubStackiStore(storeScope,target);
          return writeGeneratedArtifactGitArchive({scope,runtimeSiteId:parentArtifact.siteId,
            siteVersionId:createdVersion.siteVersionId,htmlByPath:parentArtifact.htmlByPath,
            compiledTokenStyles:parentArtifact.compiledTokenStyles,manifest:manifestBase,target},
          {repository:branch=>store.immutableRepository(branch)});
        })()
      : undefined);
    if (generatedGitArchive && !resumableArtifact) {
      await new GeneratedArtifactGitCache().prepare(generatedGitArchive as Awaited<ReturnType<typeof writeGeneratedArtifactGitArchive>>,
        createdVersion.siteVersionId,{htmlByPath:parentArtifact.htmlByPath,
          compiledTokenStyles:parentArtifact.compiledTokenStyles,manifest:manifestBase});
    }
    const manifest = generatedGitArchive ? {...manifestBase,generatedGitArchive} : manifestBase;
    const artifactBundleSha256 = computeRuntimeArtifactBundleSha256({
      htmlByPath: parentArtifact.htmlByPath,
      compiledTokenStyles: parentArtifact.compiledTokenStyles,
      assetFingerprintMap: parentArtifact.assetFingerprintMap,
      manifest,
    });
    if (resumableArtifact && resumableArtifact.bundleSha256 !== artifactBundleSha256) {
      throw new Error("astro_derived_capture_artifact_conflict");
    }
    const createdArtifactId = resumableArtifact?.id ?? (await persistence.createArtifact({
        siteId: parentArtifact.siteId,
        siteVersionId: createdVersion.siteVersionId,
        rendererCompatibilityVersion: parentArtifact.rendererCompatibilityVersion,
        bundleSha256: artifactBundleSha256,
        htmlByPath: parentArtifact.htmlByPath,
        compiledTokenStyles: parentArtifact.compiledTokenStyles,
        assetFingerprintMap: parentArtifact.assetFingerprintMap,
        manifest,
        publishStage: parentArtifact.publishStage,
        shadowRestricted: parentArtifact.shadowRestricted,
        artifactGovernance: parentArtifact.artifactGovernance,
      })).artifactId;
    await persistence.bindArtifactToVersion({
      siteVersionId: createdVersion.siteVersionId,
      artifactId: createdArtifactId,
      rendererCompatibilityVersion: parentArtifact.rendererCompatibilityVersion,
    });
    const [siteVersion, artifact, rawArtifact] = await Promise.all([
      persistence.getSiteVersion(createdVersion.siteVersionId),
      persistence.getArtifactById(createdArtifactId),
      persistence.getRawImportedSiteArtifact(createdVersion.siteVersionId),
    ]);
    if (!siteVersion || !artifact || !rawArtifact) throw new Error("astro_derived_capture_persistence_incomplete");
    return { siteVersion, artifact, rawArtifact, derived: true };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function mergeStylesheetRewrites(
  rewrites: Array<{ from: string; to: string; reused: boolean }>,
): Array<{ from: string; to: string; reused: boolean }> {
  const byIdentity = new Map<string, { from: string; to: string; reused: boolean }>();
  for (const rewrite of rewrites) byIdentity.set(`${rewrite.from}\0${rewrite.to}`, rewrite);
  return [...byIdentity.values()].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}

export function deriveDependencySuccessorSiteVersionId(parentSiteVersionId: string): string {
  const bytes = Buffer.from(createHash("sha256")
    .update(`gnr8-dependency-complete-derived-capture-successor:v1:${parentSiteVersionId}`)
    .digest()
    .subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function planRetainedStylesheetImports(input: {
  files: FileRow[];
  stylesheetRewrites: Array<{ from: string; to: string; reused: boolean }>;
  filePaths: ReadonlySet<string>;
}): { missingUrls: string[]; reusedUrls: string[] } {
  const missingUrls = new Set<string>();
  const reusedUrls = new Set<string>();
  const sourceUrlByPath = new Map(input.stylesheetRewrites.map((entry) => [entry.to.replace(/^\/+/, ""), entry.from]));
  for (const file of input.files.filter((candidate) => /(?:^text\/css\b|\.css$)/i.test(`${candidate.mediaType} ${candidate.path}`))) {
    const stylesheetPath = file.path;
    const stylesheetSourceUrl = sourceUrlByPath.get(stylesheetPath);
    for (const match of file.bytes.toString("utf8").matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      if (!rawReference || rawReference.startsWith("data:") || rawReference.startsWith("#")) continue;
      const retainedPath = resolveRetainedCssDependencyPath({
        stylesheetPath,
        rawReference,
        filePaths: input.filePaths,
      });
      if (retainedPath) {
        reusedUrls.add(sourceUrlByPath.get(retainedPath) ?? rawReference);
        continue;
      }
      let resolvedUrl: string;
      try {
        if (/^https?:\/\//i.test(rawReference)) resolvedUrl = new URL(rawReference).toString();
        else if (stylesheetSourceUrl) resolvedUrl = new URL(rawReference, stylesheetSourceUrl).toString();
        else continue;
      } catch {
        continue;
      }
      if (!/^https?:\/\//i.test(resolvedUrl)) continue;
      const localPath = computeLocalPathCandidate({ resolvedUrl, assetKind: "stylesheet" });
      if (input.filePaths.has(localPath)) reusedUrls.add(resolvedUrl);
      else missingUrls.add(resolvedUrl);
    }
  }
  return {
    missingUrls: [...missingUrls].sort(),
    reusedUrls: [...reusedUrls].sort(),
  };
}

export function planRetainedLocalStylesheetRoots(input: {
  htmlFiles: FileRow[];
  filePaths: ReadonlySet<string>;
  sourceUrl: string;
}): Array<{ from: string; to: string; reused: boolean }> {
  const roots = new Map<string, { from: string; to: string; reused: boolean }>();
  for (const file of input.htmlFiles) {
    const html = file.bytes.toString("utf8");
    for (const match of html.matchAll(/\bhref\s*=\s*(["'])([^"']+\.css(?:[?#][^"']*)?)\1/gi)) {
      const rawReference = String(match[2] ?? "").replaceAll("&amp;", "&").trim();
      let resolvedUrl: URL;
      try { resolvedUrl = new URL(rawReference, input.sourceUrl); } catch { continue; }
      if (!/^https?:$/.test(resolvedUrl.protocol)) continue;
      const localPath = decodeOwnedPathname(resolvedUrl.pathname);
      if (!localPath || !input.filePaths.has(localPath)) continue;
      const root = { from: resolvedUrl.toString(), to: `/${localPath}`, reused: true };
      roots.set(`${root.from}\0${root.to}`, root);
    }
  }
  return [...roots.values()].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}

export function planReachableRetainedStaticDependencies(input: {
  files: FileRow[];
  stylesheetRewrites: Array<{ from: string; to: string; reused: boolean }>;
  filePaths: ReadonlySet<string>;
  rootStylesheetPaths: string[];
  knownUnusedDependencyUrls?: string[];
}): { missingUrls: string[]; reusedUrls: string[]; reachableStylesheetPaths: string[] } {
  const cssByPath = new Map(input.files
    .filter((candidate) => /(?:^text\/css\b|\.css$)/i.test(`${candidate.mediaType} ${candidate.path}`))
    .map((file) => [file.path, file]));
  const sourceUrlsByPath = new Map<string, string[]>();
  const pathBySourceUrl = new Map<string, string>();
  for (const rewrite of input.stylesheetRewrites) {
    const stylesheetPath = rewrite.to.replace(/^\/+/, "");
    const sources = sourceUrlsByPath.get(stylesheetPath) ?? [];
    sources.push(rewrite.from);
    sourceUrlsByPath.set(stylesheetPath, sources);
    pathBySourceUrl.set(rewrite.from, stylesheetPath);
  }
  const pending = [...new Set(input.rootStylesheetPaths.filter((filePath) => cssByPath.has(filePath)))].sort();
  const visited = new Set<string>();
  const missingUrls = new Set<string>();
  const reusedUrls = new Set<string>();
  const knownUnusedDependencyUrls = new Set(input.knownUnusedDependencyUrls ?? []);
  while (pending.length > 0) {
    const stylesheetPath = pending.shift()!;
    if (visited.has(stylesheetPath)) continue;
    visited.add(stylesheetPath);
    const file = cssByPath.get(stylesheetPath);
    if (!file) continue;
    const stylesheetSourceUrl = sourceUrlsByPath.get(stylesheetPath)?.[0] ?? null;
    const css = file.bytes.toString("utf8");
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      const ownedPath = resolveRetainedCssDependencyPath({
        stylesheetPath,
        rawReference,
        filePaths: input.filePaths,
      });
      const resolvedUrl = ownedPath ? null : resolveCssSourceUrl(rawReference, stylesheetSourceUrl);
      const retainedPath = ownedPath ?? (resolvedUrl ? pathBySourceUrl.get(resolvedUrl) : null);
      if (retainedPath && cssByPath.has(retainedPath) && !visited.has(retainedPath)) pending.push(retainedPath);
    }
    for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      if (!rawReference || rawReference.startsWith("data:") || rawReference.startsWith("#")) continue;
      const retainedRelativePath = resolveRetainedCssDependencyPath({
        stylesheetPath,
        rawReference,
        filePaths: input.filePaths,
      });
      if (retainedRelativePath) {
        reusedUrls.add(sourceUrlsByPath.get(retainedRelativePath)?.[0] ?? rawReference);
        continue;
      }
      const resolvedUrl = resolveCssSourceUrl(rawReference, stylesheetSourceUrl);
      if (!resolvedUrl || !isSupportedStaticCssDependency(resolvedUrl)) continue;
      if (knownUnusedDependencyUrls.has(resolvedUrl)) continue;
      const mappedPath = pathBySourceUrl.get(resolvedUrl);
      const assetKind = /\.(?:apng|avif|gif|ico|jpe?g|png|svg|webp|bmp|tiff?)(?:[?#]|$)/i.test(new URL(resolvedUrl).pathname)
        ? "image" as const
        : "style_asset" as const;
      const deterministicPath = computeLocalPathCandidate({ resolvedUrl, assetKind });
      if (
        (mappedPath && input.filePaths.has(mappedPath)) ||
        input.filePaths.has(deterministicPath)
      ) reusedUrls.add(resolvedUrl);
      else missingUrls.add(resolvedUrl);
    }
  }
  return {
    missingUrls: [...missingUrls].sort(),
    reusedUrls: [...reusedUrls].sort(),
    reachableStylesheetPaths: [...visited].sort(),
  };
}

export function planRetainedFontDependencies(input: {
  files: FileRow[];
  stylesheetRewrites: Array<{ from: string; to: string; reused: boolean }>;
  filePaths: ReadonlySet<string>;
}): { missingUrls: string[]; reusedUrls: string[] } {
  const missingUrls = new Set<string>();
  const reusedUrls = new Set<string>();
  const sourceUrlByPath = new Map(input.stylesheetRewrites.map((entry) => [entry.to.replace(/^\/+/, ""), entry.from]));
  for (const file of input.files.filter((candidate) => /(?:^text\/css\b|\.css$)/i.test(`${candidate.mediaType} ${candidate.path}`))) {
    const stylesheetSourceUrl = sourceUrlByPath.get(file.path);
    for (const match of file.bytes.toString("utf8").matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      if (!rawReference || rawReference.startsWith("data:") || rawReference.startsWith("#")) continue;
      const retainedPath = resolveRetainedCssDependencyPath({
        stylesheetPath: file.path,
        rawReference,
        filePaths: input.filePaths,
      });
      if (retainedPath && /\.(?:woff2?|ttf|otf|eot)$/i.test(retainedPath)) {
        reusedUrls.add(sourceUrlByPath.get(retainedPath) ?? rawReference);
        continue;
      }
      let resolvedUrl: string;
      try {
        if (/^https?:\/\//i.test(rawReference)) resolvedUrl = new URL(rawReference).toString();
        else if (stylesheetSourceUrl) resolvedUrl = new URL(rawReference, stylesheetSourceUrl).toString();
        else continue;
      } catch {
        continue;
      }
      if (!/\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test(new URL(resolvedUrl).pathname)) continue;
      const deterministicPath = computeLocalPathCandidate({ resolvedUrl, assetKind: "style_asset" });
      if (input.filePaths.has(deterministicPath)) reusedUrls.add(resolvedUrl);
      else missingUrls.add(resolvedUrl);
    }
  }
  return {
    missingUrls: [...missingUrls].sort(),
    reusedUrls: [...reusedUrls].sort(),
  };
}

export function findUnresolvedRetainedStylesheetDependencies(input: {
  files: FileRow[];
  rootStylesheetPaths: string[];
  knownUnusedDependencyUrls?: string[];
  stylesheetSourceUrlsByPath?: Record<string, string>;
}): string[] {
  const filePaths = new Set(input.files.map((file) => file.path));
  const cssByPath = new Map(input.files
    .filter((candidate) => /(?:^text\/css\b|\.css$)/i.test(`${candidate.mediaType} ${candidate.path}`))
    .map((file) => [file.path, file]));
  const unresolved = new Set<string>();
  const knownUnusedDependencyUrls = new Set(input.knownUnusedDependencyUrls ?? []);
  const pending = [...new Set(input.rootStylesheetPaths)].sort();
  const visited = new Set<string>();
  while (pending.length > 0) {
    const stylesheetPath = pending.shift()!;
    if (visited.has(stylesheetPath)) continue;
    visited.add(stylesheetPath);
    const file = cssByPath.get(stylesheetPath);
    if (!file) {
      unresolved.add(`${stylesheetPath}->missing_stylesheet`);
      continue;
    }
    const css = file.bytes.toString("utf8");
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      const target = resolveClosureReference({
        stylesheetPath: file.path,
        rawReference,
        filePaths,
        unresolved,
        knownUnusedDependencyUrls,
        stylesheetSourceUrl: input.stylesheetSourceUrlsByPath?.[file.path] ?? null,
      });
      if (target && cssByPath.has(target) && !visited.has(target)) pending.push(target);
    }
    for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const rawReference = String(match[2] ?? "").trim();
      resolveClosureReference({
        stylesheetPath: file.path,
        rawReference,
        filePaths,
        unresolved,
        knownUnusedDependencyUrls,
        stylesheetSourceUrl: input.stylesheetSourceUrlsByPath?.[file.path] ?? null,
      });
    }
  }
  return [...unresolved].sort();
}

function resolveClosureReference(input: {
  stylesheetPath: string;
  rawReference: string;
  filePaths: ReadonlySet<string>;
  unresolved: Set<string>;
  knownUnusedDependencyUrls: ReadonlySet<string>;
  stylesheetSourceUrl: string | null;
}): string | null {
  if (!input.rawReference || input.rawReference.startsWith("data:") || input.rawReference.startsWith("#")) return null;
  const sourceResolvedUrl = resolveCssSourceUrl(input.rawReference, input.stylesheetSourceUrl);
  if (sourceResolvedUrl && input.knownUnusedDependencyUrls.has(sourceResolvedUrl)) return null;
  if (/^https?:\/\//i.test(input.rawReference)) {
    if (input.knownUnusedDependencyUrls.has(input.rawReference)) return null;
    input.unresolved.add(`${input.stylesheetPath}->${input.rawReference}`);
    return null;
  }
  if (input.rawReference.startsWith("//")) {
    const resolved = `https:${input.rawReference}`;
    if (input.knownUnusedDependencyUrls.has(resolved)) return null;
    input.unresolved.add(`${input.stylesheetPath}->${resolved}`);
    return null;
  }
  const withoutQueryOrHash = input.rawReference.split(/[?#]/, 1)[0] ?? "";
  let decoded = withoutQueryOrHash;
  try { decoded = decodeURIComponent(withoutQueryOrHash); } catch {
    input.unresolved.add(`${input.stylesheetPath}->${input.rawReference}`);
    return null;
  }
  const target = decoded.startsWith("/")
    ? posix.normalize(decoded.replace(/^\/+/, ""))
    : posix.normalize(posix.join(posix.dirname(input.stylesheetPath), decoded));
  if (!target || target === "." || target.startsWith("../") || !input.filePaths.has(target)) {
    input.unresolved.add(`${input.stylesheetPath}->${input.rawReference}`);
    return null;
  }
  return target;
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
  sourceUrl?: string;
}): {
  missingUrls: string[];
  rewrites: Array<{ from: string; to: string; reused: boolean }>;
} {
  const urls = new Set<string>();
  for (const file of input.htmlFiles) {
    for (let href of retainedStylesheetHrefs(file.bytes.toString("utf8"))) {
      if (href.startsWith("//") && input.sourceUrl) {
        try { href = new URL(href, input.sourceUrl).href; } catch { continue; }
      }
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

function retainedStylesheetHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const visit = (node: DefaultTreeAdapterMap["node"]): void => {
    if ("tagName" in node && node.tagName === "link") {
      const rel = node.attrs.find((attr) => attr.name === "rel")?.value ?? "";
      const href = node.attrs.find((attr) => attr.name === "href")?.value.trim();
      if (href && rel.toLowerCase().split(/\s+/).includes("stylesheet")) hrefs.push(href);
    }
    if ("childNodes" in node) node.childNodes.forEach(visit);
  };
  visit(parse(html));
  return hrefs;
}

function rewriteStylesheetReferences(html: string, rewrites: Array<{ from: string; to: string }>, sourceUrl: string): string {
  const byUrl = new Map(rewrites.map((entry) => [entry.from, entry.to]));
  return html.replace(/(<link\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gi, (full, prefix, quote, value, closing) => {
    let normalized = String(value).replaceAll("&amp;", "&");
    if (normalized.startsWith("//")) {
      try { normalized = new URL(normalized, sourceUrl).href; } catch { return full; }
    }
    const replacement = byUrl.get(normalized);
    return replacement ? `${prefix}${quote}${replacement}${closing}` : full;
  });
}

export function trustedOriginsForStylesheets(urls: string[]): string[] {
  const origins = new Set<string>();
  for (const value of urls) {
    try { origins.add(new URL(value).origin); } catch { /* rejected by the importer */ }
  }
  if (urls.some((url) => {
    try { return new URL(url).hostname === "fonts.googleapis.com"; } catch { return false; }
  })) {
    origins.add("https://fonts.gstatic.com");
  }
  if (urls.some((url) => {
    try { return new URL(url).origin === "https://fonts.prod.extra-cdn.com"; } catch { return false; }
  })) {
    origins.add("https://font-files.prod.extra-cdn.com");
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

export function existingCssDependencyManifest(input: {
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
  const sourceUrlByOwnedPath = new Map(input.stylesheetRewrites.map((entry) => [entry.to.replace(/^\/+/, ""), entry.from]));
  for (const stylesheet of input.stylesheetRewrites) {
    const localPath = stylesheet.to.replace(/^\/+/, "");
    const file = input.parentFiles.find((candidate) => candidate.path === localPath);
    if (!file) continue;
    for (const match of file.bytes.toString("utf8").matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const rawRef = (match[2] ?? "").trim();
      if (!rawRef || rawRef.startsWith("data:") || rawRef.startsWith("#")) continue;
      const retainedPath = resolveRetainedCssDependencyPath({
        stylesheetPath: localPath,
        rawReference: rawRef,
        filePaths: input.filePaths,
      });
      let resolvedUrl = retainedPath ? sourceUrlByOwnedPath.get(retainedPath) ?? null : null;
      try { resolvedUrl ??= new URL(rawRef, stylesheet.from).toString(); } catch { continue; }
      const assetKind = /\.(?:apng|avif|gif|ico|jpe?g|png|svg|webp|bmp|tiff?)(?:[?#]|$)/i.test(resolvedUrl)
        ? "image" as const
        : "style_asset" as const;
      const dependencyPath = retainedPath ?? computeLocalPathCandidate({ resolvedUrl, assetKind });
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


function decodeOwnedPathname(pathname: string): string | null {
  const raw = pathname.replace(/^\/+/, "");
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const normalized = posix.normalize(decoded);
    return !normalized || normalized === "." || normalized.startsWith("../") || posix.isAbsolute(normalized)
      ? null
      : normalized;
  } catch {
    return null;
  }
}

function resolveCssSourceUrl(rawReference: string, stylesheetSourceUrl: string | null): string | null {
  if (!rawReference || rawReference.startsWith("data:") || rawReference.startsWith("#")) return null;
  try {
    if (rawReference.startsWith("//")) {
      const protocol = stylesheetSourceUrl ? new URL(stylesheetSourceUrl).protocol : "https:";
      return new URL(`${protocol}${rawReference}`).toString();
    }
    if (/^https?:\/\//i.test(rawReference)) return new URL(rawReference).toString();
    return stylesheetSourceUrl ? new URL(rawReference, stylesheetSourceUrl).toString() : null;
  } catch {
    return null;
  }
}

function isSupportedStaticCssDependency(value: string): boolean {
  try {
    return /\.(?:apng|avif|gif|ico|jpe?g|png|svg|webp|bmp|tiff?|woff2?|ttf|otf|eot)(?:$|[?#])/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function assertPersistedCaptureDependencyEvidence(input: {
  files: FileRow[];
  artifact: Pick<RawImportedSiteArtifact, "id" | "siteId" | "siteVersionId" | "fileMap">;
  expectedArtifactId: string;
  expectedSiteId: string;
  expectedSiteVersionId: string;
  ownedRewrites: Array<{ from: string; to: string }>;
}): void {
  if (
    input.artifact.id !== input.expectedArtifactId ||
    input.artifact.siteId !== input.expectedSiteId ||
    input.artifact.siteVersionId !== input.expectedSiteVersionId
  ) throw new Error("astro_derived_capture_owned_dependency_wrong_owner");
  assertFileRowsMatchManifest(input.files, input.artifact);
  const filePaths = new Set(input.files.map((file) => file.path));
  for (const rewrite of input.ownedRewrites) {
    const target = canonicalOwnedCapturePath(rewrite.to);
    if (!target) throw new Error(`astro_derived_capture_owned_dependency_path_invalid:${rewrite.to}`);
    if (!filePaths.has(target)) throw new Error(`astro_derived_capture_owned_dependency_missing:${target}`);
  }
}

function assertFileRowsMatchManifest(
  files: FileRow[],
  artifact: Pick<RawImportedSiteArtifact, "fileMap">,
): void {
  if (files.length !== Object.keys(artifact.fileMap).length) throw new Error("astro_derived_capture_parent_file_count_mismatch");
  for (const [filePath, expected] of Object.entries(artifact.fileMap)) {
    if (filePath !== expected.path || canonicalOwnedCapturePath(filePath) !== filePath) {
      throw new Error(`astro_derived_capture_parent_manifest_path_invalid:${filePath}`);
    }
  }
  for (const file of files) {
    const expected = artifact.fileMap[file.path];
    if (
      !expected ||
      file.mediaType !== expected.mediaType ||
      file.sizeBytes !== expected.sizeBytes ||
      file.sha256 !== expected.sha256 ||
      file.bytes.byteLength !== expected.sizeBytes ||
      sha256(file.bytes) !== expected.sha256
    ) {
      throw new Error(`astro_derived_capture_parent_file_mismatch:${file.path}`);
    }
  }
}

function canonicalOwnedCapturePath(reference: string): string | null {
  const withoutQueryOrHash = reference.trim().split(/[?#]/, 1)[0] ?? "";
  if (!withoutQueryOrHash || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(withoutQueryOrHash)) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(withoutQueryOrHash); } catch { return null; }
  if (!decoded || decoded.includes("\0") || decoded.includes("\\")) return null;
  const normalized = posix.normalize(decoded.replace(/^\/+/, ""));
  if (!normalized || normalized === "." || normalized.startsWith("../") || posix.isAbsolute(normalized)) return null;
  return normalized;
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
function dependencyRequestUrl(value: string): string {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("astro_derived_capture_acquisition_url_invalid");
  url.hash = "";
  if (!url.search) url.search = "";
  return url.href;
}
function escapeAttribute(value: string): string { return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;"); }

type FallbackImage = { htmlPath: string; reference: string; sourceUrl: string };
const htmlElements = (node: DefaultTreeAdapterMap['node']): DefaultTreeAdapterMap['element'][] =>
  ('childNodes' in node ? node.childNodes : []).flatMap(child => [...('tagName' in child ? [child] : []), ...htmlElements(child)]);
const htmlAttribute = (node: DefaultTreeAdapterMap['element'], name: string) => node.attrs.find(attr => attr.name === name)?.value;

/** The importer parses scripting-enabled HTML, so an image inside noscript may
 * have no acquired bytes. Acquire only the observed, paired lazy-image fallback,
 * from this site's origin; never execute the lazy-loader or crawl linked pages. */
export function planRetainedFallbackImages(input: {
  htmlFiles: FileRow[]; filePaths: ReadonlySet<string>; sourceUrl: string;
  pageUrls: ReadonlyMap<string,string>; sourceMediaLinks?: readonly string[];
}): FallbackImage[] {
  const result: FallbackImage[] = [];
  const origin = new URL(input.sourceUrl).origin;
  for (const file of input.htmlFiles) {
    const document = parse(file.bytes.toString('utf8'),{scriptingEnabled:false});
    for (const node of htmlElements(document).filter(node => node.tagName === 'noscript')) {
      const descendants = htmlElements(node);
      const images = descendants.filter(node => node.tagName === 'img');
      if (images.length !== 1 || descendants.some(node => !['img','picture','source'].includes(node.tagName))) continue;
      const reference = htmlAttribute(images[0]!, 'src');
      if (!reference || htmlAttribute(node,'data-lazyload-src') !== reference) continue;
      const siblings = node.parentNode?.childNodes ?? [];
      const previous = siblings.slice(0,siblings.indexOf(node)).reverse().find(child => 'tagName' in child);
      if (!previous || !('tagName' in previous) || previous.tagName !== 'img' ||
        !/^data:image\//.test(htmlAttribute(previous,'src') ?? '')) continue;
      let url: URL;
      try { url = new URL(reference,input.pageUrls.get(file.path) ?? input.sourceUrl); } catch { continue; }
      if (url.origin !== origin || !/^https?:$/.test(url.protocol) || url.username || url.password || !/\.(?:png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname)) continue;
      const ownedPath = decodeOwnedPathname(url.pathname);
      if (!ownedPath || input.filePaths.has(ownedPath)) continue;
      url.hash = '';
      if (input.sourceMediaLinks?.includes(url.href)) continue;
      result.push({htmlPath:file.path,reference,sourceUrl:url.href});
    }
  }
  return result.filter((entry,index) => result.findIndex(other => other.htmlPath === entry.htmlPath && other.reference === entry.reference) === index);
}

export function rewriteRetainedFallbackImages(html: string, rewrites: Array<FallbackImage & {to:string}>): string {
  if (!rewrites.length) return html;
  const byReference = new Map(rewrites.map(entry => [entry.reference,entry.to]));
  const document = parse(html,{scriptingEnabled:false});
  for (const node of htmlElements(document)) {
    for (const attribute of node.attrs) {
      if ((node.tagName === 'img' && attribute.name === 'src') || (node.tagName === 'noscript' && attribute.name === 'data-lazyload-src')) {
        attribute.value = byReference.get(attribute.value) ?? attribute.value;
      }
    }
  }
  return serialize(document);
}
