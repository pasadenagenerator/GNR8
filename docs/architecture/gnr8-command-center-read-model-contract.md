# GNR8 Command Center Read Model Contract

CCO-1 canonical read model contract for the GNR8 MVP Command Center.

This is documentation and architecture only. It does not create tables, routes, schemas, server actions, UI components, background jobs, queues, migrations, or runtime behavior.

## Purpose

The Command Center read model gives operators a coherent projection of portfolio, batch, site, readiness, approval, domain, publish, rollback, incident, cost, asset, audit, external reference, and next-action state for an approximately 200-site MVP migration wave.

The read model is not source of truth. It is rebuildable from canonical sources and documented projections.

## Global Rules

1. Every displayed status must map to a canonical source or documented projection.
2. Every stale external/provider/domain/cost signal must be labeled.
3. Every action must include allowed/prohibited reason derivation.
4. Every approval-needed action must show evidence package requirements.
5. Every retry/replay action must show replay class and required input refs.
6. Every publish/rollback action must be shown as a separate approval-gated side effect, not batch execution.
7. No operator action may be enabled unless source-of-truth state, role permission, approval requirements, and audit requirements are clear.
8. Command Center, Ops Inbox, previews, thumbnails, Website Understanding, Source Content and Visual Continuity, Knowledge Workspace, Evolution, Generated Proposal Bundles, AI outputs, provider payloads, billing dashboards, and external workflow snapshots are non-authoritative.

## Read Model Envelope

Every Command Center read response should include:

| Field | Requirement |
| --- | --- |
| `generatedAt` | Server timestamp for the projection. |
| `sourceWatermarks` | Latest known timestamp/event id per canonical source family. |
| `freshness` | Fresh/stale/partial labels per signal class. |
| `scope` | Actor, role, agency/client/site filters, and visibility constraints. |
| `sourceErrors` | Missing or partial source diagnostics. |
| `evidenceRefs` | Canonical refs used for displayed decisions. |
| `allowedActions` | Actions allowed with dependencies and audit events. |
| `prohibitedActions` | Disabled actions with specific reasons. |
| `drilldowns` | Links to source-owned detail surfaces. |

## Section Contract

The table below defines the minimum read model sections. Each row includes purpose, canonical sources, derived fields, freshness requirement, staleness indicator, required evidence refs, operator-facing summary, drilldown destination, role visibility, action dependencies, audit dependencies, and failure/empty-state behavior.

