# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## A) Current Project State

GNR8 is currently in provider/DNS control-plane hardening and migration/preview validation mode.
The active emphasis is deterministic contracts, approval/handoff safety, and no hidden execution.
Openprovider Domain Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only inventory, execution still blocked).
Openprovider DNS Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only DNS inventory, execution still blocked).
Openprovider DNS Records Read-only Connector milestone is complete and verified (sandbox auth + read-only DNS inventory, execution still blocked).
Provider handoff readiness with Execution Job Shape Preview / Planned Job Materialization Contract milestone is complete and testable end-to-end from deployed UI (seed + inspection surfaces), and execution remains explicitly blocked.
The deployed dev-seed governance loop is manually verified end-to-end including governance decision package surfaces (still control-plane only).
Provider Execution Contract Envelope / Worker Payload Contract Preview milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Provider Execution Safety Manifest / No-Execution Boundary Proof milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Evidence Surface Consolidation / Operator Cockpit Layout Pass milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Cockpit Evidence Status Badges / Severity System milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Evidence Provenance Layer milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).

Current snapshot sources:
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Read `docs/ai/GNR8_COLLABORATION_PROTOCOL.md` before generating Codex tasks.

## C) Rules

- Slovenian conversation.
- English Codex tasks.
- step-by-step work.
- deterministic contracts.
- no hidden execution.
- no autonomous live execution.

## D) Current Architecture Status

