# GNR8 Single-Site State Spine Implementation Design

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: Canonical single-site migration state and source evidence spine design

This document is documentation and architecture only. It does not implement SQL migrations, TypeScript, JavaScript, API routes, workers, providers, capture/import behavior, clone behavior, proposal behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center behavior, Ops Inbox behavior, public runtime behavior, AI execution, storage behavior, auth behavior, or client portal behavior.

## Purpose

The single-site state spine is the canonical operational state model for the corrected GNR8 MVP workflow: one existing public website, under one selected client, migrated end to end through capture, source evidence review, clone, clone review, proposal, approved improvements, content approval, domain readiness, subscription/hosting readiness, launch approval, publish readiness, published verification, rollback readiness, and closeout.

MVP-3 found that current implementation has strong runtime, capture, DDOM, PASR, PTT, AAF, cost, and derived operator foundations, but no canonical single-site migration state machine. Without this spine, later integrations would create competing sources of truth.

## Canonical Truth Assertions

- `gnr8_single_site_migrations` and its state event history should be canonical for single-site migration operational state.
- Runtime active pointer remains canonical for production serving.
- Runtime site versions, runtime artifacts, raw template artifacts, active pointers, content slots, and content overrides remain canonical for runtime/version/artifact/content serving truth.
- AAF remains canonical for approvals, audit, policy evaluations, evidence package metadata, and approval/evidence links.
- DDOM remains canonical for domain readiness snapshots and freshness.
- PTT remains canonical for publish target truth.
- Stripe remains canonical for billing/customer-payment truth where used.
- GNR8 billing/subscription/entitlement records remain canonical for internal hosting entitlement, operating status, cost center, and margin truth.
- Command Center and Ops Inbox are derived projections only.
- AI output, proposal prose, UI badges, previews, screenshots without durable refs, operator memory, and external notes are not canonical state truth.

## Spine Role

The spine should answer three questions for a single migration:

1. What is the current canonical migration state?
2. Why is the next transition allowed or blocked?
3. Which source refs, evidence refs, approval refs, actor refs, and audit refs prove that state?

The spine should not duplicate heavy artifacts or mutate downstream systems. It should store durable refs, watermarks, stage summaries, blockers, and closeout metrics. Downstream systems remain owners of their specialized truth.

## Relationship To Existing Records

| Area | Existing owner | Spine relationship |
| --- | --- | --- |
| Client/site ownership | `agencies`, `organizations`, `sites`, client membership/RBAC records | A migration must reference one selected client and one ownership site candidate when available. The spine does not replace ownership. |
| Runtime site | `gnr8_runtime_sites` | The spine may reference runtime site id after capture/clone creates or identifies it. It does not own serving identity. |
| Runtime versions | `gnr8_runtime_site_versions` | The spine classifies version refs as clone candidate, improved candidate, publish candidate, published, or rollback target. Runtime lifecycle state remains runtime truth. |
| Runtime artifacts | `gnr8_runtime_artifacts`, `gnr8_runtime_raw_template_artifacts`, artifact file tables | The spine stores refs, hashes, and watermarks only. Artifacts remain runtime/source artifact truth. |
| Active serving | `gnr8_runtime_active_pointers`, runtime publish audit | The spine records publish/rollback readiness and publish result refs. Active pointer remains canonical for public serving. |
| Capture/import | `gnr8_site_render_jobs`, import pipeline provenance, raw imported artifacts, migration job tables | The spine references capture runs and source evidence packages, and owns the review gate before clone generation. |
| Generated proposals | generated website proposal persistence in runtime provenance | The spine references proposal artifacts and later proposal approval refs. It does not treat quarantined proposals as approval or execution truth. |
| Content overrides | `gnr8_content_slots`, `gnr8_content_overrides`, `gnr8_content_override_history` | The spine records approved proposal lineage and content approval refs. Content override state remains content truth. |
| Domain readiness | `gnr8_runtime_domain_host_bindings`, DDOM snapshots | The spine records latest acceptable DDOM snapshot refs and readiness blockers. It does not mutate DNS or provider records. |
| Publish target | `gnr8_publish_targets` | The spine references target id/source watermark for publish readiness. PTT owns target policy/config truth. |
| Billing/cost | `billing_accounts`, `cost_centers`, usage/cost events, future site hosting subscription/entitlement records, Stripe refs | The spine records whether subscription and hosting entitlement prerequisites are satisfied. It does not own customer-payment truth. |
| AAF | `gnr8_aaf_*` | The spine stores AAF refs for evidence packages, approval requests, approval decisions, policy evaluations, and audit events. AAF remains approval/evidence/audit truth. |

## State Model Mapping

