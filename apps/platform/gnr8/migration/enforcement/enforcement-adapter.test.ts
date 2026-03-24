import assert from "node:assert/strict";
import test from "node:test";

import { buildEnforcementAdapterDecision } from "@/gnr8/migration/enforcement/enforcement-adapter";
import { evaluatePageRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import { evaluateSiteRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/site-enforcement";
import { evaluateSiteRolloutPolicy, toSiteRolloutPolicyPageResult } from "@/gnr8/migration/policy/site-rollout-policy";
import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluateSiteMigrationGate } from "@/gnr8/migration/quality-gates/site-quality-gate";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";

function buildAdapter(input: {
  stage: "shadow" | "canary" | "production";
  pages: Array<{
    pageId: string;
    sourcePath: string;
    isRoot?: boolean;
    gateInput: Parameters<typeof evaluatePageMigrationGate>[0];
  }>;
}) {
  const pageRecords = input.pages.map((page) => {
    const gate = evaluatePageMigrationGate(page.gateInput);
    const policy = evaluatePageRolloutPolicy(gate);
    return {
      ...page,
      gate,
      pageEnforcement: evaluatePageRolloutEnforcementByStage({
        pageMigrationGate: gate,
        pageRolloutPolicy: policy,
      }),
    };
  });

  const siteMigrationGate = evaluateSiteMigrationGate({
    pageResults: pageRecords.map((page) => ({
      pageId: page.pageId,
      sourcePath: page.sourcePath,
      isRoot: page.isRoot,
      gate: page.gate,
    })),
  });
  const siteRolloutPolicy = evaluateSiteRolloutPolicy({
    siteGateResult: siteMigrationGate,
    pagePolicyResults: pageRecords.map((page) =>
      toSiteRolloutPolicyPageResult({
        pageId: page.pageId,
        sourcePath: page.sourcePath,
        isRoot: page.isRoot,
        score: page.gate.score,
        pageGateResult: page.gate,
      }),
    ),
  });
  const siteEnforcement = evaluateSiteRolloutEnforcementByStage({
    siteMigrationGate,
    siteRolloutPolicy,
  });

  return buildEnforcementAdapterDecision({
    stage: input.stage,
    pageEnforcement: pageRecords.map((page) => ({
      pageId: page.pageId,
      enforcement: page.pageEnforcement,
    })),
    siteEnforcement,
  });
}

test("broken page -> publish DENY", () => {
  const decision = buildAdapter({
    stage: "shadow",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.2,
          weakSectionIds: ["hero"],
          structuralAnomalies: ["missing_structural_metadata"],
          sectionIntents: ["hero"],
          sectionIntentConfidence: { hero: 0.2 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "DENY");
});

test("review page -> shadow REVIEW_ONLY", () => {
  const decision = buildAdapter({
    stage: "shadow",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.49,
          weakSectionIds: ["hero"],
          structuralAnomalies: ["hero_confidence_below_0_4"],
          sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.64, hero: 0.41, body: 0.57, footer_legal: 0.61 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "REVIEW_ONLY");
});

test("canary-eligible page -> ALLOW canary", () => {
  const decision = buildAdapter({
    stage: "canary",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.86,
          weakSectionIds: [],
          structuralAnomalies: [],
          sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.84, hero: 0.88, body: 0.83, gallery_media: 0.8, form_contact: 0.81, footer_legal: 0.85 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "ALLOW");
});

test("production-eligible site -> ALLOW production", () => {
  const decision = buildAdapter({
    stage: "production",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.95,
          weakSectionIds: [],
          structuralAnomalies: [],
          sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.94, hero: 0.95, body: 0.93, gallery_media: 0.92, form_contact: 0.9, footer_legal: 0.93 },
        },
      },
      {
        pageId: "about",
        sourcePath: "/about",
        gateInput: {
          pageStructuralConfidence: 0.92,
          weakSectionIds: [],
          structuralAnomalies: [],
          sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.91, hero: 0.93, body: 0.91, gallery_media: 0.9, form_contact: 0.9, footer_legal: 0.9 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "ALLOW");
});

test("mixed site -> site-level DENY", () => {
  const decision = buildAdapter({
    stage: "canary",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.1,
          weakSectionIds: ["hero"],
          structuralAnomalies: ["missing_structural_metadata"],
          sectionIntents: ["hero"],
          sectionIntentConfidence: { hero: 0.1 },
        },
      },
      {
        pageId: "pricing",
        sourcePath: "/pricing",
        gateInput: {
          pageStructuralConfidence: 0.87,
          weakSectionIds: [],
          structuralAnomalies: [],
          sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.85, hero: 0.88, body: 0.84, footer_legal: 0.86 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "DENY");
});

test("shadow-only site -> production DENY", () => {
  const decision = buildAdapter({
    stage: "production",
    pages: [
      {
        pageId: "root",
        sourcePath: "/",
        isRoot: true,
        gateInput: {
          pageStructuralConfidence: 0.7,
          weakSectionIds: [],
          structuralAnomalies: ["footer_missing"],
          sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
          sectionIntentConfidence: { header_nav: 0.7, hero: 0.72, body: 0.7, footer_legal: 0.69 },
        },
      },
    ],
  });

  assert.equal(decision.decision, "DENY");
});
