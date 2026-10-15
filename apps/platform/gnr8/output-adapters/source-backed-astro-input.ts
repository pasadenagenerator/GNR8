import { createHash } from "node:crypto";
import { parse, parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact } from "@/gnr8/runtime/types";
import { computeLocalPathCandidate } from "@/gnr8/validation/runtime/url-single-page-import";
import {
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
  routeMapFromProvenance,
} from "@/gnr8/runtime/raw-template-route-map-resolver";
import {
  rewriteRawTemplateCssForRuntime,
  rewriteRawTemplateHtmlForRuntime,
} from "@/src/public-site/raw-template-runtime";

import { createGeneratedOutputContentManifest, type GeneratedOutputContentManifest } from "./generated-output-eligibility";
import { encodeGeneratedOutputRoutePath } from "./generated-output-route-path";
import { createAstroStaticSiteProjectManifest, type NormalizedStaticBusinessSiteContent, type NormalizedStaticSitePage } from "./astro-static-site-adapter";
import type { OutputAdapterCapability } from "./output-adapter-selection";
import { removeProvablyUnusedCssDependencyRules } from "./source-backed-css-dependency-analysis";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

export class SourceBackedAstroUnsupportedError extends Error {
  readonly code = "unsupported_capability" as const;
  constructor(readonly unsupportedCapabilities: string[]) {
    super(`unsupported_capability:${unsupportedCapabilities.join(",")}`);
    this.name = "SourceBackedAstroUnsupportedError";
  }
}

export type SourceBackedAstroGenerationInput = {
  content: NormalizedStaticBusinessSiteContent;
  capabilities: OutputAdapterCapability[];
  outputPaths: string[];
  ownedAssetFingerprints: Record<string, string>;
  verification: {
    expectedContent: string[];
    expectedThemeToken: string | null;
    expectedStylesheetReferences?: string[];
  };
  contentManifest: GeneratedOutputContentManifest;
  sourceManifest: {
    adapterId: "astro-static-site";
    adapterVersion: "gnr8-output-adapter-selection:v1";
    sourceSiteVersionId: string;
    sourceArtifactId: string;
    files: Array<{ path: string; role: string; bytes: number; sha256: string; contents: string }>;
    assetEvidence: Array<{ path: string; mediaType: string; sizeBytes: number; sha256: string }>;
    acceptedFunctionalReductions?: {
      kind: "legacy-forms-to-disclosed-links-v1";
      contactEmail: string;
      commentLinks: "source-article";
      sourceWidgetRemovals?: SourceWidgetRemoval[];
      limitations: string[];
    };
    captureScopeLimitations?: Array<{
      kind: "acquisition-page-limit-external-link-v1";
      route: string;
      sourceUrl: string;
    }>;
  };
};

export type AcceptedSourceFunctionalReductions = {
  kind: "legacy-forms-to-disclosed-links-v1";
  contactEmail: string;
  commentLinks: "source-article";
  sourceWidgetRemovals?: SourceWidgetRemoval[];
};

export type SourceWidgetRemoval = "cookie-consent" | "form-captcha" | "back-to-top";

export type SourceBackedAstroGenerationSource = {
  htmlByPath: Record<string, string> & { "/": string };
  stylesheetCssByPath: Record<string, string>;
  ownedStylesheetEvidence: NonNullable<import("./astro-static-site-internal-preview-bridge").ConvertAstroExportToInternalPreviewCandidateInput["ownedStylesheetEvidence"]>;
};

export async function loadSourceBackedAstroHtmlByPath(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  rawArtifact: RawImportedSiteArtifact;
  getRawAsset: (input: {
    siteVersionId: string;
    artifactId: string;
    filePath: string;
  }) => Promise<{ mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer } | null>;
}): Promise<Record<string, string> & { "/": string }> {
  const routePaths = new Set<string>([
    "/",
    ...input.siteVersion.pages.map((page) => normalizeAstroOutputRoutePath(page.path)),
    ...routeMapFromProvenance(input.siteVersion.importProvenanceSummary).map((route) =>
      normalizeAstroOutputRoutePath(route.routePath),
    ),
  ]);
  const htmlByPath: Record<string, string> = {};

  for (const path of [...routePaths].sort((left, right) => left.localeCompare(right))) {
    const routeSource = resolveRawTemplateRouteMapFile({
      siteVersionId: input.siteVersion.id,
      requestedPath: path,
      entryHtmlPath: input.rawArtifact.entryHtmlPath,
      fileMap: input.rawArtifact.fileMap,
      importProvenanceSummary: input.siteVersion.importProvenanceSummary,
      routeMapServingEnabled: true,
    });
    if (routeSource.outcome !== "selected") {
      throw new SourceBackedAstroUnsupportedError([`source_route_lineage_missing:${path}`]);
    }
    const asset = await input.getRawAsset({
      siteVersionId: input.siteVersion.id,
      artifactId: input.rawArtifact.id,
      filePath: routeSource.rawFilePath,
    });
    if (!asset || asset.bytes.byteLength === 0) {
      throw new SourceBackedAstroUnsupportedError([`source_route_asset_missing:${path}`]);
    }
    if (!/text\/html|application\/xhtml\+xml/i.test(asset.mediaType)) {
      throw new SourceBackedAstroUnsupportedError([`source_route_asset_invalid_mime:${path}`]);
    }
    const expected = input.rawArtifact.fileMap[routeSource.rawFilePath];
    if (!expected || expected.sha256 !== asset.sha256 || expected.sizeBytes !== asset.sizeBytes) {
      throw new SourceBackedAstroUnsupportedError([`source_route_asset_identity_mismatch:${path}`]);
    }
    htmlByPath[path] = asset.bytes.toString("utf8");
  }

  if (!htmlByPath["/"]) throw new SourceBackedAstroUnsupportedError(["missing_root_route"]);
  return htmlByPath as Record<string, string> & { "/": string };
}

