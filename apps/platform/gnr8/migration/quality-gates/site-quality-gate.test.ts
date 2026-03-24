import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluateSiteMigrationGate } from "@/gnr8/migration/quality-gates/site-quality-gate";

test("site aggregate with mixed pages", () => {
  const canary = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.83,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.8, hero: 0.82, body: 0.79, footer_legal: 0.81 },
  });

  const shadow = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.6,
    weakSectionIds: ["s2"],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.7, hero: 0.64, body: 0.61, footer_legal: 0.66 },
  });

  const result = evaluateSiteMigrationGate({
    pageResults: [
      { pageId: "root", sourcePath: "/", isRoot: true, gate: canary },
      { pageId: "about", sourcePath: "/about", gate: shadow },
    ],
  });

  assert.equal(result.state, "SITE_SHADOW_READY");
  assert.ok(result.summaryReasons.includes("site_requires_shadow_stage"));
});

test("root page weak => site not canary-ready", () => {
  const weakRoot = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.5,
    weakSectionIds: ["hero"],
    structuralAnomalies: ["hero_confidence_below_0_4"],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.63, hero: 0.4, body: 0.58, footer_legal: 0.6 },
  });

  const strongChild = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.88,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.84, hero: 0.87, body: 0.82, footer_legal: 0.85 },
  });

  const result = evaluateSiteMigrationGate({
    pageResults: [
      { pageId: "root", sourcePath: "/", isRoot: true, gate: weakRoot },
      { pageId: "pricing", sourcePath: "/pricing", gate: strongChild },
    ],
  });

  assert.notEqual(result.state, "SITE_CANARY_READY");
  assert.equal(result.state, "SITE_SHADOW_READY");
  assert.ok(result.summaryReasons.includes("root_page_not_canary_candidate"));
});
