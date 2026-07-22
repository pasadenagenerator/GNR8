# GNR8 MVP Boundary

MVP-1 canonical boundary for the first practical GNR8 MVP. This is a documentation and architecture artifact only. It does not authorize runtime behavior, API changes, schema changes, migrations, provider execution, billing mutation, DNS/registrar mutation, publish/rollback implementation changes, thumbnail changes, Generated Proposal Bundle changes, Workspace runtime changes, Evolution runtime changes, or AI execution.

## Positioning Statement

GNR8 MVP is an operator-assisted migration factory and website operations backbone for static or mostly static public websites. It uses the current repository's strongest evidence: scoped import, rendered capture, static/multi-page import foundations, runtime artifacts, raw-template public serving, content slots and overrides, migration jobs/batches, Command Center foundations, publish activation, rollback primitives, Vercel domain attachment/checking, and cost/audit foundations.

Future GNR8 remains the north star: an AI-native website operations layer for website portfolios. MVP-1 is the execution boundary that prevents future capabilities from being accidentally treated as current launch scope.

## MVP Goal

Support an operator-assisted migration and operations wave for approximately 200 existing static or mostly static public websites. The MVP must make the wave repeatable, inspectable, approval-gated, recoverable, and auditable before broader self-service, autonomous AI, regeneration, DNS automation, billing productization, or marketplace work begins.

## Primary Users

| User | MVP responsibility |
| --- | --- |
| Superadmin | Cross-agency oversight, exceptions, privileged approvals, architecture guardrail enforcement. |
| Agency owner/admin | Client/site portfolio ownership, launch accountability, client approval coordination, cost visibility review. |
| Migration operator | Intake validation, batch execution, failure triage, retry/replay requests, site-class classification. |
| Technical operator | Runtime readiness, domain readiness, publish readiness, rollback readiness, incident triage. |
| Content operator | Slot/override review, draft corrections, content publish request preparation. |
| Client reviewer | Preview review, change requests, content acceptance, launch signoff where required. |
| Account manager | Client communication, blocker follow-up, external workflow references, reporting. |
| System/worker process | Deterministic import/capture/check stages explicitly invoked by approved workflow. |
| Future AI operator | Advisory read-only inspection, summaries, and plans only when evidence-linked and logged. |

## Supported Operating Scenario

An agency or internal operator prepares a portfolio wave of about 200 existing public sites. Each site is classified, entered into a batch, imported through the canonical scoped import path, reviewed through preview/projection surfaces, corrected through content slots/overrides when feasible, approved for launch, connected to an internal or customer domain through controlled Vercel/manual DNS workflow, published by explicit pointer activation, monitored for incidents/cost/readiness, and rolled back through known-good version/content recovery when needed.

The MVP assumes operator involvement at each risk boundary. It does not assume unattended bulk migration, autonomous regeneration, autonomous AI execution, live registrar/DNS mutation, or complete customer billing.

## Why Migration Is The First Wedge

Migration is the first practical wedge because CAP-1 and repository evidence show the most mature system around existing-site import and runtime operation:

- canonical client-scoped import route and scoped import pipeline;
- rendered capture and raw HTML fallback;
- static import and multi-page discovery foundations;
- runtime site versions, immutable artifacts, raw-template artifacts, active serving, and published overrides;
- durable migration jobs/batches and operator-triggered sequential batch execution;
- Command Center migration/hosting surfaces;
- read-only Website Understanding and Source Content and Visual Continuity projections;
- publish activation and rollback primitives;
- Vercel domain attachment/checking and manual DNS instruction foundations;
- cost events, runtime usage events, and partial audit foundations.

The 200-site objective needs operating discipline more than new generation ambition.

## Required MVP Capabilities

