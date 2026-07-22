# Future GNR8 Platform Pillars

STRAT-1 canonical architecture pillars for Future GNR8. These pillars describe the target architecture and do not claim that the full platform is implemented today.

## Status Model

- Current: implemented or partially implemented in the CAP-1 baseline.
- Prepared: contracts, scaffolds, projections, or read-only/control-plane paths exist.
- Future: target capability with little or no current product implementation.
- MVP: required or strongly recommended for the first operator-assisted migration MVP.
- Post-MVP: should follow the migration MVP unless explicitly pulled forward by an architectural decision.

## Pillar Summary

| Pillar | Current status | MVP relevance | Recommended order |
| --- | --- | --- | --- |
| Website Operations Backbone | Current/partial | Required | 1 |
| Migration Factory | Current/partial | Required | 2 |
| Command Center and Ops Inbox | Current/partial | Required | 3 |
| Integration and Workflow Continuity Layer | Future/prepared concept | Strategic, design before integration MVP | 9 |
| External Workflow Memory | Future | Post-MVP foundation | 10 |
| AI Operator Layer | Prepared/ambiguous | Governance design before execution | 11 |
| Policy and Permission Engine | Current/partial | Required | 4 |
| Client Collaboration Portal | Future/partial approval concepts | Basic boundary required | 8 |
| Reporting and Account Management Layer | Partial cost foundations | Strongly recommended | 7 |
| Digital Business Twin | Prepared | Defer productization | 12 |
| Online Growth and Advisory Layer | Future/prepared business artifacts | Post-MVP | 13 |
| Marketplace and Playbooks | Future | Post-MVP | 14 |
| Agency Portfolio OS | Future/current foundations | Long-term north star | 15 |
| Regeneration and Evolution | Prepared/partial | Defer autonomous execution | 16 |

## Website Operations Backbone

Purpose: Provide the canonical operating record for agencies, clients, sites, site versions, runtime artifacts, active serving, content edits, publish state, rollback, domains, costs, health, and audit.

Target users: Operators, agency owners, technical leads, support, account managers.

Operator value: Gives every site an inspectable operational record instead of scattered admin pages.

Agency value: Creates trust that a portfolio can be migrated, launched, monitored, edited, and recovered.

Technical value: Anchors state around durable Postgres records, immutable artifacts, active pointers, host bindings, diagnostics, and audit events.

Current repository evidence: `apps/platform/gnr8/runtime/runtime-store.ts`, public runtime route, content APIs, publish orchestrator, rollback route, hosting operations, cost event logging, ownership/auth modules.

Current status: Current/partial. Runtime, publish, content, domain binding, cost, and ownership foundations exist; unified operations source-of-truth remains incomplete.

MVP relevance: Required.

Dependencies: Source-of-truth matrix, policy/permissions, audit log consistency, Command Center consolidation.

Risks: Mutable provenance summaries, unclear approval state, partial rollback workflow, fragmented operational pages.

Recommended implementation order: First architecture milestone after STRAT-1: MVP Boundary and Source-of-Truth Matrix.

## Migration Factory

Purpose: Convert existing public websites into durable GNR8 runtime sites through repeatable intake, capture, import, multi-page discovery, QA, preview, approval, publish, and recovery.

Target users: Migration operators, implementation teams, agency delivery managers.

Operator value: Turns one-off imports into manageable portfolio migration runs.

Agency value: Makes migration the practical adoption wedge for clients with many existing sites.

Technical value: Builds on deterministic import, rendered capture, static import, migration jobs, batches, observability, and replay.

