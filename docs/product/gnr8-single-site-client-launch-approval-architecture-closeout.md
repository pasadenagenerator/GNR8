# GNR8 Single-Site Client And Launch Approval Architecture Closeout

Phase: MVP-30
Scope: documentation and architecture only.

## Files Reviewed

- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-db-verification-closeout.md`
- `docs/product/gnr8-single-site-content-approval-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-content-approval-architecture.md`
- `docs/architecture/gnr8-single-site-content-approval-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-content-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-content-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/billing/billing-resolution-service.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- representative client, content, candidate review, runtime preview/publish, DDOM, PASR, Command Center, Ops Inbox, billing, and hosting route/service paths found by repository search
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-client-approval-architecture.md`
- `docs/architecture/gnr8-single-site-launch-approval-architecture.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-source-of-truth.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-client-launch-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Baseline Confirmations

- Content approval is now exact-scope AAF-backed through `single_site_content_approval`.
- No single-site client approval architecture existed yet in the reviewed MVP flow.
- No single-site launch approval architecture existed yet in the reviewed MVP flow.
- Publish activation approval already exists as a separate AAF/PASR concern.
- DDOM/domain readiness is not approval.
- Billing/subscription/hosting entitlement readiness is not approval.

## Client Approval Definition

Client approval is client/account/business acceptance that the improved candidate and its content are acceptable from the client-facing perspective. It includes acceptance of carried limitations, not-applied or deferred recommendations, brand/business/legal/manual notes where applicable, and permission to proceed toward internal launch readiness work.

Client approval is not content approval, technical launch approval, domain/DNS readiness, billing/subscription readiness, publish activation approval, active pointer mutation, public runtime publication, rollback readiness, or future commercial signoff unless separately designed.

MVP grantors should begin with internal account owners, agency admins, or account managers acting on behalf of the client. Actual client reviewers and client portal actors are future actors that must be designed separately.

## Launch Approval Definition

Launch approval is internal operational approval that the improved site candidate is ready to enter final launch preparation after content approval and required client approval. It confirms required pre-launch blockers are resolved or explicitly accepted and allows work to proceed toward domain, billing, publish target, rollback, smoke/QA, and publish readiness checks.

Launch approval is not content approval, client approval, domain/DNS readiness itself, billing/subscription/hosting readiness itself, publish activation approval, active pointer mutation, public runtime publication, rollback approval, or automatic launch checklist execution.

## Source-Of-Truth Decision

Recommendation: hybrid.

- AAF owns approval, audit, evidence, policy, request, decision, revocation, expiration, supersession, and exact-scope validation truth.
- Future single-site client and launch approval persistence owns workflow records, refs, findings, limitations, readiness placeholders/refs, AAF refs, idempotency, and read-model projection.
- Runtime remains candidate version/artifact truth.
- DDOM owns domain readiness snapshots.
- Billing/entitlement owns subscription and hosting readiness.
- PASR/PTT owns publish activation readiness, publish target truth, and publish shadow truth.
- Command Center and Ops Inbox remain derived only.

Rejected alternatives:

- AAF-only for all workflow truth because it would overload AAF with workflow drafting/findings/checklist state.
- Existing client portal/content routes as truth because they are UI/API/mutation surfaces, not exact approval truth.
- PASR/publish as launch approval truth because publish activation is downstream and separate.

## AAF Scope Recommendations

Recommended client approval scope:

- `single_site_client_approval`
- evidence type `single_site_client_approval_evidence`
- subject type `single_site_improved_candidate_client_acceptance`
- allowed action `approve_single_site_client_acceptance`
- replay class `not_replayable`

Recommended launch approval scope:

- `single_site_launch_approval`
- evidence type `single_site_launch_approval_evidence`
- subject type `single_site_launch_readiness_review`
- allowed action `approve_single_site_launch_readiness`
- replay class `not_replayable`

Existing broad `client_review` and `launch_signoff` scopes should not be reused for single-site MVP truth unless a future migration proves exact subject/evidence compatibility.

## Required Client Approval Subject Refs

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

## Required Client Approval Evidence Refs

- `content_approval_decision`
- `improved_candidate_rendered_snapshot`
- `client_facing_summary`
- `limitations_summary`
- `unresolved_deferred_recommendation_summary`
- `operator_account_notes`
- `audit_timeline_refs`

## Required Launch Approval Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `content_approval`
- `client_approval` when required
- `client_approval_requirement_policy`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `domain_readiness_placeholder_or_ref`
- `billing_hosting_entitlement_placeholder_or_ref`
- `rollback_readiness_placeholder_or_ref`
- `publish_target_placeholder_or_ref`
- `launch_checklist_refs`
- `limitations`

## Required Launch Approval Evidence Refs

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

## Status And Category Vocabulary

Client approval status:

- `not_required_yet`
- `required`
- `draft`
- `ready_for_review`
- `in_review`
- `changes_requested`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Launch approval status:

- `not_required_yet`
- `required`
- `draft`
- `ready_for_review`
- `in_review`
- `blocked`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Client categories:

- `business_acceptance`
- `content_acceptance`
- `brand_acceptance`
- `limitation_acceptance`
- `deferred_recommendation`
- `legal_or_compliance`
- `manual_note`
- `unknown_or_manual`

Launch categories:

- `content_ready`
- `client_ready`
- `domain_ready`
- `billing_ready`
- `rollback_ready`
- `qa_ready`
- `seo_ready`
- `accessibility_ready`
- `performance_ready`
- `limitation`
- `manual_note`
- `unknown_or_manual`

## Transition Contract Summary

