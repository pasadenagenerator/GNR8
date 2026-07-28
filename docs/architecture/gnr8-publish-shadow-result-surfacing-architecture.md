# GNR8 Publish Shadow Result Surfacing Architecture

PASR-3 architecture for operator-visible surfacing of publish activation shadow gate results.

This document is documentation-only. It does not implement UI, APIs, server actions, SQL migrations, Command Center changes, Ops Inbox changes, PASR-2 runtime changes, publish behavior, rollback behavior, DDOM snapshot creation, approval creation, provider calls, billing, Stripe, AI, workers, or public runtime behavior.

## Purpose

PASR-2 observes publish activation behind `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE`. It reads PASR source truth, builds AAF publish activation evidence, evaluates the AAF publish activation gate in dry-run mode, logs a shadow-only summary, and returns a test-observable `PublishActivationShadowResult` to the publish orchestrator helper.

PASR-3 defines how operators should later see that result without confusing shadow readiness with actual publish state or approval state.

Operator surfacing exists to answer:

- Did this publish attempt have a shadow observation?
- Was the shadow observer enabled, unavailable, completed, or failed open?
- Which canonical sources were read?
- Which source truth was missing, stale, failed, or unavailable?
- Was a DDOM readiness snapshot present, missing, stale, blocked, not applicable, or manually excepted?
- Was a canonical publish target present and fresh?
- Was a scoped publish activation approval present, missing, stale, wrong-scope, or unavailable?
- Did the AAF dry-run gate say the candidate was ready, approval-required, blocked, stale, or failed?
- Which evidence package, gate attempt, audit event, source refs, watermarks, correlation ids, and idempotency ids support the result?
- What should an operator do next?
- What must not be inferred from the shadow result?

## Current PASR-2 Behavior

PASR-2 produces a `PublishActivationShadowResult` in `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`.

When the feature flag is disabled, `runPublishActivationShadowGateObservation(...)` returns `null` and the observer is not called.

When enabled, the orchestrator helper:

- resolves tenant/client scope when available;
- calls the observer before active pointer mutation;
- logs a compact summary with readiness, missing/stale source truth, DDOM status, gate result, correlation id, shadow evaluation id, and failure reason;
- returns the shadow result to the caller inside the server path;
- fails open on observer errors and returns `null`;
- does not change the publish response contract.

The observer can write AAF evidence and gate records when enabled:

- `gnr8_aaf_evidence_packages`
- AAF evidence source refs/items/freshness rows through the evidence transaction
- AAF policy/gate/audit rows created by the AAF dry-run gate facade

PASR-2 does not persist a first-class shadow-result read model. Outside tests and logs, operators do not yet have a stable review surface.

Every PASR-2 result is shadow-only:

- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`

## Surfacing Principles

Shadow result surfacing must preserve these rules:

- Shadow results are not enforcement.
- Shadow results must not block publish.
- Shadow results must not be used as source truth.
- Shadow results must not create approvals.
- Shadow results must not create DDOM snapshots.
- Shadow results must not mutate runtime, active pointer, rollback, publish target, content, domain, provider, billing, Stripe, AI, Command Center, Ops Inbox, or public serving state.
- Command Center and Ops Inbox are derived only.
- DDOM readiness is a publish prerequisite, not publish activation approval.
- Domain readiness is a prerequisite, not activation approval.
- Launch signoff is not publish activation approval.
- Client review is not publish activation approval.
- AI output is not approval.
- Existing AAF records, DDOM snapshots, publish target rows, runtime rows, approval rows, and audit rows remain canonical within their own domains.

## Recommended MVP Surfacing Approach

The minimum safe implementation path after this design is a read-only publish shadow result read model/repository.

The first implementation should:

- derive operator-visible shadow result records from AAF evidence/gate records, PASR source refs, and existing logs or future shadow-attempt metadata if introduced by a reviewed read-only milestone;
- expose only internal operator diagnostics;
- avoid publish API response contract changes;
- avoid Command Center UI changes until the read model contract is implemented and validated;
- avoid Ops Inbox work item creation until derivation keys and source refs are stable;
- avoid enforcement.

The first read model should be usable by future Command Center/Ops Inbox surfaces, but it should not depend on those surfaces.

## Future Surfaces

Recommended future placement:

| Surface | Purpose | Boundary |
| --- | --- | --- |
| Command Center site detail or publish readiness drilldown | Show latest shadow result for a site version/publish attempt, source refs, evidence refs, and next action. | Derived projection only. It must label shadow separately from publish state. |
| Command Center publish readiness section | Show whether shadow readiness is ready, warning, missing source truth, stale, or unavailable. | Informational until enforcement is separately designed. |
| Ops Inbox derived items | Create work items for missing/stale DDOM snapshot, missing publish target, missing publish activation approval, source reader failure, evidence/gate failure, or future enforcement-blocking gaps. | Derived from canonical source state and shadow read model; completion requires source transition, new snapshot, approval decision, or audited follow-up. |
| Evidence package drilldown | Link to AAF evidence package, source refs, freshness rows, gate attempt, and audit event. | Internal operator-only unless later redaction review approves client-safe exposure. |
| Logs/diagnostics | Retain compact shadow event logging for failure analysis. | Internal diagnostics only. |

Do not expose PASR-3 shadow diagnostics to clients yet. Client-safe surfacing requires a later redaction and product review because evidence refs may include internal policy, source-reader limitations, audit ids, operator ids, and infrastructure details.

## Visibility Roles

Recommended role visibility:

| Role | Visibility |
| --- | --- |
| Superadmin | Full shadow diagnostics, evidence refs, source refs, limitations, failure reasons, correlation/idempotency ids. |
| Technical operator | Full site-scoped shadow diagnostics needed for DDOM, publish target, source-reader, and gate triage. |
| Agency admin | Site-scoped summary, evidence links, missing approval/DDOM/publish target state, and next operator action. Hide low-level stack/raw failure details when not needed. |
| Migration operator | Read-only visibility for site/batch context and next action. No publish/enforcement controls. |
| Account manager | Limited site/client-safe summary for approval routing and external follow-up. |
| Client reviewer | No PASR-3 shadow diagnostic visibility in MVP. |
| System/worker | May derive status and logs, cannot approve or enforce. |

## Labeling Rules

Every visible status must include:

- `Shadow only`
- `Did not block publish`
- `Not publish approval`
- `Generated from derived read model`
- `Source refs and evidence refs available`

Avoid labels such as "publish blocked", "approved", "safe to publish", "domain approved", or "ready for enforcement" in PASR-3 surfaces.

Recommended human label pattern:

`Shadow readiness: <status label>. Publish was not blocked. Review evidence before relying on this for future enforcement.`

## What Stays Internal

Keep internal-only unless a later redaction review approves exposure:

- raw exception messages;
- full source-reader limitations when they reveal internal table/module names beyond operator need;
- policy internals and gate facade diagnostics;
- operator actor ids beyond role-scoped display;
- idempotency keys outside technical/operator views;
- provider-sensitive or credential-sensitive refs;
- raw evidence package payloads that include internal operational detail.

## What Becomes Visible

Operator-visible MVP fields should include:

- status vocabulary value;
- severity;
- generated/read timestamp;
- publish attempt/site/site version/artifact/target refs;
- whether shadow was enabled;
- whether publish was blocked by shadow, always `false`;
- source read/build/gate status;
- readiness result;
- DDOM snapshot status and snapshot ref;
- publish target status and source ref;
- publish activation approval status and approval refs when present;
- missing and stale source truth;
- warnings and limitations;
- gate result, blocked reasons, stale evidence reasons;
- evidence package id, gate attempt id, audit event id;
- correlation id, idempotency key, shadow evaluation id;
- recommended next operator action.

## Display Rules For Specific Conditions

| Condition | Display |
| --- | --- |
| Shadow disabled | `shadow_not_enabled`, low severity, no result expected, publish unchanged. |
| Scope missing or result unavailable | `shadow_not_available`, medium severity when investigation is needed, no publish blocking. |
| Missing DDOM snapshot | `shadow_missing_ddom_snapshot`, high severity for future enforcement readiness, show `domainReadiness` missing source truth and recommend manual DDOM trigger outside PASR. |
| Stale DDOM snapshot | `shadow_stale_ddom_snapshot`, high severity, show snapshot ref, stale reason, blockers/warnings, and recommend manual DDOM refresh outside PASR. |
| DDOM blocked | `shadow_gate_not_ready`, high severity, show blockers and snapshot ref. |
| Missing publish target | `shadow_missing_publish_target`, high severity, show intended target and missing `publishTarget` source truth. |
| Missing publish activation approval | `shadow_missing_publish_activation_approval`, high severity for future enforcement readiness, show that launch signoff/client review/domain readiness do not satisfy this approval. |
| Source reader failure | `shadow_not_available` or `shadow_evaluation_failed`, medium/high severity by failure, show source reader unavailable and disable side-effect recommendations. |
| Evidence builder failure | `shadow_evaluation_failed`, high severity, show evidence not built and gate not attempted. |
| Gate dry-run failure | `shadow_evaluation_failed`, high severity, show evidence package id if available and gate unavailable/fail-closed dry-run semantics. |
| Gate dry-run not ready | `shadow_gate_not_ready`, high severity, show gate result and blocked reasons. |
| Ready with warnings | `shadow_ready_with_warnings`, medium severity, show warnings and limitations. |
| Complete ready result | `shadow_ready`, low severity, show evidence refs and state that this is not approval or enforcement. |

## Evidence And Source Links

Each visible result should link to:

- AAF evidence package id;
- AAF gate attempt id;
- AAF audit event id;
- source refs for `siteVersion`, `runtimeArtifact`, `activePointer`, `publishTarget`, `domainReadiness`, `contentOverridePublishedState`, `launchSignoff`, and `publishActivationApproval` when present;
- source watermarks and freshness labels;
- DDOM snapshot ref when present;
- publish target source ref and policy version when present;
- approval request/decision refs when present;
- correlation id, causation id when available, request id when available, idempotency key, and shadow evaluation id.

Links must resolve to source-owned drilldowns or evidence views. Command Center and Ops Inbox may link to them but must not own the underlying records.

## Recommended Implementation Sequence

1. Implement a read-only publish shadow result read model/repository with no UI, no API contract change, no enforcement, and no source mutation.
2. Add focused local tests for status derivation, source refs, evidence refs, missing/stale DDOM, missing publish target, missing approval, reader/build/gate failures, and non-enforcement fields.
3. Add an internal evidence drilldown or diagnostic endpoint only after the read model proves stable and access/redaction rules are reviewed.
4. Add Command Center read-only surfacing on site/publish readiness detail.
5. Add Ops Inbox derived work items for stable shadow blockers.
6. Add optional publish API metadata only if the metadata is internal-only, versioned, and cannot be interpreted as publish outcome.
7. Design enforcement separately after operators have reviewed real shadow data and false-positive/false-negative patterns.
8. Wire operator-triggered DDOM snapshot actions from a source-owned DDOM workflow, not PASR or publish evaluation.

## Deferred Decisions

- Persisted first-class shadow result table versus reconstruction from AAF records and logs.
- Whether publish attempts need durable ids before read-model implementation.
- Exact Command Center route placement.
- Exact Ops Inbox work item keys for each shadow condition.
- Client-safe redaction policy.
- Enforcement policy and rollout.
- Publish response metadata contract.

## Safety Conclusion

PASR-3 surfacing must make shadow results visible as evidence-backed diagnostics, not as production truth, approval truth, or enforcement. The conservative next step is the read-only read model/repository first.
