import assert from "node:assert/strict";
import test from "node:test";

import { createDesignIntelligenceResultFromInput, createDesignModelFromInput } from "./design-intelligence-service";
import type { DesignIntelligenceAiSuggestionService } from "./design-intelligence-ai-hook";
import type { DesignIntelligenceInput, DesignSemanticSectionInput } from "./design-model";

function section(overrides: Partial<DesignSemanticSectionInput>): DesignSemanticSectionInput {
  return {
    sectionId: overrides.sectionId ?? "s-1",
    pageId: overrides.pageId ?? "p-1",
    sourceDomPath: overrides.sourceDomPath ?? "html>body>section:nth-of-type(1)",
    sourceTagName: overrides.sourceTagName ?? "section",
    ordinalIndex: overrides.ordinalIndex ?? 0,
    childElementCount: overrides.childElementCount ?? 2,
    textExcerpt: overrides.textExcerpt ?? "",
    directTextPresent: overrides.directTextPresent ?? false,
    textDensity: overrides.textDensity ?? 0.2,
    mediaCount: overrides.mediaCount ?? 0,
    ctaCandidateCount: overrides.ctaCandidateCount ?? 0,
    hasHeadingSignal: overrides.hasHeadingSignal ?? false,
    inferredType: overrides.inferredType ?? "unknown",
    semanticConfidence: overrides.semanticConfidence ?? "low",
    semanticRationale: overrides.semanticRationale ?? [],
    heroComposition: overrides.heroComposition ?? null,
    mediaDensity: overrides.mediaDensity ?? 0,
    galleryLikeConfidence: overrides.galleryLikeConfidence ?? "low",
    readabilityTendency: overrides.readabilityTendency ?? "balanced",
  };
}

function baseInput(sections: DesignSemanticSectionInput[]): DesignIntelligenceInput {
  return {
    preparedSite: {
      preparedSiteKind: "prepared_site_model_v1",
      preparedSiteModelVersion: "1.7.0",
      importContractVersion: "1.1.1",
      importManifestVersion: "1.0.0",
      fingerprints: {
        inputSpecSha256: "a",
        inputContentSha256: "b",
      },
    },
    pages: [
      {
        pageId: "p-1",
        sourcePath: "index.html",
        isEntry: true,
        title: "Home",
        sections,
        contentDensity: 0.4,
        visualDensity: 0.2,
        ctaCandidateCount: sections.reduce((sum, s) => sum + s.ctaCandidateCount, 0),
        primaryCtaLabel: null,
        semanticDiagnostics: [],
        brandSignals: {
          primaryColorHint: "#0d9488",
          secondaryColorHint: "#0f766e",
          typographyHint: "system",
          dominantColors: ["#0d9488"],
          accentColors: ["#0f766e"],
          neutralPaletteHints: ["light-neutral"],
          fontFamilyHints: ["system-ui"],
          fontCategoryHints: ["sans"],
          visualTone: "neutral",
          confidence: "high",
          rationale: ["fixture_brand_signals"],
        },
      },
    ],
  };
}

test("hero split decision when heading + media are present", () => {
  const model = createDesignModelFromInput(
    baseInput([
      section({
        sectionId: "hero",
        sourceTagName: "section",
        ordinalIndex: 0,
        hasHeadingSignal: true,
        mediaCount: 1,
        textDensity: 0.2,
      }),
    ]),
  );

  const hero = model.sectionDecisions.find((d) => d.sectionId === "hero");
  assert.ok(hero);
  assert.equal(hero.semanticType, "hero");
  assert.equal(hero.visualTreatment, "hero_split");
});

test("text-heavy section selects readable single-column treatment", () => {
  const model = createDesignModelFromInput(
    baseInput([
      section({ sectionId: "header", sourceTagName: "header", ordinalIndex: 0, textDensity: 0.1 }),
      section({
        sectionId: "article",
        sourceTagName: "section",
        ordinalIndex: 2,
        textDensity: 0.9,
        mediaCount: 0,
        ctaCandidateCount: 0,
      }),
    ]),
  );

  const content = model.sectionDecisions.find((d) => d.sectionId === "article");
  assert.ok(content);
  assert.equal(content.semanticType, "content");
  assert.equal(content.visualTreatment, "readable_single_column");
});

