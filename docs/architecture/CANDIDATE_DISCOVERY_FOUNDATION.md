# Candidate Discovery Foundation

## Phase And Scope

Phase 8C-0 defined the deterministic Candidate Discovery layer between the proven Evidence Capture plus First Limited Dry Run chain and future Reconstruction. Phase 8C-1 formalized its canonical output contract and validation boundary. Phase 8C-2 defined the deterministic builder mapping in `CANDIDATE_DISCOVERY_BUILDER_DESIGN.md`. Phase 8C-3 implements that mapping as a pure builder with focused tests.

Phase 8C-3 implements only deterministic in-memory discovery of route, navigation, and generic section candidates. It does not implement review, execute reconstruction, call AI, generate React or GNR8 blocks, create CMS bindings, persist or publish results, add migrations, or modify importer, Evidence Capture, worker, preview, Limited Dry Run, reconstruction, or database behavior.

## Purpose

A candidate is a non-executable, evidence-backed proposal that a captured route, navigation structure, or visible region may later become a reconstruction planning unit.

Candidates exist to keep evidence interpretation separate from reconstruction decisions:

```text
Evidence Capture
  -> FirstLimitedDryRunOutput
  -> Candidate Discovery
  -> Candidate Review
  -> Reconstruction Planning
  -> future Reconstruction Execution
```

Evidence says what was captured. The Limited Dry Run normalizes that evidence into Route, Navigation, and Section Models. Candidate Discovery identifies which normalized structures are sufficiently supported to be considered by a later review. It does not decide how to reconstruct them and does not produce reconstruction output.

A candidate is not:

- approval to reconstruct
- a reconstruction plan
- generated content, React, a GNR8 block, or a CMS binding
- a persisted runtime mutation or publishing artifact
- an AI interpretation

## Relationship To The Phase 7F-12 Contract

Phase 7F-12 defined `ReconstructionCandidateDiscoveryPackage` as a metadata-only control-plane envelope and left discovery at `contract_only`. It did not define deterministic evidence-to-candidate rules.

Phase 8C-0 refines that boundary around a valid `FirstLimitedDryRunOutput`. A future implementation should map the 8C discovery result into the existing control-plane lineage or deliberately revise that older contract. It must not create two independent candidate taxonomies, confidence systems, or sources of truth.

## Candidate Types

The initial canonical `CandidateType` values are:

| Type | Deterministic source | Meaning |
|---|---|---|
| `route` | `LimitedDryRunRouteModel` | One captured, in-scope route that may become a reconstruction route unit. |
| `navigation` | `LimitedDryRunNavigationModel` | One ordered navigation structure for a route. |
| `section` | `LimitedDryRunSectionModel` | A visible structural region represented without additional semantic inference. |

`hero`, `footer`, `gallery`, `form`, `content-area`, `map`, `widget`, and all other specialized or block-level families are deferred. They are not allowed by the 8C-1 contract.

Each source section may produce at most one `section` candidate in a future discovery implementation.

## Canonical 8C-1 Contract

The canonical contract is implemented in `apps/platform/gnr8/architecture/candidate-discovery-contract.ts` with these required 8C-1 invariants:

- `CandidateType` is exactly `route | navigation | section`.
- `CandidateStatus` is exactly `discovered | valid | invalid | blocked`.
- Every candidate carries `candidateId`, type, status, confidence, non-empty Evidence Capture refs, non-empty Limited Dry Run refs, limitations, diagnostics, and optional `routePath`.
- Every result carries `discoveryId`, `siteVersionId`, `dryRunId`, `createdAt`, count, types present, candidates, limitations, and diagnostics.
- `validateCandidateDiscoveryResult(...)` validates identifiers, types, statuses, refs, counts, type summaries, limitations, diagnostics, and confidence.
- Validation recursively rejects `reactOutput`, `generatedOutputs`, `generatedBlocks`, `generatedContent`, `designTokens`, `publishingArtifacts`, and `reconstructionArtifacts`.
- `createEmptyCandidateDiscoveryResult(...)` copies supplied IDs and audit time and returns empty candidate/type arrays with `candidateCount = 0`.

Contract invariants:

- `candidateCount === candidates.length`.
- All IDs are deterministic functions of existing source identities; no random IDs are allowed.
- Future IDs should follow `candidate:route:{routePath}`, `candidate:navigation:{navigationId}`, and `candidate:section:{routePath}:{sectionId}` using deterministic ref escaping rules.
- Every `sourceEvidenceRefs` and `sourceDryRunRefs` entry must be non-empty and traceable to the consumed inputs.
- Candidate arrays, evidence refs, limitations, reasons, and source refs use deterministic ordering and deduplication.
- `createdAt` is caller-supplied audit metadata; the empty builder does not synthesize it.

