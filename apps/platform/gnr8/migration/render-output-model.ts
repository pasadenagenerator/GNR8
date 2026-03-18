import type { LayoutPreparationModel, LayoutPreparationPageEligibilityStatus } from "./layout-preparation-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Deterministic Render Output (deterministic; intentionally simple)
 * -----------------------------------------------------------------------
 *
 * Purpose:
 * - Convert `LayoutPreparationModel` into a stable, explicit render boundary output.
 * - Provide compact, traceable "render nodes" that can later drive preview/export/apply steps.
 *
 * Non-goals (phase-1):
 * - No browser preview UI, no CSS intelligence, no responsive optimization, no semantic component inference.
 * - No full HTML snapshots or full DOM payloads embedded in the output.
 *
 * Phase-1 mapping rule (normative; fixed & replayable):
 * - Each `LayoutPreparationBlockRecord` becomes exactly one top-level `RenderNodeRecord`.
 * - Block order is preserved canonically by `ordinalIndex` (0-based).
 * - Every render node uses a stable wrapper tag name: `"section"`.
 * - Unsupported/unknown source tags are not special-cased; their original `sourceTagName` is preserved for traceability.
 *
 * Status computation rule (normative):
 * - `blocked` if `layoutPreparation.status === "blocked"` OR there are no eligible pages.
 * - `ready` if not blocked AND `layoutPreparation.status === "ready"` AND there are no ineligible pages.
 * - `ready_with_warnings` otherwise.
 */

export const RENDER_OUTPUT_MODEL_VERSION = "1.1.0" as const;

export type RenderOutputStatus = "ready" | "ready_with_warnings" | "blocked";

export type RenderNodeKind = "layout_block_section_v1";

export type RenderTagName = "section";

export type RenderNodeRecord = {
  nodeId: string;
  sourceBlockId: string;
  kind: RenderNodeKind;
  ordinalIndex: number;
  sourceTagName: string;
  renderTagName: RenderTagName;
  textPresent: boolean;
  /**
   * Deterministic excerpt from source subtree text (if any).
   * - `null` when no non-whitespace text nodes were found.
   */
  textExcerpt: string | null;
  childElementCount: number;
  assetReferenceIds: string[];
};

export type RenderedPageEligibilityStatus = LayoutPreparationPageEligibilityStatus;

export type RenderedPageRecord = {
  renderedPageId: string;
  sourcePageId: string;
  sourceDocumentId: string;
  sourcePath: string;
  isEntry: boolean;
  eligibility: RenderedPageEligibilityStatus;
  renderedNodeCount: number;
  nodes: RenderNodeRecord[];
};

export type RenderedPageSummary = {
  renderedPageId: string;
  sourcePageId: string;
  sourcePath: string;
  eligibility: RenderedPageEligibilityStatus;
  renderedNodeCount: number;
};

