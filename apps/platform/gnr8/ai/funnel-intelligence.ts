import type { Gnr8Page } from "@/gnr8/types/page";
import { buildSiteMapIntelligence, type SiteRole } from "@/gnr8/ai/site-map-intelligence";

export type JourneyType = "commercial" | "informational" | "mixed" | "unclear";

export type FunnelJourney = {
  name: string;
  status: "complete" | "partial" | "missing";
  steps: string[];
  missing: string[];
};

export type FunnelIntelligence = {
  summary: string;
  totalPages: number;
  resolvedPages: number;
  unresolvedPages: string[];
  journeyType: JourneyType;
  journeyHealth: {
    score: number;
    label: "low" | "medium" | "high";
    notes: string[];
  };
  detectedRoles: string[];
  missingJourneySteps: string[];
  journeys: FunnelJourney[];
  recommendations: string[];
  notes: string[];
};

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value);
}

type JourneyTemplate = {
  name: string;
  relevance: "commercial" | "informational";
  steps: string[];
  requiredGroups: Array<{ anyOf: SiteRole[]; label: string }>;
  optionalGroups?: Array<{ anyOf: SiteRole[]; label: string }>;
};

function buildJourneyTemplates(): JourneyTemplate[] {
  return [
    {
      name: "SaaS / commercial core journey",
      relevance: "commercial",
      steps: ["homepage", "pricing", "faq", "contact"],
      requiredGroups: [
        { anyOf: ["homepage"], label: "homepage" },
        { anyOf: ["pricing"], label: "pricing" },
        { anyOf: ["faq"], label: "faq" },
        { anyOf: ["contact"], label: "contact" },
      ],
    },
    {
      name: "Marketing landing journey",
      relevance: "commercial",
      steps: ["landing OR homepage", "pricing OR product", "contact"],
      requiredGroups: [
        { anyOf: ["landing", "homepage"], label: "landing OR homepage" },
        { anyOf: ["pricing", "product"], label: "pricing OR product" },
        { anyOf: ["contact"], label: "contact" },
      ],
    },
    {
      name: "Product detail / commercial product journey",
      relevance: "commercial",
      steps: ["product", "faq OR contact"],
      requiredGroups: [
        { anyOf: ["product"], label: "product" },
        { anyOf: ["faq", "contact"], label: "faq OR contact" },
      ],
    },
    {
      name: "Informational / content journey",
      relevance: "informational",
      steps: ["blog OR docs", "contact (optional)"],
      requiredGroups: [{ anyOf: ["blog", "docs"], label: "blog OR docs" }],
      optionalGroups: [{ anyOf: ["contact"], label: "contact (optional)" }],
    },
  ];
}

function inferJourneyType(input: {
  resolvedPages: number;
  roleDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
}): JourneyType {
  const resolved = Math.max(0, input.resolvedPages);
  if (resolved === 0) return "unclear";

  const getRole = (r: SiteRole) => input.roleDistribution[r] ?? 0;
  const commercialCount = getRole("homepage") + getRole("pricing") + getRole("product") + getRole("landing") + getRole("contact");
  const informationalCount = getRole("blog") + getRole("docs");
  const unknownCount = getRole("unknown");
  const unknownRatio = resolved > 0 ? unknownCount / resolved : 1;

  const hasIntent = (intent: string) => (input.intentDistribution[intent] ?? 0) > 0;
  const hasCommercialIntent =
    hasIntent("saas_homepage") ||
    hasIntent("marketing_landing") ||
    hasIntent("product_page") ||
    hasIntent("ecommerce_product") ||
    hasIntent("ecommerce_listing");
  const hasInformationalIntent = hasIntent("documentation") || hasIntent("blog_article");

  if (resolved < 2 && unknownRatio >= 0.5 && !hasCommercialIntent && !hasInformationalIntent) return "unclear";
  if (unknownRatio > 0.6 && commercialCount + informationalCount < 2) return "unclear";

  const commercialStrong = commercialCount >= 2 || hasCommercialIntent;
  const informationalStrong = informationalCount >= 2 || hasInformationalIntent;

  if (commercialStrong && !informationalStrong) {
    if (informationalCount <= 1 && (commercialCount >= informationalCount * 2 || hasCommercialIntent)) return "commercial";
  }
  if (informationalStrong && !commercialStrong) {
    if (commercialCount <= 1 && (informationalCount >= commercialCount * 2 || hasInformationalIntent)) return "informational";
  }

  if (commercialStrong && informationalStrong) return "mixed";

  return "unclear";
}

