# GNR8 Single-Site State Transition Contract

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: Future transition contract for the canonical single-site migration state spine

This document is documentation and architecture only. It does not implement transition services, repositories, routes, workers, SQL migrations, provider calls, runtime behavior, publish behavior, rollback behavior, Command Center behavior, or Ops Inbox behavior.

## Contract Purpose

The single-site transition contract defines which state changes are allowed, which source refs and approvals are required, and how derived operator surfaces should represent each condition.

The canonical single-site migration state truth is the future `gnr8_single_site_migrations` current row plus append-only `gnr8_single_site_migration_state_events`. Runtime active pointer remains canonical for production serving. AAF remains canonical for approvals/audit/evidence. DDOM remains canonical for domain readiness snapshots. PTT remains canonical for publish target truth. Billing/Stripe/hosting records remain separate billing and entitlement truth. Command Center and Ops Inbox are derived only.

## Required Transition Envelope

Every transition write must include:

- `migration_id`;
- `from_state`;
- `to_state`;
- normalized `from_stage` and `to_stage`;
- actor type, actor id, and actor role;
- idempotency key;
- correlation id and optional causation id;
- required source refs checked by the transition service;
- required evidence refs checked by the transition service;
- required approval refs checked by the transition service;
- AAF audit event ref, except for early MVP-5 persistence-only dry schema tests;
- blocker changes opened/resolved/superseded by the transition;
- before and after refs;
- Command Center projection status;
- Ops Inbox projection status.

## Distinct Review, Approval, And Readiness Boundaries

These concepts must never collapse into each other:

| Boundary | Meaning | Does not authorize |
| --- | --- | --- |
| Source evidence review | Capture evidence is sufficient for clone generation or accepted with limitations. | Clone acceptance, proposal approval, content approval, launch approval, publish activation. |
| Clone review | Faithful 1:1 clone is accepted or revisions are required. | Proposal approval, content approval, launch approval, publish activation. |
| Proposal approval | Improvement proposal scope is approved for implementation. | Content approval, launch approval, publish activation. |
| Content approval | Improved content/visual result is accepted. | Domain readiness, subscription readiness, launch approval, publish activation. |
| DDOM readiness | Domain/DNS/custom-domain prerequisite snapshot is ready/fresh or excepted. | Any approval or DNS truth. |
| Subscription/hosting readiness | Commercial and entitlement prerequisites are satisfied. | Content approval, launch approval, publish activation. |
| Launch approval | Business/client launch signoff after prerequisites are visible. | Active pointer mutation unless separately scoped as publish activation. |
| Publish activation approval | Governed approval to activate a specific version/target/domain. | DNS mutation, rollback execution, future batch publish. |

## Major Transitions