Current repository evidence: `apps/platform/gnr8/site/scoped-import-pipeline.ts`, canonical import route, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/multipage-import/**`, `apps/platform/gnr8/migration/**`, `apps/platform/gnr8/migration-factory/**`.

Current status: Current/partial. Core pipeline and operator-driven batches exist; bulk intake, queue/retry/leases/heartbeat, safe bulk actions, and recovery console are incomplete.

MVP relevance: Required and first product wedge.

Dependencies: Portfolio/site model clarity, bulk intake, Command Center, audit/replay, domain model, approval boundary.

Risks: Overbuilding regeneration before migration throughput; unsupported dynamic sites; capture failures; manual bottlenecks.

Recommended implementation order: Design second, implement after boundary, Command Center/Ops Inbox, domain, and audit/replay decisions.

## Command Center And Ops Inbox

Purpose: Consolidate site, migration, hosting, domain, approval, failure, cost, and external workflow work into one operator workbench and exception inbox.

Target users: Operators, support, delivery leads, agency managers.

Operator value: Gives a daily queue for what needs attention now.

Agency value: Reduces coordination overhead and launch risk across many clients.

Technical value: Forces read models, diagnostics, audit, and action boundaries into one coherent control plane.

Current repository evidence: `apps/platform/app/gnr8/command-center/**`, `apps/platform/gnr8/command-center/**`, migration batch observability, hosting operations pages.

Current status: Current/partial. Command Center exists, but pages are still fragmented and Ops Inbox is future.

MVP relevance: Required.

Dependencies: Migration Factory read models, hosting operations, approval state, domain readiness, cost signals, audit/replay.

Risks: Too many disconnected admin pages; chat UI mistaken for architecture; missing recovery actions.

Recommended implementation order: Third milestone, before large implementation.

## Integration And Workflow Continuity Layer

Purpose: Connect GNR8 to external agency systems without requiring immediate workflow replacement.

Target users: Agency operators, project managers, account managers, client stakeholders.

Operator value: Lets operators see client/project/tool state beside site operations.

Agency value: Lowers adoption friction by preserving existing workflows.

Technical value: Defines connector boundaries, external record references, external state snapshots, task creation, update ingestion, and audit references.

Current repository evidence: CAP-1 did not identify a complete external integration product. Related foundations exist in domains/providers, billing, auth, runtime records, and audit concepts.

Current status: Future/prepared concept.

MVP relevance: Strategic adoption requirement; architecture should be designed before external integration implementation. Not required for the first narrow migration implementation.

Dependencies: External record model, source-of-truth matrix, audit, policy engine, Command Center/Ops Inbox.

Risks: Integrations becoming ungoverned side effects; agencies resisting adoption if external workflows are ignored.

Recommended implementation order: After migration MVP foundations and client approval boundary; before marketplace.

Required categories: CMS, project management, communication, CRM, analytics, support, billing/accounting, file storage, DNS/domain providers, deployment/repository systems.

Required external workflow behavior: read state, link records to sites, create tasks, receive updates, summarize status, preserve audit references, track approvals, and avoid becoming external source of truth unless explicitly adopted.

## External Workflow Memory

Purpose: Preserve durable references to external decisions, tasks, approvals, messages, files, tickets, analytics snapshots, and provider state.

Target users: Operators, account managers, support, agency principals.

Operator value: Gives context for why a site is blocked or ready.

Agency value: Makes GNR8 a memory layer across client work without replacing every tool.

Technical value: Adds external entity references, snapshots, sync status, provenance, and immutable audit bundles.

Current repository evidence: No complete CAP-1 product evidence. Adjacent audit, provider, billing, domain, and runtime provenance foundations exist.

Current status: Future.

MVP relevance: Post-MVP foundation, but the source-of-truth matrix should reserve the boundary now.

Dependencies: Integration layer, audit model, permissions, data retention policy.

Risks: Becoming a stale duplicate of external systems; storing sensitive client data without governance.

Recommended implementation order: After Integration and Workflow Continuity architecture.

## AI Operator Layer

Purpose: Assist operators with inspection, summaries, recommendations, plans, drafts, deterministic actions, and approval-gated actions across website operations.

Target users: Operators, agency leads, support, account managers.

Operator value: Reduces repetitive analysis and planning while preserving human control.

Agency value: Improves throughput without hiding responsibility from the agency.

Technical value: Formalizes action classes, deterministic tools, immutable input/output bundles, audit, replay, dry-run, approval, and forbidden actions.

Current repository evidence: `apps/platform/app/api/gnr8/ai/**` route surface is ambiguous; ADR-001 and ADR-003 establish deterministic and immutable artifact guardrails; provider payload/control-plane modules exist but execution is gated.

Current status: Prepared/ambiguous.

MVP relevance: Governance architecture required before execution; AI execution should not be first implementation milestone.

Dependencies: Policy engine, audit log, replay model, deterministic tool registry, immutable AI/provider bundles, cost visibility.

Risks: Treating AI output as deterministic; hidden side effects; autonomous publish/domain/provider actions; cost surprises.

Recommended implementation order: Governance architecture after migration MVP designs, before any AI execution productization.

## Policy And Permission Engine

Purpose: Govern who can inspect, edit, approve, publish, rollback, connect domains, execute provider actions, mutate external workflows, and run AI actions.

Target users: Platform admins, agency owners, operators, clients, auditors.

Operator value: Clarifies what each user can safely do.

Agency value: Enables client collaboration without exposing dangerous controls.

Technical value: Provides role-based authorization, action classification, approval gates, and audit consistency.

Current repository evidence: Supabase auth, RBAC, agency action access, superadmin guards, authorization modules, provider approvals, publish requires approved state.

Current status: Current/partial.

MVP relevance: Required.

Dependencies: Source-of-truth matrix, client approval boundary, audit log, AI action classes.

Risks: Route-level gaps, inconsistent action authorization, approval bypasses.

Recommended implementation order: Alongside MVP boundary and before client-facing controls.

## Client Collaboration Portal

Purpose: Let clients review migrated sites, request changes, approve content/launch, see status, and provide business context without entering internal operator tools.

Target users: Client stakeholders, account managers, operators.

Operator value: Creates a clear handoff and approval boundary.

Agency value: Reduces email chaos and provides accountable signoff.

Technical value: Separates client-visible state from internal diagnostics and controls.

Current repository evidence: Client dashboard components, content APIs, auth/onboarding, business approval documentation; CAP-1 found broad business approval mostly documented only.

Current status: Future/partial.

MVP relevance: Basic approval boundary required; full portal can follow.

Dependencies: Policy engine, preview runtime, publish state, audit, external workflow links.

Risks: Clients approving the wrong artifact; exposing private thumbnails/generated proposal previews as source truth.

Recommended implementation order: After Command Center MVP design and before broad launch.

## Reporting And Account Management Layer

Purpose: Provide portfolio health, migration status, domain readiness, launch risk, runtime usage, cost, margin, and client/account reporting.

Target users: Agency principals, account managers, finance/admin, operators.

Operator value: Shows operational and cost risk before it becomes client pain.

Agency value: Supports profitability, account reviews, and client communication.

Technical value: Aggregates existing cost events, runtime usage, migration state, hosting status, and external workflow snapshots.

Current repository evidence: `apps/platform/gnr8/billing/**`, runtime usage logging, Stripe webhook/entitlements, Command Center read models, hosting operations.

Current status: Partial.

MVP relevance: Strongly recommended for cost visibility; full account reporting can follow.

Dependencies: Cost center mapping, runtime usage event quality, portfolio model, external workflow memory.

Risks: Mistaking debug billing foundations for a complete billing product.

Recommended implementation order: Cost visibility before 200-site migration; full account management after MVP launch.

## Digital Business Twin

Purpose: Maintain a governed model of the client's business, offer, audience, proof, constraints, website role, and growth context.

Target users: Strategists, account managers, operators, future AI advisor.

Operator value: Provides context for redesign, regeneration, and advisory work.

Agency value: Turns website operations into business-aware account management.

Technical value: Creates a typed business model that future recommendations and generation can reference.

Current repository evidence: `digital-business-twin-*` contracts, builders, persistence, runtime twin modules, twin preview pages.

Current status: Prepared.

MVP relevance: Defer full productization unless regeneration is in MVP.

Dependencies: Business Discovery, WU, VCU, approval model, source-of-truth matrix.

Risks: Digital Business Twin becoming an AI opinion blob rather than governed evidence-backed business state.

Recommended implementation order: After migration MVP and approval/reporting foundations.

## Online Growth And Advisory Layer

Purpose: Recommend improvements, experiments, content changes, SEO fixes, conversion work, and account opportunities using site operations plus business context.

Target users: Account managers, strategists, clients.

Operator value: Converts operational observations into next actions.

Agency value: Creates recurring value beyond launch.

Technical value: Uses analytics, DBT, runtime state, workflow memory, and policy-governed AI recommendations.

Current repository evidence: Business artifact chain, evolution analysis docs/routes, AI route surface; no complete product workflow in CAP-1.

Current status: Future/prepared.

MVP relevance: Post-MVP.

Dependencies: DBT, integrations, analytics, policy engine, AI governance.

Risks: Producing generic advice without evidence; recommending changes that cannot be executed or audited.

Recommended implementation order: After DBT and integration foundations.

## Marketplace And Playbooks

Purpose: Package repeatable migration, launch, QA, reporting, integration, and growth workflows as governed playbooks and, later, marketplace offerings.

Target users: Agencies, implementation partners, GNR8 operators.

Operator value: Standardizes repeatable procedures.

Agency value: Lets agencies scale consistent services across client portfolios.

Technical value: Encodes task sequences, allowed actions, validation gates, dependencies, and audit requirements.

Current repository evidence: Migration factory, Command Center, provider handoff planning, template intake, docs; no marketplace product evidence.

Current status: Future.

MVP relevance: Defer full marketplace; internal playbooks may support MVP operations.

Dependencies: Workflow engine, policy, audit, integrations, reporting.

Risks: Marketplace before stable MVP produces unsupported promises.

Recommended implementation order: Internal playbooks after migration MVP; marketplace after repeatable customer proof.

## Agency Portfolio OS

Purpose: Become the agency operating system for managing many client websites across migration, operations, support, reporting, approvals, integrations, and improvement.

Target users: Agencies and multi-site organizations.

Operator value: One system for portfolio work rather than per-site firefighting.

Agency value: Makes website services scalable, governable, reportable, and AI-assisted.

Technical value: Combines the operations backbone, workflow memory, policy, reporting, DBT, playbooks, and AI governance into one operating graph.

Current repository evidence: Agency/client model, site/runtime model, Command Center, migration batches, hosting operations, cost foundations, review projections.

Current status: Future direction with current foundations.

MVP relevance: North star, not MVP scope.

Dependencies: All prior pillars.

Risks: Collapsing north-star ambition into MVP and overbuilding before migration proof.

Recommended implementation order: Emerges after repeated MVP migrations and integration/reporting layers.

## Regeneration And Evolution

Purpose: Enable governed redesign, regeneration, improvement, comparison, approval, and publishing of website changes after migration.

Target users: Operators, strategists, clients, future AI operator.

Operator value: Enables improvement cycles after a site is captured and running.

Agency value: Creates recurring growth and modernization services.

Technical value: Uses WU, VCU, DBT, WDB, WGP, generated bundles, thumbnails, compliance reports, provider outputs, approvals, audit, replay, and publish governance.

Current repository evidence: Business/DBT/WDB/WGP chain, generated proposal bundle durability, thumbnails, Generation Evolution Dashboard, provider payload foundations, AI route surface.

Current status: Prepared/partial; autonomous evolution documented only.

MVP relevance: Defer autonomous regeneration. Read-only review artifacts can support QA, but not first implementation priority.

Dependencies: AI governance, provider execution ADR, immutable provider bundles, approval, cost, rollback.

Risks: Autonomous AI execution without governance; treating generated proposal bundles as production truth; provider output mistaken for deterministic output.

Recommended implementation order: After migration MVP and AI governance architecture.
