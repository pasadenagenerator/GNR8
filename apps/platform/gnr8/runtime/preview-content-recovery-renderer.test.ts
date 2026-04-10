import assert from "node:assert/strict";
import test from "node:test";

import {
  renderContentRecoveryPreview,
  resolveContentRecoveryDecision,
} from "@/gnr8/runtime/preview-content-recovery-renderer";
import type { CanonicalPageVersionSnapshot, RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

function buildPage(input?: {
  sections?: Array<{ id: string; type: string; order: number }>;
  sectionProps?: Record<string, Record<string, unknown>>;
  migrationGovernance?: CanonicalPageVersionSnapshot["migrationGovernance"];
}): CanonicalPageVersionSnapshot {
  return {
    id: "pv_test",
    siteVersionId: "sv_test",
    pageId: "page_test",
    path: "/",
    title: "Recovered Home",
    structureModel: {
      sections: input?.sections ?? [],
    },
    contentModel: {
      sectionProps: input?.sectionProps ?? {},
    },
    styleTokens: {},
    assetGraph: [],
    semanticSignals: [],
    source: "migration",
    actor: "test",
    createdAt: "2026-04-09T00:00:00.000Z",
    migrationGovernance: input?.migrationGovernance ?? null,
  };
}

function buildSummary(input?: Partial<RuntimeImportProvenanceSummary>): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: "rendered_dom",
    importFidelityStatus: "high_fidelity_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 2,
    computedStyleSampleCount: 6,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 1200,
      nodeCount: 80,
      styleSampleCount: 6,
      styleCoverage: 0.5,
      screenshots: {
        viewport: true,
        fullPage: true,
      },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: "supported",
        failureCategory: "none",
        failureCode: null,
        browserLaunch: "succeeded",
        navigation: "succeeded",
        dom: "captured",
        screenshot: "captured",
        styleSampling: "captured",
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: "/tmp/snapshot/rendered-dom.html",
      responseHtmlPath: "/tmp/snapshot/response.html",
      entryHtmlPath: "/tmp/snapshot/index.html",
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: "/tmp/snapshot/acquisition.json",
      renderedDomPath: "/tmp/snapshot/rendered-dom.html",
      computedStylesPath: "/tmp/snapshot/computed-styles.json",
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
    ...input,
  };
}

test("content recovery renderer keeps hero visible even when sections are empty", () => {
  const page = buildPage({ sections: [], sectionProps: {} });
  const rendered = renderContentRecoveryPreview({
    page,
    sectionEntries: [],
  });

  assert.match(rendered.html, /data-gnr8-render-mode="content-recovery"/);
  assert.match(rendered.html, /<section data-gnr8-recovery-block="hero">/);
  assert.match(rendered.html, /<h1>Recovered Home<\/h1>/);
  assert.match(rendered.html, /Imported content recovered for preview\./);
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_HERO_SYNTHESIZED"));
});

test("content recovery renderer surfaces headings and paragraphs from snapshot html", () => {
  const page = buildPage();
  const rendered = renderContentRecoveryPreview({
    page,
    sectionEntries: [],
    snapshotHtml:
      "<!doctype html><html><head><title>Polar</title><meta name='description' content='Modern payment stack.' /></head><body><h1>Ship faster</h1><h2>Built for teams</h2><p>Use one API for global billing.</p></body></html>",
  });

  assert.match(rendered.html, /<h1>Ship faster<\/h1>/);
  assert.match(rendered.html, /<h2>Built for teams<\/h2>/);
  assert.match(rendered.html, /Use one API for global billing\./);
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_TEXT_SURFACED"));
});

test("content recovery renderer extracts links and images from htmlSummary", () => {
  const page = buildPage({
    sections: [{ id: "legacy", type: "legacy.html", order: 0 }],
    sectionProps: {
      legacy: {
        htmlSummary: {
          extractedText: "Company profile and services.",
          extractedLinks: [{ href: "/contact", label: "Contact" }],
          extractedImageSrcs: ["https://cdn.example.com/photo.jpg", "/uploads/local-image.jpg"],
        },
      },
    },
  });

  const rendered = renderContentRecoveryPreview({
    page,
    sectionEntries: [{ sectionId: "legacy", sectionType: "legacy.html", sectionProps: page.contentModel.sectionProps.legacy ?? {} }],
  });

  assert.match(rendered.html, /<h3>Links<\/h3>/);
  assert.match(rendered.html, /href="\/contact"/);
  assert.match(rendered.html, /Contact/);
  assert.match(rendered.html, /<h3>Images<\/h3>/);
  assert.match(rendered.html, /src="\/uploads\/local-image\.jpg"/);
  assert.match(rendered.html, /Image source kept as reference/);
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_LINKS_SURFACED"));
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_IMAGES_SURFACED"));
});

