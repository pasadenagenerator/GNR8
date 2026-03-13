import type { Gnr8Page } from "@/gnr8/types/page";
import { classifyPageIntent, type PageIntent } from "./page-intent-classifier";
import { buildOptimizationSuggestions } from "./optimization-suggestions";
import { buildRedesignStrategy, type RedesignPlan } from "./redesign-strategy";
import { calculateSemanticConfidence, type SemanticConfidenceResult } from "./semantic-confidence";

export type DuplicateSimilarity = "exact-duplicate" | "highly-similar" | "different-content";

export type DuplicateDetail = {
  type: string;
  count: number;
  similarity: DuplicateSimilarity;
  sectionIds: string[];
  mergeEligible?: boolean;
  mergeStrategy?: string;
};

export type MigrationConfidenceLabel = "low" | "medium" | "high";

export type MigrationReviewSummary = {
  totalSections: number;
  structuredSections: number;
  legacySections: number;
  sectionTypes: string[];
  countsByType: Record<string, number>;
  suggestedActions?: string[];
  duplicateTypes?: string[];
  duplicateDetails?: DuplicateDetail[];
  layoutIssues?: {
    navbarNotFirst?: boolean;
    footerNotLast?: boolean;
    heroNotTop?: boolean;
    ctaMisplaced?: boolean;
    legacyMisplaced?: boolean;
  };
  intent?: PageIntent;
  intentConfidence?: number;
  intentSignals?: string[];
  confidenceScore: number;
  confidenceLabel: MigrationConfidenceLabel;
  semanticConfidence: SemanticConfidenceResult;
  optimizationSuggestions?: string[];
  redesignPlan?: RedesignPlan;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getMigrationConfidenceLabel(score: number): MigrationConfidenceLabel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function calculateMigrationConfidence(input: {
  totalSections: number;
  structuredSections: number;
  legacySections: number;
  duplicateDetails?: DuplicateDetail[];
  layoutIssues?: MigrationReviewSummary["layoutIssues"];
  suggestedActions?: string[];
}): number {
  let score = 100;

  score -= input.legacySections * 20;

  for (const detail of input.duplicateDetails ?? []) {
    if (!detail) continue;
    if (detail.similarity === "exact-duplicate") score -= 8;
    else if (detail.similarity === "highly-similar") score -= 5;
    else score -= 3;
  }

  const layout = input.layoutIssues;
  if (layout) {
    const layoutFlags: Array<keyof NonNullable<MigrationReviewSummary["layoutIssues"]>> = [
      "navbarNotFirst",
      "footerNotLast",
      "heroNotTop",
      "ctaMisplaced",
      "legacyMisplaced",
    ];
    for (const flag of layoutFlags) {
      if (layout[flag]) score -= 5;
    }
  }

  score -= (input.suggestedActions?.length ?? 0) * 4;

  if (input.legacySections > input.structuredSections) score -= 10;

  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function normalizeText(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  // Deterministic, conservative normalization: lowercase, collapse whitespace, drop obvious punctuation.
  return raw
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHref(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned === "/") return "/";
  return cleaned.endsWith("/") ? cleaned.slice(0, -1) : cleaned;
}

function normalizeLogo(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned === "/") return "/";
  return cleaned.endsWith("/") ? cleaned.slice(0, -1) : cleaned;
}

function tokens(value: string): Set<string> {
  const t = value.split(" ").map((s) => s.trim()).filter(Boolean);
  return new Set(t);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tok of a) if (b.has(tok)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function textSimilarity(a: unknown, b: unknown): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return jaccardSimilarity(tokens(na), tokens(nb));
}

function setSimilarity(a: Iterable<string>, b: Iterable<string>): number {
  const sa = new Set([...a].filter(Boolean));
  const sb = new Set([...b].filter(Boolean));
  return jaccardSimilarity(sa, sb);
}

function worstCaseSimilarity(similarities: DuplicateSimilarity[]): DuplicateSimilarity {
  if (similarities.includes("different-content")) return "different-content";
  if (similarities.includes("highly-similar")) return "highly-similar";
  return "exact-duplicate";
}

function layoutBucketForType(type: string): "legacy" | "structured" | "footer" {
  switch (type) {
    case "legacy.html":
      return "legacy";
    case "footer.basic":
      return "footer";
    case "navbar.basic":
    case "hero.split":
    case "feature.grid":
    case "logo.cloud":
    case "pricing.basic":
    case "faq.basic":
    case "cta.simple":
      return "structured";
    default:
      // Unknown section types are treated as legacy.html for structural checks.
      return "legacy";
  }
}

function firstIndexOfType(sections: Array<{ type?: unknown }>, type: string): number {
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i]?.type === type) return i;
  }
  return -1;
}

