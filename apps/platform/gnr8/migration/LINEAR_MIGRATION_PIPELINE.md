# Linear Migration Pipeline (Runtime Skeleton)

## Stage sequence (fixed)

1. `import_intake`
2. `structure_preparation`
3. `visual_analysis`
4. `design_intelligence`
5. `layout_preparation`
6. `render_preparation`
7. `preview_generation`

Stage order is defined by `LINEAR_MIGRATION_STAGE_ORDER` in `apps/platform/gnr8/migration/pipeline-contract.ts`.

## Status computation rules

- Each stage returns a `PipelineStageResult` with `status`:
  - `success` — stage ran and prerequisites were satisfied
  - `failed` — stage ran and a prerequisite or invariant was not satisfied
  - `skipped` — stage did not run because a prior stage was not `success`
- Pipeline `status`:
  - `failed` if any stage is `failed`
  - `success` otherwise
- Normal failures are represented structurally in the `PipelineResult`; the runner does not throw for import/content problems.

## Placeholder behavior (current)

- `import_intake`
  - Passes through `PipelineInput` deterministically.
  - Imports diagnostics from `ImportOutput.importDiagnostics.issues` into the pipeline diagnostics stream (attributed to `import_intake` with `source: "import"`).
  - Applies deterministic import severity policy:
    - Structural blockers: fail intake and emit `PIPELINE_BLOCKED_BY_IMPORT`.
    - Non-structural degraded asset issues: remain visible and continue in degraded mode.
  - Non-structural degraded asset diagnostic codes:
    - `missing_local_asset`
    - `unsupported_remote_asset`
    - `unsupported_data_url_asset`
  - Structural blockers are defined as:
    - any `fatal` import diagnostic
    - any `error` import diagnostic not in the non-structural degraded asset code list
    - no structurally usable DOM document (`documentCount === 0` or no parsed DOM snapshots)
- `structure_preparation`
  - Deterministically emits `PreparedSiteModel` (`prepared_site_model_v1`) derived from `PipelineInput`.
- `layout_preparation`
  - Deterministically emits `LayoutPreparationModel` (`layout_preparation_model_v1`) derived from `PreparedSiteModel`.
- `visual_analysis`
  - Deterministically emits `VisualAnalysisModel` (`visual_analysis_model_v1`) from structured screenshot input hints when available.
  - Falls back safely to unavailable/low-confidence signals when screenshot input is missing.
- `design_intelligence`
  - Consumes deterministic structure plus optional visual-analysis hints.
  - Visual signals are confidence-gated enrichments and cannot replace deterministic structure authority.
- `render_preparation`
  - Deterministically emits `RenderOutput` (`render_output_v1`) derived from `LayoutPreparationModel`.
- `preview_generation`
  - Deterministically emits `PreviewDocument` (`preview_document_v1`) derived from `RenderOutput`.

## Phase-1 LayoutPreparationModel (implementation note)