| Capability | MVP boundary | Repository evidence |
| --- | --- | --- |
| Agency/client/site ownership | Agency, client, member/RBAC, and site ownership records must anchor all operations. | Ownership migrations, agency/client routes, auth/RBAC modules. |
| Canonical scoped import | New MVP migration work uses the client-scoped import path, not legacy import routes. | `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`, `apps/platform/gnr8/site/scoped-import-pipeline.ts`. |
| Static/multi-page import | Supports public static/mostly static pages with route limits and review. | `apps/platform/gnr8/import/**`, `apps/platform/gnr8/multipage-import/**`. |
| Rendered capture and fallback | Captured evidence is persisted; degraded capture is explicit and review-blocking until accepted. | rendered capture modules, `url-single-page-import.ts`, CAP-1. |
| Runtime artifact store | Runtime truth is versioned site/artifact state plus active pointer and published overrides. | `apps/platform/gnr8/runtime/runtime-store.ts`, ADR-003. |
| Public runtime serving | Public requests resolve from active runtime state and host/domain bindings. | `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/**`. |
| Content slots and overrides | Supports limited migration corrections through draft/published overrides with history. | `gnr8_content_slots`, `gnr8_content_overrides`, content routes. |
| Migration jobs/batches | Operators can create, run, resume, and inspect durable jobs/batches. | `apps/platform/gnr8/migration-factory/**`. |
| Command Center | Primary operator surface for portfolio, batch, site, domain, publish, cost, incident, and recovery status. | `apps/platform/app/gnr8/command-center/**`, Command Center read models. |
| Ops Inbox concept | Derived exception queue for blockers and required work; not a separate source of truth. | Future/partial; required design before implementation. |
| Approval boundary | Launch, publish, rollback, domain action, content publish, exceptions, and cost overrides require human approval. | Provider approval foundations exist; unified MVP approval model remains an architecture decision. |
| Publish activation | Approved version/artifact/content state may become active through explicit publish flow. | Publish route/orchestrator and publish safety checks. |
| Rollback path | Known-good version/content recovery must exist for launched sites. | Rollback switch route and content override history primitives. |
| Domain/DNS boundary | MVP can use controlled Vercel attachment/checking and manual DNS instructions; live registrar/DNS mutation is deferred. | Vercel/domain routes, domain verification worker, Openprovider read-only/control-plane modules. |
| Cost visibility | Operators need internal migration/runtime/AI cost visibility and anomaly handling. | cost events, runtime usage events, billing/cost modules. |
| Audit/replay/failure recovery | Stage events, immutable inputs, diagnostics, approvals, and incident events are required. | ADR-001, ADR-003, migration job/batch events, audit-log foundations. |

## MVP Non-Goals And Deferrals

| Deferred or forbidden capability | MVP treatment |
| --- | --- |
| Autonomous migration | Deferred. Batches are operator-assisted; unattended queue/lease/heartbeat/retry orchestration needs later design. |
| Autonomous regeneration/evolution | Deferred. Evolution surfaces and Generated Proposal Bundles remain review artifacts. |
| Full Digital Business Twin | Deferred. DBT artifacts can inform future strategy but are not MVP runtime truth. |
| Full Stripe billing product | Deferred. MVP includes cost visibility, not checkout, portal, invoices, plan management, or complete customer billing. |
| Full registrar/DNS automation | Deferred and forbidden without ADR. Manual DNS/Vercel checks are the MVP boundary. |
| Openprovider live mutation | Forbidden without explicit ADR and approval/audit design. |
| Full external integration marketplace | Deferred. External references may be designed; external systems remain their own source of truth. |
| Fully autonomous AI operator | Forbidden. AI may be advisory only when logged and evidence-linked. |
| Full visual website builder | Deferred. MVP uses content slots/overrides, not a design canvas. |
| Commerce/auth/custom backend migration | Out of scope except public static marketing pages as import-only/review-only. |
| Treating projections as truth | Forbidden. Review projections, thumbnails, AI outputs, and proposal bundles are not public runtime authority. |

## Architectural Principles

- Deterministic-first: stages use explicit input/output contracts and no silent fallback.
- Immutable evidence: runtime artifacts, generated bundles, thumbnails, AI/provider bundles, and capture refs are immutable or replaced by new records.
- Runtime authority is narrow: active pointer, site version, runtime artifact, and published override state define production serving.
- Derived surfaces stay derived: Command Center, Ops Inbox, previews, WU/VCU, thumbnails, and workspaces expose or project state but do not become truth.
- Human accountability: client-visible, externally mutating, costly, domain, publish, rollback, and provider actions require human approval.
- External systems keep their records: DNS registrars, Vercel, Stripe, CMSs, CRMs, project tools, booking systems, commerce systems, and auth providers remain authoritative for their own domains unless a later ADR adopts a domain.
- Recovery over optimism: every launched site needs rollback or documented recovery before publish.

## Approval Boundaries

| Boundary | Required approval |
| --- | --- |
| Batch start | Migration operator or superadmin after intake validation. |
| Failed-site retry/replay | Migration/technical operator with reason and immutable input refs. |
| Unsupported site-class exception | Superadmin, with client/account acknowledgement when launch risk is client-visible. |
| Content publish | Content operator/agency admin and client reviewer when client-visible. |
| Launch approval | Agency/client approval according to site policy, with preview/readiness evidence. |
| Publish activation | Technical operator or superadmin after launch approval and readiness gates. |
| Rollback | Technical operator or superadmin; emergency rollback may precede client notice but not audit. |
| Domain/Vercel action | Technical operator or superadmin; client action if client controls DNS. |
| Cost exception | Superadmin or agency owner/admin. |
| AI/provider/external mutation | Post-MVP only unless a future ADR permits it. |