| Transition | Required canonical source refs | Required evidence refs | Required approval refs | Actor role | Retry behavior | Command Center projection | Ops Inbox projection |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `null` -> `site_candidate_created` | client id, source URL, optional ownership site/intended domain | intake metadata | ownership/admin approval only if ownership changes | migration_operator/account_owner | idempotent create may return existing candidate | candidate created, next capture | intake blocker if missing client/source |
| `site_candidate_created` -> `source_capture_started` | migration id, source URL, capture policy/job ref | capture request evidence | capture approval if policy requires | migration_operator/system_capture | retry with new capture attempt and event | capture running | stuck capture only |
| `source_capture_started` -> `source_capture_completed` | capture run/render job refs, source URL | captured pages, screenshots, DOM/source, text, assets, fonts/style/layout, metadata, diagnostics | none for completion | system_capture | new capture run supersedes prior package | capture complete, evidence review required | `source_evidence_review_required` |
| `source_capture_started` -> `source_capture_failed` | capture run/render job refs | failure diagnostics, retry eligibility | retry/replay approval if policy requires | system_capture/migration_operator | retry returns to `source_capture_started` | capture failed | `source_capture_failed` |
| `source_capture_completed` -> `source_evidence_review_required` | source evidence package/review refs | completeness checklist | none unless degraded exception request is opened | migration_operator/system | newer capture supersedes review | evidence review needed | `source_evidence_review_required` |
| `source_evidence_review_required` -> `source_capture_started` | current review/capture refs | missing evidence or retry-required decision | retry/replay approval if policy requires | migration_operator | allowed with new idempotency/capture attempt | retrying capture | source evidence retry item resolves when capture starts |
| `source_evidence_review_required` -> `clone_generation_started` | accepted source evidence review id, source watermark, capture package refs | accepted evidence categories or accepted limitations | degraded/route/external exception approval if limitations require | migration_operator/system_generation | generation retry uses same accepted review or supersedes on new capture | clone generation running | evidence item resolved; generation blocker if stuck |
| `clone_generation_started` -> `clone_generation_completed` | runtime site/version/artifact refs, accepted evidence review ref | clone artifact, route map, preview refs, diagnostics | none | system_generation/runtime_service | retry by starting clone generation again from accepted evidence | clone preview ready | `clone_review_required` |
| `clone_generation_started` -> `migration_failed` | generation job/artifact refs | failure diagnostics | no-go/exception approval for terminal failure if critical | migration_operator/system | may return to `clone_generation_started` if retryable | clone generation failed | clone generation failure item |
| `clone_generation_completed` -> `clone_review_required` | clone version/artifact refs | source-vs-clone evidence checklist | none to request review | migration_operator | N/A | clone review needed | `clone_review_required` |
| `clone_review_required` -> `clone_revision_required` | clone review refs, clone version refs | fidelity issues, affected routes/assets/content | clone reviewer decision; AAF if exception/scope risk | clone_reviewer/migration_operator | revision loops to clone generation/review | clone revision required | `clone_revision_required` |
| `clone_revision_required` -> `clone_generation_started` | revision request, accepted evidence review, prior clone refs | correction plan | approval only for material scope/risk changes | migration_operator/system_generation | allowed repeated attempts with new event/index | clone revision running | revision item remains until new review |
| `clone_review_required` -> `improvement_proposal_started` | accepted clone review, clone version/artifact refs, source evidence review refs | fidelity score, accepted limitations | clone acceptance decision; AAF where policy requires | clone_reviewer/migration_operator | rejected clone returns to revision | proposal drafting | clone review item resolved |
| `improvement_proposal_started` -> `improvement_proposal_ready` | proposal artifact ref, clone refs, source evidence refs | proposal artifact, risks, scope, source links | none to mark ready | proposal_operator/system_advisory | revise proposal by restarting proposal | proposal awaiting decision | `proposal_approval_needed` |
| `improvement_proposal_ready` -> `improvement_proposal_approved` | immutable proposal artifact refs | proposal evidence package | scoped proposal approval | client_reviewer/account_owner | supersede with new proposal if scope changes | proposal approved | approval item resolved |
| `improvement_proposal_ready` -> `improvement_proposal_rejected` | proposal artifact refs | rejection reason | rejection decision | client_reviewer/account_owner | may return to proposal started | proposal rejected | proposal revision needed if continuing |
| `improvement_proposal_approved` -> `improvement_implementation_started` | approved proposal refs, clone/improved target refs | approved scope/change list | proposal approval decision | implementation_operator/system | retry implementation start idempotently | improvements in progress | stale implementation blocker if stuck |
| `improvement_implementation_started` -> `improvement_implementation_completed` | improved version/artifact/content refs | implementation diff, diagnostics, proposal item mapping | none for completion; scope exceptions require approval | implementation_operator/system | defects may return to implementation started | improved candidate complete | content review needed |
| `improvement_implementation_completed` -> `improved_preview_ready` | improved version/artifact refs | preview URL/smoke/QA refs | none | runtime_preview_service/operator | regenerate preview from same candidate | improved preview ready | `content_review_required` |
| `improved_preview_ready` -> `content_review_required` | improved preview refs | content/visual checklist | none to request review | migration_operator/content_operator | return to implementation for defects | content review needed | `content_review_required` |
| `content_review_required` -> `content_approved` | improved version/artifact/content override refs | preview evidence, diff, accepted limitations | scoped content approval | client_reviewer/content_approver | rejection returns to implementation/content review | content approved | approval item resolved |
| `content_approved` -> `domain_readiness_required` | intended launch domain/domain binding refs | DNS instruction/domain owner evidence requested | domain action approval if policy requires | domain_operator | can re-enter after stale readiness | domain readiness required | `domain_action_needed` |
| `domain_readiness_required` -> `domain_readiness_ready` | latest DDOM snapshot id/watermark, domain binding refs | fresh readiness snapshot, warnings/blockers, owner evidence | domain exception approval if not clean ready | domain_operator | stale/missing returns to required | domain ready prerequisite | domain item resolved or exception shown |
| `content_approved` -> `subscription_required` | client/site/billing account/cost center refs | subscription requirements | commercial approval if policy requires | billing_operator/account_owner | may remain required until refs exist | subscription required | `subscription_required` |
| `subscription_required` -> `subscription_created` | GNR8 subscription projection/manual attestation, Stripe refs where applicable | plan/price/customer/payment refs, audit | commercial/payment approval if policy requires | billing_operator/system_billing | failed creation returns to required | subscription created | billing blocker resolves if valid |
| `subscription_created` -> `hosting_entitlement_ready` | site-scoped hosting entitlement refs | entitlement status/effective dates/operating status | entitlement exception approval if manual override | billing_operator/system_entitlement | inactive entitlement returns to subscription required or blocker | hosting ready | `hosting_entitlement_needed` resolves |
| `content_approved` -> `launch_approval_required` | content approval, DDOM readiness, subscription/entitlement, rollback plan refs as available | launch evidence bundle | none to request launch approval | account_owner/migration_operator | missing prerequisites open blockers | launch approval needed | `launch_approval_needed` |
| `domain_readiness_ready` -> `launch_approval_required` | DDOM snapshot plus content/subscription refs | launch bundle update | none | migration_operator | stale DDOM returns to domain required | launch approval needed | domain item resolved, launch item opened |
| `hosting_entitlement_ready` -> `launch_approval_required` | entitlement plus content/domain refs | launch bundle update | none | migration_operator/account_owner | inactive entitlement reopens blocker | launch approval needed | hosting item resolved, launch item opened |
| `launch_approval_required` -> `publish_ready` | launch approval, content approval, DDOM readiness, subscription/entitlement, PTT target, rollback target, improved version/artifact | publish readiness evidence package | launch approval and publish activation approval request or not-yet-granted marker depending phase | publish_operator/account_owner | stale prerequisite returns to required state | publish ready but activation approval required | `publish_activation_approval_needed` or `publish_ready` |
| `publish_ready` -> `published` | runtime site version/artifact, active pointer before/after plan, PTT target, domain, entitlement | publish activation evidence, PASR refs when available, smoke start refs | publish activation approval granted | publish_operator/runtime_service | publish failure moves to failed or back to publish ready after root cause | live/published status | publish item resolves or `publish_failed` opens |
| `published` -> `rollback_available` | active pointer history, previous/current version refs | rollback target or recovery plan evidence | none unless executing rollback | publish_operator/recovery_operator | missing rollback evidence keeps blocker open | rollback readiness present | recovery evidence item resolved |
| `rollback_available` -> `migration_closed_out` | final URL, all stage refs, validation refs | closeout metrics/evidence summary | closeout approval if exceptions/incidents | migration_operator/account_owner | reopen only through new incident/change workflow | closed out | closeout item resolved |
| any non-terminal -> `migration_failed` | current state refs, failure source refs | failure taxonomy, last good state, recovery/no-go plan | superadmin/owner approval for critical no-go or unsupported continuation | migration_operator/superadmin | retry only through explicit allowed earlier state | failed/no-go | failure item until closed |
| any non-terminal -> `migration_cancelled` | current state refs, client/site/source refs | cancellation reason, cleanup/handoff notes | client/account/admin approval depending scope | account_owner/migration_operator | terminal unless new migration is created | cancelled | no open items after source cancellation decision |

