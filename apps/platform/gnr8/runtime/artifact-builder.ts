import { normalizePagePath, sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import type { CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact } from "@/gnr8/runtime/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type LegacyHtmlSummary = {
  extractedText?: unknown;
  extractedImageSrcs?: unknown;
  extractedLinks?: unknown;
};

function readLegacyHtmlSummary(sectionProps: Record<string, unknown>): LegacyHtmlSummary | null {
  const raw = sectionProps.htmlSummary;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as LegacyHtmlSummary;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSummaryText(summary: LegacyHtmlSummary): string | null {
  return asNonEmptyString(summary.extractedText);
}

function readSummaryImageSrcs(summary: LegacyHtmlSummary): string[] {
  if (!Array.isArray(summary.extractedImageSrcs)) return [];
  const deduped = new Set<string>();
  for (const candidate of summary.extractedImageSrcs) {
    const src = asNonEmptyString(candidate);
    if (!src) continue;
    deduped.add(src);
    if (deduped.size >= 6) break;
  }
  return [...deduped];
}

function readSummaryLinks(summary: LegacyHtmlSummary): Array<{ href: string; label: string }> {
  if (!Array.isArray(summary.extractedLinks)) return [];
  const links: Array<{ href: string; label: string }> = [];
  const seen = new Set<string>();
  for (const entry of summary.extractedLinks) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const href = asNonEmptyString((entry as { href?: unknown }).href);
    const label = asNonEmptyString((entry as { label?: unknown }).label);
    if (!href || !label) continue;
    const key = `${href}::${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ href, label });
    if (links.length >= 10) break;
  }
  return links;
}

function renderLegacySummaryHtml(sectionProps: Record<string, unknown>): string {
  const summary = readLegacyHtmlSummary(sectionProps);
  if (!summary) return "";

  const text = readSummaryText(summary);
  const imageSrcs = readSummaryImageSrcs(summary);
  const links = readSummaryLinks(summary);
  if (!text && imageSrcs.length === 0 && links.length === 0) return "";

  const lines: string[] = [];
  lines.push('<div data-gnr8-legacy-summary="visible-v1" style="max-width: 1100px; margin: 0 auto; padding: 28px 16px;">');
  if (text) {
    lines.push(`  <p style="margin: 0 0 20px; font-size: 1rem; line-height: 1.7;">${escapeHtml(text)}</p>`);
  }
  if (imageSrcs.length > 0) {
    lines.push('  <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 0 0 20px;">');
    for (const src of imageSrcs) {
      lines.push(
        `    <img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" style="width: 100%; height: auto; display: block; border-radius: 6px;" />`,
      );
    }
    lines.push("  </div>");
  }
  if (links.length > 0) {
    lines.push('  <ul style="margin: 0; padding-left: 18px;">');
    for (const link of links) {
      lines.push(`    <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`);
    }
    lines.push("  </ul>");
  }
  lines.push("</div>");
  return lines.join("\n");
}

function cssVarName(key: string): string {
  return `--${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function buildCompiledTokenStyles(siteVersion: CanonicalSiteVersionSnapshot): string {
  const mergedTokens: Record<string, string> = {};

  for (const page of siteVersion.pages) {
    for (const [key, value] of Object.entries(page.styleTokens)) {
      if (!mergedTokens[key]) mergedTokens[key] = String(value);
    }
  }

  const lines = Object.keys(mergedTokens)
    .sort()
    .map((key) => `${cssVarName(key)}: ${mergedTokens[key]};`);

  return `:root {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
}

function renderSectionHtml(input: {
  sectionId: string;
  sectionType: string;
  sectionProps: Record<string, unknown>;
}): string {
  const payload = escapeHtml(stableStringify(input.sectionProps));
  const visibleFallback = input.sectionType === "legacy.html" ? renderLegacySummaryHtml(input.sectionProps) : "";
  return `<section data-gnr8-section-id="${escapeHtml(input.sectionId)}" data-gnr8-section-type="${escapeHtml(input.sectionType)}">${visibleFallback}<script type="application/json" data-gnr8-section-props>${payload}</script></section>`;
}

function renderPageBody(page: CanonicalSiteVersionSnapshot["pages"][number]): string {
  const sections = [...(page.structureModel.sections ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((section) =>
      renderSectionHtml({
        sectionId: section.id,
        sectionType: section.type,
        sectionProps: page.contentModel.sectionProps[section.id] ?? {},
      }),
    )
    .join("\n");

  return `<main data-gnr8-page-path="${escapeHtml(page.path)}">\n${sections}\n</main>`;
}

function renderPageDocument(input: {
  page: CanonicalSiteVersionSnapshot["pages"][number];
  compiledTokenStyles: string;
  renderMode: RenderMode;
}): string {
  const pageHtml = renderPageBody(input.page);

  const previewMeta =
    input.renderMode === "PREVIEW"
      ? '<meta name="robots" content="noindex, nofollow" data-gnr8-render-mode="preview" />'
      : '<meta data-gnr8-render-mode="publish" />';

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  ${previewMeta}`,
    `  <title>${escapeHtml(input.page.title ?? "Untitled")}</title>`,
    "  <style>",
    input.compiledTokenStyles,
    "  </style>",
    "</head>",
    "<body>",
    pageHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function buildAssetFingerprintMap(siteVersion: CanonicalSiteVersionSnapshot): Record<string, string> {
  const entries = new Map<string, string>();
  for (const page of siteVersion.pages) {
    for (const asset of page.assetGraph ?? []) {
      const canonicalPath = normalizePagePath(asset.path);
      const fingerprint = sha256Hex(`${canonicalPath}|${asset.mediaType}`);
      entries.set(canonicalPath, fingerprint);
    }
  }

  return Object.fromEntries([...entries.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export function buildDeterministicArtifactBundle(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  renderMode: RenderMode;
}): Omit<RuntimeArtifact, "id" | "createdAt"> {
  const compiledTokenStyles = buildCompiledTokenStyles(input.siteVersion);

  const htmlByPath: Record<string, string> = {};
  for (const page of [...input.siteVersion.pages].sort((a, b) => a.path.localeCompare(b.path))) {
    htmlByPath[normalizePagePath(page.path)] = renderPageDocument({
      page,
      compiledTokenStyles,
      renderMode: input.renderMode,
    });
  }

  const assetFingerprintMap = buildAssetFingerprintMap(input.siteVersion);

  const manifest = {
    siteId: input.siteVersion.siteId,
    siteVersionId: input.siteVersion.id,
    rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
    renderMode: input.renderMode,
    generatedAt: "deterministic",
    paths: Object.keys(htmlByPath).sort(),
    assetFingerprints: assetFingerprintMap,
  } satisfies Record<string, unknown>;

  const bundleSha256 = sha256Hex(
    stableStringify({
      htmlByPath,
      compiledTokenStyles,
      assetFingerprintMap,
      manifest,
    }),
  );

  return {
    siteId: input.siteVersion.siteId,
    siteVersionId: input.siteVersion.id,
    rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
    htmlByPath,
    compiledTokenStyles,
    assetFingerprintMap,
    manifest,
    bundleSha256,
  };
}
