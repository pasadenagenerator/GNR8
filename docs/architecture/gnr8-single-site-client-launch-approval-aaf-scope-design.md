# GNR8 Single-Site Client And Launch Approval AAF Scope Design

Phase: MVP-30
Scope: Documentation and architecture only.

This document recommends future AAF scopes and evidence package requirements for single-site client approval and launch approval. It does not implement contracts, SQL vocabulary, AAF writer changes, policy changes, evidence builders, services, routes, UI, runtime behavior, provider calls, commits, or pushes.

## Recommended Scopes

Client approval:

- scope: `single_site_client_approval`
- evidence package type: `single_site_client_approval_evidence`
- recommended subject type: `single_site_improved_candidate_client_acceptance`
- recommended allowed action: `approve_single_site_client_acceptance`
- recommended replay class: `not_replayable`
- human approval replayable: `false`

Launch approval:

- scope: `single_site_launch_approval`
- evidence package type: `single_site_launch_approval_evidence`
- recommended subject type: `single_site_launch_readiness_review`
- recommended allowed action: `approve_single_site_launch_readiness`
- recommended replay class: `not_replayable`
- human approval replayable: `false`

The existing broad AAF scopes `client_review` and `launch_signoff` should not be reused for MVP single-site migration approval truth unless a future migration path proves exact subject/evidence compatibility. The single-site flow needs exact refs to one migration, one improved candidate site version, one runtime artifact, one content approval, and one limitation set.

## Client Approval Required Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `content_approval`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `improved_version_review`
- `proposal_plan`
- `proposal_approval`
- `implementation_authorization`
- `improvement_execution_attempt`
- `selected_recommendations`
- `limitations`
- `client_or_account_reviewer_identity`
- `client_or_account_reviewer_representative_role`

Recommended optional subject refs:

- `source_evidence_review`
- `clone_review`
- `clone_site_version`
- `clone_runtime_artifact`
- `client_requirement_policy`
- `review_window`
- `supersession_root`

## Client Approval Required Evidence Refs

- `content_approval_decision`
- `improved_candidate_rendered_snapshot`
- `client_facing_summary`
- `limitations_summary`
- `unresolved_deferred_recommendation_summary`
- `operator_account_notes`
- `audit_timeline_refs`

Recommended optional evidence refs:

- `brand_acceptance_notes`
- `legal_or_compliance_notes`
- `client_safe_change_summary`
- `client_review_session_ref`
- `external_reference_acceptance` when a ticket/email/document is cited as evidence

## Client Approval Prohibited Substitutions

These cannot satisfy `single_site_client_approval`:

- `single_site_content_approval`
- `single_site_launch_approval`
- `publish_activation`
- implementation authorization
- proposal approval
- improved version review acceptance
- domain readiness
- billing readiness
- preview rendering
- public runtime rendering
- Command Center or Ops Inbox status
- client portal UI state without exact AAF decision validation
- email, Slack, Teams, ticket, CRM, or spreadsheet text without a GNR8 AAF decision

## Launch Approval Required Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `content_approval`
- `client_approval` when required by policy
- `client_approval_requirement_policy`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `domain_readiness_placeholder_or_ref`
- `billing_hosting_entitlement_placeholder_or_ref`
- `rollback_readiness_placeholder_or_ref`
- `publish_target_placeholder_or_ref`
- `launch_checklist_refs`
- `limitations`

Recommended optional subject refs:

- `improved_version_review`
- `proposal_plan`
- `proposal_approval`
- `implementation_authorization`
- `improvement_execution_attempt`
- `selected_recommendations`
- `smoke_qa_run`
- `seo_readiness`
- `accessibility_readiness`
- `performance_readiness`
- `supersession_root`

## Launch Approval Required Evidence Refs

- `content_approval_decision`
- `client_approval_decision` when required
- `pre_launch_checklist_snapshot`
- `blocker_limitation_summary`
- `domain_readiness_evidence_refs` if available
- `billing_hosting_readiness_evidence_refs` if available
- `rollback_readiness_evidence_refs` if available
- `smoke_qa_summary_refs` if available
- `operator_launch_notes`
- `audit_timeline_refs`

Recommended optional evidence refs:

- `publish_target_policy_ref`
- `ddom_readiness_snapshot_ref`
- `subscription_or_hosting_entitlement_ref`
- `cost_or_margin_readiness_summary`
- `seo_accessibility_performance_summary`
- `launch_window_ref`
- `external_reference_acceptance` when external evidence is cited

## Launch Approval Prohibited Substitutions

These cannot satisfy `single_site_launch_approval`:

- `single_site_content_approval`
- `single_site_client_approval`
- `publish_activation`
- domain readiness or DDOM snapshot
- billing/subscription/hosting entitlement readiness
- publish target source truth
- PASR shadow readiness
- Command Center or Ops Inbox state
- preview rendering
- public runtime rendering
- active pointer state
- content publish event
- runtime ready route status
- rollback target availability

## Decision Status Mapping

AAF decision statuses should remain AAF-native:

- `granted` maps to workflow `approved`;
- `granted_with_limitations` maps to workflow `approved_with_limitations` only when limitations are present and carried forward;
- `rejected`, `revoked`, `expired`, `superseded`, and `cancelled` block readiness;
- missing, wrong-scope, stale, mismatched, or invalid decisions fail closed.

## Evidence Freshness Rules

Client approval evidence becomes stale when:

- the content approval changes, is revoked, or is superseded;
- the improved candidate version/artifact changes;
- selected recommendations or limitations change;
- reviewer identity/scope or client requirement policy changes;
- the evidence package or policy version is superseded.

Launch approval evidence becomes stale when:

- content approval or required client approval changes;
- candidate version/artifact changes;
- limitations, blockers, checklist snapshot, launch policy, or launch window changes;
- readiness refs cited as evidence change or expire;
- publish target, domain readiness, billing readiness, or rollback readiness policy changes materially affect the launch decision.

## Next Implementation Milestone

The next safe milestone should be MVP-31 AAF scope/contracts for `single_site_client_approval` and `single_site_launch_approval`, including TypeScript vocabulary, SQL vocabulary expansion if required, prohibited-action lists, policy/gate tests, and closeout. Persistence and service logic should wait until those exact scopes exist.
