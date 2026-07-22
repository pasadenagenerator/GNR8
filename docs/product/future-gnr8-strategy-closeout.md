# Future GNR8 Strategy Closeout

STRAT-1 canonical closeout. Documentation and architecture phase only.

## What Was Reviewed

STRAT-1 reviewed the CAP-1 baseline and current-state docs:

- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-operator-capability-map.md`
- `docs/architecture/gnr8-technical-capability-map.md`
- `docs/product/gnr8-mvp-readiness-map.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

The repository is closest today to an operator-assisted migration factory and deterministic runtime control plane. It is not yet a fully autonomous AI website operations platform, full regeneration system, full agency portfolio OS, full DNS/registrar automation product, full billing product, or complete external integration layer.

## Future GNR8 Positioning

GNR8 is an AI-native website operations platform that connects website migration, runtime operations, client workflows, external tools, and business intelligence into one governed operating layer for agencies and multi-site organizations.

Future category:

AI-native operating layer for website portfolios.

GNR8 should not be positioned only as an AI website generator, CMS, DXP, visual website builder, hosting platform, WordPress maintenance tool, or generic automation platform. It should own the governed operating layer that makes website portfolios migratable, operable, reportable, improvable, and safe for AI assistance.

## Strategic Pillars

Canonical pillar details are in `docs/architecture/future-gnr8-platform-pillars.md`.

Pillar summary:

- Website Operations Backbone: canonical site/runtime/domain/publish/cost/audit operating record.
- Migration Factory: first practical wedge for bulk, operator-assisted website migration.
- Command Center and Ops Inbox: daily operator workbench and exception queue.
- Integration and Workflow Continuity Layer: external systems support without forced rip-and-replace.
- External Workflow Memory: durable references to external tasks, approvals, files, messages, tickets, analytics, and provider state.
- AI Operator Layer: governed AI assistance through deterministic tools, dry-runs, approvals, audit, replay, and immutable bundles.
- Policy and Permission Engine: role/action/data/publish/provider/client boundaries.
- Client Collaboration Portal: review, change requests, and launch approvals for clients.
- Reporting and Account Management Layer: migration progress, health, cost, margin, account and portfolio reporting.
- Digital Business Twin: governed business context for future regeneration and advisory work.
- Online Growth and Advisory Layer: evidence-backed recommendations and account opportunities.
- Marketplace and Playbooks: repeatable governed workflows and later ecosystem offerings.
- Agency Portfolio OS: long-term operating system for agency website portfolios.
- Regeneration and Evolution: post-MVP governed redesign, generation, comparison, approval, and improvement loops.

## MVP Bridge

Canonical MVP bridge details are in `docs/product/future-gnr8-mvp-bridge.md`.

The MVP should prioritize:

- Operator-assisted migration factory.
- Portfolio/site model clarity.
- Bulk migration intake.
- Migration batch operations.
- Command Center consolidation.
- Ops Inbox concept.
- Domain/DNS operating model.
- Publish/rollback boundary.
- Audit/replay/failure recovery.
- Source-of-truth matrix.
- Cost visibility.
- Basic client approval boundary.

The MVP should explicitly defer:

- Autonomous regeneration.
- Full Digital Business Twin productization.
- Full Stripe billing product.
- Full registrar/DNS automation.
- Full agency marketplace.
- Full external integration marketplace.
- Fully autonomous AI operator execution.

## Integration Strategy

Integration and Workflow Continuity is a strategic adoption requirement, not a secondary feature. Agencies already coordinate work in CMSs, project management tools, communication systems, CRMs, analytics, support platforms, billing/accounting tools, file storage, DNS/domain providers, and deployment/repository systems.

GNR8 should:

- Read external state where authorized.
- Link external records to sites, clients, versions, jobs, approvals, and incidents.
- Create tasks in external systems when work belongs there.
- Receive updates and summarize external status.
- Preserve external audit references.
- Track approvals across internal and external systems.
- Avoid becoming source of truth for external systems unless explicitly adopted.

MVP implication: design the external record/source-of-truth boundary early, then implement integrations after migration MVP foundations and client approval boundaries.

## AI Governance Strategy

AI Operator must be governed before execution. Action classes:

