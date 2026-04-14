import type { CanonicalContentRecord, CanonicalContentType } from "../../architecture/canonical-import-models";
import { pushConflict, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import type {
  FinalComponentContentBinding,
  FinalPageModel,
  FinalSectionModel,
  MergeContext,
} from "../types/merge-types";

const CONTENT_TYPE_BY_SLOT: Record<string, CanonicalContentType[]> = {
  heading: ["heading", "subheading", "plain_text"],
  title: ["heading", "subheading", "plain_text"],
  body: ["rich_text", "plain_text", "subheading"],
  text: ["rich_text", "plain_text", "subheading"],
  description: ["rich_text", "plain_text", "seo_description"],
  label: ["cta_label", "nav_label", "plain_text"],
  href: ["cta_url"],
  url: ["cta_url"],
  image: ["image", "logo", "background"],
  icon: ["icon", "svg"],
  quote: ["testimonial_quote", "plain_text"],
  author: ["testimonial_author", "plain_text"],
  question: ["faq_question", "plain_text"],
  answer: ["faq_answer", "rich_text", "plain_text"],
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .sort((a, b) => stringCmp(a, b));
}

function includesToken(haystack: string, token: string): boolean {
  return haystack.toLowerCase().includes(token.toLowerCase());
}

function candidateTypePriority(slotKey: string): CanonicalContentType[] {
  const normalized = slotKey
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
  const direct = CONTENT_TYPE_BY_SLOT[normalized];
  if (direct) return direct;

  const firstToken = tokenize(normalized)[0];
  if (firstToken && CONTENT_TYPE_BY_SLOT[firstToken]) {
    return CONTENT_TYPE_BY_SLOT[firstToken];
  }

  if (normalized.includes("href") || normalized.includes("url") || normalized.includes("link")) {
    return ["cta_url", "plain_text"];
  }
  if (normalized.includes("label") || normalized.includes("button")) {
    return ["cta_label", "plain_text"];
  }
  if (normalized.includes("image") || normalized.includes("media")) {
    return ["image", "logo", "background"];
  }

  return ["plain_text", "rich_text", "heading", "image", "cta_label", "cta_url"];
}

function scoreRecordForSlot(input: {
  slotKey: string;
  record: CanonicalContentRecord;
  sourceHint: string | null;
  fieldKeyHint: string;
  typePriority: CanonicalContentType[];
}): number {
  const { slotKey, record, sourceHint, fieldKeyHint, typePriority } = input;
  let score = 0;
  const normalizedField = fieldKeyHint.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizedSlot = slotKey.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const typeIndex = typePriority.indexOf(record.type);
  if (typeIndex >= 0) {
    score += 100 - typeIndex * 8;
  }

  if (record.required) score += 5;
  if (record.editable) score += 2;

  if (includesToken(fieldKeyHint, slotKey) || normalizedField.includes(normalizedSlot) || normalizedSlot.includes(normalizedField)) {
    score += 15;
  }

  if (sourceHint && typeof record.value === "string") {
    const slotTokens = tokenize(sourceHint);
    const valueTokens = tokenize(record.value);
    const overlap = slotTokens.filter((token) => valueTokens.includes(token)).length;
    score += Math.min(20, overlap * 4);
  }

  return score;
}

function getSectionCandidateRecords(input: {
  section: FinalSectionModel;
  context: MergeContext;
}): Array<{ record: CanonicalContentRecord; fieldKeyHint: string; source: "canonical_binding" | "heuristic" }> {
  const { context, section } = input;
  const out: Array<{ record: CanonicalContentRecord; fieldKeyHint: string; source: "canonical_binding" | "heuristic" }> = [];

  const fromSectionBindings = context.bindingsBySectionId.get(section.id) ?? [];
  for (const binding of fromSectionBindings.slice().sort((a, b) => stringCmp(a.id, b.id))) {
    const record = context.recordsById.get(binding.contentId);
    if (!record) continue;
    out.push({
      record,
      fieldKeyHint: binding.fieldKey,
      source: "canonical_binding",
    });
  }

  if (out.length > 0) {
    return out;
  }

  const fromOwnerBindings = context.bindingsByOwnerId.get(section.id) ?? [];
  for (const binding of fromOwnerBindings.slice().sort((a, b) => stringCmp(a.id, b.id))) {
    const record = context.recordsById.get(binding.contentId);
    if (!record) continue;
    out.push({
      record,
      fieldKeyHint: binding.fieldKey,
      source: "heuristic",
    });
  }

  return out;
}

export function bindContentToPage(input: {
  page: FinalPageModel;
  context: MergeContext;
}): FinalPageModel {
  const { page, context } = input;
  const sections = page.sections.map((section) => bindContentToSection({ section, pageId: page.id, context }));
  return {
    ...page,
    sections,
  };
}

function bindContentToSection(input: {
  section: FinalSectionModel;
  pageId: string;
  context: MergeContext;
}): FinalSectionModel {
  const { section, pageId, context } = input;
  const candidates = getSectionCandidateRecords({ section, context });
  const usedContentIds = new Set<string>();
  const createdBindings: FinalComponentContentBinding[] = [];

  for (const component of section.components.slice().sort((a, b) => a.order - b.order || stringCmp(a.id, b.id))) {
    for (const slot of component.slots.slice().sort((a, b) => stringCmp(a.key, b.key))) {
      const priority = candidateTypePriority(slot.key);
      const scored = candidates
        .filter((candidate) => !usedContentIds.has(candidate.record.id))
        .map((candidate) => ({
          candidate,
          score: scoreRecordForSlot({
            slotKey: slot.key,
            record: candidate.record,
            sourceHint: slot.sourceHint,
            fieldKeyHint: candidate.fieldKeyHint,
            typePriority: priority,
          }),
        }))
        .sort((a, b) => b.score - a.score || stringCmp(a.candidate.record.id, b.candidate.record.id));

      const best = scored[0];
      if (!best || best.score < 40) {
        pushConflict(context, {
          type: "content_binding_missing",
          resolution: "skipped",
          details: {
            pageId,
            sectionId: section.id,
            componentId: component.id,
            slot: slot.key,
          },
        });

        pushDiagnostic(context, {
          code: "MERGE_CONTENT_BINDING_MISSING",
          severity: "warning",
          message: `No canonical content binding found for component slot '${component.id}.${slot.key}'.`,
          pageId,
          sectionId: section.id,
        });

        continue;
      }

      usedContentIds.add(best.candidate.record.id);
      const binding: FinalComponentContentBinding = {
        id: `${component.id}::${slot.key}::${best.candidate.record.id}`,
        componentId: component.id,
        sectionId: section.id,
        slotPath: `${component.id}.${slot.key}`,
        contentId: best.candidate.record.id,
        confidence: Math.min(1, Math.max(0, best.score / 120)),
        source: best.candidate.source,
      };
      createdBindings.push(binding);
    }
  }

  createdBindings.sort((a, b) => stringCmp(a.id, b.id));

  if (createdBindings.length === 0) {
    pushDiagnostic(context, {
      code: "MERGE_CONTENT_BINDING_EMPTY_SECTION",
      severity: "info",
      message: `Section '${section.id}' contains no resolved component-slot content bindings.`,
      pageId,
      sectionId: section.id,
    });
  }

  return {
    ...section,
    contentBindings: createdBindings,
  };
}
