# Evidence Capture Inventory Audit

## Scope

Phase 7F-2.5 audited the current GNR8 implementation against the Evidence Capture fields defined in `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`.

This is an architecture inventory only. No importer behavior, preview behavior, reconstruction behavior, worker behavior, Playwright behavior, persistence behavior, route discovery, rendering, or schema was changed.

## Existing Evidence Capture Surfaces

Current capture-related evidence exists across these implementation surfaces:

- URL import pipeline: `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- Rendered capture contract and executor: `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts` and `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts`
- Rendered capture worker request/response/job flow: `apps/platform/gnr8/import-rendered-capture-worker/*`
- Worker route surface: `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts`
- Raw/static importer assets and diagnostics: `apps/platform/gnr8/import/runtime/*`
- Semantic import extraction: `apps/platform/gnr8/import-semantic/semantic-import-engine.ts`
- Style signal extraction from computed samples: `apps/platform/gnr8/style-signals/style-signal-extractor.ts`
- Multi-page route discovery and route evidence: `apps/platform/gnr8/multipage-import/*`

The current implementation already captures and materializes a narrow rendered evidence set:

- entry HTML fetched by URL import
- selected rendered DOM HTML when the worker succeeds
- desktop viewport screenshot
- desktop full-page screenshot
- computed style samples for fixed probe targets
- direct raw asset fetch manifest for stylesheets, scripts, images, srcset candidates, lazy image attributes, gallery image anchors, and stylesheet-linked local assets
- import diagnostics, worker diagnostics, worker job state, worker health, and run-scoped acquisition evidence

The current implementation does not yet emit the full `EvidenceCaptureArtifact` object defined by the architecture contract.

## Inventory Matrix

| Field | Status | Current Source | Gap |
|---------|---------|---------|---------|
| `kind` | PARTIAL | Type scaffold and `createEmptyEvidenceCaptureArtifact` in `importer-architecture-split-contract.ts`. | Not emitted by live URL import as a persisted evidence artifact. |
| `architectureVersion` | PARTIAL | Contract constant `IMPORTER_ARCHITECTURE_SPLIT_VERSION`. | Version exists in scaffold only; current snapshot uses rendered-capture and URL import versions instead. |
| `status` | PARTIAL | Rendered capture status, source selection status, intake status, and acquisition evidence. | No unified `EvidenceCaptureArtifact.status` is produced. |
| `source.sourceUrl` | SUPPORTED_NOW | URL import snapshot `sourceUrl`; worker request `sourceUrl`. | No major gap for current URL import. |
| `source.finalUrl` | SUPPORTED_NOW | URL import `response.url`, `importIntake.evidence.finalUrl`, navigation diagnostic final URL. | Redirect sequence is not preserved with it. |
| `source.routePath` | PARTIAL | Single-page root snapshot plus multi-page route discovery paths. | Not normalized into the evidence artifact for every captured route. |
| `source.canonicalUrl` | PARTIAL | Multi-page canonical discovery extracts canonical URLs. | Not wired into the single-page rendered evidence artifact. |
| `source.captureProvider` | PARTIAL | Rendered capture worker and Playwright runtime selection imply `chrome_playwright`. | Not emitted as first-class evidence metadata. |
| `source.capturedAt` | PARTIAL | `latest-run.json`, job timestamps, and acquisition evidence timestamps. | No single captured-at timestamp on the evidence artifact. |
| `source.captureRunId` | SUPPORTED_NOW | `snapshotRunId`, worker `requestId`, and worker `importId`. | Needs canonical mapping into the evidence artifact. |
| `rawInputs.rawHtmlRef` | SUPPORTED_NOW | `responseHtmlPathAbs`, entry HTML, `raw-response-snippet.txt`. | Artifact ref shape with media type, SHA, and bytes is not consistently normalized. |
| `rawInputs.responseHeaders` | PARTIAL | Entry fetch records content type and status. | Full response header map is not captured. |
| `rawInputs.statusCode` | SUPPORTED_NOW | `lastSuccessfulStatus` and `importIntake.evidence.httpStatus`. | No major gap for entry response status. |
| `rawInputs.redirectChain` | MISSING | Fetch follows redirects and stores final URL. | Actual HTTP redirect chain entries are not preserved. |
| `rendered.renderedDomRef` | SUPPORTED_NOW | `rendered-capture/rendered-dom.html`, `rendered/dom.html`, worker hydrated DOM. | Needs normalized `EvidenceArtifactRef` in final evidence artifact. |
| `rendered.renderedHtmlHash` | SUPPORTED_NOW | `RenderedDocumentSnapshot.htmlSha256`. | Needs direct field mapping into the architecture artifact. |
| `rendered.screenshotRefs` | SUPPORTED_NOW | Viewport and full-page PNG artifacts under rendered capture paths. | Worker adapter may lose dimensions when hydrating inline artifacts. |
| `rendered.viewport` | PARTIAL | Default viewport is 1366x768; screenshot metadata stores width and height. | Device scale factor and mobile flag are not captured. |
| `rendered.fullPageScreenshotRef` | SUPPORTED_NOW | Desktop full-page screenshot artifact and canonical rendered screenshot copy. | Needs normalized artifact ref in final evidence artifact. |
| `rendered.domNodeCount` | PARTIAL | Render quality breakdown and meaningful node counts in rendered capture manifest. | Exact DOM node count field is not emitted. |
| `rendered.renderStatus` | SUPPORTED_NOW | Rendered capture `status`, visibility status, and source selection. | Needs direct mapping into contract status enum. |
| `rendered.renderFailureReason` | PARTIAL | Diagnostics and worker failure codes/classes. | No single failure-reason field is normalized. |
| `computedStyle.computedStyleSampleRefs` | SUPPORTED_NOW | `rendered/computed-styles.json` and worker computed-style artifact. | Needs normalized artifact ref list. |
| `computedStyle.designTokenCandidates` | PARTIAL | Style signal extractor infers color, typography, spacing, radius, shadow, CTA, and surface signals. | No contract-shaped token candidates with evidence refs. |
| `computedStyle.fontsDetected` | PARTIAL | Computed style samples include font families for fixed targets. | No full font inventory with source, weight, style, and evidence refs. |
| `computedStyle.fontSourcesLoaded` | MISSING | None found. | Loaded webfont sources are not captured or classified. |
| `computedStyle.missingFontSources` | MISSING | None found. | Missing or failed font sources are not captured. |
| `computedStyle.colorCandidates` | PARTIAL | Computed samples and style signals infer colors. | No usage counts, roles, or evidence refs in the contract shape. |
| `computedStyle.spacingCandidates` | PARTIAL | Computed samples capture padding and style signals infer spacing rhythm. | No broad margin, gap, position, size, or usage-count inventory. |
| `layout.layoutBoxRefs` | MISSING | None found. | No bounding-box artifact or layout sample artifact exists. |
| `layout.viewportBreakpoints` | PARTIAL | One desktop viewport is used for rendered capture. | No multi-breakpoint capture. |
| `layout.aboveFoldRegions` | MISSING | None found. | No region geometry extraction exists. |
| `layout.repeatedRegions` | MISSING | None found. | No repeated-region geometry extraction exists. |
| `layout.stickyFixedElements` | MISSING | None found. | Sticky/fixed positioning is not sampled. |
| `layout.routeLevelStructuralHints` | PARTIAL | Semantic importer and HTML section detector infer sections, galleries, contact/forms, hero-like areas, and footer-like areas. | Hints are not generated from rendered evidence with confidence and evidence refs. |
| `network.requestInventory` | PARTIAL | URL import `fetchManifest` records direct asset references and fetch outcomes. | Browser network requests from Playwright are not instrumented. |
| `network.responseInventory` | PARTIAL | `fetchManifest` records status, content type, and byte length for direct asset fetches. | No full response headers, browser resource type, cache state, or MIME inventory. |
| `network.failedRequests` | PARTIAL | Asset fetch diagnostics and `fetchManifest.fetchStatus = fetch_failed`. | Not represented as contract-shaped failed browser network requests. |
| `network.blockedRequests` | MISSING | Unsupported/nonlocal references are diagnosed. | Blocked browser request reasons are not captured. |
| `network.assetClassifications` | PARTIAL | `UrlImportAssetKind` classifies stylesheet, image, script, and style asset. | Contract network classifications are broader and not derived from browser network events. |
| `scriptRuntime.scriptInventory` | PARTIAL | Raw HTML asset discovery includes script references. | No first-party/third-party/widget classification or rendered script inventory. |
| `scriptRuntime.inlineScriptSignatures` | MISSING | None found. | Inline scripts are not hashed into signatures. |
| `scriptRuntime.consoleErrorsWarnings` | MISSING | None found. | Playwright does not listen for console messages. |
| `scriptRuntime.domMutationSummary` | MISSING | None found. | DOM mutation observation is not implemented. |
| `scriptRuntime.postRenderAddedNodes` | MISSING | None found. | Added post-render nodes are not tracked. |
| `scriptRuntime.duplicateInsertionSignals` | MISSING | None found. | Duplicate runtime insertion signals are not captured. |
| `scriptRuntime.lazyloadRuntimeDependencySignals` | PARTIAL | Raw importer recognizes lazy image fallback attributes. | Runtime lazy-load dependency behavior is not observed. |
| `media.imageInventory` | PARTIAL | Image discovery, fetch manifest, `image-asset-discovery.json`, semantic image roles. | Rendered dimensions and evidence refs are incomplete. |
| `media.missingImages` | PARTIAL | Fetch failures, file-map misses, and preview rewrite diagnostics. | No contract-shaped missing-image inventory with selector hints. |
| `media.backgroundImageRefs` | PARTIAL | Stylesheet-linked `url(...)` local assets are fetched. | No selector hints or rendered dimensions for background images. |
| `media.videoMediaRefs` | MISSING | None found. | Video elements/providers/posters are not inventoried. |
| `widgets.maps` | PARTIAL | Runtime compatibility and semantic heuristics identify some map-related links or map modules. | No contract-shaped map widget evidence with iframe/script refs. |
| `widgets.galleriesSlidersLightboxes` | PARTIAL | Gallery image anchors, semantic gallery sections, and preview smoke gallery markers exist. | No widget evidence list for slider/lightbox runtimes. |
| `widgets.forms` | PARTIAL | Semantic importer detects forms, action, method, and field count. | Not emitted as capture evidence with selector hints and refs. |
| `widgets.accessibilityWidgets` | MISSING | None found. | Accessibility overlays/widgets are not detected. |
| `widgets.cookieBanners` | MISSING | Cookie/legal text may be treated as footer/content. | Cookie banner runtime/widget detection does not exist. |
| `widgets.chatSupportWidgets` | MISSING | None found. | Chat/support widgets are not detected. |
| `route.discoveredRoutePath` | SUPPORTED_NOW | Multi-page discovery and single-page root snapshot paths. | Needs direct mapping into route capture evidence. |
| `route.sourceUrl` | SUPPORTED_NOW | URL import source and route discovery source URLs. | No major gap. |
| `route.finalUrl` | PARTIAL | Entry fetch final URL and redirect/alias discovery evidence. | Not per-route in the evidence artifact with redirect chain. |
| `route.routePriority` | SUPPORTED_NOW | Multi-page route priority balancing. | Needs direct mapping into route capture evidence. |
| `route.navigationSource` | SUPPORTED_NOW | Multi-page discovery provenance includes seed/link/sitemap/redirect sources. | Needs direct mapping into route capture evidence. |
| `route.rawFilePath` | SUPPORTED_NOW | Raw snapshot file paths and route-map/html-path-map persistence. | Needs direct mapping into route capture evidence. |
| `route.captureStatus` | PARTIAL | Intake status, rendered capture status, and source selection status. | No unified per-route evidence capture status. |
| `route.knownFidelityLimitations` | PARTIAL | Diagnostics identify degraded capture, fallback, weak rendered DOM, missing assets, and worker failures. | Not normalized into `KnownFidelityLimitation[]`. |
| `fidelityLimitations` | PARTIAL | Diagnostic codes and helper `classifyCaptureLimitation`. | No runtime field populated with normalized limitations and evidence refs. |

## Evidence Capture Coverage

Total audited fields: 66

Supported Now: 16 fields, 24.2%

Partial: 33 fields, 50.0%

Missing: 17 fields, 25.8%

The coverage profile is therefore not "mostly missing"; it is "narrowly operational with many partial projections." GNR8 already captures useful rendered evidence, raw input evidence, asset fetch evidence, diagnostics, and route discovery evidence. It does not yet capture reconstruction-grade browser layout, full network, script runtime, widget, or normalized limitation evidence.

## Highest Value Gaps

1. Rendered layout geometry: bounding boxes, above-fold regions, repeated regions, sticky/fixed elements, and multi-breakpoint viewport evidence. This is the highest-value gap for reconstructing structure faithfully.
2. Browser network inventory: Playwright-level requests, responses, failed requests, blocked requests, headers, MIME types, resource types, and cache state. This is needed to distinguish source assets, runtime dependencies, third-party widgets, and failed resources.
3. Script/runtime observation: console errors, runtime mutations, post-render added nodes, duplicate insertions, lazy-load signals, and inline script signatures. This is essential for builder/runtime-dependent sites.
4. Media and widget evidence: rendered image dimensions, background-image selector hints, videos, iframes, maps, forms, galleries, cookie banners, accessibility widgets, and chat widgets. This is essential for reconstructing interactive/source-dependent sections.
5. Normalized fidelity limitations: diagnostics already exist, but they are not converted into `KnownFidelityLimitation[]` with affected layer, severity, evidence refs, and recommended next layer.

## Architecture Recommendation

An intermediate Capture Expansion phase is required before treating Phase 7F-3 as full Evidence Capture persistence.

Phase 7F-3 can persist the current narrow evidence set immediately only if it is explicitly scoped to existing artifacts: raw HTML, rendered DOM, viewport/full-page screenshots, computed style samples, fetch manifest, acquisition evidence, diagnostics, worker job state, and worker health.

It should not be treated as complete reconstruction-grade Evidence Capture yet. Persisting the full `EvidenceCaptureArtifact` contract now would mostly encode partial or empty sections for layout, network, script runtime, media/widget evidence, and normalized fidelity limitations. Those are the most valuable inputs for future reconstruction, so a Capture Expansion phase should fill them before the architecture depends on the full contract as a reliable reconstruction substrate.

## Baseline Conclusion

The current implementation has a real capture foundation:

- Chrome/Playwright rendered capture exists.
- Worker request/response/job orchestration exists.
- Rendered DOM and screenshots exist.
- Computed style sampling exists.
- Raw HTML and direct asset acquisition exist.
- Diagnostics and run-scoped evidence files exist.
- Multi-page route discovery and priority evidence exist.

The current implementation does not yet have a complete Evidence Capture architecture:

- No full `EvidenceCaptureArtifact` is produced.
- No full browser network inventory exists.
- No rendered layout geometry exists.
- No script runtime observation exists.
- No full media/widget evidence inventory exists.
- No normalized fidelity limitation list is populated.
