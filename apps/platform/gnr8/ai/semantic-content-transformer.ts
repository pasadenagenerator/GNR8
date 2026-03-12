import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";

export type SemanticTransformKind =
  | "hero-clarity"
  | "cta-clarity"
  | "faq-normalization"
  | "pricing-completion"
  | "feature-completion";

export type SemanticTransformResult = {
  changed: boolean;
  kind: SemanticTransformKind;
  explanation: string;
  page: Gnr8Page;
  changedSections: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeActionPrompt(prompt: string): string {
  const collapsed = String(prompt ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return collapsed.replace(/[.?!;:,]+$/, "").trim();
}

type SupportedPrompt =
  | "improve hero clarity"
  | "improve cta clarity"
  | "normalize faq content"
  | "complete pricing content"
  | "complete feature grid content";

function toSupportedPrompt(normalizedPrompt: string): SupportedPrompt | null {
  switch (normalizedPrompt) {
    case "improve hero clarity":
    case "improve cta clarity":
    case "normalize faq content":
    case "complete pricing content":
    case "complete feature grid content":
      return normalizedPrompt;
    default:
      return null;
  }
}

function getFirstSectionIndexByType(sections: Gnr8Section[], type: string): number {
  for (let i = 0; i < sections.length; i += 1) if (sections[i]?.type === type) return i;
  return -1;
}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isWeakHeadline(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length < 10) return true;
  if (
    low === "headline" ||
    low === "title" ||
    low === "hero" ||
    low === "welcome" ||
    low === "hello" ||
    low === "hi" ||
    low === "lorem ipsum" ||
    low === "coming soon" ||
    low === "your product"
  )
    return true;
  return false;
}

function isWeakButtonLabel(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  return low === "click here" || low === "submit" || low === "learn more";
}

function isWeakFaqQuestion(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length < 8) return true;
  return low === "question" || low === "faq" || low === "questions";
}

function isWeakFaqAnswer(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (t.length < 20) return true;
  const low = t.toLowerCase();
  return low === "answer" || low === "tbd" || low === "todo";
}

function buildResult(input: {
  kind: SemanticTransformKind;
  pageAfter: Gnr8Page;
  changedSectionIds: string[];
  explanationLines: string[];
}): SemanticTransformResult {
  const changed = input.changedSectionIds.length > 0;
  const explanation = input.explanationLines.length > 0 ? input.explanationLines.join(" ") : "No semantic content changes were needed.";
  return {
    changed,
    kind: input.kind,
    explanation,
    page: input.pageAfter,
    changedSections: input.changedSectionIds,
  };
}

function transformHeroClarity(page: Gnr8Page): SemanticTransformResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const idx = getFirstSectionIndexByType(sections, "hero.split");
  if (idx === -1) {
    return buildResult({
      kind: "hero-clarity",
      pageAfter: page,
      changedSectionIds: [],
      explanationLines: ["No hero.split section found; no changes applied."],
    });
  }

  const section = sections[idx]!;
  const props = isRecord(section.props) ? { ...section.props } : {};
  const beforeHeadline = getTrimmedString(props.headline);
  const beforeSubheadline = getTrimmedString(props.subheadline);

  const headlineTemplateA = "A clearer way to present your offer";
  const headlineTemplateB = "A better way to explain what this page offers";
  const subheadlineTemplateA = "Use this section to communicate value clearly and quickly.";
  const subheadlineTemplateB = "Make the primary value proposition easier to understand.";

  const changes: string[] = [];

  if (isWeakHeadline(beforeHeadline)) {
    const nextHeadline = beforeHeadline ? headlineTemplateB : headlineTemplateA;
    if (nextHeadline !== beforeHeadline) {
      props.headline = nextHeadline;
      changes.push(`Updated hero headline to a clearer default template.`);
    }
  }

  if (!beforeSubheadline) {
    props.subheadline = beforeHeadline ? subheadlineTemplateB : subheadlineTemplateA;
    changes.push("Added a deterministic hero subheadline placeholder.");
  }

  const nextSection: Gnr8Section = changes.length > 0 ? { ...section, props } : section;
  const nextSections = changes.length > 0 ? [...sections.slice(0, idx), nextSection, ...sections.slice(idx + 1)] : sections;
  const nextPage: Gnr8Page = changes.length > 0 ? { ...page, sections: nextSections } : page;

  return buildResult({
    kind: "hero-clarity",
    pageAfter: nextPage,
    changedSectionIds: changes.length > 0 ? [section.id] : [],
    explanationLines: changes.length > 0 ? [`Updated hero.split section '${section.id}'.`, ...changes] : ["Hero clarity already looks sufficient; no changes applied."],
  });
}

