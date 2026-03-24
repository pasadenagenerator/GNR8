import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section, Gnr8SectionProps } from "@/gnr8/types/section";
import { randomUUID } from "crypto";

import { detectSectionFromHtmlBlock, tidyTitleFromHtml } from "@/gnr8/importer/html-section-detector";
import { buildLayoutGraphFromSnapshotHtml } from "@/gnr8/migration/layout-graph/layout-graph-builder";
import { computePageStructuralConfidence } from "@/gnr8/migration/layout-graph/page-confidence";
import { evaluatePageMigrationGate, type PageGateIntent } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import { evaluatePageRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import {
  buildLayoutToCanonicalBridge,
  type CanonicalLayoutBlockPlan,
  type CanonicalLayoutIntent,
} from "@/gnr8/migration/layout-graph/layout-to-canonical";

export type HtmlImportInput = {
  slug: string;
  title?: string;
  html: string;
};

function withLayoutStructuralMetadata(input: {
  section: Gnr8Section;
  plan: CanonicalLayoutBlockPlan;
}): Gnr8Section {
  const baseProps: Gnr8SectionProps = { ...(input.section.props ?? {}) };

  baseProps.layoutStructural = {
    intent: input.plan.group.intent,
    structuralConfidence: input.plan.structuralConfidence,
    confidenceComponents: input.plan.confidenceComponents,
    anomalies: input.plan.anomalies,
    groupId: input.plan.group.id,
    groupOrder: input.plan.group.order,
    domIndexStart: input.plan.group.domIndexStart,
    domIndexEnd: input.plan.group.domIndexEnd,
    sourceNodeTypes: input.plan.group.sourceNodeTypes,
    layoutHintType: input.plan.layoutHint?.type ?? "unknown",
    layoutHintDepth: input.plan.layoutHint?.depth ?? null,
  };

  return {
    ...input.section,
    props: baseProps,
  };
}

function fallbackIntentFromBridge(bridgeBlockCount: number, groups: Array<{ intent: CanonicalLayoutIntent }>): CanonicalLayoutIntent | null {
  if (bridgeBlockCount > 0) return null;
  return groups[0]?.intent ?? null;
}

function toPageGateIntent(value: unknown): PageGateIntent | null {
  if (
    value === "header_nav" ||
    value === "hero" ||
    value === "body" ||
    value === "gallery_media" ||
    value === "form_contact" ||
    value === "footer_legal" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

function deriveSectionIntentSignals(sections: Gnr8Section[]): {
  sectionIntents: string[];
  sectionIntentConfidence: Partial<Record<PageGateIntent, number>>;
} {
  const sectionIntents: string[] = [];
  const confidenceBuckets = new Map<PageGateIntent, number[]>();

  for (const section of sections) {
    const raw = section.props?.layoutStructural;
    if (!raw || typeof raw !== "object") continue;
    const node = raw as Record<string, unknown>;
    const intent = toPageGateIntent(node.intent);
    if (!intent) continue;
    sectionIntents.push(intent);
    const confidence = typeof node.structuralConfidence === "number" ? node.structuralConfidence : null;
    if (confidence === null || Number.isFinite(confidence) === false) continue;
    const arr = confidenceBuckets.get(intent) ?? [];
    arr.push(Math.min(1, Math.max(0, confidence)));
    confidenceBuckets.set(intent, arr);
  }

  const sectionIntentConfidence: Partial<Record<PageGateIntent, number>> = {};
  for (const [intent, values] of confidenceBuckets) {
    const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
    sectionIntentConfidence[intent] = Number(avg.toFixed(3));
  }

  return { sectionIntents, sectionIntentConfidence };
}

export function importHtmlToPage(input: HtmlImportInput): Gnr8Page {
  const slug = String(input.slug ?? "").trim();
  const html = String(input.html ?? "");
  const title = (input.title ?? "").trim() || tidyTitleFromHtml(html);

  const layoutGraph = buildLayoutGraphFromSnapshotHtml({
    html,
    pathSeed: slug || "snapshot:index.html",
  });

  const bridge = buildLayoutToCanonicalBridge({
    html,
    layoutGraph,
  });

  const sections: Gnr8Section[] =
    bridge.blocks.length > 0
      ? bridge.blocks.map((plan) => {
          const section = detectSectionFromHtmlBlock(plan.blockHtml, {
            layoutHint: plan.layoutHint,
            canonicalIntent: plan.group.intent,
          });

          return withLayoutStructuralMetadata({ section, plan });
        })
      : [
          detectSectionFromHtmlBlock(html, {
            canonicalIntent: fallbackIntentFromBridge(bridge.blocks.length, bridge.groups),
          }),
        ];

  const pageStructural = computePageStructuralConfidence(sections);
  const intentSignals = deriveSectionIntentSignals(sections);
  const pageMigrationGate = evaluatePageMigrationGate({
    pageStructuralConfidence: pageStructural.score,
    weakSectionIds: pageStructural.weakestSections,
    structuralAnomalies: pageStructural.anomalySummary,
    sectionIntents: intentSignals.sectionIntents,
    sectionIntentConfidence: intentSignals.sectionIntentConfidence,
  });
  const pageRolloutPolicy = evaluatePageRolloutPolicy(pageMigrationGate);
  const pageEnforcement = evaluatePageRolloutEnforcementByStage({
    pageMigrationGate,
    pageRolloutPolicy,
    pageStructuralConfidence: pageStructural.score,
    weakSectionIds: pageStructural.weakestSections,
    structuralAnomalies: pageStructural.anomalySummary,
  });

  return {
    id: randomUUID(),
    slug,
    ...(title ? { title } : {}),
    sections,
    migrationDiagnostics: {
      pageStructuralConfidence: pageStructural.score,
      weakSectionIds: pageStructural.weakestSections,
      structuralAnomalies: pageStructural.anomalySummary,
      pageMigrationGate,
      pageRolloutPolicy,
      pageEnforcement,
    },
  };
}
