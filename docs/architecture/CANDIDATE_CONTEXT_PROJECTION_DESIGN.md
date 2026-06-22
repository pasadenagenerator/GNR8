# Candidate Context Projection Design

## Phase And Boundary

Phase 8D-20 designs the deterministic, read-only projection that supplies
existing visual and contextual evidence to Candidate Review. It is documentation
and architecture only.

This phase adds no implementation, image processing, overlay rendering, UI or
Review behavior, endpoint, persistence, capture, reconstruction, AI, publishing,
schema, or worker change. Evidence Capture, Candidate Discovery, Candidate
Review, Review Actions, and the Review API remain unchanged.

## Purpose And Ownership

`CandidateContextProjection` translates one exact Candidate Discovery candidate
and its existing evidence lineage into review-ready presentation data:

```text
Candidate Review Page
  -> Context Projection
  -> Visual Review Card
  -> Approve / Reject / Defer
```

It is a derived read model, not a source of truth. It owns no candidate,
screenshot, geometry, review decision, or action state. It contains only values
copied from validated artifacts or derived by closed rules. Presentation code
must not perform artifact lookup, candidate matching, coordinate resolution, or
fallback selection.

## Resolver Input

A future resolver accepts exact identities, never a floating `latest` request:

```ts
type CandidateContextProjectionInput = {
  siteVersionId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  candidateId: string;
};
```

The Review Package anchors the candidate shown by Candidate Review. Its linked
Candidate Discovery artifact supplies the candidate and Limited Dry Run lineage.
Once resolution starts, a latest pointer, another route, live page, or newer
capture is never a fallback.

## Projection Contract

```ts
type CandidateContextProjection = {
  state: "ready" | "incomplete" | "unavailable";

  lineage: {
    siteVersionId: string;
    candidateReviewPackageArtifactId: string;
    candidateDiscoveryArtifactId: string;
    dryRunId: string | null;
    firstLimitedDryRunOutputArtifactId: string | null;
    evidenceCaptureArtifactId: string | null;
    captureRunId: string | null;
    routePath: string | null;
    candidateId: string;
    candidateType: "route" | "navigation" | "section" | null;
  };

  screenshot: {
    artifactPath: string;
    evidenceRef: string;
    captureType: "desktop_fullpage";
    routePath: string;
    captureRunId: string;
    bitmapWidth: number;
    bitmapHeight: number;
  } | null;

  highlight: {
    kind: "navigation" | "section";
    geometryEvidenceRefs: string[];
    rectangle: {
      x: number;
      y: number;
      width: number;
      height: number;
      coordinateSpace: "document_css_pixels";
      sourceViewportWidth: number;
      sourceDocumentHeight: number;
    };
    label: string;
  } | null;

  candidateSummary: {
    label: string;
    routePath: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    route: {
      sourceUrl: string | null;
      navigationCount: number;
      sectionCount: number;
    } | null;
    navigation: {
      itemCount: number;
      orderedLabels: string[];
    } | null;
    section: {
      sectionLabel: string;
      regionType: string;
    } | null;
  } | null;

  evidenceSummary: {
    candidateEvidenceRefs: string[];
    modelEvidenceRefs: string[];
    dryRunRefs: string[];
  };

  limitations: Array<{
    code: string;
    message: string;
    severity: "info" | "warning" | "blocking";
    sourceRef: string | null;
  }>;

  diagnostics: Array<{
    code: CandidateContextDiagnosticCode;
    message: string;
    sourceRef: string | null;
  }>;
};

type CandidateContextDiagnosticCode =
  | "SCREENSHOT_MISSING"
  | "SCREENSHOT_INVALID"
  | "GEOMETRY_MISSING"
  | "GEOMETRY_INVALID"
  | "LINEAGE_INVALID"
  | "CANDIDATE_NOT_FOUND"
  | "CANDIDATE_TYPE_INCOMPATIBLE"
  | "ROUTE_MISMATCH"
  | "HIGHLIGHT_MAPPING_AMBIGUOUS"
  | "DETERMINISTIC_INPUT_INVALID";
```

