# Candidate Context Visualization Foundation

## Phase And Boundary

Phase 8D-19 defines the minimum visual and contextual evidence a human operator
needs before making a Candidate Review decision. It is documentation and
architecture only.

This phase does not implement a projection, resolver, image derivative, overlay,
page, component, endpoint, persistence shape, action, or review behavior. It does
not change Evidence Capture, Limited Dry Run, Candidate Discovery, Candidate
Discovery persistence or UI, Candidate Review persistence or actions, the Review
API or UI actions, Reconstruction, AI, Publishing, schema, or workers.

## Problem Statement

Candidate Review is technically complete but context-poor:

```text
Candidate
  -> Approve / Reject / Defer
  -> Immutable Event
  -> Immutable Package
```

Labels such as `Route /`, `Navigation on /`, and `Section on /` identify the
target but do not show what the operator is authorizing. A reliable decision
requires both identity and recognizable source-page context.

The minimum future review sequence is:

```text
Candidate
  -> Visual Context
  -> Approve / Reject / Defer
```

Visual context is evidence presentation. It is not semantic enrichment, a new
candidate, a review recommendation, or reconstruction intent.

## Existing Reusable Evidence

The current chain already contains most of the required source material.

| Existing asset | What exists | Candidate-context reuse | Constraint |
|---|---|---|---|
| Screenshots | Desktop viewport and desktop full-page PNG artifacts with persisted refs where capture succeeded. | The full-page image is the canonical visual base; the viewport image may provide optional above-fold detail. | Availability is capture-dependent. A future resolver must prove exact site-version, route, capture-run, and screenshot lineage. |
| Rendered DOM | A rendered document snapshot and persisted rendered DOM path/hash where capture succeeded. | Resolve selectors, confirm visible labels, and explain the region represented by geometry. | DOM is supporting evidence, not the visual itself; stale or mismatched DOM must not be combined with another capture. |
| Layout geometry | Per-route viewport width, viewport height, document height, and major-region selectors with document-coordinate bounding boxes. | Map a navigation or section candidate to a visible rectangle on the full-page screenshot. | Geometry and screenshot must share route and capture lineage. Ambiguous or missing matches fail closed. |
| Section evidence | Section ID, route path, selector, bounding box, region type, and confidence. | Direct source for a Section highlight and a deterministic non-AI label. It can also support a Navigation highlight when the region type is `navigation`. | Region type is structural evidence, not a guarantee of business meaning. |
| Navigation evidence | Route path, ordered item labels/hrefs/positions/confidence, count, and source evidence refs. | Supply item count, labels, ordering, and refs used to resolve the navigation container. | It does not itself carry one canonical bounding box; the box must be resolved through its layout/section refs. |
| Computed styles | Fixed-target samples for root, header/navigation, headings, body text, CTA, card, and footer where sampling succeeded. | Optional supporting detail when an operator needs to distinguish a visually ambiguous region. | Sampling is narrow and partial. Styles are not required for the first structural review context. |
| Route models | Route path, source URL, section refs, navigation refs, confidence, and limitation refs. | Supply route identity, source summary, model counts, confidence, and limitations. | A Route model has no route-specific bounding box and should not receive an invented highlight. |
| Navigation models | Navigation ID, route path, ordered items, confidence, evidence refs, and limitation refs. | Canonical source for displayed item count, labels, confidence, limitations, and evidence linkage. | Candidate context must preserve model order and must not infer missing labels. |
| Section models | Section ID, route path, region type, selector, bounding box, confidence, evidence refs, and limitation refs. | Canonical source for the Section label, highlight rectangle, route, confidence, and limitations. | A generic `section` candidate remains generic; visualization must not promote it to a specialized candidate type. |

These assets should be reused through their existing lineage. Phase 8D-19 does
not authorize recapture, screenshot mutation, new evidence persistence, live
source reads, DOM inference beyond existing models, or AI labeling.

## Context Sufficiency Rules

A future context projection is sufficient for action only when all required
fields for the candidate type resolve from one exact evidence chain:

```text
siteVersionId
  -> Evidence Capture artifact/capture run
  -> FirstLimitedDryRunOutput
  -> CandidateDiscovery artifact
  -> candidateId
```

Confidence and limitations must remain visible beside the image. An image alone
can look persuasive while concealing weak or partial evidence.

If a required screenshot, model, or highlight cannot be resolved, the context
must say `unavailable` or `incomplete` and identify the missing evidence. It must
not silently use a different route, latest unrelated artifact, live page, or
estimated rectangle. The future UX may still expose Defer, but 8D-19 does not
change action availability or behavior.

## Route Candidate Requirements

### What The Operator Needs To See

The operator needs to recognize the page represented by the route, understand
its path and structural extent, and see how strong or limited the evidence is.

### Required

- exact route path
- desktop full-page screenshot for that route and evidence lineage
- deterministic route summary: source URL when available, navigation model
  count, section model count, and the model refs represented by the candidate
- candidate confidence
- all candidate-applicable limitations, including screenshot or capture gaps

### Optional