function evaluateJourney(template: JourneyTemplate, rolesPresent: Set<SiteRole>): FunnelJourney {
  let satisfiedGroups = 0;
  const missing: SiteRole[] = [];

  for (const group of template.requiredGroups) {
    const satisfied = group.anyOf.some((r) => rolesPresent.has(r));
    if (satisfied) {
      satisfiedGroups += 1;
      continue;
    }
    for (const r of group.anyOf) missing.push(r);
  }

  const status: FunnelJourney["status"] =
    satisfiedGroups === template.requiredGroups.length ? "complete" :
    satisfiedGroups > 0 ? "partial" :
    "missing";

  return {
    name: template.name,
    status,
    steps: template.steps,
    missing: Array.from(new Set(missing)),
  };
}

function buildMissingJourneySteps(input: {
  journeyType: JourneyType;
  templates: JourneyTemplate[];
  journeys: FunnelJourney[];
}): string[] {
  const out: string[] = [];
  const add = (role: string) => {
    if (!role) return;
    if (!out.includes(role)) out.push(role);
  };

  const includeMissingJourney = (idx: number) => {
    const relevance = input.templates[idx]?.relevance;
    if (!relevance) return false;
    if (input.journeyType === "mixed") return true;
    if (input.journeyType === "commercial") return relevance === "commercial";
    if (input.journeyType === "informational") return relevance === "informational";
    return false;
  };

  for (let i = 0; i < input.journeys.length; i += 1) {
    const j = input.journeys[i];
    if (j.status === "partial") {
      for (const m of j.missing) add(m);
      continue;
    }
    if (j.status === "missing" && includeMissingJourney(i)) {
      for (const m of j.missing) add(m);
    }
  }

  return out;
}

function calculateJourneyHealth(input: {
  totalPages: number;
  resolvedPages: number;
  journeyType: JourneyType;
  roleDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
  journeys: FunnelJourney[];
}): FunnelIntelligence["journeyHealth"] {
  const notes: string[] = [];
  const total = Math.max(0, input.totalPages);
  const resolved = Math.max(0, input.resolvedPages);

  if (resolved === 0) {
    return {
      score: 0,
      label: "low",
      notes: ["No pages could be resolved; cannot assess site journey reliably."],
    };
  }

  const getRole = (r: SiteRole) => input.roleDistribution[r] ?? 0;
  const hasRole = (r: SiteRole) => getRole(r) > 0;
  const hasIntent = (intent: string) => (input.intentDistribution[intent] ?? 0) > 0;

  const hasHomepage = hasRole("homepage");
  const hasPricing = hasRole("pricing");
  const hasFaq = hasRole("faq");
  const hasContact = hasRole("contact");

  const commercialLikely =
    input.journeyType === "commercial" ||
    input.journeyType === "mixed" ||
    hasIntent("saas_homepage") ||
    hasIntent("marketing_landing") ||
    hasIntent("product_page") ||
    hasIntent("ecommerce_product") ||
    hasIntent("ecommerce_listing");

  let score = 100;

  if ((input.journeyType === "commercial" || input.journeyType === "mixed") && !hasHomepage) {
    score -= 20;
    notes.push("Missing homepage for a commercial/mixed journey (-20).");
  }

  if (commercialLikely && !hasPricing) {
    score -= 15;
    notes.push("Missing pricing where a commercial journey is likely (-15).");
  }

  if (hasPricing && !hasFaq) {
    score -= 10;
    notes.push("Missing FAQ on a site with pricing (-10).");
  }

  if ((input.journeyType === "commercial" || input.journeyType === "mixed") && !hasContact) {
    score -= 15;
    notes.push("Missing contact for a commercial/mixed journey (-15).");
  }

  const unknownCount = getRole("unknown");
  const unknownRatio = resolved > 0 ? unknownCount / resolved : 1;
  if (unknownRatio > 0.5) {
    score -= 20;
    notes.push("Too many unknown-role pages (-20).");
  }

  if (resolved < total) {
    const gap = total - resolved;
    const ratio = total > 0 ? gap / total : 0;
    const penalty =
      ratio >= 0.75 ? 20 :
      ratio >= 0.5 ? 15 :
      ratio >= 0.25 ? 10 :
      gap > 0 ? 5 :
      0;
    if (penalty > 0) {
      score -= penalty;
      notes.push(`Low resolved coverage (-${penalty}).`);
    }
  }

  const anyComplete = input.journeys.some((j) => j.status === "complete");
  if (!anyComplete) {
    score -= 15;
    notes.push("No complete journey pattern detected (-15).");
  }

  if (input.journeyType === "unclear") {
    score -= 10;
    notes.push("Journey type unclear (-10).");
  }

  const clamped = clampInt(score, 0, 100);
  const label = clamped >= 80 ? "high" : clamped >= 50 ? "medium" : "low";
  if (notes.length === 0) notes.push("No journey issues detected by v1 heuristics.");

  return { score: clamped, label, notes };
}