Arrays preserve source order unless the source contract defines another
canonical order. Limitations preserve source text. Diagnostics use stable
templates keyed by the closed code set, not exception dumps. Embedded image
bytes, live values, current time, generated summaries, review recommendations,
and reconstruction intent are forbidden.

The four input identities are always echoed. Downstream lineage fields and the
candidate summary are nullable only so an unavailable result can report exactly
where resolution stopped without inventing values. A ready result requires all
lineage fields and its compatible candidate summary to be non-null.

### State Semantics

- `ready`: common lineage, screenshot, summary, refs, and type-specific fields
  are valid. Navigation and Section have one valid highlight. Route deliberately
  has `highlight = null`.
- `incomplete`: candidate and common lineage are valid, but required contextual
  evidence such as geometry is absent, invalid, or ambiguous.
- `unavailable`: candidate identity, required screenshot, or artifact lineage
  cannot be established safely.

Any unavailable condition wins; otherwise any incomplete condition wins;
otherwise the result is ready.

## Route Projection

Use the exact route's persisted `desktop_fullpage` screenshot from the Evidence
Capture artifact and capture run linked through the candidate's Limited Dry Run.
Screenshot route metadata must equal the candidate route. Do not substitute a
viewport screenshot, live URL, other route, or unrelated capture.

The summary contains exact route path, persisted source URL when present, and
deterministic Navigation and Section model counts for the route. Its label is
`Route {routePath}`. A missing source URL is `null`, never guessed.

Confidence is the canonical candidate `LOW | MEDIUM | HIGH` value unchanged.
All candidate-applicable limitations and projection limitations remain visible.
Confidence is not recalculated from the image. Route needs no highlight because
the full page is the target.

## Navigation Projection

Use the exact route and capture lineage full-page screenshot. Resolve the
Navigation model's evidence refs to exactly one navigation container geometry
record. Prefer a referenced layout region; a referenced Section Boundary
classified as navigation is valid. A union of item rectangles is permitted only
when all items deterministically belong to one proven container, route, and
capture run. Carry the rectangle and every geometry ref used to derive it.

Text matching, live selector execution, visual guessing, nearest-region
selection, and cross-capture unions are forbidden. Zero or multiple valid
mappings produce an incomplete projection.

The summary contains the canonical item count and ordered non-empty labels in
model order. It does not reorder, deduplicate, title-case, or invent labels. Its
label is `Navigation on {routePath}`. Count/label inconsistency is an invalid
deterministic input. Confidence and limitations are copied unchanged.

## Section Projection

Use the exact route and capture lineage full-page screenshot. Resolve the exact
Section model identified by the candidate and use its document-coordinate
bounding box. Model evidence refs must resolve to the same route, Evidence
Capture artifact, and capture run. The box must be finite, positive, within the
declared document space, and compatible with screenshot scaling inputs.

Derive the label only from existing structural `regionType` through a fixed map,
for example `Hero section`, `Navigation section`, `Content section`, or `Unknown
section`. Stable source order or section ID may disambiguate equal labels. The
label must not assert business purpose or reconstruction intent. Carry exact
route path, canonical confidence, and all limitations unchanged.

## Highlight Reference Model

### A. Store Coordinates Directly

Coordinates are immediately renderable but alone lose the evidence record and
derivation that justify the box.

### B. Store A Geometry Evidence Reference

A ref preserves provenance but forces presentation code to load and interpret
evidence, duplicating resolver logic.

### C. Store Both

Carry the resolved document-coordinate rectangle and exact geometry evidence
refs from which it was copied or deterministically derived. The rectangle is
derived read data, not new persisted evidence.

### Recommendation

