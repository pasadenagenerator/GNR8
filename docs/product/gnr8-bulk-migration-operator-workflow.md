# GNR8 Bulk Migration Operator Workflow

BMF-1 product workflow for operators using the Bulk Migration Factory through Command Center and derived Ops Inbox work.

This is documentation-only. It does not change Command Center runtime/UI behavior, APIs, worker behavior, import behavior, publish behavior, rollback behavior, DNS behavior, billing, provider execution, or runtime code.

## Operator Goal

An operator should be able to migrate an approximately 200-site portfolio by moving from intake to validated batch plans, dry-run evidence, approved operator-assisted execution, review, approval, domain readiness, publish readiness, and recovery without losing source-of-truth boundaries.

Command Center is the daily operator workbench. Specialized pages are drilldowns for batch detail, site detail, import evidence, route coverage, domain readiness, preview, content review, incidents, and audit timeline.

Ops Inbox is a derived queue of work items from canonical state. It is not a task database and must not become independent truth.

## Roles

| Role | Primary BMF responsibility | Must approve | Must not do in MVP |
| --- | --- | --- | --- |
| Superadmin | Global exceptions, critical recovery, unsupported launch exceptions, cross-client conflicts | Critical overrides, unsupported exceptions, rollback/publish if policy requires | Hidden provider execution, autonomous AI execution, live DNS mutation |
| Migration operator | Intake validation, batch planning, dry-run/start request, import execution, retry/replay triage | Batch continuation and retry within policy | Publish/rollback/domain mutation without required approval |
| Technical operator | Capture/import/runtime/domain/publish readiness, incidents, recovery evidence | Technical readiness, rollback recommendation, domain action evidence | Registrar/DNS mutation, provider execution |
| Content operator | Preview/content/slot review, content corrections, fidelity notes | Content readiness where policy allows | Site publish/domain actions |
| Account manager | Client/approval owner coordination, external workflow refs, domain owner follow-up | Client-facing readiness acknowledgements if delegated | Technical execution |
| Client reviewer | Preview/content/launch review | Client review/launch signoff where required | Runtime mutation |
| System/worker | Deterministic capture/import/check jobs explicitly triggered by workflow | Nothing | Autonomous mutation, publish, rollback, DNS, billing, provider execution |

## End-To-End Workflow

### 1. Intake

The operator imports or enters candidate sites as CSV/manual rows. API intake may be designed, but it must follow the same validation path and must not create jobs directly.

Required operator checks:

- Agency/client ownership is mapped.
- Site display name is present.
- Source URL is normalized and preserved with original value.
- Intended launch domain or explicit `no_custom_domain_yet` is present.
- Site class guess is present.
- Migration priority and operator owner are assigned.
- Approval owner/client reviewer is known or explicitly unknown.

Outcomes:

- Valid rows move to `intake_validated`.
- Missing or conflicting rows create `intake_blocked` or `duplicate_detected` Ops Inbox items.
- Unsupported rows are marked import-only, deferred, or out-of-scope before job creation.

### 2. Classification

The operator reviews site class guesses against the MVP supported-site-class matrix.

Classification outcomes:

- Supported: static brochure, mostly static multi-page, small business service.
- Supported with manual review: forms, widgets, external scripts, WordPress/Webflow/Wix/Squarespace static surfaces, multilingual, blogs/news, complex SEO redirects.
- Importable but not launch-ready: booking/reservation unless external flow verified, dynamic catalog/listing snapshots, heavy JavaScript only if fidelity is proven.
- Out of scope: commerce, auth/member, custom backend, payment flows, legal/compliance unless separately approved.

Unsupported or high-risk classifications generate Ops Inbox items and block launch readiness.

### 3. Batch Planning

The migration operator groups validated rows into a batch plan. The plan includes:

- Batch owner.
- Site ordering and priority.
- Supported/manual-review/import-only/out-of-scope counts.
- Intended import mode per site.
- Stop/continue policy recommendation.
- Expected route count and review workload.
- Expected domain/approval blockers.
- Cost center/estimate hooks when available.

No migration job should be created until rows are valid and assigned to an approved batch plan.

### 4. Dry-Run

The operator runs dry-run as a non-destructive readiness preview. Dry-run is never approval.

Dry-run shows:

- Intake validity.
- Duplicate source/domain conflicts.
- Site class support.
- Source reachability.
- Likely capture mode and multi-page risk.
- Unsupported indicators.
- Domain assumptions.
- Approval needs.
- Operator review workload.
- Risk level.
- Cost estimate if available.
- Recommended stop/continue policy.

Outcomes:

- Clean or acceptable dry-run moves to `awaiting_batch_start_approval`.
- Failed dry-run creates `dry_run_failed`.
- Dry-run can be waived only by explicit approval and audit.

### 5. Batch Start Approval

Before starting execution, the approver must see:

- Batch plan and site list.
- Dry-run result or waiver.
- Site class distribution.
- Duplicate/conflict report.
- Known blockers and owners.
- Stop/continue policy.
- Cost estimate/anomaly threshold.
- Domain and approval expectations.
- Unsupported/import-only/deferred site list.

Approval outcome:

- `batch_start_approved` allows operator-assisted execution.
- Rejection returns batch to planning/blocker resolution.

### 6. Execution

BMF MVP execution is operator-triggered and sequential by default.

Current implementation evidence supports:

- Run/resume controls.
- Sequential job execution.
- `stop_on_failure` and `continue_on_failure`.
- `maxJobs` limit.
- Completed-job skipping.
- Batch events and observability.

Execution must not claim:

- Queue worker orchestration.
- Leases.
- Heartbeats.
- Retry scheduler.
- Concurrent unattended cohorts.

During execution, Command Center shows:

- Batch status.
- Progress counters.
- Current/last job.
- Timeline.
- Failed jobs.
- Diagnostics.
- Pause reason.
- Next action.

### 7. Failure Triage

When a site fails, the operator classifies it using the failure taxonomy.

Default actions:

- Low/medium isolated failure: continue batch if policy allows; create site work item.
- High failure: block affected site, continue only if isolated and approved policy allows.
- Critical failure: pause batch or publish wave.
- Unknown failure: classify before recovery; repeated unknown failures pause batch.

Recovery decisions:

- Retry if action can be safely repeated.
- Replay only if stage class allows deterministic or variance-labeled replay.
- Defer site if outside current batch scope.
- Escalate critical or cross-client issues.
- Record recovery evidence before marking recovered.

### 8. Review And Approval

Imported sites move through preview, route review, content review, and approval.

Review must include:

- Preview evidence.
- Capture degradation flags.
- Route coverage for multi-page sites.
- Forms/widgets/scripts/manual review flags.
- Content slot/draft override state.
- Known limitations.
- Unsupported/import-only restrictions.

Approval is required for launch and cannot be inferred from preview readiness, dry-run, AI summary, or UI state.

### 9. Domain Readiness

Custom-domain sites require:

- Intended domain.
- Ownership/contact notes.
- DNS instruction snapshot.
- Vercel/domain verification evidence or explicit manual exception.
- SSL/readiness evidence where available.

Domain failures block custom-domain publish only for affected sites by default. Other sites may continue.

Live registrar/DNS mutation is forbidden before explicit ADR.

### 10. Publish Readiness

Publish readiness requires:

- Supported or exception-approved site class.
- Import/artifact success.
- Preview ready.
- Route/content review complete.
- Launch approval.
- Domain ready or approved internal/no-custom-domain exception.
- Rollback target or recovery plan.
- No critical incident open.
- Cost anomalies resolved or approved.

Publish readiness is a derived projection. Publish activation remains a separately approved side effect.

### 11. Closeout

Batch closeout records:

- Final counters.
- Completed sites.
- Completed with failures/deferred/import-only/out-of-scope sites.
- Recovery records.
- Remaining domain/approval/publish blockers.
- Cost anomaly decisions.
- Incident summary.
- Audit/event references.

## Bulk Intake Contract

Bulk intake may arrive by CSV, manual entry, or a future API. CSV and manual entry are required MVP paths. API intake is design-ready only and must use the same validation, classification, audit, and approval gates.

### Required Fields

| Field | Operator expectation | Blocker if missing/invalid |
| --- | --- | --- |
| `agencyId` or agency reference | Identifies the agency owner for scope, permissions, cost, and reporting. | `intake_blocked` until resolved. |
| `clientId` or client reference | Identifies the client under the agency. | `intake_blocked`; cross-agency mismatch is high severity. |
| `siteName` | Human-readable site name for Command Center and reports. | `intake_blocked`. |
| `sourceUrl` | Existing public website URL. | `intake_blocked` if not absolute `http`/`https`. |
| `intendedDomain` | Desired launch domain, or explicit `no_custom_domain_yet`. | `domain_action_needed` or `intake_blocked`. |
| `currentPlatformIfKnown` | WordPress, Webflow, Wix, Squarespace, static, custom, unknown, etc. | Not blocked if unknown is explicit; informs classification. |
| `siteClassIfKnown` | Initial supported/manual-review/import-only/deferred/out-of-scope guess. | `review_needed` if unknown; unsupported classes block launch. |
| `priority` | Batch ordering or urgency. | `intake_blocked` before ready/start approval. |
| `ownerOperator` | Internal owner for migration action. | `intake_blocked` before batch start. |
| `launchRequirement` | Launch intent, target date/window, staging-only, import-only, or defer. | `approval_needed` or `intake_blocked` if ambiguous. |
| `notes` | Operator/account context, including known caveats. | Required as explicit empty value if no notes. |
| `knownFormsFlag` | Flags contact/newsletter/lead forms. | `review_needed` if true/unknown. |
| `knownWidgetsFlag` | Flags maps, booking, chat, embeds, analytics, reviews, etc. | `review_needed` if true/unknown. |
| `knownBookingFlag` | Flags booking/reservation flow. | `review_needed`; launch blocked until external flow verified. |
| `knownCommerceFlag` | Flags cart/catalog/checkout/order flow. | `unsupported_site_class`; normal launch out of scope. |
| `knownAuthFlag` | Flags member/auth/private account behavior. | `unsupported_site_class`; normal launch out of scope. |
| `knownPaymentFlag` | Flags payment/donation/subscription flow. | `unsupported_site_class`; normal launch out of scope. |
| `knownBackendFlag` | Flags custom APIs, dashboards, databases, server workflows. | `unsupported_site_class`; normal launch out of scope. |
| `knownComplianceFlag` | Flags legal/medical/finance/accessibility/regulated constraints. | `unsupported_site_class` or compliance deferral. |
| `redirectSeoComplexityFlag` | Flags redirects, high-value SEO, canonical/hreflang concerns. | `route_review_needed` and SEO review. |
| `multilingualFlag` | Flags language routes/switchers/hreflang. | `route_review_needed` and content review. |
| `expectedPageCountOrRouteEstimate` | Rough route count for dry-run limits and batch sizing. | `review_needed` if unknown; high estimate may pause for route strategy. |
| `externalWorkflowReference` | Sheet, ticket, CRM, email, drive, or project ref if any. | Not a source of truth; required as explicit empty value if none. |

### Optional Fields

- `approvalOwner`, `clientReviewer`, `contentOwner`, `domainOwner`, `seoOwner`.
- `sourceSitemapUrl`, `criticalPages`, `redirectMapRef`, `knownCanonicalDomain`.
- `importMode`: `dry_run_only`, `single_page`, `multi_page_controlled`, `import_only_review`, `defer`.
- `batchCandidateGroup`, `costCenter`, `budgetThreshold`, `targetLaunchWindow`.
- `knownAssetIssues`, `brandAssetRefs`, `sourceAccessNotes`, `DNSRegistrarNotes`.

