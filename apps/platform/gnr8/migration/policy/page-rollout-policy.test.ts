import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";

test("broken page -> BLOCKED", () => {
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.11,
    weakSectionIds: ["hero"],
    structuralAnomalies: ["missing_structural_metadata"],
    sectionIntents: ["hero"],
    sectionIntentConfidence: { hero: 0.12 },
  });

  const policy = evaluatePageRolloutPolicy(gate);
  assert.equal(policy.state, "BLOCKED");
  assert.equal(policy.recommendedNextStep, "AI_REMEDIATION_FIRST");
  assert.equal(policy.allowsShadow, false);
});

test("low-confidence page -> REVIEW_REQUIRED", () => {
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.49,
    weakSectionIds: ["body-1"],
    structuralAnomalies: ["hero_confidence_below_0_4"],
    sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.62, hero: 0.43, body: 0.57, footer_legal: 0.6 },
  });

  const policy = evaluatePageRolloutPolicy(gate);
  assert.equal(policy.state, "REVIEW_REQUIRED");
  assert.equal(policy.requiresOperatorReview, true);
  assert.equal(policy.allowsCanary, false);
});

test("shadow-ready page -> SHADOW_ALLOWED or SHADOW_RECOMMENDED", () => {
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.7,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "gallery_media", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.69, hero: 0.72, body: 0.7, gallery_media: 0.68, footer_legal: 0.69 },
  });

  const policy = evaluatePageRolloutPolicy(gate);
  assert.ok(policy.state === "SHADOW_ALLOWED" || policy.state === "SHADOW_RECOMMENDED");
  assert.equal(policy.allowsShadow, true);
  assert.ok(policy.recommendedNextStep === "SHADOW_ONLY" || policy.recommendedNextStep === "SHADOW_VALIDATE");
});

test("canary-candidate page -> CANARY_ALLOWED", () => {
  const gate = evaluatePageMigrationGate({
    pageStructuralConfidence: 0.86,
    weakSectionIds: [],
    structuralAnomalies: [],
    sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
    sectionIntentConfidence: { header_nav: 0.84, hero: 0.88, body: 0.85, gallery_media: 0.82, form_contact: 0.81, footer_legal: 0.86 },
  });

  const policy = evaluatePageRolloutPolicy(gate);
  assert.equal(policy.state, "CANARY_ALLOWED");
  assert.equal(policy.allowsCanary, true);
  assert.equal(policy.recommendedNextStep, "CANARY_REVIEW");
});
