import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";
import type { MigrationReviewSummary } from "./migration-review-logic";
import { getExecutionCapabilityForPlanStep } from "./execution-capability-matrix";
import { evaluateExecutionPolicy, type ExecutionPolicyDecision, type ExecutionPolicyReason } from "./execution-policy";

export type TransformationPlanStepSource = "migration" | "optimization" | "redesign" | "layout" | "cleanup";

export type TransformationPlanStepKind =
  | "cleanup"
  | "merge"
  | "normalize"
  | "reorder"
  | "add-section"
  | "replace-section"
  | "redesign"
  | "content-improvement";

export type TransformationPlanStepPriority = "high" | "medium" | "low";

export type TransformationPlanStep = {
  id: string;
  title: string;
  description: string;
  actionPrompt: string;
  source: TransformationPlanStepSource;
  safe: boolean;
  requiresApproval: boolean;
  priority: TransformationPlanStepPriority;
  kind: TransformationPlanStepKind;
  notes: string[];
  policyDecision?: ExecutionPolicyDecision;
  policyReason?: ExecutionPolicyReason;
  policyExplanation?: string;
  executableNow?: boolean;
  executionEngine?: string | null;
};

export type TransformationPlanStrategy = "incremental" | "structural" | "full-rebuild";
export type TransformationPlanPriority = "low" | "medium" | "high";

