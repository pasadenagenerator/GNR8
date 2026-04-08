import assert from "node:assert/strict";
import test from "node:test";

import { consolidateSections } from "./engine";
import type { RawBlock } from "./types";

function block(input: Partial<RawBlock> & { id: string; domPath: string; ordinalIndex: number }): RawBlock {
  return {
    id: input.id,
    domPath: input.domPath,
    tagName: input.tagName ?? "div",
    ordinalIndex: input.ordinalIndex,
    parentDomPath: input.parentDomPath ?? "html>body>main:nth-of-type(1)",
    domDepth: input.domDepth ?? 4,
    className: input.className ?? null,
    role: input.role ?? null,
    ariaLabel: input.ariaLabel ?? null,
    textExcerpt: input.textExcerpt ?? null,
    preservedMarkupHtml: input.preservedMarkupHtml ?? null,
    childElementCount: input.childElementCount ?? 1,
    textWordCount: input.textWordCount ?? 20,
    textDensity: input.textDensity ?? 0.2,
    nodeComplexity: input.nodeComplexity ?? 4,
    layoutHintDepth: input.layoutHintDepth ?? 4,
    hasHeading: input.hasHeading ?? false,
    hasImages: input.hasImages ?? false,
    hasCTA: input.hasCTA ?? false,
    hasFooterHint: input.hasFooterHint ?? false,
    hasNavHint: input.hasNavHint ?? false,
    hasLegalHint: input.hasLegalHint ?? false,
    hasContactHint: input.hasContactHint ?? false,
    repetitionHint: input.repetitionHint ?? 0,
  };
}

