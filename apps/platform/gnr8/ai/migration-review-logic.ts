import type { Gnr8Page } from "@/gnr8/types/page";

export type MigrationReviewSummary = {
  totalSections: number;
  structuredSections: number;
  legacySections: number;
  sectionTypes: string[];
  countsByType: Record<string, number>;
  duplicateTypes?: string[];
};

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

  return {
    totalSections: sections.length,
    structuredSections,
    legacySections,
    sectionTypes,
    countsByType,
    duplicateTypes: duplicateTypes.length > 0 ? [...duplicateTypes] : undefined,
  };
}

export function buildSuggestedActionsAndNotes(review: {
  structuredSections: number;
  legacySections: number;
  countsByType: Record<string, number>;
  duplicateTypes?: string[];
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

  const duplicateTypes =
    Array.isArray(review.duplicateTypes) && review.duplicateTypes.length > 0
      ? review.duplicateTypes
      : Object.keys(duplicateCleanupTypeToName).filter((type) => (review.countsByType[type] ?? 0) > 1);

  for (const type of duplicateTypes) {
    const name = duplicateCleanupTypeToName[type];
    if (!name) continue;
    addNote(`Page contains duplicate ${name} sections.`);
    addAction(`Remove duplicate ${name} section`);
  }

  return { suggestedActions, notes };
}
