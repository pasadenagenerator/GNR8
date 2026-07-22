# GNR8 MVP Boundary

MVP-1 canonical boundary for the first practical GNR8 MVP.

This is a documentation and architecture artifact only. It does not authorize runtime behavior, API changes, migrations, provider execution, DNS mutation, billing mutation, publishing changes, rollback changes, thumbnail changes, Generated Proposal Bundle changes, Workspace runtime changes, Evolution runtime changes, or autonomous AI execution.

## Positioning Statement

GNR8 MVP is an operator-assisted migration factory and website operations backbone for static or mostly static public websites, designed to migrate and operate approximately 200 existing websites with deterministic workflows, auditability, clear source-of-truth boundaries, and controlled human approvals.

Future GNR8 remains the north star: an AI-native website operations platform that connects website migration, runtime operations, client workflows, external tools, and business intelligence into one governed operating layer for agencies and multi-site organizations. MVP-1 does not collapse that full strategy into the first implementation boundary.

## MVP Is

| Attribute | MVP meaning |
| --- | --- |
| Migration-first | The first value proof is repeatable intake, import, review, launch, monitoring, and recovery for an internal portfolio of about 200 existing public websites. |
| Operator-assisted | Human operators initiate batches, triage failures, accept exceptions, approve launch actions, and own client/domain/publish safety. |
| Portfolio-aware | Command Center must show portfolio, batch, site, domain, approval, cost, incident, and recovery state across many sites, not only one-site workflows. |
| Deterministic where possible | Import, capture, artifact construction, projections, readiness, DNS instructions, publish readiness, and replayable stages must be deterministic or explicitly marked degraded/non-replayable. |
| Audit-focused | Operational decisions must write clear audit events and preserve evidence used for approvals. |
| Safe for client/domain/publish operations | Client-visible changes, publish activation, rollback, domain attachment, DNS instructions, and cost exceptions require approval and visible state. |
| Internal 200-site migration first | MVP optimizes throughput and risk control for a known migration wave before broad self-service. |
| Compatible with later agency adoption | The data model must preserve agency/client/site ownership, client approvals, external references, and future integration boundaries. |

## MVP Is Not

| Not MVP | Boundary |
| --- | --- |
| Full Future GNR8 | Strategic pillars remain staged future work unless required for migration operations. |
| Autonomous AI regeneration | AI may inspect, summarize, recommend, or draft plans. It must not execute regeneration or mutate runtime state in MVP. |
| Full DXP | GNR8 does not own enterprise CMS personalization, complex content modeling, or cross-channel publishing in MVP. |
| Visual website builder | Content slots and practical overrides may be used. A large design canvas is deferred. |
| Full DNS registrar automation | Vercel attachment/checks and manual DNS instructions may be MVP; registrar/DNS mutation is deferred. |
| Full Stripe/customer billing product | Cost visibility is MVP-relevant. Customer checkout, invoicing, portals, and full plan management are not MVP. |
| Full agency marketplace | No marketplace, broad template economy, or partner marketplace is included. |
| General automation platform | External workflow references may be tracked; arbitrary connector automation is deferred. |
| Autonomous AI operator | Future AI operator remains non-autonomous in MVP and approval-gated after MVP. |

## Current Repository Evidence

| Area | Evidence reviewed | MVP implication |
| --- | --- | --- |
| CAP-1 inventory | `docs/product/gnr8-current-capability-inventory.md`, `docs/product/gnr8-capability-inventory-closeout.md` | Current repo is closest to an operator-assisted migration factory and runtime backbone; gaps are workflow consolidation, bulk intake, audit/replay, and clear boundaries. |
| Operator map | `docs/product/gnr8-operator-capability-map.md` | Operator capabilities exist across import, Command Center, hosting, content, review, billing/cost, DNS/provider surfaces, but need MVP classification. |
| Technical map | `docs/architecture/gnr8-technical-capability-map.md` | Scoped import, runtime artifacts, public runtime, publish activation, rollback primitives, Vercel domain binding, cost events, provider control-plane, and AI route surfaces have mixed readiness. |
| MVP readiness | `docs/product/gnr8-mvp-readiness-map.md` | Operator-assisted static/mostly static migration is plausible; autonomous regeneration, full DNS, and full billing are not. |
| STRAT-1 north star | `docs/product/future-gnr8-north-star.md`, `docs/product/future-gnr8-mvp-bridge.md`, `docs/architecture/future-gnr8-platform-pillars.md`, `docs/product/future-gnr8-competitive-positioning.md`, `docs/product/future-gnr8-strategy-closeout.md` | Future direction is website operations layer; MVP is the migration-first wedge. |
| Current bootstrap | `docs/ai/GNR8_CURRENT_STATE.md`, `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`, `docs/ai/MIGRATION_RUNTIME_PROGRESS.md` | Current-state docs reinforce deterministic, evidence-first boundaries and warn against provider/DNS/AI execution, while some live Vercel domain and publish activation code now exists. |
| ADRs | `docs/ai/decisions/ADR-001-deterministic-pipeline.md`, `docs/ai/decisions/ADR-003-runtime-artifact-model.md` | MVP must preserve deterministic-first pipeline and immutable artifact/evidence model. |

