# Post-Candidate-Context Boundary Reassessment

## Phase And Boundary

Phase 8D-27 is documentation and read-only analysis only. It changes no
Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review,
Review Action, Review API, Review UI, Reconstruction, AI, Publishing, schema,
or worker behavior.

## Decision

Recommend exactly one next boundary:

> **Option A - Reconstruction Package Foundation**

The next phase should reconcile the older metadata-only Phase 7F
Reconstruction Package scaffolding with the canonical 8C/8D artifact lineage
and define one non-executing reviewed handoff. It should package only candidates
whose latest decision is `approved` in one exact immutable Candidate Review
Package snapshot.

The recommended next phase is **Phase 8E-0 - Reconstruction Package Foundation
Design**, documentation and contract reconciliation only. It must stop before
package persistence, UI, reconstruction planning or execution, AI, generation,
workers, or publishing.

## Completed Boundaries

The proven operational chain is now:

```text
Real Site
  -> Evidence Capture
  -> Limited Dry Run
  -> Candidate Discovery
  -> Candidate Discovery Persistence
  -> Candidate Review Package
  -> Immutable Review Actions and Package Snapshots
  -> Context-aware Candidate Review UI
```

ODV and ViroiDoc prove real rendered evidence, deterministic Route,
Navigation, and Section candidates, exact artifact lineage, immutable review
events, compare-and-set latest-package advancement, canonical reload, and
authenticated production presentation of exact screenshots and overlays.

Each real target has one approved Route candidate, one rejected Section
candidate, one deferred Navigation candidate, and remaining unreviewed
candidates. ODV's latest reviewed package is
`candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f`; ViroiDoc's is
`candidate_review_package_4e70cbc788098383b52de76249a5c412`.

## Canonical Input To The Next Phase

The canonical input is:

> **One exact immutable Candidate Review Package artifact, explicitly selected
> as the current package head, with approved candidates derived only from that
> artifact's latest decisions.**

The package artifact is the authorization snapshot and concurrency boundary.
The approved candidates are its eligible contents, not a standalone source of
truth. The linked exact Candidate Discovery artifact supplies candidate
definitions. Its linked Limited Dry Run and Evidence Capture artifacts supply
supporting provenance and evidence. Those upstream artifacts are dependencies
by exact reference; none is independently authorizing.

The foundation must not consume a floating latest Discovery result, recompute
candidates from Evidence Capture, merge decisions across Review Package heads,
or infer approval from confidence, context readiness, or evidence quality.
Deferred, rejected, and unreviewed candidates are non-authorizing.

## Option Assessment

| Option | Readiness | Dependencies | Risk | Value | Architectural fit | Relationship to approved candidates |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Reconstruction Package Foundation** | Ready for design and contract reconciliation. Real approved candidates, immutable decisions, exact Review Package heads, and production-visible context now exist. | Exact Review Package artifact; linked Discovery artifact; retained dry-run/evidence refs; package identity, validation, staleness, and status rules. | Medium. The old 7F model can become a parallel truth or imply execution readiness unless replaced or reconciled explicitly. | Highest. Creates the first durable, bounded handoff from human approval toward later planning. | Strongest. Preserves the evidence-first, human-gated chain and adds no generation by itself. | Packages only candidates whose latest decision in the selected Review Package is `approved`; all other states remain excluded/non-authorizing. |
| **B. Structure Planning Foundation** | Not ready as the immediate boundary. Candidate approval exists, but package ownership, plan identity, cross-candidate composition, and staleness semantics do not. | Canonical reviewed handoff; route hierarchy and section-order rules; conflict handling; plan lineage and validation. | High now. Direct planning from individual approvals could bypass a stable authorization snapshot and introduce target intent prematurely. | High later, after the reviewed handoff is canonical. | Correct downstream fit, but it belongs after packaging rather than beside Review. | Must consume the approved set through the Reconstruction Package, not independently query Review or Discovery. |
| **C. Additional governance/review layer** | Technically possible but not justified by a demonstrated gap. Review identity, immutable history, rationale, exact replay, stale-write rejection, and context presentation are proven. | A concrete unresolved policy need, new role boundary, quorum, escalation, or approval class. None is currently established. | Medium. Adds ceremony, states, and potentially a second approval truth without evidence of need. | Low now. It delays the reviewed handoff while duplicating proven governance. | Weak as the next boundary; governance should grow only from an observed policy requirement. | Existing `approved` latest decisions are sufficient for non-executing package eligibility; they do not authorize reconstruction execution. |
| **D. Alternative boundary not previously considered** | No stronger alternative is ready. An approved-candidate handoff audit could be folded into Option A's contract reconciliation rather than become a separate phase. | Would require a concrete gap not already owned by package validation or later planning. | Varies, with a high duplication risk. | Lower than completing the already-identified handoff. | No alternative closes the current gap more directly. | Any legitimate alternative would still need the exact reviewed approval snapshot, so it would not remove the package boundary. |

