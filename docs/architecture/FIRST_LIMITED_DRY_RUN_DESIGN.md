# First Limited Dry Run Design

## Scope

Phase 8B-0 defines the first useful limited Dry Run scope.

This is design, architecture, constraints, and documentation only.

This phase answers:

> What should the first useful Dry Run produce?

Answer:

> Route Model, Navigation Model, and Section Model only.

This phase does not implement Dry Run execution, simulation execution, reconstruction execution, candidate discovery execution, candidate review execution, capture implementation, runtime mutation capture, AI generation, React generation, block generation, content generation, design token generation, persistence schema changes, worker execution, or publishing behavior.

## Readiness Basis

Phase 8A-11 established:

| Model | Readiness |
|---|---|
| Route Model | feasible |
| Navigation Model | feasible |
| Section Model | feasible |
| Content Model | risky |
| Block Model | not ready |
| Design Token Model | not ready |

Therefore the first limited Dry Run must stay inside the feasible model set. It must not attempt content, block, design-token, React, CMS, or publishable output.

## Allowed Outputs

The first limited Dry Run may produce inspectable model artifacts for:

- Route Model
- Navigation Model
- Section Model

These outputs are planning and review artifacts only. They are not generated site output, generated React, generated GNR8 blocks, persisted runtime content, CMS data, simulation artifacts, publishing artifacts, or approved reconstruction output.

## Forbidden Outputs

The first limited Dry Run must not produce:

- Block Model
- Content Model
- Design Token Model
- React
- GNR8 blocks
- CMS bindings
- CMS/content models
- publishing artifacts
- generated site output
- editable blocks
- rewritten content
- reconstruction workers
- runtime mutations
- database writes

## Input Boundary

The first limited Dry Run may consume only:

- Evidence Capture baseline
- `LayoutGeometryEvidence`
- `SectionBoundaryEvidence`
- `NavigationEvidence`
- `ReconstructionPackage`
- `ReconstructionDryRunPackage`
- `ReconstructionSimulationPlan`

The first limited Dry Run must not consume:

- Original Mirror DOM as product truth
- transformed preview
- AI-generated guesses
- unpublished runtime content
- production site state
- live source-site state outside the captured Evidence Capture baseline
- generated React
- generated blocks
- CMS draft content
- operator-authored reconstruction output

Original Mirror can remain useful for operator inspection, but it is not a reconstruction evidence source and must not be treated as product truth by the limited Dry Run.

## Output Contract Design

These shapes were documentation-only for 8B-0. Phase 8B-1 implements them as TypeScript contracts only; it does not add generated artifacts, persistence schema, or runtime behavior.

Implemented as contract:

- `FirstLimitedDryRunOutput`
- `LimitedDryRunRouteModel`
- `LimitedDryRunNavigationModel`
- `LimitedDryRunSectionModel`

### LimitedDryRunRouteModel

```ts
{
  routePath: string;
  sourceUrl: string;
  sections: LimitedDryRunSectionRef[];
  navigationRefs: string[];
  limitations: LimitedDryRunLimitation[];
}
```

Field intent:

| Field | Meaning |
|---|---|
| `routePath` | Stable route identity derived from route-scoped Evidence Capture and reconstruction package lineage. |
| `sourceUrl` | Source URL for traceability back to capture evidence. |
| `sections` | Ordered section refs for the route. Each ref must resolve to a section model entry. |
| `navigationRefs` | Refs to navigation model entries relevant to the route. |
| `limitations` | Explicit caveats, missing evidence, or low-confidence notes for the route model. |

### LimitedDryRunNavigationModel

```ts
{
  items: LimitedDryRunNavigationItem[];
  labels: string[];
  hrefs: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  sourceEvidenceRefs: string[];
}
```

Field intent:

| Field | Meaning |
|---|---|
| `items` | Ordered navigation items from `NavigationEvidence`. |
| `labels` | Reviewable label list for quick operator inspection. |
| `hrefs` | Reviewable href list for route relationship inspection. |
| `confidence` | Aggregate confidence from source navigation evidence. |
| `sourceEvidenceRefs` | Evidence refs supporting the navigation model. |

Each navigation item should preserve, at minimum:

- label
- href
- stable position or order
- confidence
- source evidence refs

### LimitedDryRunSectionModel

```ts
{
  sectionId: string;
  routePath: string;
  regionType: "hero" | "navigation" | "content" | "sidebar" | "footer" | "gallery" | "form" | "map" | "unknown";
  selector: string;
  boundingBox: LimitedDryRunBoundingBox;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  sourceEvidenceRefs: string[];
  limitations: LimitedDryRunLimitation[];
}
```