## User Roles

| Role | Can inspect | Can request | Can approve | Can execute | Must not execute in MVP | Audit requirements |
| --- | --- | --- | --- | --- | --- | --- |
| Superadmin | All agencies, clients, sites, batches, domains, cost, audit, provider control-plane, readiness, incidents | Batch creation, retries, site exceptions, domain checks, publish/rollback review, cost investigations | Global exceptions, unsupported site-class exceptions, publish/rollback if delegated, billing/cost exception review | Administrative read-model actions and approved operator actions | Hidden provider execution, live DNS mutation, billing mutation, autonomous AI actions | All privileged requests, approvals, overrides, incident actions, and exception decisions must write actor-scoped audit events. |
| Agency owner/admin | Own agency, clients, sites, approvals, domain readiness, cost visibility | Client/site intake, content review, launch approval, domain action, reporting | Agency/client launch approval where policy permits, content acceptance, cost exception acknowledgement | Agency-scoped non-destructive workflow actions | Superadmin-only cross-agency changes, provider execution, registrar/DNS mutation, Stripe mutation | Agency-scoped request/approval events and client-visible decisions. |
| Migration operator | Assigned batches/sites, import evidence, failures, preview state, readiness blockers | Batch dry-run/start, retry, replay, pause/resume, unsupported-site review | Failed-site retry, batch continuation within policy | Operator-triggered import/batch actions allowed by MVP design | Publish activation, rollback, DNS mutation, billing mutation, AI/provider execution | Batch/site stage events, retry/replay requests, failure classifications, manual decisions. |
| Technical operator | Runtime artifacts, readiness, domains, DNS instructions, SSL/provider read state, incidents | Domain recheck, publish readiness check, rollback recommendation, incident escalation | Technical readiness, rollback recommendation, manual DNS completion evidence | Readiness checks, Vercel domain attachment/checks if approved by MVP policy | Registrar/DNS mutation, autonomous publish, unapproved rollback | Domain checks, readiness decisions, publish/rollback recommendations, incidents. |
| Content operator | Content slots, draft/published overrides, preview, client comments | Content changes, draft save, content publish approval request | Content change readiness if policy allows | Draft override edits and approved content publish actions | Site publish activation, domain changes, AI-generated content acceptance without human review | Content change request, draft save, publish, rollback, and client acceptance events. |
| Client reviewer | Their sites, previews, requested content changes, launch checklist, domain instructions relevant to them | Content changes, launch signoff clarification, domain action clarification | Client review, content acceptance, launch signoff when required | Review completion and comments only | Runtime mutation, publish activation, rollback, DNS/provider/billing changes | Client review completion, approval/rejection, requested changes, evidence shown. |
| Account manager | Portfolio/account status, approvals, cost summaries, external workflow refs, incidents | Client approval, content follow-up, external workflow link, report | Client-facing readiness acknowledgement; not technical publish unless delegated | Reporting/status updates and external reference linking | Technical import execution, DNS mutation, publish/rollback, billing mutation | Client communication, approval chase, external reference links, account decisions. |
| System/worker process | Assigned job payloads, deterministic inputs, scoped runtime state | None as a human actor | None | Deterministic import/capture/template/domain-check jobs explicitly scheduled by approved workflow | Provider execution, autonomous publish/rollback/DNS/billing/AI mutation | Every automated stage writes machine actor, input refs, output refs, diagnostics, status, and correlation ID. |
| Future AI operator | Read-only evidence, summaries, plans, recommendations, advisory diffs | Human review of generated plans or content | Nothing directly in MVP | Read-only inspection, summarization, recommendations, dry-run plans if logged | Autonomous AI actions, provider execution, runtime mutation, publish, rollback, DNS, billing, regeneration | AI/provider input bundle and output bundle must be immutable for any AI plan/content used in review. |

## Capability Boundary

Classifications:

- Required for MVP: must exist before first 200-site implementation is considered ready.
- Strongly recommended for MVP: not strictly launch-blocking, but materially reduces operator risk.
- Design-only before MVP: architecture/contract required before implementation expands.
- Explicitly deferred after MVP: not part of first migration MVP.
- Forbidden before explicit ADR: must not be implemented or enabled without a new architectural decision.