function transformCtaClarity(page: Gnr8Page): SemanticTransformResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const idx = getFirstSectionIndexByType(sections, "cta.simple");
  if (idx === -1) {
    return buildResult({
      kind: "cta-clarity",
      pageAfter: page,
      changedSectionIds: [],
      explanationLines: ["No cta.simple section found; no changes applied."],
    });
  }

  const section = sections[idx]!;
  const props = isRecord(section.props) ? { ...section.props } : {};

  const beforeHeadline = getTrimmedString(props.headline);
  const beforeSubheadline = getTrimmedString(props.subheadline);
  const beforeButtonLabel = getTrimmedString(props.buttonLabel);

  const changes: string[] = [];

  if (!beforeHeadline) {
    props.headline = "Ready to take the next step?";
    changes.push("Added a deterministic CTA headline.");
  }

  if (!beforeSubheadline) {
    props.subheadline = "Guide users toward the most important next action.";
    changes.push("Added a deterministic CTA helper subheadline.");
  }

  if (isWeakButtonLabel(beforeButtonLabel)) {
    const nextLabel = "Get started";
    if (nextLabel !== beforeButtonLabel) {
      props.buttonLabel = nextLabel;
      changes.push("Replaced weak CTA button label with a clearer default.");
    }
  }

  const nextSection: Gnr8Section = changes.length > 0 ? { ...section, props } : section;
  const nextSections = changes.length > 0 ? [...sections.slice(0, idx), nextSection, ...sections.slice(idx + 1)] : sections;
  const nextPage: Gnr8Page = changes.length > 0 ? { ...page, sections: nextSections } : page;

  return buildResult({
    kind: "cta-clarity",
    pageAfter: nextPage,
    changedSectionIds: changes.length > 0 ? [section.id] : [],
    explanationLines: changes.length > 0 ? [`Updated cta.simple section '${section.id}'.`, ...changes] : ["CTA clarity already looks sufficient; no changes applied."],
  });
}

