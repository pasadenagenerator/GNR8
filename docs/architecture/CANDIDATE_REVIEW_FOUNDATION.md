# Candidate Review Foundation

## Phase And Boundary

Phase 8D-1 defines the canonical Candidate Review contract between persisted
Candidate Discovery artifacts and future Reconstruction Planning. Phase 8D-0
established the foundation; 8D-1 adds contract shapes and pure validation only.

This phase is contract-only. It adds no review behavior,
persistence, UI, schema, worker, AI, reconstruction, generation, or publishing
behavior. It does not change Candidate Discovery, Evidence Capture, or Limited
Dry Run.

The bounded chain is:

```text
Real Site
  -> Evidence Capture
  -> Limited Dry Run
  -> Candidate Discovery
  -> Candidate Discovery Persistence
  -> Read-Only Candidate Discovery UI
  -> Candidate Review
  -> Future Reconstruction Planning
```

## Purpose

Candidate Review records explicit human judgment about a discovered candidate.
It is the governance boundary that turns an evidence-backed observation into an
attributable decision that later phases may consider.

Candidate Review is:

- **governance:** a human controls whether a candidate may proceed;
- **approval:** an explicit decision replaces inference or silence;
- **auditability:** every decision remains attributable and historically visible;
- **reconstruction preparation:** approved candidates become eligible input for
  a later package or planning contract.

Candidate Review is not:

- reconstruction or reconstruction execution;
- structure, block, content, or design editing;
- AI or deterministic generation;
- publishing or authorization to publish.

Approval means only "eligible for later reconstruction packaging or planning
consideration." It does not mean ready to reconstruct, execute, generate,
render, persist runtime mutations, or publish.

## Minimal Review State Model

The one recommended state model is:

```text
CandidateReviewDecision = approved | rejected | deferred
```

| Decision | Meaning | Downstream authority |
|---|---|---|
| `approved` | The exact discovered candidate instance is accepted for later reconstruction preparation. | May be referenced by a future Reconstruction Package or Structure Planning contract. |
| `rejected` | The exact discovered candidate instance must not proceed. | None. |
| `deferred` | A human intentionally postpones a terminal decision. | None until superseded by a later `approved` decision. |

No additional decision state is required.

- **Unreviewed is absence, not a fourth decision.** A candidate with no review
  event has no human decision and no downstream authority.
- `needs_more_evidence` is a reason for `deferred`, not a separate decision.
- `unsupported` is a reason for `rejected` or `deferred`, depending on whether
  the reviewer considers the result terminal.
- `pending`, `partially_reviewed`, and similar values may be derived for a
  collection view in the future, but they are not candidate decisions.
- A later decision does not mutate a state value in place. It appends a new
  decision event that explicitly supersedes the current one.

This keeps the authorization rule exact: only the latest valid decision event
with `decision = approved` authorizes later consideration.

## Review Identity

### Options Assessed

**A. Candidate Artifact Instance**

Example identity:

```text
candidateDiscoveryArtifactId = candidate_discovery_result_xxx
candidateId = candidate:section:/:hero
```

The review target is the composite key
`(candidateDiscoveryArtifactId, candidateId)`.

**B. Candidate Identity**

Example identity:

```text
candidate:section:/:hero
```

This treats a deterministic candidate ID as stable across discovery artifacts.

### Recommendation

Use **A. Candidate Artifact Instance**.

The canonical 8C candidate ID is deterministic, so the same logical identity
may recur in a later discovery artifact after its evidence, confidence,
limitations, dry run, or source site version has changed. Carrying approval by
candidate ID alone would silently apply an old human decision to new evidence.

Consequences:

- every decision is bound to the exact persisted evidence-backed observation;
- a new Candidate Discovery artifact begins unreviewed, even when it contains a
  familiar `candidateId`;
- reviews never transfer automatically between artifacts or site versions;
- a future reconciliation workflow may display matching logical identities,
  but transferring a decision requires a new attributed review event;
- downstream contracts must reference the artifact ID and candidate ID, not
  only the logical candidate ID.

## Lineage Model

Every review decision event must contain this minimum lineage:

| Field | Requirement |
|---|---|
| `reviewEventId` | Unique immutable identity for this audit event. |
| `candidateId` | Exact candidate within the persisted discovery result. |
| `candidateDiscoveryArtifactId` | Exact persisted `candidate_discovery_result` artifact reviewed. |
| `siteVersionId` | Source site version; must match the artifact and result. |
| `dryRunId` | Source Limited Dry Run; must match the artifact and result. |
| `reviewer` | Stable authenticated human subject reference. Display name alone is insufficient. |
| `decision` | Exactly `approved`, `rejected`, or `deferred`. |
| `decidedAt` | Server-trusted decision timestamp. |
| `supersedesReviewEventId` | Nullable; identifies the prior event when changing an existing latest decision. |

The minimum source identity is
`candidateDiscoveryArtifactId + candidateId`. `siteVersionId` and `dryRunId`
are also required as denormalized lineage guards and audit context; they must
not be caller-selected independently of the referenced artifact.

Optional explanatory metadata may include a reason code and reviewer note. A
reason is valuable for governance but is not part of source identity. Phase
8D-1 should keep it optional rather than inventing a reason taxonomy before a
real review workflow exists.

`discoveryId`, candidate type, route path, confidence, evidence references, and
limitations remain available through the referenced immutable Candidate
Discovery artifact. They need not be copied into the minimum decision event.

## Audit Model

Candidate Review uses an immutable event history.

- A submitted decision is never updated or deleted in place.
- A changed decision appends a new event whose
  `supersedesReviewEventId` names the previously latest event for the same
  candidate artifact instance.
- The latest decision is the unsuperseded event at the head of that explicit
  chain, not whichever record has the greatest client timestamp.
- Earlier events remain available and are reported as superseded decisions.
- Every event retains the stable reviewer reference and trusted timestamp.
- A submission based on a stale latest decision must not silently create a
  second head. A future write boundary must reject the stale submission or
  require explicit reconciliation.
- Idempotent retry behavior must return the already-created event for the same
  submission identity rather than append a duplicate event.
- If an artifact or candidate cannot be resolved exactly, no decision is
  accepted and no authority is created.

The latest-decision projection is derived data. It may accelerate reads in a
future persistence design, but it must be reproducible from immutable history
and must not replace that history.

## Relationship To Future Phases

### Review To Reconstruction Package

```text
Candidate Review
  -> Future Reconstruction Package
```

A future Reconstruction Package may include only candidate artifact instances
whose latest decision is `approved`. It must preserve the referenced review
decision and discovery lineage. Rejected and deferred candidates are excluded
from authorizing inputs; they may appear only in non-authorizing summaries.

### Review To Structure Planning

```text
Candidate Review
  -> Future Structure Planning
```

Structure Planning may plan only approved candidate artifact instances. Review
does not assign layout, dependencies, ordering, component types, content
models, or reconstruction intent. The future planning boundary must decide its
canonical input contract; 8D-0 does not create that contract or a plan.

### Review To AI Reconstruction

```text
Candidate Review
  -> Future governed planning and execution gates
  -> Future AI Reconstruction
```

Review is a necessary governance input, never a direct AI trigger. Approval
does not create a prompt, invoke a model, dispatch a worker, generate output, or
authorize publishing. AI Reconstruction remains blocked until separately
defined package, planning, execution, validation, and publishing gates exist.

## Phase 7F-13 Reconciliation

Phase 7F-13 remains historical conceptual scaffolding. It is not the canonical
Candidate Review contract for the operational 8C discovery chain.

| 7F-13 concept | Classification | 8D-0 treatment |
|---|---|---|
| Human review before reconstruction | Compatible | Retained as the purpose of Candidate Review. |
| Per-candidate `approved` and `rejected` decisions | Compatible | Retained. |
| `defer` decision | Compatible with rename | Canonical value becomes `deferred`. |
| Evidence and candidate traceability | Compatible | Strengthened by binding to the persisted discovery artifact instance. |
| Reviewer attribution and review time | Compatible but incomplete | Required per immutable decision event, not nullable package metadata. |
| `needs_more_evidence` decision | Obsolete as a top-level decision | Represent as `deferred` with an optional reason. |
| `unsupported` decision | Obsolete as a top-level decision | Represent as `rejected` or `deferred` with an optional reason. |
| Mutable package status such as `pending` or `partially_reviewed` | Obsolete as candidate state | Derive collection summaries from event history if later needed. |
| One `reviewerRef` and `reviewedAt` for an entire review package | Obsolete for audit | Attribution belongs to each decision event. |
| `discoveryPackageId`, `planningPackageId`, readiness level, and old candidate taxonomy | Needs migration | Replace with canonical 8C artifact/result lineage and route/navigation/section candidates. |
| `ReconstructionCandidateReviewPackage` as the source of truth | Needs migration | A future adapter may consume canonical review decisions; the old package must not become parallel review persistence. |