| Capability | MVP classification | Operator value | Current repository status | Source-of-truth dependency | Implementation dependency | Risk if included too early | Risk if deferred | Recommended decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Client-scoped import | Required for MVP | Keeps migrated site under agency/client/site ownership | Implemented via agency client site import route and runtime site version linkage | `sites`, `organizations`, `gnr8_runtime_site_versions` | Existing scoped import route and runtime store | Low if constrained | MVP cannot operate portfolio safely | Include as canonical intake path. |
| Bulk intake | Required for MVP | Enables 200-site migration planning | Partially represented by migration batches; broad CSV/intake product unclear | Migration batch and job tables | Bulk factory design next | Bad data creates batch failures | One-off imports will not scale | Design and implement after MVP-1. |
| Rendered capture | Required for MVP | Captures evidence beyond raw HTML | Implemented worker/job foundations and evidence projections | Runtime site version provenance and render jobs | Worker capture path | Capture flakiness blocks too many sites | Poor fidelity review | Include with degraded-state handling. |
| Raw HTML fallback | Required for MVP | Keeps static migration viable when rendered capture degrades | Raw-template artifacts and files exist | `gnr8_runtime_raw_template_artifacts`, artifact files, site version provenance | Static/raw template runtime | False confidence if scripts needed | Many simple sites fail unnecessarily | Include with explicit capture_degraded state. |
| Static import | Required for MVP | Core migration engine | Implemented foundations | Runtime artifacts, raw templates, migration jobs | Scoped import pipeline, worker import runtime | Overclaiming dynamic fidelity | MVP has no core | Include for static/mostly static sites. |
| Multi-page discovery | Required for MVP | Migrates real brochure sites | Implemented through Phase 7B/7C docs | Route maps and site version provenance | Discovery expansion runtime | Bad route explosion | Single-page MVP is insufficient | Include with route limits and review. |
| Migration batches | Required for MVP | Portfolio throughput and tracking | Durable jobs/batches exist | `gnr8_migration_batches`, jobs, batch events | Migration factory stores/executor | Unattended assumptions | No 200-site control | Include operator-driven batches. |
| Batch dry-run | Strongly recommended for MVP | Shows expected workload and failures before execution | Design/readiness implied, not complete product | Batch plan/projection | Bulk factory design | Operators trust unverified plans | More failed starts | Require design before implementation. |
| Batch pause/resume | Required for MVP | Allows controlled recovery | Operator-driven run/resume exists; pause semantics need confirmation | Batch status/events | Batch executor/store | State machine complexity | Incidents affect whole batch | Include explicit state and audit. |
| Retry/replay | Required for MVP | Recovers from transient failures | Retry/resume primitives exist; unified replay boundary incomplete | Job/stage events, immutable inputs | Stage runners/stores | Non-deterministic replay hides drift | Manual toil | Include deterministic replay minimum. |
| Failure recovery | Required for MVP | Keeps migration wave moving | Observability exists; unified recovery policy incomplete | Batch/job events, Ops Inbox | Command Center/Ops Inbox design | Operators override unsafe failures | Stalled portfolio | Define before implementation. |
| Command Center | Required for MVP | Primary operator workbench | Implemented foundations for batches and hosting | Read model from canonical tables | `apps/platform/gnr8/command-center/**` | UI becomes source of truth | Operators lack control surface | Make primary MVP operator surface. |
| Ops Inbox | Required for MVP | Exception queue for operators | Not found as complete named product | Work items derived from canonical state | Command Center design | Work items mutate truth directly | Failures get buried | Design as derived queue. |
| WU projection | Strongly recommended for MVP | Helps review source-site understanding | Implemented projection | Site version provenance | Architecture projection builders | Mistaken for business truth | Less review context | Read-only projection, not canonical truth. |
| VCU projection | Strongly recommended for MVP | Helps review visual/content continuity | Implemented projection | Site version provenance | Projection builders/loaders | Mistaken for launch authority | Less fidelity review | Read-only review aid. |
| Knowledge Workspace | Strongly recommended for MVP | Site-level drilldown | Implemented read-only/product surface | Projections from runtime artifacts | Workspace pages/read models | Becomes fragmented operator surface | Operators lose deep context | Drilldown from Command Center, not primary. |
| Thumbnails | Strongly recommended for MVP | Fast visual triage | Implemented as private immutable presentation artifacts | `importProvenanceSummary` artifact refs | Thumbnail builder/materializer | Presentation mistaken for truth | Slower review | Use as presentation-only; no code changes now. |
| Content slots | Required for MVP | Safe limited content correction | Implemented | `gnr8_content_slots` | Content binding/resolution | Overbuilt CMS | No minor fixes | Include for simple text/image slot review. |
| Draft overrides | Required for MVP | Allows operator/client changes before publish | Implemented | `gnr8_content_overrides` status draft | Content routes/runtime | Unreviewed changes accumulate | No content correction | Include with audit and approval. |
| Published overrides | Required for MVP | Applies accepted content edits | Implemented | Published overrides and history | Runtime content binding | Publishing content without signoff | Drafts never ship | Include only after approval. |
| Content rollback | Required for MVP | Recovers bad content edit | Implemented route/history foundations | Override history | Content rollback route | Confusing with site rollback | Bad content persists | Include as approval-gated recovery. |
| Preview runtime | Required for MVP | Review before launch | Implemented | Runtime site version/artifacts/overrides | Preview rendering routes | Preview treated as public truth | Cannot review | Include. |
| Public runtime | Required for MVP | Serves active migrated site | Implemented | Active site version/artifact/published overrides | Public runtime render | Publish too early | No launch path | Include with readiness gates. |
| Publish activation | Required for MVP | Makes approved artifact active | Implemented foundations | Site version lifecycle and active pointer | Publish route/orchestrator | Unapproved client-visible launch | MVP cannot launch | Include with approval/audit. |
| Rollback | Required for MVP | Incident recovery | Rollback primitives exist; UI incomplete | Active pointer/version history | Rollback switch/API | Unsafe rollback without evidence | No recovery path | Include with approval and incident flow. |
| Domain binding | Required for MVP if custom domains launch | Connects customer domain to runtime | Vercel/domain host binding exists | `sites.domain`, `gnr8_runtime_domain_host_bindings` | Vercel route, domain lifecycle | Overclaiming registrar control | Manual launch toil | Include Vercel attachment/checks and manual steps. |
| DNS instructions | Required for MVP if custom domains launch | Gives manual DNS steps | Implemented computation/persistence | Domain host bindings instruction fields | Vercel DNS instruction lib | Instructions outdated | Domain launch blocked | Include as operator evidence. |
| Vercel domain verification | Required for MVP if custom domains launch | Checks readiness | Implemented route/worker | Domain host bindings, external Vercel state | Vercel client, worker job | External false assumptions | Domains remain unknown | Include as external verification projection. |
| Openprovider/domain provider mutation | Forbidden before explicit ADR | Future automation | Read-only/control-plane/sandbox only | External provider state, provider handoff tables | Provider control-plane | Live DNS/registrar damage | Manual domain effort | Defer; forbid live mutation. |
| Cost visibility | Strongly recommended for MVP | Spots migration/runtime spend | Cost events/unified views exist | `ai_usage_events`, `runtime_usage_events`, `migration_cost_events`, cost centers | Billing services | Overclaim billing product | Cost overruns | Include internal visibility. |
| Billing/Stripe customer product | Explicitly deferred after MVP | Future monetization | Stripe webhook/entitlements only | `subscriptions`, entitlements, Stripe external system | Billing services | Commercial/support failure | Manual billing ops | Defer full product. |
| Client approval | Required for MVP | Launch trust | Foundations vary; needs explicit model | Approval events/records to be designed | Client portal/approval boundary | Publish without signoff | Operators become bottleneck | Include minimum approval record. |
| Client portal | Strongly recommended for MVP | Client review surface | Client dashboard exists, full portal unclear | Client membership/site read models | Client UI | Overbuild collaboration suite | Review via external tools | Minimum review/signoff only. |
| Reporting/account management | Strongly recommended for MVP | Portfolio communication | Partial cost/dashboard foundations | Read models, external refs | Command Center/account views | Product sprawl | Weak client ops | Include summary reporting after core flow. |
| External workflow references | Strongly recommended for MVP | Keeps agency workflows connected | Strategy docs require; implementation unclear | External reference table not canonical yet | Design before integrations | External mutation drift | Work disconnected | Track references only if designed; no mutation. |
| External integrations | Explicitly deferred after MVP | Future workflow continuity | No full marketplace | External systems of record | Integration architecture | Broad connector sprawl | Manual duplicate updates | Defer after migration MVP. |
| AI read-only inspection | Strongly recommended for MVP | Faster review | AI routes exist; product integration unclear | Immutable input/output bundles | AI governance design | Chat treated as authority | Operators do manual triage | Allow only read-only/advisory if logged. |
| AI summarization | Strongly recommended for MVP | Summarizes evidence and blockers | AI route surface exists | Immutable input/output bundles | AI governance | Hallucinated truth | Slower triage | Advisory only, evidence-linked. |
| AI recommendation | Design-only before MVP | Helps prioritization | Future strategy | Immutable input/output bundles | AI governance | Recommendations mutate state | Less assistance | Design only before execution. |
| AI planning | Design-only before MVP | Drafts migration/DNS/rollback plans | Future strategy | Immutable input/output bundles | AI governance | Plans mistaken for approvals | Manual planning | Dry-run/advisory only. |
| AI execution | Forbidden before explicit ADR | Future automation | Not governed | None approved | AI operator governance | Unaccountable mutation | None for MVP | Forbid. |
| Provider payload generation | Explicitly deferred after MVP | Future regeneration handoff | Implemented export-only/payload builders | Provider input bundle | Architecture provider payload modules | Generation mistaken for MVP | No impact on static migration | Keep export-only and non-MVP. |
| Provider execution | Forbidden before explicit ADR | Future provider actions | Explicitly disabled/gated | Provider jobs/handoffs if ever approved | Provider worker | External side effects | None for MVP | Forbid. |
| Digital Business Twin | Explicitly deferred after MVP | Future advisory/business intelligence | Broad artifacts exist, incomplete product | Projection/artifact chain | DBT modules | AI opinion blob becomes truth | Less strategy context | Defer productization. |
| Advisory layer | Explicitly deferred after MVP | Future account growth | Strategy only/partial | DBT/evidence | Governance/reporting | Distracts from migration | Less upsell | Defer. |
| Regeneration/evolution | Explicitly deferred after MVP | Future redesign loop | Evolution dashboards/proposals exist | Generated artifacts, provider bundles | AI/provider governance | Ships ungoverned AI output | Static migration only | Defer until governed. |