## Discovery Inputs

Candidate Discovery may consume only:

- the persisted Evidence Capture baseline associated with the source output
- `LayoutGeometryEvidence` already represented by or referenced from that baseline
- `SectionBoundaryEvidence` already represented by or referenced from that baseline
- `NavigationEvidence` already represented by or referenced from that baseline
- one valid `FirstLimitedDryRunOutput`

`FirstLimitedDryRunOutput` is the normalized discovery source. The underlying evidence artifacts may only validate lineage, resolve evidence refs, and propagate limitations. They must not be used to invent a candidate that is absent from the valid Limited Dry Run Route, Navigation, and Section Models.

Candidate Discovery must not consume:

- AI or operator guesses
- generated or rewritten content
- generated React, JSX, GNR8 blocks, or CMS bindings
- Original Mirror or transformed preview as product truth
- live source-site reads or new browser capture
- unpublished runtime state
- reconstruction output, draft plans, or publishing state

## Deterministic Rules

### Result Eligibility

Discovery is eligible only when all of the following are true:

- `FirstLimitedDryRunOutput.outputStatus === "valid"`
- the output passes the existing `validateFirstLimitedDryRunOutput(...)` contract
- `outputId`, `dryRunId`, `reconstructionPackageId`, and `siteVersionId` are present
- the route scope and every retained model route are consistent
- referenced Evidence Capture artifacts belong to the same `siteVersionId` lineage

If the input is planned, invalid, blocked, fails validation, or has contradictory lineage, return a blocked result with no candidates and deterministic blocker limitations. Never repair the input or fall back to inference.

### Candidate Eligibility

- Route: emit one candidate for each valid route model with non-empty `routePath`, non-empty captured `sourceUrl`, and traceable supporting refs.
- Navigation: emit one candidate for each valid navigation model with a matching route, at least one retained item, and non-empty evidence refs.
- Section-derived: emit one candidate for each valid section model with a matching route, non-empty selector, finite positive bounding box, and non-empty evidence refs.
- Section: retain the canonical `section` type regardless of source `regionType`; specialized mappings are outside 8C-1.
- A candidate with a source-specific blocker is omitted and the blocker is retained at result scope. Warnings and notes do not suppress a candidate.
- Discovery never creates routes from navigation hrefs and never creates child regions from DOM, text, or geometry.

### Confidence Assignment

- Start by copying the source Limited Dry Run model confidence.
- When a candidate uses multiple source models, use the minimum level under `LOW < MEDIUM < HIGH`.
- A propagated warning caps confidence at `MEDIUM` only when the warning applies directly to the candidate's source model.
- A candidate-specific blocker prevents emission rather than producing a misleading LOW candidate.
- The discovery layer cannot raise confidence above the source model and cannot use candidate type specificity as a confidence boost.
- Reasons are fixed rule codes/messages, not prose generated by AI.

### Traceability

Every candidate must include:

- its direct Limited Dry Run model ref
- all source evidence refs carried by that model
- the source `FirstLimitedDryRunOutput.outputId`
- route lineage
- applicable limitation refs

A route model has indirect evidence through its section and navigation refs plus top-level output evidence. Its candidate must retain the route evidence ref and the resolved child model refs used to support it. Missing or unresolvable required refs are blockers.

### Limitation Propagation

- Copy applicable `FirstLimitedDryRunOutput.limitations` without changing severity or meaning.
- Attach a limitation to a candidate only when its `sourceRef` or referenced model scope identifies that candidate; otherwise retain it at result scope.
- Preserve every source limitation occurrence and all representable source fields through deterministic limitation IDs, reversible fixed codes, exact messages, severities, and source refs as specified by the 8C-2 builder design.
- Add only fixed discovery limitations for invalid lineage, missing refs, ineligible models, or unsupported type mappings.
- Never hide limitations because a candidate was omitted or deduplicated.

### Ordering And Equivalence

- Process routes in `routeScope.routes` order.
- Within each route order candidates as route, navigation, then section-derived candidates in existing `sectionModels` order.
- Sort/dedupe refs lexically where source order has no contract meaning.
- The same semantic inputs produce the same candidates, IDs, order, confidence, limitations, and status.

## Review Boundary

Candidate Discovery answers only:

> Which evidence-backed reconstruction candidates are available for review?

Future Candidate Review may accept, reject, defer, mark unsupported, or request more evidence for each candidate. Review owns human judgment and must preserve the discovery evidence, confidence, and limitations.