- desktop viewport screenshot for readable above-fold detail
- section and navigation labels/count breakdown
- rendered DOM reference and capture readiness state
- relevant computed-style sample summary
- technical evidence and dry-run refs in a disclosure

A Route candidate does not require a highlighted rectangle. The full page is the
target. Highlighting `body` or the entire image would add no decision value and
could imply false precision.

## Navigation Candidate Requirements

### What The Operator Needs To See

The operator needs to identify which visible navigation region is proposed and
verify that its ordered items correspond to the candidate.

### Required

- desktop full-page screenshot for the candidate route and evidence lineage
- one clearly highlighted navigation region resolved from existing evidence
- exact route path
- navigation item count
- ordered, non-empty item labels
- candidate confidence
- all candidate-applicable limitations

The highlight is valid only when the Navigation model's evidence refs resolve to
one layout region or one section boundary that represents the navigation
container. Multiple item-level regions may be combined only when their union is
deterministic, belongs to the same container and capture, and does not expand to
an unrelated page area. Otherwise context is incomplete.

### Optional

- item hrefs and per-item confidence
- navigation ID and selectors in technical details
- viewport screenshot when the navigation is too small to inspect on the
  scaled full-page image
- rendered DOM excerpt metadata, without treating raw HTML as the primary UX
- relevant header/navigation computed-style sample summary

## Section Candidate Requirements

### What The Operator Needs To See

The operator needs to identify the exact visible page region represented by the
generic Section candidate and understand its structural classification without
being led to believe more semantics were inferred than the evidence supports.

### Required

- desktop full-page screenshot for the candidate route and evidence lineage
- one clearly highlighted section region using the Section model bounding box
- deterministic section label
- exact route path
- candidate confidence
- all candidate-applicable limitations

The label should use existing structural evidence, for example `Hero section`,
`Navigation section`, `Content section`, or `Unknown section`, with stable page
order or the section ID available when needed for disambiguation. It must not
invent marketing purpose, component type, reconstruction choice, or content
meaning.

### Optional

- selector, section ID, region type, and bounding-box values in technical
  details
- viewport or cropped detail as a secondary inspection aid
- rendered DOM facts used by the existing section classifier
- relevant computed-style sample summary

## Screenshot Strategy Assessment

### A. Full Page Screenshot Only

This preserves route context and is sufficient for a Route candidate, but it
does not tell the operator which navigation or section is under review. Repeated
or visually similar regions remain ambiguous.

### B. Full Page Screenshot Plus Highlighted Region

This preserves the page-wide relationship while identifying the exact
Navigation or Section target. It reuses existing full-page screenshots and
document-coordinate geometry. Route candidates use the same full-page base
without an artificial region highlight.

### C. Region Screenshot Only

This makes the target large and readable but removes its position and
relationship to the rest of the page. It also introduces a derivative image
requirement and can conceal whether the selected rectangle is too broad or too
narrow.

### Recommendation

Recommend exactly **B - full page screenshot plus highlighted region**.

It supplies both recognition and precision with the least new evidence surface.
Navigation and Section candidates receive a visible overlay; Route candidates
receive the complete page without a meaningless overlay. A viewport or region
detail may later be secondary, but it must not replace the full-page base in the
minimum context.

## Highlight Strategy

The future visual layer should treat the full-page screenshot as a scaled view
of document coordinates. Existing geometry supplies `x`, `y`, `width`, and
`height`, while `viewportWidth` and `documentHeight` define the coordinate
space. Rendering scales the rectangle with the same factors used for the image
and clips it only to known document bounds.

### Section Highlights

1. Resolve the exact Section model from the candidate's dry-run refs.
2. Confirm route, Candidate Discovery artifact, dry-run output, and Evidence
   Capture lineage.
3. Use the model's bounding box as the primary rectangle.
4. Cross-check the selector and source evidence refs against Section Boundary
   and Layout Geometry evidence when available.
5. If coordinates are non-finite, non-positive, outside the known document, or
   contradictory across the exact lineage, mark the highlight unavailable.

### Navigation Highlights

1. Resolve the exact Navigation model and its source evidence refs.
2. Prefer one referenced Layout Geometry region for a `nav` element or
   navigation role.
3. Otherwise use one referenced Section Boundary region classified as
   `navigation`.
4. Only if the existing refs deterministically identify item regions under one
   container may their document-coordinate union form the highlight.
5. Never choose a rectangle from label text alone, visual guessing, a live DOM,
   or another capture.

The overlay should use a high-contrast translucent fill plus a solid outline
and an external label so content remains visible. The visual must also expose a
text label; color alone is insufficient. This is a presentation recommendation,
not UI implementation.

The current full-page screenshot artifact metadata records capture type and
viewport dimensions, while layout evidence separately records document height.
Phase 8D-20 must define how a resolver verifies actual bitmap dimensions and
coordinate scaling before any overlay is considered authoritative.

## Future CandidateContextProjection

`CandidateContextProjection` should be a read-only, derived presentation model.
It should not become a second Candidate Discovery or Candidate Review source of
truth, and it should not be persisted in a review event or package merely to
display context.

Conceptual shape:

