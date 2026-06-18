# Candidate Discovery Builder Design

## Phase And Boundary

Phase 8C-2 defined how a pure deterministic builder converts one valid
`FirstLimitedDryRunOutput` and its existing Evidence Capture lineage into the
Phase 8C-1 `CandidateDiscoveryResult` contract. Phase 8C-3 implements that
design in `apps/platform/gnr8/architecture/candidate-discovery-builder.ts`.

The 8C-3 builder is a pure in-memory mapping only. It does not implement or
execute Candidate Review. It does not change importer, Evidence
Capture, worker, preview, Limited Dry Run, persistence, reconstruction, AI,
React/block generation, publishing, or database behavior. It creates no
persistent candidate artifact, review result, reconstruction output, generated
output, CMS binding, publishing artifact, or migration.

The first builder remains limited to one-to-one mappings from:

- `LimitedDryRunRouteModel` to `route`
- `LimitedDryRunNavigationModel` to `navigation`
- `LimitedDryRunSectionModel` to `section`

`hero`, `footer`, `gallery`, `form`, `content-area`, and other specialized
candidate types remain deferred. A section model with any `regionType` still
produces only a `section` candidate.

## Builder Inputs And Eligibility

The builder may consume only:

- one `FirstLimitedDryRunOutput`
- the Evidence Capture baseline records in that output's `siteVersionId`
  lineage
- referenced `LayoutGeometryEvidence`
- referenced `SectionBoundaryEvidence`
- referenced `NavigationEvidence`

Before mapping, the builder must confirm:

1. `validateFirstLimitedDryRunOutput(...)` succeeds.
2. `outputStatus === "valid"`.
3. `outputId`, `dryRunId`, `siteVersionId`, and `createdAt` are present.
4. Every model route belongs to `routeScope.routes`.
5. Evidence Capture records belong to the same `siteVersionId` and route
   lineage.
6. Required model and evidence refs resolve without contradictory identities.

An ineligible input produces no candidates. A future builder may return a
deterministic blocked empty result containing the applicable blocker
limitations, but it must not repair the input, read the live source, infer
missing values, or create partial identities.

## Canonical Identity And Escaping

### Escaping

Candidate IDs use source identities, not array indexes, hashes, random UUIDs,
or generated labels. Each identity component uses UTF-8 percent encoding:

- preserve ASCII letters, digits, `-`, `.`, `_`, and `~`
- preserve `/` only inside a route-path component
- percent-encode `%`, `:`, whitespace, control bytes, and every other byte
  using uppercase hexadecimal

This keeps ordinary routes readable while preventing delimiter collisions.
Inputs are copied before escaping. The builder must not lowercase, trim,
resolve, or otherwise normalize a valid source identity.

Examples:

```text
/about              -> /about
/team west          -> /team%20west
main:desktop         -> main%3Adesktop
```

### Candidate IDs

Canonical IDs are:

```text
candidate:route:{escapedRoutePath}
candidate:navigation:{escapedNavigationId}
candidate:section:{escapedRoutePath}:{escapedSectionId}
```

Examples:

```text
candidate:route:/about
candidate:navigation:main
candidate:section:/about:hero
```

The same source identity always yields the same candidate ID. A source array
containing duplicate canonical identities is ambiguous. All models in that
collision set are omitted and one deterministic blocker is retained at result
scope. The builder must not create ordinal suffixes to make ambiguous source
identities appear valid.

### Result And Dry-Run Refs

The result identity and direct dry-run refs are also deterministic:

```text
discoveryId              = candidate-discovery:{escapedOutputId}
output ref               = dry-run-output:{escapedOutputId}
route model ref          = dry-run-route:{escapedOutputId}:{escapedRoutePath}
navigation model ref     = dry-run-navigation:{escapedOutputId}:{escapedNavigationId}
section model ref        = dry-run-section:{escapedOutputId}:{escapedRoutePath}:{escapedSectionId}
```

`siteVersionId`, `dryRunId`, and `createdAt` are copied from the source output.
The builder must not read the clock.

## Shared Candidate Rules

Every emitted candidate has:

- `candidateStatus: "discovered"`
- exactly one direct model mapping
- the source output ref and direct model ref in `sourceDryRunRefs`
- at least one resolved Evidence Capture ref in `sourceEvidenceRefs`
- all directly applicable source limitations in `limitations`
- deterministic confidence and reason strings
- `routePath` copied from the source model