## Why Reconstruction Package Is Now Safe

Reconstruction Package Foundation is now safe because all authorizing inputs it
previously lacked are real and bounded:

- approved candidates exist on two real sites;
- each approval is an immutable, attributed event against an exact candidate
  and Candidate Discovery artifact;
- each action produced an immutable Candidate Review Package snapshot and
  advanced the latest pointer through compare-and-set semantics;
- prior snapshots remain unchanged and loadable;
- exact replay and stale/conflicting writes fail closed;
- canonical projections reload the approved, rejected, deferred, and unreviewed
  groups from persisted state;
- operators can now see exact-lineage screenshots, Route context, and
  Navigation/Section overlays in production before making decisions.

This makes a metadata-only reviewed handoff legitimate. It does not make
reconstruction execution safe or authorized.

## Why It Was Not Safe Before Candidate Context

Before Candidate Context, the action and audit mechanics were proven, but the
operator experience was context-poor. Candidate labels and diagnostics did not
show the recognizable source page or the precise Navigation/Section region
being authorized. Treating those decisions as the input to a downstream
reconstruction handoff would have amplified technically valid but visually
under-informed approval.

Before Review Actions, the boundary was even less ready: no real approved
candidate, immutable authorizing event, or canonical reviewed package head
existed. Candidate Context did not create authorization; it completed the
evidence presentation needed to trust the already bounded human decision path.

## Inputs The Foundation Should Consume

The initial contract should consume or retain only:

- the exact Candidate Review Package artifact ID and package payload;
- the exact linked Candidate Discovery artifact ID and candidate definitions;
- latest decisions as derived inside that selected Review Package;
- approved candidate IDs, types, route scope, confidence, limitations, reviewer
  rationale, event identity, actor metadata, and decision time;
- exact dry-run and Evidence Capture refs already carried by the approved
  candidate/Discovery lineage;
- package-level validation diagnostics and explicit source-head identity.

The design must define deterministic package identity, validation, duplicate
handling, empty-approved-set behavior, staleness when the Review head advances,
and whether a later package supersedes rather than mutates an earlier package.

## What The Initial Boundary Must Not Do

It must not:

- reconstruct pages, components, content, styles, navigation, or sections;
- create a Structure Plan or choose target route hierarchy/section order;
- assign reconstruction intent automatically from candidate type or review
  decision;
- call AI or generate React, blocks, content models, or editable output;
- execute a Dry Run, dispatch a worker, publish, or mutate a live site;
- create operator controls, package persistence, or a mutation API in the
  initial design phase;
- reinterpret deferred, rejected, or unreviewed candidates as eligible;
- silently follow a newer Review or Discovery latest pointer;
- claim that package creation authorizes execution.

## Already Proven

- Real Evidence Capture screenshots and geometry exist for both targets.
- Limited Dry Run Route, Navigation, and Section models exist and are linked.
- Candidate Discovery results are deterministic, persisted, and loadable.
- Candidate Review packages and events are immutable and exact-lineage.
- Approve, Reject, and Defer work through the bounded production action path.
- Latest-package concurrency, exact replay, canonical refresh, and preserved
  history are verified.
- Each target has one real approved candidate available for a future handoff.
- Context projections for all three candidate types are ready on both targets.
- Production Review UI displays exact screenshots and correct overlay
  invariants without exposing Reconstruction, AI, or Publishing controls.

## Still Unknown

- The canonical 8D-compatible Reconstruction Package contract and version.
- Deterministic package identity and whether/when it is persisted.
- Exact staleness and supersession behavior after a new Review Package head.
- Whether partial reviewed sets may produce a package, and how remaining
  unreviewed/deferred candidates are represented without becoming eligible.
- How multiple approved candidates are ordered, deduplicated, or checked for
  cross-candidate conflicts.
- Whether reviewer rationale is copied or referenced, and the minimum audit
  data that must be frozen into the handoff.
- How limitations affect package status without inventing execution readiness.
- The future Structure Plan contract, ownership, route hierarchy, navigation
  composition, section ordering, and conflict semantics.
- Reconstruction techniques, fidelity criteria, editable content modeling,
  runtime behavior, AI involvement, worker execution, and publishing safety.

These unknowns justify a foundation design. They do not justify skipping the
package and planning directly from Review.

## Boundary Exit Condition

Reconstruction Package Foundation Design is complete only when one canonical
contract can deterministically describe a non-executing package from one exact
Candidate Review Package head, include only its approved latest decisions,
preserve exact upstream and review-event lineage, validate fail closed, and
state explicit staleness and non-authorization semantics.

Completion must not create or persist a package, plan structure, execute
reconstruction, call AI, generate output, dispatch workers, or publish.

## Final Recommendation

Proceed next with **Phase 8E-0 - Reconstruction Package Foundation Design** and
nothing beyond it. The canonical source is the exact immutable Candidate Review
Package head; approved candidates are the eligible subset carried forward from
that snapshot. Structure Planning follows only after this handoff is canonical.
