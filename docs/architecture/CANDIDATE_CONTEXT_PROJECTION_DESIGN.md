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