function transformFaqNormalization(page: Gnr8Page): SemanticTransformResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const idx = getFirstSectionIndexByType(sections, "faq.basic");
  if (idx === -1) {
    return buildResult({
      kind: "faq-normalization",
      pageAfter: page,
      changedSectionIds: [],
      explanationLines: ["No faq.basic section found; no changes applied."],
    });
  }

  const section = sections[idx]!;
  const props = isRecord(section.props) ? { ...section.props } : {};
  const itemsRaw = Array.isArray(props.items) ? props.items : [];

  const questionA = "What should visitors know?";
  const questionB = "How does this work?";
  const answerA = "Add a clear answer here so visitors can quickly understand the topic.";
  const answerB = "Use this answer to reduce friction and clarify common questions.";

  let removedEmpty = 0;
  let filledQuestions = 0;
  let filledAnswers = 0;
  let normalized = 0;

  const nextItems: Array<{ question: string; answer: string }> = [];
  for (const raw of itemsRaw) {
    if (!isRecord(raw)) continue;
    const q0 = getTrimmedString(raw.question);
    const a0 = getTrimmedString(raw.answer);
    const qEmpty = !q0;
    const aEmpty = !a0;

    if (qEmpty && aEmpty) {
      removedEmpty += 1;
      continue;
    }

    let q = q0;
    let a = a0;

    if (qEmpty && !aEmpty) {
      q = questionA;
      filledQuestions += 1;
    } else if (isWeakFaqQuestion(q)) {
      q = questionB;
      filledQuestions += 1;
    }

    if (!qEmpty && aEmpty) {
      a = answerA;
      filledAnswers += 1;
    } else if (isWeakFaqAnswer(a)) {
      a = answerB;
      filledAnswers += 1;
    }

    if (q !== q0 || a !== a0) normalized += 1;
    nextItems.push({ question: q, answer: a });
  }

  const nextProps = { ...props, items: nextItems };

  const changed =
    removedEmpty > 0 ||
    filledQuestions > 0 ||
    filledAnswers > 0 ||
    normalized > 0 ||
    (Array.isArray(props.items) ? props.items.length !== nextItems.length : nextItems.length > 0);

  const changes: string[] = [];
  if (!Array.isArray(props.items)) changes.push("Ensured faq.items is an array.");
  if (removedEmpty > 0) changes.push(`Removed ${removedEmpty} fully empty FAQ item${removedEmpty === 1 ? "" : "s"}.`);
  if (filledQuestions > 0) changes.push(`Filled/normalized ${filledQuestions} FAQ question${filledQuestions === 1 ? "" : "s"}.`);
  if (filledAnswers > 0) changes.push(`Filled/normalized ${filledAnswers} FAQ answer${filledAnswers === 1 ? "" : "s"}.`);

  const nextSection: Gnr8Section = changed ? { ...section, props: nextProps } : section;
  const nextSections = changed ? [...sections.slice(0, idx), nextSection, ...sections.slice(idx + 1)] : sections;
  const nextPage: Gnr8Page = changed ? { ...page, sections: nextSections } : page;

  return buildResult({
    kind: "faq-normalization",
    pageAfter: nextPage,
    changedSectionIds: changed ? [section.id] : [],
    explanationLines: changed ? [`Updated faq.basic section '${section.id}'.`, ...changes] : ["FAQ content already looks normalized; no changes applied."],
  });
}

function transformPricingCompletion(page: Gnr8Page): SemanticTransformResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const idx = getFirstSectionIndexByType(sections, "pricing.basic");
  if (idx === -1) {
    return buildResult({
      kind: "pricing-completion",
      pageAfter: page,
      changedSectionIds: [],
      explanationLines: ["No pricing.basic section found; no changes applied."],
    });
  }

  const section = sections[idx]!;
  const props = isRecord(section.props) ? { ...section.props } : {};
  const plansRaw = Array.isArray(props.plans) ? props.plans : [];

  const descriptionA = "Summarize what this plan includes.";
  const descriptionB = "Explain the main value of this plan clearly.";
  const ctaA = "Choose plan";
  const ctaB = "Get started";

  let ensuredPlansArray = false;
  let filledDescriptions = 0;
  let filledCtas = 0;

  const nextPlans: Array<Record<string, unknown>> = [];
  for (const raw of plansRaw) {
    if (!isRecord(raw)) continue;
    const plan = { ...raw };
    const desc = getTrimmedString(plan.description);
    const ctaLabel = getTrimmedString(plan.ctaLabel);

    if (!desc) {
      plan.description = getTrimmedString(plan.name) ? descriptionB : descriptionA;
      filledDescriptions += 1;
    }

    if (!ctaLabel) {
      plan.ctaLabel = getTrimmedString(plan.ctaHref) ? ctaB : ctaA;
      filledCtas += 1;
    }

    nextPlans.push(plan);
  }

  if (!Array.isArray(props.plans)) ensuredPlansArray = true;

  const changed = ensuredPlansArray || filledDescriptions > 0 || filledCtas > 0;
  const nextProps = { ...props, plans: nextPlans };

  const changes: string[] = [];
  if (ensuredPlansArray) changes.push("Ensured pricing.plans is an array.");
  if (filledDescriptions > 0) changes.push(`Filled ${filledDescriptions} missing plan description${filledDescriptions === 1 ? "" : "s"}.`);
  if (filledCtas > 0) changes.push(`Filled ${filledCtas} missing plan CTA label${filledCtas === 1 ? "" : "s"}.`);

  const nextSection: Gnr8Section = changed ? { ...section, props: nextProps } : section;
  const nextSections = changed ? [...sections.slice(0, idx), nextSection, ...sections.slice(idx + 1)] : sections;
  const nextPage: Gnr8Page = changed ? { ...page, sections: nextSections } : page;

  return buildResult({
    kind: "pricing-completion",
    pageAfter: nextPage,
    changedSectionIds: changed ? [section.id] : [],
    explanationLines: changed ? [`Updated pricing.basic section '${section.id}'.`, ...changes] : ["Pricing content already looks complete; no changes applied."],
  });
}