## Approval Boundary

| Approval type | Who can approve | Evidence required | Client approval required | Operator approval sufficient | MVP/post-MVP | Audit event | Action blocked without approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Migration batch start | Superadmin or migration operator | Batch list, site classes, dry-run summary, known blockers | No | Yes | MVP | `migration_batch_start_approved` | Batch execution. |
| Failed site retry | Migration operator; technical operator for technical failures | Failure log, prior input refs, retry reason | No | Yes | MVP | `failed_site_retry_approved` | Retry/replay. |
| Unsupported site-class exception | Superadmin | Site-class evidence, risk, manual handling plan | Sometimes if client-visible compromise | No, unless superadmin is approver | MVP | `unsupported_site_exception_approved` | Import/launch continuation. |
| Content change | Content operator or agency admin | Diff, preview, requested change source | Yes when client requested or launch-visible | Yes for internal correction before client review | MVP | `content_change_approved` | Published override/content publish. |
| Client review | Client reviewer or agency admin acting on client record | Preview, content changes, known limitations, launch checklist | Yes | No when client signoff is required | MVP | `client_review_completed` | Launch approval. |
| Launch approval | Agency owner/admin, account manager if delegated, client reviewer if policy requires | Final preview, readiness, domain status, rollback plan | Yes for client-owned launches | No for external client launch unless policy says internal-only | MVP | `launch_approval_granted` | Publish request. |
| Publish activation | Superadmin or technical operator with launch approval | Approved version, readiness gates, active pointer target, rollback availability | Indirectly via launch approval | Yes after launch approval | MVP | `publish_activation_approved` | Active pointer switch. |
| Rollback | Superadmin or technical operator; agency admin may request | Incident evidence, previous good version, impact, recovery checks | Post-action notice; client approval only if planned rollback | Yes for incident recovery | MVP | `rollback_approved` | Rollback switch. |
| Domain/DNS change | Technical operator or superadmin | Domain ownership/context, DNS instructions, Vercel status | Client action/approval if client controls DNS | Operator approval for Vercel attachment/check only | MVP for Vercel/manual; mutation post-MVP | `domain_change_approved` | Domain attachment/check workflow or manual DNS checklist completion. |
| External workflow mutation | Account manager or agency admin plus integration policy | External record target, payload preview, rollback plan | Depends on external workflow | No before integration governance | Post-MVP | `external_workflow_mutation_approved` | External mutation. |
| AI-generated plan acceptance | Migration/technical/account operator depending on plan type | AI input bundle, output bundle, evidence links, operator review | No, unless client-visible | Yes as advisory acceptance | MVP advisory only | `ai_plan_accepted` | Treating plan as operational guidance. |
| AI-generated content acceptance | Content operator and client reviewer where client-visible | Input/output bundles, diff, preview, source request | Yes when client-visible | No for client-visible content | Post-MVP except manual copy review | `ai_content_accepted` | Content publication. |
| Billing/cost exception | Superadmin or agency owner/admin | Cost event summary, forecast, exception reason | No unless client billing affected | Yes for internal cost | MVP visibility; full billing post-MVP | `billing_cost_exception_approved` | Exception handling or client cost notice. |

