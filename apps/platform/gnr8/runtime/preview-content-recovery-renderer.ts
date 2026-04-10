import { stableStringify } from "@/gnr8/runtime/deterministic";
import type { CanonicalPageVersionSnapshot, RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

export type ArtifactPageRenderMode = "canonical" | "fallback_visible" | "content_recovery";

export type ContentRecoveryReasonCode =
  | "degraded_import"
  | "missing_rendered_capture"
  | "weak_structure"
  | "low_section_count"
  | "weak_dom_quality";

export type ContentRecoveryDiagnosticCode =
  | "CONTENT_RECOVERY_MODE_ACTIVE"
  | "CONTENT_RECOVERY_HERO_SYNTHESIZED"
  | "CONTENT_RECOVERY_TEXT_SURFACED"
  | "CONTENT_RECOVERY_LINKS_SURFACED"
  | "CONTENT_RECOVERY_IMAGES_SURFACED"
  | "CONTENT_RECOVERY_CAPTURE_LAYOUT_ORDERED"
  | "CONTENT_RECOVERY_CTA_PLACED";

export type ContentRecoveryDecision = {
  pageRenderMode: ArtifactPageRenderMode;
  reasons: ContentRecoveryReasonCode[];
};

export type ContentRecoveryRenderResult = {
  html: string;
  diagnostics: ContentRecoveryDiagnosticCode[];
};

type RecoverySectionEntry = {
  sectionId: string;
  sectionType: string;
  sectionProps: Record<string, unknown>;
};

type RecoveryLink = { href: string; label: string };
type RecoveryImage = { src: string; alt: string };
type RecoverySectionRole = "hero" | "content" | "cta" | "media" | "footer";
type RecoverySectionSummary = {
  role: RecoverySectionRole;
  heading: string | null;
  paragraph: string | null;
  links: RecoveryLink[];
  images: RecoveryImage[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripTags(value: string): string {
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeHref(rawHref: string): string | null {
  const href = rawHref.trim();
  if (!href) return null;
  const lower = href.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) return null;
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("/") ||
    lower.startsWith("#") ||
    lower.startsWith("./") ||
    lower.startsWith("../")
  ) {
    return href;
  }
  if (/^[a-z0-9][a-z0-9/_#?&=.%+-]*$/i.test(href)) {
    return `/${href.replace(/^\/+/, "")}`;
  }
  return null;
}

function isSafeInlineImage(src: string): boolean {
  const lower = src.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) return false;
  if (lower.startsWith("data:")) return false;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return false;
  return true;
}

function extractFirstMatch(pattern: RegExp, source: string): string | null {
  const match = source.match(pattern);
  if (!match) return null;
  return asNonEmptyString(stripTags(match[1] ?? ""));
}

function extractTagText(source: string, tagName: "h1" | "h2" | "h3" | "p"): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  for (const match of source.matchAll(pattern)) {
    const text = asNonEmptyString(stripTags(match[1] ?? ""));
    if (!text) continue;
    const folded = text.toLowerCase();
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push(text);
    if (out.length >= 24) break;
  }
  return out;
}

function extractMetaDescription(source: string): string | null {
  const byName = source.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (byName?.[1]) return asNonEmptyString(byName[1]);
  const byContent = source.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  if (byContent?.[1]) return asNonEmptyString(byContent[1]);
  return null;
}

function collectLinksFromHtml(source: string): RecoveryLink[] {
  const out: RecoveryLink[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of source.matchAll(pattern)) {
    const href = sanitizeHref(match[1] ?? "");
    if (!href) continue;
    const label = asNonEmptyString(stripTags(match[2] ?? "")) ?? href;
    const key = `${href.toLowerCase()}::${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ href, label });
    if (out.length >= 20) break;
  }
  return out;
}

function collectImagesFromHtml(source: string): RecoveryImage[] {
  const out: RecoveryImage[] = [];
  const seen = new Set<string>();
  const pattern = /<img\b([^>]+)>/gi;
  for (const match of source.matchAll(pattern)) {
    const attrs = match[1] ?? "";
    const src = sanitizeHref(attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "");
    if (!src) continue;
    const alt = asNonEmptyString(attrs.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "") ?? "Recovered image";
    const key = `${src.toLowerCase()}::${alt.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ src, alt });
    if (out.length >= 20) break;
  }
  return out;
}