| Class | Examples | Boundary |
| --- | --- | --- |
| Read-only inspection | Inspect diagnostics, domain status, batch state | Allowed through deterministic read tools |
| Summarization | Summarize failures, client feedback, external tickets | Advisory from immutable/read snapshots |
| Recommendation | Recommend retry order or launch checklist | Advisory only |
| Plan generation | Migration plan, DNS checklist, rollback plan | Dry-run plan only |
| Draft external action | Draft project task, client email, support ticket | Human approves/sends |
| Safe executable action | Recompute projection, re-run read-only validation | Requires role permission and audit |
| Approval-required action | Publish, rollback, DNS/provider/billing/content mutation | Human approval required |
| Forbidden action | Hidden provider execution, live DNS without ADR, autonomous publish, mutable artifact overwrite | Blocked |

Required governance:

- Deterministic tools.
- Dry-run first.
- Approvals.
- Role-based permissions.
- Audit log.
- Replay.
- Immutable input/output bundles for AI/provider outputs.
- Operator override with reason.
- Human accountability.

## Competitive Positioning

Canonical competitive details are in `docs/product/future-gnr8-competitive-positioning.md`.

Key conclusion:

GNR8 should not try to be a better CMS than Adobe, a better visual builder than Webflow, or a better automation platform than Workato. GNR8 should become the governed operating layer that connects website portfolios, workflows, AI, business understanding, and operations.

GNR8 should compete in:

- Portfolio migration and operations for agencies.
- Governed website operations across mixed stacks.
- Command Center/Ops Inbox for site portfolios.
- Workflow continuity with external tools.
- AI governance for website operations.
- Business-aware reporting and future advisory layers.

GNR8 should not compete directly as:

- A full enterprise CMS/DXP.
- A pure visual builder.
- A commodity hosting/infrastructure platform.
- A WordPress-only maintenance suite.
- A generic automation connector platform.

## Recommended Milestone Sequence

### 1. MVP Boundary and Source-of-Truth Matrix

Purpose: Decide the exact MVP and authority boundaries.

Why it comes now: CAP-1 shows many partial future tracks; implementation needs a fixed boundary before more code.

Allowed scope: Documentation, architecture, state matrix, supported site classes, MVP/non-MVP classification.

Prohibited scope: Runtime implementation, APIs, migrations, provider execution, DNS mutation, autonomous AI, regeneration.

Expected deliverables: MVP boundary doc, source-of-truth matrix, supported/unsupported site class list, updated bootstrap references if approved.

Validation approach: Docs-only diff; CAP-1 consistency check.

Type: Documentation-only.

### 2. Bulk Migration Factory Design

Purpose: Design bulk intake, batch execution, dry-run, safe bulk actions, retry, replay, and recovery.

Why it comes now: Migration is the MVP wedge and 200 sites cannot run as one-off imports.

Allowed scope: Design only, API/workflow contracts, runbook, validation plan.

Prohibited scope: Queue implementation, worker changes, migrations, runtime changes.

Expected deliverables: Bulk intake spec, batch lifecycle, failure taxonomy, replay model.

Validation approach: Review against existing migration factory and Command Center evidence.

Type: Documentation-only.

### 3. Command Center and Ops Inbox Design

Purpose: Make Command Center the operator workbench and define exception queues.

Why it comes now: CAP-1 warns about too many disconnected admin pages.

Allowed scope: UX/product architecture, read model design, action boundary design.

Prohibited scope: Runtime behavior, API mutation, AI chat execution.

Expected deliverables: Command Center IA, Ops Inbox work item taxonomy, drilldown map.

Validation approach: Map every work item to current/future source-of-truth.

Type: Documentation-only.

### 4. Domain/DNS Operating Model Decision

Purpose: Decide manual DNS, Vercel-guided connection, and deferred provider automation boundaries.

Why it comes now: Launch planning depends on DNS responsibility.

Allowed scope: Architecture decision, runbook, readiness matrix.

Prohibited scope: Live registrar/DNS mutation, Openprovider execution, migrations.

Expected deliverables: Domain/DNS MVP model, launch checklist, provider deferral notes.

Validation approach: Compare to current Vercel route, domain worker, and Openprovider read-only/control-plane evidence.

Type: Documentation-only.

### 5. Audit, Replay, and Failure Recovery Design

Purpose: Define minimum audit events, replay stages, failure categories, recovery actions, and incident boundaries.

Why it comes now: Migration at portfolio scale fails without reproducible recovery.

Allowed scope: Design, event taxonomy, runbooks, permission requirements.

