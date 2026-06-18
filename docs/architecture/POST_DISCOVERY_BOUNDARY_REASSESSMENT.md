# Post-Discovery Boundary Reassessment

## Decision

Phase 8C-11 selects exactly one next major architectural boundary:

> **Option A - Candidate Review Foundation**

The smallest safe next step after validated Candidate Discovery is to make human
judgment durable, attributable, and reviewable. The next boundary should accept
persisted `CandidateDiscoveryResult` artifacts and produce review state only:
`approved`, `rejected`, or `deferred`. It must not reconstruct, plan generated
structure, call AI, generate output, or publish.

This document is an architectural assessment only. It changes no application
behavior, persistence, schema, UI, worker, Evidence Capture, Limited Dry Run,
Candidate Discovery, Candidate Review, reconstruction, AI, or publishing path.

## Proven Starting Point

The operational chain is now:

```text
Real Site
    -> Evidence Capture
    -> Limited Dry Run
    -> Candidate Discovery
    -> Candidate Discovery Persistence
    -> Read-Only Candidate Discovery UI
```

ODV and ViroiDoc prove that the bounded route, navigation, and section candidate
families can be derived, validated, persisted, loaded, and inspected through the
real chain. The next unresolved question is no longer whether candidates can be
found. It is which discovered candidates a human accepts as authorized inputs to
later architecture work.

## Decision Criteria

| Option | Business value | Migration value | User visibility | Implementation risk | GNR8 alignment | Readiness |
|---|---|---|---|---|---|---|
| A. Candidate Review Foundation | High: converts evidence into accountable human decisions | High: separates usable candidates from rejected or deferred work | High: decisions are understandable and auditable | Medium-low: bounded state transition with no output generation | Strongest: evidence-first, human-gated, deterministic lineage | Ready after contract reconciliation |
| B. Reconstruction Package Foundation | Medium later, low now: a package has no legitimate input until approval exists | High later: creates the reconstruction handoff | Medium: package metadata is inspectable but not yet actionable | Medium-high now: would encourage assumed or synthetic approval | Weak as the immediate step because it skips the human gate | Not ready; depends on durable approved candidates |
| C. Structure Planning Foundation | High later: route/navigation/section plans are visible migration assets | High later: begins native target modeling | High: plans would be directly inspectable | High now: planning introduces interpretation before authority and package lineage exist | Premature: risks converting discovery evidence into target intent without approval | Not ready; depends on review and a reviewed handoff contract |
| D. Other | No alternative provides more value with less risk | No missing lower-level operational gap remains ahead of review | Varies | Any detour either duplicates discovery or jumps beyond governance | No stronger fit identified | Not justified |

## Option A - Candidate Review Foundation

### Readiness

Candidate Review is ready to become the next boundary because its direct input
now exists as immutable, validated, persisted Candidate Discovery artifacts on
two real sites. Candidate IDs, types, confidence, evidence refs, dry-run refs,
limitations, diagnostics, site-version lineage, and discovery artifact identity
are available for a review record to reference without recalculation.

Phase 7F-13 already supplies useful conceptual vocabulary for review decisions
and summaries. It is not implementation-ready for the operational 8C chain: it
uses the older reconstruction discovery package types, permits additional
decision/status vocabulary, and explicitly has no review persistence. The next
foundation must reconcile that model with the canonical 8C
`CandidateDiscoveryResult`; it must extend or supersede the old envelope rather
than create a second review truth.

### Dependencies

- a valid persisted `candidate_discovery_result` artifact
- stable `siteVersionId`, `dryRunId`, `discoveryId`, artifact ID, and candidate ID
  lineage
- Candidate Discovery validation and fail-closed loading
- an authenticated reviewer identity boundary
- explicit review semantics for `approved`, `rejected`, and `deferred`

### Missing Prerequisites Inside The Boundary

These are Candidate Review Foundation design obligations, not reasons to insert
another major boundary first:

- define the canonical review model against the 8C candidate contract
- define whether decisions are immutable events, versioned snapshots, or both
- define actor, timestamp, reason/note, source artifact, and candidate lineage
- define idempotency, stale-discovery handling, re-review, and concurrent update
  behavior
- define aggregate review state without treating partial approval as approval of
  the whole discovery artifact
- choose and document the persistence boundary before implementation

### Risks And Controls

| Risk | Required control |
|---|---|
| Review drifts from the discovery artifact | Bind every decision to the exact discovery artifact and candidate ID |
| A changed latest discovery result silently inherits old approval | Never carry approval across artifact identity without an explicit reconciliation decision |
| Mutable rows erase decision history | Preserve append-only or versioned audit history with actor and timestamp |
| Package or reconstruction work starts from partial review | Require explicit approved candidate inputs; deferred and rejected candidates remain non-authorizing |
| The old 7F contract becomes a parallel truth | Reconcile it with the 8C contract and name one canonical review contract |
| Review becomes implicit reconstruction authorization | State explicitly that approval authorizes only later packaging/planning consideration |

### Architectural Value

Candidate Review closes the first human-governance gap in the validated
migration chain. It transforms persisted evidence-backed observations into
durable intent without changing the source evidence or producing a target. That
creates the first legitimate downstream input for both reconstruction packaging
and structure planning while keeping the blast radius small.

### Boundary Exit Condition

Candidate Review Foundation is complete only when GNR8 has one canonical,
auditable model and persistence boundary that can answer, for every reviewed
candidate: who decided, what they decided, when, why, and against exactly which
discovery artifact and candidate. Completion does not require or authorize
reconstruction, a Reconstruction Package, a Structure Plan, AI, generation, or
publishing.

## Why The Other Options Are Not Next

### Option B - Reconstruction Package Foundation

A package contract already exists conceptually in Phase 7F-14, but its input is
an older Candidate Review package that has never been operationalized or
persisted. Building the package boundary now would either have no real approved
input or would force the package builder to infer approval from discovery.
Inference is not consent. Option B should follow a proven Candidate Review
boundary, when it can package explicit approved decisions with complete lineage.

### Option C - Structure Planning Foundation

Route, navigation, and section candidates make structure planning tempting, but
discovered structure is still source evidence, not accepted target intent.
Planning before review would blur observation and decision, especially for
ViroiDoc's warning-bearing candidates. Option C also lacks a canonical GNR8
Structure Plan contract and must eventually decide whether it consumes approved
candidates directly or a Reconstruction Package. Those decisions are safer
after approval semantics and lineage are real.

### Option D - Other

No discovery, capture, persistence, or visibility repair is needed before the
human gate. Another diagnostic or read-only boundary would add little value,
while any generation, AI, reconstruction, or publishing boundary would skip
required governance. No other option is justified.

## Ordered Deferral

- **Deferred, not rejected:** Reconstruction Package Foundation. Reassess after
  Candidate Review Foundation proves durable approved-candidate lineage.
- **Deferred, not rejected:** Structure Planning Foundation. Reassess after the
  review boundary, and after deciding whether the plan belongs before or inside
  the reviewed Reconstruction Package handoff.

This ordering is not approval to implement either deferred boundary.

## Final Recommendation

Proceed next with **Candidate Review Foundation** and nothing beyond it. Its
scope is review model, review state, review persistence, and review auditability
for persisted 8C candidates. Keep reconstruction, Reconstruction Package
production, Structure Planning, AI, rendering, workers, and publishing outside
that boundary.

