# GNR8 Evidence Package Contract

AAF-1 conceptual evidence package contract for GNR8 approvals and action gating.

This document is conceptual only. It does not create schemas, migrations, routes, storage objects, UI, workers, queues, or runtime behavior.

## Purpose

Evidence packages define what information must be shown and cited before a human approval or privileged action gate can proceed. They are the bridge between canonical source-of-truth refs, freshness labels, approver review, audit events, and later action attempts.

## Global Contract

Every evidence package should include:

- package id and package type;
- subject type and subject id;
- intended approval scope or action class;
- agency/client/site/batch/job/siteVersion refs where applicable;
- canonical source refs and source watermarks;
- freshness labels for each source family;
- limitations and known partial/missing sources;
- approver view summary;
- required audit timeline refs;
- package creation actor and time;
- package hash or immutable ref strategy in future implementation;
- supersession/staleness policy;
- privacy/redaction classification.

Required rule: Evidence packages are immutable snapshots or append-only references. If canonical source state changes, the evidence package must become stale or superseded; it must not silently remain valid.

## Freshness Labels

| Label | Meaning |
| --- | --- |
| `fresh` | Source read is within policy window and watermarks match. |
| `stale` | Source read is outside policy window or source changed. |
| `partial` | Some source family was unavailable or capped. |
| `external_snapshot` | Source is an external snapshot, not GNR8 truth. |
| `estimated` | Cost/risk value is an estimate, not billing/runtime truth. |
| `advisory` | AI/provider output is advisory only. |
| `superseded` | Package is replaced by newer evidence or source state. |
| `redacted` | Some detail is intentionally hidden by privacy/security policy. |

## Evidence Package Types

