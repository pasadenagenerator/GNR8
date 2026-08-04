# GNR8 Single-Site Launch Readiness Evidence Architecture

Phase: MVP-36
Scope: Documentation and architecture only.

This document defines the future launch readiness evidence package shape after validated launch approval and before publish activation review. It does not implement persistence, evidence builders, source readers, services, routes, provider calls, billing, domain/DNS actions, publish activation, publish execution, rollback, UI, Command Center, Ops Inbox, or client portal work.

## Purpose

The launch readiness evidence package should assemble source-owned refs proving that the improved candidate is operationally ready to proceed to publish activation review. It is a readiness package, not a publish activation evidence package and not an approval decision.

## Package Envelope

Future package type:

- `single_site_launch_readiness_evidence`

Recommended subject:

- subject type: `single_site_launch_readiness_package`
- subject id: future launch readiness id or deterministic migration/site-version package id
- action context: `prepare_publish_activation_review`

Required envelope fields:

- tenant, agency, client, site, migration, site version, runtime artifact;
- launch approval id and validated AAF launch decision ref;
- readiness status: `ready`, `ready_with_limitations`, or `blocked`;
- source reader version and package policy version;
- generated/captured time;
- aggregate source watermark;
- per-dimension source watermarks;
- missing/stale/blocked/limitation arrays;
- audit timeline refs;
- privacy label and retention class;
- idempotency key and correlation id.

## Evidence Categories

| Category | Required for MVP | Refs to include | Preferred watermark | Missing/stale behavior |
| --- | --- | --- | --- | --- |
| Launch approval AAF decision refs | Required | `single_site_launch_approval` request, evidence package, decision, freshness rows, service workflow ref. | MVP-35 semantic launch approval watermark. | Blocks launch readiness. |
| Content approval AAF decision refs | Required | `single_site_content_approval` decision, request/evidence, content service row. | Content approval decision plus candidate version/artifact watermark. | Blocks launch readiness and publish activation later. |
| Client approval AAF decision refs where required | Conditional required | Client approval policy, decision, request/evidence, limitations. | Client approval semantic watermark. | Blocks when policy requires it; otherwise not applicable. |
| Improved candidate refs | Required | Runtime site version, runtime artifact, bundle hash, renderer compatibility, artifact governance, preview ref. | Artifact `bundle_sha256` plus site version `updated_at` or stable hash. | Blocks if missing/mismatched/stale. |
| Publish target refs | Required | `gnr8_publish_targets` row, target id, environment, stage, policy version, source ref. | Explicit `source_watermark`; fallback target policy hash. | Blocks launch readiness if missing/disabled/retired/mismatched. |
| DDOM readiness refs | Required for custom-domain or target policy | Latest DDOM snapshot/ref rows, readiness/freshness/blocker fields. | DDOM `source_watermark`. | Missing/stale/blocked domain readiness blocks launch readiness. |
| Domain ownership/instruction/operator evidence refs | Required for custom-domain paths | DNS instruction snapshot, owner evidence, manual completion evidence, external refs, exception refs where applicable. | Latest accepted evidence or instruction snapshot watermark. | Missing owner/instruction/evidence blocks or creates limitation by policy. |
| Vercel/custom-domain/SSL stored-state refs | Conditional required | Stored Vercel-shaped binding snapshot, custom-domain status, SSL/readiness snapshot refs. | Stored snapshot `last_checked_at` plus binding/update watermark. | Stale/missing provider-observed state blocks when policy requires it. |
| Billing/subscription/hosting entitlement refs | Required | GNR8 site/client subscription projection, hosting entitlement, billing account/cost center, cost/margin refs. | Entitlement updated/effective timestamp plus subscription projection watermark. | Blocks launch readiness until source truth exists or explicit exception policy exists. |
| Stripe customer/subscription/payment refs | Conditional required | Stripe customer/subscription/payment/invoice refs, webhook reconciliation refs, event ids. | Stripe object updated/current period/payment status plus webhook event id. | Blocks when Stripe truth is required by billing mode. |
| Rollback readiness refs | Required | Current pointer, prior known-good version/artifact, recovery plan, rollback limitations, content history refs. | Aggregate hash over pointer/version/artifact/recovery plan refs. | Blocks readiness when missing; plan-only may be limitation if policy accepts. |
| Preview/smoke QA refs | Required | Smoke validator run, preview route status, asset checks, QA notes, visual/manual QA refs. | Smoke run captured time plus target candidate watermark. | Missing/stale smoke evidence blocks or creates limitation by policy. |
| Limitation/blocker refs | Required when present | Launch approval limitations, readiness blockers, exceptions, unresolved owner notes. | Aggregate blocker/limitation hash. | Unaccepted P0 blockers block readiness. Accepted limitations carry forward. |
| Audit timeline refs | Required | AAF audit events, single-site state events, DDOM/audit refs, billing/domain/readiness activity refs. | Timeline max created-at plus source ref set hash. | Partial timeline creates limitation; critical gaps block. |
| PASR shadow refs | Optional diagnostic | Shadow evidence/gate/audit refs, PASR read model refs, redacted projection refs. | PASR evidence/source/gate aggregate watermark. | Never blocks launch readiness by itself; can warn and recommend publish activation prep work. |

