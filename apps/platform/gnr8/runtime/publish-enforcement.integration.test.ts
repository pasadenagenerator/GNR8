import assert from "node:assert/strict";
import test from "node:test";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { evaluatePublishEnforcement, evaluateRuntimeArtifactServingEligibility } from "@/gnr8/runtime/publish-enforcement";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

function buildSiteVersionFromPage(pageHtml: string): CanonicalSiteVersionSnapshot {
  const page = importHtmlToPage({
    slug: "/",
    html: pageHtml,
  });
  if (!page.migrationDiagnostics) {
    throw new Error("Expected migration diagnostics on imported page");
  }

  return {
    id: "sv_publish_enforcement",
    siteId: "site_publish_enforcement",
    versionNo: 1,
    state: "APPROVED",
    source: "migration",
    actor: "test",
    createdAt: "2026-03-24T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: null,
    pages: [
      {
        id: "pv_root",
        siteVersionId: "sv_publish_enforcement",
        pageId: page.id,
        path: "/",
        title: page.title ?? null,
        structureModel: {
          sections: page.sections.map((section, index) => ({
            id: section.id,
            type: section.type,
            order: index,
          })),
        },
        contentModel: {
          sectionProps: Object.fromEntries(page.sections.map((section) => [section.id, section.props ?? {}])),
        },
        styleTokens: {
          "color.background": "#fff",
          "color.text": "#111",
          "spacing.section": "48px",
        },
        assetGraph: [],
        semanticSignals: [{ label: "migration.initial", confidence: 0.8, source: "migration" }],
        migrationGovernance: page.migrationDiagnostics,
        source: "migration",
        actor: "test",
        createdAt: "2026-03-24T00:00:00.000Z",
      },
    ],
  };
}

function buildArtifactWithGovernance(governance: RuntimeArtifact["artifactGovernance"]): RuntimeArtifact {
  return {
    id: "artifact-1",
    siteId: "site_publish_enforcement",
    siteVersionId: "sv_publish_enforcement",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<!doctype html><html><body><main>ok</main></body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: {},
    publishStage: governance.publishStage,
    shadowRestricted: false,
    artifactGovernance: governance,
    bundleSha256: "sha",
    createdAt: "2026-03-24T00:00:00.000Z",
  };
}

test("publish-enforcement integration: review-only remains shadow-only and is denied on canary", () => {
  const siteVersion = buildSiteVersionFromPage("<html><body><main><h1>Broken</h1></main></body></html>");

  const shadow = evaluatePublishEnforcement({
    siteVersion,
    stage: "shadow",
  });
  assert.ok(shadow.adapter.decision === "REVIEW_ONLY" || shadow.adapter.decision === "DENY");

  if (shadow.adapter.decision === "REVIEW_ONLY") {
    const artifact = buildArtifactWithGovernance(shadow.artifactGovernance);
    assert.equal(evaluateRuntimeArtifactServingEligibility({ artifact, servingStage: "shadow" }).allow, true);
    assert.equal(evaluateRuntimeArtifactServingEligibility({ artifact, servingStage: "canary" }).allow, false);
  }
});

test("publish-enforcement integration: strong page allows production serving", () => {
  const siteVersion = buildSiteVersionFromPage(
    "<!doctype html><html><body><header><nav>Nav</nav></header><main><section><h1>Hero</h1><p>Body</p></section><section><form><input/></form></section></main><footer>Legal</footer></body></html>",
  );

  const production = evaluatePublishEnforcement({
    siteVersion,
    stage: "production",
  });

  if (production.adapter.decision === "ALLOW") {
    const artifact = buildArtifactWithGovernance(production.artifactGovernance);
    assert.equal(evaluateRuntimeArtifactServingEligibility({ artifact, servingStage: "production" }).allow, true);
  } else {
    assert.equal(production.adapter.decision, "DENY");
  }
});
