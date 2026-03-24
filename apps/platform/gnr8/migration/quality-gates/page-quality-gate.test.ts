import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";

test("broken page", () => {
  const result = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.1,
    weakSectionIds: ["s1"],
    structuralAnomalies: ["missing_structural_metadata"],
    sectionIntents: ["hero"],
    sectionIntentConfidence: { hero: 0.1 },
  });

  assert.equal(result.state, "BROKEN");
  assert.equal(result.recommendedAction, "AI_REMEDIATION_RECOMMENDED");
});

test("weak page", () => {
  const result = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.46,
    weakSectionIds: ["hero-1"],
    structuralAnomalies: ["hero_confidence_below_0_4"],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.7, hero: 0.41, body: 0.5, footer_legal: 0.62 },
  });

  assert.equal(result.state, "LOW_CONFIDENCE");
  assert.equal(result.recommendedAction, "REVIEW_REQUIRED");
});

test("shadow-ready page", () => {
  const result = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.66,
    weakSectionIds: ["body-2"],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.7, hero: 0.68, body: 0.64, gallery_media: 0.61, form_contact: 0.62, footer_legal: 0.66 },
  });

  assert.equal(result.state, "SHADOW_READY");
  assert.equal(result.recommendedAction, "SHADOW_ONLY");
});

test("canary-candidate page", () => {
  const result = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.84,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.8, hero: 0.85, body: 0.81, gallery_media: 0.79, form_contact: 0.77, footer_legal: 0.83 },
  });

  assert.equal(result.state, "CANARY_CANDIDATE");
  assert.equal(result.recommendedAction, "CANARY_ELIGIBLE");
});
