import type { RenderOutput, RenderOutputStatus, RenderedPageEligibilityStatus, RenderedPageRecord } from "./render-output-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Deterministic Static HTML Render Artifact (deterministic; export-oriented)
 * ------------------------------------------------------------------------------
 *
 * Purpose:
 * - Convert `RenderOutput` into real exportable static HTML documents.
 * - Keep deterministic page ordering, output paths, and HTML serialization.
 * - Preserve minimal traceability metadata without embedding large internal payloads.
 *
 * Phase-1 static rendering rule (normative; fixed & replayable):
 * - Each `RenderedPageRecord` becomes one `StaticHtmlPageArtifact`.
 * - Page order is canonical by (`sourcePath`, `sourcePageId`, `sourceDocumentId`, `renderedPageId`).
 * - A page is `renderable` iff `RenderedPageRecord.eligibility === "eligible"`.
 * - Renderable pages emit one full HTML document (`<!doctype html>`, `<html>`, `<head>`, `<body>`, `<main>`).
 * - Title rule: `<title>` is exactly the canonical `sourcePath` for that page.
 * - Node mapping rule:
 *   - each render node maps to one `<section>` in canonical node order
 *   - node order is (`ordinalIndex`, `nodeId`, `sourceBlockId`)
 *   - if `textExcerpt` is present, it is rendered as visible `<p>` content
 *   - if `textExcerpt` is null, the section remains text-empty
 * - Traceability rule: only compact `data-*` attributes are written on document/body/main/section boundaries.
 * - Degraded page rule:
 *   - non-renderable pages remain explicit with structured metadata and `htmlDocument: null` (never thrown).
 */

export const STATIC_HTML_RENDER_ARTIFACT_VERSION = "1.0.0" as const;

export type StaticHtmlRenderArtifactStatus = "ready" | "ready_with_warnings" | "blocked";

export type StaticHtmlPageRenderabilityStatus = "renderable" | "not_renderable";

export type StaticHtmlDocumentPayload = {
  kind: "static_html_document_v1";
  html: string;
};

export type StaticHtmlPageRenderability = {
  status: StaticHtmlPageRenderabilityStatus;
  sourceEligibility: RenderedPageEligibilityStatus;
  reasonCode: "INELIGIBLE_PAGE" | null;
};

export type StaticHtmlPageArtifact = {
  staticHtmlPageId: string;
  sourceRenderedPageId: string;
  sourcePageId: string;
  sourceDocumentId: string;
  sourcePath: string;
  isEntry: boolean;

  outputPath: string;

  renderability: StaticHtmlPageRenderability;
  renderedNodeCount: number;
  renderedElementCount: number;
  sourceRenderedNodeIds: string[];

  htmlDocument: StaticHtmlDocumentPayload | null;
};

export type StaticHtmlPageSummary = {
  staticHtmlPageId: string;
  sourceRenderedPageId: string;
  sourcePageId: string;
  sourcePath: string;
  outputPath: string;
  renderability: StaticHtmlPageRenderabilityStatus;
  renderedNodeCount: number;
  renderedElementCount: number;
};

