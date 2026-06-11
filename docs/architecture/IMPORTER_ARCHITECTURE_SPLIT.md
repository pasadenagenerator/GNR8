# Importer Architecture Split

Phase: 7F-1

Status: Architecture boundary defined. Implementation rewrites are out of scope.

## Purpose

GNR8 must stop treating website import as one combined HTML/CSS/JS rewrite pipeline. Raw preview fidelity work remains useful, but it is not the long-term foundation for editable GNR8 output.

Importer architecture is split into three separate layers:

1. Evidence Capture Layer
2. Original Mirror Layer
3. AI Reconstruction Layer

These layers have different purposes, outputs, labels, and product guarantees.

## Layer 1: Evidence Capture Layer

Purpose:
- Capture the source website as a browser/user sees it.
- Produce evidence for archive, operator inspection, mirror previews, and future reconstruction.
- Avoid creating editable GNR8 output directly.

Primary capture provider:
- Chrome/Playwright.

Future optional provider:
- Servo, research only. Servo is not a blocker for this architecture and is not part of Phase 7F-1 implementation.

Evidence should include:
- final rendered DOM
- raw source HTML
- screenshots
- computed styles
- network requests
- loaded fonts
- console errors
- layout boxes
- image inventory
- stylesheet inventory
- script inventory
- iframe/embed/widget inventory
- map/gallery/form/accessibility widget evidence
- route-level evidence
- post-render DOM mutation evidence

Layer rule:
- Evidence Capture produces evidence artifacts, not semantic GNR8 blocks, not editable content models, and not reconstructed React.

## Layer 2: Original Mirror Layer

Purpose:
- Provide a read-only preview/archive/mirror of the imported site.
- Preserve source behavior and source references where safe.
- Give operators and customers a clear way to inspect what was captured without implying editability.

Rules:
- It is not editable.
- It is not semantic.
- It is not AI reconstructed.
- It should preserve source refs where safe.
- It should not aggressively transform HTML.
- It should not be used as the GNR8 block model.
- It can have known fidelity limitations when a source site depends on complex runtime behavior.

Required label:
- Original Mirror Preview

Known limitations must be surfaced, not hidden. Examples include builder runtime dependence, lazy loading, third-party widgets, external maps, galleries, form scripts, font loading, accessibility overlays, blocked resources, consent gates, and post-render DOM mutation.

Layer rule:
- Original Mirror may consume Evidence Capture artifacts, but it must not be mistaken for GNR8-native reconstruction.

## Layer 3: AI Reconstruction Layer

Purpose:
- Create GNR8-native editable output from evidence.
- Convert evidence into structured product truth: routes, sections, blocks, content, tokens, and optional CMS bindings.

AI Reconstruction may infer:
- navigation
- hero
- sections
- cards
- blog listings
- galleries
- forms
- maps
- reusable components
- design tokens
- content slots
- CMS structures
- layout intent
- responsive behavior

This layer creates:
- GNR8 React/block model
- editable content model
- design tokens
- structured route model
- optional CMS bindings

Required label:
- GNR8 Reconstruction Preview

Layer rule:
- AI Reconstruction must not be treated as the same thing as Original Mirror Preview. Reconstruction can use the mirror and evidence as inputs, but its output is a separate GNR8-native candidate.

## Terminology

Evidence Capture:
- The process of observing and recording a source site as rendered by a browser/user.

Capture Provider:
- The runtime used to capture evidence. The primary provider is Chrome/Playwright. Servo remains future research only.

Original Mirror Preview:
- A read-only, non-semantic preview/archive of the source site based on raw/captured source artifacts.

GNR8 Reconstruction Preview:
- A preview of editable GNR8-native output reconstructed from evidence.

Known Fidelity Limitation:
- An explicitly surfaced reason the mirror or reconstruction may differ from the source site, such as a blocked widget, missing runtime, external map, lazy-loaded gallery, post-render mutation, or inaccessible asset.

Reconstruction Candidate:
- A proposed GNR8-native model derived from evidence. It is not source truth until reviewed, accepted, or promoted by future product workflow.

## Boundary With Existing Import Contracts

The deterministic static import contract remains valid for local HTML/assets import. It should not be expanded into a browser capture, mirror, and AI reconstruction contract all at once.

The rendered capture contract remains a foundation for browser-observed evidence. Phase 7F-1 only names the architecture boundary and adds type scaffolding for future contracts.

The canonical import model remains the long-term product truth target for editable GNR8 output. HTML remains evidence/source material. React/block output remains a downstream GNR8-native representation.

## Current Unresolved Cases

ViroiDoc blog/news duplication:
- Not solved by raw preview patching.
- Should be treated as a reconstruction/modeling issue where evidence must distinguish source duplication, listing semantics, route behavior, and reusable content patterns.
- No ViroiDoc fix is included in Phase 7F-1.

Mono/Maver map rendering:
- Likely requires evidence capture plus widget reconstruction.
- A source map widget should be captured as widget evidence, then reconstructed as a GNR8 map block through an approved runtime provider when appropriate.
- No Maver map fix is included in Phase 7F-1.

Dongle issue:
- Showed an importer source-reference preservation problem.
- Original Mirror should preserve source refs where safe instead of aggressively transforming source HTML.
- Reconstruction should separately decide whether refs become editable assets, content bindings, or runtime provider inputs.

DB lifecycle issue:
- Fixed before this phase.
- Not part of the importer architecture split except as a reminder that runtime lifecycle defects should not be confused with import-layer boundaries.

Raw preview foundation:
- Raw preview is useful for route-level inspection and Original Mirror behavior.
- Raw preview should not be the long-term foundation for GNR8-native reconstruction.

## Non-Goals For Phase 7F-1

- Do not fix ViroiDoc duplication.
- Do not fix Maver/Mono map rendering.
- Do not add Servo.
- Do not add AI generation.
- Do not rewrite the preview renderer.
- Do not change import limits.
- Do not change script policy.
- Do not merge Original Mirror and AI Reconstruction concepts.

## Proposed Next Phases

7F-2: Evidence Capture Artifact Contract
- Define the durable artifact contract for rendered DOM, raw HTML, screenshots, computed styles, network records, fonts, layout boxes, inventories, route evidence, widget evidence, and DOM mutation evidence.

7F-3: Original Mirror Status / Known Limitations UI
- Add operator-facing status and limitation labels for Original Mirror Preview without changing script policy or preview renderer behavior.

7F-4: Reconstruction Input Contract
- Define the normalized input package AI Reconstruction receives from evidence and mirror metadata.

7F-5: First AI Reconstruction Spike From Evidence
- Build the first bounded reconstruction experiment from captured evidence into a GNR8-native reconstruction candidate.
