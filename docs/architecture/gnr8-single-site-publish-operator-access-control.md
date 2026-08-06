# GNR8 Single-Site Publish Operator Access Control

Phase: MVP-53
Scope: Documentation and architecture only.

This document defines future authorization policy for the internal operator caller surface selected by MVP-53. It does not implement auth/RBAC code, routes, UI, server actions, wrapper wiring, publish behavior, blocking enforcement, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

## Authorization Posture

The future single-site publish operator caller must be internal/operator-only and fail closed. Authorization must happen before wrapper invocation and before any resolver, publish, provider, billing, domain, DDOM, PASR, AAF, gate, runtime, rollback, or response-building side effect.

The first MVP-54 implementation should require the current Command Center/admin superadmin posture. Broader agency roles may be designed later only after explicit role, scope, redaction, and audit review.

## Allowed Roles

MVP-54 dry-run allowed role:

- `platform_superadmin` or the current superadmin allowlist identity used by Command Center.

Future possible roles after separate review:

- `release_operator`
- `migration_operator`
- `technical_operator`
- `support_debug`

Those future roles are not automatically allowed by MVP-53. Each requires explicit mapping to product auth, site scope, redaction level, and audit obligations.

## Denied Roles

Always denied for MVP-54 and MVP-55:

- unauthenticated users;
- agency `member`;
- client `owner`;
- client `member`;
- `client_reviewer`;
- client portal actors;
- public runtime visitors;
- API callers without internal Command Center/admin context;
- Ops Inbox derived-item actors without separate source-owned authorization;
- support/debug actors without explicit publish-operator elevation.

Agency `owner` and agency `admin` are denied for the first implementation unless a later milestone deliberately extends access beyond current Command Center superadmin posture.

## Scope Checks

The future caller must prove all scope dimensions before calling the wrapper:

- tenant id matches the authenticated internal actor's allowed tenant or superadmin admin-view scope;
- client id belongs to the tenant/agency scope;
- site id belongs to the client and tenant scope;
- migration id belongs to the same tenant/client/site;
- candidate site version belongs to the same site and migration;
- runtime artifact belongs to the candidate site version or expected artifact binding;
- publish target belongs to the same site/client/tenant and expected environment/stage;
- launch readiness evidence belongs to the same tenant/client/site/migration/candidate chain;
- publish activation request and decision belong to the same chain;
- gate attempt/result belongs to the same chain and expected subject;
- handoff watermark and gate input watermark match the expected chain.

Any missing scope read, ambiguous scope, mismatch, or stale proof must deny before wrapper invocation.

## Support And Debug Restrictions

Support/debug access, when designed later, must be:

- separate from ordinary view-only support;
- explicitly elevated for publish-operator rehearsal;
- time-bounded or incident-scoped where possible;
- reason-coded;
- logged with actor, role, scope, correlation id, and idempotency key;
- redacted by default for raw AAF/source/evidence/provider/billing data.

Support/debug must not use emergency bypass semantics unless a later audited bypass design exists.

## Audit Expectations

Future implementation should record or emit safe audit diagnostics for:

- authorization pass/deny;
- denied role;
- missing scope;
- scope mismatch;
- required ref missing;
- operator confirmation accepted or rejected;
- dry-run wrapper invocation;
- shadow-publish wrapper invocation when MVP-55 permits it;
- wrapper preflight blocked;
- wrapper dry-run ready;
- wrapper shadow-publish completed or failed.

MVP-54 should not create AAF approval, evidence, policy, audit, or gate records as part of the caller. If durable audit persistence is needed, it must be a separate operator-action audit surface, not an AAF approval/gate mutation.

## Fail-Closed Rules

Authorization fails closed when:

- the flag is off;
- the actor is not authenticated;
- the actor role is not explicitly allowed;
- the actor scope cannot be proven;
- the requested tenant/client/site/migration does not match source-owned records;
- the request references a candidate, artifact, target, readiness evidence, approval, decision, gate, or watermark outside scope;
- any read needed for authorization fails;
- the mode is not permitted;
- explicit operator confirmation is missing or does not bind the exact migration/candidate/mode.

## Boundary Statements

No client reviewer or client portal access is allowed. No Ops Inbox item grants authority. No generic runtime publish permission grants single-site publish-operator authority. No Command Center display label is source truth. No launch readiness, DDOM readiness, PASR shadow result, or billing/domain status is publish authorization by itself.