The spine should store both a normalized stage and the exact MVP state. This preserves the MVP-2 vocabulary while making projection and querying simpler.

| Stage | States |
| --- | --- |
| `intake` | `site_candidate_created` |
| `source_capture` | `source_capture_started`, `source_capture_completed`, `source_capture_failed`, `source_evidence_review_required` |
| `source_evidence_review` | `source_evidence_review_required` plus review records with `not_started`, `ready_for_review`, `review_in_progress`, `accepted`, `accepted_with_limitations`, `retry_required`, `rejected`, `superseded` |
| `clone` | `clone_generation_started`, `clone_generation_completed`, `clone_review_required`, `clone_revision_required` |
| `proposal` | `improvement_proposal_started`, `improvement_proposal_ready`, `improvement_proposal_approved`, `improvement_proposal_rejected` |
| `improvement_content` | `improvement_implementation_started`, `improvement_implementation_completed`, `improved_preview_ready`, `content_review_required`, `content_approved` |
| `domain_commercial_readiness` | `domain_readiness_required`, `domain_readiness_ready`, `subscription_required`, `subscription_created`, `hosting_entitlement_ready` |
| `launch_publish_recovery` | `launch_approval_required`, `publish_ready`, `published`, `rollback_available` |
| `terminal` | `migration_closed_out`, `migration_failed`, `migration_cancelled` |

## Source Evidence Spine

Source evidence review is a first-class gate. Capture completion only means evidence exists. It does not mean the evidence is sufficient for clone generation.

The spine must require an accepted source evidence review, or an accepted-with-limitations decision with scoped AAF degraded-capture exception refs, before `clone_generation_started`.

Source evidence package refs should cover:

- capture run/job refs;
- source URL and canonicalized URL;
- captured page route map;
- rendered DOM and source/raw refs;
- screenshots and viewport metadata;
- text extraction refs;
- image/asset refs;
- font and style signal refs;
- visual identity/CGP refs;
- metadata and SEO refs;
- diagnostics, limitations, freshness, and source watermarks.

## Placeholder Boundary For Later Work

MVP-4 designs placeholders but does not overbuild runtime behavior:

| Placeholder | MVP-4 treatment |
| --- | --- |
| Clone review/fidelity | Store future refs, summary status, blockers, score, and required AAF approval/evidence refs. Full workflow belongs to a later milestone. |
| Proposal approval | Store proposal artifact refs and required AAF scoped approval refs. Do not use proposal artifact as approval. |
| Content approval | Store content approval refs separate from proposal and launch approvals. |
| DDOM/domain readiness | Store latest acceptable snapshot refs and stale/blocker state. DDOM remains source truth and no DNS mutation is introduced. |
| PASR | Store publish shadow result refs/readiness summary as future evidence. PASR remains shadow/non-blocking until enforcement milestone. |
| PTT | Store publish target id/source watermark. PTT remains publish target truth. |
| Billing/subscription | Store future subscription and entitlement refs. Stripe/payment truth remains external/Stripe where applicable. |
| Publish/rollback | Store readiness, approval, result, active pointer refs, and rollback target refs. Runtime active pointer remains serving truth. |
| Closeout/validation | Store final metrics, issue taxonomy, approval/evidence completeness, and 20-site validation refs. |

## AAF Integration

The spine should not create a parallel approval system. It should link to AAF for:

- evidence packages;
- source evidence degraded-capture exceptions;
- clone acceptance exceptions;
- proposal approval/rejection evidence;
- content approval;
- domain action and domain exception approvals;
- subscription/hosting/cost exceptions;
- launch signoff;
- publish activation approval;
- rollback approval when rollback is executed;
- closeout approval when exceptions or critical incidents occurred;
- append-only audit events for every transition.

AAF scope vocabulary will likely need future single-site additions, such as `source_evidence_acceptance`, `clone_fidelity_acceptance`, `improvement_proposal_approval`, `content_approval`, `hosting_entitlement_exception`, `launch_signoff`, and `migration_closeout`. MVP-5 should design SQL refs that can point to existing AAF rows now and add new AAF scopes in a later approval-policy milestone.

## DDOM Integration

DDOM readiness snapshots remain canonical for domain readiness. The spine should store the selected/latest DDOM snapshot id, source watermark, freshness state, readiness state, and exception refs. A stale or missing DDOM snapshot should block the transition to `domain_readiness_ready` unless an AAF domain exception is granted.

The spine must explicitly state that DDOM readiness is a prerequisite, not launch approval, publish activation approval, DNS truth, or registrar truth. MVP-4 does not authorize DNS, registrar, Openprovider, or provider mutation.

## PASR And PTT Integration

