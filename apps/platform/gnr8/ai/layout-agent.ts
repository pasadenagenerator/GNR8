import crypto from "node:crypto";
import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";
import {
  DEFAULT_LANDING_SECTIONS,
  KEYWORD_RULES,
  type SupportedSectionType,
} from "@/gnr8/ai/layout-types";

export type LayoutAgentPlan = {
  mode: "create" | "update";
  requestedSectionTypes: string[];
  notes: string[];
};

export type LayoutAgentInput = {
  prompt: string;
  slug?: string;
  title?: string;
  page?: Gnr8Page;
};

export type LayoutAgentResult = {
  page: Gnr8Page;
  plan: LayoutAgentPlan;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSlug(value: string) {
  const raw = value.trim().toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-+/g, "-");
  return slug || "generated-page";
}

function promptLooksLikeLandingPage(promptLc: string) {
  return (
    promptLc.includes("landing page") ||
    promptLc.includes("homepage") ||
    promptLc.includes("home page") ||
    promptLc.includes("marketing page")
  );
}

function detectRequestedSectionTypes(prompt: string): SupportedSectionType[] {
  const promptLc = prompt.toLowerCase();
  const hits: Array<{ type: SupportedSectionType; index: number }> = [];

  for (const rule of KEYWORD_RULES) {
    let best = Number.POSITIVE_INFINITY;
    for (const kw of rule.keywords) {
      const idx = promptLc.indexOf(kw);
      if (idx !== -1 && idx < best) best = idx;
    }
    if (best !== Number.POSITIVE_INFINITY) hits.push({ type: rule.type, index: best });
  }

  hits.sort((a, b) => a.index - b.index);

  const out: SupportedSectionType[] = [];
  const seen = new Set<SupportedSectionType>();
  for (const h of hits) {
    if (seen.has(h.type)) continue;
    seen.add(h.type);
    out.push(h.type);
  }
  return out;
}

function inferTitleFromPrompt(prompt: string) {
  const p = normalizeWhitespace(prompt);
  const lc = p.toLowerCase();
  if (lc.includes("landing page")) return "Landing Page";
  if (lc.includes("homepage") || lc.includes("home page")) return "Homepage";

  const cleaned = p
    .replace(/^create\s+(a|an)\s+/i, "")
    .replace(/^make\s+(a|an)\s+/i, "")
    .replace(/^build\s+(a|an)\s+/i, "")
    .replace(/^generate\s+(a|an)\s+/i, "")
    .trim();

  if (!cleaned) return "Generated Page";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

function createSection(type: SupportedSectionType): Gnr8Section {
  const id = crypto.randomUUID();
  const year = new Date().getFullYear();

  switch (type) {
    case "navbar.basic":
      return {
        id,
        type,
        props: {
          brandLabel: "GNR8",
          links: [
            { label: "Home", href: "/" },
            { label: "Features", href: "/features" },
            { label: "Pricing", href: "/pricing" },
          ],
        },
      };
    case "hero.split":
      return {
        id,
        type,
        props: { headline: "Generated headline", subheadline: "Generated subheadline" },
      };
    case "feature.grid":
      return {
        id,
        type,
        props: {
          items: [
            { title: "Feature One", text: "Description" },
            { title: "Feature Two", text: "Description" },
            { title: "Feature Three", text: "Description" },
          ],
        },
      };
    case "logo.cloud":
      return { id, type, props: { logos: ["/logo-1.png", "/logo-2.png", "/logo-3.png"] } };
    case "cta.simple":
      return {
        id,
        type,
        props: {
          headline: "Ready to get started?",
          subheadline: "Launch faster with GNR8.",
          buttonLabel: "Start now",
          buttonHref: "/signup",
        },
      };
    case "faq.basic":
      return {
        id,
        type,
        props: {
          items: [
            { question: "What is this?", answer: "A generated FAQ item." },
            { question: "How does it work?", answer: "Using GNR8 sections." },
          ],
        },
      };
    case "pricing.basic":
      return {
        id,
        type,
        props: {
          plans: [
            {
              name: "Starter",
              price: "$9/mo",
              description: "For small teams",
              ctaLabel: "Choose Starter",
              ctaHref: "/signup",
            },
            {
              name: "Pro",
              price: "$29/mo",
              description: "For growing teams",
              ctaLabel: "Choose Pro",
              ctaHref: "/signup",
            },
          ],
        },
      };
    case "footer.basic":
      return {
        id,
        type,
        props: {
          links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ],
          copyright: `© ${year} GNR8`,
        },
      };
  }
}

function looksLikeReplaceLegacy(promptLc: string) {
  return (
    promptLc.includes("replace") &&
    (promptLc.includes("legacy section") ||
      promptLc.includes("legacy.html") ||
      promptLc.includes("legacy html") ||
      promptLc.includes("legacy"))
  );
}

function inferReplacementType(prompt: string, requested: SupportedSectionType[]): SupportedSectionType | null {
  if (requested.length === 0) return null;
  const promptLc = prompt.toLowerCase();

  const replaceIdx = promptLc.indexOf("replace");
  const legacyIdx = promptLc.indexOf("legacy");
  if (replaceIdx === -1 || legacyIdx === -1) return requested[0];

  const withIdx = promptLc.indexOf(" with ", Math.min(replaceIdx, legacyIdx));
  const afterIdx = withIdx !== -1 ? withIdx : Math.max(replaceIdx, legacyIdx);

  let bestType: SupportedSectionType | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      const idx = promptLc.indexOf(kw, afterIdx);
      if (idx !== -1 && idx < bestIndex) {
        bestIndex = idx;
        bestType = rule.type;
      }
    }
  }
  return bestType ?? requested[0];
}

