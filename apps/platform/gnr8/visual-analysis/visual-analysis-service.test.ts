import assert from "node:assert/strict";
import test from "node:test";

import { createVisualAnalysisModel } from "./visual-analysis-service";
import type { VisualScreenshotInput } from "./visual-analysis-model";

function input(overrides?: Partial<VisualScreenshotInput>): VisualScreenshotInput {
  return {
    kind: "visual_screenshot_input_v1",
    version: "1.0.0",
    screenshots: [
      {
        screenshotId: "s-1",
        pageId: "p-1",
        source: { kind: "file_path", value: "/tmp/fixture.png" },
        viewport: { width: 1440, height: 900 },
      },
    ],
    pageMetrics: [
      {
        pageId: "p-1",
        heroTopViewportCoverage: 0.45,
        imageAreaRatio: 0.52,
        textAreaRatio: 0.36,
        whitespaceRatio: 0.2,
        aboveFoldPrimaryCtaContrast: 0.48,
        sectionRepetitionScore: 0.38,
        footerHeightRatio: 0.15,
      },
    ],
    sectionBoundingHints: [
      {
        pageId: "p-1",
        sectionId: "hero",
        ordinalIndex: 0,
        topRatio: 0,
        heightRatio: 0.34,
        textWeight: 0.35,
        mediaWeight: 0.58,
        ctaWeight: 0.42,
        visualDistinctiveness: 0.66,
      },
    ],
    semanticAlignmentHints: [{ pageId: "p-1", expectedSectionIds: ["hero"] }],
    ...overrides,
  };
}

test("no screenshot input falls back safely", () => {
  const model = createVisualAnalysisModel(null);
  assert.equal(model.status, "unavailable");
  assert.equal(model.confidence, "low");
  assert.ok(model.diagnostics.some((d) => d.code === "VISUAL_ANALYSIS_UNAVAILABLE"));
});

test("strong hero prominence is classified as high", () => {
  const model = createVisualAnalysisModel(
    input({
      pageMetrics: [
        {
          pageId: "p-1",
          heroTopViewportCoverage: 0.71,
          imageAreaRatio: 0.47,
          textAreaRatio: 0.33,
          whitespaceRatio: 0.2,
          aboveFoldPrimaryCtaContrast: 0.6,
          sectionRepetitionScore: 0.32,
          footerHeightRatio: 0.17,
        },
      ],
    }),
  );
  assert.equal(model.pageObservations.heroProminence, "high");
});

test("dense layout classification is emitted", () => {
  const model = createVisualAnalysisModel(
    input({
      pageMetrics: [
        {
          pageId: "p-1",
          heroTopViewportCoverage: 0.24,
          imageAreaRatio: 0.41,
          textAreaRatio: 0.52,
          whitespaceRatio: 0.08,
          aboveFoldPrimaryCtaContrast: 0.35,
          sectionRepetitionScore: 0.54,
          footerHeightRatio: 0.14,
        },
      ],
    }),
  );
  assert.equal(model.pageObservations.visualDensity, "high");
  assert.equal(model.pageObservations.readabilityTendency, "dense");
});

test("media-forward gallery-like page maps to visual_gallery style family", () => {
  const model = createVisualAnalysisModel(
    input({
      pageMetrics: [
        {
          pageId: "p-1",
          heroTopViewportCoverage: 0.27,
          imageAreaRatio: 0.72,
          textAreaRatio: 0.16,
          whitespaceRatio: 0.12,
          aboveFoldPrimaryCtaContrast: 0.41,
          sectionRepetitionScore: 0.82,
          footerHeightRatio: 0.1,
        },
      ],
      sectionBoundingHints: [
        {
          pageId: "p-1",
          sectionId: "gallery",
          ordinalIndex: 1,
          topRatio: 0.26,
          heightRatio: 0.33,
          textWeight: 0.22,
          mediaWeight: 0.72,
          ctaWeight: 0.12,
          visualDistinctiveness: 0.58,
        },
      ],
    }),
  );
  assert.equal(model.pageObservations.dominantVisualStyleFamily, "visual_gallery");
});

test("weak section alignment emits low-confidence diagnostic", () => {
  const model = createVisualAnalysisModel(
    input({
      sectionBoundingHints: [
        {
          pageId: "p-1",
          sectionId: "hero",
          ordinalIndex: 0,
          topRatio: 0,
          heightRatio: 0.33,
          textWeight: 0.38,
          mediaWeight: 0.55,
          ctaWeight: 0.33,
          visualDistinctiveness: 0.55,
        },
      ],
      semanticAlignmentHints: [{ pageId: "p-1", expectedSectionIds: ["hero", "features", "footer", "cta"] }],
    }),
  );
  assert.ok(model.diagnostics.some((d) => d.code === "VISUAL_ANALYSIS_SECTION_ALIGNMENT_WEAK"));
});
