import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePageMigrationGate } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluateSiteMigrationGate } from "@/gnr8/migration/quality-gates/site-quality-gate";
import { toSiteRolloutPolicyPageResult, evaluateSiteRolloutPolicy } from "@/gnr8/migration/policy/site-rollout-policy";
import { evaluateSiteRolloutEnforcement } from "@/gnr8/migration/enforcement/site-enforcement";

function buildSite(input: Array<{ pageId: string; sourcePath: string; isRoot?: boolean; gateInput: Parameters<typeof evaluatePageMigrationGate>[0] }>) {
  const pageGates = input.map((page) => {
    const gate = evaluatePageMigrationGate(page.gateInput);
    return { ...page, gate };
  });

  const siteMigrationGate = evaluateSiteMigrationGate({
    pageResults: pageGates.map((page) => ({
      pageId: page.pageId,
      sourcePath: page.sourcePath,
      isRoot: page.isRoot,
      gate: page.gate,
    })),
  });

  const siteRolloutPolicy = evaluateSiteRolloutPolicy({
    siteGateResult: siteMigrationGate,
    pagePolicyResults: pageGates.map((page) =>
      toSiteRolloutPolicyPageResult({
        pageId: page.pageId,
        sourcePath: page.sourcePath,
        isRoot: page.isRoot,
        score: page.gate.score,
        pageGateResult: page.gate,
      }),
    ),
  });

  return { siteMigrationGate, siteRolloutPolicy };
}

test("mixed site with weak root denied/reviewed for canary and denied for production", () => {
  const site = buildSite([
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
    {
      pageId: "pricing",
      sourcePath: "/pricing",
      gateInput: {
        pageStructuralConfidence: 0.87,
        weakSectionIds: [],
        structuralAnomalies: [],
        sectionIntents: ["header_nav", "hero", "body", "footer_legal"],
        sectionIntentConfidence: { header_nav: 0.84, hero: 0.88, body: 0.83, footer_legal: 0.85 },
      },
    },
  ]);

  const canary = evaluateSiteRolloutEnforcement(site, "CANARY");
  const production = evaluateSiteRolloutEnforcement(site, "PRODUCTION");

  assert.ok(canary.decision === "REVIEW_ONLY" || canary.decision === "DENY");
  assert.equal(production.decision, "DENY");
});

test("strong site allowed for canary and production when policy+gate allow production", () => {
  const site = buildSite([
    {
      pageId: "root",
      sourcePath: "/",
      isRoot: true,
      gateInput: {
        pageStructuralConfidence: 0.95,
        weakSectionIds: [],
        structuralAnomalies: [],
        sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
        sectionIntentConfidence: { header_nav: 0.93, hero: 0.95, body: 0.92, gallery_media: 0.9, form_contact: 0.9, footer_legal: 0.92 },
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
        sectionIntentConfidence: { header_nav: 0.9, hero: 0.93, body: 0.91, gallery_media: 0.9, form_contact: 0.89, footer_legal: 0.9 },
      },
    },
    {
      pageId: "contact",
      sourcePath: "/contact",
      gateInput: {
        pageStructuralConfidence: 0.88,
        weakSectionIds: [],
        structuralAnomalies: [],
        sectionIntents: ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"],
        sectionIntentConfidence: { header_nav: 0.86, hero: 0.9, body: 0.87, gallery_media: 0.86, form_contact: 0.85, footer_legal: 0.88 },
      },
    },
  ]);

  assert.equal(evaluateSiteRolloutEnforcement(site, "CANARY").decision, "ALLOW");
  assert.equal(evaluateSiteRolloutEnforcement(site, "PRODUCTION").decision, "ALLOW");
});