test("CTA emphasis picks one primary candidate when multiple exist", () => {
  const model = createDesignModelFromInput(
    baseInput([
      section({ sectionId: "hero", ordinalIndex: 0, hasHeadingSignal: true, mediaCount: 1 }),
      section({ sectionId: "cta-weak", ordinalIndex: 1, ctaCandidateCount: 1, sourceDomPath: "html>body>section:nth-of-type(2)>div.cta" }),
      section({ sectionId: "cta-strong", ordinalIndex: 2, ctaCandidateCount: 3, sourceDomPath: "html>body>section:nth-of-type(3)>div.cta" }),
    ]),
  );

  const primary = model.sectionDecisions.find((d) => d.sectionId === "cta-strong");
  const secondary = model.sectionDecisions.find((d) => d.sectionId === "cta-weak");
  assert.ok(primary);
  assert.ok(secondary);
  assert.equal(primary.semanticType, "cta");
  assert.equal(primary.visualTreatment, "cta_emphasized");
  assert.equal(primary.emphasis, "primary");
  assert.equal(secondary.emphasis, "secondary");
});

test("safe default fallback is emitted for weak structure", () => {
  const model = createDesignModelFromInput(baseInput([]));

  assert.equal(model.layoutStrategy, "corporate_balanced");
  assert.equal(model.sectionDecisions.length, 0);
  assert.equal(model.status, "ready_with_warnings");
  assert.ok(model.diagnostics.codes.includes("DESIGN_INTELLIGENCE_DEFAULTED"));
});

test("AI suggestion layer falls back safely when unavailable", () => {
  const result = createDesignIntelligenceResultFromInput(baseInput([section({ sectionId: "hero", ordinalIndex: 0, hasHeadingSignal: true })]));
  assert.equal(result.designModel.layoutStrategy, result.deterministicDesignModel.layoutStrategy);
  assert.equal(result.aiSuggestionMerge.status, "unavailable");
  assert.ok(result.designModel.diagnostics.codes.includes("AI_DESIGN_SUGGESTION_UNAVAILABLE"));
});

test("valid high-confidence AI suggestion is accepted and merged", () => {
  const service: DesignIntelligenceAiSuggestionService = {
    name: "mock",
    requestAiDesignSuggestions: () => ({
      kind: "ai_design_suggestion_v1",
      version: "1.0.0",
      source: { provider: "mock", model: "fixture-v1" },
      pageStrategySuggestion: "cta_focused",
      sectionSuggestions: [
        {
          sectionId: "hero",
          pageId: "p-1",
          visualTreatmentSuggestion: "hero_split",
          confidence: "high",
          rationale: ["Hero has enough heading and media support."],
        },
      ],
      rationale: ["Use stronger CTA-first hierarchy."],
      confidence: { overall: "high", bySection: { hero: "high" } },
    }),
  };

  const result = createDesignIntelligenceResultFromInput(
    baseInput([section({ sectionId: "hero", ordinalIndex: 0, hasHeadingSignal: false, mediaCount: 0 })]),
    { aiSuggestionService: service, enableAiSuggestions: true },
  );

  assert.equal(result.aiSuggestionMerge.status, "merged");
  assert.equal(result.aiSuggestionMerge.acceptedCount > 0, true);
  assert.equal(result.designModel.layoutStrategy, "cta_focused");
  assert.ok(result.designModel.diagnostics.codes.includes("AI_DESIGN_SUGGESTION_ACCEPTED"));
});

test("unknown AI suggestion values are rejected", () => {
  const service: DesignIntelligenceAiSuggestionService = {
    name: "mock",
    requestAiDesignSuggestions: () =>
      ({
        kind: "ai_design_suggestion_v1",
        version: "1.0.0",
        source: { provider: "mock", model: "fixture-v1" },
        pageStrategySuggestion: "unknown_strategy_v9",
        sectionSuggestions: [],
        rationale: ["Test unknown strategy."],
        confidence: { overall: "high" },
      }) as never,
  };

  const result = createDesignIntelligenceResultFromInput(baseInput([section({ sectionId: "hero", ordinalIndex: 0 })]), {
    aiSuggestionService: service,
    enableAiSuggestions: true,
  });

  assert.equal(result.aiSuggestionMerge.rejectedCount > 0, true);
  assert.ok(result.designModel.diagnostics.codes.includes("AI_DESIGN_SUGGESTION_REJECTED"));
  assert.equal(result.designModel.layoutStrategy, result.deterministicDesignModel.layoutStrategy);
});