`valid`, `invalid`, and `blocked` are contract values reserved for later
contract use. This builder does not review or approve candidates, so it emits
only `discovered`. A candidate-specific blocker suppresses the candidate and is
retained in the result limitation ledger.

### Evidence Ref Classification

Existing string refs are wrapped in `CandidateEvidenceRef` without changing
their `refId`. `sourceKind` is assigned by exact source ownership:

| Source | `sourceKind` |
|---|---|
| Evidence Capture baseline or route ref | `evidence_capture_baseline` |
| Layout geometry group or region ref | `layout_geometry` |
| Section boundary ref | `section_boundary` |
| Navigation group or item ref | `navigation_evidence` |
| Source output ref | `limited_dry_run_output` |
| Route model ref | `limited_dry_run_route_model` |
| Navigation model ref | `limited_dry_run_navigation_model` |
| Section model ref | `limited_dry_run_section_model` |

Every ref receives the model `routePath` when the ref is route-scoped. Unknown
or contradictory evidence ref ownership is a blocker; the builder must not
guess a `sourceKind`.

Evidence refs are deduplicated by `(sourceKind, refId, routePath)` and ordered
by the source-kind table above, then `refId`, then `routePath`. Dry-run refs are
ordered output ref first and direct model ref second.

## Route Candidate Mapping

### Input And Eligibility

One eligible `LimitedDryRunRouteModel` produces one `route` candidate. It must
have:

- a non-empty `routePath` in `routeScope.routes`
- a non-empty captured `sourceUrl`
- resolvable route evidence
- resolvable `sectionRefs` and `navigationRefs` when those refs are present
- no directly applicable blocker

Route evidence is the deterministic union of:

- the baseline/route evidence ref for `routePath`
- evidence refs from every referenced navigation model
- evidence refs from every referenced section model

The route candidate does not create candidates from child refs. It uses them
only to preserve the route model's existing evidence lineage.

### Output Mapping

| Candidate field | Deterministic rule |
|---|---|
| `candidateId` | `candidate:route:{escapedRoutePath}` |
| `candidateType` | `route` |
| `candidateStatus` | `discovered` |
| `confidence` | Apply the shared confidence algorithm to `routeModel.confidenceLevel`. |
| `sourceEvidenceRefs` | Resolved route, referenced navigation, and referenced section evidence union. |
| `sourceDryRunRefs` | Source output ref, then direct route model ref. |
| `limitations` | Result-ledger limitations whose source or scope applies to the route or its resolved refs. |
| `diagnostics` | Fixed route mapping and evidence-resolution codes only. |
| `routePath` | Copy `routeModel.routePath`. |

The route model's `sourceUrl` is evidence for eligibility but is not copied into
`Candidate`, because the 8C-1 contract has no source URL field. It remains
traceable through the baseline/route ref. No URL is reconstructed from the
route path or navigation hrefs.

### Route Ordering

Route candidates follow `FirstLimitedDryRunOutput.routeScope.routes` order.
For a route path with exactly one route model, the route candidate is first in
that route's candidate group.

## Navigation Candidate Mapping

### Input And Eligibility

One eligible `LimitedDryRunNavigationModel` produces one `navigation`
candidate. It must have:

- a non-empty unique `navigationId`
- a `routePath` in `routeScope.routes`
- at least one retained navigation item
- non-empty, resolvable `sourceEvidenceRefs`
- no directly applicable blocker

Candidate Discovery does not rededupe, reorder, relabel, normalize, or resolve
navigation items. The valid Limited Dry Run model is authoritative for that
work. Navigation hrefs never create route candidates.

### Output Mapping

| Candidate field | Deterministic rule |
|---|---|
| `candidateId` | `candidate:navigation:{escapedNavigationId}` |
| `candidateType` | `navigation` |
| `candidateStatus` | `discovered` |
| `confidence` | Apply the shared confidence algorithm to `navigationModel.confidenceLevel`. |
| `sourceEvidenceRefs` | Wrap every resolved `navigationModel.sourceEvidenceRefs` entry, preserving ref identity. |
| `sourceDryRunRefs` | Source output ref, then direct navigation model ref. |
| `limitations` | Result-ledger limitations that reference the navigation model, its route, its limitation refs, or its evidence refs. |
| `diagnostics` | Fixed navigation mapping, item-count, and evidence-resolution codes only. |
| `routePath` | Copy `navigationModel.routePath`. |

