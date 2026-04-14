import { deterministicId } from "../runtime/deterministic";

import type { ConsolidatedSection, RawBlock, SectionConsolidationResult, SectionGroup } from "./types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeToken(input: string | null): string {
  return String(input ?? "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, " ")
    .trim();
}

function hasStrongBoundaryHint(block: RawBlock): boolean {
  const path = normalizeToken(`${block.domPath} ${block.className ?? ""}`);
  if (block.tagName === "header" || block.tagName === "footer" || block.tagName === "nav") return true;
  if (path.includes("header") || path.includes("footer") || path.includes("navbar") || path.includes("site-footer")) return true;
  return false;
}

function semanticBucket(block: RawBlock): "header_nav" | "footer" | "hero_content" | "content" {
  if (block.hasNavHint || block.tagName === "header" || block.tagName === "nav") return "header_nav";
  if (block.hasFooterHint || block.hasLegalHint || block.tagName === "footer") return "footer";
  if (block.hasHeading || block.hasImages || block.hasCTA) return "hero_content";
  return "content";
}

function groupSourceBlocks(group: SectionGroup, index: Map<string, RawBlock>): RawBlock[] {
  return group.blockIds.map((id) => index.get(id)).filter((block): block is RawBlock => Boolean(block));
}

function groupTextDensity(group: SectionGroup, index: Map<string, RawBlock>): number {
  const blocks = groupSourceBlocks(group, index);
  return mean(blocks.map((block) => block.textDensity));
}

function groupHasHeading(group: SectionGroup, index: Map<string, RawBlock>): boolean {
  return groupSourceBlocks(group, index).some((block) => block.hasHeading);
}

function groupHasCTA(group: SectionGroup, index: Map<string, RawBlock>): boolean {
  return groupSourceBlocks(group, index).some((block) => block.hasCTA);
}

function groupAnchorCount(group: SectionGroup, index: Map<string, RawBlock>): number {
  return groupSourceBlocks(group, index).reduce((sum, block) => sum + block.anchorCount, 0);
}

function groupHasFooter(group: SectionGroup, index: Map<string, RawBlock>): boolean {
  return groupSourceBlocks(group, index).some((block) => block.hasFooterHint || block.hasLegalHint || block.tagName === "footer");
}

function groupHasNav(group: SectionGroup, index: Map<string, RawBlock>): boolean {
  return groupSourceBlocks(group, index).some((block) => block.hasNavHint || block.tagName === "header" || block.tagName === "nav");
}

function groupRepetition(group: SectionGroup, index: Map<string, RawBlock>): number {
  return mean(groupSourceBlocks(group, index).map((block) => block.repetitionHint));
}

function isDeepFragmentation(blocks: RawBlock[]): boolean {
  if (blocks.length < 6) return false;
  const avgWordCount = mean(blocks.map((block) => block.textWordCount));
  const avgComplexity = mean(blocks.map((block) => block.nodeComplexity));
  return avgWordCount <= 28 || avgComplexity <= 4.5;
}

