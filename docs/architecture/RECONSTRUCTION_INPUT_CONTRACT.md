# Reconstruction Input Contract

## Scope

Phase 7F-5 defines the handoff boundary between Evidence Capture, Original Mirror, and future AI Reconstruction.

This is a contract-definition phase only. It does not change importer behavior, capture behavior, Chrome/Playwright behavior, Original Mirror behavior, preview behavior, route discovery, asset acquisition, script policy, runtime rendering, public rendering, persistence schema, Evidence Capture persistence logic, or AI behavior.

The canonical TypeScript contract is:

- `apps/platform/gnr8/architecture/reconstruction-input-contract.ts`

## Boundary

Evidence Capture is the only source of reconstruction input. Original Mirror may display captured source evidence, but it is not itself reconstruction evidence. Future AI Reconstruction may consume only the fields classified as `REQUIRED` or `OPTIONAL` by this contract.

Unsupported fields must never be used as reconstruction evidence. They may remain available to operators, diagnostics, storage, or provenance systems, but they must not shape reconstructed content, structure, layout, design tokens, or candidate sections.

## Required Evidence

Minimum reconstruction readiness requires:

- `status`
- `source.sourceUrl` or `route.sourceUrl`
- `source.routePath` or `route.discoveredRoutePath`
- `rendered.renderedDomRef`
- `rendered.renderedHtmlHash`
- `rendered.renderStatus`
- `route.captureStatus`
- no normalized blocker fidelity limitation

If any of these fail, readiness is `NOT_READY`.

## Optional Evidence

Optional evidence improves reconstruction quality and confidence but does not block experimental reconstruction:

- raw HTML reference
- final and canonical URL evidence
- screenshots and viewport metadata
- computed style samples, candidate tokens, colors, spacing, and fonts
- layout boxes, breakpoints, regions, repeated regions, sticky/fixed elements, and structural hints
- network request, response, failure, blocked-request, and asset classification evidence
- runtime observation summaries and late-node signals
- image, background image, video, form, map, gallery, cookie banner, accessibility, and chat widget evidence
- normalized fidelity limitations

## Unsupported Evidence

Unsupported fields are contract/provenance/storage/policy metadata and must not be consumed by reconstruction:

- `kind`
- `architectureVersion`
- `source.captureProvider`
- `source.captureRunId`
- `rawInputs.responseHeaders`
- `scriptRuntime.inlineScriptSignatures`
- `route.routePriority`
- `route.rawFilePath`

## Evidence Classification Matrix

