import assert from "node:assert/strict";
import test from "node:test";

import { computePageStructuralConfidence } from "@/gnr8/migration/layout-graph/page-confidence";
import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";
import type { Gnr8Section } from "@/gnr8/types/section";

function section(input: {
  id: string;
  intent: "header_nav" | "hero" | "body" | "footer_legal";
  confidence: number;
  order: number;
}): Gnr8Section {
  return {
    id: input.id,
    type: "test.section",
    props: {
      layoutStructural: {
        intent: input.intent,
        structuralConfidence: input.confidence,
        domIndexStart: input.order,
        domIndexEnd: input.order,
        layoutHintType: input.intent,
        anomalies: [],
      },
    },
  };
}

test("acceptable sections are not mislabeled as weak production blockers", () => {
  const page = computePageStructuralConfidence([
    section({ id: "nav", intent: "header_nav", confidence: 0.95, order: 0 }),
    section({ id: "hero", intent: "hero", confidence: 0.95, order: 1 }),
    section({ id: "body", intent: "body", confidence: 0.95, order: 2 }),
    section({ id: "footer", intent: "footer_legal", confidence: 0.95, order: 3 }),
  ]);

  assert.deepEqual(page.weakestSections, []);
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: page.score,
    weakSectionIds: page.weakestSections,
    structuralAnomalies: page.anomalySummary,
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.95, hero: 0.95, body: 0.95, footer_legal: 0.95 },
  });
  assert.equal(gate.state, "PRODUCTION_CANDIDATE");
});

test("a genuinely deficient section remains a weak production blocker", () => {
  const page = computePageStructuralConfidence([
    section({ id: "nav", intent: "header_nav", confidence: 0.95, order: 0 }),
    section({ id: "hero", intent: "hero", confidence: 0.95, order: 1 }),
    section({ id: "body-deficient", intent: "body", confidence: 0.4, order: 2 }),
    section({ id: "footer", intent: "footer_legal", confidence: 0.95, order: 3 }),
  ]);

  assert.deepEqual(page.weakestSections, ["body-deficient"]);
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.91,
    weakSectionIds: page.weakestSections,
    structuralAnomalies: page.anomalySummary,
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.95, hero: 0.95, body: 0.4, footer_legal: 0.95 },
  });
  assert.equal(gate.state, "CANARY_CANDIDATE");
  assert.notEqual(gate.state, "PRODUCTION_CANDIDATE");
});
