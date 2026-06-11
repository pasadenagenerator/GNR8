# Original Mirror Limitations Surface

## Purpose

Original Mirror Fidelity makes persisted Evidence Capture Baseline limits visible to operators. It explains why an Original Mirror may differ from the source site without presenting those gaps as mysterious preview defects.

This surface is diagnostic only. It does not change importer behavior, capture behavior, browser providers, Playwright, Original Mirror rendering, transformed previews, AI reconstruction, route discovery, asset acquisition, script policy, asset rewriting, persistence schema, or public site rendering.

## Fidelity Model

The fidelity projection is derived entirely from `evidence_capture_baseline`.

The summary exposes:
- capture status
- coverage status
- supported evidence count and percentage
- partial evidence count and percentage
- missing evidence count and percentage

The diagnostic badge is deterministic:
- `HIGH`: supported evidence is at least 70 percent
- `MEDIUM`: supported evidence is at least 40 percent
- `LOW`: supported evidence is below 40 percent

The current baseline coverage is partial and not reconstruction-grade. The operator view must therefore describe available, partial, and missing evidence explicitly.

## Readiness Model

Readiness is deterministic:
- `READY`: baseline artifact exists and no blocker limitations are present.
- `PARTIAL`: baseline artifact exists and one or more warning limitations are present.
- `NOT_READY`: baseline artifact is missing, rendered capture is missing, or any blocker limitation is present.

The projection uses existing Evidence Capture contract helpers where possible, including blocker classification from known fidelity limitations.

Readiness is informational. It does not trigger reconstruction and does not approve reconstruction.

## Limitation Categories

Known limitations are normalized into operator-facing categories:

- Capture: rendered capture unavailable, raw HTML fallback used, screenshot unavailable.
- Styles: computed styles unavailable, design tokens unavailable, font source evidence incomplete.
- Layout: layout boxes unavailable, layout regions unavailable, sticky element evidence unavailable.
- Runtime: mutation evidence unavailable, widget runtime evidence unavailable, runtime behavior unknown.
- Assets: partial asset inventory, partial network inventory, unresolved external resources.
- Maps / Widgets: map runtime evidence unavailable, gallery runtime evidence unavailable, form runtime evidence unavailable.

Each limitation has:
- id
- category
- severity
- title
- description

Route-level limitations are shown only when route-specific known fidelity limitations already exist in the persisted baseline artifact.

## Operator Expectations

Operators should read this surface as an evidence explanation layer:
- It states what evidence exists.
- It states what evidence is partial.
- It states what evidence is missing.
- It states whether reconstruction readiness is possible.

Operators should not expect remediation controls here. There are no action buttons, preview fixes, new capture capabilities, new browser instrumentation, new screenshots, asset recovery, or AI processing in this phase.

Original Mirror remains a read-only source mirror. GNR8 Reconstruction remains a separate future layer.