test("fragmented blocks are consolidated into semantic section candidates", () => {
  const result = consolidateSections({
    blocks: [
      block({ id: "hero-title", domPath: "html>body>main:nth-of-type(1)>div:nth-of-type(1)", ordinalIndex: 0, hasHeading: true, textWordCount: 9, textDensity: 0.07 }),
      block({ id: "hero-copy", domPath: "html>body>main:nth-of-type(1)>div:nth-of-type(2)", ordinalIndex: 1, textWordCount: 26, textDensity: 0.22 }),
      block({ id: "hero-cta", domPath: "html>body>main:nth-of-type(1)>div:nth-of-type(3)", ordinalIndex: 2, hasCTA: true, textWordCount: 7, textDensity: 0.06 }),
      block({ id: "services-h2", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(1)", ordinalIndex: 3, hasHeading: true, textWordCount: 6, textDensity: 0.05 }),
      block({ id: "services-cards", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(2)", ordinalIndex: 4, repetitionHint: 0.8, textWordCount: 40, textDensity: 0.28 }),
      block({ id: "footer", domPath: "html>body>footer:nth-of-type(1)", ordinalIndex: 5, tagName: "footer", hasFooterHint: true, hasLegalHint: true, textWordCount: 18, textDensity: 0.15 }),
    ],
  });

  assert.ok(result.outputSectionCount >= 2, `expected >=2 consolidated sections, got ${result.outputSectionCount}`);
  assert.ok(result.diagnostics.some((d) => d.code === "SECTION_CONSOLIDATION_APPLIED"));
  const heroLike = result.sections.find((section) => section.candidates.heroCandidate >= 0.65);
  assert.ok(heroLike, "expected hero candidate after merge pass");
  assert.ok(result.sections.some((section) => section.candidates.footerCandidate >= 0.45), "expected footer candidate diversity");
});

test("hero is reconstructed from split fragments", () => {
  const result = consolidateSections({
    blocks: [
      block({ id: "h1", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(1)", ordinalIndex: 0, hasHeading: true, textWordCount: 8, textDensity: 0.06 }),
      block({ id: "p", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(2)", ordinalIndex: 1, textWordCount: 24, textDensity: 0.18 }),
      block({ id: "cta", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(3)", ordinalIndex: 2, hasCTA: true, textWordCount: 5, textDensity: 0.04 }),
      block({ id: "img", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(4)", ordinalIndex: 3, hasImages: true, textWordCount: 0, textDensity: 0 }),
    ],
  });

  const strongestHero = result.sections.slice().sort((a, b) => b.candidates.heroCandidate - a.candidates.heroCandidate)[0] ?? null;
  assert.ok(strongestHero);
  assert.ok(strongestHero!.blockIds.length >= 2, "expected merged hero section from split blocks");
  assert.ok(strongestHero!.candidates.heroCandidate >= 0.7, `expected strong hero candidate, got ${strongestHero!.candidates.heroCandidate}`);
});

test("repeated sibling cards collapse into single services/gallery candidate section", () => {
  const result = consolidateSections({
    blocks: [
      block({ id: "services-title", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(1)", ordinalIndex: 1, hasHeading: true, textWordCount: 4, textDensity: 0.03, parentDomPath: "html>body>main:nth-of-type(1)" }),
      block({ id: "card-1", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(2)", ordinalIndex: 2, repetitionHint: 0.9, textWordCount: 20, textDensity: 0.15, parentDomPath: "html>body>main:nth-of-type(1)" }),
      block({ id: "card-2", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(3)", ordinalIndex: 3, repetitionHint: 0.9, textWordCount: 18, textDensity: 0.14, parentDomPath: "html>body>main:nth-of-type(1)" }),
      block({ id: "card-3", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(4)", ordinalIndex: 4, repetitionHint: 0.9, textWordCount: 17, textDensity: 0.13, parentDomPath: "html>body>main:nth-of-type(1)" }),
    ],
  });

  const repeatedCluster = result.sections.find((section) => section.signals.repetitionScore >= 0.5);
  assert.ok(repeatedCluster, "expected repeated cluster section");
  assert.ok(repeatedCluster!.blockIds.length >= 3, "expected repeated cards merged");
  assert.ok(
    repeatedCluster!.candidates.servicesCandidate >= 0.5 || repeatedCluster!.candidates.galleryCandidate >= 0.5,
    "expected services/gallery candidate after repetition merge",
  );
});

test("footer candidate is prevented from dominating when CTA/content signals are stronger", () => {
  const result = consolidateSections({
    blocks: [
      block({ id: "main-content", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(1)", ordinalIndex: 0, hasHeading: true, hasCTA: true, textWordCount: 140, textDensity: 0.72 }),
      block({ id: "tail-links", domPath: "html>body>main:nth-of-type(1)>section:nth-of-type(2)", ordinalIndex: 1, hasHeading: true, hasCTA: true, hasFooterHint: true, hasLegalHint: true, textWordCount: 45, textDensity: 0.26 }),
    ],
  });

  assert.ok(result.diagnostics.some((d) => d.code === "FOOTER_FALSE_POSITIVE_PREVENTED"));
});

test("fallback path keeps sections separate when merge boundary is strong", () => {
  const result = consolidateSections({
    blocks: [
      block({ id: "nav", domPath: "html>body>header:nth-of-type(1)", ordinalIndex: 0, tagName: "nav", hasNavHint: true, textWordCount: 12, textDensity: 0.1 }),
      block({ id: "footer", domPath: "html>body>footer:nth-of-type(1)", ordinalIndex: 1, tagName: "footer", hasFooterHint: true, hasLegalHint: true, textWordCount: 16, textDensity: 0.12 }),
    ],
  });

  assert.equal(result.outputSectionCount, 2);
  assert.ok(result.diagnostics.some((d) => d.code === "SECTION_MERGE_MINIMAL"));
});

test("consolidation is deterministic for identical input", () => {
  const blocks = [
    block({ id: "a", domPath: "html>body>main:nth-of-type(1)>div:nth-of-type(1)", ordinalIndex: 0, hasHeading: true, textWordCount: 7, textDensity: 0.05 }),
    block({ id: "b", domPath: "html>body>main:nth-of-type(1)>div:nth-of-type(2)", ordinalIndex: 1, textWordCount: 24, textDensity: 0.18 }),
    block({ id: "c", domPath: "html>body>footer:nth-of-type(1)", ordinalIndex: 2, hasFooterHint: true, hasLegalHint: true, textWordCount: 14, textDensity: 0.11 }),
  ];

  const one = consolidateSections({ blocks });
  const two = consolidateSections({ blocks });
  assert.deepEqual(two, one);
});