Field intent:

| Field | Meaning |
|---|---|
| `sectionId` | Stable section identity within the limited Dry Run output. |
| `routePath` | Route identity for the section. |
| `regionType` | Deterministic region classification from `SectionBoundaryEvidence`. |
| `selector` | Source selector for traceability and operator review. |
| `boundingBox` | Route-scoped box from section and layout geometry evidence. |
| `confidence` | Confidence from source section evidence. |
| `sourceEvidenceRefs` | Evidence refs supporting this section. |
| `limitations` | Explicit caveats such as ambiguous selector, low confidence, missing geometry, or contradictory evidence. |

The bounding box shape should remain evidence-shaped and review-oriented:

```ts
{
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## Success Criteria

A successful first limited Dry Run can produce:

- route list
- navigation item list
- ordered section list per route
- traceability back to Evidence Capture refs
- limitations where confidence is low
- route-to-section relationships
- route-to-navigation relationships
- operator-readable model summaries

A successful first limited Dry Run does not need to produce:

- editable blocks
- polished design
- content rewriting
- CMS bindings
- exact visual clone
- React components
- generated layouts
- design tokens
- publishing-ready artifacts

## Failure Criteria

The first limited Dry Run should fail or block when any of these conditions apply:

- no route identity
- no source URL
- no section evidence
- no navigation evidence
- contradictory evidence that cannot be resolved deterministically
- blocker limitations in the source evidence
- insufficient source evidence refs
- section ordering cannot be determined from evidence
- route scope cannot be matched to the reconstruction package
- navigation hrefs cannot be tied to captured routes or source URLs

Failure should produce reviewable limitations and blockers, not fallback generation or AI guesses.

## Human Review Boundary

Dry Run output must be reviewable before any later execution phase.

The operator can inspect:

- route model
- navigation model
- section model
- evidence refs
- limitations
- confidence values
- blocked or contradictory evidence

The operator cannot:

- publish generated site output
- approve generated site output
- approve reconstruction execution
- approve AI generation
- approve React generation
- approve block generation
- write CMS bindings
- write production content
- trigger workers

Human review in this phase is inspection only. Approval for generated site output belongs to a later explicit phase after the output boundary exists.

## Recommended First Target Site Type

The safest first target is:

- static marketing site
- small route set
- visible navigation
- clear sections
- stable source capture
- no heavy ecommerce
- no complex app runtime
- no login-gated content
- no cookie-gated content
- no widget-dominated primary experience

ViroiDoc / Maver-style sites may be useful later because they expose real migration problems, route complexity, maps, widgets, and runtime behavior. They should not be the first limited Dry Run target if the chosen page set contains complex runtime/widget behavior, because 8B-0 deliberately excludes runtime mutation capture, content modeling, block modeling, widget reconstruction, and design-token generation.

## Relationship To Existing Dry Run Boundary

The existing `ReconstructionDryRunPackage` and `ReconstructionSimulationPlan` remain metadata and planning boundaries.

8B-0 narrows the first useful Dry Run design from the broader future generated output vocabulary to this first limited set:

- `route_model`
- `navigation_model`
- `section_model`

The broader future output names remain out of scope for this first limited Dry Run:

- `block_model`
- `content_model`
- `design_token_model`
- `unknown`

## Historical 8B-0 Recommended Next Phase

At the end of 8B-0, the recommended next phase was:

- Phase 8B-2 - First Limited Dry Run Builder Design

8B-2 should design how a future builder will populate the limited outputs above. It should still avoid execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema changes, workers, and publishing.

## Post 8B-6 Design Status

Implemented:

- `FirstLimitedDryRunOutput` contract
- deterministic builder
- validation
- limitation propagation
- output persistence

Designed:

- admin-only trigger boundary
- superadmin-only access control
- trigger request contract
- trigger response contract
- deterministic failure handling
- idempotency strategy
- auditability fields

Still missing:

- API trigger implementation
- UI display
- worker execution
- approval workflow

Assessment:

The first limited Dry Run design can now store and retrieve a validated deterministic `FirstLimitedDryRunOutput` as a durable provenance artifact using artifact kind `first_limited_dry_run_output`, and the admin-only trigger boundary for creating that artifact is defined in `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md`. The output remains Route Model, Navigation Model, and Section Model only. Block Model, Content Model, Design Token Model, React, GNR8 blocks, generated site output, runtime/API trigger implementation, UI display, workers, approvals, and publishing remain outside this design.

Recommended next phase:

- Phase 8B-7 - Admin-Only First Limited Dry Run Trigger Implementation
