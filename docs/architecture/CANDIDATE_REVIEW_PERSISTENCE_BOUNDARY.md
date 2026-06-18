# Candidate Review Persistence Boundary

## Phase And Scope

Phase 8D-2 defined how a validated `CandidateReviewPackage` should be
persisted. Phase 8D-3 now implements that bounded persistence design.

It does not add or change a database table, create a review surface, execute a
review, or change Candidate
Discovery, Candidate Discovery persistence/UI, the Candidate Review contract,
Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, or
worker behavior.

## Persistence Purpose

Candidate Review persistence must durably preserve attributed human decisions
over one exact persisted Candidate Discovery artifact. It must provide:

- immutable review-event and supersession history;
- a reproducible latest-decision projection;
- a stable package reference for future governed consumers;
- deterministic retry behavior;
- lineage from `candidate_discovery_result` to review package without changing
  the discovery artifact.

Persistence does not execute a review decision. An approved latest decision
means only that the exact candidate artifact instance is eligible for future
packaging or planning consideration.

## Storage Options

| Option | Shape | Benefits | Costs and risks | Decision |
|---|---|---|---|---|
| A. Reuse Candidate Discovery artifact boundary | Store review state in, or as a revision of, `candidate_discovery_result`. | Keeps discovery and review physically close. | Violates Discovery immutability, mixes deterministic observation with human judgment, and makes review history look like discovery history. | Reject. |
| B. Dedicated review artifact boundary | Add a sibling Candidate Review artifact collection and latest pointer to the existing site-version import-provenance container. | Preserves separate ownership and artifact identity, reuses the proven provenance persistence mechanism, requires no schema, and supports immutable snapshots plus a latest pointer. | Repeated snapshots duplicate event history; concurrent writes must protect append and pointer integrity. | **Recommended.** |
| C. Dedicated DB tables | Normalize packages, events, and latest decisions in review-specific tables. | Strong event-level indexing, uniqueness constraints, and concurrency options at larger scale. | Requires schema and migration work before review volume and query patterns justify it; creates a new operational boundary for the first implementation. | Defer. |
| D. Hybrid | Persist authoritative review artifacts and duplicate events or indexes into tables. | Could support future cross-site review queues and analytics. | Creates dual-write consistency and source-of-truth ambiguity. | Defer until measured query or scale pressure exists. |

### Recommendation

Use **Option B: a dedicated Candidate Review artifact boundary**.

The first implementation should place two review-owned sibling fields in the
existing site-version import-provenance summary:

```ts
{
  candidateReviewPackageArtifacts?: CandidateReviewPackageArtifactRecord[];
  latestCandidateReviewPackageArtifact?: CandidateReviewPackageArtifactRecord | null;
}
```

Phase 8D-3 implements these fields through the review persistence helper. They
do not belong inside a Candidate Discovery artifact. The provenance container is reused only as the
storage mechanism and site-version scope; Candidate Review owns its artifact
kind, validation, history, reads, writes, and latest-selection semantics.

A future table migration may replace the physical container, but it must retain
artifact IDs, package IDs, complete immutable event history, exact Discovery
lineage, timestamps, reviewer attribution, ordering, and latest-pointer
semantics. During migration, there must be one authoritative write boundary.

## Artifact Strategy

The `CandidateReviewPackage` is persisted as an **append-only immutable
artifact snapshot with immutable history and a latest pointer**.

- `reviewPackageId` identifies the logical review package for one
  `candidateDiscoveryArtifactId`. The initial canonical identity is the
  contract's existing `candidate-review:${candidateDiscoveryArtifactId}` form;
  callers do not choose a new package ID for each snapshot.
- `artifactId` identifies one immutable persisted snapshot of that package.
- Every changed valid package appends a new artifact; an existing artifact is
  never updated in place.
- Each artifact contains the complete review-event history and its validated,
  derived latest decisions at that point in time.
- `latestCandidateReviewPackageArtifact` points to the newest successfully
  appended valid review snapshot in the site-version container. A read scoped
  to an older `candidateDiscoveryArtifactId` selects that package's latest
  valid artifact from history when the site-version pointer targets another
  Discovery artifact.
- Older snapshots remain readable by artifact ID and are never hidden by
  pointer advancement.

