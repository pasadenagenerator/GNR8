# GNR8 Ops Inbox Work Item Model

CCO-1 canonical model for the GNR8 MVP Ops Inbox.

This is documentation and architecture only. It does not create task tables, routes, UI, schemas, migrations, workers, queues, schedulers, approval persistence, or audit persistence.

## Purpose

Ops Inbox is the derived queue of exceptions, blockers, approvals, and required operator actions for the GNR8 MVP Command Center. It helps operators work a 200-site migration wave without turning scattered admin pages or UI badges into truth.

## Non-Goals

Ops Inbox does not:

- store independent task truth;
- manually override migration, runtime, domain, approval, incident, cost, or content state;
- execute actions outside source-owned workflows;
- replace audit logs, approval records, incident records, external workflow tools, or batch/job state;
- authorize publish, rollback, DNS/provider, billing, AI, or migration side effects by itself.

## Source-Of-Truth Boundary

Ops Inbox items are derived from canonical state and documented projections. A work item key identifies a current blocker/action requirement; it is not the source of that requirement.

Ops Inbox items must not be manually closed unless either the underlying canonical state changes or an audited decision records why the work is no longer required.

## Stable Work Item Key Model

Stable key format:

`ops:<type>:<scope-kind>:<scope-id>:<source-ref>:<policy-version>`

Rules:

- `type` is the canonical work item type.
- `scope-kind` is `portfolio`, `wave`, `batch`, `site`, `job`, `stage`, `domain`, `approval`, `incident`, `cost`, `external_ref`, or `ai_advisory`.
- `scope-id` is the canonical id for that scope.
- `source-ref` is the source event/state/check/ref that triggered the item.
- `policy-version` changes only when derivation policy changes enough to alter item identity.
- Display labels may change without changing the key.
- If source truth is superseded, a new item key may be derived and the old item resolves by source transition.

## Derivation Model

Ops Inbox derivation runs after Command Center source aggregation:

1. Read canonical state and source watermarks.
2. Apply work item trigger rules.
3. Deduplicate by stable key and stronger source ref.
4. Group related items by batch, site, client, severity, owner role, and source family.
5. Attach allowed/prohibited action derivation.
6. Attach evidence refs, freshness labels, drilldowns, and audit requirements.
7. Mark stale items when their source is stale or superseded but unresolved.

## Severity Model

| Severity | Meaning | Default handling |
| --- | --- | --- |
| low | Informational or non-launch-blocking follow-up | Show after medium/high items; may be hidden by filter, not deleted. |
| medium | Blocks a site milestone or routine operator work | Assign owner and show in default Inbox. |
| high | Blocks launch/publish/readiness or affects client-visible risk | Show prominently; require owner and often approval. |
| critical | Pauses batch, publish wave, recovery path, or source-of-truth confidence | Pin/top sort; require escalation and audit. |

Unknown repeated system failures are high until classified. Publish failure, rollback needed, cross-client domain conflict, audit persistence failure, and critical cost anomaly are critical by default.

## Owner Role Model

Owner role is derived from the needed decision/work:

- account manager for missing client/domain owner, external follow-up, approval routing;
- migration operator for intake, batch, dry-run, job, classification, retry/replay planning;
- technical operator for capture/runtime/domain/publish/rollback/incident/storage;
- content operator for review/content/slot/visual corrections;
- client reviewer for client-visible preview/content/launch review;
- agency owner/admin for portfolio accountability and cost review;
- superadmin for cross-client conflicts, unsupported exceptions, critical incidents, cost exceptions, publish/rollback governance.

An item may show secondary owner roles, but exactly one primary owner role is required for sorting and accountability.

## Work Item Lifecycle

| Lifecycle state | Meaning | Source |
| --- | --- | --- |
| `derived_open` | Trigger currently evaluates true | Derived from canonical state. |
| `derived_blocked` | Trigger true, but allowed action cannot be taken because dependency is missing | Derived from allowed/prohibited reason. |
| `derived_waiting` | Trigger true, waiting on external/client/manual action | Derived from owner/action state and external refs. |
| `derived_stale` | Trigger true from stale source signal | Derived freshness rule. |
| `resolved_by_state` | Trigger no longer evaluates true after canonical state transition | Derived from source state. |
| `dismissed_by_decision` | Audited decision says work is no longer required | Approval/audit/event source, not Inbox-only field. |
| `superseded` | Newer source ref replaces old item | Derived from source ref ordering. |