| Evidence Field | Classification | Reason |
|---|---|---|
| `kind` | UNSUPPORTED | Artifact discriminator is contract metadata, not reconstruction evidence. |
| `architectureVersion` | UNSUPPORTED | Architecture version is provenance metadata and must not influence reconstructed output. |
| `status` | REQUIRED | Capture status gates whether any captured evidence is trustworthy enough to hand off. |
| `source.sourceUrl` | REQUIRED | The original source URL anchors route identity, attribution, and remediation. |
| `source.finalUrl` | OPTIONAL | Final URL improves redirect understanding but source URL plus route identity can start reconstruction. |
| `source.routePath` | REQUIRED | A stable route identity is required before route-level reconstruction may begin. |
| `source.canonicalUrl` | OPTIONAL | Canonical URL improves route deduplication but is not required for a single route candidate. |
| `source.captureProvider` | UNSUPPORTED | Provider identity may diagnose capture but must not shape reconstructed content or layout. |
| `source.capturedAt` | OPTIONAL | Timestamp is useful provenance for stale evidence review, not content generation. |
| `source.captureRunId` | UNSUPPORTED | Run identity is operational metadata and must not be reconstruction evidence. |
| `rawInputs.rawHtmlRef` | OPTIONAL | Raw HTML can recover source text and asset references, but rendered DOM is the reconstruction baseline. |
| `rawInputs.responseHeaders` | UNSUPPORTED | HTTP headers may contain operational/security metadata and must not be used as page evidence. |
| `rawInputs.statusCode` | OPTIONAL | HTTP status helps diagnose capture quality but is not enough to reconstruct structure. |
| `rawInputs.redirectChain` | OPTIONAL | Redirect evidence improves route provenance and canonicalization. |
| `rendered.renderedDomRef` | REQUIRED | Browser-observed DOM is the minimum structural substrate for reconstruction. |
| `rendered.renderedHtmlHash` | REQUIRED | Rendered HTML hash anchors integrity of the DOM evidence being reconstructed. |
| `rendered.screenshotRefs` | OPTIONAL | Screenshots improve visual fidelity and review but are not the minimum structural input. |
| `rendered.viewport` | OPTIONAL | Viewport context improves interpretation of screenshots and layout samples. |
| `rendered.fullPageScreenshotRef` | OPTIONAL | Full-page screenshots improve visual completeness and section ordering confidence. |
| `rendered.domNodeCount` | OPTIONAL | Node count helps detect incomplete DOM capture but is not independently reconstructive. |
| `rendered.renderStatus` | REQUIRED | Render status gates whether rendered DOM evidence can be consumed. |
| `rendered.renderFailureReason` | OPTIONAL | Failure reason guides remediation when readiness is blocked. |
| `computedStyle.computedStyleSampleRefs` | OPTIONAL | Computed styles improve visual fidelity but are not required for minimum structure. |
| `computedStyle.designTokenCandidates` | OPTIONAL | Token candidates improve design translation but future reconstruction must validate them. |
| `computedStyle.fontsDetected` | OPTIONAL | Detected fonts improve typography fidelity. |
| `computedStyle.fontSourcesLoaded` | OPTIONAL | Loaded font sources improve confidence that typography evidence is complete. |
| `computedStyle.missingFontSources` | OPTIONAL | Missing fonts are quality signals and may lower confidence without blocking minimum readiness. |
| `computedStyle.colorCandidates` | OPTIONAL | Color candidates improve visual reconstruction and token extraction. |
| `computedStyle.spacingCandidates` | OPTIONAL | Spacing candidates improve layout fidelity and rhythm inference. |
| `layout.layoutBoxRefs` | OPTIONAL | Bounding boxes are high-value layout evidence but not required for experimental reconstruction. |
| `layout.viewportBreakpoints` | OPTIONAL | Breakpoint evidence improves responsive confidence. |
| `layout.aboveFoldRegions` | OPTIONAL | Above-fold regions improve hero and primary content placement. |
| `layout.repeatedRegions` | OPTIONAL | Repeated regions improve card/list/gallery reconstruction confidence. |
| `layout.stickyFixedElements` | OPTIONAL | Sticky and fixed elements improve navigation and overlay fidelity. |
| `layout.routeLevelStructuralHints` | OPTIONAL | Structural hints improve section boundary confidence. |
| `network.requestInventory` | OPTIONAL | Request inventory improves asset and widget dependency understanding. |
| `network.responseInventory` | OPTIONAL | Response inventory improves asset availability and MIME confidence. |
| `network.failedRequests` | OPTIONAL | Failed requests identify missing dependencies and confidence risks. |
| `network.blockedRequests` | OPTIONAL | Blocked requests identify capture limitations and third-party gaps. |
| `network.assetClassifications` | OPTIONAL | Asset classifications improve evidence grouping and completeness checks. |
| `scriptRuntime.scriptInventory` | OPTIONAL | Script inventory identifies runtime dependencies without allowing script execution in reconstruction. |
| `scriptRuntime.inlineScriptSignatures` | UNSUPPORTED | Inline script hashes are policy/security evidence and must not become reconstruction content. |
| `scriptRuntime.consoleErrorsWarnings` | OPTIONAL | Console evidence can explain incomplete capture and confidence loss. |
| `scriptRuntime.domMutationSummary` | OPTIONAL | Mutation summary identifies runtime instability without replaying runtime behavior. |
| `scriptRuntime.postRenderAddedNodes` | OPTIONAL | Post-render node evidence helps detect late content and duplicate insertions. |
| `scriptRuntime.duplicateInsertionSignals` | OPTIONAL | Duplicate insertion signals warn against over-reconstructing repeated runtime content. |
| `scriptRuntime.lazyloadRuntimeDependencySignals` | OPTIONAL | Lazy-load signals explain missing media or late sections. |
| `media.imageInventory` | OPTIONAL | Image inventory improves media fidelity and asset completeness. |
| `media.missingImages` | OPTIONAL | Missing image evidence lowers confidence and guides capture remediation. |
| `media.backgroundImageRefs` | OPTIONAL | Background image refs improve visual and hero fidelity. |
| `media.videoMediaRefs` | OPTIONAL | Video refs identify media sections and embeds. |
| `widgets.maps` | OPTIONAL | Map evidence can inform a reconstruction substitute without replaying the source widget. |
| `widgets.galleriesSlidersLightboxes` | OPTIONAL | Gallery evidence improves media collection reconstruction. |
| `widgets.forms` | OPTIONAL | Form evidence improves form section reconstruction and review. |
| `widgets.accessibilityWidgets` | OPTIONAL | Accessibility widget evidence explains overlays but should remain reviewable evidence. |
| `widgets.cookieBanners` | OPTIONAL | Cookie banner evidence helps distinguish compliance overlays from core page content. |
| `widgets.chatSupportWidgets` | OPTIONAL | Chat widget evidence helps distinguish support overlays from core page content. |
| `route.discoveredRoutePath` | REQUIRED | Per-route discovered identity is required when source routePath is absent or ambiguous. |
| `route.sourceUrl` | REQUIRED | Per-route source URL anchors route evidence and remediation. |
| `route.finalUrl` | OPTIONAL | Per-route final URL improves redirect and alias handling. |
| `route.routePriority` | UNSUPPORTED | Crawl priority is acquisition metadata and must not shape reconstructed output. |
| `route.navigationSource` | OPTIONAL | Navigation source improves route provenance and confidence. |
| `route.rawFilePath` | UNSUPPORTED | Local raw file paths are storage implementation details. |
| `route.captureStatus` | REQUIRED | Per-route capture status gates route-level reconstruction readiness. |
| `route.knownFidelityLimitations` | OPTIONAL | Normalized route limitations guide readiness, remediation, and confidence. |
| `fidelityLimitations` | OPTIONAL | Normalized artifact limitations guide readiness, remediation, and confidence. |

