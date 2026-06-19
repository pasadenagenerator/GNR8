# Candidate Review Actions Foundation

## Phase And Boundary

Phase 8D-8 defines how an authenticated human decision becomes an immutable
`CandidateReviewEvent` and a new immutable `candidate_review_package` snapshot.
It is documentation and architecture only.

This phase adds no action endpoint, command handler, UI control, review event,
package write, schema, migration, worker, AI call, reconstruction, Structure
Plan, generated output, or publishing behavior. It does not change Candidate
Discovery behavior, persistence, or UI; the Candidate Review contract,
persistence, or read-only UI; Evidence Capture; or Limited Dry Run.

## Purpose

A Review Action is the authenticated human command that creates a Candidate
Review decision. It provides:

- **human decision creation:** an authenticated person explicitly decides the
  disposition of one exact candidate artifact instance;
- **governance:** downstream eligibility is controlled by explicit human intent,
  not inferred from discovery output or silence;
- **auditability:** actor, time, target, decision, rationale, and supersession are
  retained in immutable history.

A Review Action is not reconstruction, editing, generation, AI execution, or
publishing. An approval creates eligibility for a later governed handoff only.
It does not authorize or trigger downstream execution.

## Canonical Action Model

The exact minimal action set is:

```text
approve | reject | defer
```

Each action maps to the existing decision value with the same meaning:

| Action | Created decision | Meaning |
|---|---|---|
| `approve` | `approved` | Accept this exact candidate artifact instance for possible later packaging or planning. |
| `reject` | `rejected` | Prevent this exact candidate artifact instance from proceeding while this event remains latest. |
| `defer` | `deferred` | Record an intentional, non-authorizing postponement while this event remains latest. |

No additional action is required initially.

- `unreview`, `clear`, and `reset` are rejected because they would erase or
  obscure explicit human history. A reviewer changes disposition by creating a
  new superseding action.
- `needs_more_evidence` is a defer rationale, not another action.
- `unsupported` is a reject or defer rationale, depending on human intent.
- `reopen` is unnecessary because any later decision can explicitly supersede
  the current decision.
- `comment` or `annotate` may become a separate non-decision capability later;
  it is not a Review Action and cannot change latest decision state.

## Action Contract

The future write boundary should accept one authenticated decision command with
this conceptual shape:

```ts
type CandidateReviewActionCommand = {
  actionId: string;
  candidateDiscoveryArtifactId: string;
  candidateId: string;
  expectedReviewPackageArtifactId: string;
  expectedLatestReviewEventId: string | null;
  action: "approve" | "reject" | "defer";
  rationale?: string;
};
```

The server, not the caller, supplies or resolves:

- `reviewEventId` from the stable action identity;
- `reviewerRef` from the authenticated human subject;
- `siteVersionId` and `dryRunId` from the referenced Discovery artifact;
- `decidedAt` from a server-trusted clock;
- `supersedesReviewEventId` from the validated expected current head;
- event and persistence diagnostics.

`actionId` is the idempotency identity for one human submission. Reusing it
with identical semantic input returns the already-created result. Reusing it
with different target, action, expected head, or rationale is a conflict. The
expected package artifact and expected event head make stale UI state explicit;
neither value grants authority by itself.

The boundary must authenticate and authorize before resolving the target. It
must then validate the exact Discovery artifact and candidate, load the latest
Review Package, compare both expected values, and fail closed on missing,
invalid, stale, or mismatched state. Client-selected reviewer identity,
timestamps, event IDs, lineage, package IDs, or supersession targets are not
accepted.

## Granularity

### Options Assessed

**A. Single-candidate action**

```text
candidate artifact instance
  -> one action
  -> one decision event
```

**B. Batch action**

```text
candidate artifact instance set
  -> one batch request
  -> decision event set
```

### Recommendation

Use **A. single-candidate action** as the canonical model.

One action targets exactly
`(candidateDiscoveryArtifactId, candidateId)` and creates exactly one event.
This matches the existing per-candidate event attribution and supersession
contract, gives each decision its own actor/time/rationale, keeps stale-head
checks precise, and makes retries unambiguous.

A future batch UI or API may orchestrate multiple single-candidate commands,
but a batch must not become one shared decision event or bypass per-candidate
validation. Each item retains its own `actionId`, expected head, event,
idempotency result, conflict result, and package lineage. Initial batch
semantics should report item-level outcomes and stop claiming all-or-nothing
atomicity across independently changing candidates. This permits partial
success, so clients must display every item outcome and reload the latest
package before retrying conflicts.

## Event Creation Model

### Options Assessed