The item list is not copied into `Candidate`; it remains available through the
direct Limited Dry Run model ref. This avoids silently expanding the 8C-1
contract.

### Navigation Ordering

Within a route, navigation candidates follow ascending escaped
`navigationId`. The source normally contains one navigation model per route;
the explicit sort makes multiple valid unique models deterministic.

## Section Candidate Mapping

### Input And Eligibility

One eligible `LimitedDryRunSectionModel` produces one `section` candidate. It
must have:

- a non-empty unique `(routePath, sectionId)` identity
- a `routePath` in `routeScope.routes`
- a non-empty selector
- a finite bounding box with positive width and height
- non-empty, resolvable `sourceEvidenceRefs`
- no directly applicable blocker

`regionType`, selector, and bounding box prove eligibility and remain available
through the direct model ref. Candidate Discovery does not reclassify the
region, query the DOM, repair selectors, or recompute geometry.

### Output Mapping

| Candidate field | Deterministic rule |
|---|---|
| `candidateId` | `candidate:section:{escapedRoutePath}:{escapedSectionId}` |
| `candidateType` | `section` for every allowed source `regionType` |
| `candidateStatus` | `discovered` |
| `confidence` | Apply the shared confidence algorithm to `sectionModel.confidenceLevel`. |
| `sourceEvidenceRefs` | Wrap every resolved `sectionModel.sourceEvidenceRefs` entry with its actual section-boundary or layout-geometry kind. |
| `sourceDryRunRefs` | Source output ref, then direct section model ref. |
| `limitations` | Result-ledger limitations that reference the section model, its route, its limitation refs, or its evidence refs. |
| `diagnostics` | Fixed section mapping, region-type, and evidence-resolution codes only. |
| `routePath` | Copy `sectionModel.routePath`. |

`hero`, `footer`, `gallery`, `form`, `content`, and other region types do not
become specialized candidates in this builder.

### Section Ordering

Within a route, section candidates preserve `sectionModels` order. The Phase
8B builder already defines that order from captured geometry; rediscovering or
resorting it here would create a second visual-order rule.

## Confidence Design

Confidence describes evidence quality only. It is not AI probability,
reconstruction quality, business importance, or review approval.

Use the order:

```text
LOW < MEDIUM < HIGH
```

For each eligible candidate:

1. Start with the direct Limited Dry Run model's `confidenceLevel`.
2. If a directly applicable source limitation has severity `warning`, cap the
   result at `MEDIUM`.
3. A `note` does not change confidence.
4. A directly applicable `blocker` suppresses the candidate.
5. Missing or unresolvable required evidence suppresses the candidate and adds
   a blocker; it does not create a LOW candidate.
6. Never raise confidence above the source model level.

This gives exact assignments:

| Source model | Applicable warning | Candidate confidence |
|---|---:|---|
| `HIGH` | no | `HIGH` |
| `HIGH` | yes | `MEDIUM` |
| `MEDIUM` | no or yes | `MEDIUM` |
| `LOW` | no or yes | `LOW` |
| any | blocker or unresolved required evidence | no candidate |

`confidence.reasons` is an ordered array of fixed strings:

1. `source_model_confidence:{LEVEL}`
2. `required_evidence_refs_resolved`
3. `applicable_warning_caps_confidence:MEDIUM`, only when that cap changes
   `HIGH` to `MEDIUM`
4. `source_model_low_evidence_quality`, only for `LOW`

No free-form or AI-generated confidence reason is allowed.

## Lossless Limitation Propagation

The result `limitations` array is the master ledger. Every source limitation is
represented there, including limitations for omitted candidates. Each emitted
candidate carries an identical subset of ledger entries that applies to its
model, route, limitation refs, or evidence refs. Candidate copies must not
change IDs, severity, code, message, or source ref.

### Dry-Run Limitations

For every `FirstLimitedDryRunOutput.limitations` entry:

- preserve `limitationId`
- preserve `severity`
- set `code` to `SOURCE_DRY_RUN_LIMITATION`
- preserve `message` exactly
- preserve a non-null `sourceRef`; represent source `null` by absent
  `CandidateLimitation.sourceRef`

