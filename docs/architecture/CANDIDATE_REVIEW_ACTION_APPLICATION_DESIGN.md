# Candidate Review Action Application Design

## Phase And Boundary

Phase 8D-10 defined how one valid `CandidateReviewActionRequest` becomes one
new immutable `candidate_review_package` artifact snapshot. Phase 8D-11
implements that backend application boundary in
`apps/platform/gnr8/architecture/candidate-review-action-application.ts`.

The implementation adds no endpoint, UI action, schema, migration, worker, AI
call, reconstruction behavior, generated output, or publishing behavior. It does not
change Candidate Discovery, Candidate Discovery persistence or UI, the
Candidate Review contract, persistence, or read-only UI, the Candidate Review
Action contract, Evidence Capture, or Limited Dry Run.

## Canonical Application Flow

```text
Candidate artifact instance
  -> CandidateReviewActionRequest
  -> authentication, authorization, lineage, freshness, and action validation
  -> immutable CandidateReviewEvent
  -> deterministic latest-decision derivation
  -> new validated CandidateReviewPackage value
  -> new immutable candidate_review_package artifact snapshot
  -> compare-and-set latest pointer update
```

The application boundary performs the following ordered flow:

1. Resolve the authenticated human subject and authorize the initial
   `superadmin` scope. Caller-provided identity never grants authority.
2. Load the exact persisted Candidate Discovery artifact named by the request,
   validate its site-version and dry-run lineage, and resolve the exact
   candidate artifact instance.
3. Load the authoritative latest valid Candidate Review Package artifact for
   that Discovery artifact. Do not accept a caller-supplied package body.
4. Require the request's `candidateReviewPackageArtifactId` to equal that
   latest artifact ID. Treat this artifact ID as the optimistic concurrency
   token for the complete logical package.
5. Validate the action request against the loaded Discovery result and Review
   Package using the Phase 8D-9 contract. Derive the current per-candidate head
   from that exact package; the caller does not choose a supersession target.
6. Derive `reviewEventId` from `actionId` and check the complete immutable
   artifact history for an earlier use before creating anything.
7. Create one immutable event with server-resolved actor context, trusted
   decision time, exact lineage, mapped decision, rationale, and
   `supersedesReviewEventId` equal to the current head or `null` for a first
   decision.
8. Append that event to the prior package's complete event array. Recompute
   latest decisions and all counts from the complete new history; never patch a
   projection or counter incrementally.
9. Assemble and validate a new `CandidateReviewPackage` value with the same
   logical `reviewPackageId` and Discovery lineage.
10. In one logical compare-and-append commit, assert that the loaded base
    artifact is still latest, append one immutable artifact snapshot, and move
    the latest pointer to it.
11. Return the accepted action result, created event, prior artifact reference,
    and resulting artifact reference. A future transport may shape this
    response, but it cannot weaken these application semantics.

If any check, derivation, validation, append, or pointer update fails, the new
event and package do not become authoritative. The prior latest artifact and
pointer remain unchanged.

## Package Update Strategy

### Options Assessed

**A. Mutate the existing package.** Append an event and replace projections or
counts inside the currently persisted artifact.

**B. Create a new immutable package snapshot.** Preserve the prior artifact,
derive a complete new package from its history plus one event, append a new
artifact, and advance the latest pointer.

### Recommendation

Use **B. create a new immutable package snapshot**. Option A is forbidden.

This is the only strategy consistent with the existing Candidate Review event
contract and append-only persistence boundary. It preserves the exact state a
reviewer saw, makes supersession and retries reproducible, supports artifact-ID
optimistic concurrency, and prevents historical decisions, projections, and
counts from being silently rewritten.

`reviewPackageId` remains the stable identity of the logical package for one
`candidateDiscoveryArtifactId`. Every successful changed application receives
a new artifact ID. The old and new artifacts remain independently loadable.

## Optimistic Concurrency Model

### Package-Level Compare And Set

The request's `candidateReviewPackageArtifactId` is the required base-version
token. Application succeeds only if it still identifies the authoritative
latest valid artifact immediately before commit.

This check is package-wide, not only candidate-wide. If Reviewer A and Reviewer
B both start from package `P1`, the first successful application creates `P2`.
The second application is stale against `P1`, even when it targets another
candidate. This conservative serialization prevents either action from
building a new snapshot that omits the other's event.

The append and pointer move form one logical commit with a compare condition:

```text
latest artifact == expected base artifact
  -> append exactly one strict-history-extension snapshot
  -> latest artifact = resulting artifact
```

Silent last-writer-wins, pointer-only updates, and blind retries are forbidden.
The future implementation must use the strongest atomic compare-and-set
available at the existing provenance boundary. It must not claim success when
the artifact append and pointer update can diverge.

### Same-Candidate Conflict

