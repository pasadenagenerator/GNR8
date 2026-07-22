# GNR8 Bulk Migration Factory Closeout

BMF-1 closeout for Bulk Migration Factory design.

This is a documentation and architecture phase only. No runtime behavior, APIs, route handlers, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, Supabase Storage implementation, Vercel Blob implementation, thumbnail code, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution, or deployment configuration was intentionally changed.

## Documents Created Or Updated

Required BMF-1 outputs are present and updated as Markdown documentation:

- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`

Canonical index status:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` exists.
- It already contains a BMF-1 section referencing the five required BMF-1 documents.
- BMF-1 did not rewrite unrelated index content.

## MVP-1 Baseline Verification

Required MVP-1 baseline files exist, are readable, and are tracked:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

Targeted status at verification time showed all five MVP-1 files are tracked and modified in the working tree:

- `M docs/architecture/gnr8-mvp-operational-state-model.md`
- `M docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `M docs/product/gnr8-mvp-boundary-closeout.md`
- `M docs/product/gnr8-mvp-boundary.md`
- `M docs/product/gnr8-mvp-supported-site-classes.md`

BMF-1 treated these as pre-existing documentation changes and did not edit them.

## Implementation Evidence Reviewed

Read-only evidence reviewed for BMF-1:

- Scoped import route: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- Scoped import pipeline: `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- Static import: `apps/platform/gnr8/import/runtime/import-static-site.ts`, `apps/platform/gnr8/import/**`
- Multi-page import: `apps/platform/gnr8/multipage-import/core/discover-multipage-import-tree.ts`, `apps/platform/gnr8/multipage-import/**`
- Migration pipeline models: `apps/platform/gnr8/migration/**`
- Migration job/batch/stage store and executor: `apps/platform/gnr8/migration-factory/**`
- Runtime artifact store and raw-template artifacts: `apps/platform/gnr8/runtime/runtime-store.ts`
- Runtime readiness, preview smoke, preview asset paths: `apps/platform/gnr8/runtime/readiness/**`, `apps/platform/gnr8/runtime/preview-smoke/**`, `apps/platform/app/api/gnr8/runtime/preview-assets/**`
- Command Center migration and hosting pages/read models: `apps/platform/app/gnr8/command-center/**`, `apps/platform/gnr8/command-center/**`
- Hosting operations pages/readiness: `apps/platform/gnr8/runtime/hosting-operations/**`
- Publish activation safety: `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, `apps/platform/gnr8/runtime/publish-activation-guard.ts`, `apps/platform/gnr8/runtime/publish-safety-check.ts`
- Rollback primitive: `apps/platform/gnr8/runtime/rollback-switch.ts`
- Cost event logging: `apps/platform/gnr8/billing/**`
- Audit/event foundation: `packages/core/src/modules/audit-log/**`
- Provider/DNS boundaries: `apps/platform/gnr8/runtime/dns/**`, `apps/platform/gnr8/runtime/domains/**`, `apps/platform/gnr8/runtime/providers/openprovider/**`, `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- Asset/storage evidence: preview asset routes, raw-template artifact file maps, byte sizes, hashes, media types, Supabase Storage/filesystem references surfaced by repository search.
- ADRs: `docs/ai/decisions/ADR-001-deterministic-pipeline.md`, `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

## Final Factory Design Summary

The Bulk Migration Factory is the canonical MVP architecture for migrating approximately 200 existing static or mostly static public websites through an operator-assisted workflow. It accepts bulk intake, validates and classifies sites, prepares non-destructive dry-runs, creates approved batches, executes jobs sequentially by default, pauses/resumes safely, supports governed retry/replay, handles failures through a taxonomy, exposes work in Command Center and Ops Inbox, records audit evidence, and preserves MVP-1 source-of-truth boundaries.

It does not claim autonomous migration, autonomous AI execution, live DNS/registrar mutation, provider execution, autonomous regeneration, full Stripe billing, or storage migration as MVP behavior.

## Batch Lifecycle Summary

The canonical batch states are:

- `draft`
- `intake_validating`
- `ready`
- `dry_run_running`
- `dry_run_completed`
- `dry_run_failed`
- `approval_pending`
- `running`
- `paused`
- `partially_failed`
- `failed`
- `completed`
- `cancelled`
- `archived`

Each state defines meaning, allowed/prohibited transitions, required evidence, operator action, approval requirement, audit event, source-of-truth owner, Command Center representation, Ops Inbox representation, and recovery behavior.

Recommended MVP batch size is 10 to 25 sites, with a design warning above 50 sites. A 200-site portfolio should run as multiple batches/cohorts.

## Site Item Lifecycle Summary

The canonical site item states are:

- `candidate`
- `classified`
- `blocked`
- `queued`
- `running`
- `completed`
- `completed_with_warnings`
- `failed`
- `review_required`
- `approved_for_launch`
- `deferred`
- `cancelled`

Each state defines transition rules, evidence, approval/audit requirements, source-of-truth owner, Command Center/Ops Inbox representation, and recovery behavior.

## Failure And Recovery Summary

The recovery doc defines canonical codes, severity, site/batch impact, stop/continue/pause behavior, retry eligibility, replay eligibility, evidence, operator action, approvals, audit event, Ops Inbox item, recovery path, and escalation owner for:

- invalid intake;
- duplicate site/client mapping;
- unsupported site class;
- source unreachable;
- source changed during migration;
- rendered capture failure;
- static import failure;
- multi-page discovery failure;
- missing critical assets;
- degraded visual fidelity;
- broken routes/navigation;
- form behavior unresolved;
- widget/third-party script unresolved;
- heavy JavaScript unsupported;
- preview smoke failure;
- runtime artifact integrity failure;
- content override conflict;
- approval missing/rejected;
- domain readiness failure;
- publish readiness failure;
- publish activation failure;
- rollback required;
- cost anomaly;
- storage/object persistence failure;
- audit event persistence failure;
- worker/process interruption;
- unknown system error.

## Retry And Replay Policy Summary

Replay classes:

- fully deterministic replay;
- deterministic replay with external input refs;
- replay with environmental variance;
- manual retry only;
- not replayable;
- forbidden replay.

Explicit rules:

- Human approvals are not replayed.
- Publish activation is not blindly replayed.
- Rollback is a recovery action, not deterministic replay.
- External DNS/provider checks may be repeated but not replayed as proof of past truth.
- AI/provider outputs may be re-run only as new advisory bundles and must not overwrite previous bundles.

## Operator Workflow Summary

The operator workflow covers:

- migration preparation;
- CSV/manual/API intake expectations;
- validation feedback;
- site class review;
- dry-run review;
- batch approval;
- batch execution;
- failure triage;
- retry/replay request;
- preview review;
- content correction handoff;
- domain readiness handoff;
- publish readiness handoff;
- incident/rollback handoff;
- cost anomaly handling;
- batch closeout;
- reporting summary.

Each workflow step defines operator goal, required input, system output, possible blockers, approval requirement, audit requirement, Command Center view, and Ops Inbox item if blocked.

## Required Intake Fields

BMF-1 requires:

- `agencyId` or agency reference;
- `clientId` or client reference;
- `siteName`;
- `sourceUrl`;
- `intendedDomain`;
- `currentPlatformIfKnown`;
- `siteClassIfKnown`;
- `priority`;
- `ownerOperator`;
- `launchRequirement`;
- `notes`;
- `knownFormsFlag`;
- `knownWidgetsFlag`;
- `knownBookingFlag`;
- `knownCommerceFlag`;
- `knownAuthFlag`;
- `knownPaymentFlag`;
- `knownBackendFlag`;
- `knownComplianceFlag`;
- `redirectSeoComplexityFlag`;
- `multilingualFlag`;
- `expectedPageCountOrRouteEstimate`;
- `externalWorkflowReference`.

CSV/manual intake are required MVP paths. API intake is design-ready only and must not bypass validation, classification, approval, audit, or source-of-truth boundaries.

## Source-Of-Truth Conclusions

Supabase/Postgres remains canonical for metadata, ownership, intake, batches, jobs, stages, attempts, approvals, audit, incidents/recovery, cost events, runtime versions/artifacts metadata, active pointers, content overrides, and lifecycle state.

Command Center, Ops Inbox, previews, thumbnails, Website Understanding, Source Content and Visual Continuity, Knowledge Workspace, Evolution, Generated Proposal Bundles, AI/provider outputs, provider payloads, billing dashboards, and external workflow snapshots remain projections or review artifacts.

External systems remain authoritative for their own records: DNS registrars/providers, Vercel, Stripe, CMSs, booking/commerce/auth systems, and external workflow tools.

## Command Center Requirements

Command Center must show batch list/detail, batch lifecycle state, dry-run summary, approval evidence, execution policy, progress, timeline, failure groups, recovery records, pause reason, site class distribution, import state, preview readiness, review blockers, approval state, domain readiness, publish readiness, incidents, cost indicators, owner assignment, next required action, role-gated retry/replay controls, and runbook/drilldown links.

Specialized pages remain drilldowns. Command Center is not source of truth.

## Ops Inbox Requirements

Ops Inbox is derived from canonical state and must include blocker items for intake, duplicates, unsupported class, dry-run failure, approval needed, import failure, capture degradation, route review, preview failure, review, domain action, DNS verification failure, publish readiness failure, publish failure, rollback needed, incident open, cost anomaly, and missing recovery evidence.

Completing an Ops Inbox item requires a canonical state transition or audited decision.

## Approval Requirements

Approval is required for batch start, high/critical resume/continue, retry/replay, dry-run waiver, unsupported or degraded launch exceptions, content publish readiness, client/launch signoff, domain action/exception, publish activation, rollback, cost exception, cancellation in critical/cross-client situations, and batch closeout after critical incidents.

No approval may be inferred from dry-run, preview availability, thumbnail existence, AI/provider output, Generated Proposal Bundle existence, or a UI badge.

## Audit And Replay Requirements

Audit events must include actor, subject, action, payload, evidence refs, correlation ids, timestamp, human/system origin, and lifecycle impact. Retry/replay events must identify the failed stage/action, replay class, immutable input refs, downstream reset behavior, attempt count, output refs, and verification result.

## Cost-Control Requirements

BMF cost control must support batch estimates, stage/site cost refs, retry/replay cost accumulation, thresholds, anomaly detection, pause rules, and superadmin/agency-owner exception approvals. Cost visibility is internal operating evidence, not full Stripe/customer billing.

## Asset/Storage Boundary Conclusions

Supabase must remain canonical for control-plane metadata and source-of-truth records. Data-size-heavy webpage assets should be treated as data-plane artifacts. Repository evidence includes Supabase Storage and/or filesystem paths for preview/template/branding assets, preview asset routes, and raw-template artifact file maps with byte sizes, hashes, and media types.

Future object storage, including Vercel Blob or equivalent, should be evaluated for imported website assets, preview bundles, thumbnails, screenshots, exported bundles, and generated proposal assets. BMF-1 does not implement storage migration. BMF depends on asset references, byte sizes, hashes, content types, retention policy, and replayability metadata.

## Explicit Deferrals

- Bulk Migration Factory implementation.
- Command Center and Ops Inbox implementation.
- Queue workers, leases, heartbeats, schedulers, concurrency, batch runners beyond current evidence.
- Runtime/API/schema/migration/database/worker/provider/billing/DNS/publish/rollback/storage changes.
- Supabase Storage changes, Vercel Blob implementation, or asset storage migration.
- Live DNS/registrar mutation and Openprovider live mutation.
- Full Stripe/customer billing.
- Autonomous migration, autonomous AI execution, autonomous regeneration.
- Commerce/auth/payment/custom-backend/compliance-heavy migration as normal MVP launch scope.
- Workspace, Evolution, Generated Proposal Bundle, thumbnail, AI, provider payload, or billing dashboard source-of-truth changes.

## Architecture Warnings

- Approval persistence and audit taxonomy must be unified before implementation uses BMF gates as write paths.
- Current batch/job implementation is narrower than BMF-1 and should not be marketed as the completed factory.
- Current execution evidence is operator-triggered and sequential; unattended orchestration is not implemented.
- Side-effect stages cannot be replayed blindly.
- Source capture and domain/provider checks can vary and must not be treated as deterministic proof of past truth.
- Unsupported site classes can derail a 200-site wave unless filtered early.
- Asset volume may pressure current storage paths; storage design must remain architecture-only until separately approved.
- Command Center/Ops Inbox must not become independent truth stores.

## Recommended Next Milestone

Recommended next milestone: Command Center and Ops Inbox Design.

Yes, Command Center and Ops Inbox Design should be next. BMF-1 defines lifecycle semantics, blockers, work items, approval gates, and recovery rules; the next design should map those semantics into read models, role-gated controls, drilldowns, and operator UX before implementation.

Do not proceed into Bulk Migration Factory implementation, Domain/DNS Operating Model Decision, Audit/Replay/Failure Recovery implementation, asset storage migration, billing, DNS, provider, publishing, AI, Workspace, Evolution, thumbnail, or Generated Proposal Bundle work until architectural review approves the next milestone.

## Validation Performed

BMF-1 validation performed:

- Confirmed all required BMF-1 files exist.
- Confirmed required BMF-1 and MVP-1 files are readable.
- Confirmed MVP-1 files are tracked and currently modified in the working tree.
- Confirmed `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` exists and references BMF-1 docs.
- Confirmed batch lifecycle includes all required states.
- Confirmed site item lifecycle includes all required states.
- Confirmed failure/recovery doc includes all required failure categories.
- Confirmed operator workflow includes all required intake fields.
- Confirmed source-of-truth boundaries remain aligned with MVP-1.
- Confirmed asset/storage boundary is documented as architecture only.
- Confirmed BMF-1 does not claim implementation.
- Confirmed BMF-1 does not claim autonomous migration, live DNS/registrar mutation, full Stripe billing, autonomous AI execution, or autonomous regeneration as MVP behavior.
- Ran git status checks and documentation/readability searches.
- Ran `git diff --check` against the five BMF-1 docs; it reported no whitespace errors.
- Searched known package/workspace files for a lightweight Markdown checker; none was found, and no new tooling was introduced.

## Commands Run

Representative commands run:

- `rg --files docs/product docs/architecture docs/ai`
- `git status --short -- <required MVP-1 docs>`
- `git ls-files -- <required MVP-1/BMF-1/index docs>`
- `sed -n ... <required MVP-1 docs>`
- `sed -n ... <BMF-1 docs>`
- `rg --files <representative implementation paths>`
- `sed -n ... <representative implementation files>`
- `rg -n <storage/readiness/domain/audit/cost/publish patterns>`
- `wc -l <BMF-1 docs and index>`
- validation `rg` searches for required states, failure categories, intake fields, and forbidden MVP claims.
- `git status --short`
- `git diff --name-only`
- `git diff --name-only -- ':!docs/**/*.md' ':!docs/**/*.MD'`
- `git diff --check -- <BMF-1 docs>`

## Confirmation

BMF-1 changed Markdown documentation only. No runtime behavior was changed.