export async function loadSourceBackedAstroGenerationSource(input: Parameters<typeof loadSourceBackedAstroHtmlByPath>[0]): Promise<SourceBackedAstroGenerationSource> {
  const htmlByPath = await loadSourceBackedAstroHtmlByPath(input);
  const stylesheetCssByPath: Record<string, string> = {};
  const ownedStylesheetEvidence: SourceBackedAstroGenerationSource["ownedStylesheetEvidence"] = [];
  const fileMapPaths = new Set(Object.keys(input.rawArtifact.fileMap));
  const retainedByPath = new Map<string, {
    mediaType: string;
    sizeBytes: number;
    sha256: string;
    bytes: Buffer;
  }>();
  for (const file of Object.values(input.rawArtifact.fileMap)
    .filter((entry) => /(?:^text\/css\b|\.css$)/i.test(`${entry.mediaType} ${entry.path}`))
    .sort((left, right) => left.path.localeCompare(right.path))) {
    const asset = await input.getRawAsset({
      siteVersionId: input.siteVersion.id,
      artifactId: input.rawArtifact.id,
      filePath: file.path,
    });
    if (!asset || asset.bytes.byteLength === 0) {
      throw new SourceBackedAstroUnsupportedError([`source_stylesheet_asset_missing:${file.path}`]);
    }
    if (!/^text\/css\b/i.test(asset.mediaType)) {
      throw new SourceBackedAstroUnsupportedError([`source_stylesheet_asset_invalid_mime:${file.path}`]);
    }
    if (file.sha256 !== asset.sha256 || file.sizeBytes !== asset.sizeBytes) {
      throw new SourceBackedAstroUnsupportedError([`source_stylesheet_asset_identity_mismatch:${file.path}`]);
    }
    stylesheetCssByPath[file.path] = asset.bytes.toString("utf8");
    retainedByPath.set(file.path, {
      mediaType: asset.mediaType,
      sizeBytes: asset.sizeBytes,
      sha256: asset.sha256,
      bytes: Buffer.from(asset.bytes),
    });
  }
  const derivedCapture = input.siteVersion.importProvenanceSummary?.derivedCapture;
  const stylesheetSourceUrlByPath = new Map(
    (derivedCapture?.rewrites ?? []).map((entry) => [entry.to.replace(/^\/+/, ""), entry.from]),
  );
  const unusedCssDependenciesByPath = new Map<string, Set<string>>();
  for (const dependency of derivedCapture?.unusedCssDependencies ?? []) {
    const urls = unusedCssDependenciesByPath.get(dependency.stylesheetPath) ?? new Set<string>();
    urls.add(dependency.resolvedUrl);
    unusedCssDependenciesByPath.set(dependency.stylesheetPath, urls);
  }
  const htmlDocuments = Object.values(htmlByPath);
  const materializedByPath = new Map([...retainedByPath].map(([filePath, asset]) => {
    let css = asset.bytes.toString("utf8");
    const allowedUnusedUrls = unusedCssDependenciesByPath.get(filePath) ?? new Set<string>();
    const stylesheetUrl = stylesheetSourceUrlByPath.get(filePath);
    if (allowedUnusedUrls.size > 0) {
      if (!stylesheetUrl) {
        throw new SourceBackedAstroUnsupportedError([`source_stylesheet_unused_dependency_source_missing:${filePath}`]);
      }
      const pruned = removeProvablyUnusedCssDependencyRules({
        css,
        stylesheetUrl,
        htmlDocuments,
        allowedUnusedUrls,
      });
      if (pruned.removedUrls.length !== allowedUnusedUrls.size) {
        throw new SourceBackedAstroUnsupportedError([`source_stylesheet_unused_dependency_evidence_mismatch:${filePath}`]);
      }
      css = pruned.css;
    }
    css = rewriteRawTemplateCssForRuntime({
      css,
      siteId: input.rawArtifact.siteId,
      siteVersionId: input.rawArtifact.siteVersionId,
      assetFilePath: filePath,
      fileMapPaths,
    });
    return [filePath, css] as const;
  }));
  for (const [filePath, asset] of retainedByPath) {
    const materializedCss = inlineMaterializedCssImports({
      filePath,
      materializedByPath,
      siteId: input.rawArtifact.siteId,
      siteVersionId: input.rawArtifact.siteVersionId,
      stack: [],
    });
    const materializedBytes = Buffer.from(materializedCss, "utf8");
    ownedStylesheetEvidence.push({
      href: ownedAssetUrl(input.rawArtifact.siteId, input.rawArtifact.siteVersionId, filePath),
      siteId: input.rawArtifact.siteId,
      siteVersionId: input.rawArtifact.siteVersionId,
      artifactId: input.rawArtifact.id,
      filePath,
      mediaType: asset.mediaType,
      retainedSizeBytes: asset.sizeBytes,
      retainedSha256: asset.sha256,
      retainedBytes: Buffer.from(asset.bytes),
      materializedSizeBytes: materializedBytes.byteLength,
      materializedSha256: createHash("sha256").update(materializedBytes).digest("hex"),
      materializedBytes,
    });
  }
  return { htmlByPath, stylesheetCssByPath, ownedStylesheetEvidence };
}

function inlineMaterializedCssImports(input: {
  filePath: string;
  materializedByPath: ReadonlyMap<string, string>;
  siteId: string;
  siteVersionId: string;
  stack: string[];
}): string {
  if (input.stack.includes(input.filePath)) {
    throw new SourceBackedAstroUnsupportedError([`source_stylesheet_import_cycle:${[...input.stack, input.filePath].join("->")}`]);
  }
  const css = input.materializedByPath.get(input.filePath);
  if (css === undefined) throw new SourceBackedAstroUnsupportedError([`source_stylesheet_bytes_missing:${input.filePath}`]);
  const prefix = ownedAssetUrl(input.siteId, input.siteVersionId, "");
  return css.replace(
    /@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?\s*([^;]*);/gi,
    (full, _quote, reference, condition) => {
      const targetPath = ownedAssetPathFromUrl(String(reference), prefix)
        ?? deterministicOwnedStylesheetPath(String(reference), input.materializedByPath);
      if (!targetPath || !input.materializedByPath.has(targetPath)) {
        throw new SourceBackedAstroUnsupportedError([`source_stylesheet_import_missing:${input.filePath}:${reference}`]);
      }
      const imported = inlineMaterializedCssImports({
        ...input,
        filePath: targetPath,
        stack: [...input.stack, input.filePath],
      });
      const media = String(condition ?? "").trim();
      if (!media || media.toLowerCase() === "all") return imported;
      if (/^(?:layer|supports)\b/i.test(media)) {
        throw new SourceBackedAstroUnsupportedError([`source_stylesheet_import_condition_unsupported:${input.filePath}:${media}`]);
      }
      return `@media ${media}{${imported}}`;
    },
  );
}