Model fields included (high-level):
- `kind`, `modelVersion`, `source` (prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `siteSummary` (page/block counts)
- `pages` (stable page records with traceability + blocks)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` (references/summary from preparation)

Block extraction rule (fixed, replayable):
- Start from direct `<body>` child elements.
- Promote through a transparent wrapper chain while the current boundary has exactly one element child and that child has exactly one element child with no direct non-whitespace text.
- Stop promotion at the first non-transparent boundary.
- Use that boundary's child elements as blocks in canonical order.
- If the terminal boundary is a single leaf element (no child elements), that single element becomes the block.
- If `<body>` is unavailable or has no child elements, `blocks: []` is produced.

Status computation rule:
- `blocked` if `PreparedSiteModel.status === "blocked"` OR there are no pages.
- `ready` if not blocked AND `PreparedSiteModel.status === "ready"` AND all pages are `eligible`.
- `ready_with_warnings` otherwise.

Pipeline stage emitting the model:
- `layout_preparation` now emits `LayoutPreparationModel` as `LayoutPreparationStageOutput.layoutModel`.

## Phase-1 RenderOutput (implementation note)

Render output fields included (high-level):
- `kind`, `modelVersion`, `mapping` (rule id + wrapper tag)
- `source` (layout/prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `siteSummary` (page eligibility + rendered node counts)
- `pages` (stable page render records with traceability + render nodes)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` (carried summary from preparation) + `diagnostics.renderer.warnings.codes`

Phase-1 render mapping rule (fixed, replayable):
- Each layout block becomes one top-level render node.
- Node order is canonical by `ordinalIndex` (0-based).
- Every node uses a stable wrapper tag: `section`.
- Original `sourceTagName` is preserved for traceability.

Render status computation rule:
- `blocked` if `LayoutPreparationModel.status === "blocked"` OR there are no eligible pages.
- `ready` if not blocked AND `LayoutPreparationModel.status === "ready"` AND there are no ineligible pages.
- `ready_with_warnings` otherwise.

Pipeline stage emitting the model:
- `render_preparation` now emits `RenderOutput` as `RenderPreparationStageOutput.renderOutput`.

## Phase-1 PreviewDocument (implementation note)

Preview document fields included (high-level):
- `kind`, `modelVersion`, `mapping` (rule ids + wrapper tag)
- `source` (render/layout/prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `siteSummary` (page eligibility + preview node counts)
- `pages` (stable preview page records with traceability + preview payload)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` (carried summary from import) + `diagnostics.preview.warnings.codes`

Phase-1 preview generation rule (fixed, replayable):
- Each rendered page becomes one preview page.
- Page order is canonical by `sourcePath`, then `sourcePageId`, then `sourceDocumentId`, then `renderedPageId`.
- A page is `previewable` iff `RenderedPageRecord.eligibility === "eligible"`.
- Each rendered node becomes one `<section>` element in stable preview markup.
- Section order is canonical by `ordinalIndex`, then `nodeId`, then `sourceBlockId`.
- Each section includes stable `data-*` attributes to preserve traceability to rendered pages/nodes/blocks.
- Unsupported node kinds still map to a generic `<section>` with `data-render-node-kind` preserved.

Preview status computation rule:
- `blocked` if `RenderOutput.status === "blocked"` OR there are no previewable pages.
- `ready` if not blocked AND `RenderOutput.status === "ready"` AND there are no preview warnings.
- `ready_with_warnings` otherwise.

Pipeline stage emitting the model:
- `preview_generation` now emits `PreviewDocument` as `PreviewGenerationStageOutput.previewDocument`.

## Phase-1 StaticHtmlRenderArtifact (implementation note)

Artifact fields included (high-level):
- `kind`, `artifactVersion`, `mapping` (rule ids + wrapper tag)
- `source` (render/layout/prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `summary` (page/renderability counts + generated html document count)
- `pages` (stable page artifacts with output path + html payload or explicit non-renderable state)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` + `diagnostics.staticHtml.warnings.codes`

Phase-1 static HTML rendering rule (fixed, replayable):
- Each rendered page becomes one static page artifact in canonical order by `sourcePath`, `sourcePageId`, `sourceDocumentId`, `renderedPageId`.
- A page is `renderable` iff `RenderedPageRecord.eligibility === "eligible"`.
- Renderable pages emit full HTML documents with:
  - `<!doctype html>`
  - `<html><head><body><main>`
  - deterministic title: exact `sourcePath`
  - one `<section>` per render node in canonical node order (`ordinalIndex`, `nodeId`, `sourceBlockId`)
  - visible `<p>` content only when `textExcerpt` is present
- Minimal traceability uses compact `data-*` attributes on document/page/section boundaries only.
- No semantic guessing, design inference, or additional parsing passes.

Output path determination rule:
- Start from canonical `sourcePath`.
- Normalize separators to `/` and remove leading `/`.
- If empty: `index.html`.
- If path ends with `/`: append `index.html`.
- If path lacks `.html`/`.htm` extension: append `.html`.
- If path ends with `.htm`: normalize to `.html`.

Non-renderable page representation:
- Keep the page in the artifact with `renderability.status = "not_renderable"`.
- Preserve source and output-path metadata.
- Set `htmlDocument: null` and include a warning code; do not throw.

## Phase-1.5 StaticOutputBundle (implementation note)

Bundle fields included (high-level):
- `kind`, `bundleVersion`, `rules` (structure/copy/rewrite/missing rules)
- `source` (static-html + import version references + deterministic fingerprints)
- `outputRootPath`, `status`
- `summary` (page/asset counts + copied/skipped/missing/failed + warning/error counts)
- `pageFiles` (written/skipped/failed page records with canonical output paths)
- `assetFiles` (copied/missing/skipped/failed asset records with reason codes)
- `rewrites` (asset reference rewrites applied in exported HTML)
- `diagnostics.warnings.codes` and `diagnostics.errors.codes`

Fixed phase-1.5 output structure:
- `<outputRoot>/<page.outputPath>` for generated pages
- `<outputRoot>/<resolvedPath>` for copied local assets

Asset copy strategy:
- Copy only supported local references (`referenceKind` local + `validationStatus: ok`) to `<resolvedPath>`.
- Preserve canonical resolved local path exactly (no extra export prefix).
- Keep deterministic ordering and deterministic destination paths.
- Do not fetch network/data URL assets.

Asset reference rewrite behavior:
- Rewrite only supported local references that were copied into the bundle.
- Rewrite target is page-relative path from the page output directory to `<resolvedPath>`.
- Head stylesheet rewrite rule: emit explicit page-relative hrefs (`./...` for same-directory targets; never root-relative `/...`).
- Anchor `<a href>` rewrites are guarded: rewrite only safe gallery/image anchors (image-like href + image/picture descendant + copied local target + deterministic gallery context).
- Header/nav/logo-wrapper style anchors without deterministic gallery context remain unchanged.
- Preserve `tel:`, `mailto:`, `javascript:`, `#fragment`, and ordinary navigation/content links unchanged.
- If no rewrite is required, HTML is written unchanged.

Missing and unsupported asset handling:
- Missing local assets are reported as structured `assetFiles` entries with `writeStatus: "missing"` and reason code.
- Unsupported remote/data/invalid/path-traversal references are reported as `skipped` with explicit reason code.
- Materialization continues in degraded-but-runnable mode when possible; missing/unsupported assets do not throw.