## Workflow Step Requirements

| Step | Operator goal | Required input | System output | Possible blockers | Approval requirement | Audit requirement | Command Center view | Ops Inbox item if blocked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Migration preparation workflow | Prepare a portfolio wave that can be split into safe batches. | Agency/client list, owner roles, launch goals, source inventory, cost/domain assumptions. | Portfolio readiness summary and candidate backlog. | Missing owners, unclear launch goals, unsupported portfolio mix. | None until batch start/exception. | `migration_wave_prepared` if implemented. | Portfolio wave dashboard with counts and owners. | `intake_blocked`, `approval_needed`. |
| CSV/manual/API intake expectations | Accept rows without creating jobs. | Required intake fields, source format, actor, agency scope. | Intake record, row validation status, normalized values. | Invalid rows, duplicate source/domain, unresolved client mapping. | Exception only for bypass/alias acceptance. | `bulk_intake_created`, `bulk_intake_validated`, `bulk_intake_failed`. | Intake table and validation counters. | `intake_blocked`, `duplicate_detected`. |
| Validation feedback | Tell operator exactly what must change before planning. | Original rows and validation rules version. | Row-level errors, warnings, duplicate report, owner needs. | Cross-client duplicates, missing required fields, unsupported flags. | Superadmin for critical exceptions. | Validation event with row refs. | Inline row status and batch readiness. | `intake_blocked`, `duplicate_detected`, `unsupported_site_class`. |
| Site class review workflow | Confirm MVP launch eligibility. | Intake flags, MVP site-class matrix, source/dry-run hints. | Site classification decision and launch eligibility. | Commerce/auth/payment/backend/compliance, heavy JS, unknown platform. | Superadmin for unsupported launch exception. | `site_classified`. | Site class badge, risk, allowed/prohibited actions. | `unsupported_site_class`, `review_needed`. |
| Dry-run review workflow | Review non-destructive batch readiness. | Validated intake, classification, duplicate/domain data, preflight refs. | Dry-run result, risk summary, blockers, cost estimate, recommended policy. | Source unreachable, dry-run failure, route risk, cost anomaly. | Waiver required to start without dry-run. | `batch_dry_run_started`, `batch_dry_run_completed`, `batch_dry_run_failed`. | Dry-run summary and blocker groups. | `dry_run_failed`, `cost_anomaly`, blocker-specific items. |
| Batch approval workflow | Decide whether the batch may execute under a policy. | Batch plan, dry-run/waiver, site counts, known blockers, cost threshold, stop/continue policy. | Approval granted/rejected with evidence snapshot. | Missing approver, stale evidence, critical blocker. | Required before `running`. | `batch_approval_requested`, `batch_approval_granted`, `batch_approval_rejected`. | Approval panel and run action only after approval. | `approval_needed`. |
| Batch execution workflow | Run operator-assisted sequential migration jobs safely. | Approved batch, job list, policy, current state. | Job/stage events, import results, failure records, counters. | Stage failure, worker interruption, cost pause, critical failure. | Prior start approval; resume approval for high/critical pauses. | `batch_started`, job/stage events, `batch_paused`, `batch_completed`. | Live batch detail, timeline, progress, pause reason. | `import_failed`, `incident_open`, `cost_anomaly`. |
| Failure triage workflow | Classify failure and choose safe recovery. | Failure code/diagnostics, stage/action, severity, evidence refs. | Retry/replay/defer/escalation decision and owner. | Unknown error, missing evidence, high/critical risk. | Required for retry/replay/high-critical continuation. | `site_import_failed`, `failure_classified`, recovery request events. | Failure groups by code/severity. | Failure-specific item, `recovery_evidence_needed`. |
| Retry/replay request workflow | Safely repeat or replay eligible work. | Failure record, stage/action, replay class, immutable input refs, reason. | Retry/replay request, new attempt, output refs, downstream reset notes. | Non-replayable side effect, missing input refs, cost threshold. | Operator approval; superadmin for critical/cost. | `site_retry_requested`, `site_replay_requested`, attempt outcome. | Role-gated retry/replay controls and history. | `approval_needed`, `cost_anomaly`. |
| Preview review workflow | Validate imported result before approval. | Import result, runtime artifact refs, preview readiness, route/content/capture diagnostics. | Review checklist, accepted/rejected result, blockers. | Preview smoke failure, visual drift, missing assets, broken nav. | Client/content/technical approval as policy requires. | `preview_generated`, `review_requested`, `review_completed`. | Preview readiness and review checklist. | `preview_failed`, `review_needed`, `route_review_needed`. |
| Content correction handoff | Resolve text/media/slot issues without changing runtime truth directly. | Review blockers, content slots, draft overrides, requested diffs. | Corrected draft/published-ready content state and preview refs. | Override conflict, missing owner, client rejection. | Content/client approval before publish-visible change. | `content_change_requested`, `draft_override_saved`, `content_ready`. | Content blockers and diffs. | `review_needed`, `approval_needed`. |
| Domain readiness handoff | Get custom-domain prerequisites ready without live registrar mutation. | Intended domain, DNS owner notes, instructions, Vercel/domain check refs. | Domain readiness result or exception. | Unclear DNS owner, stale instructions, failed verification. | Domain action/client approval if needed. | `domain_action_required`, `domain_verified`, `domain_exception_approved`. | Domain readiness panel. | `domain_action_needed`, `dns_verification_failed`. |
| Publish readiness handoff | Prove all launch gates are satisfied before publish activation. | Approved site, preview/review evidence, artifact refs, domain readiness, rollback target, cost/incident status. | Publish readiness passed/failed snapshot. | Approval missing, readiness failure, incident open, rollback target missing. | Publish activation approval remains separate. | `publish_readiness_passed`, `publish_readiness_failed`. | Publish readiness checklist. | `publish_readiness_failed`, `approval_needed`. |
| Incident/rollback handoff | Recover from publish/runtime/domain/content incident. | Incident record, active pointer before/after, known-good target, impact, owner. | Rollback or alternative recovery decision, verification, incident resolution. | Missing rollback target, approval missing, audit failure. | Rollback approval; emergency path still audited. | `incident_opened`, `rollback_requested`, `rollback_completed`, `incident_resolved`. | Incident/recovery panel. | `incident_open`, `rollback_needed`. |
| Cost anomaly workflow | Pause and review abnormal spend. | Cost events/estimate, threshold, site/batch refs, retry count. | Pause/continue/cancel decision, cost exception ref. | Missing cost owner, unexplained spike, threshold breach. | Superadmin or agency owner/admin. | `cost_anomaly_detected`, `cost_exception_approved`. | Cost banner and batch/site cost detail. | `cost_anomaly`. |
| Batch closeout workflow | Freeze the audit/reporting summary for a batch. | Final counters, site states, approvals, failures, recovery refs, cost summary, incident refs. | Closeout report and archive readiness. | Unresolved recovery evidence, open incident, missing audit refs. | Closeout approval recommended; required for critical incidents. | `batch_completed`, `batch_cancelled`, `batch_archived`. | Closeout report and archive action. | `recovery_evidence_needed`, `incident_open`. |
| Reporting summary workflow | Give account/ops a truthful portfolio update. | Batch closeout, item states, blockers, costs, approvals, external refs. | Summary by completed/warnings/failed/deferred/ready/blocked. | Stale state, unresolved external refs, missing cost/audit evidence. | None unless report asserts approval/launch. | `batch_report_generated` if implemented. | Report export/drilldown. | Blocker-specific items. |