## Freshness Model

Every category must carry:

- source owner;
- source ref;
- current watermark;
- evidence watermark;
- captured at;
- expires at when TTL applies;
- freshness state: `fresh`, `stale`, `failed`, `partial_timeline`, or `not_applicable`;
- stale reason;
- missing reason;
- blocker category;
- owner workflow for resolution.

## Freshness And Blocker Matrix

| Dimension | Required for launch readiness | Freshness source | Preferred watermark | Fallback watermark | Stale behavior | Missing behavior | Blocker category | Blocks launch readiness | Blocks publish activation later | Owner workflow |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Launch approval truth | Required | MVP-35 bridge validation plus AAF request/evidence/decision freshness. | Launch approval semantic watermark. | Hash over launch approval row, AAF request, evidence, decision, revocation/supersession/expiry refs. | Blocks and returns to launch approval review. | Blocks readiness work start. | `launch_approval_missing_or_stale` | Yes | Yes, because readiness package cannot be trusted. | Launch approval AAF/single-site workflow. |
| Content approval truth | Required | Content approval service and exact AAF decision tied to candidate. | Content approval semantic watermark. | Hash over content approval row, decision refs, candidate refs, limitations. | Blocks; candidate/content must be reapproved. | Blocks. | `content_approval_missing_or_stale` | Yes | Yes. | Content approval workflow. |
| Client approval truth where required | Conditional required | Client approval requirement policy plus exact AAF decision. | Client approval semantic watermark. | Hash over policy, decision refs, candidate refs, limitations. | Blocks when required; otherwise not applicable. | Blocks when required. | `client_approval_missing_or_stale` | Yes when required | Yes when required. | Client approval workflow. |
| Improved candidate runtime version/artifact truth | Required | Runtime site version/artifact current row and bundle/governance fields. | Artifact `bundle_sha256` plus site version `updated_at`. | Hash over version/artifact identity, renderer compatibility, publish stage, governance, manifest. | Blocks; downstream approvals may need supersession. | Blocks. | `candidate_runtime_truth_missing_or_stale` | Yes | Yes. | Improved candidate/runtime workflow. |
| Publish target truth | Required | PTT row status, policy version, environment, stage, allowed artifact stages. | PTT `source_watermark`. | Hash over target id, status, environment, kind, stage, policy, allowed stages, limitations. | Blocks; target policy must be refreshed or corrected. | Blocks. | `publish_target_missing_or_invalid` | Yes | Yes. | PTT source-truth/admin workflow. |
| Domain/DDOM readiness truth | Required for custom-domain or target policy | DDOM snapshot readiness/freshness and refs. | DDOM `source_watermark`. | Hash over snapshot header, source refs, blockers, warnings, freshness. | Blocks unless exact source-owned exception exists. | Blocks for required domain paths. | `domain_readiness_missing_or_stale` | Yes | Yes. | DDOM manual snapshot refresh outside PASR. |
| DNS instruction/operator evidence | Required for custom-domain paths | DNS instruction snapshot, owner evidence, accepted external refs, audit refs. | Latest instruction/evidence source watermark. | Hash over instruction/evidence refs and captured timestamps. | Blocks or carries accepted limitation by policy. | Blocks when required. | `domain_operator_evidence_missing` | Yes for custom-domain paths | Yes for custom-domain paths. | Domain/DNS operator workflow. |
| Vercel/custom-domain/SSL observed/stored state | Conditional required | Stored provider-shaped snapshot and TTL, never live provider call. | Stored snapshot watermark or `last_checked_at` plus binding `updated_at`. | Hash over stored Vercel/custom-domain/SSL fields. | Blocks when policy requires that observed state. | Blocks when required. | `provider_stored_state_missing_or_stale` | Yes when required | Yes when required. | Domain/DDOM workflow. |
| Billing/subscription/hosting entitlement truth | Required | GNR8 site-scoped hosting entitlement/subscription operating source once implemented. | Entitlement/source row watermark. | Hash over entitlement/subscription/audit refs. | Blocks; entitlement/subscription must be refreshed or reconciled. | Blocks. | `billing_hosting_entitlement_missing_or_stale` | Yes | Yes. | Billing/hosting MVP-lite workflow. |
| Stripe/payment truth where applicable | Conditional required | Stored Stripe webhook/projection/payment refs; no Stripe API call from reader. | Stripe object/payment/webhook event watermark. | Hash over stored Stripe ids/status/current period/payment refs. | Blocks when billing mode requires Stripe truth. | Blocks when required. | `stripe_payment_truth_missing_or_stale` | Yes when required | Yes when required. | Billing/Stripe reconciliation workflow. |
| Rollback readiness evidence | Required | Future rollback readiness source or accepted recovery plan plus runtime pointer/history refs. | Rollback readiness record watermark. | Hash over pointer/history/version/artifact/recovery plan refs. | Blocks until refreshed; plan-only may be limitation if accepted. | Blocks. | `rollback_readiness_missing_or_stale` | Yes | Yes. | Rollback readiness workflow. |
| Preview/smoke QA evidence | Required | Smoke/QA run refs tied to candidate watermark and policy TTL. | Smoke run captured time plus candidate watermark. | Hash over run target, checks, results, QA refs. | Blocks or carries accepted limitation by policy. | Blocks. | `smoke_qa_missing_or_stale` | Yes | Yes. | Preview/smoke QA workflow. |
| Limitation/blocker refs | Required when present | Source-owned blocker/limitation records and accepted exceptions. | Aggregate blocker/limitation hash. | Hash over stable blocker ids, categories, severities, acceptance refs. | Unaccepted blocker blocks; accepted limitation carries forward. | Missing limitation details blocks `ready_with_limitations`. | `unaccepted_limitation_or_p0_blocker` | Yes for open P0/unaccepted blockers | Yes. | Source owner of each blocker. |
| Audit timeline refs | Required | AAF audit, single-site state events, DDOM/billing/domain/QA refs. | Timeline max created-at plus source ref set hash. | Hash over available event refs plus partial marker. | Partial critical timeline blocks; non-critical partial timeline carries limitation. | Blocks when required refs cannot be reconstructed. | `audit_timeline_partial_or_missing` | Yes for critical gaps | Yes for evidence validation. | Audit/evidence workflow. |
| Publish activation approval truth | Not required for launch readiness ready; required next | AAF `publish_activation` timeline if present. | Publish activation approval timeline watermark. | Hash over request/evidence/decision/revocation/supersession/expiry refs. | Does not make launch readiness stale unless cited as handoff evidence; blocks publish activation later. | Produces `publish_activation_approval_required`, not launch readiness blocker after package is ready. | `publish_activation_approval_required` | No, after readiness is ready | Yes. | AAF publish activation approval workflow. |
| PASR shadow observations | Optional diagnostic | Existing PASR evidence/gate/read-model refs. | PASR source/evidence/gate aggregate watermark. | Hash over PASR refs. | Warning only. | Not applicable; no blocker. | `pasr_shadow_diagnostic_missing` | No | No until future explicit enforcement milestone. | PASR evidence review workflow. |
| Command Center projection | Optional derived display | Redacted derived read model generation. | Projection generation/version watermark if present. | Hash over projection inputs. | Display stale only. | No source blocker. | `command_center_projection_unavailable` | No | No. | Command Center projection workflow. |
| Ops Inbox projection | Optional derived display | Derived work item projection generation. | Projection generation/version watermark if present. | Hash over projection inputs. | Display stale only. | No source blocker. | `ops_inbox_projection_unavailable` | No | No. | Ops Inbox projection workflow. |