function shouldMerge(input: {
  left: SectionGroup;
  right: SectionGroup;
  index: Map<string, RawBlock>;
  maxOrdinal: number;
  aggressive: boolean;
}): { merge: boolean; rationale: string[]; decision: string } {
  const leftBlocks = groupSourceBlocks(input.left, input.index);
  const rightBlocks = groupSourceBlocks(input.right, input.index);
  if (leftBlocks.length === 0 || rightBlocks.length === 0) {
    return { merge: false, rationale: ["missing_blocks"], decision: "skip:missing_blocks" };
  }

  const leftFirst = leftBlocks[0]!;
  const rightFirst = rightBlocks[0]!;
  const distance = Math.max(0, rightFirst.ordinalIndex - leftFirst.ordinalIndex - leftBlocks.length + 1);

  const leftIsNav = groupHasNav(input.left, input.index);
  const rightIsNav = groupHasNav(input.right, input.index);
  const leftIsFooter = groupHasFooter(input.left, input.index);
  const rightIsFooter = groupHasFooter(input.right, input.index);
  const leftWords = leftBlocks.reduce((sum, block) => sum + block.textWordCount, 0);
  const rightWords = rightBlocks.reduce((sum, block) => sum + block.textWordCount, 0);
  const leftAnchors = leftBlocks.reduce((sum, block) => sum + block.anchorCount, 0);
  const rightAnchors = rightBlocks.reduce((sum, block) => sum + block.anchorCount, 0);
  const leftNarrative = leftWords >= 42 && leftWords >= Math.max(20, leftAnchors * 4);
  const rightNarrative = rightWords >= 42 && rightWords >= Math.max(20, rightAnchors * 4);
  if ((leftIsNav && rightIsFooter) || (leftIsFooter && rightIsNav)) {
    return {
      merge: false,
      rationale: ["hard_boundary_nav_footer"],
      decision: "hold:hard_boundary_nav_footer",
    };
  }
  if (leftIsFooter !== rightIsFooter) {
    return {
      merge: false,
      rationale: ["hard_boundary_footer_transition"],
      decision: "hold:hard_boundary_footer_transition",
    };
  }
  if (leftIsNav !== rightIsNav && (leftNarrative || rightNarrative)) {
    return {
      merge: false,
      rationale: ["hard_boundary_nav_content_transition"],
      decision: "hold:hard_boundary_nav_content_transition",
    };
  }
  if (rightIsFooter && leftWords >= 64 && !leftIsFooter) {
    return {
      merge: false,
      rationale: ["hard_boundary_content_footer_transition"],
      decision: "hold:hard_boundary_content_footer_transition",
    };
  }
  if (leftIsFooter && rightWords >= 64 && !rightIsFooter) {
    return {
      merge: false,
      rationale: ["hard_boundary_footer_content_transition"],
      decision: "hold:hard_boundary_footer_content_transition",
    };
  }

  const reasons: string[] = [];
  let score = 0;

  const sameParent = leftFirst.parentDomPath.length > 0 && leftFirst.parentDomPath === rightFirst.parentDomPath;
  if (sameParent) {
    score += 0.3;
    reasons.push("same_parent_container");
  }

  if (distance <= 1) {
    score += 0.24;
    reasons.push("dom_proximity_close");
  } else if (distance <= (input.aggressive ? 2 : 1)) {
    score += 0.14;
    reasons.push("dom_proximity_near");
  }

  const densityDelta = Math.abs(groupTextDensity(input.left, input.index) - groupTextDensity(input.right, input.index));
  if (densityDelta <= 0.22) {
    score += 0.16;
    reasons.push("density_similarity");
  }

  if (groupHasHeading(input.left, input.index) && !groupHasHeading(input.right, input.index) && !groupHasFooter(input.right, input.index)) {
    score += 0.22;
    reasons.push("heading_anchor_right_content");
  }

  if (!groupHasHeading(input.left, input.index) && groupHasHeading(input.right, input.index) && !groupHasFooter(input.left, input.index)) {
    score += 0.14;
    reasons.push("heading_anchor_left_intro");
  }

  if ((groupHasCTA(input.left, input.index) || groupHasCTA(input.right, input.index)) && (groupTextDensity(input.left, input.index) > 0.06 || groupTextDensity(input.right, input.index) > 0.06)) {
    score += 0.1;
    reasons.push("cta_text_proximity");
  }

  const repetition = (groupRepetition(input.left, input.index) + groupRepetition(input.right, input.index)) / 2;
  if (repetition >= 0.35) {
    score += 0.13;
    reasons.push("repetition_cluster");
  }

  if (groupHasHeading(input.left, input.index) && groupHasHeading(input.right, input.index)) {
    score -= 0.18;
    reasons.push("dual_heading_boundary");
  }

  const combinedAnchors = groupAnchorCount(input.left, input.index) + groupAnchorCount(input.right, input.index);
  if (combinedAnchors >= 12 && (leftNarrative || rightNarrative)) {
    score -= 0.3;
    reasons.push("mixed_nav_narrative_boundary");
  }

  const topWindow = Math.max(1, Math.floor(input.maxOrdinal * 0.32));
  if (input.left.domIndexStart <= topWindow && input.right.domIndexStart <= topWindow) {
    const headingOrMedia = leftBlocks.some((block) => block.hasHeading || block.hasImages) || rightBlocks.some((block) => block.hasHeading || block.hasImages);
    if (headingOrMedia) {
      score += 0.17;
      reasons.push("top_window_hero_recovery");
    }
  }

  const bottomWindow = Math.max(0, input.maxOrdinal - Math.max(2, Math.floor(input.maxOrdinal * 0.25)));
  if (input.left.domIndexEnd >= bottomWindow && input.right.domIndexStart >= bottomWindow && (groupHasFooter(input.left, input.index) || groupHasFooter(input.right, input.index))) {
    score += 0.2;
    reasons.push("footer_tail_cluster");
  }

  const strongBoundary = leftBlocks.some(hasStrongBoundaryHint) || rightBlocks.some(hasStrongBoundaryHint);
  const semanticConflict = semanticBucket(leftFirst) !== semanticBucket(rightFirst) && (leftIsNav || rightIsNav || leftIsFooter || rightIsFooter);

  if (strongBoundary && !sameParent) {
    score -= 0.45;
    reasons.push("strong_boundary_signal");
  }

  if (semanticConflict) {
    score -= 0.35;
    reasons.push("semantic_boundary_conflict");
  }

  if (distance > (input.aggressive ? 2 : 1)) {
    score -= 0.6;
    reasons.push("dom_gap_large");
  }

  const threshold = input.aggressive ? 0.4 : 0.45;
  const merge = score >= threshold;
  return {
    merge,
    rationale: reasons,
    decision: `${merge ? "merge" : "hold"}:score=${score.toFixed(2)}:threshold=${threshold.toFixed(2)}`,
  };
}