## Domain/DNS MVP Boundary

| Domain/DNS area | MVP treatment |
| --- | --- |
| Domain inventory | Review-only or external system of record unless the domain is attached to a GNR8 site. Openprovider inventory/availability is read-only. |
| Domain ownership | External/legal truth remains outside GNR8. GNR8 records client/site association and evidence only. |
| Domain binding | MVP may persist GNR8 runtime domain host bindings and attach/check Vercel project domains when approved. |
| DNS instructions | MVP may compute and display manual DNS instructions and persist instruction state as review evidence. |
| DNS verification | MVP may run Vercel/domain verification checks and show verified/verifying/failed states. |
| SSL status | MVP may show SSL/readiness derived from Vercel/domain verification when available; it is derived external state. |
| Vercel domain attachment | MVP may support controlled Vercel domain attachment/checks because repository evidence exists. |
| Openprovider availability/read-only | MVP may show read-only availability/inventory evidence. |
| Registrar/DNS live mutation | Forbidden before explicit ADR. |
| Manual operator DNS steps | MVP default for customer DNS changes. Operators follow instructions, record evidence, and recheck. |
| Future provider automation | Deferred until explicit ADR defines permissions, dry-run, approvals, immutable provider bundles, rollback, incident handling, and audit. |

## Publish And Rollback MVP Boundary