Preferred aggregate watermark:

`sha256:` stable JSON over package subject identity, policy version, category source refs, current source watermarks, evidence watermarks, freshness states, blockers, accepted limitations, and not-applicable policy refs.

Excluded from aggregate watermark:

- package id;
- DB generated timestamps;
- actor display name;
- volatile logs;
- projection generation time;
- UI labels.

## Blocker Categories

Stable blocker categories:

- `launch_approval_missing_or_stale`
- `content_approval_missing_or_stale`
- `client_approval_missing_or_stale`
- `candidate_runtime_truth_missing_or_stale`
- `publish_target_missing_or_invalid`
- `domain_readiness_missing_or_stale`
- `domain_operator_evidence_missing`
- `provider_stored_state_missing_or_stale`
- `billing_hosting_entitlement_missing_or_stale`
- `stripe_payment_truth_missing_or_stale`
- `rollback_readiness_missing_or_stale`
- `smoke_qa_missing_or_stale`
- `unaccepted_limitation_or_p0_blocker`
- `audit_timeline_partial_or_missing`
- `source_reader_unavailable`

## Package Outcomes

| Outcome | Meaning | Publish activation implication |
| --- | --- | --- |
| `ready` | All required dimensions are fresh/current and no unresolved blockers remain. | Publish activation approval may be requested separately. |
| `ready_with_limitations` | Required dimensions are acceptable only with carried limitations/exceptions. | Publish activation approval must see and accept limitations. |
| `blocked` | One or more required dimensions are missing, stale, failed, or unaccepted blockers. | Publish activation review should not proceed except to record blockers. |

## PASR Diagnostic Evidence Rule

PASR shadow evidence may help operators anticipate publish activation blockers. It must remain:

- shadow-only;
- non-enforcing;
- derived diagnostic evidence;
- unable to create DDOM snapshots;
- unable to approve publish activation;
- unable to satisfy launch readiness by itself.

## Boundary Confirmation

This evidence architecture does not create AAF packages, decisions, gate attempts, DDOM snapshots, publish targets, billing records, runtime artifacts, active pointers, rollback state, Command Center projections, Ops Inbox work items, routes, services, or provider calls.