function mergeAdjacentGroups(input: {
  groups: SectionGroup[];
  index: Map<string, RawBlock>;
  aggressive: boolean;
  diagnostics: SectionConsolidationResult["diagnostics"];
}): SectionGroup[] {
  const maxOrdinal = input.groups.reduce((max, group) => Math.max(max, group.domIndexEnd), 0);
  let current = input.groups.slice();
  let pass = 0;
  let protectedNavBoundaryCount = 0;

  while (pass < 4) {
    pass += 1;
    let changed = false;
    const next: SectionGroup[] = [];

    for (let i = 0; i < current.length; i += 1) {
      const left = current[i]!;
      const right = current[i + 1] ?? null;
      if (!right) {
        next.push(left);
        continue;
      }

      const decision = shouldMerge({
        left,
        right,
        index: input.index,
        maxOrdinal,
        aggressive: input.aggressive,
      });

      if (!decision.merge) {
        if (decision.rationale.includes("hard_boundary_nav_content_transition")) {
          protectedNavBoundaryCount += 1;
        }
        next.push(left);
        continue;
      }

      changed = true;
      const merged: SectionGroup = {
        id: deterministicId("section-group", `${left.id}:${right.id}:${pass}`),
        blockIds: [...left.blockIds, ...right.blockIds],
        domIndexStart: Math.min(left.domIndexStart, right.domIndexStart),
        domIndexEnd: Math.max(left.domIndexEnd, right.domIndexEnd),
        rationale: [...left.rationale, ...right.rationale, ...decision.rationale],
        mergeDecisions: [...left.mergeDecisions, ...right.mergeDecisions, decision.decision],
      };
      next.push(merged);
      i += 1;
    }

    current = next;
    if (!changed) break;
  }

  if (current.length > 0 && input.groups.length > 1) {
    const uncertainBoundaries = current.filter((group) => group.mergeDecisions.some((entry) => entry.startsWith("hold") && entry.includes("semantic_boundary_conflict"))).length;
    if (uncertainBoundaries > 0) {
      input.diagnostics.push({
        code: "SECTION_BOUNDARY_UNCERTAIN",
        severity: "info",
        message: "One or more section boundaries remain uncertain after deterministic merge pass.",
        details: { uncertainBoundaries },
      });
    }
    if (protectedNavBoundaryCount > 0) {
      input.diagnostics.push({
        code: "NAVBAR_BOUNDARY_PROTECTED",
        severity: "info",
        message: "Navigation-like boundary was preserved to avoid over-merging into narrative content.",
        details: { protectedNavBoundaries: protectedNavBoundaryCount },
      });
    }
  }

  return current;
}

