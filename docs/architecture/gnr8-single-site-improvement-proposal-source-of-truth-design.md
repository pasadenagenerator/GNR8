# GNR8 Single-Site Improvement Proposal Source-Of-Truth Design

Date: 2026-07-30
Phase: MVP-14 source-of-truth design
Scope: Canonical proposal planning persistence requirements for one accepted clone

This document is documentation and architecture only. It does not create SQL migrations, tables, TypeScript services, routes, AI calls, runtime mutations, proposal generation, improvement generation, content editing, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Source-Of-Truth Decision

GNR8 should create a future additive `gnr8_single_site_proposal_*` persistence family for canonical MVP proposal planning.

The single-site migration spine should continue to own coarse operational state, such as `improvement_proposal_started`, `improvement_proposal_ready`, `improvement_proposal_approved`, and `improvement_proposal_rejected`. The proposal persistence family should own proposal-specific truth: header, refs, findings, recommendations, decisions, approvals, implementation authorization refs, revisions, and supersession.

AAF should remain canonical for approval requests, decisions, policy evaluations, audit refs, and evidence packages. Proposal tables should store AAF refs, not duplicate AAF approval truth.

## Canonical Records

Recommended future tables:

| Table | Purpose | Mutation posture |
| --- | --- | --- |
| `gnr8_single_site_proposal_plans` | Current proposal plan header and status for one migration/clone review lineage | Mutable bounded header |
| `gnr8_single_site_proposal_plan_refs` | Durable refs to clone review, source evidence, runtime clone artifacts, WU/VCU, AI advisory bundles, business/context sources, approvals, implementation authorization, and external evidence | Append-only |
| `gnr8_single_site_proposal_findings` | Operator-reviewed findings that explain why recommendations exist | Mutable while draft/review; frozen after approval/rejection/supersession |
| `gnr8_single_site_proposal_recommendations` | Recommended improvements with category, impact, risk, effort, priority, target scope, and approval/implementation eligibility | Mutable while draft/review; frozen after approval/rejection/supersession |
| `gnr8_single_site_proposal_operator_notes` | Operator notes promoted into plan context, with review status and visibility | Append-only notes with supersession rather than edits after review |
| `gnr8_single_site_proposal_decision_events` | Append-only lifecycle and decision events | Append-only |
| `gnr8_single_site_proposal_revision_links` | Supersession and revision lineage between proposal plans | Append-only |

MVP implementation may collapse findings, recommendations, and notes into fewer tables only if the service still preserves their distinct semantics, refs, statuses, and event history. It should not store the whole plan as one mutable JSON blob without queryable recommendation and decision boundaries.

## Proposal Plan Header

`gnr8_single_site_proposal_plans` should include:

- `id`
- `migration_id`
- `client_id`
- `site_id`
- `clone_review_id`
- `source_evidence_review_id`
- `clone_site_version_ref`
- `runtime_artifact_ref`
- `plan_status`
- `plan_version`
- `proposal_scope`
- `title`
- `summary`
- `limitations_json`
- `warnings_json`
- `decision_summary_json`
- `approved_recommendation_count`
- `rejected_recommendation_count`
- `deferred_recommendation_count`
- `implementation_authorized`
- `supersedes_plan_id`
- `superseded_by_plan_id`
- actor, correlation, causation, idempotency, privacy, retention, metadata, created, and updated fields.

The header is the canonical current proposal planning row. It should not embed heavy source artifacts, raw AI output, screenshots, previews, or generated bundles.

## Proposal Plan Refs

`gnr8_single_site_proposal_plan_refs` should include typed refs for:

- `clone_review`
- `clone_review_fidelity_finding`
- `runtime_site_version_clone`
- `runtime_artifact_clone`
- `source_evidence_review`
- `source_evidence_ref`
- `source_capture_ref`
- `business_context_ref`
- `website_understanding_ref`
- `visual_continuity_ref`
- `generated_proposal_artifact_ref`
- `generated_proposal_bundle_ref`
- `ai_provider_input_ref`
- `ai_provider_output_ref`
- `operator_note_ref`
- `proposal_approval_request`
- `proposal_approval_decision`
- `proposal_evidence_package`
- `implementation_authorization_request`
- `implementation_authorization_decision`
- `content_approval_ref`
- `launch_approval_ref`
- `external_reference`

Refs need source system, source table/kind, source record id, source version, source watermark, content hash, captured time, freshness, privacy, retention, and idempotency fields.

## Proposal Findings

Findings explain what problem or opportunity was observed. They should include:

- finding key;
- category;
- severity;
- source refs;
- clone fidelity refs, if derived from clone review;
- source evidence refs, if derived from capture/source review;
- business/context refs, if derived from operator/client context;
- summary;
- evidence confidence;
- status: `open`, `resolved_by_recommendation`, `accepted_limitation`, `deferred`, `superseded`;
- whether it blocks proposal approval.