Any future code that still consumes the 7F-13 shape must migrate through an
explicit adapter or contract replacement. Existing historical types and helpers
are not modified in 8D-0.

## Smallest Safe Scope For 8D-1

Phase 8D-1 is complete. Its canonical module is
`apps/platform/gnr8/architecture/candidate-review-contract.ts`.

The contract contains:

- readonly immutable `CandidateReviewEvent` records with exact artifact-instance
  identity, reviewer attribution, lineage, optional rationale, diagnostics, and
  nullable explicit supersession;
- exactly `approved | rejected | deferred`, with unreviewed represented by no
  decision event;
- `deriveLatestCandidateReviewDecisions(...)`, where valid explicit
  supersession determines chain heads and unrelated heads use `decidedAt` then
  `reviewEventId` deterministic ordering;
- `CandidateReviewPackage`, derived latest decisions and decision counts;
- `validateCandidateReviewPackage(...)` for lineage, artifact/candidate
  consistency, supersession integrity, latest-decision reproduction, counts,
  and recursive forbidden generated/execution fields;
- `createEmptyCandidateReviewPackage(...)` for a valid zero-event package;
- focused contract tests;
- no UI and no persistence yet.

8D-1 must not add a review route, form, button, persistence record, provenance
write, schema change, package builder, Structure Plan, AI call, reconstruction,
worker, generation, publishing, or changes to Candidate Discovery, Evidence
Capture, or Limited Dry Run.

## 8D-1 Exit State

Candidate Review now has a canonical, validated contract for auditable human
governance over an exact persisted Candidate Discovery artifact instance. Its
only decisions are `approved`, `rejected`, and `deferred`; its source identity
and minimum lineage are explicit; its history is immutable; its latest decision
is reproducibly derived; and approval stops at eligibility for future packaging
or planning consideration.

No Candidate Review persistence, UI, execution, AI, reconstruction, generation,
publishing, schema, worker, Candidate Discovery behavior, Evidence Capture
behavior, or Limited Dry Run behavior was added or changed.

Phase 8D-2 now defines the persistence design in
`CANDIDATE_REVIEW_PERSISTENCE_BOUNDARY.md`. It recommends a dedicated
`candidate_review_package` artifact boundary as a sibling to Candidate
Discovery artifacts in the existing site-version provenance container.

Validated packages persist as append-only immutable snapshots with complete
event history and a latest pointer. Exact semantic retries reuse the existing
artifact; a changed valid event history appends; equal latest decisions with
different history still append; stale or rewritten history is rejected.
Discovery artifacts remain unchanged.

Provider approval patterns contribute stable identity, scoped lineage,
attribution, trusted timestamps, idempotent insert, and fail-closed audit
practices. Their provider/execution scope, mutable approval transitions, DB
tables, and lifecycle vocabulary are not the Candidate Review source of truth.

Phase 8D-2 is documentation and architecture only. It adds no persistence,
provenance field, schema, UI, review execution, reconstruction, AI, publishing,
worker, Candidate Discovery, Evidence Capture, or Limited Dry Run behavior.

Phase 8D-3 now implements the dedicated persistence boundary in
`apps/platform/gnr8/architecture/candidate-review-persistence.ts`. Validated
`candidate_review_package` snapshots persist under the existing site-version
provenance container with append-only history and a latest pointer. Exact
semantic retries reuse the latest artifact; changed valid history appends; and
omitted, rewritten, reordered, stale, or branching history fails closed.

The persistence helper verifies the referenced persisted Candidate Discovery
artifact, exact site-version and dry-run lineage, canonical review-package
identity, and candidate membership before write. It preserves package, event,
validation, attribution, timestamp, count, contract-version, and diagnostic
metadata. It adds no review UI or execution and does not change Candidate
Discovery, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing,
schema, migrations, or workers.