function groupToConsolidatedSection(group: SectionGroup, index: Map<string, RawBlock>, maxOrdinal: number): ConsolidatedSection {
  const blocks = groupSourceBlocks(group, index);
  const first = blocks[0]!;
  const avgTextDensity = mean(blocks.map((block) => block.textDensity));
  const avgDomDepth = mean(blocks.map((block) => block.domDepth));
  const avgChildElementCount = mean(blocks.map((block) => block.childElementCount));
  const textWordCount = blocks.reduce((sum, block) => sum + block.textWordCount, 0);
  const nodeComplexity = blocks.reduce((sum, block) => sum + block.nodeComplexity, 0);

  const headingCount = blocks.filter((block) => block.hasHeading).length;
  const imageCount = blocks.filter((block) => block.hasImages).length;
  const ctaCount = blocks.filter((block) => block.hasCTA).length;
  const anchorCount = blocks.reduce((sum, block) => sum + block.anchorCount, 0);
  const footerHintCount = blocks.filter((block) => block.hasFooterHint).length;
  const navHintCount = blocks.filter((block) => block.hasNavHint).length;
  const legalHintCount = blocks.filter((block) => block.hasLegalHint).length;
  const contactHintCount = blocks.filter((block) => block.hasContactHint).length;
  const repetitionScore = mean(blocks.map((block) => block.repetitionHint));

  const topWindow = Math.max(1, Math.floor(maxOrdinal * 0.32));
  const nearTop = group.domIndexStart <= topWindow;
  const nearBottom = group.domIndexEnd >= Math.max(0, maxOrdinal - 2);

  let heroCandidate = 0;
  let ctaCandidate = 0;
  let contentCandidate = 0;
  let footerCandidate = 0;
  let servicesCandidate = 0;
  let galleryCandidate = 0;

  if (nearTop) heroCandidate += 0.24;
  if (headingCount > 0) heroCandidate += 0.28;
  if (imageCount > 0) heroCandidate += 0.16;
  if (ctaCount > 0) heroCandidate += 0.15;
  if (textWordCount >= 10 && textWordCount <= 180) heroCandidate += 0.12;
  if (nearTop && headingCount > 0 && (ctaCount > 0 || imageCount > 0) && group.blockIds.length >= 2) heroCandidate += 0.18;

  if (ctaCount > 0) ctaCandidate += 0.35;
  if (textWordCount >= 8 && textWordCount <= 120) ctaCandidate += 0.2;
  if (headingCount > 0) ctaCandidate += 0.14;
  if (nearBottom) ctaCandidate -= 0.08;

  contentCandidate += avgTextDensity >= 0.2 ? 0.34 : 0.12;
  contentCandidate += headingCount > 0 ? 0.12 : 0;
  contentCandidate += textWordCount >= 40 ? 0.24 : textWordCount >= 16 ? 0.12 : 0;
  contentCandidate += nearTop ? 0.04 : 0.1;
  if (navHintCount > 0 && anchorCount >= 8 && textWordCount <= 50) contentCandidate = Math.max(0, contentCandidate - 0.2);

  if (nearBottom) footerCandidate += 0.24;
  if (footerHintCount > 0) footerCandidate += 0.36;
  if (legalHintCount > 0) footerCandidate += 0.3;
  if (contactHintCount > 0) footerCandidate += 0.18;
  if (ctaCount > 0 && headingCount > 0 && textWordCount > 18) footerCandidate -= 0.2;
  if (textWordCount >= 84 && headingCount > 0 && !nearBottom) footerCandidate -= 0.22;

  if (repetitionScore >= 0.35) servicesCandidate += 0.35;
  else if (repetitionScore >= 0.24) servicesCandidate += 0.24;
  else if (repetitionScore >= 0.14) servicesCandidate += 0.12;
  if (headingCount > 0) servicesCandidate += 0.14;
  if (textWordCount >= 20) servicesCandidate += 0.18;
  if (imageCount >= 2) servicesCandidate += 0.08;
  if (repetitionScore >= 0.45 && group.blockIds.length >= 2) servicesCandidate += 0.12;
  if (anchorCount >= 10 && textWordCount <= 70) servicesCandidate = Math.max(0, servicesCandidate - 0.14);

  if (imageCount >= 2) galleryCandidate += 0.34;
  if (repetitionScore >= 0.35) galleryCandidate += 0.17;
  if (avgTextDensity <= 0.22) galleryCandidate += 0.14;

  heroCandidate = clamp01(heroCandidate);
  ctaCandidate = clamp01(ctaCandidate);
  contentCandidate = clamp01(contentCandidate);
  footerCandidate = clamp01(footerCandidate);
  servicesCandidate = clamp01(servicesCandidate);
  galleryCandidate = clamp01(galleryCandidate);

  const confidence = round3(
    Math.max(heroCandidate, ctaCandidate, contentCandidate, footerCandidate, servicesCandidate, galleryCandidate) * 0.74 +
      Math.min(0.26, blocks.length * 0.04),
  );

  return {
    id: deterministicId("consolidated-section", `${first.domPath}:${group.blockIds.join(",")}`),
    blockIds: group.blockIds,
    domIndexStart: group.domIndexStart,
    domIndexEnd: group.domIndexEnd,
    sourceDomPaths: blocks.map((block) => block.domPath),
    signals: {
      hasHeading: headingCount > 0,
      hasImages: imageCount > 0,
      hasCTA: ctaCount > 0,
      textDensity: round3(avgTextDensity),
      textWordCount,
      nodeComplexity,
      avgDomDepth: Number(avgDomDepth.toFixed(3)),
      avgChildElementCount: Number(avgChildElementCount.toFixed(3)),
      headingCount,
      imageCount,
      ctaCount,
      anchorCount,
      footerHintCount,
      navHintCount,
      legalHintCount,
      contactHintCount,
      repetitionScore: round3(repetitionScore),
    },
    candidates: {
      heroCandidate: round3(heroCandidate),
      ctaCandidate: round3(ctaCandidate),
      contentCandidate: round3(contentCandidate),
      footerCandidate: round3(footerCandidate),
      servicesCandidate: round3(servicesCandidate),
      galleryCandidate: round3(galleryCandidate),
    },
    confidence,
    rationale: [
      `merged_blocks=${String(group.blockIds.length)}`,
      `word_count=${String(textWordCount)}`,
      `text_density=${round3(avgTextDensity).toFixed(3)}`,
      `heading_count=${String(headingCount)}`,
      `image_count=${String(imageCount)}`,
      `cta_count=${String(ctaCount)}`,
      `footer_hints=${String(footerHintCount + legalHintCount)}`,
      `repetition=${round3(repetitionScore).toFixed(3)}`,
    ],
    mergeDecisions: group.mergeDecisions,
  };
}