PTT remains canonical publish target truth. The spine should reference target id and target source watermark when assembling `publish_ready`.

PASR remains a shadow/read-only result source until a future enforcement milestone. The spine may record PASR result refs and blocker summaries as readiness evidence, but PASR cannot mutate state, approve publish, or block publish until enforcement is explicitly implemented after source truths mature.

## Billing, Stripe, And Hosting Integration

Billing/customer-payment truth remains in Stripe where Stripe is used. GNR8 must own internal subscription projection, site hosting entitlement, operating status, cost center, cost/margin, and audit refs.

The spine should model:

- `subscription_required` when no acceptable site/client subscription ref exists;
- `subscription_created` when a GNR8 subscription projection or manual attestation exists with Stripe refs where applicable;
- `hosting_entitlement_ready` when GNR8 owns a site-scoped entitlement or approved MVP-lite manual entitlement ref;
- blockers for missing schema, missing Stripe refs, payment ambiguity, inactive entitlement, or margin/cost exception.

Subscription creation must not imply content approval, launch approval, or publish activation approval.

## Command Center Projection

Command Center should consume the spine through a read model after MVP-5/MVP-6. It may show:

- current state and stage;
- allowed/prohibited next actions;
- blockers;
- source evidence completeness;
- clone/proposal/content/domain/subscription/publish/rollback readiness summaries;
- AAF/DDOM/PASR/PTT/billing/runtime refs;
- 20-site validation progress.

Command Center must remain derived. It must not be allowed to resolve canonical state by changing local UI state alone.

## Ops Inbox Projection

Ops Inbox should consume canonical blockers and transition requirements as derived work items. Suggested stable work item families:

- `source_capture_failed`;
- `source_evidence_review_required`;
- `source_evidence_retry_required`;
- `clone_review_required`;
- `clone_revision_required`;
- `proposal_approval_needed`;
- `content_review_required`;
- `domain_action_needed`;
- `ddom_snapshot_stale_or_missing`;
- `subscription_required`;
- `hosting_entitlement_needed`;
- `launch_approval_needed`;
- `publish_activation_approval_needed`;
- `rollback_evidence_needed`;
- `audit_evidence_gap`;
- `migration_closeout_needed`.

Ops Inbox closure must be derived from canonical state transitions or source-owned audited decisions, not item dismissal.

## 20-Site Validation

Every formal validation site should map to exactly one single-site migration spine record unless the site is cancelled and recreated as a new candidate with explicit supersession refs.

Closeout should capture:

- capture success and limitations;
- source evidence review decision;
- clone fidelity score and revisions;
- proposal usefulness and decision;
- improvement implementation time;
- content approval cycle time;
- domain blockers and DDOM freshness;
- subscription/billing/entitlement result;
- publish result and verification;
- rollback readiness;
- defects;
- operator time;
- cost/margin;
- issue taxonomy and lessons.

## Repository And Service Boundaries For MVP-5/MVP-6

Recommended implementation boundaries:

- SQL migrations in `apps/platform/supabase/migrations` for persistence core only.
- Server-only TypeScript contracts under `apps/platform/gnr8/single-site-state/` or `apps/platform/gnr8/single-site-migration/`.
- A write repository that requires a `PoolClient` or server-only pool, supports explicit transactions, enforces idempotency drift checks, and writes state plus events together.
- A read repository that runs `repeatable read read only` projections for Command Center/Ops Inbox.
- Transition service that validates from/to state, required refs, actor role, idempotency key, AAF audit refs, and forbidden shortcuts before writing.
- Evidence review service that writes review decisions and blockers, and returns whether clone generation may start.
- No client-side writes to canonical tables.

## Required SQL Migration Set For MVP-5

MVP-5 should create only persistence core:

- `gnr8_single_site_migrations`;
- `gnr8_single_site_migration_state_events`;
- `gnr8_single_site_migration_refs`;
- `gnr8_single_site_migration_stage_summaries`;
- `gnr8_single_site_migration_blockers`;
- `gnr8_single_site_migration_closeouts`;
- source evidence review tables from `gnr8-source-evidence-review-schema-design.md`.

MVP-5 should not integrate capture, clone, proposal, billing, domain, publish, rollback, Command Center, Ops Inbox, providers, or runtime behavior.

## Architecture Recommendation

Create an additive, closed-by-default, server-written single-site state spine. Use one mutable current-state row per migration plus append-only state events, refs, blockers, stage summaries, source evidence review records, and closeout records. Keep downstream truth specialized and reference it by durable ids, source watermarks, and AAF evidence/audit refs.

Implementation may begin with MVP-5 SQL persistence core after this design is accepted.
