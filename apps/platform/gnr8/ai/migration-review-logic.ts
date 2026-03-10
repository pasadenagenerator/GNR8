import type { Gnr8Page } from "@/gnr8/types/page";

export type DuplicateSimilarity = "exact-duplicate" | "highly-similar" | "different-content";

export type DuplicateDetail = {
  type: string;
  count: number;
  similarity: DuplicateSimilarity;
  sectionIds: string[];
};

export type MigrationReviewSummary = {
  totalSections: number;
  structuredSections: number;
  legacySections: number;
  sectionTypes: string[];
  countsByType: Record<string, number>;
  duplicateTypes?: string[];
  duplicateDetails?: DuplicateDetail[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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
      case "cta.simple":
        results.push(classifyCta(first, next));
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
    "pricing.basic",
    "faq.basic",
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

      duplicateDetails.push({
        type,
        count: countsByType[type] ?? matching.length,
        similarity,
        sectionIds: matching.map((m) => m.id).filter(Boolean),
      });
    }
  }

  return {
    totalSections: sections.length,
    structuredSections,
    legacySections,
    sectionTypes,
    countsByType,
    duplicateTypes: duplicateTypes.length > 0 ? [...duplicateTypes] : undefined,
    duplicateDetails: duplicateDetails.length > 0 ? duplicateDetails : undefined,
  };
}

export function buildSuggestedActionsAndNotes(review: {
  structuredSections: number;
  legacySections: number;
  countsByType: Record<string, number>;
  duplicateTypes?: string[];
  duplicateDetails?: DuplicateDetail[];
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
