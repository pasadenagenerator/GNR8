# Post-Review Boundary Reassessment

## Decision

Phase 8D-7 selects exactly one next major Review Track boundary:

> **Option A - Candidate Review Actions Foundation**

The smallest, safest, highest-value next step is to let an authenticated human
create an `approved`, `rejected`, or `deferred` decision for an exact persisted
Candidate Discovery artifact and candidate, append that decision as immutable
review history, and derive the latest decision without mutating prior events.

This is an architectural assessment only. Phase 8D-7 adds no review actions,
reconstruction, Structure Planning, AI, publishing, schema, worker, Evidence
Capture, Limited Dry Run, Candidate Discovery, Candidate Review contract,
Candidate Review persistence, or Candidate Review UI behavior.

## Proven Starting Point

The operational read-only chain is:

```text
Real Site
    -> Evidence Capture
    -> Limited Dry Run
    -> Candidate Discovery
    -> Candidate Discovery Persistence
    -> Read-Only Candidate Discovery UI
    -> Candidate Review Package
    -> Candidate Review Persistence
    -> Read-Only Candidate Review UI
```

ODV and ViroiDoc prove exact Candidate Discovery lineage, valid persisted empty
Candidate Review packages, canonical reload, defensive projection, candidate
grouping, and read-only visibility. ODV exposes four linked candidates and
ViroiDoc exposes five. Every candidate remains unreviewed: both packages contain
zero review events and zero approved, rejected, or deferred latest decisions.

Candidate Review is therefore operational as a read-only artifact track, but
the decision-creation boundary has not been exercised. The next unresolved
question is how explicit human intent enters the otherwise proven chain.

## Decision Criteria

| Option | Business value | Migration value | User visibility | Implementation risk | GNR8 alignment | Readiness |
|---|---|---|---|---|---|---|
| A. Candidate Review Actions Foundation | High: turns inspectable candidates into accountable decisions | High: creates the first legitimate authorizing input for later migration work | High: reviewers can see and create decisions with audit history | Medium: introduces authenticated writes and concurrency, but stays inside an existing contract and persistence boundary | Strongest: evidence-first, human-gated, append-only, and fail-closed | Ready for a separately authorized foundation phase |
| B. Reconstruction Package Foundation | Low now, high later: no approved inputs currently exist | High later: defines the reviewed handoff to reconstruction | Medium: package metadata is inspectable, but an empty package conveys little | Medium-high now: risks adapting obsolete 7F lineage or treating discovery as approval | Weak as the immediate step because it skips the real human gate | Not ready as an operational boundary |
| C. Structure Planning Foundation | Low now, high later: plans have no authorized candidate inputs | High later: creates route/navigation/section migration assets | High later: plans would be directly inspectable | High now: introduces target intent and cross-candidate planning before approval and handoff semantics exist | Premature: observation must not silently become target architecture | Not ready |
| D. Other | No stronger near-term value identified | Any detour either duplicates a proven read-only layer or advances beyond governance | Varies | Varies, with no compensating prerequisite value | No better fit than completing the human gate | Not justified |

## Option A - Candidate Review Actions Foundation

### Readiness

Option A is ready because its input, output contract, storage semantics, and
read projection already exist:

- persisted and validated Candidate Discovery artifacts identify exact review
  targets;
- the canonical Candidate Review contract defines immutable events and exactly
  `approved | rejected | deferred`;
- persistence already supports append-only package snapshots, explicit
  supersession, exact semantic retry, latest-pointer derivation, and fail-closed
  history validation;
- the read-only surface already displays latest decisions, immutable history,
  unreviewed candidates, diagnostics, and stale lineage states;
- ODV and ViroiDoc provide real, currently unreviewed candidates on which a
  later separately authorized action flow can be validated.

### Dependencies

- authenticated reviewer identity resolved on the server;
- authorization limited to the intended admin/superadmin review role;
- exact `siteVersionId`, `candidateDiscoveryArtifactId`, `candidateId`, and
  current Candidate Review package head;
- server-trusted decision timestamp and stable submission identity;
- existing contract validation and persistence helpers;
- explicit stale-head, supersession, retry, and concurrent-write handling;
- post-write reload through the canonical latest loader and projection.

### Missing Prerequisites Inside The Boundary

These are design obligations for Candidate Review Actions Foundation, not
reasons to introduce another architectural boundary first:

- define the smallest action command for approve, reject, and defer;
- derive reviewer identity and trusted time rather than accepting either from
  editable client payloads;
- define an expected current head or equivalent optimistic concurrency guard;
- define idempotency for submission retries;
- define optional reason/note handling without inventing a mandatory taxonomy;
- define how a later decision explicitly supersedes the current event;
- define action-level authorization, validation diagnostics, and audit-safe
  response metadata;
- keep decision creation separate from reconstruction, planning, AI, workers,
  generation, and publishing.

### Risks And Controls