## Command Center Requirements

Command Center must show:

- Batch list and batch status.
- Progress counters.
- Site class distribution.
- Supported/manual-review/out-of-scope counts.
- Import success/failure/degraded counts.
- Route coverage and route review status.
- Preview readiness.
- Review status.
- Approval status.
- Domain readiness.
- Publish readiness.
- Incidents.
- Cost indicators.
- Owner assignment.
- Next required operator action.
- Retry/replay controls as approved design links or role-gated actions.
- Runbook links.

Specialized drilldowns:

- Intake row detail.
- Dry-run result.
- Site import evidence.
- Multi-page route coverage.
- Rendered capture diagnostics.
- Preview/content review.
- Domain readiness.
- Publish readiness.
- Incident/recovery.
- Audit timeline.

## Ops Inbox Work Items

Ops Inbox items are derived from canonical state. They have stable keys, but the key is an address for a derived blocker, not source-of-truth state.

| Work item | Trigger | Source of truth | Severity | Owner role | Allowed actions | Blocked actions | Completion condition | Audit event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `intake_blocked` | Required intake field invalid/missing | `BulkIntakeRow` validation result | Medium | Account/migration | Correct row, defer, archive | Create job/start batch | Row validates or is deferred | `bulk_intake_validated`/`bulk_intake_failed` |
| `duplicate_detected` | Duplicate source URL or target domain | Duplicate report + site/domain records | Medium/critical | Migration/account/technical | Merge, reassign, defer, escalate | Start affected jobs/publish domain | Conflict resolved with evidence | `bulk_intake_validated` or domain event |
| `unsupported_site_class` | Site class is import-only/out-of-scope/high risk | Site class assessment | High/critical | Superadmin/migration | Defer, import-only, exception | Launch/publish | Classification accepted and handling recorded | `site_classified` |
| `dry_run_failed` | Dry-run failed | Dry-run result | Medium/high | Migration/technical | Retry dry-run, fix inputs, waive with approval | Start without waiver | Dry-run completes or waiver recorded | `batch_dry_run_failed` |
| `batch_start_approval_needed` | Batch awaits start approval | Batch plan/evidence package | Medium | Approver | Approve/reject/request changes | Run batch | Approval granted/rejected | `batch_start_approved` |
| `import_failed` | Site job failed | Job/stage/failure record | Medium/high | Migration/technical | Retry/replay/defer/escalate | Preview/approval/publish | Import succeeds or site deferred | `site_import_failed`, `site_recovered` |
| `capture_degraded` | Rendered capture partial/failed/raw fallback | Capture provenance/diagnostics | Medium | Technical/content | Replay capture, accept degraded review, defer | Launch silently | Review/exception recorded | `site_capture_degraded` |
| `route_review_needed` | Multi-page route map needs approval | Discovery/route map evidence | Medium/high | Migration/content/SEO | Approve coverage, trim/defer, re-run discovery | Launch without route approval | Route coverage accepted | `route_review_requested` if implemented |
| `preview_failed` | Preview cannot render/load | Preview/runtime diagnostics | High | Technical | Regenerate/check artifact, replay deterministic stage | Review/approval/publish | Preview ready or site deferred | `preview_generated` or failure event |
| `review_needed` | Preview/content/technical review pending | Review checklist/state | Medium | Content/client/technical | Approve/reject/request changes | Approval/publish | Review complete | `review_completed` |
| `approval_needed` | Launch/content/domain/publish approval missing | Approval request/records | Medium/high | Approver/account | Approve/reject/request changes | Publish | Approval decision recorded | `approval_requested`, `site_approved_for_launch` |
| `domain_action_needed` | Domain owner/action/instructions missing | Domain intent/binding/instructions | High | Technical/account/client | Record DNS action, recheck, approve exception | Custom-domain publish | Domain ready/exception/deferred | `domain_action_required`, `domain_verified` |
| `dns_verification_failed` | Domain check failed | Domain verification record | High | Technical/client | Fix DNS, wait TTL, recheck | Custom-domain publish | Verification passes/exception | `domain_action_required` |
| `publish_readiness_failed` | Readiness gate blocks publish | Readiness projection + blockers | High | Technical | Resolve blockers, re-run readiness | Publish | Readiness passes | `publish_readiness_failed`, `publish_readiness_passed` |
| `publish_failed` | Publish activation failed | Publish event/active pointer state | Critical | Technical/superadmin | Open incident, recover, retry with approval | Continue publish wave | Publish recovered or rollback decision | `publish_failed`, `incident_opened` |
| `rollback_needed` | Incident requires rollback decision | Incident + version history | Critical | Technical/superadmin | Approve/execute rollback | Further launch actions | Rollback completed or incident resolved | `rollback_requested`, `incident_resolved` |
| `incident_open` | Active incident exists | Incident record | High/critical | Technical/account | Triage, communicate, recover | Archive/close without evidence | Incident resolved | `incident_opened`, `incident_resolved` |
| `cost_anomaly` | Cost threshold exceeded | Cost events/projection | High/critical | Superadmin/agency owner | Approve exception, pause, adjust batch | Continue if critical unresolved | Cost reviewed/approved/resolved | `cost_anomaly_detected` |
| `recovery_evidence_needed` | Failure marked fixed without sufficient evidence | Failure/recovery records | Medium/high | Migration/technical | Attach evidence, verify, reopen | Mark recovered | Recovery record complete | `site_recovered` |

