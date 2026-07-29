# GNR8 Single-Site Clone Start Operator Workflow

Date: 2026-07-29
Phase: MVP-10 operator workflow design
Scope: Product workflow for a future clone-start boundary. Documentation only.

This document describes the intended operator experience after the single-site clone-start boundary exists. It does not add UI, API routes, Command Center behavior, Ops Inbox behavior, or runtime integration.

## Source Evidence Ready For Review

After capture/import completes, the single-site state spine should show the migration at `source_evidence_review_required`.

The operator reviews the latest source evidence package:

- source URL and canonical URL;
- page evidence;
- screenshots;
- DOM/rendered DOM;
- text extraction;
- images and assets;
- font and visual identity evidence;
- metadata;
- limitations, warnings, missing evidence, and clone-blocking items.

Clone start is not available until the latest source evidence review reaches `accepted` or `accepted_with_limitations`.

## Accepted Evidence

When the operator accepts complete source evidence:

- source evidence review status becomes `accepted`;
- the MVP-9 gate returns allowed mode;
- clone start may proceed;
- the future clone-start boundary records `clone_generation_started`;
- runtime clone generation starts only after that transition succeeds.

## Accepted With Limitations

When the operator accepts degraded or incomplete evidence with explicit limitations:

- source evidence review status becomes `accepted_with_limitations`;
- limitation details remain visible;
- an AAF degraded evidence approval decision ref is required by MVP-6;
- the MVP-9 gate returns warning mode;
- clone start is allowed but must carry the warning and limitations into state metadata;
- the clone review later must know the source clone was generated under accepted limitations.

Accepted-with-limitations must never look like clean acceptance to operators.

## Rejected Evidence

When evidence is rejected:

- the MVP-9 gate blocks clone start;
- no runtime clone generation begins;
- no clone site version or artifact is created by the clone-start boundary;
- the recommended action is to retry capture or resolve the source evidence issue.

## Retry Required

When the review requires retry:

- source evidence review status is `retry_required`;
- clone start is blocked;
- operator action remains capture retry or evidence repair;
- a later accepted replacement review is required before clone generation.

## Clone Start Allowed

When the latest source evidence review is accepted or accepted with limitations:

- the operator action is "start clone generation";
- dry-run can show that clone start would be allowed without changing state;
- execute mode records `clone_generation_started` through MVP-6;
- generation runs only after the MVP-9 gate and MVP-6 transition pass.

## Clone Start Blocked

Clone start is blocked when:

- `migrationId` is missing or cannot be resolved;
- the migration is missing;
- the read model is unavailable;
- the migration is terminal, failed, or cancelled;
- source evidence is missing;
- review is not started, ready for review, in progress, retry required, rejected, or superseded;
- accepted evidence is internally inconsistent with `cloneGenerationAllowed: false`;
- the MVP-6 transition rejects required refs.

The operator sees a clear blocker reason and next action. No clone/runtime generation should begin.

## Clone Generation Started

After execute mode passes the gate:

- state transitions to `clone_generation_started`;
- the state event links to source evidence review and evidence package refs;
- warning mode and limitations are captured when applicable;
- generation is visibly in progress for the single migration.

## Clone Generation Completed

After runtime clone generation succeeds:

- state transitions to `clone_generation_completed`;
- clone runtime refs are recorded, including clone site version and runtime artifact refs when available;
- the next expected operator action becomes clone fidelity review;
- no publish, domain, billing, proposal, or content approval behavior is implied by clone completion.

## Clone Generation Failed

If clone generation fails after it starts:

- the failure is recorded through MVP-6 according to the current state machine;
- sanitized failure phase, reason code, and correlation id are retained;
- partial runtime refs are diagnostic only unless a completed transition records them;
- automatic retry from `migration_failed` is not available under the current MVP-6 terminal-state model.

If failure happens before clone start is recorded, the operator sees a failed start attempt but the migration state should not be mutated by direct SQL.

## Clone Review Required

After `clone_generation_completed`, the next state is `clone_review_required`.

The operator reviews:

- visual fidelity;
- content preservation;
- structure and navigation;
- source limitations carried from accepted-with-limitations;
- clone artifact refs;
- known gaps and required revisions.

Clone review is separate from source evidence review. Source evidence acceptance allows generation; clone review judges the generated clone.

## Later Command Center

Command Center should later project:

- current single-site migration state;
- gate status and reason;
- accepted-with-limitations warning;
- clone generation started/completed/failed state;
- clone runtime refs;
- recommended next action.

Command Center remains derived-only. It must not be the source of state truth.

## Later Ops Inbox

Ops Inbox should later project work items for:

- source evidence review required;
- source evidence retry required;
- clone start blocked;
- clone generation failed;
- clone review required;
- clone revision required.

Ops Inbox remains derived-only. It should not create source evidence decisions, clone transitions, runtime artifacts, billing records, domain records, publish actions, or rollback state.

## What Remains Manual

The following remain manual or future-milestone work:

- source evidence review decision;
- accepted-with-limitations approval and limitation entry;
- clone fidelity review;
- clone revision decision;
- improvement proposal review;
- content approval;
- domain readiness;
- subscription and hosting entitlement checks;
- launch approval;
- publish and rollback readiness;
- final migration closeout.

## Operator Principle

The operator should experience clone start as a narrow, auditable step: accepted evidence unlocks clone generation, rejected or incomplete evidence blocks it, accepted-with-limitations proceeds with a visible warning, and all lifecycle state changes come from the single-site state spine.