```ts
type CandidateContextProjection = {
  state: "ready" | "incomplete" | "unavailable";
  siteVersionId: string;
  dryRunId: string;
  candidateDiscoveryArtifactId: string;
  candidateId: string;
  candidateType: "route" | "navigation" | "section";
  routePath: string;
  candidateLabel: string;
  screenshotRef: string | null;
  screenshotCaptureType: "desktop_fullpage" | null;
  highlightedRegionRef: string | null;
  highlightedRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
    coordinateSpace: "document_css_pixels";
    sourceEvidenceRefs: string[];
  } | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidenceSummary: {
    routeSummary?: string;
    navigationItemCount?: number;
    navigationItemLabels?: string[];
    sectionRegionType?: string;
    sourceEvidenceRefs: string[];
    sourceDryRunRefs: string[];
  };
  limitations: Array<{
    code: string;
    message: string;
    severity: string;
    sourceRef?: string;
  }>;
  diagnostics: string[];
};
```

The exact contract, resolver boundary, failure codes, field optionality, and
relationship to `CandidateReviewSurfaceProjection` are deferred to 8D-20.
Important design invariants are already fixed:

- exact artifact-instance lineage, never a floating latest evidence lookup
- one candidate in, one context projection out
- metadata and refs, not embedded image bytes
- deterministic labels and evidence summaries, with no AI
- Route highlight nullable by design
- Navigation and Section highlight required for `ready`
- missing required evidence produces `incomplete` or `unavailable`, never a
  guessed visual
- no mutation authority and no review recommendation

## Review UX Impact

Current:

```text
Candidate
  -> Approve
```

Future:

```text
Candidate identity
  -> Full-page visual context
  -> Target highlight for Navigation or Section
  -> Confidence and limitations
  -> Approve / Reject / Defer
```

The action remains the existing single-candidate review intent over the exact
Candidate Discovery and Review Package artifact identities. Context changes what
the operator can inspect; it must not change payload shape, optimistic
concurrency, immutable event history, exact replay, authorization, or action
semantics without a separately authorized phase.

## Relationship To Reconstruction

```text
Evidence
  -> Candidate Context
  -> Review
  -> Approved Candidate
  -> Future Reconstruction Package
```

Evidence remains observational truth. Candidate Context makes that truth
legible to the operator. Review records a human decision against the exact
candidate. Only an approved candidate may later contribute to a Future
Reconstruction Package.

Candidate Context does not authorize reconstruction, choose components,
generate content or code, or become reconstruction output. Reject and Defer
remain non-authorizing outcomes. A future Reconstruction Package must retain the
approved candidate and review lineage rather than treating the visualization as
the approval itself.

## Completion Boundary And Recommendation

At the end of 8D-19, the minimum context is defined for Route, Navigation, and
Section candidates; existing evidence reuse and its gaps are classified; full
page plus highlighted region is the single screenshot strategy; geometry-based
highlight rules and fail-closed behavior are defined; and the future read-only
projection boundary is outlined.

Recommend exactly one next phase: **Phase 8D-20 - Candidate Context Projection
Design**, documentation and contract design only. It should define the exact
projection contract, resolver inputs, lineage checks, readiness/failure states,
and integration boundary with the existing Candidate Review surface. It must not
implement the projection or change UI, review actions, persistence, Evidence
Capture, Limited Dry Run, Candidate Discovery, Reconstruction, AI, Publishing,
schema, or workers.

## Phase 8D-20 Projection Design Resolution

Phase 8D-20 completes the deferred contract design in
`docs/architecture/CANDIDATE_CONTEXT_PROJECTION_DESIGN.md`. The projection is an
exact-lineage, one-candidate read model with `ready | incomplete | unavailable`
states. Route uses an exact full-page screenshot without a highlight; Navigation
and Section require a deterministic geometry-backed highlight.

The selected highlight model carries both resolved coordinates and geometry
evidence refs. The selected screenshot model carries both the direct persisted
artifact path and its evidence lineage ref. Missing screenshot or invalid
lineage fails unavailable; missing, invalid, or ambiguous required geometry
fails incomplete. Presentation receives validated render inputs and performs no
independent evidence resolution.

Phase 8D-20 remains documentation and architecture only. Its single recommended
next phase is **Phase 8D-21 - Candidate Context Projection Implementation**.

## Phase 8D-21 Projection Implementation Resolution

Phase 8D-21 implements the deterministic read-only projection defined by the
foundation and 8D-20 design. Existing full-page screenshot refs are projected
directly; no screenshot or crop is created. Route has no artificial highlight.
Navigation and Section highlights carry both resolved document coordinates and
the exact geometry evidence refs used to justify them.

The implementation preserves the fail-closed visualization boundary: missing
or invalid screenshot/lineage is `unavailable`, while missing, invalid, or
ambiguous Navigation or Section geometry is `incomplete`. A standalone pure
validator enforces state/type compatibility, screenshot refs, geometry bounds,
lineage fields, and recursive forbidden generated/output fields.

There is no UI integration or Review behavior change in 8D-21. The single
recommended next phase is **Phase 8D-22 - Candidate Context Projection
Real-Artifact Validation**.