- Architectural baseline remains modular monolith + service-layer discipline (`SYSTEM.md`, `architecture.md`).
- GNR8 runtime/control-plane work lives primarily under `apps/platform/gnr8/runtime/**`.
- Migration/import/validation subsystems are active and contract-driven (`apps/platform/gnr8/migration/**`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/validation/**`).

## E) Current Provider-Control-Plane Status

Implemented control-plane layers include provider settings, credential references contract, provider selection/communicator, job planner/repository foundation, approval artifacts/transitions, execution handoff, and worker pickup readiness checks.
Readiness inspection now includes deterministic `workerPickupEvidence` projection from persisted `handoffArtifact`, read-only API inspection route, internal debug UI route, deployed superadmin readiness-test UI, admin seed API for deterministic persisted handoff creation/reuse, operator review intent persistence/creation surfaces, and deterministic governance snapshot surfacing.

Completed readiness inspection routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (read-only governance authorization)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (admin-only governance authorization intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate` (read-only execution readiness gate)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions` (read-only execution preconditions ledger)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan` (read-only execution blocker remediation planner)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan` (read-only dry-run planned jobs simulation evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview` (read-only execution job shape preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview` (read-only provider worker envelope preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest` (read-only no-execution boundary proof evidence)
- `GET /api/gnr8/admin/providers/openprovider/domains` (read-only Openprovider domain inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/dns` (read-only Openprovider DNS records inventory evidence)

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

Evidence and diagnostics milestone:
- Openprovider DNS Inventory Admin UI is deployed:
  - UI route: `/gnr8/admin/providers/openprovider/dns`
  - backing API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified UI values:
    - `title`: `Openprovider DNS Inventory`
    - `banner`: `Read-only provider boundary active`
    - `provider`: `openprovider`
    - `mode`: `read only`
    - `execution`: `blocked`
    - `domains`: `0`
    - `records`: `0`
    - `inventory status`: `empty`
    - `empty message`: `No DNS records found in current Openprovider sandbox account.`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 now has a real provider-read UI surface for Openprovider DNS inventory.
    - the current sandbox account has no domains, so DNS inventory is empty, but auth, read boundary, API, and UI rendering are verified end-to-end.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Sandbox Domain Fixture / Seed Real Test Domain
    - or Provider Reality Dashboard linking Domain Inventory + DNS Inventory
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS Inventory UI milestone
- Openprovider DNS Records Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domains`: `[]`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 can now authenticate against Openprovider sandbox and perform read-only DNS inventory access.
    - current sandbox has no domains, so DNS inventory is empty but successful.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Provider Reality UI: DNS Inventory Page
    - or Sandbox Domain Fixture / Seed Real Test Domain
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS read-only milestone
- Operator Evidence Provenance Layer is deployed:
  - Executive Summary includes visible provenance support
  - Evidence Sources chips are present for provenance cues
  - static source mapping approach is used
  - no runtime lineage engine
  - no API changes
  - no runtime changes
  - no execution controls
  - verified source mappings:
    - Current Situation: `Readiness`, `Safety Manifest`
    - Primary Blockers: `Execution Preconditions Ledger`, `Execution Readiness Gate`, `Execution Remediation Plan`
    - Verified Positives: `Governance Decision Package`, `Execution Preconditions Ledger`, `Safety Manifest`
  - recommended next step:
    - `Execution Remediation Plan`
  - conclusion:
    - operator can now answer `How do we know this?` using visible evidence provenance
  - boundary remains:
    - execution impossible
    - simulation only
    - no provider execution
    - no queue execution
    - no secret resolution
  - recommended next milestone:
    - Operator Cockpit Completion / UI Freeze Candidate
  - success criteria:
    - future thread bootstrap resumes from provenance-enabled cockpit milestone
- Operator Cockpit Evidence Status Badges / Severity System is deployed:
  - badge severity levels: `critical`, `warning`, `success`, `info`, `neutral`
  - verified counters: `Critical: 8`, `Warnings: 4`, `Success: 8`
  - verified top cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - verified sticky banner: `Execution impossible. Control-plane simulation only.`
  - verified grouping: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - UI/read-model only, no runtime changes, no API changes, no behavior changes
  - no execution controls added
  - milestone note: some badge chips currently render as a compact raw evidence strip below counters; acceptable for this milestone and may be refined later
  - execution boundary remains explicit:
    - no provider execution
    - no sandbox execution
    - no DNS writes
    - no Openprovider/registrar calls
    - no queue/Inngest/worker execution
    - no secret resolution
  - conclusion:
    - operator can now identify execution risk, readiness state, governance state, and safety state quickly through counters and visual badges
  - recommended next milestone:
    - Operator Cockpit Compact Evidence Strip / Visual Polish Pass
    - still no execution
- Evidence Surface Consolidation / Operator Cockpit Layout Pass is deployed:
  - readiness page reorganized from linear debug layout into operator-oriented cockpit layout
  - sticky summary banner: `Execution impossible. Control-plane simulation only.`
  - top summary cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - grouped sections: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - default-collapsed sections: `Timelines`, `Diagnostics`, `Payload JSON Blocks`
  - UI/read-model only, no runtime model changes, no API changes, no behavior changes
  - all evidence artifacts preserved
  - no execution controls added
  - execution remains impossible
- seed creates/reuses deterministic persisted handoff
- readiness page shows persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`
- `workerPickupEvidence.blockedReasons` is normalized with no contradictory approval/handoff/planned-job reasons; reasons are deterministic and operator-readable
- operator review persistence exists via `gnr8_runtime_provider_operator_reviews`
- reviews API returns deterministic `reviewSummary` in `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`
- governance snapshot model exists: `runtime-provider-governance-snapshot.ts`
- governance snapshot combines: handoff readiness, `workerPickupEvidence`, operator `reviewSummary`, diagnostics
- governance snapshot fields: `snapshotId`, `handoffId`, `correlationKey`, `readinessStatus`, `executionBlocked: true`, `workerPickupEvidence`, `reviewSummary`, `diagnostics`, `createdAt`
- governance snapshot persistence table exists: `gnr8_runtime_provider_governance_snapshots`
- governance authorization model exists: `runtime-provider-governance-authorization.ts`
- governance authorization persistence table exists: `gnr8_runtime_provider_governance_authorizations`
- readiness API includes `governanceSnapshot`
- governance timeline API exists: `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline`
- readiness UI displays Governance Snapshot section
- readiness UI displays Governance Timeline section
- readiness UI displays Authorization section
- readiness UI displays Dry-run Job Plan section
- readiness UI displays Execution Job Preview section
- readiness UI displays Provider Worker Envelope Preview section
- readiness UI displays Provider Execution Safety Manifest section
- readiness UI displays Execution Readiness Gate section
- readiness UI displays Execution Preconditions Ledger section
- readiness UI displays Execution Remediation Plan section
- runtime dry-run job plan model exists: `runtime-provider-dryrun-job-plan.ts`
- runtime execution job preview model exists: `runtime-provider-execution-job-preview.ts`
- runtime provider worker envelope preview model exists: `runtime-provider-worker-envelope-preview.ts`
- runtime provider execution safety manifest model exists: `runtime-provider-execution-safety-manifest.ts`
- provider execution safety manifest verified deployed values:
  - `overallStatus`: `execution_impossible`
  - `summary`: `Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.`
  - diagnostics include:
    - `EXECUTION_SAFETY_BOUNDARY_PROVEN`
    - `EXECUTION_SAFETY_MANIFEST_CREATED`
- provider execution safety manifest verified barriers:
  - `governance_boundary_active`
  - `worker_dispatch_disabled`
  - `queue_allocation_disabled`
  - `provider_execution_disabled`
  - `secret_resolution_disabled`
  - `runtime_execution_boundary_active`
- provider execution safety manifest critical distinction:
  - safety manifest proves no-execution boundary
  - governance remains advisory
  - worker dispatch is disabled
  - queue allocation is disabled
  - provider execution is disabled
  - credential/secret resolution remains disabled
  - runtime remains simulation-only
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- UI note:
  - secret-related barrier IDs may be redacted because generic redaction treats `secret` as sensitive
  - this is safe and non-blocking
- dry-run job plan verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 simulated provider jobs generated for readiness evidence.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `status`: `simulated`
    - `reason`: `Deterministic simulation for operationKind=upsert_dns_record; execution remains disabled.`
- dry-run job plan is simulated evidence only:
  - no persisted execution jobs are created
  - `plannedJobIds` are not changed
  - no workers are enqueued
  - no provider calls are made
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- execution job preview verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 execution job preview artifact(s) generated; execution remains disabled.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `queueTarget`: `provider-control-plane`
    - `workerTarget`: `provider-execution-worker`
    - `simulatedStatus`: `preview_only`
    - `payloadShape` includes:
      - `providerId`: `openprovider`
      - `operationKind`: `upsert_dns_record`
      - `siteId`: `dev_readiness_seed_site`
      - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
      - `correlationKey`: `eed1514dcd76dcd5a14f7d07c59b982b550e18558090d5ee7eadb7e3ccecbd6a`
  - diagnostics include:
    - `EXECUTION_JOB_PREVIEW_INTENT_ONLY`
    - `EXECUTION_JOB_PREVIEW_JOB_CREATED`
- execution job preview is evidence only:
  - no persisted execution jobs are created
  - no `plannedJobIds` are changed
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider calls occur
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- provider worker envelope preview verified deployed values:
  - `summary`: `Deterministic provider worker envelope preview generated; execution remains disabled.`
  - `queueTarget`: `provider-control-plane`
  - `workerTarget`: `provider-execution-worker`
  - `payloadVersion`: `v1`
  - `executionIntent`: `control_plane_simulation_only`
  - `executionBlocked`: `true`
  - `executionAllowed`: `false`
  - `providerId`: `openprovider`
  - `operationKind`: `upsert_dns_record`
  - `environment`: `sandbox`
  - `siteId`: `dev_readiness_seed_site`
  - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
  - diagnostics include:
    - `PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY`
- provider worker envelope preview is evidence only:
  - worker envelope is preview/evidence only
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider execution occurs
  - no payload is sent to a runtime worker
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- governance authorization statuses:
  - `not_requested`
  - `pending_authorization`
  - `authorized_for_future_execution`
  - `denied`
- readiness UI keeps detailed operator review list visible
- readiness UI includes create operator review form with:
  - status dropdown values: `pending_review`, `approved_for_future_execution`, `rejected`, `needs_changes`
  - reason textarea
  - Save review intent action
- diagnostics include:
  - `GOVERNANCE_SNAPSHOT_CREATED`
  - `GOVERNANCE_SNAPSHOT_REUSED`
  - `GOVERNANCE_SNAPSHOT_AUDIT_READ`
  - `GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED`
- `approved_for_future_execution` is intent-only; it does not authorize execution
- `authorized_for_future_execution` is intent-only; it does not authorize execution
- `executionBlocked` remains `true`
- governance snapshot is evidence only
- execution readiness gate verified values:
  - `gateStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `blockingReasons`:
    - `approval_status_blocked`
    - `global_execution_boundary_active`
    - `handoff_status_blocked`
    - `no_planned_jobs`
- execution preconditions ledger verified values:
  - `overallStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `missingRequirements`:
    - `execution_planned_jobs_present:missing`
  - `blockedRequirements`:
    - `approval_status_not_blocked:blocked`
    - `execution_handoff_status_not_blocked:blocked`
- execution remediation plan verified values:
  - `overallStatus`: `blocked`
  - `summary`: `Execution remains blocked because 4 remediation actions are still unresolved.`
  - `diagnostics`:
    - `EXECUTION_REMEDIATION_ACTIONS_GENERATED`
    - `EXECUTION_REMEDIATION_INTENT_ONLY`
    - `EXECUTION_REMEDIATION_PLAN_CREATED`
  - `remediationActions`:
    1. `critical` / `ledger`
       - `reason`: `Approval status is blocked.`
       - `recommendedAction`: `Review approval workflow before execution eligibility can be evaluated.`
    2. `high` / `ledger`
       - `reason`: `No planned jobs are present.`
       - `recommendedAction`: `Create deterministic planned jobs before execution readiness evaluation.`
    3. `critical` / `handoff`
       - `reason`: `Handoff status is blocked.`
       - `recommendedAction`: `Resolve handoff blockers and regenerate readiness evidence.`
    4. `normal` / `gate`
       - `reason`: `Global execution boundary is active.`
       - `recommendedAction`: `Execution boundary intentionally active. No action required.`
- governance conditions satisfied/passed while execution remained blocked:
  - `review_approved_for_future_execution`: satisfied/passed
  - `authorization_authorized_for_future_execution`: satisfied/passed
- conclusion:
  - governance intent can be satisfied while execution readiness remains blocked
  - GNR8 can now explain not only why execution is blocked, but what remediation steps remain before future execution could ever become possible.

Deployed manual verification loop (completed):
- readiness-test UI creates/reuses deterministic handoff
- readiness inspection loads `handoffArtifact`
- `workerPickupEvidence` is displayed
- operator review form creates persisted review intent
- authorization form creates persisted authorization intent
- governance snapshot updated after authorization/review state changed
- governance timeline contains multiple snapshots
- operator review summary displays persisted review state
- Governance Snapshot is displayed
- Governance Timeline is displayed
- Governance Decision Package is displayed
- Governance Timeline verified fields:
  - `snapshotId`
  - `createdAt`
  - `reviewSummaryStatus`
  - `reviewCount`
  - `readinessStatus`
  - `diagnostics`
- `executionBlocked` remains `true`

Governance Decision Package milestone verification:
- verified deployed flow:
  - readiness
  - operator review summary
  - governance authorization
  - governance snapshot
  - governance timeline
  - governance decision package
- verified values:
  - `recommendedAction`: `remain_blocked`
  - `executionBlocked`: `true`
  - `reviewStatus`: `approved_for_future_execution`
  - `authorizationStatus`: `authorized_for_future_execution`
  - `snapshotCount`: `3`
- boundary reminder:
  - decision package remains advisory only
  - execution remains blocked

Example verified values:
- `authorizationStatus`: `authorized_for_future_execution`
- `authorizationReason`: `1234`
- `intentOnly`: `true`
- `executionBlocked`: `true`
- diagnostics include:
  - `GOVERNANCE_AUTHORIZATION_CREATED`
  - `GOVERNANCE_AUTHORIZATION_INTENT_ONLY`

Future note:
- deterministic `createdAt` may show epoch values for dev-seed artifacts
- potential future improvement: add `snapshotCreatedAt` and `persistedAt`
- recommended next milestone: Operator Cockpit Compact Evidence Strip / Visual Polish Pass (still no execution)

Hard boundaries remain:
- no live provider execution
- no sandbox execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no queue/Inngest execution for provider handoff readiness inspection
- no queue/Inngest/worker execution
- no external registrar calls
- no secret reads/stores
- no secret resolution
- no persisted execution job creation from dry-run job plan
- no `plannedJobIds` mutation from dry-run job plan
- no persisted execution job creation from execution job preview
- no `plannedJobIds` mutation from execution job preview
- no queue record allocation from execution job preview
- no worker dispatch from execution job preview
- no queue record allocation from worker envelope preview
- no worker dispatch from worker envelope preview
- no provider execution from worker envelope preview
- no runtime worker payload send from worker envelope preview
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## F) Current Active Implementation Phase

Active phase: Operator Cockpit Evidence Status Badges / Severity System milestone (deployed and verified).

Practical next phase:
1. Operator Cockpit Compact Evidence Strip / Visual Polish Pass.
2. Keep execution paths in dry-run/sandbox-gated mode with explicit execution-blocked evidence (still no execution).

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Documentation Discipline

Rules:
- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- If a document is historical, mark or index it as secondary/archive.
- Baseline/checkpoint docs are evidence, not the primary doctrine.
- When current state changes, update `docs/ai/GNR8_CURRENT_STATE.md` and relevant baseline/checkpoint docs.

## Ready-to-Copy Prompt

"Read these files first in this exact order: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_COLLABORATION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Read docs/ai/GNR8_COLLABORATION_PROTOCOL.md before generating Codex tasks. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact."