function lastIndexOfType(sections: Array<{ type?: unknown }>, type: string): number {
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    if (sections[i]?.type === type) return i;
  }
  return -1;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function extractLogoKeys(props: unknown): Set<string> {
  if (!isRecord(props)) return new Set();
  const logos = getArray(props.logos)
    .filter((l) => typeof l === "string")
    .map((l) => normalizeLogo(l))
    .filter(Boolean);
  return new Set(logos);
}

function extractLinks(props: unknown): Array<{ label: string; href: string }> {
  if (!isRecord(props)) return [];
  const linksRaw = props.links;
  const links = getArray(linksRaw)
    .map((l) => (isRecord(l) ? l : null))
    .filter(Boolean) as Array<Record<string, unknown>>;

  return links
    .map((l) => ({ label: getString(l.label) ?? "", href: getString(l.href) ?? "" }))
    .filter((l) => (l.label || l.href) && l.label.length <= 200 && l.href.length <= 800);
}

function linkSignature(links: Array<{ label: string; href: string }>): Set<string> {
  return new Set(
    links.map((l) => `${normalizeText(l.label)}|${normalizeHref(l.href)}`).filter((k) => k !== "|"),
  );
}

function classifyFaq(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  if (!isRecord(aProps) || !isRecord(bProps)) return "different-content";
  const aItems = getArray(aProps.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;
  const bItems = getArray(bProps.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;
  if (aItems.length < 2 || bItems.length < 2) return "different-content";

  const aQ = aItems.map((i) => normalizeText(i.question));
  const bQ = bItems.map((i) => normalizeText(i.question));
  const qSim = setSimilarity(aQ, bQ);

  const aByQ = new Map(aItems.map((i) => [normalizeText(i.question), i]));
  const bByQ = new Map(bItems.map((i) => [normalizeText(i.question), i]));
  const sharedQuestions = [...aByQ.keys()].filter((q) => q && bByQ.has(q));

  let answerSimSum = 0;
  let answerPairs = 0;
  for (const q of sharedQuestions) {
    const ai = aByQ.get(q);
    const bi = bByQ.get(q);
    if (!ai || !bi) continue;
    answerSimSum += textSimilarity(ai.answer, bi.answer);
    answerPairs += 1;
  }
  const avgAnswerSim = answerPairs > 0 ? answerSimSum / answerPairs : 0;

  const isExactQuestions = aQ.length === bQ.length && setSimilarity(aQ, bQ) === 1;
  if (isExactQuestions && avgAnswerSim >= 0.9) return "exact-duplicate";

  if (qSim >= 0.7 && sharedQuestions.length >= 2) return "highly-similar";
  if (qSim <= 0.4) return "different-content";

  // Conservative: if overlap exists but isn't strong, treat as different content.
  return "different-content";
}

function normalizePrice(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，,]/g, ".")
    .replace(/[^a-z0-9$€£.\/-]+/g, "");
}

function classifyPricing(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  if (!isRecord(aProps) || !isRecord(bProps)) return "different-content";
  const aPlans = getArray(aProps.plans).filter((p) => isRecord(p)) as Array<Record<string, unknown>>;
  const bPlans = getArray(bProps.plans).filter((p) => isRecord(p)) as Array<Record<string, unknown>>;
  if (aPlans.length < 2 || bPlans.length < 2) return "different-content";

  const aNames = aPlans.map((p) => normalizeText(p.name)).filter(Boolean);
  const bNames = bPlans.map((p) => normalizeText(p.name)).filter(Boolean);
  const nameSim = setSimilarity(aNames, bNames);

  const aPrices = aPlans.map((p) => normalizePrice(p.price)).filter(Boolean);
  const bPrices = bPlans.map((p) => normalizePrice(p.price)).filter(Boolean);
  const priceSim = setSimilarity(aPrices, bPrices);

  const aByName = new Map(aPlans.map((p) => [normalizeText(p.name), p]));
  const bByName = new Map(bPlans.map((p) => [normalizeText(p.name), p]));
  const sharedNames = [...aByName.keys()].filter((n) => n && bByName.has(n));

  let exactPriceMatches = 0;
  for (const n of sharedNames) {
    const ap = aByName.get(n);
    const bp = bByName.get(n);
    if (!ap || !bp) continue;
    if (normalizePrice(ap.price) && normalizePrice(ap.price) === normalizePrice(bp.price)) exactPriceMatches += 1;
  }
  const sharedCount = sharedNames.length;
  const priceMatchRatio = sharedCount > 0 ? exactPriceMatches / sharedCount : 0;

  const isExactNames = aNames.length === bNames.length && setSimilarity(aNames, bNames) === 1;
  if (isExactNames && sharedCount >= 2 && priceMatchRatio === 1) return "exact-duplicate";

  const strongStructure = (nameSim >= 0.6 && sharedCount >= 2 && priceMatchRatio >= 0.7) || (priceSim >= 0.7 && sharedCount >= 2);
  if (strongStructure) return "highly-similar";

  if (nameSim <= 0.4 && priceSim <= 0.4) return "different-content";
  return "different-content";
}

