import type { PreparedDocumentRecord, PreparedSiteModel, PreparedSitePreparationStatus } from "./prepared-site-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Layout Preparation Model (deterministic; renderer-agnostic)
 * -----------------------------------------------------------------
 *
 * Purpose:
 * - Convert `PreparedSiteModel` into a stable, render-ready *structural* representation.
 * - Provide an explicit handoff payload between preparation and (future) deterministic rendering.
 *
 * Non-goals (phase-1):
 * - No visual rendering, CSS generation, component library mapping, semantic labeling, or AI logic.
 * - No duplication of full DOM payloads in the output model.
 *
 * Block extraction rule (normative; phase-1):
 * - For each prepared document:
 *   - Start at `<body>` child elements in canonical DOM order.
 *   - Promote through a transparent single-child wrapper chain while all conditions hold:
 *     - boundary has exactly one element child
 *     - that only child has exactly one element child
 *     - that only child has no direct non-whitespace text nodes
 *   - Stop promotion at the first non-transparent boundary.
 *   - The final boundary child elements become blocks.
 *   - If the final boundary has no child elements, its single boundary element becomes the block.
 *   - Blocks preserve canonical order as they appear at the final extraction boundary (ordinal index, 0-based).
 *   - Non-element nodes (text/comments) at `<body>` top level are ignored for block creation.
 *   - If `<body>` is unavailable or there are no usable body child elements, `blocks: []` is emitted.
 *
 * Status computation rule (normative):
 * - `blocked` if `preparedSite.status === "blocked"` OR there are no pages.
 * - `ready` if not blocked AND `preparedSite.status === "ready"` AND all pages are `eligible`.
 * - `ready_with_warnings` otherwise.
 */

export const LAYOUT_PREPARATION_MODEL_VERSION = "1.2.0" as const;

export type LayoutPreparationStatus = "ready" | "ready_with_warnings" | "blocked";

export type LayoutPreparationPageEligibilityStatus =
  | "eligible"
  | "ineligible_blocked"
  | "ineligible_missing_dom_outline"
  | "ineligible_missing_body";

export type LayoutPreparationBlockRecord = {
  id: string;
  sourceTagName: string;
  sourceDomPath: string;
  ordinalIndex: number;
  childElementCount: number;
  textPresent: boolean;
  /**
   * Deterministic excerpt from source subtree text (if any).
   * - `null` when no non-whitespace text nodes were found.
   */
  textExcerpt: string | null;
  assetReferenceIds: string[];
};

export type LayoutPreparationPageRecord = {
  pageId: string;
  sourceDocumentId: string;
  sourcePath: string;
  isEntry: boolean;

  eligibility: LayoutPreparationPageEligibilityStatus;
  effectivelyEmpty: boolean;
  nodeCount: number;
  parseWarningCount: number;

  assetReferenceIds: string[];
  blocks: LayoutPreparationBlockRecord[];

  blockExtraction: {
    rule: "body_child_elements_with_single_child_wrapper_promotion_v2";
    bodyAvailable: boolean;
    bodyChildElementCount: number;
    extractionBoundaryDomPath: string | null;
    promotionDepth: number;
    usedBoundaryChildElementCount: number;
  };
};

export type LayoutPreparationPageSummary = {
  pageId: string;
  sourcePath: string;
  eligibility: LayoutPreparationPageEligibilityStatus;
  blockCount: number;
  effectivelyEmpty: boolean;
};