function buildJourneyRecommendations(input: {
  journeyType: JourneyType;
  missingJourneySteps: string[];
  unresolvedPages: string[];
  roleDistribution: Record<string, number>;
  resolvedPages: number;
  journeys: FunnelJourney[];
  journeyHealthLabel: "low" | "medium" | "high";
}): string[] {
  const out: string[] = [];
  const add = (rec: string) => {
    const text = rec.trim();
    if (!text) return;
    if (!out.includes(text)) out.push(text);
  };

  const missing = new Set(input.missingJourneySteps);

  if (missing.has("homepage")) add("Add a homepage to anchor the commercial journey.");
  if (missing.has("pricing")) add("Add a pricing page to support conversion.");
  if (missing.has("faq")) add("Add an FAQ page to reduce buyer friction.");
  if (missing.has("contact")) add("Add a contact page to complete the conversion path.");
  if (missing.has("product")) add("Add a product page to support a product-led journey.");
  if (missing.has("landing")) add("Add a focused landing page for campaign traffic.");

  if (input.unresolvedPages.length > 0) add("Resolve missing page data before journey optimization.");

  const unknown = input.roleDistribution.unknown ?? 0;
  const unknownRatio = input.resolvedPages > 0 ? unknown / input.resolvedPages : 0;
  if (unknownRatio > 0.5) add("Clarify the role of unknown pages.");

  const anyComplete = input.journeys.some((j) => j.status === "complete");
  if (!anyComplete) add("Improve site journey structure before automation.");

  if (input.journeyType === "unclear") add("Improve role clarity across key pages before funnel optimization.");
  if (input.journeyType === "mixed") add("Separate conversion pages from documentation/content for a clearer journey.");

  if (input.journeyHealthLabel === "low" && !out.includes("Improve site journey structure before automation.")) {
    add("Improve site journey structure before automation.");
  }

  return out.slice(0, 8);
}

function buildSummary(input: {
  journeyType: JourneyType;
  journeyHealthLabel: "low" | "medium" | "high";
  journeys: FunnelJourney[];
  missingJourneySteps: string[];
}): string {
  const anyComplete = input.journeys.some((j) => j.status === "complete");
  const hasMissing = input.missingJourneySteps.length > 0;

  if (input.journeyType === "unclear") return "Site journey is unclear and needs role clarification.";
  if (input.journeyType === "informational" && anyComplete) return "Site appears primarily informational with a usable content journey.";
  if (input.journeyType === "commercial" && anyComplete && input.journeyHealthLabel === "high") {
    return "Site has a healthy commercial journey with clear core conversion pages.";
  }
  if ((input.journeyType === "commercial" || input.journeyType === "mixed") && !anyComplete) {
    return "Site has no complete journey pattern; key conversion steps may be missing.";
  }
  if ((input.journeyType === "commercial" || input.journeyType === "mixed") && hasMissing) {
    return "Site has a partial commercial journey and is missing key conversion steps.";
  }
  if (input.journeyType === "mixed") return "Site has mixed commercial and informational journey signals.";

  return "Site journey has mixed signals; consider filling missing steps for a clearer path.";
}

