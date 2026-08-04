# GNR8 Single-Site Launch Readiness Source Reader Design

Phase: MVP-36
Scope: Documentation and architecture only.

This document designs a future read-only single-site launch readiness source reader. It does not implement the reader, persistence, SQL, TypeScript, services, routes, UI, provider calls, billing activation, DDOM snapshot creation, publish activation, publish execution, rollback, Command Center, Ops Inbox, or client portal work.

## Purpose

The future source reader should gather existing source truth for a single improved site candidate after validated launch approval and return deterministic diagnostics for a launch readiness evidence builder.

It is distinct from PASR-1. PASR-1 reads publish activation sources for AAF publish activation evidence. Launch readiness needs a broader pre-publish package that includes billing/hosting, rollback readiness, smoke QA, launch approval, content/client approvals, domain/operator evidence, and limitations.

## Required Guarantees

The reader must:

- read existing source truth only;
- use read-only transactions where DB-backed;
- use repeatable-read transaction snapshots where multiple DB sources are read;
- never create DDOM snapshots;
- never create AAF approvals, evidence packages, gate attempts, audit events, or policy evaluations;
- never call providers;
- never mutate runtime, billing, domain, publish, rollback, Command Center, Ops Inbox, or client portal state;
- return explicit `missing`, `stale`, `blocked`, `ready`, and `ready_with_limitations` diagnostics;
- output deterministic source refs and watermarks;
- support later evidence builder use.

The reader must not:

- call live DNS;
- call Vercel, Openprovider, registrars, DNS providers, SSL providers, or Stripe;
- call AI;
- infer approval from readiness;
- infer readiness from UI, Command Center, Ops Inbox, PASR labels, preview URLs, logs, or route button text;
- import mixed read/write runtime-store helpers unless a narrow read-only wrapper is formally accepted.

## Proposed Module Boundary

Future suggested location:

- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`

This phase does not create those files.

## Inputs

Required input:

- tenant id;
- client id when known;
- site id;
- migration id;
- improved candidate site version id;
- improved runtime artifact id;
- launch approval id;
- launch AAF decision id;
- intended publish target id, defaulting only when source-owned policy says so;
- actor/correlation for read diagnostics only;
- policy version.

Optional input:

- required client approval decision id;
- content approval decision id;
- DDOM snapshot id preference;
- publish activation approval ref if already prepared;
- smoke QA run ref;
- rollback readiness ref;
- billing/hosting entitlement ref.

## Output Shape

The reader should return:

- `readerVersion`;
- `capturedAt`;
- `readOnlyTransaction`: `ok`, `unavailable`, or `not_required`;
- subject identity;
- aggregate status: `ready`, `ready_with_limitations`, `blocked`, or `unavailable`;
- one diagnostic per readiness dimension;
- source refs with exact table/source owner;
- current watermarks;
- evidence watermarks when supplied;
- freshness states and stale reasons;
- blocker categories;
- limitations;
- owner workflows;
- deterministic aggregate source watermark.

Dimension diagnostic shape:

```json
{
  "dimension": "domain_readiness",
  "required": true,
  "status": "blocked",
  "sourceOwner": "DDOM",
  "sourceRefs": [],
  "preferredWatermark": null,
  "fallbackWatermark": null,
  "freshness": "missing",
  "missingReason": "missing_ddom_snapshot",
  "staleReason": null,
  "blockerCategory": "domain_readiness_missing_or_stale",
  "blocksLaunchReadiness": true,
  "blocksPublishActivationLater": true,
  "ownerWorkflow": "run_ddom_snapshot_refresh_outside_pasr"
}
```

## Dimension Read Rules

| Dimension | Required for MVP | Source read | Preferred watermark | Fallback watermark | Missing/stale behavior |
| --- | --- | --- | --- | --- | --- |
| Launch approval | Required | Launch approval service rows plus AAF exact decision/evidence/request timeline. | MVP-35 semantic watermark. | Hash over decision/request/evidence refs and service row. | Missing/stale/wrong-scope blocks. |
| Content approval | Required | Content approval service rows plus AAF exact decision refs. | Content approval semantic watermark. | Hash over approval row and candidate refs. | Missing/stale blocks. |
| Client approval | Required when policy says so | Client approval service rows, AAF decision, requirement policy. | Client approval semantic watermark. | Hash over policy/decision/limitations. | Missing/stale blocks when required; otherwise not applicable. |
| Improved candidate | Required | Runtime site version/artifact tables through read-only queries. | Artifact `bundle_sha256` plus site version `updated_at`. | Hash over candidate identity/governance/publish stage. | Missing/mismatch/stale blocks. |
| Publish target | Required | PTT `gnr8_publish_targets`. | `source_watermark`. | Hash over policy/status/env/stage/allowed artifacts. | Missing/disabled/retired/mismatch blocks. |
| DDOM/domain readiness | Required by target/domain policy | Latest matching DDOM snapshot/ref rows. | DDOM `source_watermark`. | Hash over snapshot fields. | Missing/stale/blocked blocks; ready_with_warnings carries limitations. |
| DNS/operator evidence | Conditional required | Existing instruction/evidence/audit/external refs cited by DDOM or readiness workflow. | Latest accepted source/evidence watermark. | Hash over refs and captured timestamps. | Missing owner/instruction/completion evidence blocks when policy requires. |
| Vercel/custom-domain/SSL stored state | Conditional required | Stored domain binding/DDOM snapshot fields only. | Stored snapshot watermark or `last_checked_at` plus binding `updated_at`. | Hash over provider-shaped stored fields. | Missing/stale blocks when policy requires. |
| Billing/hosting entitlement | Required | Future site-scoped entitlement/subscription source truth; current cost/billing foundations evidence-only until implemented. | Entitlement/source row updated/effective timestamp. | Hash over subscription/entitlement/audit refs. | Missing site-scoped truth blocks. |
| Stripe/payment truth | Conditional required | Stripe projection/webhook refs already stored in GNR8; no Stripe API calls. | Stripe object/update/webhook event watermark. | Hash over stored Stripe refs/status/current period. | Missing/stale required payment truth blocks. |
| Rollback readiness | Required | Future rollback readiness source, runtime active pointer/version/artifact/content history refs. | Readiness record watermark when present. | Hash over pointer/history/recovery plan refs. | Missing/stale blocks; plan-only can be limitation if policy permits. |
| Preview/smoke QA | Required | Stored smoke/QA run refs when available, preview evidence refs. | Smoke run captured time plus candidate watermark. | Hash over QA refs/check results. | Missing/stale/failed blocks unless accepted limitation. |
| Publish activation approval | Not required to be ready; required next | AAF `publish_activation` timeline if supplied. | Approval timeline aggregate watermark. | Hash over exact decision/request/evidence refs. | Missing yields `publish_activation_approval_required`, not readiness failure after package is ready. |
| PASR shadow | Optional | PASR read model/evidence/gate/audit refs only if existing. | PASR source/evidence/gate aggregate watermark. | Hash over PASR refs. | Missing not blocking; stale warns only. |

## Read-Only Transaction Strategy

DB-backed reads should run under:

- `begin isolation level repeatable read read only`;
- one database `transaction_timestamp()`;
- `commit`;
- no DDL or mutation SQL.

If read-only transaction setup fails, the reader should fail closed with `source_reader_unavailable` and not emit a `ready` result.

## Watermark Strategy

The reader should prefer canonical source watermarks. When unavailable, it should compute stable `sha256:` hashes over documented canonical fields sorted by key and row identity.

Watermarks must exclude:

- projection generation timestamps;
- UI labels;
- log text;
- actor display names;
- non-source random ids;
- transient route/request state.

## Owner Workflows

Resolution workflows should route to source owners:

- launch/content/client approval: AAF/single-site approval workflow;
- candidate runtime mismatch: runtime/improved candidate workflow;
- DDOM missing/stale: DDOM manual snapshot refresh outside PASR;
- domain operator evidence: domain/DNS operator workflow;
- billing/hosting missing: billing/hosting MVP-lite workflow;
- Stripe missing: billing/Stripe reconciliation workflow without live reader calls;
- rollback missing: rollback readiness workflow;
- smoke QA missing: preview/smoke QA workflow;
- publish activation approval missing: AAF publish activation workflow.

## Test Requirements For Future Implementation

Future implementation should include:

- static import guardrails for providers, runtime mutation, rollback, routes, Command Center, Ops Inbox, Stripe SDK, AI, DDOM caller/trigger, AAF writers;
- SQL mutation token guardrails;
- unit tests for every missing/stale/blocked/ready path;
- disposable local DB integration tests only;
- deterministic watermark tests;
- changed-file scope checks proving no runtime behavior changed.

## Boundary Confirmation

The launch readiness source reader is a read boundary. It cannot create readiness truth, approvals, evidence, snapshots, entitlements, subscriptions, publish targets, active pointers, rollback state, Command Center state, or Ops Inbox state.
