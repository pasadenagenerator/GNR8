import assert from "node:assert/strict";
import test from "node:test";

import { createDesignModelFromInput } from "./design-intelligence-service";
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
  };
}

function baseInput(sections: DesignSemanticSectionInput[]): DesignIntelligenceInput {
  return {
    preparedSite: {
      preparedSiteKind: "prepared_site_model_v1",
      preparedSiteModelVersion: "1.5.0",
      importContractVersion: "1.0.0",
      importManifestVersion: "1.0.0",
      fingerprints: {
        normalizedDomFingerprint: "a",
        normalizedTextFingerprint: "b",
        assetGraphFingerprint: "c",
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
        brandSignals: {
          primaryColorHint: "#0d9488",
          secondaryColorHint: "#0f766e",
          typographyHint: "system",
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