Prohibited scope: Runtime changes, schema changes, automated retry implementation.

Expected deliverables: Audit event list, replay boundary, failure recovery playbooks.

Validation approach: Trace against import, batch, content, publish, rollback, domain, and cost flows.

Type: Documentation-only.

### 6. Migration Factory MVP Implementation

Purpose: Implement the minimal bulk migration workflow approved by prior designs.

Why it comes now: It is the first practical product implementation after architecture closure.

Allowed scope: Approved bulk intake, batch workflow, failure triage, replay controls, dry-run previews, tests.

Prohibited scope: Autonomous AI, provider execution, DNS mutation, full regeneration, marketplace.

Expected deliverables: Working operator-assisted migration factory MVP.

Validation approach: Focused tests, representative batch dry-run, failure/replay verification.

Type: Product workflow implementation.

### 7. Command Center MVP Consolidation

Purpose: Consolidate migration, hosting, domain, approval, cost, and failure state into the operator workbench.

Why it comes now: The migration implementation needs one operational surface.

Allowed scope: Read models, UI consolidation, action links, non-destructive operator controls approved by prior design.

Prohibited scope: Autonomous execution, unapproved provider actions, unrelated admin redesign.

Expected deliverables: MVP Command Center and first Ops Inbox.

Validation approach: UI tests, read-model tests, operator workflow walkthrough.

Type: Product workflow implementation.

### 8. Client Approval Boundary

Purpose: Provide basic client-visible preview, change request, and launch approval boundaries.

Why it comes now: Publish authority must be clear before client launches.

Allowed scope: Approval workflow, client status views, audit, notifications/design for external references.

Prohibited scope: Full collaboration suite, full CRM/project tool replacement, autonomous publish.

Expected deliverables: Client approval state, operator/client signoff workflow, audit trail.

Validation approach: Permission tests, approval-to-publish walkthrough, fail-closed checks.

Type: Product workflow implementation.

### 9. Integration and Workflow Continuity Architecture

Purpose: Define external records, sync categories, source-of-truth boundaries, task creation, update ingestion, and audit references.

Why it comes now: Agencies need continuity, but integrations should follow MVP migration foundations.

Allowed scope: Architecture, connector taxonomy, external record model, security/audit design.

Prohibited scope: Full integration marketplace, broad connector implementation, autonomous external mutation.

Expected deliverables: Integration architecture and external workflow memory model.

Validation approach: Map each category to source-of-truth and allowed actions.

Type: Documentation-only, then read-only implementation in later milestones.

### 10. AI Operator Governance Architecture

Purpose: Define AI action classes, deterministic tool registry, approvals, immutable bundles, audit, replay, and forbidden actions.

Why it comes now: AI can assist operations after the operating surface is stable.

Allowed scope: Governance architecture, tool/action taxonomy, provider output boundary, cost model requirements.

Prohibited scope: Autonomous execution, provider execution, publish/domain/billing mutation.

Expected deliverables: AI Operator governance spec and action matrix.

Validation approach: Verify every AI action has class, permission, audit, dry-run, and replay/input-output rules.

Type: Documentation-only.

### 11. Reporting and Account Management MVP

Purpose: Turn migration, health, domain, approval, and cost data into account/portfolio reports.

Why it comes now: Agencies need portfolio visibility after migration workflows stabilize.

Allowed scope: Reporting read models, cost visibility, account status, exportable summaries.

Prohibited scope: Full Stripe product, invoicing, autonomous advisory.

Expected deliverables: Portfolio/account reporting MVP.

Validation approach: Cost/runtime/migration data reconciliation tests.

Type: Read-only implementation.

### 12. Digital Business Twin and Advisory Foundation

Purpose: Productize business context carefully for future regeneration and growth recommendations.

Why it comes now: Business intelligence is valuable after operations and governance are credible.

Allowed scope: DBT source-of-truth boundary, evidence links, approval model, advisory read-only recommendations.

Prohibited scope: Autonomous regeneration, unapproved AI output mutation, provider execution.

Expected deliverables: Governed DBT foundation and advisory read model.

Validation approach: Evidence lineage tests, approval review, no source-truth contamination.

Type: Read-only implementation and product workflow design.

## Architecture Warnings

