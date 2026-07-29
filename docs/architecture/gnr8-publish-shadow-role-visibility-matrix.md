# GNR8 Publish Shadow Role Visibility Matrix

PASR-5 role matrix for future publish shadow result visibility.

This document is documentation-only. It does not implement UI, APIs, server actions, routes, migrations, read-model changes, Command Center changes, Ops Inbox changes, runtime behavior, publish behavior, rollback behavior, enforcement, DDOM snapshot creation, AAF approval creation, provider calls, DNS/domain calls, billing, Stripe, AI, storage, or authentication/RBAC changes.

Publish shadow results are derived-only, non-enforcing, and do not block publish. Redacted read models are still derived projections and never source truth. Command Center and Ops Inbox are derived-only. DDOM readiness is not publish activation approval. Client visibility is restricted and deferred for MVP. Role-aware redaction must happen before broad UI surfacing.

## Visibility Vocabulary

| Value | Meaning |
| --- | --- |
| Full | Show exact PASR-4 field values, subject to tenant/client/site scope and target surface authorization. |
| Summarized | Show safe labels, counts, statuses, or categories without raw refs, ids, payloads, actor ids, watermarks, or diagnostics. |
| Redacted | Show that data exists but hide sensitive values, for example `redacted`, restricted link, or hidden ref count. |
| Hidden | Omit the field family from the role view. |
| Forbidden | Must not be shown for this role/surface in MVP. |

All visibility assumes the actor is authenticated and authorized for the tenant/client/site scope. Scope mismatch is denied before field-level redaction.

## Role Definitions

| Role | Intended scope | Notes |
| --- | --- | --- |
| Platform superadmin | All tenants/agencies/clients/sites. | Full operational governance and sensitive debugging visibility. |
| Agency admin | Agency portfolio, scoped clients/sites. | Accountable for agency operations but not raw technical internals by default. |
| Agency operator | Assigned agency/client/site work. | Needs status, next action, and source-owned drilldown, not raw internals. |
| Technical operator | Assigned technical runtime/domain/publish work. | Needs DDOM, target, gate, source, and failure diagnostics. |
| Account manager | Assigned client/site follow-up. | Needs client-safe internal summaries and routing, not raw refs. |
| Client reviewer | Client/site review scope. | No publish shadow diagnostic visibility in MVP. |
| Read-only auditor | Scoped audit/evidence review. | Needs immutable refs and timeline reconstruction, not operational mutation. |
| Support/debug operator | Scoped support incident/debug access. | Needs technical diagnostics under explicit support authorization. |
| Future AI operator | Redacted advisory/evidence consumer. | May consume summary categories only; no raw refs/secrets in MVP. |

Current implementation roles such as `superadmin`, agency `owner/admin/member`, and client membership roles must be mapped to these product/security roles in a later implementation milestone. This matrix does not change RBAC implementation.

## Matrix

| Field category | Platform superadmin | Agency admin | Agency operator | Technical operator | Account manager | Client reviewer | Read-only auditor | Support/debug operator | Future AI operator |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Overall shadow status | Full | Full | Full | Full | Summarized | Forbidden | Full | Full | Summarized |
| Severity | Full | Full | Full | Full | Summarized | Forbidden | Full | Full | Summarized |
| Recommended next action | Full | Summarized | Summarized | Full | Summarized | Forbidden | Summarized | Full | Summarized |
| Site/version/artifact refs | Full | Summarized site/version; artifact redacted | Summarized site/version; artifact hidden | Full | Summarized site only | Forbidden | Summarized with audit refs | Full | Redacted |
| DDOM readiness status | Full | Summarized | Summarized | Full | Summarized | Forbidden | Summarized | Full | Summarized |
| DDOM snapshot refs | Full | Redacted | Hidden | Full | Hidden | Forbidden | Full | Full | Redacted |
| Domain/internal host details | Full | Redacted | Hidden | Full | Summarized owner/follow-up only | Forbidden | Redacted | Full | Hidden |
| Publish target details | Full | Summarized | Summarized | Full | Hidden | Forbidden | Redacted | Full | Hidden |
| Approval status | Full | Full summary | Summarized | Full | Summarized | Forbidden | Full | Full | Summarized |
| Approval actor/decision details | Full | Redacted | Hidden | Redacted | Hidden | Forbidden | Redacted or full by audit policy | Full when support-authorized | Hidden |
| Evidence package refs | Full | Redacted or restricted link | Hidden | Full | Hidden | Forbidden | Full | Full | Redacted |
| Evidence item payload summaries | Full only after payload redaction | Redacted | Hidden | Redacted | Hidden | Forbidden | Redacted | Redacted | Hidden |
| Source refs | Full | Redacted | Hidden | Full | Hidden | Forbidden | Redacted | Full | Redacted |
| Audit refs | Full | Redacted | Hidden | Redacted | Hidden | Forbidden | Full | Full | Redacted |
| Gate dry-run blockers | Full | Summarized | Summarized | Full | Summarized | Forbidden | Summarized | Full | Summarized |
| Technical failure reason | Full | Redacted safe code | Summarized | Full | Summarized | Forbidden | Redacted | Full | Summarized |
| Correlation id | Full | Redacted | Hidden | Full | Hidden | Forbidden | Full | Full | Redacted |
| Idempotency key | Full | Hidden | Hidden | Redacted or full by debug need | Hidden | Forbidden | Redacted | Full | Hidden |
| Stale/freshness details | Full | Summarized | Summarized | Full | Summarized | Forbidden | Full | Full | Summarized |
| Limitations | Full | Summarized | Summarized | Full | Summarized | Forbidden | Full | Full | Summarized |
| Internal diagnostics | Full | Hidden | Hidden | Redacted or full by assignment | Hidden | Forbidden | Redacted | Full | Hidden |
| Provider-related stored evidence | Full | Redacted | Hidden | Redacted or full by assignment | Summarized follow-up only | Forbidden | Redacted | Full | Hidden |
| Client-safe summary | Summarized | Summarized | Summarized | Summarized | Summarized | Forbidden in MVP | Summarized | Summarized | Summarized |