## Forbidden Shortcut Rules

- No transition from `site_candidate_created` to clone, proposal, domain, subscription, publish, rollback, or closeout.
- No transition from capture completion to clone generation without accepted source evidence review.
- No clone generation from `accepted_with_limitations` source evidence without limitation details and required AAF exception refs.
- No improvement proposal before clone review acceptance.
- No improvement implementation from a proposal that is not approved.
- No content approval before improved preview evidence exists.
- No domain readiness ready from DDOM missing/stale/blocked without domain exception approval.
- No subscription creation treated as hosting entitlement readiness unless a GNR8 entitlement ref exists.
- No launch approval treated as publish activation approval unless AAF scope explicitly says publish activation.
- No publish without content approval, domain readiness, subscription/hosting readiness, launch approval, publish activation approval, publish target truth, artifact refs, and rollback target/recovery evidence.
- No rollback execution hidden inside rollback readiness.
- No Ops Inbox dismissal resolving canonical blockers.
- No Command Center local state mutating canonical migration state.
- No AI/provider output directly mutating canonical state.

## Retry And Supersession Rules

Capture retry:

- creates a new capture run/source evidence package;
- supersedes prior non-terminal source evidence review when accepted as replacement;
- may force downstream clone/proposal readiness back to review if prior downstream artifacts depended on stale evidence.