Full snapshots are preferred for the initial boundary because they are
self-validating and can reproduce current decisions without joining mutable
records. The storage duplication is acceptable for the bounded initial review
volume. Event tables or content-addressed event storage should be reconsidered
only after measured size, query, or concurrency pressure.

An empty, valid review package may be persisted to establish a durable review
boundary, but it grants no authority and reports zero reviewed candidates.

## Artifact Kind And Envelope

The canonical artifact kind is:

```text
candidate_review_package
```

The implemented envelope keeps persistence identity separate from the
contract package:

```ts
type CandidateReviewPackageArtifactRecord = {
  kind: "candidate_review_package";
  artifactVersion: 1;
  artifactId: string;
  reviewPackageId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  reviewedCandidateCount: number;
  approvedCount: number;
  rejectedCount: number;
  deferredCount: number;
  createdAt: string;
  persistedAt: string;
  contractVersion: string;
  validationStatus: "valid";
  package: CandidateReviewPackage;
  validation: CandidateReviewValidationResult;
  diagnostics: string[];
};

type CandidateReviewPackageArtifactReference = Omit<
  CandidateReviewPackageArtifactRecord,
  "package" | "validation"
>;
```

`artifactVersion` versions the persistence envelope. `contractVersion`
versions the validated Candidate Review contract. They are independent.

## Metadata Design

| Metadata | Source and rule |
|---|---|
| `artifactId` | Durable identity of one immutable persisted package snapshot. It is not the logical package ID or a Discovery artifact ID. |
| `reviewPackageId` | Stable logical package identity. It must match `package.reviewPackageId`, use `candidate-review:${candidateDiscoveryArtifactId}` in the initial boundary, and remain unchanged across snapshots. |
| `candidateDiscoveryArtifactId` | Exact immutable `candidate_discovery_result` reviewed. It must match the package and resolve under the same site version and dry run. |
| `siteVersionId` | Required write scope and exact match for the Discovery artifact, package, and every event. |
| `dryRunId` | Exact Limited Dry Run lineage copied from the Discovery artifact and package. |
| `reviewedCandidateCount` | Copied from the validated package; equals the number of derived latest decisions. |
| `approvedCount` | Copied from the validated latest-decision projection. |
| `rejectedCount` | Copied from the validated latest-decision projection. |
| `deferredCount` | Copied from the validated latest-decision projection. |
| `createdAt` | Original `package.createdAt`; records package assembly time and is retained unchanged on readback. |
| `persistedAt` | Server-trusted artifact persistence time. It never replaces event `decidedAt` values. |
| `contractVersion` | Explicit Candidate Review contract version used for validation. A version change is semantically significant. |
| `validationStatus` | `valid` only. Invalid packages never become artifacts. |
| `diagnostics` | Persistence-boundary diagnostics; package and event diagnostics remain intact inside the package. |

The required counts are summaries, not independent authority. The complete
event history is authoritative, and latest decisions and counts must reproduce
exactly under `validateCandidateReviewPackage(...)`.

## Write And Read Boundary

Phase 8D-3 implements only this package persistence boundary:

```ts
persistCandidateReviewPackage({
  siteVersionId,
  candidateDiscoveryArtifactId,
  reviewPackage,
  contractVersion,
  options?,
}): Promise<CandidateReviewPackageArtifactReference>

loadLatestCandidateReviewPackage({
  siteVersionId,
  candidateDiscoveryArtifactId,
  options?,
}): Promise<CandidateReviewPackageArtifactRecord | null>

loadCandidateReviewPackageById({
  siteVersionId,
  artifactId,
  options?,
}): Promise<CandidateReviewPackageArtifactRecord | null>
```

The write boundary must load and validate the referenced Candidate Discovery
artifact before writing. It must reject a missing artifact, candidate IDs not
present in that artifact, lineage mismatch, invalid package, forbidden field,
invalid supersession chain, stale base history, or competing latest head.

Reads are scoped, read-only, and return cloned/immutable data. They never
repair history, recompute and persist a replacement, mutate Discovery, or move
the latest pointer.

## Idempotency And Append Rules

Idempotency is scoped to
`siteVersionId + candidateDiscoveryArtifactId + reviewPackageId + contractVersion`.
The exact behavior is:

| Input relationship to latest persisted artifact | Required behavior |
|---|---|
| Same review package semantic content | Reuse and return the existing latest artifact. Do not append and do not move the pointer. |
| Same latest decisions and same complete event history | Reuse only when lineage, diagnostics, and contract version are also semantically identical. |
| Same latest decisions but different event history | Append a new artifact. Equal heads do not erase distinct attributed or superseded events. |
| Same complete event history but a retry-only `package.createdAt` difference | Reuse the existing artifact; its original `createdAt` remains authoritative. |
| New valid review event extending the latest history | Append one new immutable artifact and advance the pointer. |
| Changed contract version | Append a new validated artifact even when review events are otherwise equal. |
| History omits, rewrites, or changes an existing event | Reject. Historical correction requires a new event, not replacement history. |
| Submission supersedes a stale head or branches from stale history | Reject with a conflict; do not create a competing head or advance the pointer. |

Canonical semantic comparison includes the logical package and Discovery
lineage, the complete immutable event set and event content, derived latest
decisions, counts, package diagnostics, and `contractVersion`. It excludes
`artifactId`, `persistedAt`, persistence diagnostics, and retry-only
`package.createdAt` variation. Event timestamps and reviewer attribution are
never excluded.

Equivalent detection happens before assigning a new artifact ID or
`persistedAt`. A changed package must be a strict history extension of the
latest artifact: every previously persisted event must remain byte-equivalent,
and each new superseding event must target the current head for that candidate
artifact instance.

The implementation must use the strongest atomic update available at the
provenance boundary. Appending the artifact and advancing the latest pointer is
one logical commit. On concurrent conflict it must retry from a fresh latest
read or fail explicitly; silent last-writer-wins behavior is forbidden.

## Audit Guarantees

The persistence boundary must guarantee:

- **immutable review events:** persisted events are never updated or deleted;
- **immutable package artifacts:** prior package snapshots never change when a
  later snapshot becomes latest;
- **supersession history:** `supersedesReviewEventId` chains and all superseded
  events remain present and reproducible;
- **reviewer attribution:** every event retains its stable `reviewerRef`;
- **timestamp lineage:** every event retains server-trusted `decidedAt`, every
  package retains `createdAt`, and every artifact records `persistedAt`;
- **source lineage:** every package remains bound to one exact Discovery
  artifact, site version, and dry run;
- **derived-state reproducibility:** latest decisions and all decision counts
  can be derived from the immutable event history;
- **conflict visibility:** stale or branching writes fail explicitly and never
  manufacture a second authoritative latest head;
- **fail-closed validation:** invalid or forbidden content produces no artifact
  and does not move the latest pointer.

Retention, migration, or compaction must preserve these guarantees. A compacted
summary alone can never replace immutable history.

## Relationship To Candidate Discovery

The canonical lineage is:

```text
Candidate Discovery
  candidate_discovery_result
        |
        v
Candidate Review
  candidate_review_package
```

Candidate Review references
`candidateDiscoveryArtifactId + candidateId`. It never writes review fields,
decisions, reviewer identity, timestamps, pointers, or package references into
the Discovery artifact. A new Discovery artifact begins with no review package
and no inherited decisions, even when deterministic candidate IDs recur.

The shared provenance container does not make the boundaries the same. The
Discovery artifact remains an immutable deterministic observation; the Review
artifact is a separate immutable record of attributed human judgment.

## Relationship To Future Phases

```text
Candidate Review Package
        |
        +--> Future Reconstruction Package
        |
        +--> Future Structure Planning
        |
        +--> Future governed AI Reconstruction
```

- A future Reconstruction Package may reference only candidate artifact
  instances whose latest persisted decision is `approved`, and must retain the
  authorizing review artifact/event lineage.
- Future Structure Planning may consume approved candidates but must define its
  own package and planning semantics. Review does not assign structure.
- Future AI Reconstruction may consume review lineage only after separate
  reconstruction package, planning, execution, validation, and publishing
  gates exist. Review persistence never invokes AI or dispatches work.

Rejected and deferred latest decisions provide no downstream authority.
Approval does not authorize reconstruction execution, mutation, generation,
workers, publishing, or provider execution.

## Provider Approval Pattern Reconciliation

Existing provider governance offers useful concepts, but it is not a storage
contract to copy unchanged.