| Section | Purpose | Canonical source(s) | Derived fields | Freshness requirement | Staleness indicator | Required evidence refs | Operator-facing summary | Drilldown destination | Role visibility | Action dependencies | Audit dependencies | Failure/empty-state behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Portfolio summary | Show 200-site wave health and risk | Agency/client/site records; site operational state; batch/job events; cost events; incidents | counts by state/class/owner/severity; launch blockers; progress; risk bands | Current DB read plus source watermarks | `portfolio_projection_partial` when any source unavailable | agency/client/site ids; batch ids; latest event ids | "N sites in scope, X blocked, Y ready for review, Z live" | Overview, filtered site list, Ops Inbox | Superadmin all; agency roles scoped | None except navigation; bulk actions require per-item gates | report-generation audit if exported | Empty says no sites in scope; partial labels missing sources and disables aggregate actions |
| Agency/client/site scope | Show ownership and authorization boundary | Agency, organization/client, sites, membership/RBAC | scoped client list; site ownership; actor role; hidden counts | Current auth/scope read | `scope_unverified` if membership/client join missing | actor user id; agency/client/site refs | "Viewing agency/client/site subset" | Agency/client/site admin drilldowns | Superadmin, agency owner/admin, assigned roles | Any action must pass scope permission | privileged action check event | Deny closed when scope cannot be resolved |
| Migration wave summary | Show logical wave progress across batches | Batch records; site item states; dry-run refs; external refs if modeled | wave cohorts; ready/running/paused/completed counts; unresolved blocker count | Current batch/site projection; dry-run validity checked against plan | `wave_projection_stale` when batch/site inputs changed | batch ids; dry-run ids; plan refs | "Wave is on track/blocked/paused" | Wave overview and batch list | Migration, agency, superadmin; account scoped | Plan/start actions need batch plan and approvals | wave/report audit if produced | If no wave store exists, label logical grouping as projection |
| Batch list | Show executable batch portfolio | Migration batch store; batch events; job summaries | status, progress, failed jobs, latest event, owner, policy | Latest batch/event read | `batch_events_stale` when running with old latest event | batch id; event id; job count refs | List of batches with status/progress/failures | Batch detail | Migration, technical, agency, superadmin | Start/resume requires approval package and role | batch list passive; start/resume audits | Empty says no durable migration batches |
| Batch detail | Show one batch execution context | Batch, batch-job membership, job/stage state, events, observability | counters, timeline, diagnostics, failure groups, runnable/blocked jobs | Latest event and job stage read | stale when running/paused beyond policy without event | batch id; job ids; event ids; dry-run/start approval refs | Current state, failures, pause reason, next step | Job details, failure group, audit timeline | Migration/technical/superadmin; agency scoped | Run/resume/retry require source state, approval, role, audit | batch_started/resumed/paused/completed; retry/replay events | If batch missing, show not found; controls disabled on partial observability |
| Site item list | Show all candidate/imported sites in wave | Site records; intake rows; classification; job membership; runtime refs | per-site operational state, owner, next action, blockers | Current read over site/intake/job/runtime refs | `site_projection_partial` when any source missing | site id; intake row; job id; siteVersion/artifact refs | Dense list for scanning and filtering | Site detail drawer/page | Role scoped by agency/client/site | Row actions require per-site allowed action derivation | action-specific audits | Empty by filter says no matching sites; no fake state |
| Site operational state | Give canonical state for one site | MVP operational state sources: intake, job/stage, runtime, review, approval, domain, publish, incidents | current state; state group; allowed/prohibited transitions; next action | Current source refs; external signals separately fresh | `state_conflict` or source-specific stale label | state source refs; timeline refs | "Site is review_pending because preview exists but review missing" | Site detail and audit timeline | All assigned operators; client sees client-safe subset | Transitions require state, role, approval, audit | state transition event refs | Conflicts prefer blocked and require triage |
| Site class and launch eligibility | Prevent unsupported launch | Accepted classification; MVP supported-site-class matrix; review flags | supported/manual/import-only/deferred/out-of-scope; exception needed; launch eligible | Current classification decision; dry-run evidence if used | `classification_stale` when source/dry-run changed | classification decision id; matrix version; evidence refs | Site class, risk, and launch eligibility | Classification/review drilldown | Migration, technical, agency, superadmin; client limited | Exception request requires superadmin/client evidence | site_classified, exception decision | Missing class creates `unsupported_site_class` or `review_needed` |
| Intake validation status | Show intake completeness | Intake rows; validation results; duplicate reports; owner assignment | required fields; normalized source/domain; invalid reasons | Current intake validation/rules version | stale when row changed after validation | intake id/row id; validation result id | "3 required fields missing" | Intake row detail | Migration/account/superadmin | Correct/defer/cancel intake row through intake owner | intake created/validated/failed/corrected | Missing intake blocks job creation |
| Dry-run status | Show non-destructive planning evidence | Dry-run results; batch plan; input refs | status, risk, blockers, estimate, waiver need | Valid only for unchanged plan/input/rules | stale when plan/input/rules changed | dryRun id; input refs; rules version | "Dry-run passed/failed/waived" | Dry-run result detail | Migration, agency, superadmin | Start approval requires current dry-run or waiver | dry-run start/complete/fail/waiver | Missing dry-run requires waiver or blocks start |
| Import/job/stage status | Show execution state | Migration job store; stage records; events; execution reports | current stage, attempts, failed stage, diagnostics, output refs | Latest job/stage event | stale/stuck if running with old stage event | job id; stage event ids; input/output refs | "Artifact build failed on attempt 2" | Job/stage timeline | Migration/technical/superadmin | Retry/replay requires class and refs | job/stage/retry/replay events | Missing job says not queued/unknown and disables job actions |
| Failure groups | Group recoverable work | Failure records or job/stage diagnostics/events; BMF taxonomy | failure code, severity, affected count, owner, recovery path | Latest failure event and classification | stale if failure not classified after retry/new evidence | failure refs; job ids; diagnostics | "12 preview failures, high severity" | Failure group view | Migration/technical/superadmin; account for client blockers | Recovery actions require classification, approval, audit | failure_classified, recovery event | Unknown failures grouped as high until classified |
| Retry/replay eligibility | Show safe recovery options | BMF replay rules; job/stage state; immutable input refs; attempts | retry allowed; replay class; required refs; max attempts; blocked reason | Current failed state and input refs | stale when newer attempt exists | failure id; stage; immutable input refs; prior attempts | "Replay static import from captured HTML refs" | Retry/replay request detail | Migration/technical/superadmin | Requires role plus retry/replay approval | site_retry_requested/site_replay_requested/outcome | If refs missing, create recovery evidence needed |
| Preview readiness | Show reviewability | Runtime site version/artifact; preview route; preview smoke; readiness checks | preview URL/ref, status, failed routes/assets, generatedAt | Current for version/artifact/content refs | stale when version/artifact/content refs changed or TTL expired | siteVersion id; artifact id; smoke result | "Preview ready with route warnings" | Preview and smoke drilldown | Operators; client reviewer when shared | Share/review requires policy; approval uses evidence package | preview generated/shared/check events | Missing preview blocks review/approval |
| Review blockers | Show human review requirements | Review records; WU/VCU; capture diagnostics; route/form/widget/SEO flags | blocker type, severity, owner, evidence, completion condition | Current review checklist and evidence refs | stale when preview/content/source refs changed | review request; checklist; WU/VCU/capture refs | "Route review needed before approval" | Review, Workspace, WU/VCU | Content/migration/account/client per policy | Complete/reject/request change requires role and audit | review requested/completed/rejected | Empty means no known blockers, not auto approval |
| Content correction status | Show draft/published override state | Content slots; draft/published overrides; history; change requests | draft count, conflict count, diff refs, publish readiness | Current content records for siteVersion | stale when preview not regenerated after draft change | slot ids; override ids; history ids; preview refs | "4 draft corrections pending client review" | Content review/editor/history | Content/account/client scoped | Save/publish/rollback content require content approval/audit | content change/draft save/publish/rollback | Missing slots means correction unavailable, not approved |
| Approval status | Show required human decisions | Canonical approval records/events once decided; client review records | approval type, scope, approver role, status, expiry, evidence package | Current approval store and evidence unchanged | stale/expired when evidence changed or approval expired | approval id; evidence package refs; approver | "Launch approval missing from client reviewer" | Evidence package/approval detail | Approver roles; requesters see status | Gated actions require valid approval | requested/granted/rejected/revoked/superseded | Missing approval blocks action; rejected shows reason |
| Domain readiness | Show custom-domain gate | Runtime domain host bindings; DNS instruction snapshots; Vercel check snapshots; manual evidence | domain state, owner, verified, blockers, exception | Latest check within DNS policy | stale when lastCheckedAt/ instructions exceed TTL | domain binding id; instruction snapshot; check id | "DNS verification failed; client action needed" | Domain readiness view | Technical/account/agency; client-safe instructions | Recheck/action/exception requires role/approval/audit | domain action/check/verified/exception events | No custom domain may be warning or blocker depending launch intent |
| DNS instruction freshness | Prevent stale DNS usage | DNS instruction snapshot; provider/Vercel state; manual completion evidence | generatedAt, expiresAt, stale reason, record list | Within policy TTL and source state unchanged | `dns_instructions_stale` | instruction snapshot id; provider snapshot/check refs | "Instructions stale; regenerate before publish" | DNS instruction detail | Technical/account/client-safe | Client DNS completion requires evidence/audit | instructions shown/completed/stale | Missing instructions blocks custom-domain publish |
| Vercel/domain check status | Show provider snapshot | Vercel domain check response persisted in domain binding/check event | status, required record, last error, checkedAt | Within provider check TTL | stale when checkedAt too old | check id; binding id; response summary | "Vercel check pending/failed/active" | Hosting/domain operations | Technical/superadmin | Recheck requires domain action permission and audit | domain_check_requested/result | Provider unavailable labels partial and blocks publish if required |
| Publish readiness | Show pre-publish gate | Runtime/artifact/content/approval/domain/readiness/incident/cost refs | ready/blocked; missing gates; prohibited reasons | All required refs current and non-stale | stale when any dependent ref changed/expired | readiness snapshot; approval; artifact; domain; rollback refs | "Publish blocked by missing rollback target" | Publish readiness view | Technical/superadmin/agency visibility | Publish activation requires separate approval and audit | publish readiness pass/fail/request | Missing refs block publish; no batch-run shortcut |
| Rollback readiness | Show recovery path | Publish history; active pointer; previous versions; content history; incidents | known-good targets, target risk, approval need | Current runtime/content history | stale when active pointer changed after target selection | target siteVersion/artifact/history; incident id | "Rollback target available and needs approval" | Incident/recovery view | Technical/superadmin/account | Rollback requires incident/reason, target, approval, audit | rollback requested/completed/verified | Missing target creates recovery evidence item |
| Incident/recovery status | Show active operational issues | Incident/recovery records once decided; failure/publish/domain/cost events | severity, owner, impact, recovery step, SLA/follow-up | Current incident event timeline | stale when no update within policy | incident id; related event refs; recovery refs | "Critical publish incident open" | Incident/recovery detail | Technical/superadmin/account; client-safe subset | Recovery actions depend on type and approval | incident opened/updated/resolved | Missing incident model labels blocker before implementation |
| Cost estimate/events/anomalies | Show internal cost risk | AI/runtime/migration cost events; estimates; thresholds; exceptions | estimate, actual, completeness, anomaly, threshold, owner | Current cost period; event table availability | stale/partial when latest signal missing or table unavailable | cost event ids; threshold policy; exception refs | "Cost anomaly paused batch" | Cost/anomaly view | Superadmin, agency owner/admin, migration limited | Resume/override requires cost exception approval | cost anomaly/exception events | No signal labels unknown, not zero cost |
| Asset/storage evidence health | Show artifact/capture storage reliability | Runtime/raw artifacts; file maps; capture refs; asset diagnostics | persisted counts, external fallbacks, missing refs, hashes | Current artifact/capture refs | stale when artifact refs changed | artifact id; asset refs; hash/size/content type | "Critical asset missing; launch blocked" | Hosting asset diagnostics | Technical/content/migration | Recovery/replay requires input refs and approval if risk visible | asset diagnostic/recovery events | Missing asset evidence blocks launch if critical |
| Audit timeline refs | Reconstruct decisions/actions | Audit-log module; migration events; batch events; content history; publish/provider/domain events | timeline links, latest event, missing event families | Current event query and source watermarks | partial when event store unavailable | event ids/correlation ids | "Timeline available/partial" | Audit timeline | Superadmin; scoped roles by entity | No action unless required audit writer available | action-specific audit | Missing audit dependency disables privileged action |
| External workflow refs | Show follow-up without duplicating truth | External refs/snapshots once modeled; external systems remain truth | ref type, url/id, owner, last confirmed, stale flag | Snapshot freshness policy | stale unless recent sync/manual confirmation | external ref id/link/snapshot | "Client approval tracked in external ticket, GNR8 approval missing" | External reference view | Account/agency/superadmin; client-safe subset | Cannot approve by external ref alone | link/snapshot/use audit | Missing model labels design-only |
| Next required action | Guide operator to one best next step | Derived from all canonical blockers/actions | action type, owner role, severity, reason, due/freshness | Same as dependent sources | stale when dependency stale | source refs for reason | "Technical operator must recheck DNS" | Ops Inbox item/site detail | By role scope | Action requires all dependencies clear | action-specific audit | If multiple high blockers, show highest priority with all blockers available |
| Allowed actions | Show executable actions with gates satisfied | Source state; RBAC; approval; audit; freshness; evidence | action id, label, actor roles, side-effect class, evidence refs | Current for all dependencies | stale if any dependency stale | approval/evidence/audit refs | "Retry static import allowed" | Source-owned action page/modal | Role-gated | Must include source-of-truth, permission, approval, audit clarity | action-specific audit event named | Empty means no actions currently allowed |
| Prohibited actions with reason | Prevent misleading buttons | Same as allowed actions plus missing/failed dependencies | action id, reason code/message, missing refs, remediation | Current dependencies | reason stale if dependent state stale | missing/failed evidence refs | "Publish prohibited: launch approval missing" | Site/action detail | Visible to roles allowed to know reason | May navigate to resolving work item | no action audit; view optional | Always include reason; never silently hide all unsafe actions |