## Deduplication Rules

- Same type, scope, and source ref dedupe to one item.
- Batch-level item may group site-level items only for display; individual site keys remain available.
- Higher severity wins display priority.
- Newer canonical source ref supersedes older stale key when source identity changes.
- External references dedupe by external system/type/id plus GNR8 subject ref.
- Approval-needed items dedupe by approval type, subject, and evidence package version.

## Grouping Rules

Default groups:

- Critical now.
- My role.
- Batch paused/failed.
- Launch blockers.
- Domain/DNS.
- Review/content.
- Cost and incidents.
- External follow-up.
- AI advisory review.

Grouping must not hide individual source refs needed for audit and resolution.

## Sorting And Prioritization Rules

Sort order:

1. Critical severity.
2. Items blocking active publish/rollback/incident recovery.
3. Items blocking running or paused batches.
4. Items assigned to current actor role.
5. Oldest unresolved source timestamp.
6. Highest affected site count.
7. Earliest target launch window if modeled.
8. Stable key.

## Stale Item Rules

An item is stale when:

- the provider/domain/cost/external source snapshot is expired;
- the source event is older than the freshness policy for an active state;
- a newer canonical state exists but derivation has not reconciled;
- the item references a dry-run/readiness/preview/evidence package superseded by changed inputs.

Stale items remain visible, but side-effect actions are disabled until refreshed or explicitly waived by policy and audit.

## Completion Rules

Completion requires one of:

- canonical state no longer triggers the item;
- required approval was granted/rejected and dependent state changed;
- site/batch was deferred/cancelled/archived with audit;
- incident/recovery was resolved with evidence;
- external workflow follow-up was recorded as no longer required through an audited GNR8 decision.

## Dismissal Rules

Manual dismissal is allowed only if:

- the actor has permission for the subject;
- the item type allows audited dismissal;
- the actor records reason, evidence refs, and impact;
- the dismissal creates an audit/decision event that derivation can read.

Critical safety items cannot be hidden by dismissal alone; they require canonical resolution or explicit superadmin risk acceptance.

## Escalation Rules

Escalate to superadmin for:

- cross-client source/domain duplicates;
- unsupported launch exceptions;
- critical or repeated unknown failures;
- publish failures;
- rollback-needed incidents;
- cost anomalies above threshold;
- attempts to bypass approval/audit/source-of-truth rules.

Escalate to technical operator for repeated capture/import/artifact/preview/domain failures. Escalate to account/client owner for missing approvals, client DNS action, form/widget/booking acceptance, and external workflow blockers.

## Audit Requirements

Every item type declares a required audit event for the action that resolves it. Passive derivation does not require audit, but actions launched from Ops Inbox do.

Minimum audit payload for resolution:

- work item key;
- actor and role;
- canonical subject refs;
- action or decision;
- evidence refs shown;
- previous and resulting canonical state;
- freshness labels;
- timestamp and correlation id.

## Drilldown Requirements

Every item must link to:

- source-owned detail surface;
- evidence package or diagnostic refs;
- audit timeline;
- related site/batch/client/domain/cost/incident detail;
- allowed action destination or disabled-action explanation.

## Action Requirements

Allowed actions must be source-owned, role-gated, approval-aware, audit-aware, and freshness-aware. Blocked actions must show reason codes and remediation.

Retry/replay actions must show replay class and input refs. Publish/rollback/domain actions must show side-effect and approval boundaries.

## Relation To External Workflow References

External workflow references can create `external_workflow_update` items when a linked external task/ticket/sheet/email/file requires GNR8 follow-up or when a snapshot is stale. The external system remains authoritative for its own record. GNR8 approval, state transition, and audit must still happen inside GNR8.

## Work Item Types