Clone retry:

- must cite the accepted source evidence review;
- creates new clone generation refs;
- supersedes prior clone candidate only through explicit clone revision/review events.

Proposal retry:

- must cite accepted clone review;
- creates a new proposal artifact;
- supersedes prior proposal if scope changes.

Domain readiness refresh:

- must cite a new DDOM snapshot;
- stale snapshots do not become fresh by UI update.

Publish retry:

- requires root-cause evidence, fresh readiness refs, and publish activation approval if prior approval is stale, revoked, superseded, or scope-mismatched.

## Audit Requirements By Boundary

AAF audit is required for:

- migration creation;
- capture start/completion/failure;
- source evidence review decisions;
- degraded evidence acceptance;
- clone review decisions;
- proposal approval/rejection;
- improvement implementation start/completion;
- content approval;
- domain readiness and exceptions;
- subscription/hosting readiness and exceptions;
- launch approval;
- publish readiness assembly;
- publish activation;
- rollback readiness and rollback execution if invoked;
- failure/cancellation;
- closeout.

MVP-5 persistence core may allow nullable audit refs to keep schema additive, but MVP-6 transition writer must enforce audit refs before any runtime integration.

## Command Center Projection Contract

Command Center reads the spine and supporting source systems to show:

- current state/stage;
- next allowed action;
- prohibited actions with reasons;
- source refs and evidence freshness;
- stage summaries;
- blockers;
- approvals required/granted/rejected/stale;
- domain readiness and DDOM freshness;
- subscription/hosting readiness;
- publish target and PASR shadow summary;
- active pointer/public serving refs after publish;
- rollback and closeout status.

Command Center is derived-only. If Command Center disagrees with the spine, the spine wins.

## Ops Inbox Projection Contract

Ops Inbox derives stable work items from open blockers and missing transition requirements. Suggested work item keys must include `migration_id`, blocker type, source ref/watermark when applicable, and current state.

Ops Inbox may recommend actions but cannot:

- approve evidence;
- approve proposals/content/launch/publish;
- mark DDOM ready;
- create subscription or entitlement;
- publish;
- rollback;
- close out a migration;
- resolve source-owned blockers without a canonical state transition.

## MVP-5 And MVP-6 Enforcement Boundary

MVP-5 may implement persistence only.

MVP-6 should implement the server-only transition writer and make this contract executable in tests.

Runtime integrations must wait until the relevant source truth exists:

- capture integration after source evidence review persistence/writer;
- clone gate after source evidence review acceptance writer;
- proposal gate after clone review and proposal approval source truth;
- domain/publish enforcement after DDOM/PTT/AAF/billing/rollback prerequisites are wired.