Publish in MVP means an approved runtime site version/artifact plus approved published content overrides becomes the active public runtime target through the existing publish activation/active pointer mechanism. It is not autonomous deployment, autonomous regeneration, or provider execution.

Publish requires:

- client/agency launch approval according to site policy;
- technical publish readiness evidence;
- domain readiness or explicit internal/staging-domain exception;
- rollback target or documented recovery plan;
- audit event with actor, version, artifact, source evidence, approval refs, readiness result, and domain state.

Rollback in MVP means switching public runtime state back to a previous known-good version or reverting published content overrides. Rollback may be requested by account, migration, content, or technical operators, but execution requires superadmin/technical operator approval. Emergency rollback may proceed with operator approval and client notification after the fact, but still requires audit and incident evidence.

Command Center must represent publish/rollback as site-level state, portfolio counters, readiness blockers, approval blockers, active version, previous good version, incident state, and recovery links. AI must not publish, rollback, or select rollback targets autonomously before AI governance and an explicit ADR.

## Audit, Replay, And Failure Recovery Minimum

Required audit events:

| Event | Minimum payload |
| --- | --- |
| `site_intake_created` | agency, client, site, source URL, actor, intake source, classification. |
| `import_started` | job, batch, site, input refs, actor/system actor. |
| `import_completed` | job, site version, artifact refs, diagnostics, duration. |
| `import_failed` | job, stage, error class, diagnostics, retry eligibility. |
| `capture_degraded` | capture mode, missing evidence, fallback path, review requirement. |
| `batch_created` | batch, site count, owner, source list ref. |
| `batch_started` | batch, approval ref, dry-run ref if available. |
| `batch_paused` | batch, reason, actor/system actor. |
| `batch_resumed` | batch, reason, actor, prior state. |
| `batch_completed` | batch summary, succeeded/failed/degraded counts. |
| `retry_requested` | site/job/stage, reason, requested by. |
| `replay_requested` | stage, immutable input refs, replay policy. |
| `preview_generated` | site version, preview URL/ref, diagnostics. |
| `review_completed` | reviewer, result, required changes, evidence shown. |
| `content_change_requested` | slot/diff/requester/source. |
| `content_published` | slot/version/diff/approval ref. |
| `approval_granted` | approval type, approver, evidence refs. |
| `approval_rejected` | approval type, approver, reason. |
| `domain_check_requested` | domain, binding, actor, provider/check path. |
| `domain_verified` | domain, binding, verification evidence. |
| `publish_requested` | site version, artifact, approvals, readiness. |
| `publish_completed` | active pointer before/after, actor, domain state. |
| `rollback_requested` | incident/reason, target version, requester. |
| `rollback_completed` | active pointer before/after, recovery evidence. |
| `incident_opened` | severity, site, trigger, owner. |
| `incident_resolved` | resolution, evidence, remaining follow-up. |
| `cost_anomaly_detected` | cost center, event class, threshold, owner. |
| `external_workflow_linked` | external system, record URL/ID, owner, no mutation. |
| `ai_plan_generated` | immutable input bundle, output bundle, evidence refs, advisory status. |

Replay classifications:

| Stage | MVP replay class | Notes |
| --- | --- | --- |
| Source URL normalization | Replayable in MVP | Deterministic input/output. |
| Static/raw import | Replayable in MVP | Requires immutable source URL/intake refs and artifact refs. |
| Rendered capture | Replayable in MVP with environmental variance noted | Browser/network state may vary; persist diagnostics. |
| Multi-page discovery | Replayable in MVP | Sitemap/robots/source state may drift; preserve discovered URL set. |
| Projection generation | Replayable in MVP | WU/VCU/readiness projections must be deterministic from persisted evidence. |
| Preview generation | Replayable in MVP | Derived from runtime artifacts and overrides. |
| Manual content review | Manually repeatable only | Human judgment must be audited. |
| Client approval | Not replayable | Append-only approval record only. |
| Vercel domain check | Manually repeatable only | External state may change. |
| Publish activation | Not replayable as a side effect | Can be audited and rolled back, not replayed blindly. |
| Rollback | Not replayable as a side effect | Requires incident/approval context. |
| AI summarization/planning | Future replay candidate | Requires immutable input/output bundles before trust. |
| Provider execution | Not replayable in MVP | Forbidden. |