For two reviewers acting on the same candidate from the same package:

1. both requests initially name the same package artifact and derive the same
   current candidate head;
2. the first committed action becomes the new package and candidate head;
3. the second fails as stale before it can append or supersede anything;
4. the second reviewer must reload the latest package and inspect the new head;
5. a deliberate decision after reload is a new submission with a new
   `actionId`, expected latest package artifact, and newly validated
   supersession.

An application must never automatically rebase a stale human decision. Doing
so could turn an intention made against one visible decision into an
unreviewed supersession of another reviewer's later decision.

### Latest Package And Head Validation

Both checks are mandatory:

- the expected package artifact must equal the current latest artifact; and
- the event's `supersedesReviewEventId` must equal the head derived for the
  exact `(candidateDiscoveryArtifactId, candidateId)` in that package.

The package check prevents lost events anywhere in the snapshot. The head
check prevents a malformed or cross-candidate supersession inside an otherwise
current package. The current head is derived server-side and is `null` only
when the candidate has no prior decision.

## Idempotency Model

`actionId` is the stable identity of one human submission. Its deterministic
event identity is:

```text
candidate-review-event:{actionId}
```

Idempotency is checked across the complete immutable artifact history for the
same review lineage, not only against the latest decision projection.

| Condition | Required result |
|---|---|
| First valid use of `actionId` | Create exactly one event and one resulting immutable package artifact. |
| Exact replay after success | Return the original event and the original resulting artifact reference; append nothing and do not move the pointer. |
| Concurrent identical submissions | One commit may win. After compare-and-set failure, the other reloads history, recognizes the identical committed event, and returns the same result. |
| Same `actionId`, different actor, target lineage, action/decision, rationale, trusted decision time, or expected base | Reject as an idempotency conflict; never reinterpret or overwrite the existing event. |
| Different `actionId` with semantically similar decision | Treat as a distinct attributed human event, subject to current-package and supersession validation. |

Replay comparison uses the accepted event's complete semantic content and the
application lineage that produced it. The earliest immutable package snapshot
that contains the event while its predecessor does not is its resulting
package. Later supersession does not change the replay result.

A stale application creates no event and does not consume a successful action
identity. Because changing the expected package changes the reviewed context,
the reviewer uses a new `actionId` after reload rather than silently reusing a
stale command.

## Package Append Rules

One accepted, non-replay action applies these rules:

- **event append:** copy the complete prior `reviewEvents` sequence unchanged
  and append exactly one new event; no prior event may be omitted, reordered,
  edited, or replaced;
- **latest decision recomputation:** run the canonical
  `deriveLatestCandidateReviewDecisions(...)` logic over the complete new event
  history and store exactly that projection;
- **count recomputation:** set `reviewedCandidateCount` from the number of
  derived latest decisions, then derive `approvedCount`, `rejectedCount`, and
  `deferredCount` from those decisions so their sum equals the reviewed count;
- **metadata update:** preserve `reviewPackageId`, Discovery artifact,
  site-version, and dry-run lineage; set package `createdAt` from the trusted
  application clock; preserve semantic package/event diagnostics unless a
  canonical application rule deterministically adds one; let persistence add
  the new artifact ID, `persistedAt`, contract version, validation, and
  persistence diagnostics;
- **validation:** validate the entire assembled package and require it to be a
  strict one-event extension of the expected base before persistence;
- **pointer update:** advance the latest pointer only as part of the successful
  compare-and-append commit.

Counts, latest decisions, and metadata are projections or envelope data. They
are never independent write inputs and never override immutable event history.

## Audit Guarantees

After every successful application, immutable history must reconstruct:

- **actor:** `reviewerRef` identifies the authenticated human subject; the
  authorization decision establishes that the actor held the required scope;
- **decision:** the event stores exactly `approved`, `rejected`, or `deferred`;
- **rationale:** the accepted rationale is retained with the event;
- **timestamp:** trusted `decidedAt`, package `createdAt`, and artifact
  `persistedAt` remain distinct and preserved;
- **prior decision:** the expected base snapshot and its per-candidate head are
  readable by artifact and event ID;
- **superseded decision:** `supersedesReviewEventId` identifies the exact prior
  event, which remains in every extending history;
- **resulting package:** the application returns the new artifact reference,
  and the first snapshot containing the deterministic event ID identifies the
  immutable result of that action;
- **source lineage:** candidate, Candidate Discovery artifact, dry run, site
  version, logical package, base artifact, and resulting artifact identities
  remain traceable;
- **derived state:** latest decisions and all counts reproduce exactly from the
  complete event history.

No compaction, retry, later supersession, pointer change, or future storage
migration may destroy these guarantees. An approval is auditable eligibility
only; it is not evidence that reconstruction or publishing occurred.

