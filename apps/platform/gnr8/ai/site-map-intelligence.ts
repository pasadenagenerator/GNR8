import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";

export type SiteRole =
  | "homepage"
  | "pricing"
  | "faq"
  | "blog"
  | "docs"
  | "contact"
  | "product"
  | "landing"
  | "unknown";

export type SiteMapIntelligence = {
  summary: string;
  totalPages: number;
  resolvedPages: number;
  unresolvedPages: string[];
  pageIntents: Array<{
    slug: string;
    title?: string;
    intent: string;
    intentConfidence: number;
    confidenceScore?: number;
    role: SiteRole;
  }>;
  intentDistribution: Record<string, number>;
  roleDistribution: Record<string, number>;
  missingRoles: string[];
  structureHealth: {
    score: number;
    label: "low" | "medium" | "high";
    notes: string[];
  };
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

function addCount(map: Record<string, number>, key: string): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function inferSiteRole(input: {
  slug: string;
  title?: string;
  intent: string;
  intentConfidence: number;
}): SiteRole {
  const slug = normalizeSlug(input.slug);
  const slugLower = slug.toLowerCase();
  const titleLower = (input.title ?? "").trim().toLowerCase();
  const intent = String(input.intent ?? "").trim();

  if (slugLower === "/" || slugLower === "/home") return "homepage";
  if (slugLower.includes("pricing")) return "pricing";
  if (slugLower.includes("faq")) return "faq";
  if (slugLower.includes("blog") || slugLower.includes("article")) return "blog";
  if (slugLower.includes("docs") || slugLower.includes("documentation")) return "docs";
  if (slugLower.includes("contact")) return "contact";
  if (slugLower.includes("product")) return "product";
  if (slugLower.includes("landing")) return "landing";

  // Supporting signals (not sole signal): only promote on high-confidence intent or clear title hints.
  const highIntent = input.intentConfidence >= 85;
  if (titleLower.includes("pricing")) return "pricing";
  if (titleLower.includes("faq")) return "faq";
  if (titleLower.includes("contact")) return "contact";
  if (titleLower.includes("documentation") || titleLower.includes("docs")) return "docs";
  if (titleLower.includes("blog")) return "blog";

  if (highIntent && intent === "marketing_landing") return "landing";
  if (highIntent && intent === "saas_homepage" && slugLower === "/") return "homepage";
  if (highIntent && intent === "documentation") return "docs";
  if (highIntent && (intent === "blog_article")) return "blog";
  if (highIntent && (intent === "product_page" || intent === "ecommerce_product")) return "product";

  return "unknown";
}

function buildIntentDistribution(pageIntents: SiteMapIntelligence["pageIntents"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pageIntents) addCount(out, p.intent);
  return out;
}

function buildRoleDistribution(pageIntents: SiteMapIntelligence["pageIntents"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pageIntents) addCount(out, p.role);
  return out;
}

function calculateSiteStructureHealth(input: {
  totalPages: number;
  resolvedPages: number;
  roleDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
}): SiteMapIntelligence["structureHealth"] {
  const notes: string[] = [];
  const total = Math.max(0, input.totalPages);
  const resolved = Math.max(0, input.resolvedPages);

  if (resolved === 0) {
    return {
      score: 0,
      label: "low",
      notes: ["No pages could be resolved; cannot assess site structure reliably."],
    };
  }

  const getRole = (r: SiteRole) => input.roleDistribution[r] ?? 0;
  const hasRole = (r: SiteRole) => getRole(r) > 0;
  const hasIntent = (intent: string) => (input.intentDistribution[intent] ?? 0) > 0;

  const hasHomepage = hasRole("homepage");
  const hasPricing = hasRole("pricing");
  const hasFaq = hasRole("faq");

  const hasSaasOrLandingIntent = hasIntent("saas_homepage") || hasIntent("marketing_landing");
  const landingOrProductCount = getRole("landing") + getRole("product");

  let score = 100;

  if (!hasHomepage) {
    score -= 30;
    notes.push("Missing homepage (-30).");
  }

  if (hasSaasOrLandingIntent && !hasPricing) {
    score -= 15;
    notes.push("Missing pricing for a marketing/SaaS-oriented site (-15).");
  }

  if (hasPricing && !hasFaq) {
    score -= 10;
    notes.push("Missing FAQ on a site with pricing (-10).");
  }

  const unknownCount = getRole("unknown");
  if (unknownCount / resolved > 0.5) {
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

  if (!hasHomepage && landingOrProductCount >= 2) {
    score -= 10;
    notes.push("No homepage while landing/product pages exist (-10).");
  }

  const clamped = clampInt(score, 0, 100);
  const label = clamped >= 80 ? "high" : clamped >= 50 ? "medium" : "low";

  if (notes.length === 0) notes.push("No structural issues detected by v1 heuristics.");

  return { score: clamped, label, notes };
}

function computeMissingRoles(input: {
  resolvedPages: number;
  roleDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
}): string[] {
  const out: string[] = [];
  const add = (role: SiteRole) => {
    if ((input.roleDistribution[role] ?? 0) > 0) return;
    if (!out.includes(role)) out.push(role);
  };

  if (input.resolvedPages === 0) return out;

  // Homepage is generally expected once we can resolve any pages.
  add("homepage");

  const hasIntent = (intent: string) => (input.intentDistribution[intent] ?? 0) > 0;
  const hasCommercialSignals =
    hasIntent("marketing_landing") ||
    hasIntent("saas_homepage") ||
    hasIntent("product_page") ||
    hasIntent("ecommerce_product") ||
    hasIntent("ecommerce_listing") ||
    (input.roleDistribution.product ?? 0) > 0 ||
    (input.roleDistribution.landing ?? 0) > 0;

  if (hasCommercialSignals) {
    add("contact");
  }

  const shouldExpectPricing = hasIntent("marketing_landing") || hasIntent("saas_homepage");
  if (shouldExpectPricing) add("pricing");

  const hasPricing = (input.roleDistribution.pricing ?? 0) > 0;
  if (hasPricing) add("faq");

  return out;
}

function buildSiteRecommendations(input: {
  missingRoles: string[];
  unresolvedPages: string[];
  roleDistribution: Record<string, number>;
  resolvedPages: number;
  structureHealthLabel: "low" | "medium" | "high";
}): string[] {
  const out: string[] = [];
  const add = (rec: string) => {
    const text = rec.trim();
    if (!text) return;
    if (!out.includes(text)) out.push(text);
  };

  const missing = new Set(input.missingRoles);
  const criticalOrder: Array<{ role: SiteRole; text: string }> = [
    { role: "homepage", text: "Add a homepage." },
    { role: "pricing", text: "Add a pricing page." },
    { role: "faq", text: "Add an FAQ page." },
    { role: "contact", text: "Add a contact page." },
  ];
  for (const c of criticalOrder) {
    if (missing.has(c.role)) add(c.text);
  }

  if (input.unresolvedPages.length > 0) add("Resolve missing page data before site-level optimization.");

  const unknown = input.roleDistribution.unknown ?? 0;
  const unknownRatio = input.resolvedPages > 0 ? unknown / input.resolvedPages : 0;
  if (unknownRatio > 0.5) add("Clarify the role of unknown pages.");

  if (input.structureHealthLabel === "low") add("Improve site structure before automation.");

  if (input.resolvedPages === 0) add("Provide or publish page data so site structure can be assessed.");

  return out.slice(0, 8);
}

function buildSummary(input: {
  totalPages: number;
  resolvedPages: number;
  unresolvedPages: string[];
  roleDistribution: Record<string, number>;
  missingRoles: string[];
  structureHealthLabel: "low" | "medium" | "high";
  structureHealthScore: number;
}): string {
  const total = Math.max(0, input.totalPages);
  const resolved = Math.max(0, input.resolvedPages);
  const unresolvedRatio = total > 0 ? input.unresolvedPages.length / total : 0;
  const unknown = input.roleDistribution.unknown ?? 0;
  const unknownRatio = resolved > 0 ? unknown / resolved : 0;

  if (resolved === 0) return "Site map has low structural confidence due to unresolved page data.";

  const missingCritical = input.missingRoles.some((r) => r === "homepage" || r === "pricing" || r === "contact");

  if (
    input.structureHealthLabel === "high" &&
    input.missingRoles.length === 0 &&
    unresolvedRatio <= 0.1 &&
    unknownRatio <= 0.3
  ) {
    return "Site map looks structurally healthy with clear core page roles.";
  }

  if (input.structureHealthLabel === "low") {
    return "Site map has low structural confidence and needs role clarification.";
  }

  if (missingCritical || unresolvedRatio > 0.2 || unknownRatio > 0.4) {
    return "Site map is partially structured but missing key commercial pages.";
  }

  if (input.structureHealthScore >= 80) {
    return "Site map is structurally strong, with a few minor gaps to resolve.";
  }

  return "Site map has mixed structural signals; consider filling missing core roles.";
}

function buildNotes(input: {
  totalPages: number;
  resolvedPages: number;
  unresolvedPages: string[];
  roleDistribution: Record<string, number>;
}): string[] {
  const notes: string[] = ["Site-level intelligence only; no changes are applied."];

  if (input.unresolvedPages.length > 0) {
    const total = Math.max(1, input.totalPages);
    notes.push(`Some pages could not be resolved (${input.unresolvedPages.length}/${total}).`);
  }

  const resolved = Math.max(0, input.resolvedPages);
  const unknown = input.roleDistribution.unknown ?? 0;
  const unknownRatio = resolved > 0 ? unknown / resolved : 0;
  if (unknownRatio > 0.5) notes.push("Several pages have unclear roles.");

  return notes;
}

export function buildSiteMapIntelligence(input: {
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
}): SiteMapIntelligence {
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

  const pageIntents: SiteMapIntelligence["pageIntents"] = [];
  for (const p of input.pages ?? []) {
    const slug = normalizeSlug(p.slug);
    if (!slug) continue;
    const resolved = resolvedBySlug.get(slug);
    if (!resolved) continue;

    const page = resolved.page;
    const title = (resolved.title ?? page.title ?? "").trim() || undefined;
    const review = buildMigrationReviewSummary(page);
    const intent = String(review.intent ?? "unknown");
    const intentConfidence = clampInt(Number(review.intentConfidence ?? 0), 0, 100);
    const confidenceScore = typeof review.confidenceScore === "number" ? clampInt(review.confidenceScore, 0, 100) : undefined;
    const role = inferSiteRole({ slug, title, intent, intentConfidence });

    pageIntents.push({ slug, title, intent, intentConfidence, confidenceScore, role });
  }

  const intentDistribution = buildIntentDistribution(pageIntents);
  const roleDistribution = buildRoleDistribution(pageIntents);
  const resolvedPages = pageIntents.length;
  const missingRoles = computeMissingRoles({ resolvedPages, roleDistribution, intentDistribution });
  const structureHealth = calculateSiteStructureHealth({ totalPages, resolvedPages, roleDistribution, intentDistribution });
  const recommendations = buildSiteRecommendations({
    missingRoles,
    unresolvedPages,
    roleDistribution,
    resolvedPages,
    structureHealthLabel: structureHealth.label,
  });
  const summary = buildSummary({
    totalPages,
    resolvedPages,
    unresolvedPages,
    roleDistribution,
    missingRoles,
    structureHealthLabel: structureHealth.label,
    structureHealthScore: structureHealth.score,
  });
  const notes = buildNotes({ totalPages, resolvedPages, unresolvedPages, roleDistribution });

  return {
    summary,
    totalPages,
    resolvedPages,
    unresolvedPages,
    pageIntents,
    intentDistribution,
    roleDistribution,
    missingRoles,
    structureHealth,
    recommendations,
    notes,
  };
}