export type StaticHtmlRenderArtifact = {
  kind: "static_html_render_artifact_v1";
  artifactVersion: typeof STATIC_HTML_RENDER_ARTIFACT_VERSION;

  mapping: {
    rule: "render_output_to_static_html_v1";
    pageRule: "rendered_pages_to_static_html_pages_v1";
    nodeRule: "render_nodes_to_section_elements_v1";
    titleRule: "source_path_title_v1";
    outputPathRule: "source_path_to_html_output_path_v1";
    degradedPageRule: "non_renderable_page_structured_without_html_v1";
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

  status: StaticHtmlRenderArtifactStatus;

  summary: {
    pageCount: number;
    renderablePageCount: number;
    nonRenderablePageCount: number;
    generatedHtmlDocumentCount: number;
    renderedNodeCount: number;
    renderedElementCount: number;
  };

  diagnostics: {
    carried: {
      import: RenderOutput["diagnostics"]["carried"]["import"];
    };
    staticHtml: {
      warnings: {
        codes: string[];
      };
    };
  };

  pages: StaticHtmlPageArtifact[];
  pageSummaries: StaticHtmlPageSummary[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function escapeHtmlAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function staticHtmlPageIdFor(input: { sourceRenderedPageId: string; sourcePageId: string }): string {
  return sha256Hex(
    stableStringify({
      kind: "static_html_page_v1",
      sourceRenderedPageId: input.sourceRenderedPageId,
      sourcePageId: input.sourcePageId,
    }),
  );
}

function toOutputPathFromSourcePath(sourcePath: string): string {
  const base = sourcePath.replaceAll("\\", "/").replace(/^\/+/, "").trim();
  const normalized = base.length > 0 ? base : "index.html";
  if (normalized.endsWith("/")) return `${normalized}index.html`;
  const lower = normalized.toLowerCase();
  if (lower.endsWith(".html")) return normalized;
  if (lower.endsWith(".htm")) return `${normalized.slice(0, -4)}.html`;
  return `${normalized}.html`;
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

function computeArtifactStatus(input: {
  renderStatus: RenderOutputStatus;
  renderablePageCount: number;
  warningCodes: string[];
}): StaticHtmlRenderArtifactStatus {
  if (input.renderStatus === "blocked" || input.renderablePageCount === 0) return "blocked";
  if (input.renderStatus === "ready" && input.warningCodes.length === 0) return "ready";
  return "ready_with_warnings";
}

function buildPageHtml(input: {
  page: RenderedPageRecord;
  staticHtmlPageId: string;
  outputPath: string;
}): { html: string; sourceRenderedNodeIds: string[]; renderedElementCount: number } {
  const nodes = [...input.page.nodes].sort((a, b) => {
    if (a.ordinalIndex !== b.ordinalIndex) return a.ordinalIndex - b.ordinalIndex;
    if (a.nodeId !== b.nodeId) return stringCmp(a.nodeId, b.nodeId);
    return stringCmp(a.sourceBlockId, b.sourceBlockId);
  });

  const sourceRenderedNodeIds = nodes.map((n) => n.nodeId);
  const lines: string[] = [];
  lines.push("<!doctype html>");
  lines.push(`<html lang="en" data-gnr8-static-html-version="${STATIC_HTML_RENDER_ARTIFACT_VERSION}">`);
  lines.push("<head>");
  lines.push('<meta charset="utf-8">');
  lines.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  lines.push(`<title>${escapeHtmlText(input.page.sourcePath)}</title>`);
  lines.push("</head>");
  lines.push(
    `<body data-static-html-page-id="${input.staticHtmlPageId}" data-source-rendered-page-id="${escapeHtmlAttr(
      input.page.renderedPageId,
    )}" data-source-page-id="${escapeHtmlAttr(input.page.sourcePageId)}" data-source-document-id="${escapeHtmlAttr(
      input.page.sourceDocumentId,
    )}" data-source-path="${escapeHtmlAttr(input.page.sourcePath)}" data-output-path="${escapeHtmlAttr(
      input.outputPath,
    )}" data-is-entry="${input.page.isEntry ? "true" : "false"}">`,
  );
  lines.push('<main data-gnr8-main="phase1-static-html">');
  for (const node of nodes) {
    lines.push(
      `<section data-render-node-id="${escapeHtmlAttr(node.nodeId)}" data-render-node-kind="${escapeHtmlAttr(
        node.kind,
      )}" data-source-block-id="${escapeHtmlAttr(node.sourceBlockId)}" data-ordinal-index="${String(
        node.ordinalIndex,
      )}" data-source-tag-name="${escapeHtmlAttr(node.sourceTagName)}" data-text-present="${
        node.textPresent ? "true" : "false"
      }" data-child-element-count="${String(node.childElementCount)}" data-asset-reference-count="${String(
        node.assetReferenceIds.length,
      )}">`,
    );
    if (node.textExcerpt !== null) lines.push(`<p>${escapeHtmlText(node.textExcerpt)}</p>`);
    lines.push("</section>");
  }
  lines.push("</main>");
  lines.push("</body>");
  lines.push("</html>");

  return {
    html: `${lines.join("\n")}\n`,
    sourceRenderedNodeIds,
    renderedElementCount: nodes.length,
  };
}

/**
 * Deterministically derives StaticHtmlRenderArtifact from RenderOutput.
 */
export function createStaticHtmlRenderArtifact(renderOutput: RenderOutput): StaticHtmlRenderArtifact {
  const pagesInCanonicalOrder = canonicalRenderedPages(renderOutput);

  const pages: StaticHtmlPageArtifact[] = [];
  const pageSummaries: StaticHtmlPageSummary[] = [];
  const warningCodes = new Set<string>();

  let renderablePageCount = 0;
  let nonRenderablePageCount = 0;
  let generatedHtmlDocumentCount = 0;
  let renderedNodeCount = 0;
  let renderedElementCount = 0;

  for (const page of pagesInCanonicalOrder) {
    const renderability: StaticHtmlPageRenderability =
      page.eligibility === "eligible"
        ? {
            status: "renderable",
            sourceEligibility: page.eligibility,
            reasonCode: null,
          }
        : {
            status: "not_renderable",
            sourceEligibility: page.eligibility,
            reasonCode: "INELIGIBLE_PAGE",
          };

    if (renderability.status === "renderable") renderablePageCount++;
    else {
      nonRenderablePageCount++;
      warningCodes.add("INELIGIBLE_PAGE_NOT_RENDERABLE");
    }

    const staticHtmlPageId = staticHtmlPageIdFor({ sourceRenderedPageId: page.renderedPageId, sourcePageId: page.sourcePageId });
    const outputPath = toOutputPathFromSourcePath(page.sourcePath);

    let htmlDocument: StaticHtmlDocumentPayload | null = null;
    let sourceRenderedNodeIds: string[] = [];
    let pageRenderedElementCount = 0;
    let pageRenderedNodeCount = 0;

    if (renderability.status === "renderable") {
      const built = buildPageHtml({ page, staticHtmlPageId, outputPath });
      htmlDocument = { kind: "static_html_document_v1", html: built.html };
      sourceRenderedNodeIds = built.sourceRenderedNodeIds;
      pageRenderedElementCount = built.renderedElementCount;
      pageRenderedNodeCount = sourceRenderedNodeIds.length;
      generatedHtmlDocumentCount++;
      if (pageRenderedNodeCount === 0) warningCodes.add("RENDERABLE_PAGE_HAS_NO_NODES");
    }

    renderedNodeCount += pageRenderedNodeCount;
    renderedElementCount += pageRenderedElementCount;

    pages.push({
      staticHtmlPageId,
      sourceRenderedPageId: page.renderedPageId,
      sourcePageId: page.sourcePageId,
      sourceDocumentId: page.sourceDocumentId,
      sourcePath: page.sourcePath,
      isEntry: page.isEntry,
      outputPath,
      renderability,
      renderedNodeCount: pageRenderedNodeCount,
      renderedElementCount: pageRenderedElementCount,
      sourceRenderedNodeIds,
      htmlDocument,
    });

    pageSummaries.push({
      staticHtmlPageId,
      sourceRenderedPageId: page.renderedPageId,
      sourcePageId: page.sourcePageId,
      sourcePath: page.sourcePath,
      outputPath,
      renderability: renderability.status,
      renderedNodeCount: pageRenderedNodeCount,
      renderedElementCount: pageRenderedElementCount,
    });
  }

  if (renderablePageCount === 0) warningCodes.add("NO_RENDERABLE_PAGES");
  if (renderOutput.diagnostics.renderer.warnings.codes.length > 0) warningCodes.add("RENDER_OUTPUT_WARNINGS_CARRIED");

  const warningCodeList = [...warningCodes].sort(stringCmp);
  const status = computeArtifactStatus({
    renderStatus: renderOutput.status,
    renderablePageCount,
    warningCodes: warningCodeList,
  });

  return {
    kind: "static_html_render_artifact_v1",
    artifactVersion: STATIC_HTML_RENDER_ARTIFACT_VERSION,
    mapping: {
      rule: "render_output_to_static_html_v1",
      pageRule: "rendered_pages_to_static_html_pages_v1",
      nodeRule: "render_nodes_to_section_elements_v1",
      titleRule: "source_path_title_v1",
      outputPathRule: "source_path_to_html_output_path_v1",
      degradedPageRule: "non_renderable_page_structured_without_html_v1",
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
    summary: {
      pageCount: pages.length,
      renderablePageCount,
      nonRenderablePageCount,
      generatedHtmlDocumentCount,
      renderedNodeCount,
      renderedElementCount,
    },
    diagnostics: {
      carried: {
        import: renderOutput.diagnostics.carried.import,
      },
      staticHtml: {
        warnings: {
          codes: warningCodeList,
        },
      },
    },
    pages,
    pageSummaries,
  };
}