Recommend exactly **C - store both coordinates and geometry evidence references
in the projection**. This keeps rendering deterministic and lookup-free while
retaining an auditable path to authoritative evidence. Validation proves values
and refs agree before the projection becomes ready.

## Screenshot Reference Model

### A. Direct Artifact Path

A path loads the image but does not alone prove its capture, route, or evidence
owner.

### B. Evidence Lineage Reference

Lineage proves ownership but requires another lookup and leaves path selection
outside the projection.

### C. Both

Carry the exact persisted artifact path plus evidence ref, capture run, route,
and capture type. Do not duplicate image bytes or create a derivative image.

### Recommendation

Recommend exactly **C - carry both the direct artifact path and evidence lineage
reference in the projection**. The screenshot is immediately addressable and
its ownership remains verifiable. If path metadata and lineage disagree, fail
closed rather than preferring either.

## Missing Evidence Rules

| Condition | State | Required behavior |
|---|---|---|
| Missing full-page screenshot | `unavailable` | Set `screenshot = null`; emit `SCREENSHOT_MISSING`; never substitute other imagery. |
| Missing Navigation or Section geometry | `incomplete` | Preserve validated candidate/screenshot metadata; set `highlight = null`; emit `GEOMETRY_MISSING`; never estimate. |
| Invalid artifact, route, or capture lineage | `unavailable` | Emit `LINEAGE_INVALID` or `ROUTE_MISMATCH`; withhold screenshot and highlight as candidate context. |
| Ambiguous highlight mapping | `incomplete` | Set `highlight = null`; emit `HIGHLIGHT_MAPPING_AMBIGUOUS`; never select first, largest, nearest, or highest-confidence. |
| Invalid or out-of-bounds geometry | `incomplete` | Set `highlight = null`; emit `GEOMETRY_INVALID`; retain its ref only diagnostically. |

Route needs no geometry, so absent geometry does not degrade a valid Route
projection. Missing optional source URL or optional supporting evidence remains
a limitation. Incomplete/unavailable results may be shown diagnostically, but
must never present a mismatched image or unproven highlight. This design does not
change existing Review Action availability.

## Projection Validation

Validation is pure and completes before `state = "ready"`.

### Required Lineage

1. Review Package belongs to the requested site version and links the exact
   Candidate Discovery artifact.
2. Candidate Discovery links the exact Limited Dry Run output and dry-run ID.
3. Limited Dry Run links the exact Evidence Capture artifact and capture run.
4. Candidate, model, screenshot, and geometry agree on site version, route,
   artifact chain, and capture run.
5. No resolution step follows a floating latest pointer or crosses artifacts.

### Required Evidence References

- Every ready projection has a valid full-page screenshot path and evidence ref.
- Route has candidate/model refs and deliberately no highlight refs.
- Navigation has model refs and geometry refs proving exactly one highlight.
- Section has the exact Section model and geometry refs proving its rectangle.
- Every ref exists in the linked artifacts and is unique where one target is
  required.

### Candidate Compatibility

- Route permits only the Route summary and null highlight.
- Navigation requires only the Navigation summary and navigation highlight.
- Section requires only the Section summary and section highlight.
- Candidate, model, screenshot, and geometry route paths match after the
  repository's existing canonical route normalization.
- Candidate identity exists exactly once in the linked Discovery artifact.

### Deterministic Rendering Inputs

- Bitmap width/height and geometry viewport width/document height are finite
  positive integers from persisted metadata or validated artifact inspection,
  never browser layout at review time.
- Rectangle values are finite, positive, non-negative in origin, and bounded by
  the declared document coordinate space.
- Rendering scales document CSS pixels using supplied, validated dimensions; it
  never recalculates geometry.
- Labels, counts, confidence, limitations, refs, and order come from exact source
  fields or closed mappings.
- Identical inputs produce semantically identical output: no current time,
  random ID, live fetch, locale-dependent formatting, AI output, or consumer
  fallback is allowed.

## Future UI Relationship