function classifyFeatureGrid(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  if (!isRecord(aProps) || !isRecord(bProps)) return "different-content";
  const aItems = getArray(aProps.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;
  const bItems = getArray(bProps.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;
  if (aItems.length < 2 || bItems.length < 2) return "different-content";

  const aTitles = aItems.map((i) => normalizeText(i.title)).filter(Boolean);
  const bTitles = bItems.map((i) => normalizeText(i.title)).filter(Boolean);
  const titleSim = setSimilarity(aTitles, bTitles);

  const aByTitle = new Map(aItems.map((i) => [normalizeText(i.title), i]));
  const bByTitle = new Map(bItems.map((i) => [normalizeText(i.title), i]));
  const sharedTitles = [...aByTitle.keys()].filter((t) => t && bByTitle.has(t));

  let textSimSum = 0;
  let textPairs = 0;
  for (const t of sharedTitles) {
    const ai = aByTitle.get(t);
    const bi = bByTitle.get(t);
    if (!ai || !bi) continue;
    textSimSum += textSimilarity(ai.text, bi.text);
    textPairs += 1;
  }
  const avgTextSim = textPairs > 0 ? textSimSum / textPairs : 0;

  const isExactTitles = aTitles.length === bTitles.length && setSimilarity(aTitles, bTitles) === 1;
  if (isExactTitles && avgTextSim >= 0.9) return "exact-duplicate";

  if (titleSim >= 0.7 && sharedTitles.length >= 2) return "highly-similar";
  return "different-content";
}

function classifyLogoCloud(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  const aSet = extractLogoKeys(aProps);
  const bSet = extractLogoKeys(bProps);

  if (aSet.size === 0 && bSet.size === 0) return "exact-duplicate";
  if (aSet.size === 0 || bSet.size === 0) return "different-content";

  if (aSet.size === bSet.size && setSimilarity(aSet, bSet) === 1) return "exact-duplicate";

  let intersection = 0;
  for (const v of aSet) if (bSet.has(v)) intersection += 1;
  const minSize = Math.min(aSet.size, bSet.size);
  const overlapRatio = minSize > 0 ? intersection / minSize : 0;
  const jac = setSimilarity(aSet, bSet);

  // Conservative: require at least 2 shared logos and strong overlap.
  if (intersection >= 2 && minSize >= 2 && (overlapRatio >= 0.8 || jac >= 0.75)) return "highly-similar";
  return "different-content";
}

function classifyCta(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  if (!isRecord(aProps) || !isRecord(bProps)) return "different-content";
  const headSim = textSimilarity(aProps.headline, bProps.headline);
  const subSim = textSimilarity(aProps.subheadline, bProps.subheadline);
  const labelSim = textSimilarity(aProps.buttonLabel, bProps.buttonLabel);

  const hrefA = normalizeHref(aProps.buttonHref);
  const hrefB = normalizeHref(bProps.buttonHref);

  const hrefSim = hrefA && hrefB ? (hrefA === hrefB ? 1 : hrefA.split("?")[0] === hrefB.split("?")[0] ? 0.7 : 0) : 0;
  const avgTextSim = (headSim + subSim + labelSim) / 3;

  if (avgTextSim >= 0.95 && hrefSim === 1) return "exact-duplicate";
  if (avgTextSim >= 0.8 && hrefSim >= 0.7) return "highly-similar";
  if (avgTextSim >= 0.85 && hrefSim === 0) return "highly-similar";
  return "different-content";
}

function classifyHero(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  if (!isRecord(aProps) || !isRecord(bProps)) return "different-content";
  const headSim = textSimilarity(aProps.headline, bProps.headline);
  const subSim = textSimilarity(aProps.subheadline, bProps.subheadline);
  if (headSim >= 0.95 && subSim >= 0.9) return "exact-duplicate";
  if (headSim >= 0.75 && subSim >= 0.65) return "highly-similar";
  return "different-content";
}

function classifyFooter(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  const aLinks = extractLinks(aProps);
  const bLinks = extractLinks(bProps);
  if (aLinks.length < 2 || bLinks.length < 2) return "different-content";

  const linkSim = setSimilarity(linkSignature(aLinks), linkSignature(bLinks));
  const copySim = textSimilarity(isRecord(aProps) ? aProps.copyright : "", isRecord(bProps) ? bProps.copyright : "");

  if (linkSim === 1 && copySim >= 0.9) return "exact-duplicate";
  if (linkSim >= 0.7) return "highly-similar";
  return "different-content";
}

function classifyNavbar(aProps: unknown, bProps: unknown): DuplicateSimilarity {
  const aLinks = extractLinks(aProps);
  const bLinks = extractLinks(bProps);
  if (aLinks.length < 2 || bLinks.length < 2) return "different-content";

  const linkSim = setSimilarity(linkSignature(aLinks), linkSignature(bLinks));
  const brandSim = textSimilarity(isRecord(aProps) ? aProps.brandLabel : "", isRecord(bProps) ? bProps.brandLabel : "");

  if (linkSim === 1 && brandSim >= 0.9) return "exact-duplicate";
  if (linkSim >= 0.7) return "highly-similar";
  return "different-content";
}

function classifyDuplicateSimilarityForType(
  type: string,
  sections: Array<{ props?: Record<string, unknown> }>,
): DuplicateSimilarity {
  if (sections.length < 2) return "different-content";
  const first = sections[0]?.props ?? {};
  const results: DuplicateSimilarity[] = [];

  for (let i = 1; i < sections.length; i += 1) {
    const next = sections[i]?.props ?? {};
    switch (type) {
      case "faq.basic":
        results.push(classifyFaq(first, next));
        break;
      case "pricing.basic":
        results.push(classifyPricing(first, next));
        break;
      case "feature.grid":
        results.push(classifyFeatureGrid(first, next));
        break;
      case "cta.simple":
        results.push(classifyCta(first, next));
        break;
      case "logo.cloud":
        results.push(classifyLogoCloud(first, next));
        break;
      case "hero.split":
        results.push(classifyHero(first, next));
        break;
      case "footer.basic":
        results.push(classifyFooter(first, next));
        break;
      case "navbar.basic":
        results.push(classifyNavbar(first, next));
        break;
      default:
        results.push("different-content");
        break;
    }
  }

  return worstCaseSimilarity(results);
}

export function buildMigrationReviewSummary(page: Gnr8Page): MigrationReviewSummary {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  const countsByType: Record<string, number> = {};
  const sectionTypes: string[] = [];
  const seenTypes = new Set<string>();

  let legacySections = 0;
  let structuredSections = 0;

  for (const section of sections) {
    const type = typeof section?.type === "string" ? section.type : "unknown";

    countsByType[type] = (countsByType[type] ?? 0) + 1;
    if (!seenTypes.has(type)) {
      seenTypes.add(type);
      sectionTypes.push(type);
    }

    if (type === "legacy.html") legacySections += 1;
    else structuredSections += 1;
  }

  const singletonLikeTypes = [
    "navbar.basic",
    "hero.split",
    "cta.simple",
    "logo.cloud",
    "pricing.basic",
    "faq.basic",
    "feature.grid",
    "footer.basic",
  ] as const;

  const duplicateTypes = singletonLikeTypes.filter((type) => (countsByType[type] ?? 0) > 1);
  const duplicateDetails: DuplicateDetail[] = [];

  if (duplicateTypes.length > 0) {
    for (const type of duplicateTypes) {
      const matching = sections
        .filter((s) => s && typeof s.type === "string" && s.type === type)
        .map((s) => ({ id: typeof s.id === "string" ? s.id : "", props: isRecord(s.props) ? s.props : undefined }));

      const similarity = classifyDuplicateSimilarityForType(
        type,
        matching.map((m) => ({ props: m.props })),
      );

      const mergeEligible =
        (type === "faq.basic" ||
          type === "pricing.basic" ||
          type === "feature.grid" ||
          type === "logo.cloud" ||
          type === "cta.simple") &&
        (similarity === "highly-similar" || similarity === "exact-duplicate");
      const mergeStrategy =
        mergeEligible && type === "faq.basic"
          ? "faq-basic-merge"
          : mergeEligible && type === "pricing.basic"
            ? "pricing-basic-merge"
            : mergeEligible && type === "feature.grid"
              ? "feature-grid-merge"
              : mergeEligible && type === "logo.cloud"
                ? "logo-cloud-merge"
                : mergeEligible && type === "cta.simple"
                  ? "cta-simple-merge"
            : undefined;

      duplicateDetails.push({
        type,
        count: countsByType[type] ?? matching.length,
        similarity,
        sectionIds: matching.map((m) => m.id).filter(Boolean),
        mergeEligible: mergeEligible || undefined,
        mergeStrategy,
      });
    }
  }

  const layoutIssues: NonNullable<MigrationReviewSummary["layoutIssues"]> = {};

  const firstNavbar = firstIndexOfType(sections, "navbar.basic");
  if (firstNavbar > 0) layoutIssues.navbarNotFirst = true;

  const lastFooter = lastIndexOfType(sections, "footer.basic");
  if (lastFooter !== -1 && lastFooter !== sections.length - 1) layoutIssues.footerNotLast = true;

  const firstHero = firstIndexOfType(sections, "hero.split");
  if (firstHero !== -1) {
    const firstNonNavbar = sections.findIndex((s) => s?.type !== "navbar.basic");
    const expectedHeroIndex = firstNonNavbar === -1 ? 0 : firstNonNavbar;
    if (firstHero !== expectedHeroIndex) layoutIssues.heroNotTop = true;
  }

  const ctaIndices: number[] = [];
  const legacyIndices: number[] = [];
  let lastPricingOrFaq = -1;
  const firstFooter = firstIndexOfType(sections, "footer.basic");

  for (let i = 0; i < sections.length; i += 1) {
    const type = typeof sections[i]?.type === "string" ? sections[i].type : "unknown";
    if (type === "cta.simple") ctaIndices.push(i);
    if (type === "pricing.basic" || type === "faq.basic") lastPricingOrFaq = i;

    const bucket = layoutBucketForType(type);
    if (bucket === "legacy") legacyIndices.push(i);
  }

  if (ctaIndices.length > 0) {
    const firstLegacy = legacyIndices.length > 0 ? legacyIndices[0]! : -1;

    const beforePricingOrFaq = lastPricingOrFaq !== -1 && ctaIndices.some((idx) => idx <= lastPricingOrFaq);
    const afterLegacy = firstLegacy !== -1 && ctaIndices.some((idx) => idx > firstLegacy);
    const afterFooter = firstFooter !== -1 && ctaIndices.some((idx) => idx > firstFooter);

    if (beforePricingOrFaq || afterLegacy || afterFooter) layoutIssues.ctaMisplaced = true;
  }

  if (legacyIndices.length > 0) {
    const firstLegacy = legacyIndices[0]!;
    const lastStructuredBeforeLegacy = (() => {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const type = typeof sections[i]?.type === "string" ? sections[i].type : "unknown";
        const bucket = layoutBucketForType(type);
        if (bucket === "structured") return i;
      }
      return -1;
    })();

    const legacyAboveStructured = lastStructuredBeforeLegacy !== -1 && firstLegacy < lastStructuredBeforeLegacy;
    const legacyAfterFooter = firstFooter !== -1 && legacyIndices.some((idx) => idx > firstFooter);

    if (legacyAboveStructured || legacyAfterFooter) layoutIssues.legacyMisplaced = true;
  }

  const hasLayoutIssues = Object.values(layoutIssues).some(Boolean);

  const reviewCore = {
    totalSections: sections.length,
    structuredSections,
    legacySections,
    sectionTypes,
    countsByType,
    duplicateTypes: duplicateTypes.length > 0 ? [...duplicateTypes] : undefined,
    duplicateDetails: duplicateDetails.length > 0 ? duplicateDetails : undefined,
    layoutIssues: hasLayoutIssues ? layoutIssues : undefined,
  };

  const { suggestedActions } = buildSuggestedActionsAndNotes(reviewCore);
  const confidenceScore = calculateMigrationConfidence({ ...reviewCore, suggestedActions });
  const confidenceLabel = getMigrationConfidenceLabel(confidenceScore);

  const intentResult = classifyPageIntent(page);
  const semanticConfidence = calculateSemanticConfidence(page);

  const reviewWithIntent: MigrationReviewSummary = {
    ...reviewCore,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    intentSignals: intentResult.signals,
    confidenceScore,
    confidenceLabel,
    semanticConfidence,
  };

  const optimizationSuggestions = buildOptimizationSuggestions({ review: reviewWithIntent, suggestedActions });

  return {
    ...reviewWithIntent,
    optimizationSuggestions: optimizationSuggestions.length > 0 ? optimizationSuggestions : undefined,
    redesignPlan: buildRedesignStrategy(reviewWithIntent),
  };
}

export function buildSuggestedActionsAndNotes(review: {
  structuredSections: number;
  legacySections: number;
  countsByType: Record<string, number>;
  duplicateTypes?: string[];
  duplicateDetails?: DuplicateDetail[];
  layoutIssues?: MigrationReviewSummary["layoutIssues"];
}): { suggestedActions: string[]; notes: string[] } {
  const suggestedActions: string[] = [];
  const notes: string[] = [];

  const hasType = (type: string) => (review.countsByType[type] ?? 0) > 0;
  const addAction = (action: string) => {
    if (!suggestedActions.includes(action)) suggestedActions.push(action);
  };
  const addNote = (note: string) => {
    if (!notes.includes(note)) notes.push(note);
  };

  const layoutIssues = review.layoutIssues;
  if (layoutIssues && Object.values(layoutIssues).some(Boolean)) {
    addNote("Layout structure is non-standard.");
    if (layoutIssues.heroNotTop && hasType("pricing.basic")) addNote("Hero appears below pricing.");
    if (layoutIssues.footerNotLast) addNote("Footer is not last section.");
    if (layoutIssues.navbarNotFirst) addNote("Navbar is not first section.");
    if (layoutIssues.ctaMisplaced) addNote("CTA is not placed near the bottom.");
    if (layoutIssues.legacyMisplaced) addNote("Legacy sections are out of place.");
  }

  if (review.legacySections >= 1) {
    addAction("Replace legacy section with CTA");
    addAction("Replace legacy section with FAQ");
  }

  if (review.legacySections >= 1 && !hasType("pricing.basic")) {
    addAction("Replace legacy section with pricing");
  }

  if (!hasType("hero.split")) {
    addAction("Add hero at the top");
  }

  if (hasType("hero.split") && !hasType("cta.simple")) {
    addAction("Add CTA below the hero");
  }

  if (!hasType("faq.basic")) {
    addAction("Add FAQ below the hero");
  }

  if (!hasType("footer.basic")) {
    addAction("Add footer at the bottom");
  }

  if (review.legacySections === 0 && review.structuredSections >= 4) {
    addNote("Page is already mostly structured.");
  }

  if (review.legacySections > review.structuredSections) {
    addNote("Page still relies heavily on legacy HTML.");
  }

  const duplicateCleanupTypeToName: Record<string, string> = {
    "pricing.basic": "pricing",
    "faq.basic": "FAQ",
    "cta.simple": "CTA",
    "hero.split": "hero",
    "footer.basic": "footer",
    "navbar.basic": "navbar",
  };

  const duplicateTypesFromReview =
    Array.isArray(review.duplicateTypes) && review.duplicateTypes.length > 0
      ? review.duplicateTypes
      : Object.keys(duplicateCleanupTypeToName).filter((type) => (review.countsByType[type] ?? 0) > 1);

  const detailsByType = new Map(
    (Array.isArray(review.duplicateDetails) ? review.duplicateDetails : []).map((d) => [d.type, d]),
  );

  for (const type of duplicateTypesFromReview) {
    const name = duplicateCleanupTypeToName[type];
    if (!name) continue;
    const detail = detailsByType.get(type);
    const similarity = detail?.similarity ?? "different-content";

    if (similarity === "exact-duplicate") {
      addNote(`Page contains exact duplicate ${name} sections.`);
      addAction(`Remove duplicate ${name} section`);
      continue;
    }

    if (similarity === "highly-similar") {
      addNote(`Page contains highly similar ${name} sections.`);
      // Keep duplicate suggestions review-only (notes), to avoid applying them in migration-run/autofix flows.
      continue;
    }

    addNote(`Page contains multiple ${name} sections with different content.`);
  }

  return { suggestedActions, notes };
}