## Failure Modes

| Failure | Detection | Required outcome |
|---|---|---|
| Stale package | Expected artifact ID differs from the current latest artifact before validation or commit. | Return an explicit conflict with current references; create nothing and do not auto-rebase. |
| Missing candidate | Exact candidate ID is absent from the exact linked Candidate Discovery artifact. | Reject fail-closed; create no event or package. |
| Invalid lineage | Site version, dry run, Discovery artifact, logical package, event, or request lineage disagrees. | Reject; caller input cannot repair or substitute lineage. |
| Invalid actor | Subject is unauthenticated, not an authorized `superadmin`, caller-selected, or not a stable human identity. | Reject before event creation and disclose no unauthorized review state. |
| Supersession mismatch | Superseded event is not the server-derived current head for the exact candidate instance, is stale, or belongs to another lineage. | Reject as a conflict or invalid action; preserve the prior head. |
| Duplicate action | Deterministic event ID already exists. | Return the original result only for an exact semantic replay; otherwise reject as an idempotency conflict. |
| Invalid derived package | Full contract validation, strict-extension validation, projection, counts, or forbidden-field validation fails. | Reject the complete application; never sanitize or partially persist. |
| Concurrent commit | Latest pointer changes after the initial read but before commit. | Compare-and-set fails; reload only to classify exact replay versus stale conflict. |
| Append or pointer failure | The logical commit cannot establish both immutable artifact and authoritative pointer. | Report failure and leave the prior artifact authoritative; never report partial success. |

Failures must be classified distinctly in future diagnostics. A duplicate exact
replay is a successful idempotent read of an earlier outcome, not a second
application. Every other failure is non-authorizing.

## Relationship To Future UI

```text
Read-only Candidate Review UI
  -> future Review Action submission
  -> action application boundary
  -> updated immutable Review Package artifact
  -> UI refresh from the canonical latest loader
```

The current UI remains read-only in 8D-10. A future action-enabled UI must send
the exact package artifact it rendered, show stale conflicts rather than
silently retrying, disable assumptions based on local optimistic state, and
refresh from the canonical latest loader after success or conflict. It must not
insert a locally guessed event or count as authoritative.

## Relationship To Reconstruction

```text
Candidate Review Package
  -> exact candidates whose latest decision is approved
  -> future Reconstruction Package
```

Only latest `approved` decisions may make exact candidate artifact instances
eligible for a future Reconstruction Package. The future package must retain
the authorizing Review Package artifact and Review Event lineage and must
revalidate that authority under its own contract.

This design creates no Reconstruction Package, reconstruction plan, structure,
generated output, AI request, worker job, site mutation, or publishing action.
Rejected, deferred, unreviewed, stale, invalid, and superseded approvals grant
no downstream authority.

## Phase 8D-11 Implementation

`applyCandidateReviewAction(...)` accepts the request, authoritative latest
Review Package artifact, and linked Discovery result. It uses the existing
action contract to validate lineage and create the event, recomputes the entire
latest-decision projection and counts, validates the full new package, and uses
the Candidate Review persistence helper to append the snapshot and advance the
latest pointer.

The persistence boundary now supports an optional expected latest artifact ID.
Its database write compares that ID inside the `UPDATE`, so a pointer change
between application validation and commit affects zero rows and fails as
`CANDIDATE_REVIEW_PACKAGE_STALE`. No automatic rebase occurs.

Every applied event records its base package artifact ID in immutable event
diagnostics. Replay lookup scans immutable package history for the deterministic
event ID, reconstructs the event against the named base artifact, and returns
the first resulting snapshot only when every request semantic matches. A
different actor, action, target, rationale, timestamp, or base artifact is an
idempotency conflict.

Focused tests cover approve, reject, defer, supersession, stale-package
rejection, concurrent compare-and-set rejection, exact replay, conflicting
replay, derived count/latest-decision updates, invalid actor and lineage, and
persistence/latest-pointer results.

## Phase 8D-11 Exit State

At the end of 8D-11, one valid action has exactly one implemented application path: load
and validate the exact current package and candidate lineage, create one
immutable event, append it to unchanged history, recompute latest decisions and
counts, validate one new immutable package snapshot, and atomically compare,
append, and advance the latest pointer. Artifact-level optimistic concurrency
prevents lost updates; deterministic action identity makes exact retries return
the original result; immutable snapshots preserve full audit reconstruction.

This remains a backend-only contract and persistence path. No UI, API route,
page action, reconstruction, AI, publishing, schema, or worker was added.

## Recommended Next Phase

Recommend exactly one next boundary: **Phase 8D-12 - Candidate Review Action UI
Design**, documentation and architecture only. It must add no UI implementation,
API route, page action, reconstruction, AI, publishing, schema, migration, or
worker behavior.
