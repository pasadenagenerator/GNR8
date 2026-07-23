# GNR8 Audit Approval Persistence Core Closeout (AAF-3)

## Purpose

AAF-3 implements the lowest safe persistence layer for the GNR8 MVP Audit, Approval, and Evidence foundation. It turns the accepted AAF-2 design into additive repository code without integrating gates into runtime actions.

## Files Created Or Updated

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Repository Pattern Findings

- Supabase migrations live under `apps/platform/supabase/migrations` and use timestamp-prefixed SQL filenames.
- Table names usually live in `public` and use `gnr8_*` prefixes for platform/runtime records.
- Existing enum handling is mostly `text` plus SQL `check` constraints, not Postgres enum types.
- Existing migrations are additive and frequently use `create table if not exists`, `create index if not exists`, and named checks.
- RLS exists for ownership and a few app tables, but it is not consistently applied across all runtime/migration/provider tables.
- Existing provider approval/handoff rows are mutable provider artifacts, not canonical AAF approval decisions.
- Existing batch/job/event, cost, publish, domain readiness, and site-action tables are useful source refs but do not satisfy the full AAF envelope.
- There is no discovered generated Supabase `Database` type workflow; runtime constants live cleanly in `packages/gnr8-runtime-contracts`.
- Tests use Node's built-in `node:test` and static contract assertions in the contracts package.

## Design-To-Implementation Mapping

Approval:
- `approval_requests` -> `public.gnr8_aaf_approval_requests`
- `approval_decisions` -> `public.gnr8_aaf_approval_decisions`
- `approval_policies` -> `public.gnr8_aaf_approval_policies`
- `approval_evidence_links` -> `public.gnr8_aaf_approval_evidence_links`
- `approval_scope_definitions` -> `public.gnr8_aaf_approval_scope_definitions`
- `approval_supersession_links` -> `public.gnr8_aaf_approval_supersession_links`
- `approval_revocations` -> `public.gnr8_aaf_approval_revocations`
- `approval_policy_evaluations` -> `public.gnr8_aaf_approval_policy_evaluations`
- `approval_subject_refs` -> `public.gnr8_aaf_approval_subject_refs`

Audit:
- canonical audit events -> `public.gnr8_aaf_audit_events`
- audit event refs -> `public.gnr8_aaf_audit_event_refs`
- compensating events -> represented by `gnr8_aaf_audit_events.replay_class = 'compensating_only'` plus `original_audit_event_id`
- partial timeline markers -> `public.gnr8_aaf_audit_partial_timeline_markers`

Evidence:
- `evidence_packages` -> `public.gnr8_aaf_evidence_packages`
- `evidence_package_items` -> `public.gnr8_aaf_evidence_package_items`
- `evidence_package_source_refs` -> `public.gnr8_aaf_evidence_package_source_refs`
- `evidence_package_freshness_checks` -> `public.gnr8_aaf_evidence_package_freshness_checks`
- `evidence_package_redactions` -> `public.gnr8_aaf_evidence_package_redactions`
- `evidence_package_supersession` -> `public.gnr8_aaf_evidence_package_supersession`
- `evidence_package_audit_links` -> `public.gnr8_aaf_evidence_package_audit_links`

Gate support:
- gate attempts -> `public.gnr8_aaf_action_gate_attempts`
- subject refs -> `public.gnr8_aaf_approval_subject_refs`
- idempotency/correlation fields -> required across core write tables

Deferred:
- runtime gate enforcement, service orchestration, UI/read models, object storage migration, generated Supabase database types, and broad RLS access policies are deferred to later phases.
- low-level persistence helpers are deferred because this phase found no generated DB type flow and no existing AAF repository boundary to reuse without prematurely introducing service architecture.

## Schema Summary

The migration creates 20 additive `gnr8_aaf_*` tables for approvals, audit, evidence, policy evaluation, subject refs, partial timelines, and action gate attempts. It uses UUID primary keys, `created_at` defaults, text-scoped tenant/client/site/batch/job/site-version/domain/cost fields, correlation and idempotency keys, source refs, privacy labels, redaction labels, and retention classes: `short_operational`, `mvp_operational`, `security`, `compliance_long`, and `legal_hold`.

The migration stores only metadata, hashes, source watermarks, object refs, and bounded JSON envelopes. Heavy evidence payloads are intentionally not stored directly in Postgres.

## Constraints And Indexes

Implemented constraints include:
- required approval statuses, approval scopes, policy results, audit families, severities, replay classes, evidence package types, gate results, actor types, privacy labels, redaction labels, and retention classes;
- explicit `not_required_by_policy` decisions requiring a policy evaluation ref;
- evidence package and item hash length checks;
- object-shaped JSON checks for envelopes;
- bounded audit `payload_json` size;
- no self-supersession checks;
- `fail_closed` gate attempts requiring a fail-closed reason;
- idempotency uniqueness on canonical write tables.

