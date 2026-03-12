import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";
import { runLayoutAgent } from "@/gnr8/ai/layout-agent";
import type { SupportedSectionType } from "@/gnr8/ai/layout-types";

export type PageStructureSignature = {
  typeSequence: string;
  totalSections: number;
  legacySections: number;
  countsByType: Record<string, number>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getPageStructureSignature(page: Gnr8Page): PageStructureSignature {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const types: string[] = [];
  const countsByType: Record<string, number> = {};

  for (const section of sections) {
    const type = typeof section?.type === "string" ? section.type : "unknown";
    types.push(type);
    countsByType[type] = (countsByType[type] ?? 0) + 1;
  }

  return {
    typeSequence: types.join("|"),
    totalSections: sections.length,
    legacySections: countsByType["legacy.html"] ?? 0,
    countsByType,
  };
}

export function getPageTransformationSignature(page: Gnr8Page): string {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  const typeAndIdSequence = sections
    .map((s) => {
      const type = typeof s?.type === "string" ? s.type : "unknown";
      const id = typeof s?.id === "string" ? s.id : "";
      return id ? `${type}:${id}` : type;
    })
    .join("|");

  const semanticSnapshots = sections.map((s) => {
    const type = typeof s?.type === "string" ? s.type : "unknown";
    const id = typeof s?.id === "string" ? s.id : "";
    const props = isRecord(s?.props) ? s.props : {};

    if (type === "hero.split") {
      return { id, type, props: { headline: getTrimmedString(props.headline), subheadline: getTrimmedString(props.subheadline) } };
    }

    if (type === "cta.simple") {
      return {
        id,
        type,
        props: {
          headline: getTrimmedString(props.headline),
          subheadline: getTrimmedString(props.subheadline),
          buttonLabel: getTrimmedString(props.buttonLabel),
          buttonHref: getTrimmedString(props.buttonHref),
        },
      };
    }

    if (type === "faq.basic") {
      const itemsRaw = Array.isArray(props.items) ? props.items : [];
      const items = itemsRaw
        .filter((i) => isRecord(i))
        .map((i) => ({ question: getTrimmedString(i.question), answer: getTrimmedString(i.answer) }));
      return { id, type, props: { items } };
    }

    if (type === "pricing.basic") {
      const plansRaw = Array.isArray(props.plans) ? props.plans : [];
      const plans = plansRaw
        .filter((p) => isRecord(p))
        .map((p) => ({
          name: getTrimmedString(p.name),
          price: getTrimmedString(p.price),
          description: getTrimmedString(p.description),
          ctaLabel: getTrimmedString(p.ctaLabel),
          ctaHref: getTrimmedString(p.ctaHref),
        }));
      return { id, type, props: { plans } };
    }

    if (type === "feature.grid") {
      const itemsRaw = Array.isArray(props.items) ? props.items : [];
      const items = itemsRaw
        .filter((i) => isRecord(i))
        .map((i) => ({ title: getTrimmedString(i.title), text: getTrimmedString(i.text) }));
      return { id, type, props: { items } };
    }

    return { id, type };
  });

  return JSON.stringify({ typeAndIdSequence, semanticSnapshots });
}

type AddPlacement = "after-hero" | "above-pricing" | "below-pricing" | "before-footer" | "bottom";

export type ContentLayoutActionV1 =
  | { kind: "add"; sectionType: SupportedSectionType; placement: AddPlacement; promptKey: string }
  | { kind: "replace-legacy"; sectionType: SupportedSectionType; promptKey: string };

type AddAction = Omit<Extract<ContentLayoutActionV1, { kind: "add" }>, "promptKey">;

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildAddActionMap(): Map<string, AddAction> {
  const map = new Map<string, AddAction>();

  const add = (keys: string[], action: AddAction) => {
    for (const key of keys) map.set(normalizeKey(key), action);
  };

  add(
    [
      "Add CTA below the hero",
      "Add CTA below hero",
      "Add CTA under the hero",
      "Add CTA under hero",
      "Add CTA after the hero",
      "Add CTA after hero",
    ],
    { kind: "add", sectionType: "cta.simple", placement: "after-hero" },
  );

  add(
    [
      "Add feature grid below the hero",
      "Add feature grid below hero",
      "Add features below the hero",
      "Add features below hero",
    ],
    { kind: "add", sectionType: "feature.grid", placement: "after-hero" },
  );

  add(["Add logo cloud above pricing", "Add logo cloud above the pricing"], {
    kind: "add",
    sectionType: "logo.cloud",
    placement: "above-pricing",
  });

  add(["Add FAQ below pricing", "Add FAQ below the pricing"], {
    kind: "add",
    sectionType: "faq.basic",
    placement: "below-pricing",
  });

  add(["Add pricing section", "Add pricing"], {
    kind: "add",
    sectionType: "pricing.basic",
    placement: "before-footer",
  });

  add(
    ["Add footer at the bottom", "Add footer to the bottom", "Add footer at bottom", "Add footer to bottom"],
    { kind: "add", sectionType: "footer.basic", placement: "bottom" },
  );

  return map;
}

const ADD_ACTIONS = buildAddActionMap();

function targetTypeFromReplaceKey(key: string): SupportedSectionType | null {
  const k = normalizeKey(key);
  const hits: SupportedSectionType[] = [];
  if (/\bfaq\b/.test(k)) hits.push("faq.basic");
  if (/\bcta\b/.test(k) || /\bcall to action\b/.test(k)) hits.push("cta.simple");
  if (/\bpricing\b/.test(k)) hits.push("pricing.basic");
  if (/\bhero\b/.test(k)) hits.push("hero.split");
  if (hits.length !== 1) return null;
  return hits[0];
}

export function getContentLayoutActionForPromptV1(input: {
  kind: "add-section" | "replace-section";
  actionPrompt: string;
}): { ok: true; action: ContentLayoutActionV1 } | { ok: false; reason: string } {
  const actionPrompt = String(input.actionPrompt ?? "").trim();
  if (!actionPrompt) return { ok: false, reason: "Blank actionPrompt." };

  const key = normalizeKey(actionPrompt);

  if (input.kind === "add-section") {
    const action = ADD_ACTIONS.get(key);
    if (!action) return { ok: false, reason: "Add-section actionPrompt is not supported in v1." };
    return { ok: true, action: { ...action, promptKey: key } satisfies ContentLayoutActionV1 };
  }

  if (!key.startsWith("replace legacy")) {
    return { ok: false, reason: "Replace-section is only supported for legacy replacements in v1." };
  }

  const match = key.match(/^replace legacy(?: html)?(?: section| block| blocks)? with (.+)$/);
  const tail = match?.[1]?.trim() ?? key;
  const sectionType = targetTypeFromReplaceKey(tail);
  if (!sectionType) {
    return { ok: false, reason: "Replace-section target is not supported in v1." };
  }

  return { ok: true, action: { kind: "replace-legacy", sectionType, promptKey: key } };
}

function createDefaultSectionOfType(type: SupportedSectionType): Gnr8Section {
  const promptByType: Record<SupportedSectionType, string> = {
    "navbar.basic": "Add navbar",
    "hero.split": "Add hero",
    "feature.grid": "Add feature grid",
    "logo.cloud": "Add logo cloud",
    "cta.simple": "Add CTA",
    "faq.basic": "Add FAQ",
    "pricing.basic": "Add pricing",
    "footer.basic": "Add footer",
  };

  const tmp: Gnr8Page = { id: "tmp", slug: "tmp", title: "tmp", sections: [] };
  const result = runLayoutAgent({ prompt: promptByType[type], page: tmp });
  const section = Array.isArray(result.page.sections) ? result.page.sections[0] : null;

  if (!section || typeof section.type !== "string") {
    throw new Error(`Failed to create default section for ${type}`);
  }
  if (section.type !== type) {
    throw new Error(`Default section factory mismatch: expected ${type} but got ${section.type}`);
  }

  return section;
}

function hasType(page: Gnr8Page, type: string): boolean {
  return (Array.isArray(page.sections) ? page.sections : []).some((s) => s?.type === type);
}

export function applyContentLayoutActionV1(input: {
  page: Gnr8Page;
  action: ContentLayoutActionV1;
}): { page: Gnr8Page; applied: boolean; notes: string[] } {
  const page = input.page;
  const sections = Array.isArray(page.sections) ? [...page.sections] : [];
  const notes: string[] = [];

  if (input.action.kind === "replace-legacy") {
    const idx = sections.findIndex((s) => s?.type === "legacy.html");
    if (idx === -1) {
      notes.push("No legacy.html section found; replace skipped.");
      return { page, applied: false, notes };
    }

    const replacement = createDefaultSectionOfType(input.action.sectionType);
    sections.splice(idx, 1, replacement);
    notes.push(`Replaced one legacy.html section with ${input.action.sectionType}.`);
    return { page: { ...page, sections }, applied: true, notes };
  }

  const sectionType = input.action.sectionType;
  if (hasType(page, sectionType)) {
    notes.push(`${sectionType} already exists; add skipped.`);
    return { page, applied: false, notes };
  }

  const newSection = createDefaultSectionOfType(sectionType);

  switch (input.action.placement) {
    case "after-hero": {
      const heroIdx = sections.findIndex((s) => s?.type === "hero.split");
      if (heroIdx === -1) {
        notes.push("No hero.split section found; cannot insert below hero.");
        return { page, applied: false, notes };
      }
      sections.splice(heroIdx + 1, 0, newSection);
      notes.push(`Inserted ${sectionType} below hero.`);
      return { page: { ...page, sections }, applied: true, notes };
    }
    case "above-pricing": {
      const pricingIdx = sections.findIndex((s) => s?.type === "pricing.basic");
      if (pricingIdx === -1) {
        notes.push("No pricing.basic section found; cannot insert above pricing.");
        return { page, applied: false, notes };
      }
      sections.splice(pricingIdx, 0, newSection);
      notes.push(`Inserted ${sectionType} above pricing.`);
      return { page: { ...page, sections }, applied: true, notes };
    }
    case "below-pricing": {
      let lastPricingIdx = -1;
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        if (sections[i]?.type === "pricing.basic") {
          lastPricingIdx = i;
          break;
        }
      }
      if (lastPricingIdx === -1) {
        notes.push("No pricing.basic section found; cannot insert below pricing.");
        return { page, applied: false, notes };
      }
      sections.splice(lastPricingIdx + 1, 0, newSection);
      notes.push(`Inserted ${sectionType} below pricing.`);
      return { page: { ...page, sections }, applied: true, notes };
    }
    case "before-footer": {
      const footerIdx = sections.findIndex((s) => s?.type === "footer.basic");
      const insertAt = footerIdx === -1 ? sections.length : footerIdx;
      sections.splice(insertAt, 0, newSection);
      notes.push(`Inserted ${sectionType}.`);
      return { page: { ...page, sections }, applied: true, notes };
    }
    case "bottom": {
      sections.push(newSection);
      notes.push(`Inserted ${sectionType} at the bottom.`);
      return { page: { ...page, sections }, applied: true, notes };
    }
  }
}
