export const SUPPORTED_SECTION_TYPES = [
  "navbar.basic",
  "hero.split",
  "feature.grid",
  "logo.cloud",
  "cta.simple",
  "faq.basic",
  "pricing.basic",
  "footer.basic",
] as const;

export type SupportedSectionType = (typeof SUPPORTED_SECTION_TYPES)[number];

type KeywordRule = {
  type: SupportedSectionType;
  keywords: string[];
};

export const KEYWORD_RULES: KeywordRule[] = [
  { type: "navbar.basic", keywords: ["navbar", "navigation", "menu"] },
  { type: "hero.split", keywords: ["hero", "headline", "intro"] },
  { type: "feature.grid", keywords: ["features", "feature grid", "feature", "benefits"] },
  { type: "logo.cloud", keywords: ["logos", "trusted by", "clients"] },
  {
    type: "cta.simple",
    keywords: ["cta", "call to action", "get started", "signup", "sign up"],
  },
  { type: "faq.basic", keywords: ["faq", "questions", "q&a", "q & a"] },
  { type: "pricing.basic", keywords: ["pricing", "plans", "tiers"] },
  { type: "footer.basic", keywords: ["footer"] },
];

export const DEFAULT_LANDING_SECTIONS: SupportedSectionType[] = [
  "navbar.basic",
  "hero.split",
  "feature.grid",
  "cta.simple",
  "footer.basic",
];