Findings are not recommendations by themselves. They are evidence-backed reasons.

## Recommended Improvements

Recommendations describe proposed change intent, not implementation output. Each recommendation should include:

- recommendation key;
- target scope: `site`, `page`, `section`, `component`, `content_slot`, `metadata`, `asset`, `form`, `analytics`, `unknown`;
- target refs, if known;
- category from the MVP-14 category vocabulary;
- impact, risk, effort, confidence, and priority;
- rationale;
- expected outcome;
- implementation notes;
- exclusions and limitations;
- linked finding ids;
- source refs;
- AI/advisory refs, if any;
- recommendation status: `draft`, `ready_for_review`, `changes_requested`, `approved`, `approved_with_limitations`, `rejected`, `deferred`, `superseded`;
- implementation authorization status: `not_requested`, `requested`, `authorized`, `authorized_with_limitations`, `rejected`, `expired`, `superseded`.

Approved recommendations authorize nothing by themselves unless a separate implementation authorization decision cites them.

## Operator Notes

Operator notes must not become source truth merely because they were typed. They become canonical planning context only when written through the proposal planning service with actor, role, timestamp, visibility, refs, and review status.

Unapproved operator notes are draft context only. They must not unblock gates or become approval truth.

## AI/Provider Input-Output Refs

If AI is introduced later, canonical proposal planning should store refs to immutable advisory input/output bundles:

- input refs shown to the model;
- output bundle ref;
- model/provider metadata;
- prompt/policy version ref;
- cost event refs where applicable;
- safety and limitation summary;
- content hash;
- freshness and supersession rule;
- human advisory acceptance ref, if the AI output is used as evidence.

AI raw output is never source truth. It is advisory evidence only after human review accepts it for consideration.

## Proposal Approval Refs

Proposal approval should cite AAF records:

- proposal evidence package ref;
- approval request ref;
- approval decision ref;
- policy evaluation ref;
- audit event refs;
- expiration/freshness;
- limitations and prohibited actions.

Absence of an approval ref is not approval. A `not_required_by_policy` outcome must be explicit AAF truth, not inferred.

## Implementation Authorization Refs

Implementation authorization should be separate from proposal approval by default and should cite:

- approved proposal plan id and version;
- approved recommendation ids;
- implementation target scope;
- evidence package ref;
- approval request and decision refs;
- prohibited action list;
- expiration;
- actor/role/scope;
- audit refs.

Implementation authorization does not approve generated output, final content, launch, DNS, billing, publish, or rollback.

## Revision And Supersession

Supersession is required when:

- clone review is superseded;
- clone runtime artifact or version changes;
- source evidence review is superseded;
- material source evidence changes;
- WU/VCU/business context refs change materially;
- AI/advisory input or output refs change;
- policy version changes;
- an approver requests changes;
- implementation planning materially changes scope.

Supersession must create a new proposal plan or revision link. It must not rewrite historical decisions to look current.

## What Must Not Be Source Truth

The following must not be source truth for MVP proposal planning:

- AI raw output;
- generated proposal bundle;
- generated proposal preview;
- thumbnails;
- Command Center projection;
- Ops Inbox item;
- preview rendering;
- chat transcript;
- unapproved operator notes;
- external ticket/email/chat wording;
- runtime clone acceptance alone;
- proposal prose copied into a document outside the proposal service.

## Source Truth Matrix

| Domain | Canonical truth | Proposal planning relationship |
| --- | --- | --- |
| Migration state | Single-site migration spine | Stores coarse proposal state and refs to proposal plan |
| Source evidence | Source evidence review tables and refs | Required input refs |
| Clone acceptance | Clone review tables and refs | Required gate input |
| Runtime clone output | Runtime site version/artifact tables | Cited as target/source refs only |
| Proposal plan | Future `gnr8_single_site_proposal_*` tables | Canonical planning truth |
| Approval/audit/evidence | AAF records | Canonical approval and evidence truth |
| Content implementation | Runtime content slots/overrides and future implementation lineage | Future target only |
| Command Center/Ops Inbox | Derived projections | Display only |
| AI/provider output | Immutable advisory refs after review | Evidence only, not truth |

## Implementation Recommendation

MVP-15 should implement only persistence and a server-only service for proposal planning:

- additive SQL for `gnr8_single_site_proposal_*`;
- no direct runtime mutation;
- no AI calls;
- no content editing;
- no routes/UI;
- no billing/domain/publish coupling;
- idempotency drift checks;
- append-only refs/events;
- closed-by-default RLS;
- AAF refs stored as refs only until full scope validation is implemented.
