# Phase-1.5 Minimal Export Fidelity Pass (CSS + Assets)

## Added Fidelity Surfaces
- Source `<title>` is preserved when available; fallback is source path.
- Source `<meta charset>` is preserved when available; fallback is `utf-8`.
- Source `<meta name="viewport">` is preserved when available; fallback is `width=device-width,initial-scale=1`.
- Source `<meta name="description">` is preserved when available.
- Source `<html lang>` is preserved when available; fallback is `en`.
- Source `body` attributes `id` and `class` are preserved when available.
- Source `<link rel="stylesheet"...>` elements are preserved in source order.
- Source block inner markup now preserves a deterministic minimal whitelist subset (instead of only excerpt text).

## Upstream Additions
- Added deterministic `fidelity` projection on `PreparedDocumentRecord`.
- Propagated `fidelity` through `LayoutPreparationPageRecord` and `RenderedPageRecord`.
- Added `preservedMarkupHtml` on:
  - `PreparedDomOutlineElement`
  - `LayoutPreparationBlockRecord`
  - `RenderNodeRecord`
- No redesign logic, no CSS parsing/optimization, no semantic inference.

## Deterministic Markup Preservation Rules
- Allowed elements (fixed whitelist):
  - `a`, `article`, `br`, `div`, `em`, `footer`, `h1`-`h6`, `header`, `img`, `li`, `main`, `nav`, `ol`, `p`, `section`, `small`, `span`, `strong`, `ul`
- Allowed attributes (fixed whitelist):
  - global: `class`, `id`, `title`, `role`, `aria-*`
  - link-only: `href`, `target`, `rel`
  - image-only: `src`, `alt`
- Explicitly not preserved:
  - `<script>`, `<style>`, and other active/embed media containers
  - event handler attributes (`on*`)
  - non-whitelisted attributes (for example `style`, `data-*`, `loading`)
- Source order:
  - Preserved nodes remain in original document order within each source block.
- Fallback behavior:
  - If a block has no preservable markup, exporter keeps existing fallback:
    - render excerpt `<p>` when `textExcerpt` exists
    - otherwise keep section text-empty

## Deterministic Stylesheet Preservation/Copy Rules
- Preserve source stylesheet links (`<link rel="stylesheet" href="...">`) in static HTML head in source order.
- Duplicate stylesheet references are preserved as-is (no dedupe/inference).
- Local stylesheet references (`relative_local`, `root_relative`, validation `ok` with resolved local path):
  - copied to `assets/<resolvedPath>`
  - rewritten in exported HTML to page-relative bundle path.
- Root-relative stylesheet references follow the same copy/rewrite path as other local references.
- Unsupported remote stylesheet references are preserved unchanged in HTML when present and remain visible in warnings.
- Unsupported data URL stylesheet references are preserved unchanged in HTML when present and remain visible in warnings.

## Asset Rewrite Behavior
- Rewriter remains deterministic and now supports:
  - primary matching by canonical occurrence (`tag + attr + occurrence`)
  - fallback matching by (`tag + attr + rawRef`) for preserved-subset HTML (e.g., stylesheet-only link projection).
- This allows correct local stylesheet rewriting even when non-stylesheet `<link>` elements are not emitted.

## Degraded Fidelity Behavior
- Missing local assets remain non-fatal for eligible exports and are reported with warnings.
- Unsupported remote/data references remain reported and do not block structurally exportable pages.
- Warning-mode fixtures continue exporting in degraded mode with explicit warning codes.

## friend-site-01 Export Impact
- Exported HTML now retains key source structure/classes (for example navigation/header/testimonial markup), plus preserved anchors/images where whitelisted.
- Existing fixture CSS applies more meaningfully because class/id-bearing markup is now present inside exported sections.

## Remaining Fidelity Limits
- No full DOM passthrough.
- No JavaScript behavior recreation.
- No semantic component inference/reconstruction.
- No CSS transformation or responsive redesign.
