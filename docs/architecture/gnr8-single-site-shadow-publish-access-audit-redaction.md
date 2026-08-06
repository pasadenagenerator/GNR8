# GNR8 Single-Site Shadow-Publish Access, Audit, And Redaction

Phase: MVP-55
Scope: Documentation and architecture only.

This document defines future access control, audit/logging, and redaction expectations for the internal operator-only shadow-publish action. It does not implement auth/RBAC code, routes, server actions, UI, wrapper execute wiring, blocking enforcement, publish behavior changes, runtime mutation, rollback behavior, provider calls, billing/domain execution, Command Center implementation, Ops Inbox actions, client portal exposure, commit, or push.

## Authorization Policy

The future action must be:

- platform superadmin only for MVP;
- internal admin namespace only;
- denied to agency roles;
- denied to client roles;
- denied to support/debug unless the actor is explicitly authenticated as platform superadmin;
- denied to Ops Inbox actors;
- denied to client portal actors;
- denied to anonymous/public callers;
- denied to generic runtime publish permission holders.

The server must derive actor identity from trusted auth. Request body actor fields are not authority.

## Required Scope Checks

Before wrapper execution, the future action must prove:

- tenant id matches the authenticated internal scope or superadmin view;
- client id belongs to tenant;
- site id belongs to client and tenant;
- migration id belongs to the same tenant/client/site;
- candidate site version belongs to the same site and migration;
- runtime artifact belongs to the candidate or expected artifact binding;
- publish target belongs to the same site/client/tenant and expected stage/environment;
- launch readiness evidence belongs to the same tenant/client/site/migration/candidate chain;
- AAF request and decision belong to the same chain;
- gate attempt/result belongs to the same chain and expected subject;
- handoff watermark and gate input watermark match persisted resolver output.

Any missing read, ambiguous scope, stale proof, mismatch, unauthorized role, missing confirmation, missing idempotency, or missing correlation id fails before wrapper execution.

## Audit Or Logging Strategy

First implementation should be conservative. If a scoped existing operator/action audit mechanism exists and can record the action without creating AAF approval/gate records, use it. Otherwise emit structured internal logs only for MVP-56 and add durable operator-action audit later.

Required fields:

- operator actor id/type/role;
- authorization decision;
- request mode;
- confirmation accepted/rejected;
- idempotency key;
- correlation id;
- request id when present;
- tenant/client/site/migration ids;
- candidate/artifact/target safe ids;
- expected evidence/request/decision/gate safe ids;
- handoff and gate input watermark categories;
- resolver complete/incomplete/error;
- wrapper status;
- publish orchestrator status;
- active pointer before/after if returned;
- shadow guard mode, allowed value, and blocker codes;
- `blockingEnforcementApplied: false`.

Do not write AAF approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts as part of this action.

## Redaction Contract

Future response and logs must not expose:

- raw sensitive AAF/source/audit refs outside the superadmin internal context;
- raw evidence package payloads;
- provider secrets;
- DNS provider credentials;
- Vercel, Openprovider, registrar, SSL, AI, production Supabase, or staging Supabase credentials;
- Stripe/payment data;
- billing-sensitive customer, subscription, price, margin, invoice, entitlement, or payment records;
- raw SQL errors;
- raw stack traces;
- credential material;
- client-facing raw diagnostics.

Allowed response shape uses:

- safe ids where needed for operator correlation;
- stable blocker/warning codes;
- redaction summary;
- high-level publish result category;
- active pointer before/after only if already returned by the existing orchestrator and safe for internal superadmin display;
- correlation and idempotency linkage.

## Safe Codes

Recommended caller-level blocker codes:

- `single_site_shadow_publish_operator_flag_disabled`
- `single_site_shadow_publish_operator_superadmin_required`
- `single_site_shadow_publish_operator_mode_required`
- `single_site_shadow_publish_operator_confirmation_missing`
- `single_site_shadow_publish_operator_correlation_id_missing`
- `single_site_shadow_publish_operator_idempotency_key_missing`
- `single_site_shadow_publish_operator_scope_missing`
- `single_site_shadow_publish_operator_scope_mismatch`
- `single_site_shadow_publish_operator_required_ref_missing`
- `single_site_shadow_publish_operator_resolver_incomplete`
- `single_site_shadow_publish_operator_wrapper_preflight_blocked`
- `single_site_shadow_publish_operator_publish_failed`

Warnings may include:

- `single_site_shadow_publish_guard_diagnostic_only`
- `single_site_shadow_publish_blocking_enforcement_not_applied`
- `single_site_shadow_publish_existing_orchestrator_may_mutate_active_pointer`
- `single_site_shadow_publish_no_automatic_rollback`

## Boundary Statements

No client portal response may include this action or its diagnostics. No Ops Inbox item grants authority or exposes execution controls. Command Center display state is projection-only. Generic runtime publish permissions do not authorize this action. Provider, DNS, domain, billing, Stripe, PASR, DDOM, AAF write, gate evaluation, rollback, and active pointer behavior must not be implemented in this action outside the existing publish orchestrator call made by the MVP-52 wrapper.