## Operator Runbooks

### Intake Blocker

1. Open row from Ops Inbox.
2. Correct missing/invalid field or set explicit defer/out-of-scope value.
3. Re-run validation.
4. Confirm item disappears because canonical row validates.

### Duplicate Domain

1. Compare affected intake rows, existing sites, and domain host bindings.
2. Identify client/domain owner.
3. Resolve to one launch domain owner or change/defer conflicting row.
4. Record evidence and owner note.
5. Re-run validation/dry-run.

### Capture Degraded

1. Inspect capture diagnostics, screenshots, DOM, style samples, and fallback mode.
2. Decide replay capture, accept raw fallback for review, or defer.
3. If replaying, record request and immutable input refs.
4. If accepting degraded evidence, require review/launch approver visibility.

### Import Failed

1. Inspect failed stage, diagnostics, and current job state.
2. Classify failure type and severity.
3. Choose retry, replay, defer, or escalation.
4. Preserve input/output refs and record recovery evidence.

### Route Review

1. Review route map, sitemap/robots/canonical/redirect/alias evidence.
2. Check route count, excluded routes, important pages, and preview validation.
3. Approve route coverage, request re-discovery with changed limits, or defer.

### Domain Action

1. Confirm intended launch domain and DNS owner.
2. Show DNS instruction snapshot.
3. Record operator/client DNS action evidence.
4. Re-run verification after TTL/expected propagation.
5. Mark domain ready only from verification or approved exception.

### Publish Failure

1. Stop publish wave.
2. Open incident.
3. Capture active pointer before/after, publish event, readiness snapshot, and domain state.
4. Decide retry after root cause or rollback.
5. Resolve incident with evidence before further launch actions.

## Product Warnings

- Do not add “Run all and publish” behavior.
- Do not let dry-run badges look like approvals.
- Do not let Ops Inbox items be manually closed without source-state change.
- Do not hide unsupported/import-only sites inside successful batch counters.
- Do not present estimated cost as billing truth.
- Do not show AI summaries without evidence links and advisory labels.
- Do not put daily BMF work in isolated admin pages instead of Command Center.

## Next Product Design Gate

Command Center and Ops Inbox Design should be next. It must define the information architecture, read models, derived work item rules, role-gated actions, drilldown map, and exact operator UI expectations for the BMF lifecycle before implementation starts.