function collectSnapshotHtmlCandidate(sectionEntries: RecoverySectionEntry[]): string | null {
  for (const entry of sectionEntries) {
    const htmlCandidate = asNonEmptyString(entry.sectionProps.html);
    if (htmlCandidate && htmlCandidate.includes("<")) return htmlCandidate;

    const markupCandidate = asNonEmptyString(entry.sectionProps.markup);
    if (markupCandidate && markupCandidate.includes("<")) return markupCandidate;

    const legacyHtmlCandidate = asNonEmptyString(entry.sectionProps.legacyHtml);
    if (legacyHtmlCandidate && legacyHtmlCandidate.includes("<")) return legacyHtmlCandidate;
  }
  return null;
}

function sectionRoleFromType(sectionType: string): RecoverySectionRole {
  const normalized = sectionType.toLowerCase();
  if (normalized.includes("hero")) return "hero";
  if (normalized.includes("cta") || normalized.includes("contact")) return "cta";
  if (normalized.includes("gallery") || normalized.includes("media") || normalized.includes("logo")) return "media";
  if (normalized.includes("footer")) return "footer";
  return "content";
}

function collectSectionText(sectionEntries: RecoverySectionEntry[]): {
  headings: string[];
  paragraphs: string[];
  links: RecoveryLink[];
  images: RecoveryImage[];
  extractedText: string[];
} {
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const links: RecoveryLink[] = [];
  const images: RecoveryImage[] = [];
  const extractedText: string[] = [];

  const headingSeen = new Set<string>();
  const paragraphSeen = new Set<string>();
  const linkSeen = new Set<string>();
  const imageSeen = new Set<string>();
  const extractedSeen = new Set<string>();

  const headingKeySet = new Set(["h1", "h2", "h3", "title", "headline", "heading"]);
  const paragraphKeySet = new Set(["text", "summary", "description", "subheadline", "content", "body", "paragraph"]);

  function pushHeading(value: unknown) {
    const text = asNonEmptyString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (headingSeen.has(key)) return;
    headingSeen.add(key);
    headings.push(text);
  }

  function pushParagraph(value: unknown) {
    const text = asNonEmptyString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (paragraphSeen.has(key)) return;
    paragraphSeen.add(key);
    paragraphs.push(text);
  }

  function pushLink(hrefValue: unknown, labelValue: unknown) {
    const hrefRaw = asNonEmptyString(hrefValue);
    if (!hrefRaw) return;
    const href = sanitizeHref(hrefRaw);
    if (!href) return;
    const label = asNonEmptyString(labelValue) ?? href;
    const key = `${href.toLowerCase()}::${label.toLowerCase()}`;
    if (linkSeen.has(key)) return;
    linkSeen.add(key);
    links.push({ href, label });
  }

  function pushImage(srcValue: unknown, altValue: unknown) {
    const srcRaw = asNonEmptyString(srcValue);
    if (!srcRaw) return;
    const src = sanitizeHref(srcRaw);
    if (!src) return;
    const alt = asNonEmptyString(altValue) ?? "Recovered image";
    const key = `${src.toLowerCase()}::${alt.toLowerCase()}`;
    if (imageSeen.has(key)) return;
    imageSeen.add(key);
    images.push({ src, alt });
  }

  function pushExtractedText(value: unknown) {
    const text = asNonEmptyString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (extractedSeen.has(key)) return;
    extractedSeen.add(key);
    extractedText.push(text);
  }

  function walk(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isRecord(value)) {
      pushParagraph(value);
      return;
    }

    pushLink(value.href, value.label ?? value.text ?? value.title ?? value.name);
    pushLink(value.url, value.label ?? value.text ?? value.title ?? value.name);
    pushLink(value.link, value.label ?? value.text ?? value.title ?? value.name);

    pushImage(value.src, value.alt ?? value.caption ?? value.title ?? value.label);
    pushImage(value.image, value.alt ?? value.caption ?? value.title ?? value.label);
    pushImage(value.imageSrc, value.alt ?? value.caption ?? value.title ?? value.label);
    pushImage(value.url, value.alt ?? value.caption ?? value.title ?? value.label);

    const htmlSummary = isRecord(value.htmlSummary) ? value.htmlSummary : null;
    if (htmlSummary) {
      pushExtractedText(htmlSummary.extractedText);
      if (Array.isArray(htmlSummary.extractedLinks)) {
        for (const entry of htmlSummary.extractedLinks) {
          if (!isRecord(entry)) continue;
          pushLink(entry.href, entry.label ?? entry.text ?? entry.title);
        }
      }
      if (Array.isArray(htmlSummary.extractedImageSrcs)) {
        for (const src of htmlSummary.extractedImageSrcs) {
          pushImage(src, "Recovered image");
        }
      }
    }

    const entries = Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, next] of entries) {
      const keyFolded = key.toLowerCase();
      if (headingKeySet.has(keyFolded)) pushHeading(next);
      if (paragraphKeySet.has(keyFolded)) pushParagraph(next);
      walk(next);
    }
  }

  for (const entry of sectionEntries) {
    walk(entry.sectionProps);
  }

  return {
    headings: headings.slice(0, 20),
    paragraphs: paragraphs.slice(0, 40),
    links: links.slice(0, 20),
    images: images.slice(0, 20),
    extractedText: extractedText.slice(0, 8),
  };
}