The source order is preserved and duplicate occurrences are not collapsed.
Applicability is resolved from exact matches against model `limitationRefs`,
direct dry-run refs, route identity, and resolved evidence refs. If no
candidate-specific scope can be proven, the limitation remains result-only.

### Evidence Capture String Limitations

For every baseline `limitations[index]` string, create one ledger entry:

```text
limitationId = candidate-discovery:evidence:{routePath}:baseline:{index}
severity     = warning
code         = EVIDENCE_CAPTURE_LIMITATION
message      = exact source string
sourceRef    = baseline/route evidence ref
```

The index is the stable source-array position and is zero-based. Entries are
not deduplicated, so repeated source facts remain observable.

### Structured Fidelity Limitations

For each `fidelityLimitations[index]`, preserve all source information as
follows:

- map source severity `info` to contract severity `note`; preserve `warning`
  and `blocker`
- copy `explanation` exactly into `message`
- encode `type`, `affectedLayer`, and `recommendedNextLayer` reversibly in
  `code` as
  `EVIDENCE_FIDELITY:{type}:{affectedLayer}:{recommendedNextLayer}`
- emit one ledger entry per `evidenceRefIds[refIndex]`, preserving each ref as
  `sourceRef`
- if `evidenceRefIds` is empty, emit one entry using the baseline/route ref
- use
  `candidate-discovery:evidence:{routePath}:fidelity:{index}:ref:{refIndex}`
  as the deterministic identity (`ref:none` for the empty-ref case)

This flattening is reversible and preserves every source occurrence, field,
ref, severity, and explanation within the existing 8C-1 contract. It does not
merge the baseline string list with structured fidelity limitations even when
their messages are similar.

### Discovery Limitations

The builder may add only fixed limitations for:

- input or lineage ineligibility
- duplicate candidate identity
- out-of-scope model route
- missing or unresolvable required evidence
- invalid required model data
- unsupported candidate type mapping

IDs use:

```text
candidate-discovery:{candidateType}:{escapedSourceIdentity}:{code}
```

Codes are stable uppercase snake case. Messages are fixed templates containing
only escaped source identities. Discovery limitations are ordered after all
source limitations by candidate type order, candidate order, code, and ID.

## Canonical Candidate Ordering

The result is assembled route by route using `routeScope.routes` order. Within
each route:

1. route candidates
2. navigation candidates by escaped `navigationId`
3. section candidates in source `sectionModels` order

Models with routes outside the route scope are omitted and represented by
blockers. There is no trailing orphan-candidate group.

The builder uses stable comparisons only. It uses no object-enumeration order,
randomness, locale-sensitive collation, current time, network input, DOM input,
or AI.

## CandidateDiscoveryResult Assembly

After eligibility and mapping:

| Result field | Deterministic rule |
|---|---|
| `discoveryId` | `candidate-discovery:{escapedOutputId}` |
| `siteVersionId` | Copy source `siteVersionId`. |
| `dryRunId` | Copy source `dryRunId`. |
| `createdAt` | Copy source `createdAt`; do not stamp a new time. |
| `candidates` | Canonical route/type ordering above. |
| `candidateCount` | `candidates.length`. |
| `candidateTypesPresent` | Filter `route`, `navigation`, `section` to types with count greater than zero. |
| `limitations` | Complete master ledger in canonical limitation order. |
| `diagnostics` | Fixed deterministic assembly and count diagnostics. |

The 8C-1 contract has a total count and type-presence summary, but no per-type
count fields. Per-type counts are therefore recorded as fixed diagnostics:

```text
CANDIDATE_DISCOVERY_INPUT_VALID
CANDIDATE_COUNT:route={count}
CANDIDATE_COUNT:navigation={count}
CANDIDATE_COUNT:section={count}
CANDIDATE_COUNT:total={count}
OMITTED_CANDIDATE_COUNT:{count}
```

Candidate diagnostics use the same fixed-code approach, for example:

```text
ROUTE_CANDIDATE_MAPPED
NAVIGATION_CANDIDATE_MAPPED:items={count}
SECTION_CANDIDATE_MAPPED:regionType={regionType}
```

Diagnostics report facts only. They do not contain timestamps, judgments,
review decisions, reconstruction intent, or generated prose.

## Illustrative Walkthrough

This example assumes one valid route model for `/about`, one navigation model
with `navigationId = "main"`, and two section models with IDs `hero` and
`story`. All required refs resolve, there are no limitations, and source model
confidence is `MEDIUM`, `HIGH`, `HIGH`, and `MEDIUM` respectively.

