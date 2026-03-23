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

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function sanitizeHref(rawHref: string): string {
  const cleaned = rawHref.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
  if (/^mailto:\s*["']/.test(cleaned)) {
    return cleaned.replace(/^mailto:\s*["']+/, "mailto:").replace(/["']+$/, "");
  }
  return cleaned;
}

function inferMailtoHref(link: { href: string; label: string }): string {
  const normalizedHref = sanitizeHref(link.href);
  if (normalizedHref.toLowerCase().startsWith("mailto:")) return normalizedHref;
  const emailFromLabel = link.label.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  if (emailFromLabel) return `mailto:${emailFromLabel}`;
  return normalizedHref;
}

function classifyLinkSemantic(link: { href: string; label: string }): {
  href: string;
  label: string;
  kind: "tel" | "email" | "contact" | "services" | "internal" | "external";
  score: number;
} {
  const href = sanitizeHref(link.href);
  const label = link.label.trim();
  const hrefLc = href.toLowerCase();
  const labelLc = label.toLowerCase();

  if (hrefLc.startsWith("tel:")) {
    return { href, label, kind: "tel", score: 120 };
  }
  if (hrefLc.startsWith("mailto:") || /@/.test(label)) {
    return { href: inferMailtoHref({ href, label }), label, kind: "email", score: 115 };
  }
  if (
    hrefLc.includes("contact") ||
    hrefLc.includes("kontakt") ||
    labelLc.includes("contact") ||
    labelLc.includes("kontakt")
  ) {
    return { href, label, kind: "contact", score: 95 };
  }
  if (
    hrefLc.includes("service") ||
    hrefLc.includes("prevoz") ||
    labelLc.includes("service") ||
    labelLc.includes("storitve")
  ) {
    return { href, label, kind: "services", score: 80 };
  }
  if (hrefLc.startsWith("/")) {
    return { href, label, kind: "internal", score: 55 };
  }
  return { href, label, kind: "external", score: 35 };
}

function isLikelyLogoOrIcon(src: string): boolean {
  const lc = src.toLowerCase();
  return (
    lc.startsWith("data:image/") ||
    lc.includes("logo") ||
    lc.includes("icon") ||
    lc.includes("favicon") ||
    lc.includes("sprite") ||
    lc.includes("1x1") ||
    lc.includes("16x16") ||
    lc.includes("24x24") ||
    lc.includes("32x32")
  );
}

function scoreImage(src: string, index: number): number {
  const lc = src.toLowerCase();
  let score = 100 - index * 5;
  if (isLikelyLogoOrIcon(src)) score -= 65;
  if (lc.includes("hero") || lc.includes("banner") || lc.includes("header")) score += 24;
  if (lc.includes("/assets/image/")) score += 14;
  if (lc.includes("/uploads/")) score += 10;
  return score;
}

function selectRankedImages(imageSrcs: string[]): string[] {
  return [...imageSrcs]
    .map((src, index) => ({ src, score: scoreImage(src, index), iconLike: isLikelyLogoOrIcon(src) }))
    .filter((entry) => entry.score > 20 && !entry.iconLike)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.src);
}

function pickHeroHeading(sentences: string[]): string | null {
  const ranked = sentences
    .filter((line) => line.length >= 6 && line.length <= 96)
    .map((line, index) => {
      const upperRatio =
        line.replace(/[^A-Z]/g, "").length /
        Math.max(line.replace(/[^A-Za-z]/g, "").length, 1);
      const keywordBoost = /transport|maver|logistics|prevoz|company|d\.o\.o\./i.test(line) ? 0.2 : 0;
      const score = upperRatio + keywordBoost - index * 0.03;
      return { line, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.line ?? null;
}

function pickAboutParagraph(sentences: string[]): string | null {
  const candidates = sentences.filter((line) => line.length >= 70);
  const fallback = sentences.slice(0, 2).join(" ").trim();
  return candidates[0] ?? (fallback || null);
}

function pickServices(sentences: string[]): string[] {
  const serviceHint = /(service|services|prevoz|transport|truck|kamion|evrop|logistics|delivery|destinations?)/i;
  const serviceLike = sentences.filter((line) => serviceHint.test(line) && line.length >= 35);
  if (serviceLike.length >= 2) return serviceLike.slice(0, 4);

  const shortRuns = sentences.filter((line) => line.length >= 24 && line.length <= 110);
  const clusters: string[] = [];
  for (const sentence of shortRuns) {
    if (clusters.some((existing) => existing.toLowerCase() === sentence.toLowerCase())) continue;
    clusters.push(sentence);
    if (clusters.length >= 3) break;
  }
  return clusters;
}

function extractContact(input: { text: string | null; links: Array<{ href: string; label: string }> }): {
  phones: string[];
  emails: string[];
  address: string | null;
} {
  const source = input.text ?? "";
  const phoneMatches = [...source.matchAll(/(?:\+?\d[\d()\-\s]{6,}\d)/g)].map((match) => match[0].trim());
  const emailMatches = [...source.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0].trim());
  const addressMatch =
    source.match(/([A-ZČŠŽ][^.!?]{8,120}\d{3,5}\s+[A-ZČŠŽa-zčšž][^.!?]{0,80})/u)?.[1]?.trim() ?? null;

  const phones = [...new Set(phoneMatches)].slice(0, 3);
  const emails = [...new Set(emailMatches)].slice(0, 3);

  for (const link of input.links) {
    const semantic = classifyLinkSemantic(link);
    if (semantic.kind === "tel" && phones.length < 3) phones.push(semantic.label);
    if (semantic.kind === "email" && emails.length < 3) {
      const mail = semantic.href.replace(/^mailto:/i, "").trim();
      if (mail) emails.push(mail);
    }
  }

  return {
    phones: [...new Set(phones)],
    emails: [...new Set(emails)],
    address: addressMatch,
  };
}

function renderLegacySummaryHtml(sectionProps: Record<string, unknown>): string {
  const summary = readLegacyHtmlSummary(sectionProps);
  if (!summary) return "";

  const text = readSummaryText(summary);
  const imageSrcs = readSummaryImageSrcs(summary);
  const links = readSummaryLinks(summary);
  if (!text && imageSrcs.length === 0 && links.length === 0) return "";

  const sentences = splitIntoSentences(text ?? "");
  const heroHeading = pickHeroHeading(sentences) ?? "Company Overview";
  const intro = sentences.find((line) => line !== heroHeading && line.length >= 45) ?? null;
  const about = pickAboutParagraph(sentences);
  const services = pickServices(sentences);
  const heroImages = selectRankedImages(imageSrcs);
  const contact = extractContact({ text, links });

  const rankedLinks = links
    .map(classifyLinkSemantic)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const lines: string[] = [];
  lines.push('<section data-gnr8-legacy-summary="visible-v2" style="max-width: 1100px; margin: 0 auto; padding: 28px 16px;">');
  lines.push('  <article aria-label="legacy-summary-hero">');
  lines.push(`    <h1 style="margin: 0 0 12px; font-size: 2rem; line-height: 1.2;">${escapeHtml(heroHeading)}</h1>`);
  if (intro) {
    lines.push(`    <p style="margin: 0 0 18px; font-size: 1.05rem; line-height: 1.7;">${escapeHtml(intro)}</p>`);
  }
  if (heroImages.length > 0) {
    lines.push('    <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 0 0 22px;">');
    for (const src of heroImages) {
      lines.push(
        `      <img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" style="width: 100%; height: auto; display: block; border-radius: 8px;" />`,
      );
    }
    lines.push("    </div>");
  }
  lines.push("  </article>");

  if (about) {
    lines.push('  <article aria-label="legacy-summary-about" style="margin-bottom: 20px;">');
    lines.push("    <h2 style=\"margin: 0 0 10px; font-size: 1.3rem;\">About</h2>");
    lines.push(`    <p style="margin: 0; line-height: 1.7;">${escapeHtml(about)}</p>`);
    lines.push("  </article>");
  }

  if (services.length > 0) {
    lines.push('  <article aria-label="legacy-summary-services" style="margin-bottom: 20px;">');
    lines.push("    <h2 style=\"margin: 0 0 10px; font-size: 1.3rem;\">Services</h2>");
    lines.push('    <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">');
    for (const item of services) {
      lines.push(`      <li>${escapeHtml(item)}</li>`);
    }
    lines.push("    </ul>");
    lines.push("  </article>");
  }

  lines.push('  <article aria-label="legacy-summary-contact">');
  lines.push("    <h2 style=\"margin: 0 0 10px; font-size: 1.3rem;\">Contact</h2>");
  if (contact.address) {
    lines.push(`    <p style="margin: 0 0 10px; line-height: 1.6;">${escapeHtml(contact.address)}</p>`);
  }
  if (contact.phones.length > 0 || contact.emails.length > 0 || rankedLinks.length > 0) {
    lines.push('    <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">');
    for (const phone of contact.phones) {
      lines.push(`      <li>${escapeHtml(phone)}</li>`);
    }
    for (const email of contact.emails) {
      lines.push(`      <li>${escapeHtml(email)}</li>`);
    }
    for (const link of rankedLinks) {
      lines.push(`      <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`);
    }
    lines.push("    </ul>");
  }
  lines.push("  </article>");
  lines.push("</section>");

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
