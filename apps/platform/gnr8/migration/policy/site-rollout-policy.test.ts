import assert from "node:assert/strict";
import test from "node:test";

import { toSiteRolloutPolicyPageResult, evaluateSiteRolloutPolicy } from "@/gnr8/migration/policy/site-rollout-policy";
import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";

function buildPolicyPage(input: {
  pageId: string;
  sourcePath: string;
  isRoot?: boolean;
  gateInput: Parameters<typeof evaluatePageMigrationGate>[0];
}) {
  const gate = evaluatePageMigrationGate(input.gateInput);
  return toSiteRolloutPolicyPageResult({
    pageId: input.pageId,
    sourcePath: input.sourcePath,
    isRoot: input.isRoot,
    score: gate.score,
    pageGateResult: gate,
  });
}

test("mixed site with weak root -> no canary", () => {
  const root = buildPolicyPage({
    pageId: "root",
    sourcePath: "/",
    isRoot: true,
    gateInput: {
      pageStructuralConfidence: 0.52,
      weakSectionIds: ["hero"],
      structuralAnomalies: ["hero_confidence_below_0_4"],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.64, hero: 0.41, body: 0.59, footer_legal: 0.62 },
    },
  });

  const child = buildPolicyPage({
    pageId: "pricing",
    sourcePath: "/pricing",
    gateInput: {
      pageStructuralConfidence: 0.87,
      weakSectionIds: [],
      structuralAnomalies: [],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.85, hero: 0.88, body: 0.84, footer_legal: 0.86 },
    },
  });

  const sitePolicy = evaluateSiteRolloutPolicy({
    pagePolicyResults: [root, child],
  });

  assert.notEqual(sitePolicy.state, "SITE_CANARY_ALLOWED");
  assert.equal(sitePolicy.state, "SITE_REVIEW_REQUIRED");
  assert.equal(sitePolicy.allowsCanary, false);
});

test("site with broken page -> SITE_BLOCKED", () => {
  const root = buildPolicyPage({
    pageId: "root",
    sourcePath: "/",
    isRoot: true,
    gateInput: {
      pageStructuralConfidence: 0.84,
      weakSectionIds: [],
      structuralAnomalies: [],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.82, hero: 0.86, body: 0.81, footer_legal: 0.83 },
    },
  });

  const broken = buildPolicyPage({
    pageId: "broken-contact",
    sourcePath: "/contact",
    gateInput: {
      pageStructuralConfidence: 0.13,
      weakSectionIds: ["contact-form"],
      structuralAnomalies: ["missing_structural_metadata"],
      sectionIntents: ["body"],
      sectionIntentConfidence: { body: 0.2 },
    },
  });

  const sitePolicy = evaluateSiteRolloutPolicy({
    pagePolicyResults: [root, broken],
  });

  assert.equal(sitePolicy.state, "SITE_BLOCKED");
  assert.equal(sitePolicy.recommendedNextStep, "AI_REMEDIATION_FIRST");
  assert.ok(sitePolicy.blockingPages.includes("broken-contact"));
});

test("good shadow pages but not enough canary quality -> SITE_SHADOW_ALLOWED", () => {
  const root = buildPolicyPage({
    pageId: "root",
    sourcePath: "/",
    isRoot: true,
    gateInput: {
      pageStructuralConfidence: 0.67,
      weakSectionIds: [],
      structuralAnomalies: [],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.66, hero: 0.68, body: 0.65, footer_legal: 0.67 },
    },
  });

  const about = buildPolicyPage({
    pageId: "about",
    sourcePath: "/about",
    gateInput: {
      pageStructuralConfidence: 0.7,
      weakSectionIds: [],
      structuralAnomalies: [],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.71, hero: 0.7, body: 0.69, footer_legal: 0.7 },
    },
  });

  const contact = buildPolicyPage({
    pageId: "contact",
    sourcePath: "/contact",
    gateInput: {
      pageStructuralConfidence: 0.65,
      weakSectionIds: [],
      structuralAnomalies: [],
      sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
      sectionIntentConfidence: { header_nav: 0.66, hero: 0.65, body: 0.64, footer_legal: 0.65 },
    },
  });

  const sitePolicy = evaluateSiteRolloutPolicy({
    pagePolicyResults: [root, about, contact],
  });

  assert.equal(sitePolicy.state, "SITE_SHADOW_ALLOWED");
  assert.equal(sitePolicy.allowsShadow, true);
  assert.equal(sitePolicy.allowsCanary, false);
});
