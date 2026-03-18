import type { RenderOutput, RenderOutputStatus, RenderedPageEligibilityStatus, RenderedPageRecord } from "./render-output-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Deterministic Preview Document (deterministic; intentionally simple)
 * --------------------------------------------------------------------------
 *
 * Purpose:
 * - Convert `RenderOutput` into a stable, explicit, inspectable preview artifact.
 * - Provide page-level preview payloads that can later be rendered by a UI without redesigning the contract.
 *
 * Non-goals (phase-1):
 * - No browser UI, no styling intelligence, no semantic reconstruction, no responsive logic.
 * - No client-side JS required for preview generation.
 *
 * Phase-1 preview generation rule (normative; fixed & replayable):
 * - Each `RenderedPageRecord` becomes exactly one `PreviewPageRecord`.
 * - Page order is canonical by (`sourcePath`, `sourcePageId`, `sourceDocumentId`, `renderedPageId`).
 * - A page is `previewable` iff `RenderedPageRecord.eligibility === "eligible"`.
 * - Each `RenderNodeRecord` becomes exactly one stable `<section>` element in the preview markup.
 * - Node/section order is canonical by (`ordinalIndex`, `nodeId`, `sourceBlockId`).
 * - Unsupported node kinds still map to a generic `<section>` container and preserve `data-render-node-kind`.
 * - Preview markup contains stable skeleton structure + data attributes for traceability.
 *
 * Phase-1 deterministic visible content projection (normative; fixed & replayable):
 * - Each preview section contains a compact visible header + body to make the preview inspectable by humans.
 * - Text projection rule:
 *   - If `RenderNodeRecord.textExcerpt` is non-null, render it as the visible body text.
 *   - The excerpt is deterministic and derived upstream from text nodes in the source subtree:
 *     - traverse in document order, normalize whitespace (collapse to single spaces, trim)
 *     - cap at 160 characters and append "…" when truncated.
 * - Fallback rule (textless blocks):
 *   - If `textExcerpt` is null, render a deterministic placeholder including structural facts:
 *     `"[no text] tag=<sourceTagName> children=<childElementCount> assets=<assetReferenceCount>"`
 * - Ordering rule:
 *   - Visible header/body order is fixed (header first, then body) and follows the canonical section order.
 * - Styling:
 *   - Minimal inline CSS is embedded only to make sections visible and distinguishable; no semantic styling.
 *
 * Preview status computation rule (normative):
 * - `blocked` if `renderOutput.status === "blocked"` OR there are no previewable pages.
 * - `ready` if not blocked AND `renderOutput.status === "ready"` AND there are no preview warnings.
 * - `ready_with_warnings` otherwise.
 */

export const PREVIEW_DOCUMENT_MODEL_VERSION = "1.1.0" as const;

export type PreviewDocumentStatus = "ready" | "ready_with_warnings" | "blocked";

export type PreviewPageEligibilityStatus = "previewable" | "not_previewable";

export type PreviewMarkupPayload = {
  kind: "preview_markup_html_v1";
  html: string;
};

export type PreviewPageRecord = {
  previewPageId: string;
  sourceRenderedPageId: string;
  sourcePageId: string;
  sourceDocumentId: string;
  sourcePath: string;
  isEntry: boolean;

  previewEligibility: PreviewPageEligibilityStatus;
  previewNodeCount: number;
  /**
   * Render node ids in the exact order used to build the preview payload.
   * This provides deterministic traceability without duplicating full node payloads.
   */
  sourceRenderedNodeIds: string[];

  preview: PreviewMarkupPayload;
};

export type PreviewPageSummary = {
  previewPageId: string;
  sourceRenderedPageId: string;
  sourcePageId: string;
  sourcePath: string;
  previewEligibility: PreviewPageEligibilityStatus;
  previewNodeCount: number;
};