export type RenderOutput = {
  kind: "render_output_v1";
  modelVersion: typeof RENDER_OUTPUT_MODEL_VERSION;

  mapping: {
    rule: "layout_blocks_to_section_nodes_v1";
    wrapperTagName: RenderTagName;
  };

  source: {
    layoutPreparationKind: LayoutPreparationModel["kind"];
    layoutPreparationModelVersion: LayoutPreparationModel["modelVersion"];
    preparedSiteKind: LayoutPreparationModel["source"]["preparedSiteKind"];
    preparedSiteModelVersion: LayoutPreparationModel["source"]["preparedSiteModelVersion"];
    importContractVersion: LayoutPreparationModel["source"]["importContractVersion"];
    importManifestVersion: LayoutPreparationModel["source"]["importManifestVersion"];
    fingerprints: LayoutPreparationModel["source"]["fingerprints"];
  };

  status: RenderOutputStatus;

  siteSummary: {
    pageCount: number;
    eligiblePageCount: number;
    ineligiblePageCount: number;
    renderedNodeCount: number;
  };

  diagnostics: {
    carried: {
      import: LayoutPreparationModel["diagnostics"]["carried"]["import"];
    };
    renderer: {
      warnings: {
        codes: string[];
      };
    };
  };

  pages: RenderedPageRecord[];
  pageSummaries: RenderedPageSummary[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function renderedPageIdFor(sourcePageId: string): string {
  return sha256Hex(
    stableStringify({
      kind: "rendered_page_v1",
      sourcePageId,
    }),
  );
}

function renderNodeIdFor(input: { sourcePageId: string; sourceBlockId: string }): string {
  return sha256Hex(
    stableStringify({
      kind: "render_node_v1",
      sourcePageId: input.sourcePageId,
      sourceBlockId: input.sourceBlockId,
    }),
  );
}

function computeRenderStatus(input: {
  layoutStatus: LayoutPreparationModel["status"];
  eligiblePageCount: number;
  ineligiblePageCount: number;
}): RenderOutputStatus {
  if (input.layoutStatus === "blocked" || input.eligiblePageCount === 0) return "blocked";
  if (input.layoutStatus === "ready" && input.ineligiblePageCount === 0) return "ready";
  return "ready_with_warnings";
}

/**
 * Deterministically derives RenderOutput from LayoutPreparationModel.
 */
export function createRenderOutput(layoutPreparation: LayoutPreparationModel): RenderOutput {
  const pagesInCanonicalOrder = [...layoutPreparation.pages].sort((a, b) => {
    if (a.sourcePath !== b.sourcePath) return stringCmp(a.sourcePath, b.sourcePath);
    if (a.pageId !== b.pageId) return stringCmp(a.pageId, b.pageId);
    if (a.sourceDocumentId !== b.sourceDocumentId) return stringCmp(a.sourceDocumentId, b.sourceDocumentId);
    return 0;
  });

  const pages: RenderedPageRecord[] = [];
  const pageSummaries: RenderedPageSummary[] = [];

  let eligiblePageCount = 0;
  let ineligiblePageCount = 0;
  let renderedNodeCount = 0;
  const warningCodes = new Set<string>();

  for (const page of pagesInCanonicalOrder) {
    if (page.eligibility === "eligible") eligiblePageCount++;
    else {
      ineligiblePageCount++;
      warningCodes.add("INELIGIBLE_PAGE_SKIPPED");
    }

    const renderedPageId = renderedPageIdFor(page.pageId);
    const blocksInCanonicalOrder = [...page.blocks].sort((a, b) => {
      if (a.ordinalIndex !== b.ordinalIndex) return a.ordinalIndex - b.ordinalIndex;
      if (a.sourceDomPath !== b.sourceDomPath) return stringCmp(a.sourceDomPath, b.sourceDomPath);
      return stringCmp(a.id, b.id);
    });

    const nodes: RenderNodeRecord[] = [];
    if (page.eligibility === "eligible") {
      for (const block of blocksInCanonicalOrder) {
        nodes.push({
          nodeId: renderNodeIdFor({ sourcePageId: page.pageId, sourceBlockId: block.id }),
          sourceBlockId: block.id,
          kind: "layout_block_section_v1",
          ordinalIndex: block.ordinalIndex,
          sourceTagName: block.sourceTagName,
          renderTagName: "section",
          textPresent: block.textPresent,
          textExcerpt: block.textExcerpt,
          childElementCount: block.childElementCount,
          assetReferenceIds: [...block.assetReferenceIds].slice().sort(stringCmp),
        });
      }
    }

    renderedNodeCount += nodes.length;

    const renderedPage: RenderedPageRecord = {
      renderedPageId,
      sourcePageId: page.pageId,
      sourceDocumentId: page.sourceDocumentId,
      sourcePath: page.sourcePath,
      isEntry: page.isEntry,
      eligibility: page.eligibility,
      renderedNodeCount: nodes.length,
      nodes,
    };

    pages.push(renderedPage);
    pageSummaries.push({
      renderedPageId,
      sourcePageId: page.pageId,
      sourcePath: page.sourcePath,
      eligibility: page.eligibility,
      renderedNodeCount: nodes.length,
    });
  }

  const status = computeRenderStatus({
    layoutStatus: layoutPreparation.status,
    eligiblePageCount,
    ineligiblePageCount,
  });

  return {
    kind: "render_output_v1",
    modelVersion: RENDER_OUTPUT_MODEL_VERSION,
    mapping: {
      rule: "layout_blocks_to_section_nodes_v1",
      wrapperTagName: "section",
    },
    source: {
      layoutPreparationKind: layoutPreparation.kind,
      layoutPreparationModelVersion: layoutPreparation.modelVersion,
      preparedSiteKind: layoutPreparation.source.preparedSiteKind,
      preparedSiteModelVersion: layoutPreparation.source.preparedSiteModelVersion,
      importContractVersion: layoutPreparation.source.importContractVersion,
      importManifestVersion: layoutPreparation.source.importManifestVersion,
      fingerprints: layoutPreparation.source.fingerprints,
    },
    status,
    siteSummary: {
      pageCount: pages.length,
      eligiblePageCount,
      ineligiblePageCount,
      renderedNodeCount,
    },
    diagnostics: {
      carried: {
        import: layoutPreparation.diagnostics.carried.import,
      },
      renderer: {
        warnings: {
          codes: [...warningCodes].sort(stringCmp),
        },
      },
    },
    pages,
    pageSummaries,
  };
}