| Risk | Why it matters | Likely failure mode | Mitigation | Must solve before MVP |
| --- | --- | --- | --- | --- |
| Overbuilding future platform before migration MVP | Migration is the credible wedge | Months spent on DBT/AI/marketplace without migration throughput | Freeze MVP boundary and milestone order | Yes |
| Confusing chat UI with architecture | Chat alone does not define state, permissions, audit, or replay | Hidden actions and unclear authority | Define tools, actions, state, audit, and approvals first | Yes for AI work |
| Treating AI output as deterministic | Provider output varies | Replay and QA fail | Immutable input/output bundles and advisory boundaries | Yes before AI execution |
| Treating generated artifacts as mutable source of truth | Runtime authority becomes unclear | Operators publish/review wrong layer | Source-of-truth matrix and append-only artifact rules | Yes |
| Weak audit/replay | 200-site failures need recovery | Failures cannot be explained or reproduced | Minimum audit events and replay runbooks | Yes |
| Too many disconnected admin pages | Operators need scanning and triage | Work happens in scattered pages | Command Center and Ops Inbox consolidation | Yes |
| Integrations as ungoverned side effects | External systems can drift or mutate unexpectedly | Tasks, tickets, DNS, billing, or CRM state changes without accountability | External action classes, audit references, source-of-truth boundaries | Yes before mutating integrations |
| Agencies resist adoption if external workflows are ignored | Agencies already have operating systems | GNR8 becomes another isolated tool | Workflow continuity and external memory | No for narrow MVP, yes for adoption scale |
| Digital Business Twin becomes an AI opinion blob | Business truth must be evidence-backed | Recommendations lose trust | Evidence lineage, approvals, editable governed model | No for migration MVP |
| Competing directly with CMS/DXP/builders | Larger incumbents own those categories | Product strategy diffuses | Own website operations layer | Yes |
| Partial DNS/billing mistaken for complete | Launch/commercial plans overpromise | Support and finance failures | Readiness matrices and explicit deferrals | Yes |
| Autonomous regeneration before governance | Client-visible risk is high | Unreviewed changes ship | AI governance, approval, rollback, audit, replay | Yes before regeneration |

## What Must Come Before Implementation

Before the next runtime/product implementation:

- MVP Boundary and Source-of-Truth Matrix.
- Bulk Migration Factory Design.
- Command Center and Ops Inbox Design.
- Domain/DNS Operating Model Decision.
- Audit, Replay, and Failure Recovery Design.

## What Should Be Deferred

- Autonomous AI execution.
- Autonomous regeneration/evolution loops.
- Full DBT productization.
- Full Stripe billing product.
- Full DNS/registrar automation.
- External integration marketplace.
- Agency marketplace.
- Direct competition with CMS/DXP/visual builder categories.

## Recommended Immediate Next Milestone

MVP Boundary and Source-of-Truth Matrix.

Purpose: close the practical MVP boundary, define authority for every relevant artifact/state layer, and prevent future implementation from mixing migration MVP, regeneration, AI, billing, DNS, and external integration ambitions.

## Open Architectural Questions

- Is the first MVP strictly migration/runtime serving, or does any regeneration belong in scope?
- Which public site classes are supported for the first 200-site migration wave?
- Are operator-driven sequential batches sufficient for the first wave, or is queue/worker orchestration required first?
- What is the minimum client approval record before publish?
- What rollback UX is required before launch?
- Which audit events are mandatory before MVP?
- Which external workflow references must be modeled before first client-facing rollout?
- What is the minimum cost visibility needed for 200 sites?
- When should provider execution receive a formal ADR?
- Which bootstrap docs should be updated after architectural review to resolve CAP-1 drift around publish/domain reality?

## Validation Checklist

- Only documentation files are intended to be created or changed.
- No runtime code is intended to be modified.
- No APIs are intended to be modified.
- No migrations are intended to be modified.
- No provider execution, billing, DNS, domains, publishing, thumbnails, Generated Proposal Bundles, Workspace runtime, or Evolution runtime behavior is intended to be modified.
- Future capabilities are marked as future, prepared, partial, or post-MVP.
- MVP capabilities are separated from post-MVP capabilities.
- Integration and Workflow Continuity is treated as a strategic agency adoption requirement.
- AI Operator is governed by deterministic tools, approvals, audit, replay, immutable bundles, and human accountability.
- The recommended next milestone is practical and grounded in the current CAP-1 repository state.

STRAT-1 status: Complete pending final diff validation and architectural review.