test("content recovery renderer uses section hierarchy evidence for hero and CTA placement", () => {
  const page = buildPage({
    sections: [
      { id: "hero", type: "hero.split", order: 0 },
      { id: "cta", type: "cta.simple", order: 1 },
    ],
    sectionProps: {
      hero: {
        headline: "Capture-first hero",
        subheadline: "Recovered from rendered hierarchy evidence.",
      },
      cta: {
        buttonLabel: "Start now",
        buttonHref: "/start",
      },
    },
  });

  const rendered = renderContentRecoveryPreview({
    page,
    sectionEntries: [
      { sectionId: "hero", sectionType: "hero.split", sectionProps: page.contentModel.sectionProps.hero ?? {} },
      { sectionId: "cta", sectionType: "cta.simple", sectionProps: page.contentModel.sectionProps.cta ?? {} },
    ],
  });

  assert.match(rendered.html, /Capture-first hero/);
  assert.match(rendered.html, /data-gnr8-recovery-block="cta"/);
  assert.match(rendered.html, /href="\/start"/);
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_CAPTURE_LAYOUT_ORDERED"));
  assert.ok(rendered.diagnostics.includes("CONTENT_RECOVERY_CTA_PLACED"));
});

test("content recovery renderer always embeds original section props payload", () => {
  const page = buildPage({
    sections: [{ id: "intro", type: "content.basic", order: 0 }],
    sectionProps: {
      intro: {
        title: "Intro",
        text: "Original payload",
      },
    },
  });

  const rendered = renderContentRecoveryPreview({
    page,
    sectionEntries: [{ sectionId: "intro", sectionType: "content.basic", sectionProps: page.contentModel.sectionProps.intro ?? {} }],
  });

  assert.match(rendered.html, /data-gnr8-section-props/);
  assert.match(rendered.html, /Original payload/);
});

test("content recovery trigger activates when deterministic conditions are met", () => {
  const page = buildPage({
    sections: [
      { id: "a", type: "content.basic", order: 0 },
      { id: "b", type: "content.basic", order: 1 },
      { id: "c", type: "content.basic", order: 2 },
    ],
    sectionProps: {
      a: { text: "A" },
      b: { text: "B" },
      c: { text: "C" },
    },
    migrationGovernance: {
      pageStructuralConfidence: 0.7,
      weakSectionIds: ["a", "b"],
      structuralAnomalies: [],
      pageMigrationGate: {
        stage: "gate",
        overallStatus: "pass",
        checks: [],
      } as any,
      pageRolloutPolicy: {
        stage: "policy",
        overallStatus: "pass",
        checks: [],
      } as any,
      pageEnforcement: {
        shadow: { allow: true, reasons: [] },
        canary: { allow: true, reasons: [] },
        production: { allow: true, reasons: [] },
      } as any,
    },
  });

  const degraded = resolveContentRecoveryDecision({
    page,
    importProvenanceSummary: buildSummary({
      importFidelityStatus: "degraded_import",
      renderedCaptureStatus: "failed",
      renderedDomQuality: "weak",
      renderedCapture: {
        ...buildSummary().renderedCapture,
        status: "failed",
        quality: "weak",
        nodeCount: 0,
      },
    }),
  });

  assert.equal(degraded.pageRenderMode, "content_recovery");
  assert.ok(degraded.reasons.includes("degraded_import"));
  assert.ok(degraded.reasons.includes("missing_rendered_capture"));
  assert.ok(degraded.reasons.includes("weak_structure"));
  assert.ok(degraded.reasons.includes("weak_dom_quality"));

  const highFidelity = resolveContentRecoveryDecision({
    page: buildPage({
      sections: [
        { id: "hero", type: "hero.split", order: 0 },
        { id: "content", type: "content.basic", order: 1 },
        { id: "cta", type: "cta.banner", order: 2 },
      ],
      sectionProps: {
        hero: { headline: "Hero" },
        content: { text: "Text" },
        cta: { label: "Start" },
      },
      migrationGovernance: {
        pageStructuralConfidence: 0.9,
        weakSectionIds: [],
        structuralAnomalies: [],
        pageMigrationGate: { stage: "gate", overallStatus: "pass", checks: [] } as any,
        pageRolloutPolicy: { stage: "policy", overallStatus: "pass", checks: [] } as any,
        pageEnforcement: {
          shadow: { allow: true, reasons: [] },
          canary: { allow: true, reasons: [] },
          production: { allow: true, reasons: [] },
        } as any,
      },
    }),
    importProvenanceSummary: buildSummary(),
  });

  assert.notEqual(highFidelity.pageRenderMode, "content_recovery");
});