```text
Candidate Review Page
  -> Context Projection
  -> Visual Review Card
  -> Approve / Reject / Defer
```

The page will use the projection for the exact candidate already displayed. The
Visual Review Card will render only supplied values and expose closed-state
diagnostics without resolving evidence. Existing action payload, authorization,
optimistic concurrency, immutable history, exact replay, and refresh behavior
remain unchanged. Phase 8D-20 implements none of this UI relationship.

## Relationship To Reconstruction

```text
Evidence
  -> Context Projection
  -> Review
  -> Approved Candidate
  -> Future Reconstruction Package
```

Evidence remains observational truth. Context Projection makes it reviewable.
Review records the human decision. Only an Approved Candidate may later be
eligible for a Future Reconstruction Package.

The projection is not approval authority and defines no reconstruction
structure, components, content, code, or execution. Reject and Defer remain
non-authorizing. A future package must retain canonical candidate and review
lineage rather than treating screenshot paths or rectangles as intent.

## Completion Boundary And Recommendation

At the end of 8D-20, GNR8 has a deterministic contract for projecting Route,
Navigation, and Section context from existing evidence, including exact lineage,
render-ready refs, summaries, closed states, validation, and downstream
boundaries.

Recommend exactly one next phase: **Phase 8D-21 - Candidate Context Projection
Implementation**. It should implement only the designed pure resolver/projection
and focused contract tests. UI integration, review behavior changes, evidence
capture changes, Reconstruction, AI, Publishing, schema, and workers remain out
of scope unless separately authorized.

## Phase 8D-21 Implementation Resolution

Phase 8D-21 implements the pure contract in
`apps/platform/gnr8/architecture/candidate-context-projection.ts`. The builder
accepts one Candidate, its exact Candidate Discovery result, existing Evidence
Capture baseline evidence, optional exact First Limited Dry Run output, and the
requested site version. It performs no artifact lookup and never follows a
floating latest pointer.

Route projects the exact full-page screenshot, route summary, confidence, and
limitations without a highlight. Navigation and Section project the same
exact-lineage screenshot plus one ref-backed, document-coordinate highlight.
Missing or invalid screenshot/lineage is `unavailable`; missing, invalid, or
ambiguous required geometry is `incomplete`; only compatible complete evidence
is `ready`.

`validateCandidateContextProjection(...)` checks required lineage, candidate
type compatibility, screenshot metadata, required highlight bounds and refs,
state consistency, and the recursive forbidden generated/output field set.
Focused tests cover all three candidate types and the closed failure states.

Phase 8D-21 adds no UI integration, screenshot or crop creation, review behavior,
Evidence Capture, Limited Dry Run, Candidate Discovery or Review persistence,
Reconstruction, AI, Publishing, schema, migration, or worker change.

Recommend exactly one next phase: **Phase 8D-22 - Candidate Context Projection
Real-Artifact Validation**.

## Phase 8D-22 Real-Artifact Validation Resolution

Phase 8D-22 exercised the implemented projection read-only against the latest
persisted Candidate Discovery, matching First Limited Dry Run, and Evidence
Capture baseline artifacts for ODV and ViroiDoc. One Route, one Navigation, and
one Section candidate were selected from each real Discovery result. All six
projections passed `validateCandidateContextProjection(...)`.

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` used Discovery artifact
`candidate_discovery_result_dbf786254717f980469b9b99853c14b8`, dry run
`09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`, and capture run
`phase-8b-12k-f12-1781722330653-af9ea5e2`. The baseline contains one layout
geometry record with three regions, two section boundaries, one navigation
evidence record, and the `fullpage_screenshot` ref. Results:

- Route `candidate:route:/`: `ready`; screenshot present; highlight absent by
  design; no limitations or diagnostics.
- Navigation `candidate:navigation:nav%3A%2F`: `ready`; screenshot present;
  document highlight `(128, 232.172, 1110, 34.203)` backed by
  `evidence:layout-geometry:/:region:layout-region-7c0572f3449b`; no limitations
  or diagnostics.
- Section `candidate:section:/:section-boundary-7ea033afed92`: `ready`;
  screenshot present; document highlight `(98, 30, 1170, 237.375)` backed by
  the exact section boundary and layout geometry refs; no limitations or
  diagnostics.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` used Discovery
artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`, dry run
`e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`, and capture run
`phase-8b-12n-1781765161217`. The baseline contains one layout geometry record
with four regions, three section boundaries, one navigation evidence record,
and the `fullpage_screenshot` ref. Results:

- Route `candidate:route:/`: `ready`; screenshot present; highlight absent by
  design; 18 preserved source Dry Run limitations and no projection diagnostics.
- Navigation `candidate:navigation:nav%3A%2F`: `ready`; screenshot present;
  document highlight `(584.813, 30.391, 402.203, 53.203)` backed by
  `evidence:layout-geometry:/:region:layout-region-bffe5ee61728`; 18 preserved
  source Dry Run limitations and no projection diagnostics.
- Section `candidate:section:/:section-boundary-4156e11f8f75`: `ready`;
  screenshot present; document highlight `(0, 0, 1366, 114.969)` backed by the
  exact section boundary and layout geometry refs; no limitations or diagnostics.

The combined quality count is `ready = 6`, `incomplete = 0`, and
`unavailable = 0`. Every selected candidate had exact screenshot and lineage;
therefore none was classified unavailable. Navigation and Section geometry
resolved uniquely and within the persisted document bounds, so no incomplete
reason was required. No blocking projection defect was found and Phase 8D-22
changes no projection behavior.

Recommend exactly one next phase: **Phase 8D-23 - Candidate Context Review UI
Integration Design**, documentation and contract design only.

## Phase 8D-23 Review UI Integration Design Resolution

Phase 8D-23 defines the first presentation boundary for this projection in
`CANDIDATE_CONTEXT_REVIEW_UI_INTEGRATION_DESIGN.md`. The selected placement is
one collapsed-by-default inline `View context` panel inside each existing
Candidate Review card. The panel keeps the candidate, its visual evidence, and
the existing single-candidate actions in one reading flow without changing
Review behavior.

Route presents the exact full-page screenshot without a highlight. Navigation
and Section present that exact-lineage screenshot with the projection-supplied
geometry highlight rendered as a non-interactive CSS overlay. The first
implementation creates no crops or screenshots and performs no evidence lookup,
coordinate inference, or fallback selection in presentation code.

Ready, incomplete, and unavailable remain projection states rather than action
states. Incomplete shows available evidence and a warning without inventing a
highlight. Unavailable shows an evidence warning and recommends Defer, but does
not select or enforce an action. Diagnostics stay inside collapsed `Technical
details`; limitations remain operator-visible.

Phase 8D-23 changes documentation only and leaves this projection contract and
implementation unchanged.

Recommend exactly one next phase: **Phase 8D-24 - Candidate Context Review UI
Integration Implementation**, limited to the designed read-only panel and
focused tests.

## Phase 8D-24 Review UI Integration Resolution

Phase 8D-24 consumes this projection unchanged through a new read-only Candidate
Review runtime loader. The loader binds to the exact Candidate Discovery
artifact and dry-run identity carried by the rendered Review package, reuses
the existing Evidence Capture baseline, and calls
`buildCandidateContextProjection(...)` once per linked candidate.

Presentation performs no evidence matching or geometry inference. Route uses
the projected screenshot without a highlight; Navigation and Section scale the
projected document-coordinate rectangle as a CSS overlay. Projection
diagnostics and raw refs remain collapsed in `Technical details`, while ready,
incomplete, and unavailable receive the operator presentation defined in Phase
8D-23. No projection contract or behavior changed.

Recommend exactly one next phase: **Phase 8D-25 - Candidate Context Review UI
End-to-End Verification**.