Future Reconstruction Planning may consume reviewed and approved candidates only. It may decide reconstruction intent, dependencies, ordering, or unsupported handling. Discovery cannot approve a candidate, assign reconstruction intent, create a package ready for execution, or trigger work.

```text
Candidate Discovery: deterministic identification
Candidate Review: human decision and evidence sufficiency
Reconstruction Planning: approved intent and dependency planning
Future Reconstruction Execution: explicitly separate, not authorized here
```

## Recommended First Candidate Set

The smallest safe first implementation is:

1. `route`
2. `navigation`
3. `section`

These map one-to-one from the three validated `FirstLimitedDryRunOutput` model families and require no new semantic interpretation. The first implementation should keep every section as `section`, even when `regionType` is more specific.

Specialized section families remain deferred and are not part of this contract.

## 8C-0 Completion Boundary

At the end of 8C-0:

- Candidate Discovery has a purpose, allowed inputs, candidate taxonomy, proposed contracts, deterministic rules, traceability requirements, limitation flow, and review boundary.
- The first implementation target is Route, Navigation, and Section candidates only.
- No candidate discovery execution, candidate review execution, reconstruction planning execution, reconstruction output, AI, React, blocks, CMS bindings, publishing artifacts, persistence changes, schema changes, migrations, or runtime behavior has been created.

## 8C-1 Completion Boundary

At the end of 8C-1, the canonical output types, validation helper, forbidden-field guard, and empty-result builder exist. There is still zero discovery execution, candidate generation, review execution, reconstruction, generated output, persistence change, publishing, or schema change.

## 8C-2 Completion Boundary

At the end of 8C-2, `CANDIDATE_DISCOVERY_BUILDER_DESIGN.md` defines exact route, navigation, and section mapping; stable source-derived candidate and discovery IDs; evidence-quality confidence; lossless limitation propagation; canonical ordering; result assembly; diagnostics; counts; and an illustrative one-route, one-navigation, two-section result.

There is still zero Candidate Discovery implementation or execution, Candidate Review workflow, reconstruction, AI, React/block generation, CMS binding, persistence change, publishing, schema change, or migration.

The recommended next phase is Phase 8C-3 - Candidate Discovery Builder Implementation, limited to a pure deterministic route/navigation/section builder and focused tests. Specialized hero, footer, gallery, form, and content-area candidates remain deferred.

## 8C-3 Completion Boundary

At the end of 8C-3, `buildCandidateDiscoveryResult(...)` creates only deterministic `route`, `navigation`, and generic `section` candidates from a valid `FirstLimitedDryRunOutput` and optional supplied Evidence Capture lineage. Stable percent-escaped IDs, canonical ordering, evidence-only confidence with warning caps, blocker suppression, duplicate-identity handling, lossless limitation propagation, fixed diagnostics, and output contract validation are implemented and focused-tested.

There is still no Candidate Review execution, persistence, reconstruction, AI, React/block generation, CMS binding, publishing, schema change, migration, or importer/Evidence Capture/worker/preview/Limited Dry Run behavior change.

The recommended next phase is Phase 8C-4 - Candidate Discovery Builder Validation On Known Fixtures.

## 8C-4 Completion Boundary

At the end of 8C-4, deterministic fixture versions of the successful ODV
Cvijanovic and ViroiDoc Limited Dry Run shapes validate the implemented builder.
The fixtures cover stable route/navigation/section identities, four- and
five-candidate outputs, zero- and 18-limitation ledgers, warning propagation and
confidence caps, broad navigation without candidate explosion, deterministic
duplicate-section blocking, and blocked empty output for missing evidence refs.
All outputs pass the Candidate Discovery contract and contain no forbidden
generated fields.

This phase adds tests and documentation only. It creates no persistence,
Candidate Review execution, reconstruction output, AI, React/block generation,
CMS binding, publishing artifact, schema change, migration, or importer/Evidence
Capture/worker/preview/Limited Dry Run behavior change.

The recommended next phase is Phase 8C-5 - Candidate Discovery Real-Site
Dry-Run Artifact Validation.

## 8C-5 Completion Boundary

At the end of 8C-5, the two authoritative real persisted
`FirstLimitedDryRunOutput` artifacts have been loaded through existing read
helpers and passed to `buildCandidateDiscoveryResult(...)` in memory. ODV
produces four candidates with `1 / 1 / 2` route/navigation/section counts,
zero limitations, and zero blockers. ViroiDoc produces five candidates with
`1 / 1 / 3` counts, preserves all 18 source limitations, and has zero blockers.
Both results pass contract validation and contain no forbidden generated fields.