function deterministicOwnedStylesheetPath(
  reference: string,
  materializedByPath: ReadonlyMap<string, string>,
): string | null {
  if (!/^https?:\/\//i.test(reference)) return null;
  try {
    const candidate = computeLocalPathCandidate({ resolvedUrl: reference, assetKind: "stylesheet" });
    return materializedByPath.has(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function createSourceBackedAstroGenerationInput(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  rawArtifact: RawImportedSiteArtifact;
  htmlByPath?: Record<string, string> & { "/": string };
  stylesheetCssByPath?: Record<string, string>;
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
}): SourceBackedAstroGenerationInput {
  const sourceHtmlByPath = input.htmlByPath ?? input.artifact.htmlByPath;
  const routes = Object.keys(sourceHtmlByPath).sort((left, right) => left.localeCompare(right));
  if (!routes.includes("/")) throw new SourceBackedAstroUnsupportedError(["missing_root_route"]);
  let pages = routes.map((path) => normalizePage({ ...input, path, html: sourceHtmlByPath[path] ?? "" }));
  const unsupported = new Set<string>();
  for (const page of pages) page.unsupported.forEach((item) => unsupported.add(item));
  const knownRoutes = new Map<string, string>();
  for (const route of routes) {
    const identity = canonicalRouteIdentity(route);
    const existing = knownRoutes.get(identity);
    if (existing && existing !== route) {
      throw new SourceBackedAstroUnsupportedError([`duplicate_route_identity:${existing}:${route}`]);
    }
    knownRoutes.set(identity, route);
  }
  const sourceHost = sourceHostFromRawArtifact(input.rawArtifact);
  const outOfScopeSourceUrls = acquisitionPageLimitSourceUrls(input.siteVersion.importProvenanceSummary, sourceHost);
  const captureScopeLimitations = new Map<string, string>();
  const normalizedPageNavigation = pages.map((page) => normalizePageNavigation({
    html: page.bodyHtml,
    sourceHost,
    knownRoutes,
    outOfScopeSourceUrls,
    captureScopeLimitations,
    unsupported,
  }));
  pages = pages.map((page, index) => ({
    ...page,
    bodyHtml: normalizedPageNavigation[index]!.html,
  }));
  const allNavigationItems = normalizedPageNavigation.flatMap((result) => result.items);
  const navItems = normalizedPageNavigation[routes.indexOf("/")]!.items.filter((item) => item.label);
  const dedupedNav = [...new Map(navItems.map((item) => [`${item.label}\0${item.href}`, item])).values()].slice(0, 24);

  if (unsupported.size > 0) throw new SourceBackedAstroUnsupportedError([...unsupported].sort());
  const rootPage = input.siteVersion.pages.find((page) => page.path === "/") ?? input.siteVersion.pages[0];
  const siteName = rootPage?.title?.trim() || sourceHost || "Generated website";
  const accent = normalizeHex(rootPage?.styleTokens?.["--color-accent"] ?? rootPage?.styleTokens?.["--color-primary"], "#2563eb");
  const background = normalizeHex(rootPage?.styleTokens?.["--color-background"], "#ffffff");
  const text = normalizeHex(rootPage?.styleTokens?.["--color-text"], "#0f172a");
  const fontFamily = String(rootPage?.styleTokens?.["--font-family"] ?? "").trim() || undefined;
  const ownedAssetFingerprints: Record<string, string> = Object.fromEntries(
    Object.values(input.rawArtifact.fileMap)
      .filter((file) => !/\.html?$/i.test(file.path))
      .map((file) => [ownedAssetUrl(input.rawArtifact.siteId, input.rawArtifact.siteVersionId, file.path), file.sha256])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const ownedAssetEvidence = Object.values(input.rawArtifact.fileMap)
    .filter((file) => !/\.html?$/i.test(file.path))
    .map((file) => ({
      path: ownedAssetUrl(input.rawArtifact.siteId, input.rawArtifact.siteVersionId, file.path),
      mediaType: file.mediaType,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const normalizedPages: NormalizedStaticSitePage[] = pages.map((page) => ({
    path: page.path,
    title: page.title || siteName,
    ...(page.headHtml ? { headHtml: page.headHtml } : {}),
    ...(Object.keys(page.bodyAttributes).length > 0 ? { bodyAttributes: page.bodyAttributes } : {}),
    bodyHtml: page.bodyHtml,
  }));
  const content: NormalizedStaticBusinessSiteContent = {
    siteName,
    brandName: siteName,
    navItems: dedupedNav.length > 0 ? dedupedNav : routes.map((path) => ({ label: path === "/" ? "Home" : path.slice(1), href: path })),
    hero: { headline: siteName, body: "", ctaLabel: "", ctaHref: "/" },
    sections: [],
    contact: { heading: "", body: "" },
    footer: { text: siteName },
    theme: { accentHex: accent, backgroundHex: background, textHex: text, fontFamily },
    pages: normalizedPages,
  };
  const requiredNavigation = [...new Map(allNavigationItems.map((item) => [`${item.label}\0${item.href}`, item])).values()].map((item, index) => ({
    id: `navigation_${index + 1}`,
    kind: classifyNavigation(item.href),
    target: item.href,
  }));
  const generatedHtml = normalizedPages.map((page) => `${page.headHtml ?? ""}\n${page.bodyHtml}`).join("\n");
  const expectedStylesheetReferences = [...new Set(normalizedPages.flatMap((page) =>
    [...(page.headHtml ?? "").matchAll(/<link\b[^>]*\brel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)]
      .map((match) => htmlAttributeFromMarkup(match[0], "href"))
      .filter(Boolean),
  ))].sort();
  const referencedOwnedAssetUrls = [...new Set([
    ...extractOwnedAssetUrls(generatedHtml),
    ...extractStylesheetDependencyAssetUrls({
      pages: normalizedPages,
      rawArtifact: input.rawArtifact,
      stylesheetCssByPath: input.stylesheetCssByPath ?? {},
    }),
  ])].sort();
  const missingAssetEvidence = referencedOwnedAssetUrls
    .filter((path) => !Object.prototype.hasOwnProperty.call(ownedAssetFingerprints, path));
  if (missingAssetEvidence.length > 0) {
    throw new SourceBackedAstroUnsupportedError(
      missingAssetEvidence.map((path) => `source_asset_evidence_missing:${path}`),
    );
  }
  const requiredAssets = referencedOwnedAssetUrls
    .map((path) => ({ path, sha256: ownedAssetFingerprints[path]! }));
  const contentManifest = createGeneratedOutputContentManifest({
    sourceRef: `${input.siteVersion.id}:${input.artifact.id}:${input.artifact.bundleSha256}`,
    scope: {
      kind: routes.length === 1 ? "homepage_only" : "static_site",
      outputPaths: routes,
      allowedPublishStages: ["shadow"],
      unsupportedCapabilities: ["scripts", "forms", "application_state", "checkout", "inventory", "account", "platform_theme_runtime"],
    },
    requiredContent: normalizedPages.map((page, index) => ({ id: `page_${index + 1}_title`, value: page.title, match: "text" as const })),
    requiredNavigation,
    requiredAssets,
  });
  const projectManifest = createAstroStaticSiteProjectManifest(content);
  return {
    content,
    capabilities: ["static_pages", ...(requiredAssets.length > 0 ? ["local_assets" as const] : [])],
    outputPaths: routes,
    ownedAssetFingerprints,
    verification: {
      expectedContent: [siteName],
      expectedThemeToken: null,
      expectedStylesheetReferences,
    },
    contentManifest,
    sourceManifest: {
      adapterId: "astro-static-site",
      adapterVersion: "gnr8-output-adapter-selection:v1",
      sourceSiteVersionId: input.siteVersion.id,
      sourceArtifactId: input.artifact.id,
      files: projectManifest.files.map((file) => ({
        path: file.path,
        role: file.role,
        bytes: Buffer.byteLength(file.contents, "utf8"),
        sha256: createHash("sha256").update(file.contents, "utf8").digest("hex"),
        contents: file.contents,
      })),
      assetEvidence: ownedAssetEvidence,
      ...(input.acceptedFunctionalReductions ? {
        acceptedFunctionalReductions: {
          ...input.acceptedFunctionalReductions,
          limitations: [
            `Legacy contact forms were replaced with disclosed mailto links to ${input.acceptedFunctionalReductions.contactEmail}.`,
            "Legacy comment forms were replaced with disclosed links to the corresponding source articles; no generated-page comment submission is provided.",
            ...widgetRemovalLimitations(input.acceptedFunctionalReductions.sourceWidgetRemovals ?? []),
          ],
        },
      } : {}),
      ...(captureScopeLimitations.size > 0 ? {
        captureScopeLimitations: [...captureScopeLimitations.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([route, sourceUrl]) => ({
            kind: "acquisition-page-limit-external-link-v1" as const,
            route,
            sourceUrl,
          })),
      } : {}),
    },
  };
}

function normalizePage(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  rawArtifact: RawImportedSiteArtifact;
  path: string;
  html: string;
  stylesheetCssByPath?: Record<string, string>;
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
}): { path: string; title: string; headHtml: string; bodyAttributes: Record<string, string>; bodyHtml: string; unsupported: string[] } {
  // Candidate previews intentionally disable scripts. Parse using the same
  // scripting mode so noscript fallbacks can be normalized before Astro
  // serializes them into a sandboxed document.
  const document = parse(input.html, { scriptingEnabled: false }) as DefaultTreeAdapterMap["document"];
  let elements = allElements(document);
  const unsupported: string[] = [];
  const forms = elements.filter((element) => element.tagName === "form");
  materializeScriptAssignedStylesheets({
    document,
    siteVersion: input.siteVersion,
    rawArtifact: input.rawArtifact,
  });
  normalizePairedNoscriptImages(document, input.rawArtifact);
  elements = allElements(document);
  materializeLazyAssetAttributes(elements);
  let replacedFormCount = 0;
  let replacedFormSecurityRuntime = false;
  if (forms.length > 0 && input.acceptedFunctionalReductions) {
    const sourcePageUrl = sourcePageUrlForRoute(
      input.rawArtifact,
      input.siteVersion.importProvenanceSummary,
      input.path,
    );
    for (const form of forms) {
      const commentForm = isLegacyCommentForm(form);
      if (commentForm && !sourcePageUrl) {
        unsupported.push(`comment_source_url_missing:${input.path}`);
        continue;
      }
      if (formHasSecurityRuntime(form)) replacedFormSecurityRuntime = true;
      replaceNodeWithMarkup(form, commentForm
        ? commentReplacementMarkup(sourcePageUrl!)
        : contactReplacementMarkup(input.acceptedFunctionalReductions.contactEmail));
      replacedFormCount += 1;
    }
    elements = allElements(document);
  } else if (forms.length > 0) {
    unsupported.push("forms");
  }
  if (input.acceptedFunctionalReductions) {
    rewriteExplicitContactActions(document, input.acceptedFunctionalReductions.contactEmail);
    elements = allElements(document);
  }
  if (replacedFormCount > 0) {
    for (const style of elements.filter((element) => element.tagName === "style")) {
      if (isObsoleteFormSecurityStyle(style)) detach(style);
    }
    elements = allElements(document);
  }
  applyExplicitSourceWidgetRemovals({
    document,
    removals: input.acceptedFunctionalReductions?.sourceWidgetRemovals ?? [],
    hasReplacedForms: replacedFormCount > 0,
  });
  const hasStaticMobileNavigation = materializeStaticMobileNavigation(document);
  elements = allElements(document);
  for (const element of elements.filter((candidate) => ["iframe", "object", "embed"].includes(candidate.tagName))) {
    if (isFormSecurityEmbed(element)) {
      if (replacedFormCount > 0) detach(element);
      continue;
    }
    if (isStaticIframeEmbed(element)) continue;
    unsupported.push("application_state");
  }
  for (const script of elements.filter((element) => element.tagName === "script")) {
    const type = (attribute(script, "type") ?? "").trim().toLowerCase();
    if (
      (type && ["application/json", "application/ld+json", "application/gnr8-disabled-script", "application/gnr8-disabled-preview-script"].includes(type)) ||
      isReplaceableStaticSiteScript(script, {
        hasReplacedForms: replacedFormCount > 0,
        replacedFormSecurityRuntime,
        elements,
      })
    ) {
      detach(script);
    } else {
      unsupported.push("scripts");
    }
  }
  const routeSource = resolveRawTemplateRouteMapFile({
    siteVersionId: input.siteVersion.id,
    requestedPath: input.path,
    entryHtmlPath: input.rawArtifact.entryHtmlPath,
    fileMap: input.rawArtifact.fileMap,
    importProvenanceSummary: input.siteVersion.importProvenanceSummary,
    routeMapServingEnabled: true,
  });
  if (input.path !== "/" && input.rawArtifact.metadata.multiPage?.enabled && routeSource.outcome !== "selected") {
    unsupported.push(`source_route_lineage_missing:${input.path}`);
  }
  preserveAnchorHrefsForRuntimeRewrite(document);
  const serialized = serialize(document);
  let rewritten = rewriteRawTemplateHtmlForRuntime({
    html: serialized,
    siteId: input.rawArtifact.siteId,
    siteVersionId: input.rawArtifact.siteVersionId,
    resolvedFilePath: routeSource.outcome === "selected" ? routeSource.rawFilePath : input.rawArtifact.entryHtmlPath,
    fileMapPaths: new Set(Object.keys(input.rawArtifact.fileMap)),
  });
  rewritten = restoreExplicitSourceLinks(rewritten);
  const headStyles = extractCapturedHeadStyles(rewritten, {
    hasReplacedForms: replacedFormCount > 0,
    removals: input.acceptedFunctionalReductions?.sourceWidgetRemovals ?? [],
  });
  if (hasStaticMobileNavigation) headStyles.push(STATIC_MOBILE_NAVIGATION_STYLE);
  for (const href of unresolvedRequiredStylesheetHrefs(headStyles, sourceHostFromRawArtifact(input.rawArtifact))) {
    unsupported.push(`source_stylesheet_evidence_missing:${input.path}:${href}`);
  }
  for (const reference of unresolvedRequiredAssetReferences(rewritten, sourceHostFromRawArtifact(input.rawArtifact))) {
    unsupported.push(`source_asset_evidence_missing:${reference}`);
  }
  const bodyAttributes = extractCapturedBodyAttributes(rewritten);
  const bodyMarkup = rewritten.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() ?? rewritten;
  const headHtml = headStyles.join("\n");
  const bodyHtml = bodyMarkup;
  const title = input.siteVersion.pages.find((page) => page.path === input.path)?.title?.trim() ||
    textContent(elements.find((element) => element.tagName === "title") ?? document).trim().slice(0, 200) || input.path;
  return { path: input.path, title, headHtml, bodyAttributes, bodyHtml, unsupported };
}

const STATIC_MOBILE_NAVIGATION_STYLE = `<style is:global data-gnr8-static-mobile-navigation>
@media (max-width: 767px) {
  nav[data-gnr8-static-mobile-navigation]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  nav[data-gnr8-static-mobile-navigation]:focus > ul.navContainer,
  nav[data-gnr8-static-mobile-navigation]:focus-within > ul.navContainer { right: 0 !important; left: auto !important; }
  nav[data-gnr8-static-mobile-navigation][data-settings*="direction=right"]:focus > ul.navContainer,
  nav[data-gnr8-static-mobile-navigation][data-settings*="direction=right"]:focus-within > ul.navContainer { right: auto !important; left: 0 !important; }
}
</style>`;

function materializeStaticMobileNavigation(document: DefaultTreeAdapterMap["document"]): boolean {
  let materialized = false;
  for (const nav of allElements(document).filter((element) => element.tagName === "nav")) {
    const classes = classTokens(nav);
    const navContainer = nav.childNodes.find((child): child is HtmlElement => (
      isHtmlElement(child) && child.tagName === "ul" && classTokens(child).has("navContainer")
    ));
    if (!classes.has("nav") || !navContainer || !attribute(nav, "data-settings")) continue;
    setAttribute(nav, "data-gnr8-static-mobile-navigation", "");
    setAttribute(nav, "tabindex", "0");
    if (!attribute(nav, "aria-label")) setAttribute(nav, "aria-label", "Navigation menu");
    materialized = true;
  }
  return materialized;
}

function widgetRemovalLimitations(removals: SourceWidgetRemoval[]): string[] {
  const selected = new Set(removals);
  return [
    selected.has("cookie-consent")
      ? "The captured source cookie-consent overlay and its exclusively associated static markup were removed for this generation."
      : null,
    selected.has("form-captcha")
      ? "Captcha UI and runtime associated only with the replaced legacy forms were removed for this generation."
      : null,
    selected.has("back-to-top")
      ? "The captured floating back-to-top control and its exclusively associated static markup were removed for this generation."
      : null,
  ].filter((value): value is string => Boolean(value));
}

function applyExplicitSourceWidgetRemovals(input: {
  document: DefaultTreeAdapterMap["document"];
  removals: SourceWidgetRemoval[];
  hasReplacedForms: boolean;
}): void {
  const selected = new Set(input.removals);
  let elements = allElements(input.document);

  if (selected.has("cookie-consent")) {
    for (const element of elements) {
      if (isCapturedCookieConsentRoot(element)) detach(element);
    }
    elements = allElements(input.document);
    for (const body of elements.filter((element) => element.tagName === "body")) {
      removeClassTokens(body, (token) => /^(?:cookie|consent|infobar)(?:[-_].*)?$|^(?:scroll[-_]lock)$/i.test(token));
    }
  }

  if (selected.has("back-to-top")) {
    for (const element of elements) {
      if (isCapturedBackToTopControl(element)) detach(element);
    }
    elements = allElements(input.document);
  }

  if (selected.has("form-captcha") && input.hasReplacedForms) {
    for (const element of elements) {
      if (isCapturedFormCaptchaResidue(element)) detach(element);
    }
  }
}

function isCapturedCookieConsentRoot(element: HtmlElement): boolean {
  const id = attribute(element, "id") ?? "";
  const classes = classTokens(element);
  if (id === "infobar" && classes.has("infobar-wrapper")) {
    return allElements(element).some((child) => classTokens(child).has("cookie-row"));
  }
  const structuralClass = [...classes].some((token) => /^(?:cookie|consent)[-_](?:banner|dialog|notice|overlay|wrapper)$/i.test(token));
  if (!structuralClass) return false;
  const role = (attribute(element, "role") ?? "").toLowerCase();
  const fixedSignal = /(?:^|;|\s)(?:position\s*:\s*fixed|z-index\s*:)/i.test(attribute(element, "style") ?? "");
  return role === "dialog" || attribute(element, "aria-modal") === "true" || fixedSignal;
}

function isCapturedBackToTopControl(element: HtmlElement): boolean {
  if (element.tagName !== "a" && element.tagName !== "button") return false;
  const classes = classTokens(element);
  const request = (attribute(element, "data-req") ?? "").toLowerCase();
  const href = (attribute(element, "href") ?? "").trim();
  return (classes.has("scrollIcon") && request.split(/[,\s]+/).includes("scrolltop")) ||
    (classes.has("scrollIcon") && classes.has("bottom_right") && href === "#");
}

function isCapturedFormCaptchaResidue(element: HtmlElement): boolean {
  if (isFormSecurityEmbed(element)) return true;
  const name = (attribute(element, "name") ?? "").toLowerCase();
  const classes = [...classTokens(element)].join(" ");
  const src = attribute(element, "src") ?? attribute(element, "href") ?? "";
  if (name === "h-captcha-response" || /\b(?:h-captcha|hcaptcha-badge|g-recaptcha)\b/i.test(classes)) return true;
  if (["script", "link"].includes(element.tagName) && /(?:^|\.)hcaptcha\.com\b|(?:^|\.)recaptcha\.net\b|google\.com\/recaptcha|hcaptcha(?:\.min)?\.css/i.test(src)) return true;
  return element.tagName === "style" && isObsoleteFormSecurityStyle(element);
}

function classTokens(element: HtmlElement): Set<string> {
  return new Set((attribute(element, "class") ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean));
}

function removeClassTokens(element: HtmlElement, predicate: (token: string) => boolean): void {
  const current = classTokens(element);
  const kept = [...current].filter((token) => !predicate(token));
  if (kept.length === current.size) return;
  if (kept.length > 0) setAttribute(element, "class", kept.join(" "));
  else element.attrs = element.attrs.filter((item) => item.name !== "class");
}

function extractCapturedHeadStyles(
  html: string,
  input: { hasReplacedForms: boolean; removals: SourceWidgetRemoval[] },
): string[] {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const removeCaptcha = input.hasReplacedForms && input.removals.includes("form-captcha");
  const out: string[] = [];
  for (const match of head.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/gi)) {
    const markup = match[0];
    if (/^<link\b/i.test(markup)) {
      const rel = htmlAttributeFromMarkup(markup, "rel").toLowerCase().split(/\s+/);
      if (!rel.includes("stylesheet")) continue;
      const href = htmlAttributeFromMarkup(markup, "href");
      // Some legacy captures label font binaries as stylesheets. Browsers do
      // not parse those bytes as CSS; the real @font-face reference remains in
      // the captured stylesheet dependency graph.
      if (/\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test(href)) continue;
      if (removeCaptcha && /h-?captcha|g-recaptcha|recaptcha/i.test(href)) continue;
      out.push(markup);
      continue;
    }
    if (removeCaptcha && isObsoleteFormSecurityCss(markup)) continue;
    out.push(/\bis:global\b/i.test(markup) ? markup : markup.replace(/^<style\b/i, "<style is:global"));
  }
  return out;
}

function unresolvedRequiredStylesheetHrefs(headMarkup: string[], sourceHost: string): string[] {
  const unresolved: string[] = [];
  for (const markup of headMarkup) {
    if (!/^<link\b/i.test(markup)) continue;
    const href = htmlAttributeFromMarkup(markup, "href").trim();
    if (!href || href.startsWith("/api/gnr8/runtime/preview-assets/")) continue;
    try {
      const url = new URL(href, `https://${sourceHost || "gnr8.invalid"}/`);
      if (url.hostname.replace(/^www\./, "") !== sourceHost) continue;
    } catch {
      // Relative stylesheet references are required local resources.
    }
    unresolved.push(href);
  }
  return unresolved;
}

function unresolvedRequiredAssetReferences(html: string, sourceHost: string): string[] {
  const document = parse(html) as DefaultTreeAdapterMap["document"];
  const references: string[] = [];
  const attributeNamesByTag: Record<string, string[]> = {
    img: ["src", "srcset"],
    source: ["src", "srcset"],
    video: ["src", "poster"],
    audio: ["src"],
    use: ["href", "xlink:href"],
    image: ["href", "xlink:href"],
  };
  for (const element of allElements(document)) {
    for (const name of attributeNamesByTag[element.tagName] ?? []) {
      const raw = attribute(element, name);
      if (!raw) continue;
      const values = name === "srcset"
        ? raw.split(",").map((entry) => entry.trim().split(/\s+/, 1)[0] ?? "")
        : [raw];
      for (const value of values) {
        if (isUnresolvedRequiredLocalReference(value, sourceHost)) references.push(value);
      }
    }
    const cssValues = [
      ...(element.tagName === "style" ? extractCssReferenceValues(textContent(element)) : []),
      ...extractCssReferenceValues(attribute(element, "style") ?? ""),
    ];
    for (const value of cssValues) {
      if (isUnresolvedRequiredLocalReference(value, sourceHost)) references.push(value);
    }
  }
  return [...new Set(references)].sort();
}

function isUnresolvedRequiredLocalReference(value: string, sourceHost: string): boolean {
  const reference = value.trim();
  if (!reference || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(reference)) return false;
  if (reference.startsWith("/api/gnr8/runtime/preview-assets/")) return false;
  try {
    const url = new URL(reference, `https://${sourceHost || "gnr8.invalid"}/`);
    return url.hostname.replace(/^www\./, "") === (sourceHost || "gnr8.invalid");
  } catch {
    return true;
  }
}

function extractCapturedBodyAttributes(html: string): Record<string, string> {
  const document = parse(html) as DefaultTreeAdapterMap["document"];
  const body = allElements(document).find((element) => element.tagName === "body");
  if (!body) return {};
  return Object.fromEntries(body.attrs
    .filter(({ name }) => /^(?:id|class|style|lang|dir|title|role|tabindex|data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+)$/i.test(name))
    .map(({ name, value }) => [name.toLowerCase(), value]));
}

function htmlAttributeFromMarkup(markup: string, name: string): string {
  const match = markup.match(new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match?.[2] ?? "";
}

function isObsoleteFormSecurityCss(markup: string): boolean {
  const fragment = parseFragment(markup) as DefaultTreeAdapterMap["documentFragment"];
  const style = allElements(fragment).find((element) => element.tagName === "style");
  return style ? isObsoleteFormSecurityStyle(style) : false;
}

function sourceHostFromRawArtifact(artifact: RawImportedSiteArtifact): string {
  const sourceUrl = String(artifact.metadata.finalUrl ?? artifact.metadata.sourceUrl ?? "").trim();
  try { return new URL(sourceUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function normalizeNavigationTarget(
  href: string,
  sourceHost: string,
  knownRoutes: Map<string, string>,
  outOfScopeSourceUrls: Map<string, string>,
  captureScopeLimitations: Map<string, string>,
  unsupported: Set<string>,
): string {
  const trimmed = href.trim();
  if (/^(?:mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, `https://${sourceHost || "gnr8.invalid"}/`);
    const normalizedPath = `/${url.pathname.replace(/^\/+|\/+$/g, "")}`.replace(/\/{2,}/g, "/");
    const route = normalizedPath === "/" ? "/" : normalizedPath;
    const localHost = url.hostname.replace(/^www\./, "") === sourceHost;
    if (!localHost) return url.protocol === "https:" ? url.toString() : "";
    if (isFeedResourcePath(route)) return url.protocol === "https:" ? url.toString() : "";
    const routeIdentity = canonicalRouteIdentity(route);
    const capturedRoute = knownRoutes.get(routeIdentity);
    if (!capturedRoute) {
      const sourceUrl = outOfScopeSourceUrls.get(routeIdentity);
      if (sourceUrl) {
        captureScopeLimitations.set(route, sourceUrl);
        return sourceUrl;
      }
      unsupported.add(`uncaptured_required_route:${route}`);
      return "";
    }
    return `${capturedRoute}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function normalizePageNavigation(input: {
  html: string;
  sourceHost: string;
  knownRoutes: Map<string, string>;
  outOfScopeSourceUrls: Map<string, string>;
  captureScopeLimitations: Map<string, string>;
  unsupported: Set<string>;
}): { html: string; items: Array<{ label: string; href: string }> } {
  const document = parseFragment(input.html) as DefaultTreeAdapterMap["documentFragment"];
  const elements = allElements(document);
  const localTargets = new Set(elements.flatMap((element) => [
    attribute(element, "id"),
    element.tagName === "a" ? attribute(element, "name") : null,
  ]).filter((value): value is string => Boolean(value)));
  const items: Array<{ label: string; href: string }> = [];

  for (const anchor of elements.filter((element) => element.tagName === "a")) {
    const href = attribute(anchor, "href")?.trim() ?? "";
    if (!href) continue;
    if (href.startsWith("#")) {
      const fragment = safeDecodeFragment(href.slice(1));
      if (!fragment || !localTargets.has(fragment)) {
        anchor.attrs = anchor.attrs.filter((item) => item.name !== "href");
        setAttribute(anchor, "data-gnr8-disabled-local-anchor", href);
        continue;
      }
    }
    const normalized = attribute(anchor, "data-gnr8-source-link") !== null
      ? normalizeExplicitSourceLink(href)
      : normalizeNavigationTarget(
        href,
        input.sourceHost,
        input.knownRoutes,
        input.outOfScopeSourceUrls,
        input.captureScopeLimitations,
        input.unsupported,
      );
    if (!normalized) {
      anchor.attrs = anchor.attrs.filter((item) => item.name !== "href");
      setAttribute(anchor, "data-gnr8-disabled-navigation", href);
      continue;
    }
    setAttribute(anchor, "href", normalized);
    items.push({ label: normalizeText(textContent(anchor)), href: normalized });
  }

  return { html: serialize(document), items };
}

function safeDecodeFragment(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function normalizeExplicitSourceLink(href: string): string {
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function classifyNavigation(href: string): "local_anchor" | "local_route" | "external_url" | "mailto" | "tel" {
  if (href.startsWith("#")) return "local_anchor";
  if (href.startsWith("mailto:")) return "mailto";
  if (href.startsWith("tel:")) return "tel";
  if (/^https:\/\//i.test(href)) return "external_url";
  return "local_route";
}

function ownedAssetUrl(siteId: string, siteVersionId: string, path: string): string {
  return `/api/gnr8/runtime/preview-assets/${encodeURIComponent(siteId)}/${encodeURIComponent(siteVersionId)}/${path}`;
}

function extractOwnedAssetUrls(html: string): string[] {
  const fragment = parseFragment(html) as DefaultTreeAdapterMap["documentFragment"];
  const values: string[] = [];
  const attributeNamesByTag: Record<string, string[]> = {
    img: ["src", "srcset"],
    source: ["src", "srcset"],
    video: ["src", "poster"],
    audio: ["src"],
    link: ["href"],
    use: ["href", "xlink:href"],
    image: ["href", "xlink:href"],
  };
  for (const element of allElements(fragment)) {
    for (const name of attributeNamesByTag[element.tagName] ?? []) {
      const raw = attribute(element, name);
      if (!raw) continue;
      values.push(...(name === "srcset"
        ? raw.split(",").map((entry) => entry.trim().split(/\s+/, 1)[0] ?? "")
        : [raw]));
    }
    if (element.tagName === "style") {
      values.push(...[...textContent(element).matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)]
        .map((match) => match[1] ?? ""));
    }
    const inlineStyle = attribute(element, "style");
    if (inlineStyle) {
      values.push(...[...inlineStyle.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)]
        .map((match) => match[1] ?? ""));
    }
  }
  return [...new Set(values
    .filter((value) => value.startsWith("/api/gnr8/runtime/preview-assets/"))
    .map((value) => value.split(/[?#]/, 1)[0]!)
    .filter(Boolean))].sort();
}

function extractStylesheetDependencyAssetUrls(input: {
  pages: NormalizedStaticSitePage[];
  rawArtifact: RawImportedSiteArtifact;
  stylesheetCssByPath: Record<string, string>;
}): string[] {
  const prefix = ownedAssetUrl(input.rawArtifact.siteId, input.rawArtifact.siteVersionId, "");
  const directOwnedUrls = extractOwnedAssetUrls(input.pages.map((page) => page.headHtml ?? "").join("\n"));
  const queue = directOwnedUrls
    .map((url) => ownedAssetPathFromUrl(url, prefix))
    .filter((path): path is string => Boolean(path && /\.css$/i.test(path)));
  const visited = new Set<string>();
  const dependencies = new Set<string>();
  const fileMapPaths = new Set(Object.keys(input.rawArtifact.fileMap));

  while (queue.length > 0) {
    const stylesheetPath = queue.shift()!;
    if (visited.has(stylesheetPath)) continue;
    visited.add(stylesheetPath);
    const css = input.stylesheetCssByPath[stylesheetPath];
    if (css === undefined) {
      throw new SourceBackedAstroUnsupportedError([`source_stylesheet_bytes_missing:${stylesheetPath}`]);
    }
    const rewritten = rewriteRawTemplateCssForRuntime({
      css,
      siteId: input.rawArtifact.siteId,
      siteVersionId: input.rawArtifact.siteVersionId,
      assetFilePath: stylesheetPath,
      fileMapPaths,
    });
    for (const value of extractCssReferenceValues(rewritten)) {
      const normalizedUrl = value.split(/[?#]/, 1)[0] ?? value;
      const dependencyPath = ownedAssetPathFromUrl(normalizedUrl, prefix);
      if (!dependencyPath) continue;
      dependencies.add(normalizedUrl);
      if (/\.css$/i.test(dependencyPath) && !visited.has(dependencyPath)) queue.push(dependencyPath);
    }
  }

  return [...dependencies].sort();
}

function extractCssReferenceValues(css: string): string[] {
  const values = [
    ...[...css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)].map((match) => match[1] ?? ""),
    ...[...css.matchAll(/@import\s+["']([^"']+)["']/gi)].map((match) => match[1] ?? ""),
  ];
  return [...new Set(values.filter(Boolean))];
}

function ownedAssetPathFromUrl(url: string, prefix: string): string | null {
  const normalized = url.split(/[?#]/, 1)[0] ?? url;
  if (!normalized.startsWith(prefix)) return null;
  const path = normalized.slice(prefix.length).replace(/^\/+/, "");
  return path || null;
}

function normalizeHex(value: unknown, fallback: string): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function normalizeText(value: string): string { return value.replace(/\s+/g, " ").trim(); }
function attribute(element: HtmlElement, name: string): string | null { return element.attrs.find((item) => item.name === name)?.value ?? null; }
function setAttribute(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else element.attrs.push({ name, value });
}
function canonicalRouteIdentity(value: string): string {
  return normalizeRawTemplateRouteMapPath(value);
}
function normalizeAstroOutputRoutePath(value: string): string {
  return encodeGeneratedOutputRoutePath(normalizeRawTemplateRouteMapPath(value));
}
function isFeedResourcePath(value: string): boolean {
  return /(?:\.rss|\.atom)$/i.test(value);
}
function materializeLazyAssetAttributes(elements: HtmlElement[]): void {
  for (const element of elements) {
    if (element.tagName !== "img" && element.tagName !== "source") continue;
    const currentSrc = attribute(element, "src");
    const lazySrc = attribute(element, "data-src") ??
      attribute(element, "data-lazyload-src") ??
      attribute(element, "data-original") ??
      attribute(element, "data-lazy-src");
    if (lazySrc && (!currentSrc || isLazyPlaceholderReference(currentSrc))) {
      setAttribute(element, "src", lazySrc);
      removeLazyRuntimeInitialStyles(element);
    }
    if (!attribute(element, "srcset")) {
      const lazySrcset = attribute(element, "data-srcset") ?? attribute(element, "data-lazy-srcset");
      if (lazySrcset) setAttribute(element, "srcset", lazySrcset);
    }
  }
}

function materializeScriptAssignedStylesheets(input: {
  document: DefaultTreeAdapterMap["document"];
  siteVersion: CanonicalSiteVersionSnapshot;
  rawArtifact: RawImportedSiteArtifact;
}): void {
  const elements = allElements(input.document);
  const existingStylesheetPaths = new Set(elements
    .filter((element) => element.tagName === "link")
    .map((element) => attribute(element, "href"))
    .filter((value): value is string => Boolean(value))
    .map(normalizeReferenceIdentity));

  for (const script of elements.filter((element) => element.tagName === "script")) {
    const body = textContent(script);
    if (!/createelement\s*\(\s*["']link["']\s*\)/i.test(body) ||
        !/rel\s*=\s*["']stylesheet["']/i.test(body)) continue;
    const targetId = body.match(/getElementById\s*\(\s*(["'])([^"']+)\1\s*\)/i)?.[2];
    if (!targetId) continue;
    const target = elements.find((element) => attribute(element, "id") === targetId);
    const parent = target?.parentNode;
    if (!target || !parent) continue;

    for (const match of body.matchAll(/\bhref\s*=\s*(["'])(\/assets\/[^"'?#\s>]+\.css(?:\?[^"'#\s>]*)?(?:#[^"'\s>]*)?)\1/gi)) {
      const sourceHref = (match[2] ?? "").trim();
      const href = resolveDerivedStylesheetReference({
        sourceHref,
        siteVersion: input.siteVersion,
        rawArtifact: input.rawArtifact,
      });
      const identity = normalizeReferenceIdentity(href);
      if (!href || existingStylesheetPaths.has(identity)) continue;
      const fragment = parseFragment(`<link rel="stylesheet" href="${escapeHtml(href)}" data-gnr8-materialized-script-stylesheet>`) as DefaultTreeAdapterMap["documentFragment"];
      const link = fragment.childNodes.find((node): node is HtmlElement => "tagName" in node && node.tagName === "link");
      if (!link) continue;
      const index = parent.childNodes.indexOf(target);
      if (index < 0) continue;
      link.parentNode = parent;
      parent.childNodes.splice(index, 0, link);
      existingStylesheetPaths.add(identity);
    }
  }
}

function resolveDerivedStylesheetReference(input: {
  sourceHref: string;
  siteVersion: CanonicalSiteVersionSnapshot;
  rawArtifact: RawImportedSiteArtifact;
}): string {
  let absoluteSourceUrl: string;
  try {
    absoluteSourceUrl = new URL(
      input.sourceHref,
      input.rawArtifact.metadata.finalUrl ?? input.rawArtifact.metadata.sourceUrl,
    ).toString();
  } catch {
    return input.sourceHref;
  }
  const rewrite = input.siteVersion.importProvenanceSummary?.derivedCapture?.rewrites.find((entry) =>
    entry.from === absoluteSourceUrl && input.rawArtifact.fileMap[entry.to.replace(/^\/+/, "")],
  );
  return rewrite?.to ?? input.sourceHref;
}

function normalizePairedNoscriptImages(
  document: DefaultTreeAdapterMap["document"],
  rawArtifact: RawImportedSiteArtifact,
): void {
  for (const noscript of allElements(document).filter((element) => element.tagName === "noscript")) {
    const descendants = allElements(noscript).filter((element) => element !== noscript);
    const fallbackImages = descendants.filter((element) => element.tagName === "img");
    if (fallbackImages.length !== 1 || descendants.some((element) => !["img", "picture", "source"].includes(element.tagName))) continue;
    if (textContent(noscript).trim()) continue;

    const primary = previousElementSibling(noscript);
    if (!primary || primary.tagName !== "img") continue;
    const fallback = fallbackImages[0]!;
    const fallbackSrc = effectiveImageReference(fallback);
    if (!fallbackSrc || isLazyPlaceholderReference(fallbackSrc)) continue;

    const primarySrc = effectiveImageReference(primary);
    const noscriptSrc = attribute(noscript, "data-lazyload-src") ?? attribute(noscript, "data-src");
    const primaryRetainedIdentity = primarySrc ? retainedImageReferenceIdentity(primarySrc, rawArtifact) : null;
    const fallbackRetainedIdentity = retainedImageReferenceIdentity(fallbackSrc, rawArtifact);
    const verifiedPair = (primarySrc && (
      normalizeReferenceIdentity(primarySrc) === normalizeReferenceIdentity(fallbackSrc) ||
      Boolean(primaryRetainedIdentity && primaryRetainedIdentity === fallbackRetainedIdentity)
    )) ||
      (noscriptSrc && normalizeReferenceIdentity(noscriptSrc) === normalizeReferenceIdentity(fallbackSrc) &&
        (!attribute(primary, "src") || isLazyPlaceholderReference(attribute(primary, "src")!)));
    if (!verifiedPair) continue;

    primary.attrs = fallback.attrs.map((item) => ({ ...item }));
    detach(noscript);
  }
}

function retainedImageReferenceIdentity(value: string, rawArtifact: RawImportedSiteArtifact): string | null {
  const normalized = normalizeReferenceIdentity(value);
  const previewMatch = normalized.match(/^\/api\/gnr8\/runtime\/preview-assets\/[^/]+\/[^/]+\/(.+)$/);
  const encodedPath = previewMatch?.[1] ?? normalized.replace(/^\/+/, "");
  let filePath: string;
  try {
    filePath = encodedPath.split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
  return rawArtifact.fileMap[filePath] ? filePath : null;
}

function previousElementSibling(element: HtmlElement): HtmlElement | null {
  const siblings = element.parentNode?.childNodes ?? [];
  for (let index = siblings.indexOf(element) - 1; index >= 0; index -= 1) {
    const sibling = siblings[index];
    if (sibling && "tagName" in sibling) return sibling as HtmlElement;
    if (sibling && "value" in sibling && typeof sibling.value === "string" && sibling.value.trim()) return null;
  }
  return null;
}

function effectiveImageReference(element: HtmlElement): string | null {
  const lazy = attribute(element, "data-src") ??
    attribute(element, "data-lazyload-src") ??
    attribute(element, "data-original") ??
    attribute(element, "data-lazy-src");
  const src = attribute(element, "src");
  return lazy ?? src;
}

function normalizeReferenceIdentity(value: string): string {
  return value.trim().split(/[?#]/, 1)[0] ?? value.trim();
}

function isLazyPlaceholderReference(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:image/") || /(?:^|\/)(?:blank|placeholder|spacer|transparent)(?:[-_.]|\/)/i.test(normalized);
}

function removeLazyRuntimeInitialStyles(element: HtmlElement): void {
  const style = attribute(element, "style");
  if (!style) return;
  const kept = style.split(";").map((declaration) => declaration.trim()).filter(Boolean).filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 0) return true;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim().toLowerCase().replace(/\s*!important\s*$/, "");
    if ((property === "width" || property === "height") && value === "1px") return false;
    if (property === "opacity" && /^0(?:\.0+)?$/.test(value)) return false;
    if (property === "visibility" && value === "hidden") return false;
    return true;
  });
  if (kept.length > 0) setAttribute(element, "style", `${kept.join("; ")};`);
  else element.attrs = element.attrs.filter((item) => item.name !== "style");
}
function scriptAssetName(value: string): string {
  const raw = value.split(/[?#]/, 1)[0]?.split("/").pop()?.toLowerCase() ?? "";
  return raw.replace(/^[0-9a-f]{8,}-/, "");
}
function isReplaceableStaticSiteScript(
  script: HtmlElement,
  context: { hasReplacedForms: boolean; replacedFormSecurityRuntime: boolean; elements: HtmlElement[] },
): boolean {
  if (attribute(script, "data-gnr8-raw-runtime-duplicate-guard") !== null) return true;
  if (attribute(script, "data-gnr8-disabled-preview-script") !== null) return true;
  const src = attribute(script, "src") ?? "";
  const assetName = scriptAssetName(src);
  const body = textContent(script).trim();
  const lowerBody = body.toLowerCase();
  const staticEnhancementAssets = new Set([
    "anchor.js",
    "awserrorlogger.js",
    "cookie.js",
    "headerfixed.js",
    "jquery-migrate.js",
    "jquery-modern.js",
    "jquery.serialize-object.js",
    "lang.js",
    "lazyload.js",
    "loader-polyfills.js",
    "loader.js",
    "monorobots.js",
    "monotracker.js",
    "nav.js",
    "quicklink.js",
    "scrolltop.js",
    "shrinkingheader.js",
    "touch-events.js",
  ]);
  if (staticEnhancementAssets.has(assetName)) return true;
  if (/google-analytics|googletagmanager|gtag\/js|monotracker/i.test(src)) return true;
  if (context.hasReplacedForms && (assetName === "form.js" || /hcaptcha\.com/i.test(src))) return true;
  if (context.replacedFormSecurityRuntime && assetName === "api.js") return true;
  if (assetName === "js.js" && context.elements.some((element) => element.tagName === "script" && /\bgtag\s*\(|\bdataLayer\b/i.test(textContent(element)))) return true;
  if (/serviceworker\.getregistrations|window\.assetsurl\s*=|\b_monoCookie\s*=|\bdataLayer\b|\bgtag\s*\(/i.test(body)) return true;
  if (/createelement\s*\(\s*["']link["']\s*\)/i.test(lowerBody) && /rel\s*=\s*["']stylesheet["']/i.test(lowerBody)) return true;
  return false;
}

function formHasSecurityRuntime(form: HtmlElement): boolean {
  return allElements(form).some((element) => {
    const src = attribute(element, "src") ?? attribute(element, "data") ?? "";
    const className = attribute(element, "class") ?? "";
    return attribute(element, "name") === "h-captcha-response" ||
      /(?:^|\.)hcaptcha\.com\b|(?:^|\.)recaptcha\.net\b|google\.com\/recaptcha/i.test(src) ||
      /\b(?:h-captcha|g-recaptcha)\b/i.test(className);
  });
}

function isObsoleteFormSecurityStyle(style: HtmlElement): boolean {
  const css = textContent(style).trim();
  if (!css || !/(?:h-?captcha|g-recaptcha)/i.test(css)) return false;
  const withoutSecurityRules = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector) =>
    /(?:h-?captcha|g-recaptcha)/i.test(String(selector)) ? "" : rule);
  return withoutSecurityRules.replace(/\/\*[\s\S]*?\*\//g, "").trim() === "";
}

function acquisitionPageLimitSourceUrls(
  provenance: CanonicalSiteVersionSnapshot["importProvenanceSummary"],
  sourceHost: string,
): Map<string, string> {
  const out = new Map<string, string>();
  const pages = provenance?.multiPageDiscovery?.acquisition?.pages ?? [];
  for (const page of pages) {
    if (page.status !== "skipped" || page.skippedReason !== "acquisition_page_limit") continue;
    const route = page.finalNormalizedRoutePath ?? page.normalizedRoutePath;
    if (!route) continue;
    const sourceUrl = page.finalUrl ?? page.normalizedUrl ?? page.originalHref;
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== "https:" || url.hostname.replace(/^www\./, "") !== sourceHost) continue;
      out.set(canonicalRouteIdentity(route), url.toString());
    } catch {
      // Malformed provenance remains unsupported instead of being silently externalized.
    }
  }
  return out;
}

function sourcePageUrlForRoute(
  artifact: RawImportedSiteArtifact,
  provenance: CanonicalSiteVersionSnapshot["importProvenanceSummary"],
  path: string,
): string | null {
  const routes = routeMapFromProvenance(provenance);
  const route = routes.find((item) => canonicalRouteIdentity(item.routePath) === canonicalRouteIdentity(path));
  try {
    const sourceRoot = artifact.metadata.finalUrl ?? artifact.metadata.sourceUrl;
    const raw = path === "/"
      ? sourceRoot
      : route?.finalUrl ?? route?.sourceUrl ?? new URL(path, sourceRoot).toString();
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isLegacyCommentForm(form: HtmlElement): boolean {
  const id = attribute(form, "id") ?? "";
  if (/^(?:m0000|comment-form)$/i.test(id)) return true;
  const signals = [id, attribute(form, "class") ?? "", textContent(form)]
    .join(" ")
    .toLowerCase();
  return /\b(?:comment|comments|komentar|komentiraj)\b/.test(signals);
}

function contactReplacementMarkup(email: string): string {
  const escaped = escapeHtml(email);
  return `<aside class="gnr8-functional-reduction gnr8-contact-reduction" data-gnr8-accepted-limitation="legacy-contact-form-replaced"><p>This generated page does not provide the legacy contact form.</p><p><a href="mailto:${escaped}" data-gnr8-functional-reduction-link>Email ${escaped}</a></p></aside>`;
}

function rewriteExplicitContactActions(document: DefaultTreeAdapterMap["document"], email: string): void {
  for (const anchor of allElements(document).filter((element) => element.tagName === "a")) {
    const title = (attribute(anchor, "title") ?? "").trim().toLowerCase();
    const trackingAction = (attribute(anchor, "data-track-action") ?? "").trim().toLowerCase();
    if (title !== "contact us" || trackingAction !== "email_link") continue;
    setAttribute(anchor, "href", `mailto:${email}`);
  }
}

function commentReplacementMarkup(sourcePageUrl: string): string {
  const escaped = escapeHtml(sourcePageUrl);
  return `<aside class="gnr8-functional-reduction gnr8-comment-reduction" data-gnr8-accepted-limitation="legacy-comment-form-replaced"><p>Comments are not submitted from this generated page.</p><p><a href="#" data-gnr8-source-link data-gnr8-source-href="${escaped}" data-gnr8-functional-reduction-link>Open the original article to comment</a></p></aside>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceNodeWithMarkup(node: HtmlElement, markup: string): void {
  const parent = node.parentNode;
  if (!parent) return;
  const fragment = parseFragment(markup) as DefaultTreeAdapterMap["documentFragment"];
  const index = parent.childNodes.indexOf(node);
  if (index < 0) return;
  for (const child of fragment.childNodes) child.parentNode = parent;
  parent.childNodes.splice(index, 1, ...fragment.childNodes);
}

function restoreExplicitSourceLinks(html: string): string {
  const document = parse(html) as DefaultTreeAdapterMap["document"];
  for (const anchor of allElements(document).filter((element) => element.tagName === "a")) {
    const sourceHref = attribute(anchor, "data-gnr8-source-href");
    if (!sourceHref) continue;
    setAttribute(anchor, "href", sourceHref);
    anchor.attrs = anchor.attrs.filter((item) => item.name !== "data-gnr8-source-href");
  }
  return serialize(document);
}
function preserveAnchorHrefsForRuntimeRewrite(document: DefaultTreeAdapterMap["document"]): void {
  for (const anchor of allElements(document).filter((element) => element.tagName === "a")) {
    if (attribute(anchor, "data-gnr8-source-href") !== null) continue;
    const href = attribute(anchor, "href");
    if (href) setAttribute(anchor, "data-gnr8-source-href", href);
  }
}
function isFormSecurityEmbed(element: HtmlElement): boolean {
  const src = attribute(element, "src") ?? attribute(element, "data") ?? "";
  return /(?:^|\.)hcaptcha\.com\b|(?:^|\.)recaptcha\.net\b|google\.com\/recaptcha/i.test(src);
}
function isStaticIframeEmbed(element: HtmlElement): boolean {
  if (element.tagName !== "iframe") return false;
  const src = attribute(element, "src") ?? "";
  if (!src) return false;
  try {
    const url = new URL(src, "https://gnr8.invalid/");
    return url.protocol === "https:" && !/\b(?:checkout|login|signin|account|captcha|payment)\b/i.test(url.pathname);
  } catch {
    return false;
  }
}
function textContent(node: HtmlNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  return ("childNodes" in node ? node.childNodes ?? [] : []).map(textContent).join(" ");
}
function allElements(root: HtmlNode): HtmlElement[] {
  const out: HtmlElement[] = [];
  const visit = (node: HtmlNode) => {
    if ("tagName" in node && Array.isArray((node as HtmlElement).attrs)) out.push(node as HtmlElement);
    for (const child of "childNodes" in node ? node.childNodes ?? [] : []) visit(child);
  };
  visit(root);
  return out;
}
function isHtmlElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray((node as HtmlElement).attrs);
}
function detach(node: HtmlElement): void {
  const parent = node.parentNode;
  if (!parent) return;
  parent.childNodes = parent.childNodes.filter((child) => child !== node);
}