The resulting structure is illustrative only; Phase 8C-2 does not create it.

```json
{
  "discoveryId": "candidate-discovery:limited-output-about",
  "siteVersionId": "site-version-about",
  "dryRunId": "dry-run-about",
  "createdAt": "2026-06-18T10:00:00.000Z",
  "candidateCount": 4,
  "candidateTypesPresent": ["route", "navigation", "section"],
  "candidates": [
    {
      "candidateId": "candidate:route:/about",
      "candidateType": "route",
      "candidateStatus": "discovered",
      "confidence": {
        "level": "MEDIUM",
        "reasons": [
          "source_model_confidence:MEDIUM",
          "required_evidence_refs_resolved"
        ]
      },
      "sourceEvidenceRefs": [
        {
          "refId": "evidence:route:/about",
          "sourceKind": "evidence_capture_baseline",
          "routePath": "/about"
        },
        {
          "refId": "evidence:section-boundary:/about:hero",
          "sourceKind": "section_boundary",
          "routePath": "/about"
        },
        {
          "refId": "evidence:section-boundary:/about:story",
          "sourceKind": "section_boundary",
          "routePath": "/about"
        },
        {
          "refId": "evidence:navigation:/about",
          "sourceKind": "navigation_evidence",
          "routePath": "/about"
        }
      ],
      "sourceDryRunRefs": [
        {
          "refId": "dry-run-output:limited-output-about",
          "sourceKind": "limited_dry_run_output"
        },
        {
          "refId": "dry-run-route:limited-output-about:/about",
          "sourceKind": "limited_dry_run_route_model",
          "routePath": "/about"
        }
      ],
      "limitations": [],
      "diagnostics": ["ROUTE_CANDIDATE_MAPPED"],
      "routePath": "/about"
    },
    {
      "candidateId": "candidate:navigation:main",
      "candidateType": "navigation",
      "candidateStatus": "discovered",
      "confidence": {
        "level": "HIGH",
        "reasons": [
          "source_model_confidence:HIGH",
          "required_evidence_refs_resolved"
        ]
      },
      "sourceEvidenceRefs": [
        {
          "refId": "evidence:navigation:/about",
          "sourceKind": "navigation_evidence",
          "routePath": "/about"
        }
      ],
      "sourceDryRunRefs": [
        {
          "refId": "dry-run-output:limited-output-about",
          "sourceKind": "limited_dry_run_output"
        },
        {
          "refId": "dry-run-navigation:limited-output-about:main",
          "sourceKind": "limited_dry_run_navigation_model",
          "routePath": "/about"
        }
      ],
      "limitations": [],
      "diagnostics": ["NAVIGATION_CANDIDATE_MAPPED:items=3"],
      "routePath": "/about"
    },
    {
      "candidateId": "candidate:section:/about:hero",
      "candidateType": "section",
      "candidateStatus": "discovered",
      "confidence": {
        "level": "HIGH",
        "reasons": [
          "source_model_confidence:HIGH",
          "required_evidence_refs_resolved"
        ]
      },
      "sourceEvidenceRefs": [
        {
          "refId": "evidence:section-boundary:/about:hero",
          "sourceKind": "section_boundary",
          "routePath": "/about"
        }
      ],
      "sourceDryRunRefs": [
        {
          "refId": "dry-run-output:limited-output-about",
          "sourceKind": "limited_dry_run_output"
        },
        {
          "refId": "dry-run-section:limited-output-about:/about:hero",
          "sourceKind": "limited_dry_run_section_model",
          "routePath": "/about"
        }
      ],
      "limitations": [],
      "diagnostics": ["SECTION_CANDIDATE_MAPPED:regionType=hero"],
      "routePath": "/about"
    },
    {
      "candidateId": "candidate:section:/about:story",
      "candidateType": "section",
      "candidateStatus": "discovered",
      "confidence": {
        "level": "MEDIUM",
        "reasons": [
          "source_model_confidence:MEDIUM",
          "required_evidence_refs_resolved"
        ]
      },
      "sourceEvidenceRefs": [
        {
          "refId": "evidence:section-boundary:/about:story",
          "sourceKind": "section_boundary",
          "routePath": "/about"
        }
      ],
      "sourceDryRunRefs": [
        {
          "refId": "dry-run-output:limited-output-about",
          "sourceKind": "limited_dry_run_output"
        },
        {
          "refId": "dry-run-section:limited-output-about:/about:story",
          "sourceKind": "limited_dry_run_section_model",
          "routePath": "/about"
        }
      ],
      "limitations": [],
      "diagnostics": ["SECTION_CANDIDATE_MAPPED:regionType=content"],
      "routePath": "/about"
    }
  ],
  "limitations": [],
  "diagnostics": [
    "CANDIDATE_DISCOVERY_INPUT_VALID",
    "CANDIDATE_COUNT:route=1",
    "CANDIDATE_COUNT:navigation=1",
    "CANDIDATE_COUNT:section=2",
    "CANDIDATE_COUNT:total=4",
    "OMITTED_CANDIDATE_COUNT:0"
  ]
}
```