function applyFooterFalsePositiveMitigation(sections: ConsolidatedSection[], diagnostics: SectionConsolidationResult["diagnostics"]): ConsolidatedSection[] {
  const hasLargeContentAbove = sections.some(
    (section) => section.candidates.contentCandidate >= 0.52 && section.signals.textWordCount >= 60 && section.domIndexStart <= Math.max(2, Math.floor(sections.length * 0.6)),
  );

  return sections.map((section) => {
    if (section.candidates.footerCandidate < 0.5) return section;
    const shouldDemote = hasLargeContentAbove && section.signals.hasCTA && section.signals.headingCount > 0;
    if (!shouldDemote) return section;

    diagnostics.push({
      code: "FOOTER_FALSE_POSITIVE_PREVENTED",
      severity: "info",
      message: "Footer candidate was demoted because stronger content/CTA signals were present.",
      details: {
        sectionId: section.id,
        footerCandidate: section.candidates.footerCandidate,
      },
    });

    return {
      ...section,
      candidates: {
        ...section.candidates,
        footerCandidate: round3(Math.max(0, section.candidates.footerCandidate - 0.35)),
      },
      confidence: round3(Math.max(0.35, section.confidence - 0.08)),
      rationale: [...section.rationale, "footer_false_positive_mitigated"],
    };
  });
}