function buildNotes(input: {
  totalPages: number;
  unresolvedPages: string[];
  journeys: FunnelJourney[];
  journeyType: JourneyType;
  roleDistribution: Record<string, number>;
  resolvedPages: number;
}): string[] {
  const notes: string[] = ["Journey intelligence only; no changes are applied."];

  if (input.unresolvedPages.length > 0) {
    const total = Math.max(1, input.totalPages);
    notes.push(`Some pages could not be resolved from storage (${input.unresolvedPages.length}/${total}).`);
  }

  if (!input.journeys.some((j) => j.status === "complete")) {
    notes.push("No complete journey pattern was detected.");
  }

  if (input.journeyType === "mixed") notes.push("Commercial and informational patterns are mixed.");

  const unknown = input.roleDistribution.unknown ?? 0;
  const unknownRatio = input.resolvedPages > 0 ? unknown / input.resolvedPages : 0;
  if (unknownRatio > 0.5) notes.push("Several pages have unclear roles.");

  return notes;
}

export function buildFunnelIntelligence(input: {
  pages: Array<{
    slug: string;
    title?: string;
    page?: Gnr8Page;
  }>;
  resolvedPages?: Array<{
    slug: string;
    title?: string;
    page: Gnr8Page;
  }>;
}): FunnelIntelligence {
  const totalPages = Array.isArray(input.pages) ? input.pages.length : 0;
  const resolvedInput = Array.isArray(input.resolvedPages) ? input.resolvedPages : [];

  const resolvedBySlug = new Map<string, { slug: string; title?: string; page: Gnr8Page }>();
  for (const r of resolvedInput) {
    const slug = normalizeSlug(r.slug);
    if (!slug) continue;
    resolvedBySlug.set(slug, { ...r, slug });
  }

  const unresolvedPages: string[] = [];
  for (const p of input.pages ?? []) {
    const slug = normalizeSlug(p.slug);
    if (!slug) continue;
    if (!resolvedBySlug.has(slug)) unresolvedPages.push(slug);
  }

  const siteMap = buildSiteMapIntelligence({ pages: input.pages, resolvedPages: resolvedInput });
  const roleDistribution = siteMap.roleDistribution;
  const intentDistribution = siteMap.intentDistribution;

  const resolvedPages = siteMap.resolvedPages;
  const journeyType = inferJourneyType({ resolvedPages, roleDistribution, intentDistribution });

  const rolesPresent = new Set<SiteRole>();
  for (const p of siteMap.pageIntents) rolesPresent.add(p.role);
  const detectedRoles = Array.from(rolesPresent);

  const templates = buildJourneyTemplates();
  const journeys = templates.map((t) => evaluateJourney(t, rolesPresent));

  const missingJourneySteps = buildMissingJourneySteps({ journeyType, templates, journeys });

  const journeyHealth = calculateJourneyHealth({
    totalPages,
    resolvedPages,
    journeyType,
    roleDistribution,
    intentDistribution,
    journeys,
  });

  const recommendations = buildJourneyRecommendations({
    journeyType,
    missingJourneySteps,
    unresolvedPages,
    roleDistribution,
    resolvedPages,
    journeys,
    journeyHealthLabel: journeyHealth.label,
  });

  const summary = buildSummary({
    journeyType,
    journeyHealthLabel: journeyHealth.label,
    journeys,
    missingJourneySteps,
  });

  const notes = buildNotes({
    totalPages,
    unresolvedPages,
    journeys,
    journeyType,
    roleDistribution,
    resolvedPages,
  });

  return {
    summary,
    totalPages,
    resolvedPages,
    unresolvedPages,
    journeyType,
    journeyHealth,
    detectedRoles,
    missingJourneySteps,
    journeys,
    recommendations,
    notes,
  };
}