export type LayoutPreparationModel = {
  kind: "layout_preparation_model_v1";
  modelVersion: typeof LAYOUT_PREPARATION_MODEL_VERSION;

  source: {
    preparedSiteKind: PreparedSiteModel["kind"];
    preparedSiteModelVersion: PreparedSiteModel["modelVersion"];
    importContractVersion: PreparedSiteModel["source"]["importContractVersion"];
    importManifestVersion: PreparedSiteModel["source"]["importManifestVersion"];
    fingerprints: PreparedSiteModel["source"]["fingerprints"];
  };

  status: LayoutPreparationStatus;

  siteSummary: {
    pageCount: number;
    eligiblePageCount: number;
    ineligiblePageCount: number;
    totalBlockCount: number;
    effectivelyEmptyPageCount: number;
  };

  diagnostics: {
    carried: {
      import: PreparedSiteModel["diagnostics"]["import"];
    };
  };

  pages: LayoutPreparationPageRecord[];
  pageSummaries: LayoutPreparationPageSummary[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function pageIdForDocument(doc: PreparedDocumentRecord): string {
  // Phase-1: page id is stable and tied directly to the prepared document id.
  return doc.id;
}

function blockIdFor(input: { pageId: string; sourceDomPath: string; ordinalIndex: number }): string {
  return sha256Hex(
    stableStringify({
      kind: "layout_block_v1",
      pageId: input.pageId,
      sourceDomPath: input.sourceDomPath,
      ordinalIndex: input.ordinalIndex,
    }),
  );
}

function eligibilityFor(input: {
  preparedSiteStatus: PreparedSitePreparationStatus;
  domOutlineAvailable: boolean;
  bodyAvailable: boolean;
}): LayoutPreparationPageEligibilityStatus {
  if (input.preparedSiteStatus === "blocked") return "ineligible_blocked";
  if (!input.domOutlineAvailable) return "ineligible_missing_dom_outline";
  if (!input.bodyAvailable) return "ineligible_missing_body";
  return "eligible";
}

function computeLayoutStatus(input: {
  preparedSiteStatus: PreparedSitePreparationStatus;
  pageCount: number;
  eligiblePageCount: number;
}): LayoutPreparationStatus {
  if (input.preparedSiteStatus === "blocked" || input.pageCount === 0) return "blocked";
  if (input.preparedSiteStatus === "ready" && input.eligiblePageCount === input.pageCount) return "ready";
  return "ready_with_warnings";
}

function extractBlocksFromBodyWithWrapperPromotion(input: {
  bodyChildElements: NonNullable<PreparedDocumentRecord["domOutline"]>["bodyChildElements"];
}): {
  boundaryChildren: NonNullable<PreparedDocumentRecord["domOutline"]>["bodyChildElements"];
  extractionBoundaryDomPath: string | null;
  promotionDepth: number;
} {
  let boundaryChildren = input.bodyChildElements;
  let extractionBoundaryDomPath: string | null = "html>body";
  let promotionDepth = 0;

  while (boundaryChildren.length === 1) {
    const only = boundaryChildren[0]!;
    if (only.directTextPresent) break;
    if (only.childElementCount === 1) {
      extractionBoundaryDomPath = only.domPath;
      boundaryChildren = only.childElements;
      promotionDepth++;
      continue;
    }
    if (only.childElementCount > 1) {
      extractionBoundaryDomPath = only.domPath;
      boundaryChildren = only.childElements;
    }
    break;
  }

  return {
    boundaryChildren,
    extractionBoundaryDomPath,
    promotionDepth,
  };
}

export function createLayoutPreparationModel(preparedSite: PreparedSiteModel): LayoutPreparationModel {
  const pagesInCanonicalOrder = [...preparedSite.documents].sort((a, b) => {
    if (a.path !== b.path) return stringCmp(a.path, b.path);
    if (a.id !== b.id) return stringCmp(a.id, b.id);
    return 0;
  });

  const pages: LayoutPreparationPageRecord[] = [];
  const pageSummaries: LayoutPreparationPageSummary[] = [];

  let eligiblePageCount = 0;
  let totalBlockCount = 0;
  let effectivelyEmptyPageCount = 0;

  for (const doc of pagesInCanonicalOrder) {
    const pageId = pageIdForDocument(doc);

    const domOutlineAvailable = doc.domOutline !== null;
    const eligibility = eligibilityFor({
      preparedSiteStatus: preparedSite.status,
      domOutlineAvailable,
      bodyAvailable: doc.domOutline?.bodyAvailable ?? false,
    });
    if (eligibility === "eligible") eligiblePageCount++;

    if (doc.effectivelyEmpty) effectivelyEmptyPageCount++;

    const blocks: LayoutPreparationBlockRecord[] = [];
    const bodyAvailable = doc.domOutline?.bodyAvailable ?? false;
    const bodyChildElements = doc.domOutline?.bodyChildElements ?? [];

    const extracted = extractBlocksFromBodyWithWrapperPromotion({ bodyChildElements });
    const extractionCandidates = extracted.boundaryChildren.length > 0 ? extracted.boundaryChildren : [];

    if (eligibility === "eligible" && bodyAvailable && extractionCandidates.length > 0) {
      for (const child of extractionCandidates) {
        const block: LayoutPreparationBlockRecord = {
          id: blockIdFor({ pageId, sourceDomPath: child.domPath, ordinalIndex: child.ordinalIndex }),
          sourceTagName: child.tagName,
          sourceDomPath: child.domPath,
          ordinalIndex: child.ordinalIndex,
          childElementCount: child.childElementCount,
          textPresent: child.textPresent,
          textExcerpt: child.textExcerpt,
          assetReferenceIds: [],
        };
        blocks.push(block);
      }
    }

    totalBlockCount += blocks.length;

    const page: LayoutPreparationPageRecord = {
      pageId,
      sourceDocumentId: doc.id,
      sourcePath: doc.path,
      isEntry: doc.isEntry,
      eligibility,
      effectivelyEmpty: doc.effectivelyEmpty,
      nodeCount: doc.nodeCount,
      parseWarningCount: doc.parseWarningCount,
      assetReferenceIds: [...doc.assetReferenceIds].slice().sort(stringCmp),
      blocks,
      blockExtraction: {
        rule: "body_child_elements_with_single_child_wrapper_promotion_v2",
        bodyAvailable,
        bodyChildElementCount: bodyChildElements.length,
        extractionBoundaryDomPath: bodyAvailable ? extracted.extractionBoundaryDomPath : null,
        promotionDepth: bodyAvailable ? extracted.promotionDepth : 0,
        usedBoundaryChildElementCount: blocks.length,
      },
    };

    pages.push(page);
    pageSummaries.push({
      pageId,
      sourcePath: doc.path,
      eligibility,
      blockCount: blocks.length,
      effectivelyEmpty: doc.effectivelyEmpty,
    });
  }

  const status = computeLayoutStatus({
    preparedSiteStatus: preparedSite.status,
    pageCount: pages.length,
    eligiblePageCount,
  });

  return {
    kind: "layout_preparation_model_v1",
    modelVersion: LAYOUT_PREPARATION_MODEL_VERSION,
    source: {
      preparedSiteKind: preparedSite.kind,
      preparedSiteModelVersion: preparedSite.modelVersion,
      importContractVersion: preparedSite.source.importContractVersion,
      importManifestVersion: preparedSite.source.importManifestVersion,
      fingerprints: preparedSite.source.fingerprints,
    },
    status,
    siteSummary: {
      pageCount: pages.length,
      eligiblePageCount,
      ineligiblePageCount: pages.length - eligiblePageCount,
      totalBlockCount,
      effectivelyEmptyPageCount,
    },
    diagnostics: {
      carried: {
        import: preparedSite.diagnostics.import,
      },
    },
    pages,
    pageSummaries,
  };
}