export type TransformationPlan = {
  summary: string;
  intent?: string;
  intentConfidence?: number;
  confidenceScore?: number;
  strategy: TransformationPlanStrategy;
  priority: TransformationPlanPriority;
  steps: TransformationPlanStep[];
  notes: string[];
  policySummary?: {
    autoAllowed: number;
    approvalRequired: number;
    blocked: number;
    deferred: number;
    executableNow: number;
  };
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hashFNV1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // FNV-1a 32-bit prime: 16777619
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function makeStepId(input: { source: TransformationPlanStepSource; kind: TransformationPlanStepKind; actionPrompt: string }): string {
  const key = `${input.source}|${input.kind}|${normalizeKey(input.actionPrompt)}`;
  return `tp_${hashFNV1a32(key)}`;
}

function displayNameForSectionType(type: string): string | undefined {
  const displayByType: Record<string, string> = {
    "pricing.basic": "pricing",
    "faq.basic": "FAQ",
    "cta.simple": "CTA",
    "hero.split": "hero",
    "footer.basic": "footer",
    "navbar.basic": "navbar",
    "feature.grid": "feature grid",
    "logo.cloud": "logo cloud",
    "legacy.html": "legacy block",
  };
  return displayByType[type];
}

function canonicalizeActionPrompt(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");

  const exactMap: Array<[RegExp, string]> = [
    [/^Move hero near the top$/i, "Move hero near top"],
    [/^Move hero near top$/i, "Move hero near top"],
    [/^Move footer to bottom$/i, "Move footer to the bottom"],
    [/^Move footer to the bottom$/i, "Move footer to the bottom"],
    [/^Move navbar to top$/i, "Move navbar to the top"],
    [/^Move navbar to the top$/i, "Move navbar to the top"],
    [/^Move legacy html blocks below structured sections$/i, "Move legacy blocks below structured sections"],
    [/^Move legacy blocks below structured sections$/i, "Move legacy blocks below structured sections"],
  ];

  for (const [pattern, replacement] of exactMap) {
    if (pattern.test(s)) return replacement;
  }

  return s;
}

function stepKindForAction(actionPromptRaw: string): TransformationPlanStepKind {
  const a = actionPromptRaw.trim();
  if (/^Remove duplicate /i.test(a)) return "cleanup";
  if (/^Merge /i.test(a)) return "merge";
  if (/^Move /i.test(a)) return "reorder";
  if (/^Add /i.test(a)) return "add-section";
  if (/^Replace /i.test(a)) return "replace-section";
  if (/^(Reconstruct|Convert|Consolidate|Reduce|Introduce|Improve page structure|Improve product discovery|Redefine|Optimize hierarchy)/i.test(a)) {
    return "redesign";
  }
  if (/^(Improve|Adjust|Refine|Keep|Review)/i.test(a)) return "content-improvement";
  return "content-improvement";
}

function classifyStepSafety(step: Pick<TransformationPlanStep, "kind" | "actionPrompt" | "notes">): boolean {
  const prompt = canonicalizeActionPrompt(step.actionPrompt);
  const key = normalizeKey(prompt);

  if (step.kind === "cleanup" && key.startsWith("remove duplicate ")) return true;

  if (step.kind === "merge") {
    const mergeDeterministic = step.notes.some((n) => n.startsWith("mergeEligible=true")) && !step.notes.some((n) => n.startsWith("similarity=different-content"));
    return mergeDeterministic;
  }

  if (step.kind === "reorder" || step.kind === "normalize") {
    const safeMoveKeys = new Set([
      "move navbar to the top",
      "move footer to the bottom",
      "move hero near top",
      "move legacy blocks below structured sections",
      "move cta below faq",
      "move cta below pricing",
      "move cta near the bottom",
    ]);
    return safeMoveKeys.has(key);
  }

  return false;
}

function makeStep(input: {
  title: string;
  description: string;
  actionPrompt: string;
  source: TransformationPlanStepSource;
  priority: TransformationPlanStepPriority;
  kind: TransformationPlanStepKind;
  notes?: string[];
}): TransformationPlanStep {
  const actionPrompt = canonicalizeActionPrompt(input.actionPrompt);
  const notes = Array.isArray(input.notes) ? uniqStable(input.notes) : [];
  const safe = classifyStepSafety({ kind: input.kind, actionPrompt, notes });
  return {
    id: makeStepId({ source: input.source, kind: input.kind, actionPrompt }),
    title: input.title.trim() || actionPrompt,
    description: input.description.trim() || actionPrompt,
    actionPrompt,
    source: input.source,
    safe,
    requiresApproval: !safe,
    priority: input.priority,
    kind: input.kind,
    notes,
  };
}

function uniqStable(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getFirstSectionByType(sections: Gnr8Section[], type: string): Gnr8Section | null {
  for (const section of sections) if (section?.type === type) return section;
  return null;
}

function normalizeComparableText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().trim().replace(/\s+/g, " ") : "";
}

function hasExcessWhitespace(value: string): boolean {
  // Keep this deterministic and structural: flag obviously malformed whitespace.
  return /\s{3,}/.test(value) || /\n\s*\n\s*\n/.test(value);
}

function isObviouslyIncompleteText(value: string): boolean {
  const t = normalizeComparableText(value);
  return t === "tbd" || t === "todo" || t === "lorem ipsum" || t === "coming soon";
}

function shouldAddImproveHeroClarityStep(page: Gnr8Page): boolean {
  const section = getFirstSectionByType(page.sections ?? [], "hero.split");
  if (!section) return false;
  const props = isRecord(section.props) ? section.props : {};

  const headline = normalizeComparableText(props.headline);
  const subheadline = normalizeComparableText(props.subheadline);

  const weakHeadlines = new Set(["hi", "hello", "welcome", "title", "headline"]);
  const weakHeadline = !headline || headline.length < 4 || weakHeadlines.has(headline);
  const missingSubheadline = !subheadline;

  return weakHeadline || missingSubheadline;
}

function shouldAddImproveCtaClarityStep(page: Gnr8Page): boolean {
  const section = getFirstSectionByType(page.sections ?? [], "cta.simple");
  if (!section) return false;
  const props = isRecord(section.props) ? section.props : {};

  const headline = normalizeComparableText(props.headline);
  const subheadline = normalizeComparableText(props.subheadline);
  const buttonLabel = normalizeComparableText(props.buttonLabel);

  const weakLabels = new Set(["click here", "submit", "learn more", "more", "go"]);
  const weakButtonLabel = !buttonLabel || weakLabels.has(buttonLabel);

  return !headline || !subheadline || weakButtonLabel;
}

function shouldAddNormalizeFaqContentStep(page: Gnr8Page): boolean {
  const section = getFirstSectionByType(page.sections ?? [], "faq.basic");
  if (!section) return false;
  const props = isRecord(section.props) ? section.props : {};
  const items = props.items;

  if (!Array.isArray(items)) return true;

  for (const raw of items) {
    if (!isRecord(raw)) return true;

    const qRaw = typeof raw.question === "string" ? raw.question : "";
    const aRaw = typeof raw.answer === "string" ? raw.answer : "";
    const question = qRaw.trim();
    const answer = aRaw.trim();

    if (!question && !answer) return true;
    if (!question || !answer) return true;

    if (hasExcessWhitespace(qRaw) || hasExcessWhitespace(aRaw)) return true;
    if (isObviouslyIncompleteText(question) || isObviouslyIncompleteText(answer)) return true;
  }

  return false;
}

function shouldAddCompletePricingContentStep(page: Gnr8Page): boolean {
  const section = getFirstSectionByType(page.sections ?? [], "pricing.basic");
  if (!section) return false;
  const props = isRecord(section.props) ? section.props : {};
  const plans = props.plans;

  if (!Array.isArray(plans)) return true;

  for (const raw of plans) {
    if (!isRecord(raw)) return true;
    const description = normalizeComparableText(raw.description);
    const ctaLabel = normalizeComparableText(raw.ctaLabel);
    if (!description || !ctaLabel) return true;
  }

  return false;
}

function shouldAddCompleteFeatureGridContentStep(page: Gnr8Page): boolean {
  const section = getFirstSectionByType(page.sections ?? [], "feature.grid");
  if (!section) return false;
  const props = isRecord(section.props) ? section.props : {};
  const items = props.items;

  if (!Array.isArray(items)) return true;

  for (const raw of items) {
    if (!isRecord(raw)) return true;
    const titleRaw = typeof raw.title === "string" ? raw.title : "";
    const textRaw = typeof raw.text === "string" ? raw.text : "";
    const title = titleRaw.trim();
    const text = textRaw.trim();

    if (!title && !text) return true;
    if (!title || !text) return true;
    if (hasExcessWhitespace(titleRaw) || hasExcessWhitespace(textRaw)) return true;
    if (isObviouslyIncompleteText(title) || isObviouslyIncompleteText(text)) return true;
  }

  return false;
}

function buildSemanticTransformationSteps(input: {
  page: Gnr8Page;
  existingSteps: TransformationPlanStep[];
}): TransformationPlanStep[] {
  const existingActionPromptKeys = new Set(
    input.existingSteps.map((s) => normalizeKey(canonicalizeActionPrompt(s.actionPrompt))),
  );

  const out: TransformationPlanStep[] = [];
  const tryAdd = (step: Omit<Parameters<typeof makeStep>[0], "source" | "priority" | "kind"> & { actionPrompt: string }) => {
    const key = normalizeKey(canonicalizeActionPrompt(step.actionPrompt));
    if (existingActionPromptKeys.has(key)) return;
    existingActionPromptKeys.add(key);
    out.push(
      makeStep({
        title: step.title,
        description: step.description,
        actionPrompt: step.actionPrompt,
        source: "optimization",
        priority: "medium",
        kind: "content-improvement",
        notes: ["semanticTransform=true"],
      }),
    );
  };

  if (shouldAddImproveHeroClarityStep(input.page)) {
    tryAdd({
      title: "Improve hero clarity",
      description: "Improve hero.split headline/subheadline clarity when content is missing or weak.",
      actionPrompt: "Improve hero clarity",
    });
  }

  if (shouldAddImproveCtaClarityStep(input.page)) {
    tryAdd({
      title: "Improve CTA clarity",
      description: "Improve cta.simple headline/subheadline/button label clarity when content is missing or weak.",
      actionPrompt: "Improve CTA clarity",
    });
  }

  if (shouldAddNormalizeFaqContentStep(input.page)) {
    tryAdd({
      title: "Normalize FAQ content",
      description: "Normalize faq.basic items so each FAQ has a non-empty question and answer.",
      actionPrompt: "Normalize FAQ content",
    });
  }

  if (shouldAddCompletePricingContentStep(input.page)) {
    tryAdd({
      title: "Complete pricing content",
      description: "Complete pricing.basic plan descriptions and CTA labels when missing.",
      actionPrompt: "Complete pricing content",
    });
  }

  if (shouldAddCompleteFeatureGridContentStep(input.page)) {
    tryAdd({
      title: "Complete feature grid content",
      description: "Complete feature.grid item titles and text when missing.",
      actionPrompt: "Complete feature grid content",
    });
  }

  return out;
}

function dedupeTransformationSteps(steps: TransformationPlanStep[]): TransformationPlanStep[] {
  const out: TransformationPlanStep[] = [];
  const byKey = new Map<string, TransformationPlanStep>();

  for (const step of steps) {
    const key = `${normalizeKey(canonicalizeActionPrompt(step.actionPrompt))}|${step.kind}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, step);
      out.push(step);
      continue;
    }

    const mergedNotes = uniqStable([...(existing.notes ?? []), ...(step.notes ?? [])]);
    existing.notes = mergedNotes;
  }

  return out;
}

function pruneOverlappingSteps(steps: TransformationPlanStep[]): TransformationPlanStep[] {
  const keys = new Set(steps.map((s) => normalizeKey(canonicalizeActionPrompt(s.actionPrompt))));

  const hasSpecificCtaAdd = [...keys].some((k) => k.startsWith("add cta below") || k === "add cta");
  const hasSpecificPricingAdd = [...keys].some((k) => k.startsWith("add pricing") || k.startsWith("replace legacy section with pricing"));
  const hasConcreteDuplicateWork = [...keys].some((k) => k.startsWith("remove duplicate") || k.startsWith("merge duplicate"));
  const hasConcreteLegacyReplacement = [...keys].some((k) => k.startsWith("replace legacy section with"));

  const drop = new Set<string>();
  if (hasSpecificCtaAdd) drop.add("add clear cta");
  if (hasSpecificPricingAdd) drop.add("introduce pricing section");
  if (hasConcreteDuplicateWork) drop.add("consolidate duplicate sections");
  if (hasConcreteLegacyReplacement) {
    drop.add("convert legacy blocks into structured sections");
    drop.add("reduce legacy html blocks");
  }

  if (drop.size === 0) return steps;
  return steps.filter((s) => !drop.has(normalizeKey(canonicalizeActionPrompt(s.actionPrompt))));
}

function buildCleanupSteps(review: MigrationReviewSummary): TransformationPlanStep[] {
  const steps: TransformationPlanStep[] = [];

  const details = Array.isArray(review.duplicateDetails) ? review.duplicateDetails : [];
  for (const detail of details) {
    if (!detail) continue;

    const name = displayNameForSectionType(detail.type);
    if (!name) continue;

    if (detail.similarity === "exact-duplicate") {
      steps.push(
        makeStep({
          title: `Remove duplicate ${name} section`,
          description: `Remove exact duplicate ${name} sections to reduce redundancy.`,
          actionPrompt: `Remove duplicate ${name} section`,
          source: "cleanup",
          priority: "high",
          kind: "cleanup",
          notes: [
            `duplicateType=${detail.type}`,
            `similarity=${detail.similarity}`,
            `count=${detail.count}`,
            ...(detail.sectionIds?.length ? [`sectionIds=${detail.sectionIds.join(",")}`] : []),
          ],
        }),
      );
      continue;
    }

    const mergeEligible = !!detail.mergeEligible && detail.similarity === "highly-similar";
    if (mergeEligible) {
      steps.push(
        makeStep({
          title: `Merge duplicate ${name} sections`,
          description: `Merge ${name} sections using the deterministic merge strategy.`,
          actionPrompt: `Merge duplicate ${name} sections`,
          source: "cleanup",
          priority: "high",
          kind: "merge",
          notes: [
            `duplicateType=${detail.type}`,
            `similarity=${detail.similarity}`,
            `mergeEligible=true`,
            ...(detail.mergeStrategy ? [`mergeStrategy=${detail.mergeStrategy}`] : []),
            ...(detail.sectionIds?.length ? [`sectionIds=${detail.sectionIds.join(",")}`] : []),
          ],
        }),
      );
      continue;
    }

    if (detail.similarity === "highly-similar" || detail.similarity === "different-content") {
      steps.push(
        makeStep({
          title: `Review duplicate ${name} sections`,
          description: `Review multiple ${name} sections to determine if consolidation is appropriate.`,
          actionPrompt: `Review multiple ${name} sections for consolidation`,
          source: "cleanup",
          priority: "medium",
          kind: "content-improvement",
          notes: [
            `duplicateType=${detail.type}`,
            `similarity=${detail.similarity}`,
            `mergeEligible=${detail.mergeEligible ? "true" : "false"}`,
            ...(detail.sectionIds?.length ? [`sectionIds=${detail.sectionIds.join(",")}`] : []),
          ],
        }),
      );
    }
  }

  return steps;
}

function buildLayoutSteps(review: MigrationReviewSummary): TransformationPlanStep[] {
  const steps: TransformationPlanStep[] = [];
  const layout = review.layoutIssues;
  if (!layout) return steps;

  if (layout.navbarNotFirst) {
    steps.push(
      makeStep({
        title: "Move navbar to the top",
        description: "Normalize layout so the navbar is the first section.",
        actionPrompt: "Move navbar to the top",
        source: "layout",
        priority: "high",
        kind: "reorder",
        notes: ["layoutIssue=navbarNotFirst"],
      }),
    );
  }

  if (layout.heroNotTop) {
    steps.push(
      makeStep({
        title: "Move hero near top",
        description: "Normalize layout so the hero appears near the top of the page.",
        actionPrompt: "Move hero near top",
        source: "layout",
        priority: "high",
        kind: "reorder",
        notes: ["layoutIssue=heroNotTop"],
      }),
    );
  }

  if (layout.footerNotLast) {
    steps.push(
      makeStep({
        title: "Move footer to the bottom",
        description: "Normalize layout so the footer is the last section.",
        actionPrompt: "Move footer to the bottom",
        source: "layout",
        priority: "high",
        kind: "reorder",
        notes: ["layoutIssue=footerNotLast"],
      }),
    );
  }

  if (layout.ctaMisplaced) {
    const hasFaq = (review.countsByType?.["faq.basic"] ?? 0) > 0;
    const hasPricing = (review.countsByType?.["pricing.basic"] ?? 0) > 0;
    const actionPrompt = hasFaq ? "Move CTA below FAQ" : hasPricing ? "Move CTA below pricing" : "Move CTA near the bottom";
    steps.push(
      makeStep({
        title: actionPrompt,
        description: "Normalize layout so the CTA is placed near the bottom of the page.",
        actionPrompt,
        source: "layout",
        priority: "high",
        kind: "reorder",
        notes: ["layoutIssue=ctaMisplaced"],
      }),
    );
  }

  if (layout.legacyMisplaced) {
    steps.push(
      makeStep({
        title: "Move legacy blocks below structured sections",
        description: "Normalize layout so legacy blocks appear after structured sections.",
        actionPrompt: "Move legacy blocks below structured sections",
        source: "layout",
        priority: "high",
        kind: "normalize",
        notes: ["layoutIssue=legacyMisplaced"],
      }),
    );
  }

  return steps;
}

function buildActionStringSteps(input: {
  actions: string[];
  source: TransformationPlanStepSource;
  defaultPriority: TransformationPlanStepPriority;
  review: MigrationReviewSummary;
  filterKinds?: TransformationPlanStepKind[];
}): TransformationPlanStep[] {
  const out: TransformationPlanStep[] = [];
  const allowedKinds = Array.isArray(input.filterKinds) && input.filterKinds.length > 0 ? new Set(input.filterKinds) : null;

  for (const raw of input.actions) {
    const actionPrompt = canonicalizeActionPrompt(raw);
    if (!actionPrompt) continue;

    const kind = stepKindForAction(actionPrompt);
    if (allowedKinds && !allowedKinds.has(kind)) continue;

    // Prefer precise layout/cleanup emitters for these categories.
    if (kind === "cleanup" || kind === "merge" || kind === "reorder" || kind === "normalize") continue;

    const priority: TransformationPlanStepPriority =
      kind === "redesign" ? "high" : kind === "add-section" || kind === "replace-section" ? input.defaultPriority : "low";

    const notes: string[] = [];
    if (kind === "add-section" || kind === "replace-section") notes.push("insertsOrReplacesSection=true");
    if (kind === "redesign") notes.push("structuralChange=true");

    // Use review intent to keep descriptions stable but contextual.
    const intent = input.review.intent ?? "unknown";
    const intentHint = intent !== "unknown" ? ` (${String(intent)})` : "";

    out.push(
      makeStep({
        title: actionPrompt,
        description: `Proposed action${intentHint}: ${actionPrompt}.`,
        actionPrompt,
        source: input.source,
        priority,
        kind,
        notes,
      }),
    );
  }

  return out;
}

function isStructuralOptimizationSuggestion(s: string): boolean {
  const key = normalizeKey(s);
  if (key.startsWith("improve page structure")) return true;
  if (key.startsWith("reduce legacy html blocks")) return true;
  if (key.startsWith("improve product discovery layout")) return true;
  return false;
}

function buildOptimizationSteps(review: MigrationReviewSummary): {
  additions: TransformationPlanStep[];
  redesign: TransformationPlanStep[];
  polish: TransformationPlanStep[];
} {
  const suggestions = Array.isArray(review.optimizationSuggestions) ? review.optimizationSuggestions : [];
  const additions: string[] = [];
  const redesign: string[] = [];
  const polish: string[] = [];

  for (const s of suggestions) {
    const suggestion = canonicalizeActionPrompt(s);
    if (!suggestion) continue;
    const kind = stepKindForAction(suggestion);

    if (kind === "add-section" || kind === "replace-section") additions.push(suggestion);
    else if (kind === "reorder" || kind === "normalize" || kind === "cleanup" || kind === "merge") {
      // Layout/cleanup emitters handle these; keep optimization-only for higher-level guidance.
      continue;
    } else if (isStructuralOptimizationSuggestion(suggestion) || kind === "redesign") redesign.push(suggestion);
    else polish.push(suggestion);
  }

  return {
    additions: buildActionStringSteps({
      actions: additions,
      source: "optimization",
      defaultPriority: "medium",
      review,
      filterKinds: ["add-section", "replace-section"],
    }),
    redesign: buildActionStringSteps({
      actions: redesign,
      source: "optimization",
      defaultPriority: "high",
      review,
      filterKinds: ["redesign"],
    }),
    polish: buildActionStringSteps({
      actions: polish,
      source: "optimization",
      defaultPriority: "low",
      review,
      filterKinds: ["content-improvement"],
    }),
  };
}

function buildRedesignSteps(review: MigrationReviewSummary): TransformationPlanStep[] {
  const plan = review.redesignPlan;
  if (!plan) return [];

  const strategy = plan.strategy ?? "structural";
  const recommended = Array.isArray(plan.recommendedChanges) ? plan.recommendedChanges : [];
  const structural = Array.isArray(plan.structuralChanges) ? plan.structuralChanges : [];

  const includeStructural = strategy === "structural" || strategy === "full-rebuild";
  const actions = includeStructural ? [...recommended, ...structural] : [...recommended];

  return buildActionStringSteps({
    actions,
    source: "redesign",
    defaultPriority: plan.priority === "high" ? "high" : plan.priority === "medium" ? "medium" : "low",
    review,
    filterKinds: ["redesign", "content-improvement", "add-section", "replace-section"],
  });
}

function planPriorityFromReview(input: { review: MigrationReviewSummary; steps: TransformationPlanStep[] }): TransformationPlanPriority {
  const redesignPriority = input.review.redesignPlan?.priority;
  const base: TransformationPlanPriority = redesignPriority ?? "medium";

  const hasHighCleanup = input.steps.some((s) => (s.kind === "cleanup" || s.kind === "merge") && s.priority === "high");
  if (base === "low" && hasHighCleanup) return "medium";

  const nonPolishSteps = input.steps.some((s) => s.priority !== "low" || (s.kind !== "content-improvement" && s.kind !== "redesign"));
  if (!nonPolishSteps && input.steps.length <= 2) return "low";

  return base;
}

function planStrategyFromReview(review: MigrationReviewSummary): TransformationPlanStrategy {
  const fromRedesign = review.redesignPlan?.strategy;
  if (fromRedesign) return fromRedesign;

  const layoutIssueCount = review.layoutIssues ? Object.values(review.layoutIssues).filter(Boolean).length : 0;
  const hasDupes = (review.duplicateDetails ?? []).length > 0;

  const fullRebuild =
    review.confidenceScore < 45 ||
    (review.legacySections > review.structuredSections && review.legacySections >= 2) ||
    layoutIssueCount >= 4 ||
    ((review.intent ?? "unknown") === "unknown" && review.confidenceScore < 70 && review.legacySections > 0);
  if (fullRebuild) return "full-rebuild";

  const incremental = review.confidenceScore >= 85 && review.legacySections === 0 && layoutIssueCount === 0 && !hasDupes;
  if (incremental) return "incremental";

  return "structural";
}

function describeIntent(intent: string | undefined): string {
  switch (intent) {
    case "saas_homepage":
      return "a SaaS homepage";
    case "marketing_landing":
      return "a marketing landing page";
    case "ecommerce_product":
      return "an ecommerce product page";
    case "ecommerce_listing":
      return "an ecommerce listing page";
    case "product_page":
      return "a product page";
    case "blog_article":
      return "a blog article page";
    case "documentation":
      return "a documentation page";
    case "unknown":
    default:
      return "an unclear-intent page";
  }
}

function buildPlanSummary(input: { intent?: string; strategy: TransformationPlanStrategy; priority: TransformationPlanPriority }): string {
  const intentPhrase = describeIntent(input.intent);
  const priorityPrefix = input.priority === "high" ? "High-priority " : input.priority === "medium" ? "Medium-priority " : "";
  const strategyLabel =
    input.strategy === "full-rebuild" ? "full rebuild" : input.strategy === "structural" ? "structural cleanup" : "incremental improvement";
  return `${priorityPrefix}${strategyLabel} plan for ${intentPhrase}.`;
}

export function buildTransformationPlan(input: { page: Gnr8Page; review: MigrationReviewSummary }): TransformationPlan {
  const { page, review } = input;

  const cleanupSteps = buildCleanupSteps(review);
  const layoutSteps = buildLayoutSteps(review);

  const migrationActions = Array.isArray(review.suggestedActions) ? review.suggestedActions : [];
  const migrationAddOrReplaceSteps = buildActionStringSteps({
    actions: migrationActions,
    source: "migration",
    defaultPriority: "medium",
    review,
    filterKinds: ["add-section", "replace-section", "redesign", "content-improvement"],
  });

  const optimization = buildOptimizationSteps(review);
  const redesignSteps = buildRedesignSteps(review);

  const orderedWithoutSemantic = [
    ...cleanupSteps,
    ...layoutSteps,
    ...migrationAddOrReplaceSteps,
    ...optimization.additions,
    ...redesignSteps,
    ...optimization.redesign,
    ...optimization.polish,
  ];

  const semanticSteps = buildSemanticTransformationSteps({ page, existingSteps: orderedWithoutSemantic });

  // Ordering rule: structure first, semantic improvements second, vague redesign/polish last.
  const structuralKinds = new Set<TransformationPlanStepKind>(["cleanup", "merge", "normalize", "reorder", "add-section", "replace-section"]);
  const structuralSteps: TransformationPlanStep[] = [];
  const nonStructuralSteps: TransformationPlanStep[] = [];
  for (const step of orderedWithoutSemantic) {
    if (structuralKinds.has(step.kind)) structuralSteps.push(step);
    else nonStructuralSteps.push(step);
  }

  const ordered = [...structuralSteps, ...semanticSteps, ...nonStructuralSteps];
  const steps = pruneOverlappingSteps(dedupeTransformationSteps(ordered));
  const policyAwareSteps: TransformationPlanStep[] = steps.map((step) => {
    const executionCapability = getExecutionCapabilityForPlanStep(step);
    const policy = evaluateExecutionPolicy(step, { review, executionCapability });
    return {
      ...step,
      policyDecision: policy.decision,
      policyReason: policy.reason,
      policyExplanation: policy.explanation,
      executableNow: executionCapability?.supported === true,
      executionEngine: executionCapability ? executionCapability.engine : null,
    };
  });

  const strategy = planStrategyFromReview(review);
  const priority = planPriorityFromReview({ review, steps });
  const summary = buildPlanSummary({ intent: review.intent, strategy, priority });

  const notes: string[] = ["Planner output only; no changes are applied.", "All non-safe steps require human approval."];
  if (review.confidenceLabel === "low") notes.push("Low migration confidence: consider full rebuild or staged structural cleanup.");
  if ((review.legacySections ?? 0) > 0) notes.push("Legacy HTML blocks detected: replacements likely require approval.");

  const policySummary = (() => {
    let autoAllowed = 0;
    let approvalRequired = 0;
    let blocked = 0;
    let deferred = 0;
    let executableNow = 0;

    for (const step of policyAwareSteps) {
      if (step.executableNow === true) executableNow += 1;
      if (step.policyDecision === "auto-allowed") autoAllowed += 1;
      if (step.policyDecision === "approval-required") approvalRequired += 1;
      if (step.policyDecision === "blocked") blocked += 1;
      if (step.policyDecision === "deferred") deferred += 1;
    }

    return { autoAllowed, approvalRequired, blocked, deferred, executableNow };
  })();

  return {
    summary,
    intent: review.intent,
    intentConfidence: review.intentConfidence,
    confidenceScore: review.confidenceScore,
    strategy,
    priority,
    steps: policyAwareSteps,
    notes: uniqStable(notes),
    policySummary,
  };
}
