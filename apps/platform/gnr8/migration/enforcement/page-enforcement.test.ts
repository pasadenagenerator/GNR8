import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluatePageRolloutEnforcement } from "@/gnr8/migration/enforcement/page-enforcement";

function evaluatePage(input: Parameters<typeof evaluatePageMigrationGate>[0]) {
  const pageMigrationGate = evaluatePageMigrationGate(input);
  const pageRolloutPolicy = evaluatePageRolloutPolicy(pageMigrationGate);
  return {
    pageMigrationGate,
    pageRolloutPolicy,
  };
}

test("broken page denied for all stages", () => {
  const page = evaluatePage({
    pageStructuralConfidence: 0.1,
    weakSectionIds: ["hero"],
    structuralAnomalies: ["missing_structural_metadata"],
    sectionIntents: ["hero"],
    sectionIntentConfidence: { hero: 0.1 },
  });

  assert.equal(evaluatePageRolloutEnforcement(page, "SHADOW").decision, "DENY");
  assert.equal(evaluatePageRolloutEnforcement(page, "CANARY").decision, "DENY");
  assert.equal(evaluatePageRolloutEnforcement(page, "PRODUCTION").decision, "DENY");
});

test("low-confidence page review-only shadow, review-only canary, denied production", () => {
  const page = evaluatePage({
    pageStructuralConfidence: 0.49,
    weakSectionIds: ["hero"],
    structuralAnomalies: ["hero_confidence_below_0_4"],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.64, hero: 0.42, body: 0.58, footer_legal: 0.61 },
  });

  assert.equal(evaluatePageRolloutEnforcement(page, "SHADOW").decision, "REVIEW_ONLY");
  assert.equal(evaluatePageRolloutEnforcement(page, "CANARY").decision, "REVIEW_ONLY");
  assert.equal(evaluatePageRolloutEnforcement(page, "PRODUCTION").decision, "DENY");
});

test("shadow-ready page allowed for shadow", () => {
  const page = evaluatePage({
    pageStructuralConfidence: 0.68,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.67, hero: 0.69, body: 0.66, footer_legal: 0.67 },
  });

  assert.equal(evaluatePageRolloutEnforcement(page, "SHADOW").decision, "ALLOW");
});

test("canary-allowed page allowed for canary", () => {
  const page = evaluatePage({
    pageStructuralConfidence: 0.85,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.82, hero: 0.88, body: 0.83, gallery_media: 0.8, form_contact: 0.79, footer_legal: 0.84 },
  });

  assert.equal(evaluatePageRolloutEnforcement(page, "CANARY").decision, "ALLOW");
});

test("production-disallowed page denied for production", () => {
  const page = evaluatePage({
    pageStructuralConfidence: 0.71,
    weakSectionIds: [],
    structuralAnomalies: ["footer_missing"],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.7, hero: 0.73, body: 0.71, footer_legal: 0.7 },
  });

  assert.equal(page.pageRolloutPolicy.state, "PRODUCTION_DISALLOWED");
  assert.equal(evaluatePageRolloutEnforcement(page, "PRODUCTION").decision, "DENY");
});