| Type | Trigger | Canonical source(s) | Derived key | Severity | Owner role | Allowed actions | Blocked actions | Completion condition | Required audit event | Command Center placement | Drilldown destination | Stale/freshness behavior | Hide/dismiss/resolve rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `intake_blocked` | Required intake/scope/source/class/domain/owner field invalid or missing | Intake row, validation result, site/client records | `ops:intake_blocked:site:<row-or-site-id>:<validation-ref>:v1` | medium; high for ownership ambiguity | Account manager or migration operator | Correct row, assign owner, defer/cancel | Create job, start batch, publish | Row validates or is deferred/cancelled | `bulk_intake_validated`, `site_intake_corrected`, or `site_deferred` | Ops Inbox; portfolio intake count; site row | Intake row/site detail | Stale when validation predates row change | Can dismiss only by audited defer/cancel/exception |
| `duplicate_detected` | Duplicate source URL or intended domain detected | Duplicate report, site records, domain bindings | `ops:duplicate_detected:<scope>:<source-or-domain>:<report-ref>:v1` | medium; critical cross-client/domain | Migration operator; superadmin for cross-client | Merge, reassign, mark intentional, defer, escalate | Start affected jobs, attach/publish affected domain | Conflict resolved with ownership/domain evidence | `duplicate_detected`, `duplicate_resolved` | Critical group; batch/site blockers | Duplicate conflict view | Stale when duplicate report predates intake/domain changes | Cannot hide critical cross-client conflict; resolve or audited superadmin decision |
| `unsupported_site_class` | Site class is import-only, deferred, out-of-scope, or launch exception needed | Classification decision, MVP site class matrix | `ops:unsupported_site_class:site:<site-id>:<classification-ref>:v1` | high; critical if launch attempted | Migration operator; superadmin | Mark import-only/defer/cancel, request exception | Launch, publish, batch launch-ready count | Classification handling recorded or exception approved | `site_classified`, `unsupported_exception_decided` | Site class risk, launch blockers | Classification/review detail | Stale when new evidence changes class | Dismiss only by defer/cancel/import-only/exception audit |
| `dry_run_failed` | Batch dry-run failed or produced no usable evidence | Dry-run result/failure event; batch plan | `ops:dry_run_failed:batch:<batch-id>:<dry-run-ref>:v1` | medium/high | Migration or technical operator | Fix input, retry dry-run, request waiver | Start batch without waiver | Dry-run completes or waiver approved | `batch_dry_run_failed`, `batch_dry_run_completed`, `dry_run_waiver_approved` | Batch blockers | Dry-run detail | Stale when batch plan changed | Can dismiss only by waiver, new dry-run, cancel/archive |
| `batch_start_approval_needed` | Batch has start request and evidence package but no valid approval | Batch plan, dry-run/waiver, approval request | `ops:batch_start_approval_needed:batch:<batch-id>:<evidence-package-ref>:v1` | medium/high | Approver: migration lead, agency admin, superadmin | Approve, reject, request changes | Run batch | Approval granted/rejected or request withdrawn | `batch_start_approved` or `batch_start_rejected` | Batch list/detail approval band | Evidence package | Stale when evidence package inputs changed | Cannot close manually; approval decision or plan change resolves |
| `batch_paused` | Batch state paused by operator/system/policy | Batch state, pause event, blocker refs | `ops:batch_paused:batch:<batch-id>:<pause-event-ref>:v1` | medium/high; critical for safety pause | Migration operator; technical/superadmin by reason | Resolve blocker, request resume, cancel/defer | Blind resume, publish wave continuation | Batch resumed, failed, completed, cancelled, archived | `batch_paused`, `batch_resumed`, `batch_cancelled` | Critical/paused batches | Batch detail | Stale if pause reason refs superseded | Dismiss only by audited cancellation/closeout |
| `batch_failed` | Batch state failed or cannot safely continue | Batch failure event, failure groups | `ops:batch_failed:batch:<batch-id>:<failure-event-ref>:v1` | high/critical | Migration/technical; superadmin for critical | Classify, open incident, request resume/cancel | Run without new decision | Batch recovered/resumed/cancelled/archived | `batch_failed`, `failure_classified`, `batch_recovery_decided` | Critical group and batch detail | Failure group/batch detail | Stale if newer batch state exists | Cannot hide until recovery/cancel/archive decision |
| `import_failed` | Site job/stage failed before acceptable artifact/preview | Job/stage/failure record | `ops:import_failed:job:<job-id>:<stage-event-ref>:v1` | medium/high | Migration or technical operator | Classify, retry, replay, defer | Preview/approval/publish | Import succeeds, site deferred/cancelled, or failure accepted as import-only | `site_import_failed`, `site_retry_requested`, `site_replay_requested`, `site_recovered` | Site row, batch failure groups | Job/stage detail | Stale if newer attempt exists | Dismiss only by defer/import-only/recovery audit |
| `capture_degraded` | Rendered capture partial/failed/raw fallback/missing evidence | Capture provenance/diagnostics; import result | `ops:capture_degraded:site:<site-id>:<capture-ref>:v1` | medium/high | Technical and content operators | Replay capture, review fallback, accept limitation, defer | Launch silently, approve without exception if visible | New capture evidence or accepted limitation/exception | `site_capture_degraded`, `capture_degradation_accepted` | Review blockers, site detail | Capture/WU/VCU/preview | Stale when newer capture/import exists | May hide only after audited acceptance or new evidence |
| `route_review_needed` | Multi-page route coverage/navigation/SEO requires review | Route map, discovery diagnostics, preview smoke, review flags | `ops:route_review_needed:site:<site-id>:<route-ref>:v1` | medium/high | Migration/content/SEO owner | Review route map, correct/replay, accept limitation | Launch/publish until route gate satisfied | Route review complete or exception/defer | `route_review_requested`, `route_review_completed` | Review group | Route coverage drilldown | Stale when route map/preview changes | Dismiss only by route review decision |
| `preview_failed` | Preview generation/smoke/readiness fails | Preview smoke result, runtime artifact/readiness | `ops:preview_failed:site:<site-id>:<preview-check-ref>:v1` | high | Technical operator | Rerun check, replay artifact, open incident, defer | Review approval, launch, publish | Preview/readiness passes or site deferred | `preview_smoke_failed`, `preview_ready` | Launch blockers | Preview smoke/readiness drilldown | Stale when artifact/content/version changes | Cannot hide without passing check or audited defer/waiver |
| `review_needed` | Human fidelity/content/form/widget/SEO/client review required | Review blockers, preview refs, WU/VCU, classification flags | `ops:review_needed:site:<site-id>:<review-ref>:v1` | medium/high | Content operator, account manager, client reviewer | Complete review, request changes, accept limitation | Approval/publish until complete | Review completed/rejected/change requested | `review_requested`, `review_completed`, `review_rejected` | Ops Inbox review group; site detail | Preview, Workspace, WU/VCU | Stale when preview/content evidence changed | Resolve only by review state transition or audited defer |
| `content_change_requested` | Client/operator requests content correction | Change request, draft overrides, content history | `ops:content_change_requested:site:<site-id>:<change-request-ref>:v1` | medium/high if launch-blocking | Content operator | Edit draft, preview, request approval, defer | Publish old/unapproved content | Change resolved, approved, rejected, or deferred | `content_change_requested`, `draft_override_saved`, `content_change_resolved` | Content blockers | Content review/editor/history | Stale when draft/preview changes | Dismiss only by audited no-change-needed decision |
| `approval_needed` | Required approval missing/expired/rejected for gated action | Approval request/status; evidence package; policy | `ops:approval_needed:<scope>:<subject-id>:<approval-type-and-package-ref>:v1` | medium/high/critical by action | Required approver role | Approve/reject/request changes | Execute gated action | Approval granted/rejected/superseded or action no longer required | `approval_requested`, `approval_granted`, `approval_rejected` | Approval lane and item detail | Evidence package | Stale/expired when evidence changes or TTL passes | Cannot close manually; approval decision or canonical action withdrawal |
| `domain_action_needed` | Domain owner/action/instructions/check required | Domain binding, DNS instructions, owner notes, check state | `ops:domain_action_needed:domain:<binding-id>:<domain-ref>:v1` | high for custom-domain launch | Technical operator/account/client DNS owner | Generate instructions, collect evidence, recheck, approve exception | Custom-domain publish | Domain ready, exception approved, no-custom-domain decided | `domain_action_required`, `dns_instructions_shown`, `domain_verified` | Domain lane; site publish blockers | Domain readiness view | Stale when instructions/check exceed TTL | Dismiss only by domain decision/exception/defer |
| `dns_verification_failed` | Vercel/domain/DNS verification check failed | Domain check result, binding snapshot | `ops:dns_verification_failed:domain:<binding-id>:<check-ref>:v1` | high | Technical operator/account/client DNS owner | Fix DNS, recheck, approve exception | Publish on custom domain | Verification passes, exception, or launch plan changes | `domain_readiness_failed`, `domain_check_requested`, `domain_verified` | Domain blockers | Hosting/domain operations | Stale when check older than policy | Cannot hide unless exception/cancel/no-domain decision |
| `publish_readiness_failed` | Publish readiness projection has blockers | Publish readiness check over version/artifact/content/domain/approval/incident/cost | `ops:publish_readiness_failed:site:<site-id>:<readiness-ref>:v1` | high | Technical operator; superadmin for waiver | Resolve blockers, rerun readiness, request waiver | Publish activation | Readiness passes or site deferred | `publish_readiness_failed`, `publish_readiness_passed` | Launch blockers | Publish readiness detail | Stale when any dependent ref changes | Dismiss only by readiness pass, waiver, or defer |
| `publish_failed` | Publish activation failed or active pointer/readiness unacceptable | Publish event, active pointer, safety check, incident refs | `ops:publish_failed:site:<site-id>:<publish-event-ref>:v1` | critical | Technical operator and superadmin | Open/update incident, root-cause, approve retry or rollback | Blind retry, continue publish wave | Successful approved publish, rollback, or incident resolution | `publish_failed`, `incident_opened`, `rollback_requested` | Critical now | Publish event/incident detail | Stale only if newer recovery event supersedes | Cannot hide; canonical recovery required |
| `rollback_needed` | Incident or failed publish requires rollback decision/action | Incident, active pointer, rollback target/version/content history | `ops:rollback_needed:site:<site-id>:<incident-or-rollback-ref>:v1` | critical | Technical operator/superadmin/account owner | Select target, approve rollback, execute recovery, document alternative | Ignore incident, publish new version without decision | Rollback completed/verified or alternative recovery approved | `rollback_requested`, `rollback_completed`, `incident_resolved` | Critical now | Incident/recovery view | Stale when active pointer changes after target selection | Cannot hide except by audited alternative recovery |
| `incident_open` | Active incident affects migration/runtime/domain/publish/content/cost | Incident/recovery records, triggering events | `ops:incident_open:incident:<incident-id>:<latest-event-ref>:v1` | high/critical | Technical operator; account/superadmin by impact | Triage, communicate, recover, resolve | Close without evidence | Incident resolved with verification | `incident_opened`, `incident_updated`, `incident_resolved` | Incident lane and portfolio alerts | Incident/recovery detail | Stale when no update within policy | Dismiss only by incident resolution or superadmin decision |
| `cost_anomaly` | Estimate/actual cost threshold breached or cost signal anomalous | Cost events, estimates, thresholds, anomaly detector | `ops:cost_anomaly:<scope>:<subject-id>:<cost-event-ref>:v1` | high/critical | Agency owner/admin or superadmin | Pause/continue with exception, adjust threshold, cancel/defer | Continue over threshold without approval | Cost exception approved, anomaly resolved, or work cancelled | `cost_anomaly_detected`, `cost_exception_approved` | Cost lane and batch/site blockers | Cost/anomaly view | Stale when cost event period incomplete/old | Cannot hide high/critical without cost decision |
| `recovery_evidence_needed` | Failure/recovery/asset/audit refs missing before closeout | Failure/recovery record, asset diagnostics, audit dependency | `ops:recovery_evidence_needed:<scope>:<subject-id>:<missing-ref-code>:v1` | medium/high; critical for audit | Technical/migration operator | Attach/record evidence, classify, defer, open incident | Mark recovered/close batch/publish | Evidence recorded or audited decision says unavailable | `recovery_evidence_recorded`, `failure_classified` | Closeout blockers | Recovery/evidence detail | Stale when source evidence appears | Dismiss only by audited unavailable/waiver decision |
| `external_workflow_update` | External ref requires GNR8 follow-up or snapshot stale | External ref/snapshot model once decided; GNR8 subject refs | `ops:external_workflow_update:external_ref:<external-ref-id>:<snapshot-ref>:v1` | low/medium/high by linked action | Account manager | Open external ref, confirm, link GNR8 evidence, record no-longer-needed | Treat external state as GNR8 approval | GNR8 follow-up recorded or external ref unlinked by audit | `external_ref_linked`, `external_ref_confirmed`, `external_ref_followup_resolved` | External follow-up lane | External reference view | Stale unless recent sync/confirmation | Dismiss requires audited GNR8 decision |
| `ai_plan_review` | Future AI advisory bundle proposes or flags operator action | Immutable AI advisory bundle; evidence refs; cost refs | `ops:ai_plan_review:ai_advisory:<bundle-id>:<advisory-ref>:v1` | low/medium/high by recommendation | Assigned human reviewer | Accept as plan, reject, create human follow-up | Automatic mutation, publish, rollback, DNS/provider/billing action | Human review decision recorded | `ai_plan_review_requested`, `ai_plan_accepted`, `ai_plan_rejected` | AI advisory lane | AI advisory evidence view | Superseded when canonical evidence changes or newer bundle exists | Can dismiss only by audited human review decision |