| Concern | Provider approval/operator-review pattern | Candidate Review requirement |
|---|---|---|
| Stable identity and scope | Uses approval/review IDs, provider/handoff scope, correlation keys, and explicit actor/time fields. | Reuse the concepts of stable IDs, exact source scope, attribution, trusted timestamps, validation, fail-closed writes, and deterministic idempotency. |
| Durable audit records | Provider operator reviews are inserted as separate records and read in chronological order. | Preserve separate immutable events, but additionally require explicit per-candidate supersession and a validated full-history package. |
| Current state | Provider approval artifacts can transition a mutable `approval_status`; provider review summaries use chronological/latest and mixed-state rules. | Do not reuse mutable status transitions or mixed-state inference. Latest Candidate Review decisions derive from explicit immutable supersession chains. |
| Authority | Provider approvals are provider/environment/capability/operation/time bound and relate to future execution governance. | Candidate Review is Discovery-artifact/candidate bound and grants only eligibility for future reconstruction packaging or planning. |
| Storage | Provider approvals and operator reviews use dedicated DB tables and repositories. | Do not reuse those tables or repositories. Use the dedicated review artifact boundary first; revisit shared repository primitives only if Candidate Review later moves to tables. |
| Lifecycle vocabulary | Includes requested, approved, rejected, expired, revoked, executed, or provider-specific intent states. | Keep exactly `approved`, `rejected`, and `deferred`; unreviewed is absence. Expiry, execution, and provider lifecycle states do not apply. |

What may be reused later is infrastructure-level practice: authenticated actor
resolution, server timestamps, deterministic identities/correlation, scoped
repository interfaces, insert conflict handling, chronological audit reads,
and fail-closed diagnostics. Provider domain types, tables, mutable transition
logic, execution authority, and lifecycle vocabulary must not be reused as the
Candidate Review source of truth.

## Failure Behavior

| Failure | Required behavior |
|---|---|
| Missing or invalid Discovery artifact | Reject before artifact construction; do not append or move the pointer. |
| Package, event, site-version, dry-run, or candidate mismatch | Reject with complete diagnostics. |
| Invalid package or forbidden generated/execution field | Reject the entire write; never sanitize and continue. |
| Rewritten or missing prior event | Reject as immutable-history violation. |
| Stale supersession or concurrent competing head | Return an explicit conflict and preserve the prior latest pointer. |
| Artifact append or pointer update failure | Report persistence failure and leave the prior valid latest artifact authoritative. No partial success is allowed. |
| Invalid record encountered on read | Never select it as latest; surface diagnostics or fail explicitly and never repair in place. |

## Phase 8D-2 Exit State

At the end of Phase 8D-2, Candidate Review has one persistence design: validated
`candidate_review_package` snapshots use a dedicated append-only artifact
history and latest pointer in the existing site-version provenance container.
Discovery artifacts remain unchanged. Package metadata, exact idempotency and
append behavior, concurrency rules, audit guarantees, future-consumer lineage,
and provider-pattern reuse boundaries are defined.

No persistence, provenance field, table, schema, migration, route, UI, review
execution, reconstruction, AI, publishing, worker, Candidate Discovery,
Evidence Capture, or Limited Dry Run behavior was implemented or changed.

At the Phase 8D-2 exit, the recommended next phase was **Phase 8D-3 -
Candidate Review Persistence Implementation**, limited to this dedicated
artifact boundary and focused tests.

## Phase 8D-3 Implementation Status

Phase 8D-3 is complete. The canonical implementation is
`apps/platform/gnr8/architecture/candidate-review-persistence.ts`, with focused
coverage in `candidate-review-persistence.test.ts`.

The helper persists artifact kind `candidate_review_package` in
`candidateReviewPackageArtifacts` and advances
`latestCandidateReviewPackageArtifact`. It validates the package, forbidden
fields, canonical package identity, exact site-version/dry-run/Discovery
artifact lineage, and reviewed candidate membership before writing. Validation
diagnostics and package/event diagnostics are retained in the artifact.

Exact semantic retries, excluding retry-only package `createdAt`, reuse the
latest artifact. New valid immutable event history appends a snapshot and
advances the latest pointer. Omitted, rewritten, reordered, non-extending,
stale-supersession, and branching histories fail explicitly without writing.
Latest and by-ID reads return cloned full artifact records.

No Candidate Discovery behavior, persistence, or UI; review UI or execution;
Evidence Capture; Limited Dry Run; reconstruction; AI; publishing; schema;
migration; or worker behavior was added or changed.

The recommended next phase is **Phase 8D-4 - Candidate Review Read-Only
Surface Design**.