**A. Review Action creates an immutable `CandidateReviewEvent`.** The new event
extends immutable history; latest decisions and a new package snapshot are
derived from that history.

**B. Review Action directly mutates the Review Package.** The current package
or its latest decision fields are edited in place.

### Recommendation

Use **A. immutable event creation**. Option B is forbidden.

The event is the authoritative human fact. Latest decisions, counts, and the
new Review Package snapshot are deterministic projections. Direct mutation
would lose attribution and supersession history, make retries ambiguous, and
contradict the implemented append-only persistence boundary.

One successful action is one logical commit:

1. Resolve authenticated `reviewerRef` and authorize the actor.
2. Load and validate the exact Candidate Discovery artifact and candidate.
3. Load and validate the latest Candidate Review Package artifact.
4. Verify `expectedReviewPackageArtifactId` and
   `expectedLatestReviewEventId` against current state.
5. Create one server-attributed immutable `CandidateReviewEvent`.
6. Append it to the complete prior event history.
7. Derive latest decisions and counts using the existing contract rules.
8. Validate the complete updated `CandidateReviewPackage`.
9. Persist one new immutable package artifact and advance its latest pointer.
10. Return the created event and persisted package artifact reference.

If any step fails, no event is accepted, no package artifact is appended, and
the latest pointer remains unchanged. The future implementation must use the
strongest atomic compare-and-append available at the existing persistence
boundary; silent last-writer-wins behavior is forbidden.

## Supersession Model

History is immutable and disposition changes are explicit:

```text
approved -> rejected
approved -> deferred
deferred -> approved
```

The same rule also permits any other meaningful transition among the three
decisions, including repeating the same decision when the human deliberately
records a new rationale. The new event must set
`supersedesReviewEventId` to the current latest event for the same exact
candidate artifact instance.

Rules:

- the prior event is never updated, deleted, or reclassified;
- the superseding event has its own actor, trusted time, rationale, and ID;
- only the unsuperseded chain head is the latest decision;
- the full chain remains visible and reproducible;
- the expected latest event must equal the current head;
- superseding a stale event, another candidate, or another Discovery artifact
  is rejected as a conflict;
- the first decision requires an expected latest event of `null` and creates an
  event with `supersedesReviewEventId = null`;
- retrying the same `actionId` is idempotent and must not create another head.

There is no mutation-based undo. A correction is another explicit,
attributable superseding decision.

## Deferred Semantics

### Options Assessed

**A. Deferred means no decision.** The candidate remains indistinguishable
from an untouched candidate.

**B. Deferred is an explicit decision.** A human intentionally postpones a
terminal disposition, with attribution and rationale retained.

### Recommendation

Use **B. deferred is an explicit decision**.

An unreviewed candidate has no event. A deferred candidate has a latest
`deferred` event and therefore proves that a human considered it without
granting downstream authority. Treating both states as absence would discard
governance intent, make workload reporting inaccurate, and prevent auditable
supersession. Deferred never counts as approval and remains ineligible for
Reconstruction Package or Structure Planning consumption.

## Actor Model

### Options Assessed

| Actor | Initial authority assessment |
|---|---|
| `superadmin` | Appropriate. Existing Candidate Review access is guarded at this trusted operational scope. |
| `admin` | Defer. Tenant/agency scope and review authorization policy are not yet defined. |
| `agency` | Defer. Agency identity, site assignment, and delegated governance rules are not defined for this boundary. |
| `customer` | Defer. Customer review rights, presentation, appeals, and publishing implications require a separate product policy. |

### Recommendation

The minimum initial actor scope is **authenticated superadmin only**. The event
stores a stable authenticated human subject as `reviewerRef`; role labels and
display names are contextual metadata, not durable identity and not caller
input. Service accounts, workers, AI systems, and anonymous users cannot create
Review Actions.

Expanding to admin, agency, or customer actors requires a later authorization
contract defining tenant/site scope, delegation, revocation, impersonation,
and audit presentation. Role expansion must not change event identity,
supersession, or package derivation semantics.

## Package Update Flow

```text
Candidate artifact instance
  -> Review Action
  -> immutable CandidateReviewEvent
  -> Latest Decision Derivation
  -> validated updated CandidateReviewPackage
  -> immutable candidate_review_package artifact snapshot
```

The phrase "updated Review Package" means a newly derived and newly persisted
immutable package snapshot. It never means mutation of the prior package
artifact. The new snapshot contains the complete prior event history plus the
new event, exact derived latest decisions and counts, and unchanged Discovery,
site-version, dry-run, and logical review-package lineage.

Candidate Discovery remains immutable. The action writes no review state into
the candidate or Discovery artifact.

## Relationship To Future Phases