## Action Derivation Rules

Allowed action derivation must evaluate in this order:

1. Actor scope and role.
2. Source-of-truth state and allowed transition.
3. Site class and MVP eligibility.
4. Required evidence refs present.
5. External/provider/domain/cost signals fresh enough.
6. Approval requirements satisfied or action is approval request.
7. Audit writer/required audit event known.
8. Retry/replay class or side-effect class is allowed.

Any failed step creates a prohibited reason and, when operator work is needed, an Ops Inbox work item.

## Evidence Package Requirements

Approval-needed actions must show:

- subject and action scope;
- current canonical state;
- evidence refs shown to approver;
- freshness labels;
- known blockers/accepted limitations;
- approver role and policy;
- expiry/supersession rule;
- audit event that will record the decision.

## Retry And Replay Display Rules

Retry/replay actions must show:

- failed stage/action;
- failure code and severity;
- replay class: fully deterministic, deterministic with external input refs, environmental variance, manual retry only, not replayable, or forbidden replay;
- immutable input refs and downstream outputs that will be superseded;
- prior attempts and cost impact;
- approval and audit requirements.

## Publish And Rollback Display Rules

Publish and rollback must always be displayed separately from migration batch execution.

Publish action requires:

- `publish_ready` projection from current refs;
- valid publish activation approval;
- site version/artifact/content/domain/readiness/rollback refs;
- no unresolved critical incident or cost blocker;
- audit event name and actor role.

Rollback action requires:

- incident or recovery reason;
- known-good target version/artifact/content history;
- before/after refs;
- rollback approval or emergency audit policy;
- post-action verification requirement.