## Determinism Checklist

The future builder must satisfy:

```text
same input = same CandidateDiscoveryResult
```

Specifically:

- no random IDs
- no current-time reads
- no AI or LLM calls
- no live network or browser reads
- no preview or Original Mirror reads as product truth
- no persistence reads beyond the supplied lineage inputs
- no mutation or persistence writes
- no inferred routes, navigation, sections, selectors, or geometry
- stable identity escaping
- stable evidence and dry-run ref ordering
- stable candidate ordering
- stable limitation ledger and applicability rules
- stable confidence levels and reason strings
- stable diagnostics and counts

## Implemented Phase 8C-3 Scope

Phase 8C-3 implements one pure deterministic builder for only:

1. route candidates
2. navigation candidates
3. section candidates

Focused tests cover mapping, determinism, collision handling, confidence,
limitation propagation, ordering, forbidden fields, and validation. Phase 8C-3
does not add specialized
hero/footer/gallery/form/content-area candidates, Candidate Review, persistence,
API or UI triggers, reconstruction, AI, React/GNR8 generation, CMS bindings,
publishing, schema changes, migrations, workers, or runtime execution.

## 8C-2 Completion Boundary

At the end of Phase 8C-2, deterministic construction of the existing
`CandidateDiscoveryResult` contract is fully specified for route, navigation,
and section models. No builder, candidate execution, review workflow,
reconstruction output, generated output, persistence change, publishing
artifact, or migration exists.

## 8C-3 Completion Boundary

At the end of Phase 8C-3, `buildCandidateDiscoveryResult(...)` deterministically
maps a valid `FirstLimitedDryRunOutput` plus optional supplied Evidence Capture
lineage into route, navigation, and generic section candidates. It validates
the input and assembled result, preserves source refs and a lossless master
limitation ledger, caps confidence from evidence warnings, suppresses blocked
or ambiguous candidates, and returns canonical IDs, order, counts, types, and
diagnostics.

No persistence, Candidate Review, reconstruction, AI, React/block generation,
CMS binding, publishing, schema change, migration, importer behavior, Evidence
Capture behavior, worker behavior, preview behavior, or Limited Dry Run
behavior is added.

The recommended next phase is Phase 8C-4 - Candidate Discovery Builder
Validation On Known Fixtures.

## 8C-4 Fixture Validation

Phase 8C-4 adds validation-only fixtures representing the two successful
real-site Limited Dry Run shapes without executing either real site:

- ODV Cvijanovic shape: one route, one navigation, two sections, zero source
  limitations, four stable candidates, zero blockers, and valid output.
- ViroiDoc shape: one route, one broad 29-item navigation model, three sections,
  18 source limitations, five stable candidates, zero blockers, lossless master
  limitation preservation, applicable warning propagation, and `HIGH` to
  `MEDIUM` confidence caps where those warnings apply.

Edge fixtures prove that navigation items remain inside one referenced dry-run
navigation model instead of expanding into candidates; duplicate section
identity collision sets are omitted deterministically with one blocker; and
missing required evidence refs return a valid blocked empty result containing
none of the forbidden generated fields.

No deterministic defect was found in the 8C-3 builder. Phase 8C-4 changes no
builder, persistence, Candidate Review, reconstruction, AI, React/block
generation, CMS binding, publishing, schema, migration, importer, Evidence
Capture, worker, preview, or Limited Dry Run behavior.

The recommended next phase is Phase 8C-5 - Candidate Discovery Real-Site
Dry-Run Artifact Validation.
