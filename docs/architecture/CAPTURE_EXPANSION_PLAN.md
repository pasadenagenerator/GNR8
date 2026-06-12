# Capture Expansion Plan

## Scope

Phase 7F-6 defines the smallest future Evidence Capture expansion needed to move typical imported sites from `NOT_READY` to `MINIMUM_READY` for future reconstruction readiness.

This is a planning and architecture document only. It does not change importer behavior, preview behavior, Original Mirror behavior, transformed preview behavior, AI reconstruction behavior, route discovery, asset rewriting, script policy, persistence schema, public rendering, Chrome/Playwright runtime behavior, or browser instrumentation.

This plan is based on:

- Phase 7F-2.5 Evidence Capture Inventory Audit: `docs/architecture/EVIDENCE_CAPTURE_INVENTORY_AUDIT.md`
- Phase 7F-3 persisted Evidence Capture baseline: `evidence_capture_baseline`
- Phase 7F-4 Original Mirror Limitations Surface: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`
- Phase 7F-5 Reconstruction Input Contract: `docs/architecture/RECONSTRUCTION_INPUT_CONTRACT.md`

## Current Baseline

Current Evidence Capture coverage remains:

- Supported: 16/66 fields, 24.2%
- Partial: 33/66 fields, 50.0%
- Missing: 17/66 fields, 25.8%

Current reconstruction readiness remains `NOT_READY`.

The current foundation includes raw HTML, selected rendered DOM, viewport and full-page screenshots, computed style samples, direct asset fetch manifests, acquisition evidence, diagnostics, worker job state, worker health, and multi-page route discovery evidence. The foundation is real, but it is not yet a normalized reconstruction input artifact.

## Readiness Gap Analysis

The Phase 7F-5 contract defines `MINIMUM_READY` as a deterministic evidence state. The current baseline is blocked because the required minimum handoff fields are not yet normalized into a durable reconstruction input artifact for each route.

### Required Blockers

These blockers prevent the current baseline from reaching `MINIMUM_READY`:

- `capture_unavailable`: no route-level `EvidenceCaptureArtifact` with `status = available` or `partial` is currently emitted as the reconstruction handoff artifact.
- `missing_source_url`: source URL evidence exists in current import surfaces, but it is not guaranteed to be normalized into `source.sourceUrl` and/or `route.sourceUrl` in the handoff artifact.
- `missing_route_identity`: route evidence exists, but `source.routePath` and/or `route.discoveredRoutePath` is not guaranteed to be normalized for every captured route.
- `missing_rendered_dom`: rendered DOM exists when rendered capture succeeds, but the handoff artifact must persist `rendered.renderedDomRef` and `rendered.renderedHtmlHash` together.
- `render_failed`: failed or unavailable rendered capture must remain blocking for that route until evidence is available or partial.
- `route.captureStatus` gap: route-level capture status exists across diagnostics and import state, but it is not normalized into the reconstruction handoff artifact.
- `blocker_fidelity_limitation`: normalized blocker limitations must be available so readiness can deterministically reject routes that are unsafe for reconstruction.

### Optional But High-Value Gaps

These gaps do not block `MINIMUM_READY`, but they are required for useful reconstruction and should follow immediately after the P0 handoff:

- computed style evidence broad enough to infer colors, typography, spacing, radius, shadows, and surface roles.
- loaded font source inventory, including missing font sources.
- basic layout boxes for key elements, especially navigation, hero, headings, CTAs, images, cards, forms, maps, galleries, and footer.
- screenshot references with viewport metadata for visual review.
- browser-level failed and blocked request summaries.
- iframe, embed, and widget inventories for maps, galleries, forms, accessibility overlays, cookie banners, chat widgets, and videos.
- console error and warning summaries.
- runtime mutation summaries for late content, lazy loading, duplicate insertion, and unstable DOMs.

### Non-Blocking Gaps

These should not block `MINIMUM_READY` and can remain later-phase evidence:

- multi-breakpoint layout capture.
- above-fold region extraction.
- repeated-region clustering.
- sticky and fixed element classification.
- complete browser request and response inventory.
- full response header inventory.
- inline script signatures.
- animation timeline evidence.
- interaction-state evidence.
- accessibility tree evidence.
- shadow DOM evidence.
- canvas raster evidence.
- video frame evidence.
- deterministic reconstruction-grade design model.

## Minimum Capture Expansion Set

The smallest future capture bundle should be split into a P0 minimum gate and a P1 useful reconstruction layer.

### P0 Minimum Gate

The P0 bundle is required to move a typical successful route from `NOT_READY` to `MINIMUM_READY`:

- normalized route-level `EvidenceCaptureArtifact.status` set to `available` or `partial`.
- normalized source URL in `source.sourceUrl` and/or `route.sourceUrl`.
- normalized route identity in `source.routePath` and/or `route.discoveredRoutePath`.
- rendered DOM artifact ref in `rendered.renderedDomRef`.
- rendered HTML hash in `rendered.renderedHtmlHash`.
- rendered capture status in `rendered.renderStatus`.
- route capture status in `route.captureStatus`.
- normalized blocker fidelity limitations in `route.knownFidelityLimitations` and/or `fidelityLimitations`.

### P1 Useful Reconstruction Bundle

The next bundle should be added immediately after the P0 gate because it makes reconstruction useful rather than merely eligible:

- rendered DOM snapshot after page settled.
- rendered HTML hash from the settled DOM.
- final route identity and final URL evidence.
- screenshot references with viewport metadata.
- loaded font inventory and missing font source inventory.
- computed style samples for key elements.
- basic layout boxes for key elements.
- network failed and blocked requests.
- iframe, embed, and widget inventory.
- console error summary.

## Capture Expansion Priority Matrix

| Evidence | Current Status | Reconstruction Value | Implementation Complexity | Priority | Notes |
|---|---|---|---|---|---|
| Evidence artifact status | Partial | Gates reconstruction readiness | Low | P0 | Normalize current capture/import status into the handoff artifact. |
| Source URL | Supported/Partial | Required route attribution and remediation anchor | Low | P0 | Current surfaces have it; the gap is canonical handoff normalization. |
| Route identity | Supported/Partial | Required per-route reconstruction boundary | Low | P0 | Use current root and multi-page route evidence without changing discovery. |
| Rendered DOM ref | Supported | Required structural substrate | Low | P0 | Current rendered DOM must be referenced in contract shape. |
| Rendered HTML hash | Supported | Required DOM integrity anchor | Low | P0 | Current hash must travel with the rendered DOM ref. |
| Render status | Supported/Partial | Gates trustworthy rendered evidence | Low | P0 | Normalize rendered capture success, partial, and failure states. |
| Route capture status | Partial | Gates route-level readiness | Low | P0 | Current status is distributed across intake, rendered capture, and diagnostics. |
| Blocker fidelity limitations | Partial | Required deterministic rejection of unsafe routes | Medium | P0 | Convert existing diagnostics and limitation helpers into route/artifact blockers. |
| Settled rendered DOM snapshot | Supported/Partial | Improves DOM completeness and late-content capture | Medium | P1 | Future capture should define settle timing before snapshotting. |
| Screenshot reference | Supported | Visual review and baseline visual comparison | Low | P1 | Persist refs and viewport metadata; no new screenshot behavior in this phase. |
| Final route identity/final URL | Partial | Redirect and alias confidence | Low | P1 | Useful for route provenance and duplicate avoidance. |
| Computed style samples for key elements | Supported/Partial | Design tokens, typography, colors, spacing | Medium | P1 | Expand beyond fixed probes toward key structural elements. |
| Basic layout boxes for key elements | Missing | Essential for useful section/layout reconstruction | Medium | P1 | Capture element bounding boxes, visibility, and selector hints. |
| Loaded font inventory | Missing | Typography confidence and missing-font diagnosis | Medium | P1 | Include detected family, loaded source, weight, style, and missing sources. |
| Failed browser requests | Partial | Explains missing assets and runtime gaps | Medium | P1 | Prefer browser-observed failures over raw fetch-only diagnostics. |
| Blocked browser requests | Missing | Explains third-party, CORS, CSP, and bot-limit gaps | Medium | P1 | Capture summary and classification only. |
| Iframe/embed/widget inventory | Partial/Missing | Distinguishes widgets from reconstructable source content | Medium | P1 | Evidence only; do not replay or reconstruct widgets in capture. |
| Console error summary | Missing | Runtime quality and failure diagnosis | Low | P1 | Summaries should classify source, level, and message family. |
| Runtime mutation summary | Missing | Late content, lazy loading, and instability diagnosis | High | P2 | Valuable after P1 because it requires observation windows and noise controls. |
| Image inventory with rendered dimensions | Partial | Media fidelity and missing-media diagnosis | Medium | P2 | Current asset discovery should be complemented by rendered dimensions. |
| Background image refs with selector hints | Partial | Hero and decorative media fidelity | Medium | P2 | Needed for production-quality visual reconstruction. |
| Video media refs | Missing | Video/embed section identification | Medium | P2 | Inventory provider, poster, iframe/video element, and source refs. |
| Above-fold regions | Missing | Hero and primary section confidence | Medium | P2 | Depends on layout boxes and viewport metadata. |
| Repeated regions | Missing | Listing/card/gallery reconstruction confidence | High | P2 | Can be derived after layout and DOM samples exist. |
| Sticky/fixed elements | Missing | Nav/overlay fidelity | Medium | P2 | Useful for distinguishing persistent UI from page content. |
| Full request inventory | Partial | Dependency and asset completeness | High | P2 | Broader than failed/blocked summary; not required for minimum readiness. |
| Response inventory | Partial | MIME and asset availability confidence | High | P2 | Important for high-confidence completeness checks. |
| Multi-breakpoint layout evidence | Partial | Responsive reconstruction confidence | High | P2 | Capture after single-viewport key boxes are stable. |
| Inline script signatures | Missing | Security/policy diagnostics | Low | P3 | Unsupported for reconstruction input; keep out of content generation. |
| Accessibility tree evidence | Missing | Later accessibility-aware reconstruction review | High | P3 | Useful research path, not minimum readiness. |
| Shadow DOM evidence | Missing | Web component/widget diagnosis | High | P3 | Optional later if common imported sites require it. |
| Canvas raster evidence | Missing | Non-DOM visual diagnosis | High | P3 | Optional and expensive. |
| Animation timeline evidence | Missing | Motion diagnosis | High | P3 | Not needed for minimum or first useful reconstruction. |
| Interaction-state evidence | Missing | Menu/modal/state reconstruction | High | P3 | Requires interaction policy and should be separate from baseline capture. |

## Provider Strategy

Primary provider:

- Chrome / Playwright.

Secondary provider:

- none.

Future research:

- Servo may be considered only as an optional later research spike.
- Servo is not part of the active roadmap, not a fallback provider, and not required for `MINIMUM_READY`.

Chrome / Playwright remains the only planned provider because current capture already uses that foundation and the required expansion depends on browser-observed DOM, styles, layout, fonts, network, console, and iframe evidence.

## Route Sampling Strategy

Do not change route discovery in the expansion phase. Expanded evidence should be sampled from routes that are already discovered and prioritized by the current import pipeline.

MVP expanded evidence should cover:

- root route.
- top navigation routes.
- one listing route when discovered.
- one detail, article, or blog route when discovered.
- one contact or form route when discovered.
- routes with widget, map, gallery, embedded video, form, chat, cookie banner, or accessibility-overlay signals.

Recommended MVP route budget:

- minimum: root route plus up to 4 representative routes.
- normal cap: 5 to 8 expanded routes per import.
- widget override: include widget-heavy routes inside the cap before lower-priority content routes.

If route discovery returns fewer routes, expand evidence only for available routes. If route discovery returns many routes, keep the current priority order and add only evidence selection rules in the future implementation phase.

## Settling Strategy

Future capture should define a deterministic page-settling lifecycle before collecting expanded evidence. This plan does not implement it.

Recommended future criteria:

- wait for `DOMContentLoaded`.
- wait for a bounded network idle window.
- apply a max wait cap so captures cannot hang indefinitely.
- observe a mutation quiet window before final DOM evidence.
- wait for `document.fonts.ready` when available, with a timeout.
- perform a lazy-load trigger pass with controlled viewport scrolling.
- allow a second mutation quiet window after the lazy-load pass.
- collect computed styles, font inventory, layout boxes, network summaries, widget inventories, and console summaries after settle.
- capture screenshot references only after settle.

The settling policy should be conservative: capture enough late DOM/media evidence for reconstruction, but avoid indefinite waits on analytics, polling, chat widgets, maps, or bot-protection traffic.

## Widget Evidence Strategy

Widget capture is evidence only. It must not execute reconstruction, replay third-party behavior, bypass consent, or convert widgets into GNR8-native components during capture.

Future evidence should inventory:

- Maps: iframe/script provider hints, visible container boxes, fallback text, addresses, marker-like DOM hints, blocked/failed map requests, and static screenshot context.
- Galleries/sliders/lightboxes: gallery containers, slide counts, visible/hidden images, navigation controls, lightbox triggers, duplicated slide nodes, and library/provider hints.
- Forms: form selector hints, method/action metadata, field inventory, labels, required markers, validation hints, submit controls, iframe forms, and blocked third-party form providers.
- Accessibility overlays: overlay scripts, buttons, panels, fixed-position controls, provider hints, and whether the overlay occludes source content.
- Cookie banners: banner/modal selectors, consent buttons, blocking overlays, provider hints, and whether the banner obscures content during capture.
- Chat widgets: launcher selectors, iframe/script provider hints, fixed-position containers, network failures, and whether the widget modifies the DOM after settle.
- Embedded videos: iframe/video elements, provider hints, poster images, dimensions, lazy-loading attributes, blocked requests, and fallback content.

Widget evidence should carry selector hints, bounding boxes when available, provider classification, related network failures/blocks, screenshot refs when relevant, and a fidelity limitation when the widget cannot be fully observed.

## Risk Register

| Risk | Impact | Mitigation Direction |
|---|---|---|
| Slow captures | Import runtime and operator wait time increase | Route cap, max wait cap, bounded settle windows, and per-evidence timeouts. |
| Third-party blocking | Widgets, fonts, maps, forms, or videos may appear incomplete | Record blocked/failed evidence and normalized limitations instead of retrying indefinitely. |
| Cookie banners | Screenshots and layout evidence may represent consent overlays instead of core content | Inventory banners as evidence and mark affected visual/layout evidence. |
| Consent flows | Capture may not be legally or operationally allowed to accept consent | Do not click consent controls by default; record the gate as evidence. |
| Bot protection | DOM may be challenge pages or partial content | Detect challenge-like evidence and emit blocker limitations where needed. |
| Infinite network activity | Network idle may never occur | Use bounded idle windows and ignore known long-polling/analytics classes for settle. |
| Cross-origin iframe limitations | Internal iframe DOM may be inaccessible | Capture iframe metadata, bounding box, provider hints, and network evidence only. |
| Privacy/security constraints | Forms, chats, and account widgets may expose sensitive surfaces | Avoid input, submission, credential flows, and storage of sensitive values. |
| Cost and runtime limits | Expanded evidence can multiply storage and compute | Start with P0 plus small route sample, then add P1/P2 evidence under caps. |
| Evidence noise | Runtime widgets can create duplicate or unstable DOM evidence | Add mutation summaries and duplicate insertion signals before reconstruction consumes late nodes. |
| Font variability | Font loading can be blocked or delayed | Capture detected fonts, loaded sources, missing sources, and timeout status. |
| Screenshot inconsistency | Lazy loading or overlays may make screenshots non-representative | Screenshot only after settle and attach limitations when overlays remain. |

## Recommended Next Implementation Phase

The next implementation phase should be:

Phase 7F-7 - Minimum Evidence Handoff Normalization.

Scope:

- normalize existing capture surfaces into a route-level `EvidenceCaptureArtifact`.
- populate the P0 minimum gate fields only.
- evaluate reconstruction readiness deterministically with the Phase 7F-5 contract.
- persist or expose the handoff artifact without changing importer behavior, preview behavior, Original Mirror behavior, transformed preview behavior, AI reconstruction behavior, route discovery, script policy, asset rewriting, public rendering, or database schema unless separately approved.

The phase after that should be:

Phase 7F-8 - Browser Evidence Expansion MVP.

Scope:

- implement the P1 useful reconstruction bundle for the MVP route sample.
- keep Chrome / Playwright as the only provider.
- keep widget handling evidence-only.
- keep reconstruction execution out of scope.