| Risk | Required control |
|---|---|
| A decision targets stale or changed evidence | Bind it to the exact Discovery artifact and candidate; fail if lineage cannot be resolved |
| Concurrent reviewers create competing latest heads | Require the expected current head and fail closed on stale or branching writes |
| A retry appends a duplicate event | Use a stable submission identity and existing semantic idempotency rules |
| Reviewer identity or time is forged | Resolve identity and timestamp on the trusted server boundary |
| An earlier decision is overwritten | Append a new event with explicit supersession; never update or delete history in place |
| Approval is mistaken for execution authority | Keep approval limited to later package/planning eligibility |
| Actions grow into reconstruction controls | Exclude reconstruction, planning, AI, generation, workers, and publishing from the boundary |

### Architectural Value

This boundary supplies the missing human-governance edge between evidence and
migration intent. It makes the existing review contract, append-only
persistence, and read-only UI operational without introducing a new downstream
domain. Once real decisions exist and reload with complete audit lineage, a
later reassessment can evaluate Reconstruction Package Foundation against real
approved inputs instead of hypothetical or synthetic approval.

### Boundary Exit Condition

Candidate Review Actions Foundation should be considered complete only when an
authorized human action can create one valid immutable decision event against
an exact candidate artifact instance, safely append a new package snapshot,
derive the latest decision, preserve prior history, reject stale/conflicting
writes, behave idempotently on retry, and reload through the canonical read
path. This exit condition creates no reconstruction or planning output.

## Option B - Reconstruction Package Foundation

### Readiness And Value

A metadata-only Reconstruction Package contract exists from Phase 7F-14, so
package vocabulary can exist conceptually before real decisions. That older
contract, however, consumes the obsolete Phase 7F-13 review shape and does not
represent the canonical 8C/8D artifact-instance lineage. It is scaffolding, not
an operational handoff for the current Review Track.

The package boundary has strong later migration value: it can freeze a reviewed
set of approved candidates, preserve authorizing review-event lineage, carry
limitations, and provide a stable input to planning. Its present business and
user value is low because ODV and ViroiDoc have no approved candidates.

### Dependencies And Missing Prerequisites

- at least one real latest decision of `approved`;
- canonical 8D review artifact/event lineage rather than the old 7F package;
- explicit selection semantics for mixed approved, rejected, deferred, and
  unreviewed candidates;
- staleness rules when review or discovery advances after packaging;
- package identity, persistence, latest-pointer, and audit semantics;
- a clear statement that package creation grants no execution authority.

### Can It Safely Exist Before Real Review Decisions?

Only as abstract contract scaffolding or a non-authorizing empty/draft shape.
It cannot safely exist as the next meaningful operational boundary or claim a
reviewed reconstruction handoff before real approved decisions exist. A package
that includes unreviewed candidates would infer consent; a package with no
approved candidates would add storage and lifecycle without migration value.
Therefore Option B must follow real review decision creation and validation.

## Option C - Structure Planning Foundation

### Readiness And Value

Route, navigation, and section planning promises high eventual migration value
and strong user visibility. It would turn approved observations into explicit
target route, navigation, and section plans without yet reconstructing content
or design.

It is not ready now. No canonical Structure Plan contract or persistence
boundary exists, the relationship between a Structure Plan and Reconstruction
Package is unresolved, and there are no approved candidate inputs.

### Dependencies And Missing Prerequisites

- real approved candidate artifact instances;
- a canonical reviewed handoff, preferably the later Reconstruction Package;
- plan identity, lineage, validation, persistence, and staleness semantics;
- deterministic handling of cross-candidate dependencies, route hierarchy,
  navigation relationships, section ordering, and conflicts;
- explicit separation from content, design, AI, rendering, execution, and
  publishing.

### Can It Safely Exist Before Approved Candidates?

A generic plan schema could be discussed in isolation, but no operational
Structure Plan can safely claim migration intent before approved candidates
exist. Planning from unreviewed discovery would convert source observations
into target architecture without the required human gate. An empty plan would
not validate the planning semantics. Option C must therefore remain deferred.

## Option D - Other

No additional read-only, capture, persistence, or visibility prerequisite is
missing between the current system and review actions. Returning to an earlier
layer would not close the human-intent gap, while moving to AI, reconstruction,
workers, generation, or publishing would skip governance. No other option is
strongly justified.

## Why The Other Options Are Not Next

- **Reconstruction Package Foundation is deferred** because there are no real
  approved candidates to package, and the existing 7F contract requires
  reconciliation with canonical 8D lineage.
- **Structure Planning Foundation is deferred** because it would create target
  intent before approval and before a canonical reviewed handoff exists.
- **Other is not selected** because the direct prerequisite for every valuable
  downstream boundary is real, auditable review decisions.

These deferrals are not authorization to implement either boundary.

## Final Recommendation

Proceed next with **Candidate Review Actions Foundation** and nothing beyond it.
Limit that phase to authenticated decision creation, append-only review events,
latest-decision derivation, immutable audit history, idempotency, and conflict
handling over the existing Candidate Review contract and persistence boundary.
Do not add Reconstruction Package production, Structure Planning,
reconstruction, AI, rendering, workers, generation, publishing, or schema
changes.
