# Phase-1.5 Minimal Export Fidelity Pass (CSS + Assets)

## Added Fidelity Surfaces
- Source `<title>` is preserved when available; fallback is source path.
- Source `<meta charset>` is preserved when available; fallback is `utf-8`.
- Source `<meta name="viewport">` is preserved when available; fallback is `width=device-width,initial-scale=1`.
- Source `<meta name="description">` is preserved when available.
- Source `<html lang>` is preserved when available; fallback is `en`.
- Source `body` attributes `id` and `class` are preserved when available.
- Source `<link rel="stylesheet"...>` elements are preserved in source order.

## Upstream Additions
- Added deterministic `fidelity` projection on `PreparedDocumentRecord`.
- Propagated `fidelity` through `LayoutPreparationPageRecord` and `RenderedPageRecord`.
- No redesign logic, no CSS parsing/optimization, no semantic inference.

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