Implemented indexes cover:
- approval scope/status/subject/correlation lookups;
- policy evaluation subject/correlation lookups;
- audit family/name/subject/correlation/ref lookups;
- evidence package subject/correlation/source-ref lookups;
- gate attempt subject/correlation/result lookups.

## Append-Only And Immutability

The migration adds `public.gnr8_aaf_prevent_update_delete()` and attaches it to historical AAF tables so approval decisions, requests, subject refs, policy evaluations, audit events, evidence packages/items/source refs/freshness checks/redactions/supersession/audit links, partial timeline markers, and gate attempts are append-only by database trigger.

Policies and scope definitions are versioned configuration and were not made trigger-immutable in this phase, so future policy lifecycle work can define activation and retirement behavior deliberately.

## RLS Decision

RLS is enabled on every new AAF table, but no broad public/client access policies are created. This is intentionally conservative because AAF records can include internal, provider-sensitive, billing-sensitive, credential-sensitive, and legal-sensitive evidence metadata. Future access-control work must add scoped read/write policies or service-role-only access explicitly.

## TypeScript Contract Summary

`packages/gnr8-runtime-contracts/src/aaf-contracts.ts` exports canonical arrays and union types for approval statuses, scopes, policy results, audit families, severities, replay classes, evidence package types, privacy labels, redaction labels, retention classes, and gate results. The canonical MVP retention classes are `short_operational`, `mvp_operational`, `security`, `compliance_long`, and `legal_hold`.

It also exports scope replay classes and prohibited-action mappings that preserve AAF boundaries such as domain action not authorizing DNS/Openprovider mutation, launch/client review not authorizing publish activation, publish/rollback not being deterministic replay, and AI advisory acceptance remaining advisory only.

## Tests Created

`packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts` validates:
- all required AAF contract values are present;
- the SQL migration contains the canonical enum/check values;
- required canonical tables are created and have RLS enabled;
- approval decisions, evidence packages, audit events, and gate attempts are append-only;
- audit events require actor, subject, correlation, and idempotency envelope fields;
- `not_required_by_policy` is explicit and policy-backed;
- forbidden scope overreach remains represented;
- evidence stores object refs and hashes rather than heavy payloads.

## Validation Performed

Local validation performed:
- static contract tests for `packages/gnr8-runtime-contracts`;
- TypeScript type check for `packages/gnr8-runtime-contracts`;
- SQL/static diff review;
- intended-files check with `git status`;
- runtime integration grep checks for publish, rollback, domain, provider, billing, AI, Command Center, Ops Inbox, and BMF behavior changes.

Migration application against a live Supabase database was not run because this phase explicitly prohibits calling production or staging Supabase. No external provider, DNS, Vercel, Openprovider, Stripe, or AI calls were made.

## Explicit Non-Integrations

AAF-3 does not integrate approval gates into publish activation, rollback, domain/Vercel/DNS actions, Openprovider/provider execution, Migration Factory start/resume/retry/replay, Command Center bulk actions, Ops Inbox resolution, content publish/rollback, billing/Stripe/customer billing, or AI advisory/execution.

No runtime route, worker, provider client, billing path, Command Center view, Ops Inbox view, publish path, rollback path, domain path, migration execution path, or AI path was changed.

## Source-Of-Truth Conclusions

New `gnr8_aaf_*` tables are the intended canonical persistence foundation for future AAF approval, audit, evidence, policy, and gate records. Existing provider approval artifacts, migration events, cost events, publish events, domain readiness snapshots, Command Center state, Ops Inbox items, UI badges, external tickets, screenshots, and AI outputs remain source refs or evidence inputs only.

## Architecture Warnings

- Existing risky runtime actions remain ungated until future phases integrate this foundation.
- RLS is intentionally closed by default; future consumers need explicit service-role or scoped-policy decisions.
- Generated database types were not updated because no generated type workflow was present.
- The audit event payload is bounded, but final evidence builders must continue to store heavy artifacts by object ref.
- Cross-table audit refs are sufficient for persistence core, but future write helpers must handle transaction ordering carefully when writing approval decisions and audit events together.

## Recommended Next Milestone

AAF-4 should add low-level service/repository writers around these tables plus local transaction tests, still without integrating risky runtime actions. Gate integration should start only after writer semantics, service-role access, idempotency behavior, and append-only failure handling are tested.

## Acceptance Assessment

AAF-3 is safe to accept as a persistence-core milestone if local validation passes. It creates the canonical storage surface and TypeScript contract without changing runtime behavior or external side effects.