export function consolidateSections(input: { blocks: RawBlock[] }): SectionConsolidationResult {
  const ordered = input.blocks
    .slice()
    .sort((a, b) => a.ordinalIndex - b.ordinalIndex || a.domPath.localeCompare(b.domPath) || a.id.localeCompare(b.id));

  const diagnostics: SectionConsolidationResult["diagnostics"] = [];
  if (ordered.length === 0) {
    return {
      mode: "standard",
      deepFragmentationDetected: false,
      inputBlockCount: 0,
      outputSectionCount: 0,
      diagnostics,
      groups: [],
      sections: [],
    };
  }

  const deepFragmentationDetected = isDeepFragmentation(ordered);
  const mode: SectionConsolidationResult["mode"] = deepFragmentationDetected ? "aggressive" : "standard";

  const blockIndex = new Map<string, RawBlock>(ordered.map((block) => [block.id, block]));

  const baseGroups: SectionGroup[] = ordered.map((block) => ({
    id: deterministicId("section-group", block.id),
    blockIds: [block.id],
    domIndexStart: block.ordinalIndex,
    domIndexEnd: block.ordinalIndex,
    rationale: ["initial_block"],
    mergeDecisions: [],
  }));

  diagnostics.push({
    code: "SECTION_CONSOLIDATION_APPLIED",
    severity: "info",
    message: "Deterministic section consolidation pass was applied.",
    details: {
      mode,
      inputBlockCount: ordered.length,
    },
  });

  const mergedGroups = mergeAdjacentGroups({
    groups: baseGroups,
    index: blockIndex,
    aggressive: mode === "aggressive",
    diagnostics,
  });

  const mergedCount = Math.max(0, baseGroups.length - mergedGroups.length);
  if (mergedCount === 0) {
    diagnostics.push({
      code: "SECTION_MERGE_MINIMAL",
      severity: "info",
      message: "No deterministic section merges were applied.",
      details: { inputBlockCount: ordered.length },
    });
  } else if (mergedCount >= Math.max(2, Math.floor(baseGroups.length / 3))) {
    diagnostics.push({
      code: "SECTION_MERGE_HEAVY",
      severity: "warning",
      message: "Heavy section merge mode applied to reduce deep fragmentation.",
      details: {
        mergedCount,
        inputBlockCount: ordered.length,
        outputSectionCount: mergedGroups.length,
      },
    });
  }

  const maxOrdinal = ordered[ordered.length - 1]?.ordinalIndex ?? 0;
  const sections = applyFooterFalsePositiveMitigation(
    mergedGroups.map((group) => groupToConsolidatedSection(group, blockIndex, maxOrdinal)),
    diagnostics,
  ).sort((a, b) => a.domIndexStart - b.domIndexStart || a.id.localeCompare(b.id));

  return {
    mode,
    deepFragmentationDetected,
    inputBlockCount: ordered.length,
    outputSectionCount: sections.length,
    diagnostics,
    groups: mergedGroups,
    sections,
  };
}