## Category Notes

### Overall Status And Severity

Status and severity are the least sensitive operational fields, but they can still reveal internal rollout and readiness posture. They are available to scoped internal roles. Client reviewer visibility is forbidden in MVP.

Status must not be softened after redaction. For example, `shadow_missing_publish_activation_approval` must not become `shadow_ready` merely because approval refs are hidden.

### Recommended Next Action

Recommended actions may be shown as safe categories. Required refs are redacted for roles that cannot see evidence/source/audit details.

Examples:

- Technical operator: "Run DDOM manual trigger outside PASR" plus restricted source refs.
- Account manager: "Domain readiness follow-up is needed" with no DDOM snapshot id.
- Future AI operator: "technical_follow_up_required" with no raw refs.

Every recommendation must keep `blocksCurrentPublish: false` semantics. Publish shadow results do not block publish.

### Site, Version, And Artifact Refs

Site identity is required for scoped internal operator work. Site version identity is usually safe for internal roles. Runtime artifact ids, active pointer ids, and publish attempt refs are technical diagnostics and should be hidden or redacted outside technical/superadmin/audit contexts.

### DDOM And Domain Details

DDOM status may be summarized to internal roles as missing, stale, present, blocked, not applicable, manually excepted, or unavailable. Snapshot refs, stale reasons, blockers, host details, DNS/provider-shaped evidence, and domain ambiguity diagnostics are sensitive.

DDOM readiness is not publish activation approval. Domain readiness, domain exceptions, and internal-host readiness must never be displayed as "publish approved."

### Publish Target Details

Publish target status can be summarized for operators. Target id, environment, publish stage, target kind, policy version, source ref, source watermark, and limitations are technical/operator details.

### Approval Details

Publish activation approval status may be shown to scoped internal roles. Approval ids, decision ids, actor ids, decision actor roles, revocation/supersession details, partial timelines, and policy internals are sensitive.

Launch signoff, client review, content review, domain readiness, and AI advisory acceptance are separate from publish activation approval.

### Evidence, Source, And Audit Refs

Evidence package refs, source refs, and audit refs are internal-only by default. They may expose table names, row ids, actor ids, policy outcomes, source-watermark drift, provider evidence, and operational gaps.

Read-only auditors may see more refs than agency operators, but must still receive redacted payloads unless policy explicitly authorizes raw payload access.

### Correlation And Idempotency

Correlation and idempotency fields are join keys for technical reconstruction. They must be hidden from account, client, and ordinary agency operator views. Idempotency keys are especially sensitive and should be visible only to superadmin/support/debug/technical contexts that need them.

### Internal Diagnostics And Provider-Related Evidence

Raw exceptions, SQL/provider/auth errors, policy engine diagnostics, source-reader internals, provider account details, DNS provider evidence, and internal host details are not client-safe. They are superadmin/support/debug/technical-only by need and scope.

## Surface-Specific Defaults

| Surface | Default role handling |
| --- | --- |
| Command Center site detail | Use redacted read model. Show internal operator summary first; expose technical drilldown only to authorized roles. |
| Command Center portfolio/overview | Show aggregate counts only after redaction. Do not expose raw refs in aggregate surfaces. |
| Ops Inbox list | Show item type, owner role, severity, safe reason, and source-owned resolution path. Hide raw refs. |
| Ops Inbox detail | Show more scoped detail, but still through role redaction. |
| Evidence drilldown | Separate authorization required. Do not rely on PASR result visibility alone. |
| Client portal/client review | Forbidden for MVP. |
| API metadata | Deferred. Must not expose PASR shadow diagnostics before a separate contract and redaction review. |

## Denial And Partial Visibility Outcomes

| Condition | Outcome |
| --- | --- |
| Actor not authenticated | Auth-required/denied envelope. |
| Actor has no site/client/tenant scope | Denied envelope with no shadow result existence leak. |
| Actor has scope but no PASR visibility role | Hidden/forbidden envelope. |
| Actor has summary visibility | Redacted projection with status/severity/safe next action and no raw refs. |
| Actor has diagnostic visibility | Detailed projection within field category limits. |
| Field hidden by role | Omit or set to `hidden`; do not include raw value in nested structures. |
| Field redacted by role | Include redaction marker or count/category only. |

## MVP Client Rule

Client reviewers and client-facing surfaces must not show publish shadow diagnostics in MVP. This includes overall status, DDOM shadow state, evidence refs, source refs, audit refs, approval actor/decision details, gate blockers, publish target internals, correlation/idempotency ids, and technical failure reasons.

A future client-safe summary must be separately designed, reviewed, and implemented through a redacted read model. It must not make Command Center, Ops Inbox, or PASR shadow status a client-visible source of truth.