function wantsInsertAfterHero(promptLc: string) {
  return (
    promptLc.includes("below the hero") ||
    promptLc.includes("below hero") ||
    promptLc.includes("under the hero") ||
    promptLc.includes("under hero") ||
    promptLc.includes("after the hero") ||
    promptLc.includes("after hero")
  );
}

function promptExplicitlyRequestsHero(promptLc: string) {
  if (promptLc.includes("hero section")) return true;
  return /\b(add|create|insert|include|append|make|build)\s+(a|an|new|another)?\s*hero\b/.test(promptLc);
}

function stripHeroAnchorFromRequested(promptLc: string, requested: SupportedSectionType[]) {
  if (!requested.includes("hero.split")) return requested;
  if (!wantsInsertAfterHero(promptLc)) return requested;
  if (promptExplicitlyRequestsHero(promptLc)) return requested;
  return requested.filter((t) => t !== "hero.split");
}

function insertSectionsAfterFirstHero(page: Gnr8Page, sections: Gnr8Section[]) {
  const idx = page.sections.findIndex((s) => s.type === "hero.split");
  if (idx === -1) {
    page.sections.push(...sections);
    return;
  }
  page.sections.splice(idx + 1, 0, ...sections);
}

export function runLayoutAgent(input: LayoutAgentInput): LayoutAgentResult {
  const prompt = normalizeWhitespace(input.prompt ?? "");
  if (!prompt) {
    return {
      page: input.page ?? { id: crypto.randomUUID(), slug: "generated-page", title: "Generated Page", sections: [] },
      plan: { mode: input.page ? "update" : "create", requestedSectionTypes: [], notes: ["Empty prompt; no changes."] },
    };
  }

  const promptLc = prompt.toLowerCase();
  const notes: string[] = [];
  let requested = detectRequestedSectionTypes(prompt);

  if (requested.length === 0 && promptLooksLikeLandingPage(promptLc)) {
    requested = DEFAULT_LANDING_SECTIONS;
    notes.push("No explicit sections found; inferred default landing page layout.");
  }

  if (!input.page) {
    const slug = input.slug ? normalizeSlug(input.slug) : "generated-page";
    const title = input.title?.trim() ? input.title.trim() : inferTitleFromPrompt(prompt);

    const sections = requested.map((t) => createSection(t));
    const page: Gnr8Page = { id: crypto.randomUUID(), slug, title, sections };

    if (sections.length === 0) notes.push("No sections requested; created empty page.");

    return {
      page,
      plan: { mode: "create", requestedSectionTypes: requested, notes },
    };
  }

  requested = stripHeroAnchorFromRequested(promptLc, requested);

  const page: Gnr8Page = {
    ...input.page,
    slug: input.slug?.trim() ? normalizeSlug(input.slug) : input.page.slug,
    title: input.title?.trim() ? input.title.trim() : input.page.title,
    sections: [...(input.page.sections ?? [])],
  };

  const replaceLegacy = looksLikeReplaceLegacy(promptLc);
  if (replaceLegacy) {
    const replacementType = inferReplacementType(prompt, requested) ?? "cta.simple";
    const idx = page.sections.findIndex((s) => s.type === "legacy.html");
    const newSection = createSection(replacementType);
    if (idx !== -1) {
      page.sections.splice(idx, 1, newSection);
      notes.push(`Replaced first legacy.html section with ${replacementType}.`);
    } else {
      page.sections.push(newSection);
      notes.push(`No legacy.html section found; appended ${replacementType} instead.`);
    }

    const hasAddIntent =
      promptLc.includes("add ") ||
      promptLc.includes("append ") ||
      promptLc.includes("include ") ||
      promptLc.includes("insert ");

    const extraTypes = requested.filter((t) => t !== replacementType);
    if (hasAddIntent && extraTypes.length > 0) {
      const extraSections = extraTypes.map((t) => createSection(t));
      if (wantsInsertAfterHero(promptLc)) {
        insertSectionsAfterFirstHero(page, extraSections);
        notes.push(`Inserted ${extraTypes.join(", ")} after hero.`);
      } else {
        page.sections.push(...extraSections);
        notes.push(`Appended ${extraTypes.join(", ")}.`);
      }
    }

    return {
      page,
      plan: { mode: "update", requestedSectionTypes: requested, notes },
    };
  }

  const hasAddIntent =
    promptLc.includes("add ") || promptLc.includes("append ") || promptLc.includes("include ") || promptLc.includes("insert ");

  const existingTypes = new Set(page.sections.map((s) => s.type));
  const toAdd: SupportedSectionType[] = [];

  if (hasAddIntent) {
    toAdd.push(...requested);
  } else {
    for (const t of requested) {
      if (!existingTypes.has(t)) toAdd.push(t);
    }
    if (requested.length > 0) {
      notes.push("No explicit add/replace intent; appended only missing requested sections.");
    }
  }

  if (toAdd.length === 0) {
    notes.push("No layout changes requested.");
    return { page, plan: { mode: "update", requestedSectionTypes: requested, notes } };
  }

  const newSections = toAdd.map((t) => createSection(t));
  if (wantsInsertAfterHero(promptLc)) {
    insertSectionsAfterFirstHero(page, newSections);
    notes.push(`Inserted ${toAdd.join(", ")} after hero.`);
  } else {
    page.sections.push(...newSections);
    notes.push(`Appended ${toAdd.join(", ")}.`);
  }

  return { page, plan: { mode: "update", requestedSectionTypes: requested, notes } };
}