function pickStringCandidate(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asNonEmptyString(source[key]);
    if (value) return value;
  }
  return null;
}

function collectLinksFromSectionProps(sectionProps: Record<string, unknown>): RecoveryLink[] {
  const links: RecoveryLink[] = [];
  const push = (hrefValue: unknown, labelValue: unknown) => {
    const hrefRaw = asNonEmptyString(hrefValue);
    if (!hrefRaw) return;
    const href = sanitizeHref(hrefRaw);
    if (!href) return;
    const label = asNonEmptyString(labelValue) ?? href;
    links.push({ href, label });
  };

  push(sectionProps.buttonHref, sectionProps.buttonLabel);
  push(sectionProps.ctaHref, sectionProps.ctaLabel);
  push(sectionProps.href, sectionProps.label ?? sectionProps.title ?? sectionProps.text);
  push(sectionProps.url, sectionProps.label ?? sectionProps.title ?? sectionProps.text);

  const htmlSummary = isRecord(sectionProps.htmlSummary) ? sectionProps.htmlSummary : null;
  if (htmlSummary && Array.isArray(htmlSummary.extractedLinks)) {
    for (const entry of htmlSummary.extractedLinks) {
      if (!isRecord(entry)) continue;
      push(entry.href, entry.label ?? entry.text ?? entry.title);
    }
  }

  return links;
}

function collectImagesFromSectionProps(sectionProps: Record<string, unknown>): RecoveryImage[] {
  const images: RecoveryImage[] = [];
  const push = (srcValue: unknown, altValue: unknown) => {
    const srcRaw = asNonEmptyString(srcValue);
    if (!srcRaw) return;
    const src = sanitizeHref(srcRaw);
    if (!src) return;
    images.push({ src, alt: asNonEmptyString(altValue) ?? "Recovered image" });
  };

  push(sectionProps.src, sectionProps.alt);
  push(sectionProps.image, sectionProps.caption ?? sectionProps.alt);
  push(sectionProps.imageSrc, sectionProps.caption ?? sectionProps.alt);

  const htmlSummary = isRecord(sectionProps.htmlSummary) ? sectionProps.htmlSummary : null;
  if (htmlSummary && Array.isArray(htmlSummary.extractedImageSrcs)) {
    for (const src of htmlSummary.extractedImageSrcs) push(src, "Recovered image");
  }

  return images;
}

