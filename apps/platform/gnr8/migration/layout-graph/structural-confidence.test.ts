import assert from "node:assert/strict";
import test from "node:test";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { fixtureMaverHtml, fixtureSimpleLandingHtml } from "@/gnr8/migration/layout-graph/layout-graph-test-fixtures";
import { computeStructuralConfidence } from "@/gnr8/migration/layout-graph/structural-confidence";
import {
  CONFIDENCE_ACCEPTABLE,
  CONFIDENCE_STRONG,
  CONFIDENCE_WEAK,
} from "@/gnr8/migration/layout-graph/structural-confidence-thresholds";

test("clean marketing layout yields high deterministic structural confidence", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureSimpleLandingHtml,
  });

  const score = page.migrationDiagnostics?.pageStructuralConfidence ?? 0;
  assert.ok(score >= CONFIDENCE_STRONG, `expected strong confidence, got ${score}`);
});

test("nav collapse patterns reduce hero confidence deterministically", () => {
  const heroNavMixHtml = [
    '<section class="hero">',
    "<h1>Welcome</h1>",
    '<nav><a href="#a">A</a><a href="#b">B</a><a href="#c">C</a><a href="#d">D</a><a href="#e">E</a><a href="#f">F</a></nav>',
    '<div class="legal">Privacy Terms Cookies</div>',
    "</section>",
  ].join("\n");

  const structural = computeStructuralConfidence(
    {
      blockHtml: heroNavMixHtml,
      blockOrdinal: 0,
      group: {
        intent: "hero",
        domIndexStart: 0,
        domIndexEnd: 8,
        sourceNodeTypes: ["hero"],
      },
      layoutHint: {
        type: "hero",
        depth: 2,
      },
    },
    {
      primary: {
        textDensity: 40,
        imageDensity: 0,
        linkDensity: 0.33,
        headingPresence: true,
        sectionBreakConfidence: 0.82,
        visualClusterConfidence: 0.2,
      },
      neighbors: [],
    },
  );

  assert.ok(structural.score < 0.4, `expected low hero confidence, got ${structural.score}`);
  assert.ok(structural.anomalies.includes("nav_collapse_in_hero"));
});

test("missing footer triggers page confidence penalty", () => {
  const noFooterHtml = fixtureSimpleLandingHtml.replace(/<footer[\s\S]*?<\/footer>/i, "");

  const clean = importHtmlToPage({ slug: "/clean", html: fixtureSimpleLandingHtml });
  const missing = importHtmlToPage({ slug: "/missing-footer", html: noFooterHtml });

  const cleanScore = clean.migrationDiagnostics?.pageStructuralConfidence ?? 0;
  const missingScore = missing.migrationDiagnostics?.pageStructuralConfidence ?? 0;
  const anomalies = missing.migrationDiagnostics?.structuralAnomalies ?? [];

  assert.ok(anomalies.includes("footer_missing"), "footer missing anomaly expected");
  assert.ok(missingScore < cleanScore, `expected missing footer score (${missingScore}) lower than clean (${cleanScore})`);
});

test("maver snapshot confidence remains medium (not high)", () => {
  const page = importHtmlToPage({
    slug: "/maver",
    html: fixtureMaverHtml,
  });

  const score = page.migrationDiagnostics?.pageStructuralConfidence ?? 0;

  assert.ok(score >= CONFIDENCE_WEAK, `expected at least weak confidence, got ${score}`);
  assert.ok(score >= CONFIDENCE_ACCEPTABLE, `expected medium confidence floor, got ${score}`);
  assert.ok(score < CONFIDENCE_STRONG, `expected not-high confidence, got ${score}`);
});