function transformFeatureCompletion(page: Gnr8Page): SemanticTransformResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const idx = getFirstSectionIndexByType(sections, "feature.grid");
  if (idx === -1) {
    return buildResult({
      kind: "feature-completion",
      pageAfter: page,
      changedSectionIds: [],
      explanationLines: ["No feature.grid section found; no changes applied."],
    });
  }

  const section = sections[idx]!;
  const props = isRecord(section.props) ? { ...section.props } : {};
  const itemsRaw = Array.isArray(props.items) ? props.items : [];

  const titleA = "Key feature";
  const titleB = "Important capability";
  const textA = "Add a short explanation of this feature.";
  const textB = "Use this text to explain the benefit clearly.";

  let ensuredItemsArray = false;
  let removedEmpty = 0;
  let filledTitles = 0;
  let filledTexts = 0;

  const nextItems: Array<Record<string, unknown>> = [];
  for (const raw of itemsRaw) {
    if (!isRecord(raw)) continue;
    const item = { ...raw };
    const title0 = getTrimmedString(item.title);
    const text0 = getTrimmedString(item.text);

    if (!title0 && !text0) {
      removedEmpty += 1;
      continue;
    }

    if (!title0) {
      item.title = text0 ? titleB : titleA;
      filledTitles += 1;
    }

    if (!text0) {
      item.text = title0 ? textB : textA;
      filledTexts += 1;
    }

    nextItems.push(item);
  }

  if (!Array.isArray(props.items)) ensuredItemsArray = true;

  const changed = ensuredItemsArray || removedEmpty > 0 || filledTitles > 0 || filledTexts > 0;
  const nextProps = { ...props, items: nextItems };

  const changes: string[] = [];
  if (ensuredItemsArray) changes.push("Ensured feature.items is an array.");
  if (removedEmpty > 0) changes.push(`Removed ${removedEmpty} fully empty feature item${removedEmpty === 1 ? "" : "s"}.`);
  if (filledTitles > 0) changes.push(`Filled ${filledTitles} missing feature title${filledTitles === 1 ? "" : "s"}.`);
  if (filledTexts > 0) changes.push(`Filled ${filledTexts} missing feature text${filledTexts === 1 ? "" : "s"}.`);

  const nextSection: Gnr8Section = changed ? { ...section, props: nextProps } : section;
  const nextSections = changed ? [...sections.slice(0, idx), nextSection, ...sections.slice(idx + 1)] : sections;
  const nextPage: Gnr8Page = changed ? { ...page, sections: nextSections } : page;

  return buildResult({
    kind: "feature-completion",
    pageAfter: nextPage,
    changedSectionIds: changed ? [section.id] : [],
    explanationLines: changed ? [`Updated feature.grid section '${section.id}'.`, ...changes] : ["Feature grid content already looks complete; no changes applied."],
  });
}

export function transformSemanticContentV1(input: {
  page: Gnr8Page;
  actionPrompt: string;
}): SemanticTransformResult | null {
  const normalized = normalizeActionPrompt(input.actionPrompt);
  const supported = toSupportedPrompt(normalized);
  if (!supported) return null;

  switch (supported) {
    case "improve hero clarity":
      return transformHeroClarity(input.page);
    case "improve cta clarity":
      return transformCtaClarity(input.page);
    case "normalize faq content":
      return transformFaqNormalization(input.page);
    case "complete pricing content":
      return transformPricingCompletion(input.page);
    case "complete feature grid content":
      return transformFeatureCompletion(input.page);
    default:
      return null;
  }
}