Failure recovery categories:

| Category | Operator action | Retry rule | Escalation | Batch policy | Recovery evidence |
| --- | --- | --- | --- | --- | --- |
| Intake data error | Correct source URL/site metadata | Retry after correction | Account manager if client data needed | Pause site, continue batch if isolated | Corrected intake and audit note. |
| Network/source unavailable | Retry later; capture raw fallback if allowed | Limited retries with backoff | Technical operator | Continue other sites | HTTP/capture diagnostics. |
| Rendered capture degraded | Use raw fallback or manual review | Replay capture once after fix | Technical/content operator | Continue with degraded flag | Missing evidence list and operator decision. |
| Unsupported functionality | Classify exception or out of scope | No automatic retry | Superadmin/client | Block launch; import may continue as review-only | Site-class exception record. |
| Artifact/readiness failure | Fix import/runtime issue and replay deterministic stage | Retry after root cause | Technical operator | Pause affected site; batch continues if safe | Passing readiness check. |
| Domain verification failure | Manual DNS correction and recheck | Repeat external check after DNS TTL | Technical/account operator | Block publish for custom domain | DNS instruction completion and verification evidence. |
| Publish failure | Open incident, inspect active pointer/artifact/domain | No blind retry | Superadmin/technical | Stop publish wave | Failed publish audit, resolution, rollback path. |
| Cost anomaly | Pause batch if threshold exceeded | Retry only after cost approval | Superadmin/agency owner | Pause batch or site class | Cost event summary and approval. |

## Command Center Requirements

Command Center is the primary MVP operator surface. Specialized admin pages, Knowledge Workspace, Hosting Operations, provider read-only pages, and client dashboards may remain drilldowns; they must not become competing sources of truth.

Required views:

| View | Required content |
| --- | --- |
| Portfolio overview | All active migration sites, site class, state, readiness, owner, risk, approvals, incidents, cost summary. |
| Migration batch overview | Batch status, dry-run state, progress, failed/degraded counts, pause/resume/retry availability. |
| Site-level migration detail | Intake, source URL, import stages, artifacts, capture evidence, preview, review, approvals, launch blockers. |
| Failed site triage | Failure category, diagnostics, retry/replay eligibility, owner, escalation path. |
| Domain readiness | Bound domains, DNS instructions, Vercel status, SSL/verification, manual action owner. |
| Publish readiness | Approved version, active pointer target, content state, domain state, rollback availability. |
| Approval queue | Approval type, approver role, evidence, blocked action, SLA/owner. |
| Cost visibility | Migration/runtime/AI cost events, cost center, anomaly flags, threshold status. |
| Incidents/recovery | Open incidents, rollback status, recovery evidence, resolution owner. |
| Replay/runbook links | Stage-specific replay policy, operator runbooks, immutable input refs. |

## Ops Inbox Requirements

Ops Inbox work items are derived from canonical state and audit events. Ops Inbox is not a source of truth.

| Work item | Trigger | Source of truth | Severity | Owner role | Allowed actions | Blocked actions | Completion condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Intake blocked | Missing/invalid source URL, client/site identity, or unsupported class | Intake/site records and classification | Medium | Account manager or migration operator | Correct metadata, request info, classify | Import start | Intake valid or site deferred. |
| Import failed | Job/stage failure | Migration job/stage/events | High | Migration operator | Retry, replay eligible stage, escalate | Publish | Import succeeds or site deferred. |
| Capture degraded | Rendered capture missing/partial | Site version provenance/render jobs | Medium | Technical operator | Raw fallback, manual review, replay capture | Launch without review | Degradation accepted or capture fixed. |
| Unsupported site class | Classification out of MVP | Site-class matrix/classification record | High | Superadmin | Approve exception, defer, import-only | Launch without exception | Exception approved or site out of scope. |
| Review needed | Preview ready, no operator/client review | Approval/review state | Medium | Content operator/client reviewer | Review, request changes, approve | Publish | Review completed. |
| Content change requested | Client/operator content request | Content override/history | Medium | Content operator | Draft, preview, request approval | Publish content without approval | Change accepted, rejected, or published. |
| Approval needed | Blocked action awaits approval | Approval records/audit | High | Role by approval type | Approve/reject/request evidence | Blocked action execution | Approval granted/rejected. |
| Domain action needed | Domain pending/verifying/failed or DNS instructions incomplete | Domain host binding/instructions | High for launch | Technical operator/account manager | Manual DNS step, recheck, attach Vercel if approved | Registrar/DNS mutation | Domain ready or launch exception recorded. |
| Publish ready | Readiness and approvals complete | Publish readiness projection | High | Technical operator | Publish request/activation if authorized | Autonomous publish | Published or held with reason. |
| Publish failed | Publish route/orchestrator failure | Publish audit/runtime state | Critical | Technical operator/superadmin | Open incident, retry if safe, rollback | Continue launch wave | Published, rolled back, or incident resolved. |
| Rollback needed | Incident or failed publish/content regression | Incident/publish/content history | Critical | Technical operator/superadmin | Approve/execute rollback | AI-selected rollback | Rollback completed or waived with evidence. |
| Incident open | Critical failure or client-visible issue | Incident/audit state | Critical | Technical operator/account manager | Triage, assign, resolve, communicate | Archive site | Incident resolved. |
| Cost anomaly | Cost threshold exceeded | Cost events/unified view | Medium | Superadmin/agency owner | Approve exception, pause batch | Continue over threshold without approval | Exception approved or cost normal. |
| External workflow update | External record linked/needs update | External reference record | Low/Medium | Account manager | Link/update reference manually | Automated external mutation | Reference recorded or waived. |
| AI plan review | AI plan generated | AI input/output bundle | Low/Medium | Relevant operator | Accept as advisory, reject, request revision | Execute plan autonomously | Plan accepted/rejected. |