test("low confidence AI suggestion is ignored", () => {
  const service: DesignIntelligenceAiSuggestionService = {
    name: "mock",
    requestAiDesignSuggestions: () => ({
      kind: "ai_design_suggestion_v1",
      version: "1.0.0",
      source: { provider: "mock", model: "fixture-v1" },
      pageStrategySuggestion: "visual_gallery",
      sectionSuggestions: [
        {
          sectionId: "hero",
          pageId: "p-1",
          visualTreatmentSuggestion: "hero_image_first",
          confidence: "low",
          rationale: ["Uncertain section-level support."],
        },
      ],
      rationale: ["Uncertain strategy swap."],
      confidence: { overall: "low", bySection: { hero: "low" } },
    }),
  };

  const result = createDesignIntelligenceResultFromInput(baseInput([section({ sectionId: "hero", ordinalIndex: 0 })]), {
    aiSuggestionService: service,
    enableAiSuggestions: true,
  });

  assert.equal(result.aiSuggestionMerge.acceptedCount, 0);
  assert.equal(result.aiSuggestionMerge.ignoredCount > 0, true);
  assert.ok(result.designModel.diagnostics.codes.includes("AI_DESIGN_SUGGESTION_LOW_CONFIDENCE"));
});

test("AI errors do not break pipeline and merge rationale is recorded", () => {
  const service: DesignIntelligenceAiSuggestionService = {
    name: "mock-failing",
    requestAiDesignSuggestions: () => {
      throw new Error("provider_timeout");
    },
  };

  const result = createDesignIntelligenceResultFromInput(baseInput([section({ sectionId: "hero", ordinalIndex: 0 })]), {
    aiSuggestionService: service,
    enableAiSuggestions: true,
  });

  assert.equal(result.designModel.kind, "design_model_v1");
  assert.equal(result.aiSuggestionMerge.status, "unavailable");
  assert.ok(result.designModel.aiAssistance.rationale.length > 0);
});

test("design intelligence consumes high-confidence visual signals safely", () => {
  const visualInput = {
    kind: "visual_analysis_model_v1" as const,
    version: "1.0.0" as const,
    status: "available" as const,
    source: { inputKind: "visual_screenshot_input_v1" as const, screenshotCount: 1, hasSectionHints: true, hasAlignmentHints: true },
    pageObservations: {
      dominantVisualStyleFamily: "cta_focused" as const,
      heroProminence: "high" as const,
      visualDensity: "high" as const,
      spacingRhythm: "tight" as const,
      readabilityTendency: "dense" as const,
      imageTextBalance: "balanced" as const,
      ctaProminence: "low" as const,
    },
    pageObservationsByPage: [
      {
        pageId: "p-1",
        dominantVisualStyleFamily: "cta_focused" as const,
        heroProminence: "high" as const,
        visualDensity: "high" as const,
        spacingRhythm: "tight" as const,
        readabilityTendency: "dense" as const,
        imageTextBalance: "balanced" as const,
        ctaProminence: "low" as const,
        confidence: "high" as const,
        rationale: ["fixture"],
      },
    ],
    sectionObservations: [],
    confidence: "high" as const,
    rationale: ["fixture"],
    diagnostics: [],
  };

  const result = createDesignIntelligenceResultFromInput(
    baseInput([section({ sectionId: "hero", ordinalIndex: 0, hasHeadingSignal: true, mediaCount: 1, ctaCandidateCount: 2 })]),
    { visualAnalysis: visualInput },
  );

  assert.equal(result.designModel.visualAnalysis.status, "available");
  assert.equal(result.designModel.layoutStrategy, "cta_focused");
  assert.equal(result.designModel.spacingScale.sectionGap, "lg");
});

test("design intelligence consumes style signals without breaking determinism", () => {
  const result = createDesignIntelligenceResultFromInput(
    baseInput([section({ sectionId: "hero", ordinalIndex: 0, hasHeadingSignal: true, mediaCount: 1, ctaCandidateCount: 2 })]),
    {
      styleSignals: {
        kind: "style_signal_model_v2",
        version: "2.0.0",
        sourceMode: "computed_style",
        colors: {
          backgroundTone: "dark",
          primaryAccent: "#2563eb",
          secondaryAccent: "#14b8a6",
          neutralPalette: ["#0f172a"],
          ctaColorHint: "#2563eb",
        },
        typography: {
          headingFontFamily: "Inter",
          bodyFontFamily: "Inter",
          headingCategory: "sans",
          bodyCategory: "sans",
          scaleHint: "large",
          weightContrastHint: "high",
        },
        spacing: {
          rhythm: "airy",
          sectionSpacingHint: "airy",
          layoutDensity: "airy",
        },
        surfaces: {
          radiusHint: "rounded",
          shadowHint: "soft",
        },
        cta: {
          prominence: "high",
          styleHint: "solid_button",
        },
        visualToneHint: "premium",
        diagnostics: [],
      },
    },
  );

  assert.equal(result.designModel.styleSignals.sourceMode, "computed_style");
  assert.equal(result.designModel.layoutStrategy, "cta_focused");
  assert.equal(result.designModel.colorSystem.primaryHint, "#2563eb");
  assert.equal(result.designModel.spacingScale.rhythm, "airy");
});