No approval may be inferred from preview availability, thumbnail existence, AI/provider output, Generated Proposal Bundle existence, or a UI badge.

## Publish/Rollback Boundaries

Publish in MVP means switching the public runtime to an approved site version/artifact and published override state through the approved publish activation flow. It is not deployment automation, provider execution, AI execution, or regeneration.

Publish requires approved preview evidence, technical readiness, domain readiness or explicit exception, content approval, rollback target or recovery plan, and audit with before/after active pointer refs.

Rollback in MVP means switching back to a known-good runtime version/artifact or reverting published content overrides. Rollback is a governed incident/recovery action, not a replay. It requires reason, incident or change evidence, target version/content history, approval, before/after active pointer or content refs, and post-action verification.

## Domain/DNS Boundaries

MVP may persist GNR8 domain host bindings, compute manual DNS instructions, attach/check Vercel project domains where existing code supports it, and display Vercel-derived domain verification/readiness.

MVP must not claim registrar ownership, live DNS-zone mutation, full DNS automation, Openprovider live write execution, AI-driven DNS changes, or external-provider source-of-truth ownership.

Domain legal/registrar truth remains external. GNR8 records site association, instruction snapshots, readiness checks, and operator/client evidence.

## Cost Visibility Expectations

MVP cost visibility is internal operating visibility: migration cost events, runtime usage events, AI usage events when used, cost centers, thresholds, anomaly flags, and exception approvals. It is not a full Stripe/customer billing product.

Before a 200-site wave, Command Center must expose cost risk enough for operators to pause or escalate batches when thresholds are exceeded.

## Audit, Replay, And Failure Recovery Expectations

Audit is required for intake, import, capture degradation, batch lifecycle, retry/replay, preview, review, content changes, approvals, domain checks, publish, rollback, incidents, cost anomalies, external references, and AI advisory plans when used.

Replay is required for deterministic stages: URL normalization, static/raw import, multi-page discovery from captured input refs, projection generation, and preview generation. Rendered capture is replayable with environmental variance noted. Human approvals, external domain checks, publish activation, rollback, and provider execution are not replayed blindly.

Failure recovery must distinguish intake errors, source/network failures, degraded capture, unsupported site classes, artifact/readiness failures, domain verification failures, publish failures, rollback incidents, and cost anomalies.

## Command Center And Ops Inbox Expectations

Command Center is the primary MVP operator workbench. It must show portfolio status, batch status, site state, import evidence, preview/readiness, site class risk, approval blockers, domain readiness, publish readiness, rollback readiness, incidents, and cost signals.

Ops Inbox is a derived exception queue, not a separate mutable truth store. Work items include intake blocked, import failed, capture degraded, unsupported site class, review needed, content change requested, approval needed, domain action needed, publish ready, publish failed, rollback needed, incident open, cost anomaly, external workflow update, and AI plan review if applicable.

## MVP Risks

- Treating review projections or generated artifacts as production truth.
- Launching unsupported dynamic, commerce, auth, or backend-heavy sites.
- Confusing Vercel domain checks with full DNS/registrar automation.
- Publishing without a canonical approval model.
- Relying on fragmented admin pages instead of Command Center/Ops Inbox.
- Under-specifying replay inputs and failure recovery for 200 sites.
- Overclaiming Stripe/customer billing readiness from cost-event foundations.
- Allowing AI/provider outputs to mutate runtime state before governance.

## Open Architecture Decisions

1. Canonical MVP approval persistence model.
2. Unified audit event taxonomy and whether existing event stores are federated or consolidated.
3. Exact active pointer/publish event authority across runtime store and site publish events.
4. Replay input bundle contract for deterministic stages.
5. Bulk intake format, dry-run contract, batch pause/resume semantics, retries, leases, and heartbeat decisions.
6. Ops Inbox read-model and work-item ownership contract.
7. Domain/DNS stale-status policy and manual DNS completion evidence.
8. Cost threshold/anomaly policy for a 200-site wave.
9. External workflow reference model.
10. AI advisory input/output bundle requirements before any AI-assisted MVP use.

## Required Conclusion

GNR8 MVP is an operator-assisted migration factory and website operations backbone for static or mostly static public websites, designed to migrate and operate approximately 200 existing websites with deterministic workflows, explicit source-of-truth boundaries, auditability, recovery paths, and controlled human approvals.
