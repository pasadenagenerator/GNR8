# GNR8 Command Center And Ops Inbox Closeout

CCO-1 closeout for Command Center and Ops Inbox design.

This was a documentation and architecture phase only. No runtime behavior, APIs, route handlers, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, thumbnail code, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution, or deployment configuration was intentionally changed.

## Documents Created Or Updated

Created:

- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-operator-workbench.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` with a CCO-1 section referencing the five required CCO-1 documents.

## MVP-1 Verification Status

Required MVP-1 files were present, readable, tracked, and modified in the working tree before CCO-1 documentation work:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

CCO-1 preserved MVP-1 conclusions: GNR8 MVP is operator-assisted migration and operation of static or mostly static public websites; runtime truth is active pointer, site version, runtime artifact, and published overrides; derived surfaces are not production truth.

## BMF-1 Verification Status

Required BMF-1 files were present, readable, tracked, and modified in the working tree before CCO-1 documentation work:

- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`

CCO-1 preserved BMF-1 semantics: dry-run is evidence, not approval; batch start is approval-gated; retry/replay classes are explicit; publish activation and rollback are separate side effects; Ops Inbox is derived from canonical state.

## Current Command Center Implementation Evidence Reviewed

Read-only evidence reviewed:

- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/gnr8/command-center/sites/page.tsx`
- `apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`
- `apps/platform/app/gnr8/command-center/_lib/command-center-view-model.ts`
- `apps/platform/gnr8/command-center/command-center-read-model.ts`
- `apps/platform/gnr8/command-center/bulk-migration-actions.ts`
- `apps/platform/app/gnr8/command-center/migration-batches/**`
- `apps/platform/app/api/gnr8/admin/migration-batches/**`
- `apps/platform/app/api/gnr8/admin/migration-jobs/**`
- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/app/gnr8/command-center/hosting/**`
- `apps/platform/gnr8/runtime/hosting-operations/**`
- `apps/platform/gnr8/runtime/readiness/**`
- `apps/platform/gnr8/runtime/preview-smoke/**`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/billing/**`
- `packages/core/src/modules/audit-log/**`
- `apps/platform/src/auth/**`
- `apps/platform/app/api/gnr8/clients/**`
- `apps/platform/app/gnr8/admin/**`
- `apps/platform/app/gnr8/admin/workspace/**`
- `apps/platform/app/gnr8/admin/evolution/**`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

## Final Command Center Design Summary

Command Center is the primary MVP operator workbench. It owns daily operator navigation and representation of portfolio, wave, batch, site, Ops Inbox, evidence, audit, cost, domain, readiness, publish, rollback, and incident state.

Command Center is not source of truth. It must derive displayed state from canonical sources or documented projections and label stale/partial reads. It may present actions only when source-of-truth state, role permission, approval requirements, audit requirements, evidence refs, and freshness requirements are clear.

## Final Ops Inbox Design Summary

Ops Inbox is a derived exception/action queue from canonical state. It has stable work item keys, severity, owner role, lifecycle, dedupe, grouping, sorting, stale-item, completion, dismissal, escalation, audit, drilldown, action, and external-reference rules.

Ops Inbox items cannot be manually closed unless the underlying canonical state changes or an audited decision records why the work is no longer required.

## Read Model Contract Summary

The read model contract covers:

- portfolio summary;
- agency/client/site scope;
- migration wave summary;
- batch list and detail;
- site item list and site operational state;
- site class and launch eligibility;
- intake validation;
- dry-run;
- import/job/stage state;
- failure groups;
- retry/replay eligibility;
- preview readiness;
- review blockers;
- content correction;
- approval status;
- domain readiness;
- DNS instruction freshness;
- Vercel/domain check status;
- publish readiness;
- rollback readiness;
- incident/recovery;
- cost estimates/events/anomalies;
- asset/storage evidence health;
- audit timeline refs;
- external workflow refs;
- next required action;
- allowed actions;
- prohibited actions with reason.

Each section defines purpose, canonical sources, derived fields, freshness, stale indicator, evidence refs, operator summary, drilldowns, role visibility, action dependencies, audit dependencies, and failure/empty-state behavior.

## Operator Workflow Summary

The product workflow covers:

- daily operator workflow;
- migration wave monitoring;
- batch planning;
- dry-run review;
- batch approval;
- batch execution monitoring;
- failure triage;
- retry/replay;
- preview/review;
- content correction;
- domain readiness;
- publish readiness;
- incident/rollback;
- cost anomaly;
- batch closeout;
- reporting;
- external workflow follow-up;
- future AI advisory review.

## Operator Surfaces Defined

Defined surfaces:

- portfolio overview;
- migration wave overview;
- batch list;
- batch detail;
- site list;
- site detail drawer/page;
- Ops Inbox list;
- Ops Inbox item detail;
- evidence package view;
- audit timeline view;
- failure group view;
- cost/anomaly view;
- domain readiness view;
- publish readiness view;
- incident/recovery view;
- external reference view.

## Work Item Types Defined

Ops Inbox work item types:

- `intake_blocked`
- `duplicate_detected`
- `unsupported_site_class`
- `dry_run_failed`
- `batch_start_approval_needed`
- `batch_paused`
- `batch_failed`
- `import_failed`
- `capture_degraded`
- `route_review_needed`
- `preview_failed`
- `review_needed`
- `content_change_requested`
- `approval_needed`
- `domain_action_needed`
- `dns_verification_failed`
- `publish_readiness_failed`
- `publish_failed`
- `rollback_needed`
- `incident_open`
- `cost_anomaly`
- `recovery_evidence_needed`
- `external_workflow_update`
- `ai_plan_review`

## Source-Of-Truth Conclusions

Runtime truth remains active pointer, site version, runtime artifact, and published override state.

Command Center read models, Ops Inbox items, previews, thumbnails, Website Understanding, Source Content and Visual Continuity, Knowledge Workspace, Evolution, Generated Proposal Bundles, AI outputs, provider payloads, billing dashboards, and external workflow snapshots remain non-authoritative.

External systems remain authoritative for their own records unless a later approved architecture decision adopts that domain.

## Role And Action Boundary Conclusions

Actions must be derived from canonical source state, actor role/scope, approval requirement, audit requirement, evidence refs, and freshness policy. Disabled actions must show prohibited reasons.

Existing Command Center bulk import/approve/publish evidence is useful but too coarse for the final CCO-1 action boundary. Later implementation must tighten these controls rather than expanding them as-is.

## Approval Boundary Conclusions

Approval is required for batch start, dry-run waiver, retry/replay, high/critical resume, unsupported/degraded exceptions, launch/content/client signoff, domain actions/exceptions, publish activation, rollback, cost exceptions, and critical closeout decisions.

Approval cannot be inferred from dry-run, preview availability, readiness badges, thumbnails, AI/provider outputs, Generated Proposal Bundles, Command Center state, Ops Inbox items, or external workflow snapshots.

## Audit And Replay Boundary Conclusions

Audit is required for state-changing, privileged, approval, retry/replay, publish, rollback, domain, incident, cost, external reference, and AI advisory review actions.

Replay classes remain: fully deterministic, deterministic with external input refs, environmental variance, manual retry only, not replayable, and forbidden replay. Human approvals, publish activation, rollback, external workflow truth, cost exceptions, live DNS/provider/billing mutation, autonomous AI, and regeneration are not deterministic replay.

## Domain, Publish, And Rollback Visibility Conclusions

Domain/DNS visibility is limited to GNR8 binding state, DNS instruction snapshots, Vercel/check snapshots, owner/action evidence, freshness, and diagnostics. CCO-1 does not claim live registrar/DNS mutation or Openprovider live mutation.

Publish readiness is a projection. Publish activation is a separate approval-gated side effect. Rollback is incident/recovery action, not deterministic replay.

## Cost Visibility Conclusions

Cost visibility is internal operating evidence from AI/runtime/migration events, estimates, completeness flags, thresholds, anomalies, and exception approvals. It is not full Stripe/customer billing.

## Asset/Storage Visibility Conclusions

Asset/storage visibility exposes artifact refs, file maps, persisted/external fallback counts, hashes/sizes/content types where available, capture refs, missing asset diagnostics, and replayability evidence. CCO-1 does not implement storage migration, Vercel Blob, or Supabase Storage changes.

## External Workflow Visibility Conclusions

External workflow references are links/snapshots/follow-up signals only. External systems remain authoritative. A GNR8 approval/action still requires GNR8 source state, evidence, approval, and audit.

## Explicit Deferrals

- Command Center implementation.
- Ops Inbox implementation.
- Read model materialization.
- Approval persistence.
- Unified audit taxonomy implementation.
- Incident/recovery persistence.
- Domain/DNS operating model implementation.
- Bulk Migration Factory implementation.
- Queue workers, leases, heartbeats, schedulers, autonomous migration.
- Runtime/API/schema/migration/database/worker/provider/billing/DNS/publish/rollback/storage changes.
- Live registrar/DNS mutation, Openprovider live mutation.
- Full Stripe/customer billing.
- Autonomous AI execution and autonomous regeneration.
- Workspace, Evolution, thumbnails, Generated Proposal Bundles, provider payload, and AI runtime changes.

## Architecture Warnings

- Approval persistence and audit taxonomy should be designed before implementing Command Center/Ops Inbox actions.
- Existing read models are partial and must not be treated as complete operational truth.
- Stale domain/DNS/Vercel/cost/external signals can mislead launch decisions unless clearly labeled.
- Coarse statuses like `PREVIEW_READY`, `APPROVED`, or `LIVE` are insufficient for action authorization.
- Ops Inbox must not become a separate task truth store.
- Specialized admin/workspace/evolution/provider pages should remain drilldowns unless later adopted by ADR/design.

## Recommended Next Milestone

Audit/Approval foundation design should come before the Domain/DNS Operating Model Decision.

Reason: CCO-1 makes approval and audit prerequisites for publish, rollback, domain actions, retry/replay, batch start/resume, cost exceptions, and Ops Inbox completion. Domain/DNS needs a stale-status and manual evidence model, but implementing or even finalizing domain action boundaries depends on knowing how approvals and audit decisions are persisted and cited.

After Audit/Approval foundation design, the Domain/DNS Operating Model Decision should follow.

## Validation Performed

Documentation validation for CCO-1 should confirm:

- all five required CCO-1 files exist and are readable;
- canonical index references CCO-1 if updated;
- changes are Markdown-only;
- no runtime behavior was changed;
- Command Center is primary operator workbench;
- Ops Inbox is derived-only and not source of truth;
- read model contract covers required sections;
- Ops Inbox model covers required work item types;
- operator workbench covers required workflows and surfaces;
- action boundaries require source-of-truth, permission, approval, and audit clarity;
- MVP-1 and BMF-1 boundaries remain intact;
- forbidden MVP claims are not introduced;
- `git diff --check` passes for CCO-1 Markdown files.

## Commands Run

Commands used during CCO-1:

- `pwd`
- `git status --short ...`
- `ls -l ...`
- `git ls-files --stage ...`
- `rg --files ...`
- `sed -n ...` over MVP-1, BMF-1, canonical index, Command Center, migration batch/job, hosting/readiness, publish/rollback, billing, audit, auth/RBAC, client/content, Workspace/Evolution, and ADR files
- validation commands recorded in final report

## Confirmation

CCO-1 is documentation-only. No runtime behavior was changed.
