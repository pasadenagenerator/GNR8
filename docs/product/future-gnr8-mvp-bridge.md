# Future GNR8 MVP Bridge

STRAT-1 canonical bridge from the current CAP-1 repository state to the first practical Future GNR8 MVP.

## Bridge Principle

The practical MVP is not the full Future GNR8 platform. The practical MVP is an operator-assisted migration factory for static or mostly static public websites, backed by clear portfolio/site state, durable migration batches, Command Center operations, source-of-truth boundaries, audit/replay/failure recovery, domain/DNS operating decisions, cost visibility, and a basic client approval boundary.

Migration remains the first wedge because CAP-1 shows the strongest repository evidence in scoped import, rendered capture, static/multi-page import foundations, raw-template runtime serving, content slots, durable jobs/batches, publish activation, hosting operations, and review projections.

## Current Starting Point

Implemented and usable as MVP foundation:

- Client-scoped URL import: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`.
- Scoped import pipeline: `apps/platform/gnr8/site/scoped-import-pipeline.ts`.
- Runtime artifact store and active serving: `apps/platform/gnr8/runtime/runtime-store.ts`.
- Public raw-template runtime: `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/**`.
- Content slots and overrides: `apps/platform/gnr8/runtime/content-binding.ts`, content APIs.
- Publish activation: `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`, `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.
- Durable jobs/batches: `apps/platform/gnr8/migration-factory/**`.
- Command Center migration and hosting pages: `apps/platform/app/gnr8/command-center/**`.
- Vercel domain binding and verification: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`, `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`.
- Review projections: Source Website Understanding, Source Content and Visual Continuity, Knowledge Workspace, thumbnails, and evolution review pages.

Incomplete or unsafe to assume:

- No fully unattended migration queue with leases, heartbeat, retry scheduler, and recovery console.
- No full client approval product.
- No complete rollback incident workflow, despite rollback primitives.
- No live Openprovider registrar/DNS mutation boundary.
- No full customer billing/Stripe product.
- No complete autonomous AI operator or regeneration workflow.
- No single unified source-of-truth matrix across import, artifacts, publish, domains, cost, approvals, and external records.

## MVP Scope

MVP should include:

- Operator-assisted migration factory for public, static or mostly static websites.
- Bulk migration intake from CSV/manual forms/API import lists.
- Portfolio model clarity across agency, client, site, site version, migration job, migration batch, active runtime, domain binding, cost center, and approval.
- Migration batch operations with dry-run preview, run/resume, stop/continue policies, failure triage, and replay/runbook links.
- Command Center consolidation as the main operator workbench.
- Ops Inbox concept for exceptions, approvals, recovery tasks, domain blockers, capture failures, cost anomalies, and client blockers.
- Domain/DNS operating model decision: manual DNS instructions plus Vercel verification for MVP unless an explicit provider execution ADR approves more.
- Publish/rollback boundary with technical readiness, approval status, active pointer changes, and incident reversal.
- Audit/replay/failure recovery minimums for import, batch execution, content edit, approval, publish, rollback, and domain verification.
- Source-of-truth matrix.
- Cost visibility for migration/runtime usage and high-risk cost anomalies.
- Basic client approval boundary for launch signoff and content correction requests.

MVP should explicitly defer:

- Autonomous regeneration.
- Full Digital Business Twin productization.
- Full Stripe billing product, checkout, customer portal, invoicing, and plan management.
- Full registrar/DNS automation and live Openprovider mutation.
- Full agency marketplace.
- Full external integration marketplace.
- Fully autonomous AI operator execution.
- Autonomous website evolution loops.

## Source-Of-Truth Matrix

| Domain | MVP source of truth | Current evidence | MVP treatment | Future extension |
| --- | --- | --- | --- | --- |
| Agency/client ownership | Postgres ownership and membership records | Agency/client routes, auth/RBAC, ownership migrations | Required | Agency Portfolio OS |
| Site identity | Client-owned site and site version records | Scoped import, runtime store | Required | Portfolio-level operating graph |
| Source capture | Persisted capture/import artifacts and diagnostics | URL import, rendered capture, static import | Required | External CMS/source connectors |
| Runtime output | Immutable runtime artifacts, raw-template artifacts, active pointers | Runtime store, public runtime | Required | Multi-renderer governed runtime |
| Content edits | Content slots, draft overrides, published overrides, history | Content binding and content APIs | Required | Rich editor and client collaboration |
| Migration execution | Durable jobs, stages, events, batches | Migration factory store/executor | Required | Worker queue, retry scheduler, playbooks |
| Review projections | Read-only deterministic projections | WU, VCU, workspace, thumbnails | Strongly recommended | DBT and advisory layers |
| Approval | MVP approval record or explicit operator/client signoff | Business approval docs only, publish requires approved state | Required decision | Client portal and policy engine |
| Publish | Version lifecycle, publish activation audit, active pointer switch | Publish route/orchestrator | Required | Multi-environment release governance |
| Rollback | Runtime rollback switch and content rollback primitives | Rollback route and content rollback route | Required workflow | Incident response automation |
| Domain state | Runtime host binding plus Vercel status and DNS instructions | Domain route, Vercel client, worker verification | Required if launch included | Provider-neutral DNS automation |
| Cost | Cost events, unified cost, runtime usage logs | Billing cost model and runtime usage logging | Strongly recommended | Account reporting and billing product |
| External workflows | External record references, status snapshots, audit references | Mostly future; no CAP-1 complete product evidence | Design before integration MVP | External Workflow Memory |
| AI/provider outputs | Immutable input/output bundles and audit records | ADR-001, ADR-003, provider payload foundations | Required before any AI execution | Governed AI Operator |

## Integration And Workflow Continuity

Integrations are not secondary features for agencies. Agencies already operate through client CMSs, project tools, Slack/Teams, email, CRMs, analytics dashboards, support queues, billing systems, file stores, DNS providers, and deployment repositories. If GNR8 ignores those workflows, adoption will require agencies to abandon their operating habits before receiving value. That is the wrong sequence.

GNR8 should support external systems without immediately becoming their replacement:

- Read external state where authorized.
- Link external records to agencies, clients, sites, versions, migration jobs, approvals, and incidents.
- Create tasks when GNR8 detects work that belongs in the agency's existing system.
- Receive updates from external tasks, messages, approvals, tickets, files, analytics, and deployment systems.
- Summarize external status in Command Center and Ops Inbox.
- Preserve external audit references and immutable snapshots of action context.
- Track approvals across GNR8 and external systems.
- Avoid becoming the source of truth for an external system unless the agency explicitly adopts GNR8 for that domain.

Integration categories:

| Category | MVP relevance | GNR8 responsibility | Source-of-truth boundary |
| --- | --- | --- | --- |
| CMS | Medium for import, post-MVP for sync | Read source content, preserve references, support migration planning | External CMS remains source until cutover |
| Project management | High after migration MVP design | Create migration tasks, sync blockers, summarize status | External project tool remains task truth |
| Communication | High for adoption | Capture decision links, summarize client/operator threads | Email/chat remains communication truth |
| CRM | Medium | Link account/site health and renewal signals | CRM remains account truth unless adopted |
| Analytics | Medium-high post-launch | Pull traffic/conversion/health signals | Analytics platform remains measurement truth |
| Support | Medium-high | Link incidents, launch issues, and client requests | Support platform remains ticket truth |
| Billing/accounting | Medium | Link cost, account status, invoices | Accounting/billing system remains financial truth |
| File storage | Medium | Link source assets, approvals, brand files | File store remains asset truth unless imported |
| DNS/domain providers | High for launch | Read status, generate instructions, verify state | Provider remains DNS/registrar truth until execution ADR |
| Deployment/repository systems | Medium | Link build/deploy status and change references | Repo/deploy platform remains code/deploy truth |

## MVP Command Center And Ops Inbox

Command Center should become the operator's primary workbench. Specialized admin pages should remain drilldowns, not separate daily workflows.

MVP Command Center should show:

- Portfolio migration status by agency, client, batch, and site.
- Intake readiness and source capture health.
- Batch run/resume state, stop/continue policy, failure groups, and replay links.
- Preview/publish readiness.
- Domain readiness and DNS blockers.
- Cost signals and anomalies.
- Approval status and client blockers.
- Incident and rollback readiness.

Ops Inbox should classify work items:

- Intake blocked.
- Capture failed or degraded to fallback.
- Multi-page discovery needs review.
- Batch paused or failed.
- Preview smoke failed.
- Approval needed.
- Client change requested.
- Publish ready.
- Domain action needed.
- Rollback/incident action needed.
- Cost anomaly.
- External workflow update.

## AI Governance Bridge

AI is a future operating layer, not the first MVP engine. Before any AI execution becomes product behavior, GNR8 must classify actions and enforce governance.

| AI action class | Examples | Execution boundary | MVP status |
| --- | --- | --- | --- |
| Read-only inspection | Inspect import diagnostics, compare preview status, read domain verification state | Allowed through deterministic read tools | Allowed if audited |
| Summarization | Summarize batch failures, client feedback, external tickets | Allowed from immutable/read snapshots | Allowed if output is advisory |
| Recommendation | Recommend retry order, unsupported site class, launch checklist | Advisory only | Allowed if not auto-executed |
| Plan generation | Generate migration plan, DNS checklist, rollback plan | Dry-run plan only | Allowed as documentation/review |
| Draft external action | Draft project task, client email, support ticket | Human sends or approves | Post-MVP/limited |
| Safe executable action | Re-run read-only validation, recompute deterministic projection | Executable with audit and role permission | Later MVP candidate |
| Approval-required action | Publish, rollback, domain/provider change, billing change, content publish | Human approval required | Deferred until policy engine |
| Forbidden action | Live DNS mutation without ADR, hidden provider execution, autonomous publish, mutable artifact overwrite | Blocked | Forbidden |

Required governance concepts:

- Deterministic tools for all executable actions.
- Dry-run first for plans, provider actions, bulk actions, publish readiness, DNS changes, and rollback.
- Role-based permissions tied to agency, client, site, action class, and environment.
- Explicit approvals for publish, rollback, provider, DNS, billing, external task mutation, and client-visible changes.
- Unified audit log for who/what/when/why/input/output.
- Replay boundaries for deterministic stages and immutable AI/provider input-output bundles for non-deterministic stages.
- Operator override with reason capture.
- Human accountability for client-visible or externally mutating actions.

## Recommended MVP Milestone Order

1. MVP Boundary and Source-of-Truth Matrix.
2. Bulk Migration Factory Design.
3. Command Center and Ops Inbox Design.
4. Domain/DNS Operating Model Decision.
5. Audit, Replay, and Failure Recovery Design.
6. Migration Factory MVP Implementation.
7. Command Center MVP Consolidation.
8. Client Approval Boundary.
9. Integration and Workflow Continuity Architecture.
10. AI Operator Governance Architecture.

This order keeps implementation grounded in current repository evidence. The first implementation milestone should be Migration Factory MVP Implementation, only after the boundary, bulk factory, Command Center/Ops Inbox, domain, and audit/replay designs are closed.