function summarizeSectionEvidence(sectionEntries: RecoverySectionEntry[]): RecoverySectionSummary[] {
  const out: RecoverySectionSummary[] = [];

  for (const entry of sectionEntries) {
    const props = isRecord(entry.sectionProps) ? entry.sectionProps : {};
    const role = sectionRoleFromType(entry.sectionType);
    const heading =
      pickStringCandidate(props, ["headline", "heading", "title", "h1", "h2"]) ??
      asNonEmptyString((isRecord(props.htmlSummary) ? props.htmlSummary.extractedText : null) ?? null);
    const paragraph = pickStringCandidate(props, ["subheadline", "summary", "description", "text", "body", "paragraph"]);
    out.push({
      role,
      heading,
      paragraph,
      links: collectLinksFromSectionProps(props),
      images: collectImagesFromSectionProps(props),
    });
  }

  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferPageStructuralConfidence(page: CanonicalPageVersionSnapshot): number[] {
  const sections = [...(page.structureModel.sections ?? [])].sort((a, b) => a.order - b.order);
  const governance = page.migrationGovernance ?? null;
  const base = clamp(Number(governance?.pageStructuralConfidence ?? 0.5), 0, 1);
  const weak = new Set(governance?.weakSectionIds ?? []);

  if (sections.length === 0) return [];

  return sections.map((section) => {
    if (weak.has(section.id)) return clamp(base - 0.35, 0, 1);
    return base;
  });
}

export function resolveContentRecoveryDecision(input: {
  page: CanonicalPageVersionSnapshot;
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
}): ContentRecoveryDecision {
  const summary = input.importProvenanceSummary ?? null;
  const hasRecoverySignals = summary != null || input.page.migrationGovernance != null;
  const sectionsDetected = input.page.structureModel.sections?.length ?? 0;

  const fidelityStatus = summary?.importFidelityStatus ?? "unknown";
  const captureStatus = summary?.renderedCapture.status ?? summary?.renderedCaptureStatus ?? "unknown";
  const domQuality = summary?.renderedDomQuality ?? summary?.renderedCapture.quality ?? "unknown";
  const nodeCount = Number(summary?.renderedCapture.nodeCount ?? 0);

  const confidenceValues = inferPageStructuralConfidence(input.page);
  const weakConfidenceCount = confidenceValues.filter((value) => value < 0.5).length;
  const weakStructureMajority = confidenceValues.length > 0 && weakConfidenceCount > confidenceValues.length / 2;

  const reasons: ContentRecoveryReasonCode[] = [];
  if (hasRecoverySignals) {
    if (fidelityStatus !== "high_fidelity_import") reasons.push("degraded_import");
    if (captureStatus !== "available") reasons.push("missing_rendered_capture");
    if (weakStructureMajority) reasons.push("weak_structure");
    if (sectionsDetected <= 2) reasons.push("low_section_count");
    if (nodeCount === 0 || domQuality !== "strong") reasons.push("weak_dom_quality");
  }

  if (reasons.length > 0) {
    return {
      pageRenderMode: "content_recovery",
      reasons,
    };
  }

  const hasWeakSectionPayload = (input.page.structureModel.sections ?? []).some((section) => {
    const sectionProps = input.page.contentModel.sectionProps[section.id] ?? {};
    return !isRecord(sectionProps) || Object.keys(sectionProps).length === 0;
  });

  return {
    pageRenderMode: hasWeakSectionPayload ? "fallback_visible" : "canonical",
    reasons: [],
  };
}

export function renderContentRecoveryPreview(input: {
  page: CanonicalPageVersionSnapshot;
  sectionEntries: RecoverySectionEntry[];
  selectedSourceHtmlPath?: string | null;
  snapshotHtml?: string | null;
}): ContentRecoveryRenderResult {
  const diagnostics: ContentRecoveryDiagnosticCode[] = ["CONTENT_RECOVERY_MODE_ACTIVE", "CONTENT_RECOVERY_HERO_SYNTHESIZED"];

  const snapshotHtml = input.snapshotHtml ?? collectSnapshotHtmlCandidate(input.sectionEntries) ?? "";
  const sectionEvidence = summarizeSectionEvidence(input.sectionEntries);
  const extracted = collectSectionText(input.sectionEntries);

  const title = extractFirstMatch(/<title\b[^>]*>([\s\S]*?)<\/title>/i, snapshotHtml) ?? input.page.title ?? "Recovered page";
  const firstH1 = extractFirstMatch(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, snapshotHtml);
  const metaDescription = extractMetaDescription(snapshotHtml);

  const htmlHeadings = [...extractTagText(snapshotHtml, "h1"), ...extractTagText(snapshotHtml, "h2"), ...extractTagText(snapshotHtml, "h3")];
  const htmlParagraphs = extractTagText(snapshotHtml, "p");
  const htmlLinks = collectLinksFromHtml(snapshotHtml);
  const htmlImages = collectImagesFromHtml(snapshotHtml);

  const headings = [...htmlHeadings, ...extracted.headings];
  const paragraphs = [...htmlParagraphs, ...extracted.paragraphs, ...extracted.extractedText]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 20);
  const links = [...htmlLinks, ...extracted.links];
  const images = [...htmlImages, ...extracted.images];

  const dedupedHeadings = [...new Set(headings.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
  const dedupedParagraphs = [...new Set(paragraphs.map((value) => value.trim()).filter(Boolean))].slice(0, 16);
  const dedupedLinks = [...new Map(links.map((entry) => [`${entry.href.toLowerCase()}::${entry.label.toLowerCase()}`, entry])).values()].slice(0, 12);
  const dedupedImages = [...new Map(images.map((entry) => [`${entry.src.toLowerCase()}::${entry.alt.toLowerCase()}`, entry])).values()].slice(0, 12);
  const roleOrder: Record<RecoverySectionRole, number> = { hero: 0, content: 1, cta: 2, media: 3, footer: 4 };
  const orderedSectionEvidence = sectionEvidence.slice().sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  const heroSection = orderedSectionEvidence.find((section) => section.role === "hero") ?? null;
  const ctaSections = orderedSectionEvidence.filter((section) => section.role === "cta");
  const ctaLinksFromSections = ctaSections.flatMap((section) => section.links);
  const contentSectionEvidence = orderedSectionEvidence.filter((section) => section.role === "content" || section.role === "hero");
  const orderedHeadings = [...contentSectionEvidence.map((section) => section.heading).filter((value): value is string => Boolean(value)), ...dedupedHeadings];
  const orderedParagraphs = [
    ...contentSectionEvidence.map((section) => section.paragraph).filter((value): value is string => Boolean(value)),
    ...dedupedParagraphs,
  ];
  const mergedLinks = [...ctaLinksFromSections, ...dedupedLinks];
  const mergedImages = [...orderedSectionEvidence.flatMap((section) => section.images), ...dedupedImages];
  const dedupedOrderedHeadings = [...new Set(orderedHeadings.map((value) => value.trim()).filter(Boolean))].slice(0, 10);
  const dedupedOrderedParagraphs = [...new Set(orderedParagraphs.map((value) => value.trim()).filter(Boolean))].slice(0, 16);
  const dedupedMergedLinks = [...new Map(mergedLinks.map((entry) => [`${entry.href.toLowerCase()}::${entry.label.toLowerCase()}`, entry])).values()].slice(0, 12);
  const dedupedMergedImages = [...new Map(mergedImages.map((entry) => [`${entry.src.toLowerCase()}::${entry.alt.toLowerCase()}`, entry])).values()].slice(0, 12);

  const heroHeadline = heroSection?.heading ?? firstH1 ?? dedupedOrderedHeadings[0] ?? title;
  const heroSupporting = heroSection?.paragraph ?? metaDescription ?? dedupedOrderedParagraphs[0] ?? "Imported content recovered for preview.";

  if (dedupedOrderedParagraphs.length > 0 || dedupedOrderedHeadings.length > 0) {
    diagnostics.push("CONTENT_RECOVERY_TEXT_SURFACED");
  }
  if (dedupedMergedLinks.length > 0) {
    diagnostics.push("CONTENT_RECOVERY_LINKS_SURFACED");
  }
  if (dedupedMergedImages.length > 0) {
    diagnostics.push("CONTENT_RECOVERY_IMAGES_SURFACED");
  }
  if (orderedSectionEvidence.length > 0) {
    diagnostics.push("CONTENT_RECOVERY_CAPTURE_LAYOUT_ORDERED");
  }

  const lines: string[] = [];
  lines.push(`<main data-gnr8-render-mode="content-recovery" data-gnr8-page-path="${escapeHtml(input.page.path)}">`);
  lines.push('  <section data-gnr8-recovery-block="hero">');
  lines.push(`    <h1>${escapeHtml(heroHeadline)}</h1>`);
  lines.push(`    <p>${escapeHtml(heroSupporting)}</p>`);
  if (input.selectedSourceHtmlPath) {
    lines.push(`    <p><small>Recovered from: ${escapeHtml(input.selectedSourceHtmlPath)}</small></p>`);
  }
  lines.push('  </section>');

  const textBlocks = Math.max(2, Math.min(6, Math.max(dedupedOrderedHeadings.length, dedupedOrderedParagraphs.length)));
  for (let i = 0; i < textBlocks; i += 1) {
    const heading = dedupedOrderedHeadings[i] ?? `Recovered Section ${i + 1}`;
    const paragraph = dedupedOrderedParagraphs[i] ?? dedupedOrderedParagraphs[0] ?? "Imported text content is available in embedded section payloads.";
    lines.push('  <section data-gnr8-recovery-block="text">');
    lines.push(`    <h2>${escapeHtml(heading)}</h2>`);
    lines.push(`    <p>${escapeHtml(paragraph)}</p>`);
    lines.push('  </section>');
  }

  if (dedupedMergedLinks.length > 0 && ctaSections.length > 0) {
    const primaryCta = dedupedMergedLinks[0]!;
    lines.push('  <section data-gnr8-recovery-block="cta">');
    lines.push("    <h3>Primary Action</h3>");
    lines.push(`    <p><a href="${escapeHtml(primaryCta.href)}">${escapeHtml(primaryCta.label)}</a></p>`);
    lines.push("  </section>");
    diagnostics.push("CONTENT_RECOVERY_CTA_PLACED");
  }

  if (dedupedMergedLinks.length > 0) {
    lines.push('  <section data-gnr8-recovery-block="links">');
    lines.push('    <h3>Links</h3>');
    lines.push('    <ul>');
    for (const link of dedupedMergedLinks) {
      lines.push(`      <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`);
    }
    lines.push('    </ul>');
    lines.push('  </section>');
  }

  if (dedupedMergedImages.length > 0) {
    lines.push('  <section data-gnr8-recovery-block="images">');
    lines.push('    <h3>Images</h3>');
    for (const image of dedupedMergedImages) {
      if (isSafeInlineImage(image.src)) {
        lines.push(`    <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async" />`);
      } else {
        const href = sanitizeHref(image.src);
        lines.push('    <figure data-gnr8-recovery-image="placeholder">');
        lines.push('      <div>Image source kept as reference</div>');
        if (href) {
          lines.push(`      <figcaption><a href="${escapeHtml(href)}">${escapeHtml(image.src)}</a></figcaption>`);
        } else {
          lines.push(`      <figcaption>${escapeHtml(image.src)}</figcaption>`);
        }
        lines.push('    </figure>');
      }
    }
    lines.push('  </section>');
  }

  lines.push('  <section data-gnr8-recovery-block="embedded-section-props" hidden aria-hidden="true">');
  for (const section of input.sectionEntries) {
    const payload = escapeHtml(stableStringify(section.sectionProps));
    lines.push(
      `    <section data-gnr8-section-id="${escapeHtml(section.sectionId)}" data-gnr8-section-type="${escapeHtml(section.sectionType)}"><script type="application/json" data-gnr8-section-props>${payload}</script></section>`,
    );
  }
  lines.push('  </section>');

  lines.push('</main>');

  return {
    html: lines.join("\n"),
    diagnostics: [...new Set(diagnostics)],
  };
}