```text
Review Actions
  -> Candidate Review Package

Candidate Review Package
  -> Future Reconstruction Package

Candidate Review Package
  -> Future Structure Planning
```

Review Actions end at a valid persisted Review Package snapshot. A future
Reconstruction Package may reference only exact candidate artifact instances
whose latest persisted decision is `approved`, while retaining the authorizing
review artifact and event lineage. Future Structure Planning may consume the
same approved lineage through its own contract.

Neither downstream relationship is implemented or authorized here. Review
Actions do not assign structure, produce reconstruction intent, trigger AI or
workers, generate output, edit a site, or publish anything.

## Provider Approval Reconciliation

Provider approvals and Candidate Review Actions are both authenticated,
governed human-control boundaries, but they govern different facts and grant
different authority.

| Concern | Provider approvals | Candidate Review Actions |
|---|---|---|
| Purpose | Gate a scoped provider/runtime operation. | Record human disposition of an evidence-backed candidate. |
| Target | Provider, environment, capability, operation, or approval artifact. | Exact `(candidateDiscoveryArtifactId, candidateId)` instance. |
| Similarities | Stable identity, actor attribution, trusted timestamps, scoped validation, idempotency, explicit conflicts, audit reads, and fail-closed behavior. | Reuse these infrastructure principles. |
| State model | Mutable lifecycle transitions such as pending to approved/rejected/expired/blocked may apply. | Immutable `approved | rejected | deferred` events with explicit supersession; unreviewed is absence. |
| Storage | Dedicated provider tables/repositories and provider approval artifacts. | Existing append-only Candidate Review package artifacts and latest pointer. |
| Authority | May govern whether a provider/runtime operation can proceed within its own controls. | Grants only eligibility for later packaging or planning consideration. |
| Execution relationship | Operation-oriented and environment/capability bound. | Non-executing; never reconstruction, AI, worker, mutation, or publishing authority. |

Reusable concepts are authenticated actor resolution, server-trusted time,
stable action identity, scoped authorization, deterministic idempotency,
compare-and-write conflict handling, and fail-closed diagnostics. Provider
domain types, tables, mutable transition functions, lifecycle vocabulary, and
execution authority must not become Candidate Review truth.

## Failure And Conflict Rules

| Condition | Required result |
|---|---|
| Unauthenticated or unauthorized actor | Reject without creating an event or package artifact. |
| Missing/invalid Discovery artifact, candidate, or Review Package | Reject fail-closed. |
| Target or lineage mismatch | Reject; caller input never repairs lineage. |
| Stale expected package artifact or latest event | Return an explicit conflict and current references; create nothing. |
| Reused `actionId` with identical semantics | Return the existing event and package result. |
| Reused `actionId` with different semantics | Reject as idempotency conflict. |
| Invalid event, supersession graph, derived projection, or package | Reject the complete action. |
| Package append or latest-pointer failure | Report failure and leave the prior package authoritative; no partial success. |

## 8D-8 Exit State

At the end of 8D-8, the canonical human decision path is explicit: one
authenticated superadmin submits one action for one exact candidate artifact
instance; the server creates one immutable, attributed event; a changed
decision explicitly supersedes the current head; latest decisions and counts
are derived; and one validated immutable Review Package snapshot is appended.

The exact minimal actions are `approve`, `reject`, and `defer`. Deferred is an
explicit non-authorizing decision. Batch behavior is future orchestration over
single-candidate actions, not a parallel decision model.

## 8D-9 Contract Materialization

Phase 8D-9 implements the canonical pure contract in
`apps/platform/gnr8/architecture/candidate-review-action-contract.ts`.
`CandidateReviewActionRequest` binds one `approve | reject | defer` action to
one authenticated `superadmin`, one exact candidate and package artifact
lineage, a rationale, and a request time. `CandidateReviewActionResult` reports
acceptance, validation, the created event when accepted, and diagnostics.

`validateCandidateReviewActionRequest(...)` rejects invalid action or actor
values, incomplete or mismatched lineage, missing linked Discovery candidates,
stale package artifact references, and forbidden generated, execution,
reconstruction, or publishing fields at any nesting depth.
`createCandidateReviewEventFromAction(...)` purely maps an accepted request to
one immutable `CandidateReviewEvent`, derives its decision and identity, and
points supersession to the validated current head. It never mutates or writes
the supplied package.

Phase 8D-9 adds no endpoint, persistence mutation, UI action, reconstruction,
generated output, AI behavior, publishing behavior, schema, migration, or
worker behavior.

## Recommended Next Phase

Recommend exactly one next boundary: **Phase 8D-10 - Candidate Review Action
Application Design**.