- Content approval not approved blocks client approval.
- Content approval `approved` makes client approval required or launch approval required depending on policy.
- Content approval `approved_with_limitations` makes client/launch approval required with limitations carried forward.
- Client approval `rejected` or `changes_requested` blocks launch approval.
- Client approval `approved` allows launch approval to begin.
- Client approval `approved_with_limitations` allows launch approval to begin with limitations.
- Launch approval `approved` allows domain/billing/publish readiness work to proceed.
- Launch approval `approved_with_limitations` allows readiness work to proceed with limitations.
- Launch approval `rejected` or `blocked` blocks publish readiness.
- Launch approval `superseded` requires latest approval.
- Client approval does not publish.
- Launch approval does not publish or mutate active pointer.
- Launch approval does not equal domain readiness or billing readiness.
- Publish activation approval remains separate.

## Existing Surface Classification

- Client content APIs and content handlers: evidence input, not approval truth.
- Content override/publish/rollback routes: unsafe mutation surfaces for approval purposes.
- Agency content page and site workspace/preview/overview/settings pages: future UI candidates and evidence inputs, not truth.
- Client dashboard routes/components: future UI candidates, not single-site client approval truth.
- Runtime preview and preview-assets routes: evidence inputs only.
- Public runtime rendering: runtime/evidence input only, not approval truth.
- Admin candidate review routes: future UI candidate/historical review surface, not client/launch approval truth.
- Content approval service and AAF bridge: canonical content approval prerequisite, not client/launch truth.
- Single-site transition service launch approval ref check: future integration candidate; no workflow exists yet.
- DDOM readiness services/snapshots/docs: canonical domain readiness snapshot truth, not approval.
- Hosting operations read models and Command Center hosting pages: derived projections/future UI candidates, not approval truth.
- PASR/PTT source reader/evidence/shadow modules: publish activation readiness/shadow truth, not client/launch approval.
- Command Center publish shadow panel: derived projection.
- Ops Inbox publish shadow helper/shell: derived projection.
- Billing account/cost center/cost/pricing/margin services: billing/cost operating inputs, not launch approval.
- Stripe routes/webhook: external/billing mutation surfaces, not launch approval.
- Provider handoff readiness/review surfaces: unrelated/historical or future evidence input for provider domains.
- Archived founder docs and validation-shell pages: historical/unrelated.

## MVP Scope

Future implementation in scope:

- server-only client approval persistence/service;
- server-only launch approval persistence/service;
- AAF scope/contracts first;
- AAF bridge/evidence validation;
- read-model projection;
- exact ref validation;
- limitation carry-forward;
- no runtime mutation.

## Explicit Deferrals

- client portal UI;
- email approval links;
- Slack/Teams approval;
- billing activation;
- DNS/domain mutation;
- publish activation;
- automatic launch checklist;
- AI-generated approval decisions;
- public preview access control changes;
- Command Center action buttons;
- Ops Inbox resolution;
- runtime artifact/site version mutation;
- active pointer mutation;
- rollback execution.

## Architecture Warnings

- Do not collapse client approval into content approval.
- Do not let launch approval become publish approval.
- Do not mistake domain/billing readiness for launch approval.
- Do not treat preview rendering or public runtime rendering as approval truth.
- Do not let client portal UI become source truth.
- Do not accept approval refs without exact AAF validation.
- Do not drop limitations between content, client, launch, and publish stages.
- Do not allow publish paths to bypass launch approval where policy requires it.
- Do not use broad `client_review` or `launch_signoff` scopes as exact single-site truth without a migration/compatibility review.

## Whether Implementation May Begin

Implementation may begin only for the next narrow AAF scope/contracts milestone. Client approval persistence/service and launch approval persistence/service should wait until exact AAF scopes and evidence vocabulary exist.

## Recommended Next Milestone

Recommended next milestone: MVP-31 AAF scope/contracts for client and launch approval.

Recommended following milestones:

- MVP-32 client approval persistence/service core.
- MVP-33 launch approval persistence/service core.

## Validation Performed

- Confirmed all created docs exist and are readable.
- Confirmed canonical index references MVP-30 docs.
- Confirmed required sections are present across the architecture, workflow, and closeout docs.
- Confirmed content approval vs client approval boundary is explicit.
- Confirmed client approval vs launch approval boundary is explicit.
- Confirmed launch approval vs publish activation approval boundary is explicit.
- Confirmed domain/billing readiness vs launch approval boundary is explicit.
- Confirmed source-of-truth decision is explicit.
- Confirmed existing surface classification is present.
- Confirmed no TypeScript, JavaScript, SQL, migration, route, worker, runtime, provider, billing, domain, publish, rollback, UI, Command Center, Ops Inbox, client portal, or AI implementation files changed.
- `git diff --check` passed.
- Trailing whitespace check passed on all MVP-30 docs and the canonical index.

## Git Status Summary

`git status --short` shows only:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`;
- untracked `docs/architecture/gnr8-single-site-client-approval-architecture.md`;
- untracked `docs/architecture/gnr8-single-site-launch-approval-architecture.md`;
- untracked `docs/architecture/gnr8-single-site-client-launch-approval-source-of-truth.md`;
- untracked `docs/architecture/gnr8-single-site-client-launch-approval-transition-contract.md`;
- untracked `docs/architecture/gnr8-single-site-client-launch-approval-aaf-scope-design.md`;
- untracked `docs/product/gnr8-single-site-client-launch-approval-operator-workflow.md`;
- untracked `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`.

No runtime behavior changed. No implementation files were intentionally modified. No commit or push was performed.
