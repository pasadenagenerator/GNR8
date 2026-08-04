# GNR8 Single-Site Launch Readiness Transition Contract

Phase: MVP-36
Scope: Documentation and architecture only.

This document defines future launch readiness transitions after validated launch approval and before publish activation review. It does not implement persistence, services, source readers, routes, UI, API, workers, provider calls, DDOM snapshot creation, billing activation, publish activation, publish execution, rollback, Command Center, Ops Inbox, or client portal work.

## Core Rule

Launch readiness starts only after validated launch approval. Launch readiness does not publish, does not approve publish activation, and does not mutate runtime, domain, billing, or provider state.

Publish activation remains separate, exact-scope AAF-governed, and downstream. PASR remains shadow and non-enforcing until a later explicit enforcement milestone.

## Future State Vocabulary

Top-level readiness states:

- `not_started`
- `launch_approved`
- `readiness_work_started`
- `launch_readiness_ready`
- `launch_readiness_ready_with_limitations`
- `launch_readiness_blocked`
- `publish_activation_approval_required`

Dimension states:

- `pending`
- `ready`
- `ready_with_limitations`
- `blocked`
- `stale`
- `missing`
- `not_applicable`

Required dimensions:

- domain readiness;
- billing/hosting readiness;
- rollback readiness;
- smoke QA readiness.

## Transition Table

| From | To | Required source refs | Blocks | Does not do |
| --- | --- | --- | --- | --- |
| `launch_approved` | `readiness_work_started` | Validated MVP-35 launch approval decision and single-site launch approval workflow ref. | Missing/wrong/stale launch approval. | Does not create domain, billing, rollback, smoke, or publish state. |
| `readiness_work_started` | `domain_readiness_pending` | Intended domain or not-applicable target policy, latest known domain binding/instruction refs if available. | Missing domain intent for custom-domain target. | Does not create DDOM snapshot or call DNS/Vercel/provider. |
| `domain_readiness_pending` | `domain_readiness_ready` | Fresh DDOM snapshot, DNS/operator evidence, provider stored-state refs where required. | Stale/missing/blocked DDOM or required evidence. | Does not approve publish or mutate DNS. |
| `domain_readiness_pending` | `domain_readiness_blocked` | Blocker refs and owner workflow. | Blocks launch readiness and later publish activation. | Does not close Ops Inbox by itself. |
| `domain_readiness_ready` | `domain_readiness_stale` | Source changed, TTL expired, target/domain/binding changed, exception expired. | Blocks launch readiness until refreshed/excepted. | Does not refresh itself. |
| `readiness_work_started` | `billing_hosting_readiness_pending` | Client/site/billing policy refs. | Missing site-scoped billing/hosting source truth. | Does not call Stripe or create subscriptions. |
| `billing_hosting_readiness_pending` | `billing_hosting_readiness_ready` | GNR8 hosting entitlement, subscription projection, Stripe refs where applicable, cost/margin/audit refs. | Missing/inactive entitlement or required payment truth. | Does not collect payment or create entitlement. |
| `billing_hosting_readiness_pending` | `billing_hosting_readiness_blocked` | Billing/Stripe/entitlement blocker refs. | Blocks launch readiness and publish activation later. | Does not infer readiness from cost-center existence. |
| `billing_hosting_readiness_ready` | `billing_hosting_readiness_stale` | Entitlement/subscription/payment/policy changed or expired. | Blocks readiness until source-owned refresh. | Does not reconcile Stripe. |
| `readiness_work_started` | `rollback_readiness_pending` | Current active pointer, candidate version/artifact, prior version/artifact/history refs. | Missing known-good target or recovery plan. | Does not execute rollback. |
| `rollback_readiness_pending` | `rollback_readiness_ready` | Known-good target or accepted recovery plan, limitations, owner/audit refs. | Missing target/plan or stale pointer/candidate. | Does not approve or execute rollback. |
| `rollback_readiness_pending` | `rollback_readiness_blocked` | Missing/stale recovery refs. | Blocks launch readiness; publish activation should fail later. | Does not mutate active pointer. |
| `rollback_readiness_ready` | `rollback_readiness_stale` | Active pointer/version/artifact/content history changed. | Blocks readiness until plan refreshed. | Does not recompute by projection only. |
| `readiness_work_started` | `smoke_qa_pending` | Improved candidate preview/smoke target refs. | Missing candidate or no current QA run. | Does not run smoke QA unless future source-owned workflow does. |
| `smoke_qa_pending` | `smoke_qa_ready` | Smoke validator/preview QA refs matching candidate watermark. | Failed/missing/stale checks. | Does not approve content or publish. |
| `smoke_qa_pending` | `smoke_qa_blocked` | QA failure/blocker refs. | Blocks launch readiness. | Does not mutate runtime. |
| `smoke_qa_ready` | `smoke_qa_stale` | Candidate artifact/version/preview policy changed or TTL expired. | Blocks readiness until rerun or accepted limitation. | Does not rerun itself. |
| all required dimensions `ready` | `launch_readiness_ready` | Fresh refs and watermarks for all required dimensions; no unresolved blockers. | None at readiness layer. | Does not request or grant publish activation approval automatically. |
| required dimensions ready with accepted limitations | `launch_readiness_ready_with_limitations` | Accepted limitation/exception refs carried from source owners. | Unaccepted P0 blockers. | Does not hide limitations from publish activation. |
| any required dimension missing/stale/blocked | `launch_readiness_blocked` | Blocker refs and owner workflow refs. | Publish activation review should not proceed as ready. | Does not block current publish path unless future enforcement exists. |
| `launch_readiness_ready` or `launch_readiness_ready_with_limitations` | `publish_activation_approval_required` | Launch readiness package ref and publish activation subject refs. | Missing publish activation approval. | Does not approve publish activation. |

## Stale And Supersession Rules

Launch readiness becomes stale when any of these change after package capture:

- launch approval decision, revocation, supersession, expiry, evidence source refs;
- content approval decision or candidate version/artifact refs;
- required client approval policy or decision;
- improved candidate site version/artifact/bundle/governance;
- publish target policy/status/stage/environment;
- DDOM snapshot TTL or source watermark;
- domain owner/instruction/operator evidence;
- Vercel/custom-domain/SSL stored-state evidence;
- billing/subscription/hosting entitlement or Stripe/payment state;
- active pointer or rollback target/recovery plan;
- smoke QA target/run results;
- readiness policy version.

Stale readiness must fail closed and return to the relevant pending/blocked workflow.

## Publish Activation Handoff

When readiness is `ready` or `ready_with_limitations`, the next state is `publish_activation_approval_required`. The handoff should include:

- launch readiness package ref;
- exact candidate site version/artifact;
- publish target ref and watermark;
- DDOM/domain refs and limitations;
- billing/hosting refs and limitations;
- rollback readiness refs;
- smoke QA refs;
- audit timeline refs;
- carried limitations.

Publish activation approval remains AAF `publish_activation` and must validate exact subject/evidence/source watermarks before any future execution path can rely on it.

## PASR Boundary

PASR can produce optional diagnostics before or during publish shadow observation. It remains:

- non-enforcing;
- fail-open in current publish path;
- unable to create DDOM snapshots;
- unable to approve publish activation;
- unable to mutate runtime state;
- unable to satisfy launch readiness by itself.

## Projection Boundary

Command Center and Ops Inbox may display these future states as derived projections. They must not:

- start readiness work;
- mark a dimension ready;
- resolve blockers;
- create evidence;
- approve publish activation;
- publish;
- rollback;
- mutate source truth.