export type PreviewDocument = {
  kind: "preview_document_v1";
  modelVersion: typeof PREVIEW_DOCUMENT_MODEL_VERSION;

  mapping: {
    rule: "render_output_to_preview_document_v1";
    pageRule: "rendered_pages_to_preview_pages_v1";
    nodeRule: "render_nodes_to_section_markup_v1";
    wrapperTagName: "section";
  };

  source: {
    renderOutputKind: RenderOutput["kind"];
    renderOutputModelVersion: RenderOutput["modelVersion"];
    renderMappingRule: RenderOutput["mapping"]["rule"];
    layoutPreparationKind: RenderOutput["source"]["layoutPreparationKind"];
    layoutPreparationModelVersion: RenderOutput["source"]["layoutPreparationModelVersion"];
    preparedSiteKind: RenderOutput["source"]["preparedSiteKind"];
    preparedSiteModelVersion: RenderOutput["source"]["preparedSiteModelVersion"];
    importContractVersion: RenderOutput["source"]["importContractVersion"];
    importManifestVersion: RenderOutput["source"]["importManifestVersion"];
    fingerprints: RenderOutput["source"]["fingerprints"];
  };

  status: PreviewDocumentStatus;

  siteSummary: {
    pageCount: number;
    previewablePageCount: number;
    notPreviewablePageCount: number;
    previewNodeCount: number;
  };

  diagnostics: {
    carried: {
      import: RenderOutput["diagnostics"]["carried"]["import"];
    };
    preview: {
      warnings: {
        codes: string[];
      };
    };
  };

  pages: PreviewPageRecord[];
  pageSummaries: PreviewPageSummary[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function previewPageIdFor(input: { sourceRenderedPageId: string; sourcePageId: string }): string {
  return sha256Hex(
    stableStringify({
      kind: "preview_page_v1",
      sourceRenderedPageId: input.sourceRenderedPageId,
      sourcePageId: input.sourcePageId,
    }),
  );
}

function previewSectionIdFor(input: { sourceRenderedNodeId: string }): string {
  return sha256Hex(
    stableStringify({
      kind: "preview_section_v1",
      sourceRenderedNodeId: input.sourceRenderedNodeId,
    }),
  );
}

function escapeHtmlAttr(value: string): string {
  // Stable, minimal escaping for attribute contexts.
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlText(value: string): string {
  // Stable, minimal escaping for text-node contexts.
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function pageEligibilityToPreviewEligibility(eligibility: RenderedPageEligibilityStatus): PreviewPageEligibilityStatus {
  return eligibility === "eligible" ? "previewable" : "not_previewable";
}

function computePreviewStatus(input: {
  renderStatus: RenderOutputStatus;
  previewablePageCount: number;
  warningCodes: string[];
}): PreviewDocumentStatus {
  if (input.renderStatus === "blocked" || input.previewablePageCount === 0) return "blocked";
  if (input.renderStatus === "ready" && input.warningCodes.length === 0) return "ready";
  return "ready_with_warnings";
}

function canonicalRenderedPages(renderOutput: RenderOutput): RenderedPageRecord[] {
  return [...renderOutput.pages].sort((a, b) => {
    if (a.sourcePath !== b.sourcePath) return stringCmp(a.sourcePath, b.sourcePath);
    if (a.sourcePageId !== b.sourcePageId) return stringCmp(a.sourcePageId, b.sourcePageId);
    if (a.sourceDocumentId !== b.sourceDocumentId) return stringCmp(a.sourceDocumentId, b.sourceDocumentId);
    if (a.renderedPageId !== b.renderedPageId) return stringCmp(a.renderedPageId, b.renderedPageId);
    return 0;
  });
}

function buildPreviewMarkupForPage(input: {
  page: RenderedPageRecord;
  previewPageId: string;
  previewEligibility: PreviewPageEligibilityStatus;
}): { html: string; sourceRenderedNodeIds: string[]; previewNodeCount: number } {
  const renderedNodesInCanonicalOrder = [...input.page.nodes].sort((a, b) => {
    if (a.ordinalIndex !== b.ordinalIndex) return a.ordinalIndex - b.ordinalIndex;
    if (a.nodeId !== b.nodeId) return stringCmp(a.nodeId, b.nodeId);
    return stringCmp(a.sourceBlockId, b.sourceBlockId);
  });

  const sourceRenderedNodeIds =
    input.previewEligibility === "previewable" ? renderedNodesInCanonicalOrder.map((n) => n.nodeId) : [];

  const lines: string[] = [];
  lines.push("<!doctype html>");
  lines.push(`<html data-gnr8-preview-model-version="${PREVIEW_DOCUMENT_MODEL_VERSION}">`);
  lines.push("<head>");
  lines.push('<meta charset="utf-8">');
  lines.push(`<title>${escapeHtmlAttr(input.page.sourcePath)}</title>`);
  lines.push("<style>");
  lines.push("  :root { color-scheme: light; }");
  lines.push("  body { margin: 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }");
  lines.push("  main { max-width: 980px; margin: 0 auto; }");
  lines.push(
    "  section[data-preview-section-id] { border: 1px solid #d1d5db; background: #f9fafb; padding: 10px 12px; margin: 10px 0; }",
  );
  lines.push(
    "  .gnr8-preview-header { font: 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #111827; margin: 0 0 6px; }",
  );
  lines.push(
    "  .gnr8-preview-meta { font: 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #4b5563; margin: 0; }",
  );
  lines.push("  .gnr8-preview-text { font-size: 13px; color: #111827; margin: 8px 0 0; white-space: pre-wrap; }");
  lines.push("</style>");
  lines.push("</head>");
  lines.push(
    `<body data-preview-page-id="${input.previewPageId}" data-source-rendered-page-id="${escapeHtmlAttr(
      input.page.renderedPageId,
    )}" data-source-page-id="${escapeHtmlAttr(input.page.sourcePageId)}" data-source-document-id="${escapeHtmlAttr(
      input.page.sourceDocumentId,
    )}" data-source-path="${escapeHtmlAttr(input.page.sourcePath)}" data-is-entry="${input.page.isEntry ? "true" : "false"}" data-preview-eligibility="${input.previewEligibility}">`,
  );
  lines.push("<main>");

  if (input.previewEligibility !== "previewable") {
    lines.push(
      `<section data-preview-note="not_previewable" data-source-page-eligibility="${escapeHtmlAttr(
        input.page.eligibility,
      )}"></section>`,
    );
  } else {
    for (const node of renderedNodesInCanonicalOrder) {
      const previewSectionId = previewSectionIdFor({ sourceRenderedNodeId: node.nodeId });
      const assetReferenceCount = node.assetReferenceIds.length;
      const visibleHeader = `#${node.ordinalIndex} <${node.sourceTagName}> (${node.kind})`;
      const visibleMeta = `node=${shortId(node.nodeId)} block=${shortId(node.sourceBlockId)} children=${String(
        node.childElementCount,
      )} assets=${String(assetReferenceCount)} textPresent=${node.textPresent ? "true" : "false"}`;

      const projectedText =
        node.textExcerpt !== null
          ? { kind: "excerpt" as const, text: node.textExcerpt }
          : {
              kind: "fallback" as const,
              text: `[no text] tag=${node.sourceTagName} children=${String(node.childElementCount)} assets=${String(
                assetReferenceCount,
              )}`,
            };

      // Stable attribute order is intentional for diff friendliness.
      lines.push(
        `<section data-preview-section-id="${previewSectionId}" data-render-node-id="${escapeHtmlAttr(
          node.nodeId,
        )}" data-render-node-kind="${escapeHtmlAttr(node.kind)}" data-source-block-id="${escapeHtmlAttr(
          node.sourceBlockId,
        )}" data-ordinal-index="${String(node.ordinalIndex)}" data-source-tag-name="${escapeHtmlAttr(
          node.sourceTagName,
        )}" data-text-present="${node.textPresent ? "true" : "false"}" data-child-element-count="${String(
          node.childElementCount,
        )}" data-asset-reference-count="${String(assetReferenceCount)}">` +
          `<div data-preview-visible="true" data-preview-text-projection="${projectedText.kind}">` +
          `<div class="gnr8-preview-header">${escapeHtmlText(visibleHeader)}</div>` +
          `<div class="gnr8-preview-meta">${escapeHtmlText(visibleMeta)}</div>` +
          `<div class="gnr8-preview-text">${escapeHtmlText(projectedText.text)}</div>` +
          `</div>` +
          `</section>`,
      );
    }
  }

  lines.push("</main>");
  lines.push("</body>");
  lines.push("</html>");

  return {
    html: `${lines.join("\n")}\n`,
    sourceRenderedNodeIds,
    previewNodeCount: sourceRenderedNodeIds.length,
  };
}

/**
 * Deterministically derives PreviewDocument from RenderOutput.
 */
export function createPreviewDocument(renderOutput: RenderOutput): PreviewDocument {
  const pagesInCanonicalOrder = canonicalRenderedPages(renderOutput);

  const pages: PreviewPageRecord[] = [];
  const pageSummaries: PreviewPageSummary[] = [];
  const warningCodes = new Set<string>();

  let previewablePageCount = 0;
  let notPreviewablePageCount = 0;
  let previewNodeCount = 0;

  for (const page of pagesInCanonicalOrder) {
    const previewEligibility = pageEligibilityToPreviewEligibility(page.eligibility);
    if (previewEligibility === "previewable") previewablePageCount++;
    else {
      notPreviewablePageCount++;
      warningCodes.add("INELIGIBLE_PAGE_NOT_PREVIEWABLE");
    }

    const previewPageId = previewPageIdFor({ sourceRenderedPageId: page.renderedPageId, sourcePageId: page.sourcePageId });
    const built = buildPreviewMarkupForPage({ page, previewPageId, previewEligibility });

    previewNodeCount += built.previewNodeCount;
    if (previewEligibility === "previewable" && built.previewNodeCount === 0) warningCodes.add("PREVIEWABLE_PAGE_HAS_NO_NODES");

    pages.push({
      previewPageId,
      sourceRenderedPageId: page.renderedPageId,
      sourcePageId: page.sourcePageId,
      sourceDocumentId: page.sourceDocumentId,
      sourcePath: page.sourcePath,
      isEntry: page.isEntry,
      previewEligibility,
      previewNodeCount: built.previewNodeCount,
      sourceRenderedNodeIds: built.sourceRenderedNodeIds,
      preview: { kind: "preview_markup_html_v1", html: built.html },
    });

    pageSummaries.push({
      previewPageId,
      sourceRenderedPageId: page.renderedPageId,
      sourcePageId: page.sourcePageId,
      sourcePath: page.sourcePath,
      previewEligibility,
      previewNodeCount: built.previewNodeCount,
    });
  }

  if (previewablePageCount === 0) warningCodes.add("NO_PREVIEWABLE_PAGES");
  if (renderOutput.diagnostics.renderer.warnings.codes.length > 0) warningCodes.add("RENDER_OUTPUT_WARNINGS_CARRIED");

  const warningCodeList = [...warningCodes].sort(stringCmp);
  const status = computePreviewStatus({
    renderStatus: renderOutput.status,
    previewablePageCount,
    warningCodes: warningCodeList,
  });

  return {
    kind: "preview_document_v1",
    modelVersion: PREVIEW_DOCUMENT_MODEL_VERSION,
    mapping: {
      rule: "render_output_to_preview_document_v1",
      pageRule: "rendered_pages_to_preview_pages_v1",
      nodeRule: "render_nodes_to_section_markup_v1",
      wrapperTagName: "section",
    },
    source: {
      renderOutputKind: renderOutput.kind,
      renderOutputModelVersion: renderOutput.modelVersion,
      renderMappingRule: renderOutput.mapping.rule,
      layoutPreparationKind: renderOutput.source.layoutPreparationKind,
      layoutPreparationModelVersion: renderOutput.source.layoutPreparationModelVersion,
      preparedSiteKind: renderOutput.source.preparedSiteKind,
      preparedSiteModelVersion: renderOutput.source.preparedSiteModelVersion,
      importContractVersion: renderOutput.source.importContractVersion,
      importManifestVersion: renderOutput.source.importManifestVersion,
      fingerprints: renderOutput.source.fingerprints,
    },
    status,
    siteSummary: {
      pageCount: pages.length,
      previewablePageCount,
      notPreviewablePageCount,
      previewNodeCount,
    },
    diagnostics: {
      carried: {
        import: renderOutput.diagnostics.carried.import,
      },
      preview: {
        warnings: {
          codes: warningCodeList,
        },
      },
    },
    pages,
    pageSummaries,
  };
}
