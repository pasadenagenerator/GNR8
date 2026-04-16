import { normalizePagePath, sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import {
  renderContentRecoveryPreview,
  resolveContentRecoveryDecision,
  type ArtifactPageRenderMode,
  type ContentRecoveryDiagnosticCode,
  type ContentRecoveryReasonCode,
} from "@/gnr8/runtime/preview-content-recovery-renderer";
import { renderPreviewFallbackSectionHtml } from "@/gnr8/runtime/preview-fallback-renderer";
import type { CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact } from "@/gnr8/runtime/types";
import { buildPersistedPreviewRuntimeSummary } from "@/gnr8/preview-runtime/preview-runtime-preparation";

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

type LegacySummaryTheme = {
  bg: string;
  text: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  accentSoft: string;
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
    .split(/(?<=[.!?])\s+|(?=\b(?:About us|O nas|Contact|Kontakt)\b:?\s*)/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function uniqueByCaseFold(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const folded = line.toLowerCase();
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push(line);
  }
  return out;
}

function normalizeSentenceForDisplay(line: string): string {
  return line
    .replace(/^(?:home|o nas|about us|about|kontakt|contact|legal|pravno|privacy|terms)\b[:\s-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
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

function isLikelyFileAssetHref(href: string): boolean {
  const hrefLc = sanitizeHref(href).toLowerCase();
  if (hrefLc.includes("/assets/image/")) return true;
  if (hrefLc.startsWith("data:")) return true;
  return /\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico|pdf|doc|docx|xls|xlsx|zip|rar)(?:[?#].*)?$/i.test(hrefLc);
}

function normalizePhoneKey(value: string): string {
  let digits = value.replace(/\D+/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function normalizeEmailKey(value: string): string {
  return value.trim().toLowerCase();
}

function hasCompanySuffix(line: string): boolean {
  return /\b(?:d\.o\.o\.|d\.d\.|s\.p\.|l\.l\.c\.|llc|ltd\.?|inc\.?|gmbh)\b/i.test(line);
}

function extractCompanyNameCandidate(line: string): string | null {
  const normalized = normalizeWhitespace(line);
  const stripNoisyPrefix = (value: string): string =>
    normalizeWhitespace(value).replace(/^(?:legal|pravn[ae]|privacy|terms)\s+/i, "").trim();
  const companyLikeUpper = normalized.match(
    /\b([A-ZČŠŽ][A-ZČŠŽ0-9&'.\- ]{2,68}?\s+(?:D\.O\.O\.|D\.D\.|S\.P\.|L\.L\.C\.|LLC|LTD\.?|INC\.?|GMBH))\b/u,
  )?.[1];
  if (companyLikeUpper) return stripNoisyPrefix(companyLikeUpper) || null;

  const titleCaseWithSuffix = normalized.match(
    /\b([A-ZČŠŽ][A-Za-zČŠŽčšž0-9&'.\- ]{2,68}?\s+(?:d\.o\.o\.|d\.d\.|s\.p\.|l\.l\.c\.|llc|ltd\.?|inc\.?|gmbh))\b/u,
  )?.[1];
  if (titleCaseWithSuffix) return stripNoisyPrefix(titleCaseWithSuffix) || null;

  return null;
}

function isLegalOrPolicyNoise(line: string): boolean {
  return /\b(legal|pravn[ae]|privacy|terms|cookies?|gdpr|all rights reserved|copyright)\b/i.test(line);
}

function isUtilityFragment(line: string): boolean {
  return /^(menu|home|kontakt|contact|about|o nas|galerija|gallery|informacije)$/i.test(line.trim());
}

function classifyLinkSemantic(link: { href: string; label: string }): {
  href: string;
  label: string;
  kind: "tel" | "email" | "contact" | "map" | "services" | "internal" | "external" | "discard";
  score: number;
} {
  const href = sanitizeHref(link.href);
  const label = link.label.trim();
  const hrefLc = href.toLowerCase();
  const labelLc = label.toLowerCase();

  if (hrefLc.startsWith("#")) {
    return { href, label, kind: "discard", score: -120 };
  }
  if (hrefLc.includes("oneclick") || hrefLc.includes("menu")) {
    return { href, label, kind: "discard", score: -120 };
  }
  if (isLikelyFileAssetHref(hrefLc)) {
    return { href, label, kind: "discard", score: -120 };
  }
  if (/(^|[^\w])(home|about|o nas|gallery|galerija|legal|pravn[ae] informacije|privacy|terms)([^\w]|$)/i.test(label)) {
    return { href, label, kind: "discard", score: -100 };
  }
  if (/(^|\/)(legal|privacy|terms|cookies?)(\/|$)/i.test(hrefLc)) {
    return { href, label, kind: "discard", score: -100 };
  }

  if (hrefLc.startsWith("tel:")) {
    return { href, label, kind: "tel", score: 120 };
  }
  if (hrefLc.startsWith("mailto:") || /@/.test(label)) {
    return { href: inferMailtoHref({ href, label }), label, kind: "email", score: 115 };
  }
  if (
    hrefLc.includes("maps.google.") ||
    hrefLc.includes("/maps/") ||
    hrefLc.includes("/dir/") ||
    labelLc.includes("navodila") ||
    labelLc.includes("directions") ||
    labelLc.includes("map")
  ) {
    return { href, label, kind: "map", score: 100 };
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

function imageSemanticKey(src: string): string {
  const withoutQuery = src.split("?")[0]?.split("#")[0] ?? src;
  const basename = withoutQuery.split("/").pop() ?? withoutQuery;
  const withoutExt = basename.replace(/\.[a-z0-9]+$/i, "");
  const longHexChunks = withoutExt.toLowerCase().match(/[a-f0-9]{20,}/g);
  if (longHexChunks && longHexChunks.length > 0) {
    return longHexChunks[0]!.slice(0, 80);
  }
  return withoutExt
    .toLowerCase()
    .replace(/^[a-f0-9]{8,16}-/, "")
    .replace(/^[-_]+/, "")
    .replace(/^img-/, "")
    .replace(/^image-/, "")
    .replace(/^photo-/, "")
    .replace(/[_-]v(?:er)?[_-]?\d+$/, "")
    .replace(/[_-]v(?:er)?$/, "")
    .replace(/[_-]\d{2,4}$/, "")
    .replace(/[_-]\d+x\d+$/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
}

function scoreImageDimensions(src: string): number {
  const matches = [...src.matchAll(/(\d{2,4})x(\d{2,4})/g)];
  if (matches.length === 0) return 0;
  let maxDim = 0;
  for (const match of matches) {
    const a = Number.parseInt(match[1] ?? "0", 10);
    const b = Number.parseInt(match[2] ?? "0", 10);
    maxDim = Math.max(maxDim, a, b);
  }
  if (maxDim >= 1400) return 16;
  if (maxDim >= 900) return 12;
  if (maxDim >= 500) return 8;
  if (maxDim >= 260) return 4;
  return 1;
}

function scoreImage(
  src: string,
  index: number,
  input: { keysWithUploads: Set<string>; keysWithAssetsImage: Set<string> },
): number {
  const lc = src.toLowerCase();
  const key = imageSemanticKey(src);
  let score = 100 - index * 5;
  if (isLikelyLogoOrIcon(src)) score -= 65;
  if (lc.includes("hero") || lc.includes("banner") || lc.includes("header")) score += 24;
  if (lc.includes("/assets/image/")) score += 10;
  if (lc.includes("/uploads/")) score += 14;
  if (lc.includes("/uploads/") && input.keysWithAssetsImage.has(key)) score += 18;
  if (lc.includes("/assets/image/") && input.keysWithUploads.has(key)) score -= 30;
  score += scoreImageDimensions(src);
  return score;
}

function selectRankedImages(imageSrcs: string[]): string[] {
  const keysWithAssetsImage = new Set(
    imageSrcs.filter((src) => src.toLowerCase().includes("/assets/image/")).map((src) => imageSemanticKey(src)),
  );
  const keysWithUploads = new Set(
    imageSrcs.filter((src) => src.toLowerCase().includes("/uploads/")).map((src) => imageSemanticKey(src)),
  );
  const pickedByKey = new Map<string, { src: string; score: number; iconLike: boolean }>();
  for (const [index, src] of imageSrcs.entries()) {
    const key = imageSemanticKey(src);
    if (!key) continue;
    const next = {
      src,
      score: scoreImage(src, index, { keysWithUploads, keysWithAssetsImage }),
      iconLike: isLikelyLogoOrIcon(src),
    };
    const current = pickedByKey.get(key);
    if (!current || next.score > current.score) pickedByKey.set(key, next);
  }

  return [...pickedByKey.values()]
    .filter((entry) => entry.score > 20 && !entry.iconLike)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.src);
}

function pickHeroHeading(sentences: string[]): string | null {
  const ranked = sentences
    .filter((line) => !isLikelyNavigationNoise(line))
    .filter((line) => !isContactHeavyLine(line))
    .filter((line) => line.length >= 6 && line.length <= 96)
    .map((line, index) => {
      const companyCandidate = extractCompanyNameCandidate(line);
      const candidateLine = (companyCandidate ?? line).replace(/^(?:legal|pravn[ae]|privacy|terms)\s+/i, "").trim();
      const upperRatio =
        candidateLine.replace(/[^A-ZČŠŽ]/g, "").length /
        Math.max(candidateLine.replace(/[^A-Za-zČŠŽčšž]/g, "").length, 1);
      const wordCount = (candidateLine.match(/[A-Za-zČŠŽčšž0-9]+/g) ?? []).length;
      const keywordBoost = /transport|logistics|prevoz|company|fleet|cargo|shipping/i.test(candidateLine) ? 0.45 : 0;
      const companyBoost = hasCompanySuffix(candidateLine) ? 1.35 : 0;
      const uppercaseBoost = upperRatio >= 0.65 && wordCount >= 2 ? 0.35 : 0;
      const titleLenBoost = wordCount >= 2 && wordCount <= 7 ? 0.25 : -0.2;
      const legalPenalty = isLegalOrPolicyNoise(line) ? 1.45 : 0;
      const utilityPenalty = isUtilityFragment(candidateLine) ? 1.2 : 0;
      const navPenalty = isLikelyNavigationNoise(line) ? 1.1 : 0;
      const score = upperRatio * 0.85 + keywordBoost + companyBoost + uppercaseBoost + titleLenBoost - legalPenalty - utilityPenalty - navPenalty - index * 0.04;
      return { line: candidateLine, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.line ?? null;
}

function pickAboutParagraph(sentences: string[]): string | null {
  const candidates = sentences.filter((line) => line.length >= 70 && !isLikelyNavigationNoise(line) && !isContactHeavyLine(line));
  const fallback = sentences
    .filter((line) => line.length >= 28 && !isLikelyNavigationNoise(line) && !isContactHeavyLine(line))
    .slice(0, 2)
    .join(" ")
    .trim();
  return candidates[0] ?? (fallback || null);
}

function pickServices(sentences: string[]): string[] {
  const serviceHint = /(service|services|prevoz|transport|truck|kamion|evrop|logistics|delivery|destinations?)/i;
  const serviceLike = sentences.filter(
    (line) => serviceHint.test(line) && line.length >= 35 && !isLikelyNavigationNoise(line) && !isContactHeavyLine(line),
  );
  if (serviceLike.length >= 2) return serviceLike.slice(0, 4).map(normalizeSentenceForDisplay);

  const shortRuns = sentences.filter(
    (line) => line.length >= 24 && line.length <= 110 && !isLikelyNavigationNoise(line) && !isContactHeavyLine(line),
  );
  const clusters: string[] = [];
  for (const sentence of shortRuns) {
    if (clusters.some((existing) => existing.toLowerCase() === sentence.toLowerCase())) continue;
    clusters.push(sentence);
    if (clusters.length >= 3) break;
  }
  return clusters.map(normalizeSentenceForDisplay);
}

function isLikelyNavigationNoise(line: string): boolean {
  const lc = line.toLowerCase();
  if (hasCompanySuffix(line)) return false;
  const navWordHits = (lc.match(/\b(home|o nas|about|galerija|gallery|kontakt|contact|legal|informacije|navodila)\b/g) ?? []).length;
  const short = line.length < 140;
  if (/\bhome\b/.test(lc) && navWordHits >= 2 && short) return true;
  if (navWordHits >= 3 && line.length < 180) return true;
  return navWordHits >= 2 && line.length < 96;
}

function isContactHeavyLine(line: string): boolean {
  const phones = (line.match(/(?:\+?\d[\d()\-\s]{6,}\d)/g) ?? []).length;
  const emails = (line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).length;
  return phones + emails >= 2;
}

function pickTokenValue(styleTokens: Record<string, string>, candidates: string[]): string | null {
  for (const key of candidates) {
    const value = styleTokens[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function isCssColorToken(value: string | null): value is string {
  if (!value) return false;
  return (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
    /^rgb(a)?\(/i.test(value) ||
    /^hsl(a)?\(/i.test(value)
  );
}

function resolveLegacySummaryTheme(input: {
  styleTokens: Record<string, string>;
  summaryText: string | null;
}): LegacySummaryTheme {
  const tokenText = pickTokenValue(input.styleTokens, ["color.text", "text.color", "typography.color.body"]);
  const tokenBg = pickTokenValue(input.styleTokens, ["color.background", "surface.background", "page.background"]);
  const tokenAccent = pickTokenValue(input.styleTokens, [
    "color.primary",
    "brand.primary",
    "color.accent",
    "link.color",
    "button.primary.background",
  ]);
  const slovenianSignals = /(naše|prevozi|kontakt|o nas|galerija|kamion|podjetje)/i.test(input.summaryText ?? "");

  const text = isCssColorToken(tokenText) ? tokenText : "#172027";
  const bg = isCssColorToken(tokenBg) ? tokenBg : "#f2f6fa";
  const accent = isCssColorToken(tokenAccent) ? tokenAccent : slovenianSignals ? "#1e577f" : "#245b74";

  return {
    bg,
    text,
    accent,
    surface: "#ffffff",
    surfaceAlt: "#f7fafc",
    border: "#cfdae4",
    accentSoft: "rgba(36, 91, 116, 0.10)",
  };
}

function extractContact(input: { text: string | null; links: Array<{ href: string; label: string }> }): {
  phones: string[];
  emails: string[];
  address: string | null;
} {
  const source = input.text ?? "";
  const phoneMatches = [...source.matchAll(/(?:\+?\d[\d()\-\s]{6,}\d)/g)].map((match) => normalizeWhitespace(match[0] ?? ""));
  const emailMatches = [...source.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => normalizeWhitespace(match[0] ?? ""));

  const phones: string[] = [];
  const phoneKeys = new Set<string>();
  for (const value of phoneMatches) {
    const key = normalizePhoneKey(value);
    if (!key || key.length < 7 || phoneKeys.has(key)) continue;
    phoneKeys.add(key);
    phones.push(value);
    if (phones.length >= 4) break;
  }

  const emails: string[] = [];
  const emailKeys = new Set<string>();
  for (const value of emailMatches) {
    const key = normalizeEmailKey(value);
    if (!key || emailKeys.has(key)) continue;
    emailKeys.add(key);
    emails.push(value);
    if (emails.length >= 4) break;
  }

  const addressCandidates = splitIntoSentences(source)
    .map(normalizeSentenceForDisplay)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 18 && line.length <= 140)
    .filter((line) => !isLikelyNavigationNoise(line))
    .filter((line) => !isContactHeavyLine(line))
    .filter((line) => !/\b(about us|home|galerija|gallery|legal|pravno|privacy|terms)\b/i.test(line))
    .filter(
      (line) =>
        (/\b(?:street|st\.|road|rd\.|avenue|ave\.|drive|dr\.|boulevard|blvd\.|ulica|cesta|trg)\b/i.test(line) &&
          /\d{1,4}/.test(line)) ||
        (/\d{4,5}\b/.test(line) && /[A-Za-zČŠŽčšž]{3,}/.test(line)),
    );
  const addressMatch = addressCandidates[0] ?? null;

  for (const link of input.links) {
    const semantic = classifyLinkSemantic(link);
    if (semantic.kind === "tel" && phones.length < 4) {
      const key = normalizePhoneKey(semantic.label);
      if (key && !phoneKeys.has(key)) {
        phoneKeys.add(key);
        phones.push(semantic.label);
      }
    }
    if (semantic.kind === "email" && emails.length < 4) {
      const mail = semantic.href.replace(/^mailto:/i, "").trim();
      const key = normalizeEmailKey(mail);
      if (mail && key && !emailKeys.has(key)) {
        emailKeys.add(key);
        emails.push(mail);
      }
    }
  }

  return {
    phones: phones.slice(0, 3),
    emails: emails.slice(0, 3),
    address: addressMatch,
  };
}

function renderLegacySummaryHtml(input: {
  sectionProps: Record<string, unknown>;
  styleTokens: Record<string, string>;
}): string {
  const { sectionProps, styleTokens } = input;
  const summary = readLegacyHtmlSummary(sectionProps);
  if (!summary) return "";

  const text = readSummaryText(summary);
  const imageSrcs = readSummaryImageSrcs(summary);
  const links = readSummaryLinks(summary);
  if (!text && imageSrcs.length === 0 && links.length === 0) return "";

  const sentences = uniqueByCaseFold(splitIntoSentences(text ?? "").map(normalizeSentenceForDisplay).filter((line) => line.length > 0));
  const heroHeading = pickHeroHeading(sentences) ?? "Company Overview";
  const intro =
    sentences.find(
      (line) => line !== heroHeading && line.length >= 45 && !isLikelyNavigationNoise(line) && !isContactHeavyLine(line),
    ) ?? null;
  const about = pickAboutParagraph(sentences);
  const services = pickServices(sentences);
  const heroImages = selectRankedImages(imageSrcs);
  const contact = extractContact({ text, links });
  const theme = resolveLegacySummaryTheme({ styleTokens, summaryText: text });
  const slovenianSignals = /(naše|prevozi|kontakt|o nas|galerija|kamion|podjetje)/i.test(text ?? "");
  const labels = slovenianSignals
    ? { about: "O Podjetju", services: "Storitve", contact: "Kontakt", overview: "Prevozi Po Evropi" }
    : { about: "About", services: "Services", contact: "Contact", overview: "Transport Across Europe" };

  const rankedLinks = links
    .map(classifyLinkSemantic)
    .filter((link) => link.kind !== "discard")
    .filter((link) => link.kind === "tel" || link.kind === "email" || link.kind === "contact" || link.kind === "map")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const lines: string[] = [];
  lines.push(
    `<section data-gnr8-legacy-summary="visible-v2" style="max-width: 1120px; margin: 0 auto; padding: clamp(18px, 3vw, 32px) 16px 52px; color: ${escapeHtml(theme.text)};">`,
  );
  lines.push("  <style>");
  lines.push(
    `    [data-gnr8-legacy-summary="visible-v2"] { --gnr8-bg: ${escapeHtml(theme.bg)}; --gnr8-surface: ${escapeHtml(theme.surface)}; --gnr8-surface-alt: ${escapeHtml(theme.surfaceAlt)}; --gnr8-border: ${escapeHtml(theme.border)}; --gnr8-accent: ${escapeHtml(theme.accent)}; --gnr8-accent-soft: ${escapeHtml(theme.accentSoft)}; font-family: "Trebuchet MS", "Segoe UI", sans-serif; color: inherit; line-height: 1.6; background: radial-gradient(circle at top right, var(--gnr8-accent-soft), transparent 45%), var(--gnr8-bg); border-radius: 18px; }`,
  );
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-card { background: linear-gradient(180deg, var(--gnr8-surface) 0%, var(--gnr8-surface-alt) 100%); border: 1px solid var(--gnr8-border); border-radius: 16px; padding: clamp(16px, 2vw, 24px); box-shadow: 0 10px 28px rgba(12, 37, 56, 0.08); }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-title { margin: 0; font-size: clamp(1.8rem, 3.2vw, 2.65rem); line-height: 1.12; color: #0d2230; max-width: 28ch; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-eyebrow { margin: 0 0 10px; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.13em; color: var(--gnr8-accent); font-weight: 800; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 18px 0 2px; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-grid img { width: 100%; aspect-ratio: 5 / 4; object-fit: cover; display: block; border-radius: 12px; border: 1px solid var(--gnr8-border); background: #eef4f8; box-shadow: 0 8px 20px rgba(15, 35, 52, 0.12); }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-section { margin-top: 16px; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-section h2 { margin: 0 0 8px; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--gnr8-accent); }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] ul { margin: 0; padding-left: 18px; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] li { margin: 0 0 6px; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] a { color: var(--gnr8-accent); text-underline-offset: 2px; }');
  lines.push('    [data-gnr8-legacy-summary="visible-v2"] .gnr8-columns { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 16px; }');
  lines.push('    @media (max-width: 720px) { [data-gnr8-legacy-summary="visible-v2"] { padding-bottom: 34px; } [data-gnr8-legacy-summary="visible-v2"] .gnr8-title { max-width: none; } }');
  lines.push("  </style>");
  lines.push('  <article class="gnr8-card" aria-label="legacy-summary-hero">');
  lines.push(`    <p class="gnr8-eyebrow">${escapeHtml(labels.overview)}</p>`);
  lines.push(`    <h1 class="gnr8-title">${escapeHtml(heroHeading)}</h1>`);
  if (intro) {
    lines.push(`    <p style="margin: 10px 0 0; font-size: 1.03rem;">${escapeHtml(intro)}</p>`);
  }
  if (heroImages.length > 0) {
    lines.push('    <div class="gnr8-grid">');
    for (const src of heroImages) {
      lines.push(
        `      <img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />`,
      );
    }
    lines.push("    </div>");
  }
  lines.push("  </article>");
  lines.push('  <div class="gnr8-columns">');
  if (about) {
    lines.push('    <article class="gnr8-card gnr8-section" aria-label="legacy-summary-about">');
    lines.push(`      <h2>${escapeHtml(labels.about)}</h2>`);
    lines.push(`      <p style="margin: 0;">${escapeHtml(about)}</p>`);
    lines.push("    </article>");
  }

  if (services.length > 0) {
    lines.push('    <article class="gnr8-card gnr8-section" aria-label="legacy-summary-services">');
    lines.push(`      <h2>${escapeHtml(labels.services)}</h2>`);
    lines.push("      <ul>");
    for (const item of services) {
      lines.push(`        <li>${escapeHtml(item)}</li>`);
    }
    lines.push("      </ul>");
    lines.push("    </article>");
  }
  lines.push("  </div>");

  lines.push('  <article class="gnr8-card gnr8-section" aria-label="legacy-summary-contact">');
  lines.push(`    <h2>${escapeHtml(labels.contact)}</h2>`);
  if (contact.address) {
    lines.push(`    <p style="margin: 0 0 10px;">${escapeHtml(contact.address)}</p>`);
  }
  if (contact.phones.length > 0 || contact.emails.length > 0 || rankedLinks.length > 0) {
    const contactItems = new Set<string>();
    lines.push("    <ul>");
    for (const phone of contact.phones) {
      const folded = `phone:${normalizePhoneKey(phone)}`;
      if (contactItems.has(folded)) continue;
      contactItems.add(folded);
      lines.push(`      <li>${escapeHtml(phone)}</li>`);
    }
    for (const email of contact.emails) {
      const folded = `email:${normalizeEmailKey(email)}`;
      if (contactItems.has(folded)) continue;
      contactItems.add(folded);
      lines.push(`      <li>${escapeHtml(email)}</li>`);
    }
    for (const link of rankedLinks) {
      const folded =
        link.kind === "tel"
          ? `phone:${normalizePhoneKey(link.label || link.href)}`
          : link.kind === "email"
            ? `email:${normalizeEmailKey(link.href.replace(/^mailto:/i, "") || link.label)}`
            : `link:${link.href.toLowerCase()}::${link.label.toLowerCase()}`;
      if (contactItems.has(folded)) continue;
      contactItems.add(folded);
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
  styleTokens: Record<string, string>;
}): string {
  const payload = escapeHtml(stableStringify(input.sectionProps));
  const legacyVisibleFallback =
    input.sectionType === "legacy.html"
      ? renderLegacySummaryHtml({ sectionProps: input.sectionProps, styleTokens: input.styleTokens })
      : "";
  const visibleFallback = legacyVisibleFallback || renderPreviewFallbackSectionHtml({
    sectionType: input.sectionType,
    sectionProps: input.sectionProps,
  });
  return `<section data-gnr8-section-id="${escapeHtml(input.sectionId)}" data-gnr8-section-type="${escapeHtml(input.sectionType)}">${visibleFallback}<script type="application/json" data-gnr8-section-props>${payload}</script></section>`;
}

function renderCanonicalSections(page: CanonicalSiteVersionSnapshot["pages"][number]): string {
  return [...(page.structureModel.sections ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((section) =>
      renderSectionHtml({
        sectionId: section.id,
        sectionType: section.type,
        sectionProps: page.contentModel.sectionProps[section.id] ?? {},
        styleTokens: page.styleTokens,
      }),
    )
    .join("\n");
}

function renderPageBody(input: {
  page: CanonicalSiteVersionSnapshot["pages"][number];
  pageRenderMode: ArtifactPageRenderMode;
  selectedSourceHtmlPath?: string | null;
}): {
  html: string;
  diagnostics: ContentRecoveryDiagnosticCode[];
} {
  const sections = renderCanonicalSections(input.page);
  if (input.pageRenderMode !== "content_recovery") {
    return {
      html: `<main data-gnr8-page-path="${escapeHtml(input.page.path)}">\n${sections}\n</main>`,
      diagnostics: [],
    };
  }

  const recovery = renderContentRecoveryPreview({
    page: input.page,
    sectionEntries: [...(input.page.structureModel.sections ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        sectionId: section.id,
        sectionType: section.type,
        sectionProps: input.page.contentModel.sectionProps[section.id] ?? {},
      })),
    selectedSourceHtmlPath: input.selectedSourceHtmlPath ?? null,
  });
  return {
    html: recovery.html,
    diagnostics: recovery.diagnostics,
  };
}

function renderPageDocument(input: {
  page: CanonicalSiteVersionSnapshot["pages"][number];
  pageHtml: string;
  compiledTokenStyles: string;
  renderMode: RenderMode;
}): string {
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
    input.pageHtml,
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
}): Omit<RuntimeArtifact, "id" | "createdAt" | "publishStage" | "shadowRestricted" | "artifactGovernance"> {
  const compiledTokenStyles = buildCompiledTokenStyles(input.siteVersion);

  const htmlByPath: Record<string, string> = {};
  const pageRenderModes: Record<string, ArtifactPageRenderMode> = {};
  const pageRecoveryReasons: Record<string, ContentRecoveryReasonCode[]> = {};
  const recoveryDiagnosticCodes = new Set<ContentRecoveryDiagnosticCode>();
  const selectedSourceHtmlPath = input.siteVersion.importProvenanceSummary?.captureEvidence.selectedSourceHtmlPath ?? null;

  for (const page of [...input.siteVersion.pages].sort((a, b) => a.path.localeCompare(b.path))) {
    const normalizedPath = normalizePagePath(page.path);
    const decision = resolveContentRecoveryDecision({
      page,
      importProvenanceSummary: input.siteVersion.importProvenanceSummary ?? null,
    });
    const rendered = renderPageBody({
      page,
      pageRenderMode: decision.pageRenderMode,
      selectedSourceHtmlPath,
    });
    for (const code of rendered.diagnostics) recoveryDiagnosticCodes.add(code);
    pageRenderModes[normalizedPath] = decision.pageRenderMode;
    if (decision.reasons.length > 0) pageRecoveryReasons[normalizedPath] = decision.reasons;

    htmlByPath[normalizedPath] = renderPageDocument({
      page,
      pageHtml: rendered.html,
      compiledTokenStyles,
      renderMode: input.renderMode,
    });
  }

  const assetFingerprintMap = buildAssetFingerprintMap(input.siteVersion);

  const persistedPreviewRuntimeSummary = buildPersistedPreviewRuntimeSummary({
    siteVersion: input.siteVersion,
    routePath: "/",
  });
  const renderedCaptureSummary = input.siteVersion.importProvenanceSummary?.renderedCapture ?? null;
  const domSize = Math.max(0, Math.floor(Number(renderedCaptureSummary?.nodeCount ?? 0)));
  const screenshotCount = Math.max(0, Math.floor(Number(input.siteVersion.importProvenanceSummary?.screenshotCount ?? 0)));
  const renderedCaptureStatus = String(renderedCaptureSummary?.status ?? "").trim().toLowerCase();
  const renderedCaptureUsed = Boolean(
    renderedCaptureSummary?.used &&
      (renderedCaptureStatus === "available" || renderedCaptureStatus === "partial") &&
      (domSize > 0 || screenshotCount > 0),
  );

  const manifest = {
    siteId: input.siteVersion.siteId,
    siteVersionId: input.siteVersion.id,
    rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
    renderMode: input.renderMode,
    pageRenderModes: Object.fromEntries(Object.entries(pageRenderModes).sort((a, b) => a[0].localeCompare(b[0]))),
    pageRecoveryReasons: Object.fromEntries(Object.entries(pageRecoveryReasons).sort((a, b) => a[0].localeCompare(b[0]))),
    recoveryDiagnostics: [...recoveryDiagnosticCodes].sort((a, b) => a.localeCompare(b)),
    provenanceSummaryFlags: {
      contentRecoveryModeActive: [...Object.values(pageRenderModes)].some((mode) => mode === "content_recovery"),
    },
    previewRuntimeSummary: {
      ...persistedPreviewRuntimeSummary,
      fallbackUsed: persistedPreviewRuntimeSummary.renderedWithFallback,
      renderedCaptureUsed,
      domSize,
      screenshotCount,
    },
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
