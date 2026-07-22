# GNR8 Audit And Approval Foundation Closeout

AAF-1 is complete as a documentation and architecture phase. No runtime behavior, APIs, route handlers, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, thumbnail code, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution code, or deployment configuration was intentionally changed.

## Documents Created Or Updated

AAF-1 created:

- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/product/gnr8-audit-approval-operator-workflow.md`
- `docs/product/gnr8-audit-approval-foundation-closeout.md`

AAF-1 also updates `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` only to reference the new AAF-1 documents when the index is present and current.

## MVP-1 Verification Status

Verified present and readable:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

MVP-1 remains aligned: GNR8 MVP is operator-assisted migration and operation of static or mostly static public websites; runtime truth is active pointer, site version, runtime artifact, and published overrides; derived surfaces are not truth; autonomous migration, autonomous AI execution, live DNS/registrar mutation, full Stripe billing, autonomous regeneration, and storage migration are not claimed as MVP behavior.

Current repo status before AAF-1 showed these MVP-1 files already modified.

## BMF-1 Verification Status

Verified present and readable:

- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`

BMF-1 semantics are preserved: dry-run is evidence, not approval; batch start is approval-gated; retry/replay require explicit input refs and replay class; human approvals are not replayed; publish activation and rollback are separate side effects, not deterministic batch replay.

Current repo status before AAF-1 showed these BMF-1 files already modified.

## CCO-1 Verification Status

Verified present and readable:

- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-operator-workbench.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`

CCO-1 semantics are preserved: Command Center is the primary operator workbench; Ops Inbox is derived-only; actions require source-of-truth state, role permission, approval requirements, audit requirements, evidence refs, and freshness policy; UI badges, projections, and work items are not approval truth.

Current repo status before AAF-1 showed these CCO-1 files present but untracked.

## Current Implementation Evidence Reviewed

Read-only evidence was inspected across:

- generic audit/activity modules: `packages/core/src/modules/audit-log/**`;
- auth/RBAC/action authorization: `apps/platform/src/auth/**`;
- migration job/stage/batch stores, events, executor, replay primitives: `apps/platform/gnr8/migration-factory/**`;
- admin migration batch/job APIs: `apps/platform/app/api/gnr8/admin/migration-batches/**`, `apps/platform/app/api/gnr8/admin/migration-jobs/**`;
- Command Center bulk action patterns: `apps/platform/gnr8/command-center/bulk-migration-actions.ts`;
- publish activation primitives and safety checks: `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, `publish-activation-guard.ts`, `publish-safety-check.ts`, publish route;
- rollback primitives and route: `apps/platform/gnr8/runtime/rollback-switch.ts`, rollback route;
- client content override, history, publish, and rollback routes;
- runtime domain/DNS readiness and provider execution gates: `apps/platform/gnr8/runtime/domains/**`, `apps/platform/gnr8/runtime/dns/**`;
- runtime provider approval/handoff/governance artifacts: `apps/platform/gnr8/runtime/providers/**`;
- billing and cost event models: `apps/platform/gnr8/billing/**`, `packages/core/src/modules/billing/**`;
- Supabase migrations for site actions/publish events, content history, domain bindings/DNS instructions, provider approvals/handoffs/reviews/governance, cost events, migration jobs/batches/events, runtime artifacts, organizations;
- ADRs: `docs/ai/decisions/ADR-001-deterministic-pipeline.md`, `docs/ai/decisions/ADR-003-runtime-artifact-model.md`.

Evidence conclusion: the repository has partial foundations, but not a unified MVP approval persistence model, audit event taxonomy, or evidence package contract.

## Final Audit/Approval Foundation Summary

AAF-1 defines approval as a scoped human decision record and audit as append-only evidence of action/decision context. Evidence packages are immutable snapshots or append-only refs with freshness labels, watermarks, limitations, and canonical source refs.

The foundation separates launch signoff, content publish, domain action, domain exception, publish activation, rollback, retry/replay, cost exception, incident recovery, external reference acceptance, and AI advisory acceptance.

## Approval Persistence Model Summary

The model defines conceptual approval request, decision, evidence package, scope, policy, subject, actor, approver role, status, expiration, supersession, revocation, exception, and audit ref objects.

Required statuses are defined: `requested`, `granted`, `rejected`, `revoked`, `expired`, `superseded`, `cancelled`, `not_required_by_policy`.

## Approval Scopes Defined

AAF-1 defines these approval scopes:

`batch_start`, `batch_resume`, `dry_run_waiver`, `retry_request`, `replay_request`, `unsupported_site_exception`, `degraded_capture_exception`, `route_coverage_exception`, `form_widget_booking_exception`, `content_publish`, `client_review`, `launch_signoff`, `domain_action`, `domain_exception`, `publish_activation`, `rollback`, `cost_exception`, `incident_recovery`, `external_workflow_reference_acceptance`, `ai_advisory_plan_acceptance`.

Each scope includes purpose, subject type, required approver role, evidence package, expiration rule, revocation/supersession triggers, audit event, action enabled, action not enabled, Command Center visibility, Ops Inbox effect, and implementation risk.

## Audit Event Taxonomy Summary

AAF-1 defines event families for identity/auth/scope, intake, classification, dry-run, batch lifecycle, job/stage lifecycle, retry/replay, import/capture/artifact, preview/readiness, review/content, approval, domain/DNS, publish, rollback, incident/recovery, cost, asset/storage evidence, external workflow reference, AI advisory, admin/superadmin exception, and system failure/audit failure.

The taxonomy defines minimum payload fields, actor/subject/correlation requirements, severity, replay class, evidence refs, retention importance, redaction/privacy classification, and audit rules.

## Evidence Package Contract Summary

AAF-1 defines evidence packages for batch start, dry-run waiver, retry/replay, unsupported/degraded exceptions, launch signoff, content publish, domain action, domain exception, publish activation, rollback, cost exception, incident recovery, external workflow references, and AI advisory review.

Evidence packages cite canonical refs, freshness labels, source watermarks, limitations, approver view requirements, stale/supersession triggers, and audit events.

## Operator Workflow Summary

AAF-1 defines operator workflows for approval request creation, evidence review, granting, rejection, revocation, expiration, supersession, batch start, dry-run waiver, retry/replay, unsupported/degraded exceptions, client review/launch signoff, content publish, domain action, publish activation, rollback, cost exception, incident recovery, external workflow reference acceptance, AI advisory acceptance, audit timeline review, audit gap handling, and emergency compensating audit.

## Source-Of-Truth Conclusions

Approval truth must be future append-only approval records. Audit truth must be append-only audit events or explicitly labeled federated event refs. Command Center, Ops Inbox, previews, thumbnails, WU/VCU, Workspace, Evolution, Generated Proposal Bundles, AI outputs, provider payloads, billing dashboards, and external workflow snapshots remain non-authoritative.

## Role/Scope/Action Boundary Conclusions

Every privileged action must derive from actor role, actor scope, subject scope, approval scope, action class, evidence freshness, policy version, audit availability, and idempotency/correlation requirements.

## Approval Scope Conclusions

No approval may enable an action outside its explicit scope. Launch approval does not equal publish activation approval. Domain readiness approval does not equal DNS mutation approval. Client review approval does not equal technical publish approval. AI plan acceptance does not equal execution approval.

## Audit/Replay Conclusions

Human approvals are not replayed. Publish activation is not deterministic replay. Rollback is incident/recovery action, not deterministic replay. External checks may be repeated as new checks, not replayed as historical truth.

## Domain/Publish/Rollback Conclusions

Domain action, domain exception, publish activation, and rollback each require separate evidence and approval boundaries. MVP does not claim live registrar/DNS mutation, Openprovider live mutation, or autonomous publish/rollback behavior.

## Cost Exception Conclusions

Cost exceptions govern internal operating cost events, thresholds, estimates, and anomalies. They are not full Stripe/customer billing truth and do not authorize publish or retry/replay unless separately scoped.

## External Workflow Conclusions

External workflow refs can be accepted as evidence only. External systems remain authoritative for their own records and do not become GNR8 approval truth.

## AI Advisory Conclusions

AI/provider outputs are advisory evidence only. They cannot approve, mutate MVP state, publish, rollback, change DNS/domain/provider state, bill, retry/replay, close Ops Inbox items, or execute autonomously.

## Explicit Deferrals

- Approval persistence implementation.
- Audit event store implementation.
- Database schemas/migrations.
- Command Center and Ops Inbox action implementation.
- Bulk Migration Factory execution implementation.
- Domain/DNS Operating Model Decision and implementation.
- Publish/rollback workflow implementation.
- Cost exception implementation.
- External workflow connector mutation.
- AI-assisted execution/autonomous migration/autonomous regeneration.
- Asset storage migration, thumbnails, Workspace, Evolution, Generated Proposal Bundle runtime, deployment configuration.

## Architecture Warnings

- Existing provider approval artifacts are useful but not a universal GNR8 approval model.
- Existing migration job/batch events are useful but narrower than the required audit taxonomy.
- Existing publish/rollback primitives must not be exposed as final governed workflows without approval/audit/evidence gates.
- Existing Command Center bulk actions are too coarse for final scoped approval boundaries.
- Audit write failure must fail closed for privileged actions except explicit emergency compensation.

## Recommended Next Milestone

Domain/DNS Operating Model Decision should be next after architectural review of AAF-1.

Reason: MVP-1, BMF-1, CCO-1, and AAF-1 now define the migration, operator workbench, approval, audit, and evidence boundaries required before deciding the exact domain/DNS operating model. The domain/DNS decision can now build on explicit approval scopes, audit events, evidence packages, stale-status rules, and live-mutation deferrals.

Do not proceed into Domain/DNS implementation until AAF-1 is reviewed.

## Validation Performed

AAF-1 validation confirmed:

- all required AAF-1 files exist and are readable;
- changed/untracked files reported by `git status --short` are Markdown documentation only;
- no runtime code, APIs, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, thumbnail code, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution code, or deployment configuration were modified by AAF-1;
- AAF-1 does not claim implementation;
- approval model includes all required statuses and all required approval scopes;
- audit taxonomy includes all required event families;
- evidence package contract includes all required package types;
- operator workflow includes all required workflows;
- MVP-1 source-of-truth boundaries remain aligned;
- BMF-1 retry/replay semantics are preserved;
- CCO-1 action gating semantics are preserved;
- no autonomous migration, live DNS/registrar mutation, full Stripe billing, autonomous AI execution, autonomous regeneration, or storage migration is claimed as MVP behavior;
- `git diff --check` passed for the AAF-1 Markdown files and canonical index update;
- no configured Markdown linter/readability command was found in the repository scan, so no new tooling was introduced.

## Commands Run

Commands used during AAF-1 included:

- `git status --short`
- `git ls-files --error-unmatch ...`
- `rg --files ...`
- `rg -n ...`
- `sed -n ...`
- `git diff --check -- docs/architecture/gnr8-audit-approval-foundation-design.md docs/architecture/gnr8-approval-persistence-model.md docs/architecture/gnr8-audit-event-taxonomy.md docs/architecture/gnr8-evidence-package-contract.md docs/product/gnr8-audit-approval-operator-workflow.md docs/product/gnr8-audit-approval-foundation-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- validation `rg` checks for required statuses, approval scopes, audit event families, evidence package types, operator workflows, documentation-only assertions, and forbidden MVP claims.

## Confirmation

AAF-1 is documentation and architecture only. No runtime behavior was changed.
