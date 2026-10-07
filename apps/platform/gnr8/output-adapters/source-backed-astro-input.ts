import { createHash } from "node:crypto";
import { parse, parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact } from "@/gnr8/runtime/types";
import {
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
  routeMapFromProvenance,
} from "@/gnr8/runtime/raw-template-route-map-resolver";
import { rewriteRawTemplateHtmlForRuntime } from "@/src/public-site/raw-template-runtime";

import { createGeneratedOutputContentManifest, type GeneratedOutputContentManifest } from "./generated-output-eligibility";
import { encodeGeneratedOutputRoutePath } from "./generated-output-route-path";
import { createAstroStaticSiteProjectManifest, type NormalizedStaticBusinessSiteContent, type NormalizedStaticSitePage } from "./astro-static-site-adapter";
import type { OutputAdapterCapability } from "./output-adapter-selection";

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
  verification: { expectedContent: string[]; expectedThemeToken: string };
  contentManifest: GeneratedOutputContentManifest;
  sourceManifest: {
    adapterId: "astro-static-site";
    adapterVersion: "gnr8-output-adapter-selection:v1";
    sourceSiteVersionId: string;
    sourceArtifactId: string;
    files: Array<{ path: string; role: string; bytes: number; sha256: string; contents: string }>;
    acceptedFunctionalReductions?: {
      kind: "legacy-forms-to-disclosed-links-v1";
      contactEmail: string;
      commentLinks: "source-article";
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

export function createSourceBackedAstroGenerationInput(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  rawArtifact: RawImportedSiteArtifact;
  htmlByPath?: Record<string, string> & { "/": string };
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
}): SourceBackedAstroGenerationInput {
  const sourceHtmlByPath = input.htmlByPath ?? input.artifact.htmlByPath;
  const routes = Object.keys(sourceHtmlByPath).sort((left, right) => left.localeCompare(right));
  if (!routes.includes("/")) throw new SourceBackedAstroUnsupportedError(["missing_root_route"]);
  const pages = routes.map((path) => normalizePage({ ...input, path, html: sourceHtmlByPath[path] ?? "" }));
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
  const normalizedHtmlByPath = new Map(pages.map((page) => [page.path, page.bodyHtml]));
  const rootDocument = parse(sourceHtmlByPath["/"] ?? "") as DefaultTreeAdapterMap["document"];
  const sourceHost = sourceHostFromRawArtifact(input.rawArtifact);
  const outOfScopeSourceUrls = acquisitionPageLimitSourceUrls(input.siteVersion.importProvenanceSummary, sourceHost);
  const captureScopeLimitations = new Map<string, string>();
  const normalizeAnchors = (document: DefaultTreeAdapterMap["document"], reductionsOnly = false) => allElements(document)
    .filter((element) => element.tagName === "a")
    .filter((element) => !reductionsOnly || attribute(element, "data-gnr8-functional-reduction-link") !== null)
    .map((element) => ({
      label: normalizeText(textContent(element)),
      href: attribute(element, "href") ?? "",
      forceExternal: attribute(element, "data-gnr8-source-link") !== null,
    }))
    .filter((item) => item.label && item.href)
    .map((item) => ({
      label: item.label,
      href: item.forceExternal
        ? normalizeExplicitSourceLink(item.href)
        : normalizeNavigationTarget(
          item.href,
          sourceHost,
          knownRoutes,
          outOfScopeSourceUrls,
          captureScopeLimitations,
          unsupported,
        ),
    }))
    .filter((item) => Boolean(item.href));
  const navItems = normalizeAnchors(rootDocument);
  const allNavigationItems = routes.flatMap((route) => normalizeAnchors(
    parse(sourceHtmlByPath[route] ?? "") as DefaultTreeAdapterMap["document"],
  )).concat(routes.flatMap((route) => normalizeAnchors(
    parse(normalizedHtmlByPath.get(route) ?? "") as DefaultTreeAdapterMap["document"],
    true,
  )));
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
  const normalizedPages: NormalizedStaticSitePage[] = pages.map((page) => ({ path: page.path, title: page.title || siteName, bodyHtml: page.bodyHtml }));
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
  const generatedHtml = normalizedPages.map((page) => page.bodyHtml).join("\n");
  const requiredAssets = Object.entries(ownedAssetFingerprints)
    .filter(([path]) => generatedHtml.includes(path))
    .map(([path, sha256]) => ({ path, sha256 }));
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
    verification: { expectedContent: [siteName], expectedThemeToken: `--gnr8-astro-accent: ${accent};` },
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
      ...(input.acceptedFunctionalReductions ? {
        acceptedFunctionalReductions: {
          ...input.acceptedFunctionalReductions,
          limitations: [
            `Legacy contact forms were replaced with disclosed mailto links to ${input.acceptedFunctionalReductions.contactEmail}.`,
            "Legacy comment forms were replaced with disclosed links to the corresponding source articles; no generated-page comment submission is provided.",
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
  acceptedFunctionalReductions?: AcceptedSourceFunctionalReductions;
}): { path: string; title: string; bodyHtml: string; unsupported: string[] } {
  const document = parse(input.html) as DefaultTreeAdapterMap["document"];
  let elements = allElements(document);
  const unsupported: string[] = [];
  const forms = elements.filter((element) => element.tagName === "form");
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
  const serialized = serialize(document);
  let rewritten = rewriteRawTemplateHtmlForRuntime({
    html: serialized,
    siteId: input.rawArtifact.siteId,
    siteVersionId: input.rawArtifact.siteVersionId,
    resolvedFilePath: routeSource.outcome === "selected" ? routeSource.rawFilePath : input.rawArtifact.entryHtmlPath,
  });
  rewritten = restoreExplicitSourceLinks(rewritten);
  const headStyles = [...rewritten.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((match) => match[0]);
  if (input.artifact.compiledTokenStyles.trim()) {
    headStyles.push(`<style data-gnr8-source-tokens>${input.artifact.compiledTokenStyles}</style>`);
  }
  const bodyMarkup = rewritten.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() ?? rewritten;
  const bodyHtml = [...new Set(headStyles), bodyMarkup].filter(Boolean).join("\n");
  const title = input.siteVersion.pages.find((page) => page.path === input.path)?.title?.trim() ||
    textContent(elements.find((element) => element.tagName === "title") ?? document).trim().slice(0, 200) || input.path;
  return { path: input.path, title, bodyHtml, unsupported };
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
    if (!attribute(element, "src")) {
      const lazySrc = attribute(element, "data-src") ?? attribute(element, "data-lazy-src") ?? attribute(element, "data-original");
      if (lazySrc) setAttribute(element, "src", lazySrc);
    }
    if (!attribute(element, "srcset")) {
      const lazySrcset = attribute(element, "data-srcset") ?? attribute(element, "data-lazy-srcset");
      if (lazySrcset) setAttribute(element, "srcset", lazySrcset);
    }
  }
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
function detach(node: HtmlElement): void {
  const parent = node.parentNode;
  if (!parent) return;
  parent.childNodes = parent.childNodes.filter((child) => child !== node);
}