## Explicit Deferrals

| Deferral | Why deferred | Resume condition | ADR required | Future GNR8 relationship |
| --- | --- | --- | --- | --- |
| Autonomous regeneration | Too risky before approval, replay, provider bundles, and rollback governance | Migration MVP proven; AI governance complete; immutable bundles operational | Yes | Part of Regeneration/Evolution pillar. |
| Full Digital Business Twin productization | Current artifacts are broad but not canonical business truth | Evidence lineage, editable governed model, account reporting need mature | Likely | Strategic business intelligence layer. |
| Full Stripe customer billing | Current Stripe/webhook/cost foundations are incomplete product | Billing roles, plans, checkout, invoicing, portal, support runbooks | Yes for commercial boundary | Monetization and agency/customer billing. |
| Full registrar/DNS automation | Live DNS/registrar mutation has high external risk | Domain ADR, provider dry-run, approval, rollback, audit, credentials governance | Yes | Website Operations Backbone automation. |
| Full external integration marketplace | Connector sprawl before operating semantics | External reference/source-of-truth model and permission classes | Yes for mutation | Integration and Workflow Continuity layer. |
| Full agency marketplace | Not needed for internal 200-site migration | Repeatable migration success and agency onboarding model | No unless business model changes | Future Agency Portfolio OS. |
| Autonomous AI execution | No validated action registry or accountability | AI governance architecture, action classes, test matrix, audit/replay | Yes | AI Operator Layer. |
| AI-driven publish | Client-visible side effect | Publish governance, approval engine, rollback, AI action ADR | Yes | Future governed AI operations. |
| AI-driven DNS mutation | External infrastructure side effect | DNS/provider ADR and AI action ADR | Yes | Future AI-assisted operations. |
| Provider execution | Currently disabled/gated | Provider worker, credentials, approvals, immutable bundles, dry-run, rollback | Yes | Future provider control plane. |
| Large visual builder investment | Not the migration wedge | Proven demand after content-slot MVP and migration operations | No | Possible UX layer, not core category. |
| Full enterprise DXP features | Competes with wrong category | Explicit product strategy beyond operations layer | Yes if source-of-truth ownership shifts | GNR8 should integrate/operate around DXPs, not replace them in MVP. |

## Required Decisions Before Implementation

| Decision | Required before |
| --- | --- |
| Exact bulk intake format and batch dry-run contract | Bulk Migration Factory implementation. |
| Minimum approval record schema/source of truth | Publish/client approval implementation. |
| Domain launch policy for internal working domains vs custom domains | Domain readiness and launch wave. |
| Unified audit event model and event names | Any MVP workflow implementation. |
| Replay eligibility per stage and runbook links | Retry/replay controls. |
| Ops Inbox persistence vs derived read model | Command Center/Ops Inbox implementation. |
| Cost threshold policy | Batch execution at 200-site scale. |

## Architecture Warnings

| Warning | Objection |
| --- | --- |
| Partial features must not be overclaimed | Vercel domain attachment/checks are not full DNS/registrar automation; Stripe webhook/cost events are not a full customer billing product. |
| Generated artifacts are not production truth | Generated Proposal Bundles, thumbnails, WU/VCU, DBT, and provider payloads are review/projection artifacts unless an explicit source-of-truth decision says otherwise. |
| AI chat is not architecture | AI assistance must be classified as read-only/advisory unless it has tools, state, permissions, approvals, immutable bundles, audit, and replay. |
| Publish/rollback need product governance | Existing primitives do not remove the need for clear approval, incident, and recovery workflows. |
| Command Center must consolidate | Admin drilldowns are useful, but 200-site operations need one primary operator surface and derived Ops Inbox. |