| Package type | Purpose | Required canonical refs | Required freshness labels/source watermarks | Required limitations | Required approver view | Required audit event | Stale/supersession triggers | What package proves | What package does not prove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batch_start_evidence` | Show a batch can start under a policy. | agency/client refs, intake row refs, classification refs, dry-run refs or waiver refs, batch refs, cost estimate refs, owner refs, audit timeline refs. | intake, classification, dry-run, batch plan, cost, policy. | dry-run gaps, unsupported rows, partial cost, owner gaps. | Batch plan, counts, stop/continue policy, blockers, approver role. | `evidence.batch_start.created`. | Intake/batch/classification/dry-run/cost/policy change. | What was known before batch start approval. | That execution will succeed or publish is allowed. |
| `dry_run_waiver_evidence` | Show why a current dry-run is missing/waived. | batch plan refs, intake refs, prior dry-run refs if any, failure refs, operator reason, cost refs, audit timeline refs. | intake, batch plan, prior dry-run/failure, policy. | Unknown dry-run risk, partial projections. | Waiver reason, risks, limited action unlocked. | `evidence.dry_run_waiver.created`. | Any batch/input/risk/policy change. | Why dry-run is unavailable or intentionally skipped. | That batch start is approved by itself. |
| `retry_replay_evidence` | Show retry/replay eligibility and reset scope. | failure refs, job/stage refs, retry/replay input refs, batch/job/stage refs, output refs, cost event refs, audit timeline refs. | failure, job/stage, input/output refs, replay class, cost. | Non-determinism, side effects, attempt count, downstream reset. | Failure, proposed action, replay class, expected reset, approvals needed. | `evidence.retry_replay.created`. | New attempt, input/output/failure/cost change. | Named retry/replay can be considered. | That downstream publish/domain/rollback is approved. |
| `unsupported_exception_evidence` | Show unsupported/degraded/route/form/widget/booking risk. | agency/client/site refs, intake refs, classification refs, source capture refs, dry-run refs, preview/readiness refs, failure refs, review refs, audit timeline refs. | classification, capture, preview, review, readiness. | Unsupported scope, degraded areas, client impact. | Risk summary, accepted limitation, prohibited claims. | `evidence.unsupported_exception.created`. | New source capture, classification, preview, review, client decision. | Risk was visible at exception decision. | That site is generally supported or publish-safe. |
| `launch_signoff_evidence` | Show client/agency launch readiness context. | agency/client/site refs, site version refs, runtime artifact refs, preview/readiness refs, review refs, content refs, domain readiness refs, rollback target refs, cost refs, audit timeline refs. | preview, readiness, review, content, domain, rollback, cost. | Remaining blockers/exceptions, stale external refs. | Client-safe summary, limitations, launch window, remaining technical gates. | `evidence.launch_signoff.created`. | New version/artifact/content/domain/readiness/incident/cost change. | Launch signoff context shown to approver. | Publish activation, DNS mutation, rollback, or technical readiness by itself. |
| `content_publish_evidence` | Show draft content changes ready for publish. | content slot/override refs, content history refs, site version refs, preview refs, review refs, client/site refs, audit timeline refs. | draft content, preview, review, slot/version. | Diff limitations, conflict/missing preview, redacted content. | Before/after diff, affected pages/slots, reviewer decision. | `evidence.content_publish.created`. | Draft update, slot change, preview stale, review update. | Named content set was reviewed. | Runtime version publish or domain readiness. |
| `domain_action_evidence` | Show safe domain/DNS action context. | domain binding refs, DNS instruction/check refs, Vercel/provider snapshot refs, agency/client/site refs, domain owner refs, audit timeline refs. | domain binding, DNS instruction, provider check, owner, policy. | External DNS remains external, check staleness, live mutation deferral. | Domain, owner, planned action, instructions/checks, stale labels. | `evidence.domain_action.created`. | Binding/instruction/check/provider/owner/policy change. | Named domain action/check/instruction is grounded in current refs. | Registrar/DNS truth or publish approval. |
| `domain_exception_evidence` | Show reason for domain readiness exception. | domain binding refs, DNS instruction/check refs, launch domain intent refs, failure refs, owner notes, external workflow refs if any, audit timeline refs. | domain, DNS check, external snapshot, launch window. | Broken/stale custom domain risk, client ownership ambiguity. | Exception reason, affected hosts, fallback/internal-host plan. | `evidence.domain_exception.created`. | New DNS check, domain owner/action, launch domain change. | Why a domain blocker may be accepted. | DNS mutation or technical publish approval. |
| `publish_activation_evidence` | Show all gates before active pointer change. | site version refs, runtime artifact refs, active pointer refs, content override refs, preview/readiness refs, review/launch approval refs, domain binding/check refs, rollback target refs, incident refs, cost event refs, audit timeline refs. | all publish prerequisites, very short window. | Any partial timeline/source, stale check, open exception. | Gate checklist, before/after target, rollback plan, prohibited shortcuts. | `evidence.publish_activation.created`. | Any referenced gate/source change or prior publish attempt. | Approver saw exact publish candidate and gates. | Publish success or deterministic replay. |
| `rollback_evidence` | Show incident/recovery rollback target and impact. | incident refs, active pointer refs, site version/artifact refs, content history refs, rollback target refs, publish event refs, readiness refs, domain refs, audit timeline refs. | incident, current state, target, readiness, domain/content. | Emergency gaps, verification needs, customer impact. | Incident, target, before/after plan, verification steps. | `evidence.rollback.created`. | Active pointer/content/incident/target changes. | Named rollback/recovery target was reviewed. | Root cause resolution or future publish approval. |
| `cost_exception_evidence` | Show spend threshold/anomaly context. | cost event refs, batch/job/site refs, retry count refs, estimate refs, threshold/policy refs, incident refs if any, audit timeline refs. | cost events, estimate, threshold, batch/site scope. | Estimated/partial cost, no full Stripe/customer billing. | Cost reason, affected scope, threshold, decision impact. | `evidence.cost_exception.created`. | New cost event, threshold, anomaly, batch/job scope change. | Cost risk was visible. | Customer billing truth or technical safety. |
| `incident_recovery_evidence` | Show incident impact and recovery decision context. | incident refs, failure refs, active pointer refs, domain/content/cost refs, recovery plan refs, audit timeline refs. | incident, affected source families, recovery plan. | Unknown root cause, partial logs/timelines, communication gaps. | Severity, impact, owner, plan, approvals required. | `evidence.incident_recovery.created`. | New impact, recovery attempt, incident status/source change. | Recovery decision context. | Incident closure without verification. |
| `external_workflow_reference_evidence` | Show an external ref/snapshot as evidence only. | external workflow refs, snapshot refs, linked agency/client/site/batch/job/action refs, audit timeline refs. | external snapshot, subject refs. | External source is not GNR8 truth, staleness, access limits. | Link/id, snapshot summary, owner, reason for acceptance. | `evidence.external_ref.created`. | External snapshot/source/linked subject change. | External ref existed and was accepted as evidence. | GNR8 approval, state, or execution truth. |
| `ai_advisory_review_evidence` | Show AI/provider advisory input/output and limitations. | AI/provider bundle refs, input source refs, output refs, cost event refs, policy/model refs, audit timeline refs. | input refs, bundle, model/provider, cost, advisory. | Model limitations, non-execution, stale inputs, redactions. | Recommendation, supporting refs, risks, human decision prompt. | `evidence.ai_advisory_review.created`. | Input/state/policy/model/cost/bundle change. | AI plan can be considered as advisory evidence. | Approval, execution, mutation, publish, rollback, DNS, or billing action. |

## Required Ref Families

Evidence packages must use relevant combinations of:

- agency/client/site refs;
- intake row refs;
- classification refs;
- dry-run refs;
- batch/job/stage refs;
- failure refs;
- retry/replay input refs;
- source capture refs;
- runtime artifact refs;
- site version refs;
- active pointer refs;
- content slot/override refs;
- preview/readiness refs;
- review refs;
- domain binding refs;
- DNS instruction/check refs;
- publish readiness refs;
- rollback target refs;
- incident refs;
- cost event refs;
- external workflow refs;
- AI/provider bundle refs where applicable;
- audit timeline refs.

## Approver View Rules

Approver views must show:

- exact approval scope and prohibited actions;
- evidence package type and freshness labels;
- canonical source refs and source watermarks;
- unresolved blockers, warnings, and limitations;
- role required and actor role/scope;
- expiration window;
- revocation/supersession triggers;
- audit events that will be written for request and decision;
- whether any timeline/source family is partial;
- privacy/redaction label.

## Explicit Deferrals

- Evidence package storage implementation.
- Hashing/signing implementation.
- UI rendering of evidence packages.
- External connector snapshot implementation.
- AI advisory bundle storage changes.
- Long-term retention policy automation.