## Readiness Model

Readiness is deterministic and calculated entirely from evidence. No AI judgment, LLM call, semantic classification, layout generation, or design generation is allowed.

`NOT_READY`
: Evidence is insufficient or blocked. Examples: capture failed, source URL missing, route identity missing, rendered DOM missing, render failed, or blocker fidelity limitation exists.

`MINIMUM_READY`
: Enough evidence exists for experimental reconstruction. Minimum means source identity, route identity, available or partial capture status, available or partial render status, rendered DOM ref, rendered HTML hash, and no blocker fidelity limitation.

`RECOMMENDED`
: Enough evidence exists for production-quality reconstruction. This requires minimum readiness plus screenshots, computed style evidence, layout evidence, network evidence, and media evidence.

`HIGH_CONFIDENCE`
: Evidence completeness is suitable for deterministic reconstruction. This requires recommended readiness plus full-page screenshot evidence, multi-breakpoint layout context, above-fold region evidence, response inventory, no missing fonts, no missing images, no non-analytics failed/blocked requests, and represented widget evidence when widget-like structural hints exist.

Current reconstruction readiness remains `NOT_READY` because the full Evidence Capture artifact is not emitted and critical minimum fields are not yet normalized into a durable reconstruction input artifact.

## Blockers

`ReconstructionBlocker` contains:

- `id`
- `title`
- `description`
- `severity`
- `remediationHint`

Defined blockers:

| Blocker | Meaning | Remediation |
|---|---|---|
| `capture_unavailable` | Evidence artifact is unavailable or not started. | Persist a route-level evidence artifact with available or partial status. |
| `capture_failed` | Evidence artifact reports failed capture. | Retry or expand Evidence Capture until route evidence is available. |
| `missing_source_url` | No source URL is normalized. | Normalize `source.sourceUrl` and/or `route.sourceUrl`. |
| `missing_route_identity` | No route path or discovered route path exists. | Normalize `source.routePath` or `route.discoveredRoutePath`. |
| `missing_rendered_dom` | Rendered DOM ref or hash is missing, or rendered evidence is unavailable. | Persist rendered browser DOM and hash. |
| `render_failed` | Route or rendered capture reports failure. | Resolve capture/render failure before handoff. |
| `blocker_fidelity_limitation` | Normalized fidelity limitation explicitly blocks reconstruction. | Resolve limitation or route to manual review. |

## Future Confidence Model

Confidence is not calculated in Phase 7F-5. The contract only defines future confidence input families:

- DOM completeness
- Asset completeness
- Font completeness
- Layout completeness
- Widget completeness
- Media completeness
- Network completeness
- Runtime stability
- Visual reference completeness
- Fidelity limitation completeness

These signals are inputs for future confidence calculation, not current scoring behavior.

## Reconstruction Candidate Contract

`ReconstructionCandidateArtifact` is a future output shape only. It is implementation-neutral and does not generate React, blocks, layout, design tokens, or editable models.

Candidate sections may include:

- navigation
- hero
- content regions
- card collections
- blog listing
- gallery
- forms
- maps
- footer
- design tokens

Every candidate section must point back to source evidence refs and confidence input families. Phase 7F-5 does not produce candidate artifacts.

## Phase 7F-6 Planning Implication

To reach `MINIMUM_READY`, Capture Expansion should focus first on durable normalization and persistence of:

- full `EvidenceCaptureArtifact.status`
- source URL and per-route source URL
- source route path and/or discovered route path
- rendered DOM artifact ref
- rendered HTML hash
- rendered render status
- route capture status
- normalized blocker fidelity limitations

After minimum readiness, the highest-value expansion path for `RECOMMENDED` and `HIGH_CONFIDENCE` is rendered layout geometry, browser network inventory, script/runtime observation, media/widget inventories, font source evidence, and normalized limitation evidence.