The recommended next phase is **Phase 8D-4 - Candidate Review Read-Only
Surface Design**.

Phase 8D-4 now defines that surface in
`docs/architecture/CANDIDATE_REVIEW_SURFACE_DESIGN.md`. The selected location is
a dedicated admin Candidate Review page. Its read-only projection combines the
persisted review package's attributed latest decisions and immutable event
history with candidate type, confidence, limitations, route grouping, and
diagnostics from the exact linked Candidate Discovery artifact.

The surface groups approved, rejected, deferred, and unreviewed candidates
while preserving route, navigation, and sections-by-route Discovery grouping.
It defines missing, empty, invalid, all-unreviewed, stale, and superseded-event
states without creating decisions or exposing review, AI, reconstruction,
publishing, edit, or trigger controls.

The recommended next phase is **Phase 8D-5 - Candidate Review Read-Only Surface
Implementation**.

Phase 8D-5 now implements the dedicated read-only Candidate Review admin page
at `/gnr8/admin/candidate-review/[siteVersionId]` and the UI-independent
`CandidateReviewSurfaceProjection`. The projection validates the latest raw
persisted review artifact, resolves its exact Candidate Discovery artifact,
derives latest decisions and supersession history from immutable events, and
preserves Discovery order within approved, rejected, deferred, and unreviewed
groups.

The guarded page displays persisted lineage, counts, attribution, rationale,
event history, candidate confidence, limitations, diagnostics, and missing,
empty, invalid, all-unreviewed, stale, and superseded-history states. It has no
buttons, forms, inputs, review actions, edit controls, AI controls,
reconstruction controls, publishing controls, or trigger controls.

Phase 8D-5 changes no review contract or persistence behavior, Candidate
Discovery behavior or persistence, Evidence Capture, Limited Dry Run,
reconstruction, AI, publishing, schema, migrations, or workers.

The recommended next phase is **Phase 8D-6 - Candidate Review End-to-End Admin
Verification**.

## Phase 8D-9 Action Contract

Phase 8D-9 adds the canonical pure Candidate Review Action contract at
`apps/platform/gnr8/architecture/candidate-review-action-contract.ts`. The
allowed actions are exactly `approve | reject | defer`, mapped to the existing
`approved | rejected | deferred` decisions. One request carries stable action
identity, authenticated `superadmin` actor context, exact Discovery candidate
and Review Package artifact lineage, rationale, and request time.

Validation fails closed on invalid actions or actor roles, incomplete or
mismatched lineage, a missing candidate in an optionally linked Discovery
result, a stale known package artifact, and recursively nested generated,
execution, reconstruction, or publishing fields. Accepted creation returns one
immutable attributed event with explicit current-head supersession; rejection
returns no event and explanatory diagnostics. The existing package is never
mutated or persisted by the contract helper.

The recommended next phase is **Phase 8D-10 - Candidate Review Action
Application Design**.

## Phase 8D-13 Action API Design

Phase 8D-13 defines the official initial UI-to-application boundary in
`docs/architecture/CANDIDATE_REVIEW_ACTION_API_DESIGN.md`: one same-origin,
superadmin-only Admin API `POST`, not a Server Action and not both transports.
The browser sends only site version, exact candidate and Discovery/Review
artifact identities, action type, and optional rationale.

The server resolves the authenticated actor and role, trusted request time,
dry-run lineage, authoritative latest Review Package, exact linked Discovery
result, current supersession head, and a deterministic server-generated action
identity. The expected Review Package artifact remains the package-wide
optimistic concurrency token. Stale submissions fail without automatic rebase;
exact deterministic retries return the original immutable result.

The route design invokes only the existing action contract, application helper,
and persistence boundary, then reloads latest and returns metadata-only counts
and artifact/event identities. It rejects unknown and forbidden actor, time,
lineage, generated, execution, reconstruction, AI, worker, and publishing
fields. Phase 8D-13 changes documentation only and implements no endpoint,
Server Action, UI action, review execution, schema, or behavior.

The recommended next phase is **Phase 8D-14 - Candidate Review Action
API/Server Action Implementation**, limited to the designed Admin API route,
its adapter, and focused tests.