The real artifacts exposed one bounded deterministic builder defect absent from
the representative fixtures: compact persisted Evidence Capture refs using
`layout-region-*` and `section-boundary-*` were not classified by the evidence
registry. The registry now recognizes those established ref families, and a
focused regression test covers the real shape. Final real-artifact behavior
matches the 8C-4 fixture expectations.

No Candidate Discovery result was persisted. There is still no Candidate Review,
reconstruction, AI, React/block generation, CMS binding, publishing artifact,
schema change, migration, or importer/Evidence Capture/worker/preview/Limited Dry
Run behavior change.

The recommended next phase is Phase 8C-6 - Candidate Discovery Persistence
Boundary Design, documentation and contract assessment only.

## 8C-6 Completion Boundary

At the end of 8C-6,
`CANDIDATE_DISCOVERY_PERSISTENCE_BOUNDARY.md` defines the future persistence
purpose and recommends storing validated `CandidateDiscoveryResult` records as
immutable `candidate_discovery_result` artifacts inside the existing
site-version import-provenance boundary. The design uses an append-only history
plus latest pointer, explicit envelope/builder/contract versions, validated
lineage and metadata, semantic-result idempotency, read-only load helpers, and
fail-closed handling for invalid, forbidden, mismatched, or failed writes.

This phase adds documentation only. It creates no persistence helper, artifact,
table, schema, migration, Candidate Review, reconstruction, AI, React/block
generation, CMS binding, publishing behavior, or importer/Evidence
Capture/worker/preview/Limited Dry Run behavior change.

The recommended next phase is Phase 8C-7 - Candidate Discovery Persistence
Implementation, limited to the existing provenance artifact boundary and
focused tests.

## 8C-7 Completion Boundary

At the end of 8C-7, validated `CandidateDiscoveryResult` values can be persisted
and loaded as durable `candidate_discovery_result` artifacts through the
existing site-version import-provenance boundary. The implementation provides
`persistCandidateDiscoveryResult(...)`,
`loadLatestCandidateDiscoveryResult(...)`, and
`loadCandidateDiscoveryResultById(...)`, append-only history, a latest pointer,
complete artifact metadata, cloned readback, and semantic idempotency for the
same site version and dry run.

Validation, recursive forbidden-field checks, and exact lineage checks all run
before persistence. Invalid or generated output is rejected with complete
validation diagnostics. Equivalent latest results reuse their artifact without
a write; changed results append and advance the pointer. Focused contract,
builder, and persistence tests pass `20 / 20`.

No Candidate Review, UI, reconstruction, AI, React/block generation, CMS
binding, publishing artifact, table, schema, migration, worker job, or
importer/Evidence Capture/preview/Limited Dry Run behavior is added or changed.

The recommended next phase is Phase 8C-8 - Candidate Discovery Read-Only
Surface Design.

## 8C-8 Completion Boundary

At the end of 8C-8, `CANDIDATE_DISCOVERY_SURFACE_DESIGN.md` defines a dedicated
admin read-only inspection page for persisted `candidate_discovery_result`
artifacts. The design covers artifact and validation metadata, candidate-type
and confidence counts, limitations and diagnostics, full candidate evidence
details, stable route/navigation/section grouping, and explicit missing,
invalid, blocked, empty, limitation, and blocker states.

The future `CandidateDiscoverySurfaceProjection` consumes persisted artifacts
only, preserves builder order, treats the result-level limitation ledger as
authoritative, and fails safely for malformed data. The surface has no
approve/reject, Candidate Review, reconstruction, AI, edit, publish, or trigger
controls.

This phase adds documentation only. It creates no UI, API route, review package,
reconstruction output, generated React/block/content, CMS binding, publishing
artifact, schema, migration, or behavior change.

The recommended next phase is Phase 8C-9 - Candidate Discovery Read-Only
Surface Implementation.

## 8C-9 Completion Boundary

At the end of 8C-9, the dedicated read-only admin page is implemented at
`/gnr8/admin/candidate-discovery/[siteVersionId]`. It uses the existing
superadmin page guard and reads the latest persisted
`candidate_discovery_result` without building, repairing, rewriting, or
triggering discovery.

The UI-independent `CandidateDiscoverySurfaceProjection` exposes artifact
lineage, validation, candidate and confidence counts, result limitations,
diagnostics, stable route/navigation/section groups, and explicit missing,
invalid, blocked, empty, limited, and blocker states. Focused projection and
page-source tests pass `11 / 11`.

There are no review, reconstruction, AI, generation, editing, trigger, or
publishing controls. Importer, Evidence Capture, worker, preview, Limited Dry
Run, Candidate Discovery building and persistence, database schema, and runtime
behavior are unchanged.

The recommended next phase is Phase 8C-10 - Candidate Discovery End-to-End
Admin Verification.
