# GNR8 DDOM-5 Readiness Manual Snapshot Caller Core Closeout

DDOM-5 implements the first server-only manual stored-state caller core for DDOM readiness snapshots. It reads already-stored GNR8 domain/host/readiness state, maps that state deterministically into DDOM-3 writer input, and writes append-only readiness snapshots only through the existing DDOM-3 writer.

No publish route, publish activation behavior, active pointer behavior, rollback behavior, PASR behavior, AAF gate behavior, Command Center, Ops Inbox, public runtime serving, worker, provider, billing, Stripe, AI, API route, scheduled job, queue, SQL migration, production Supabase, staging Supabase, remote Supabase, DNS provider, Vercel, Openprovider, registrar, Stripe, or AI provider was intentionally changed or called.

## Files Reviewed

Required DDOM-4 baseline:
- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-caller-options.md`
- `docs/product/gnr8-ddom-readiness-snapshot-operator-workflow.md`
- `docs/product/gnr8-ddom-readiness-snapshot-production-caller-architecture-closeout.md`

DDOM-2 and DDOM-3:
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`

PASR expectations:
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`

Domain/DNS architecture and stored-state evidence:
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/supabase/migrations/20260326090000_ownership_foundation.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/gnr8/runtime/runtime-store.ts`

## Files Created Or Updated

Created:
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`

Updated:
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Locations

Caller:
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`

Repository:
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`

Mapper:
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`

## Source-State Contract Implemented

The caller accepts a manual/operator-triggered request with actor, tenant/client/agency/site scope, optional site version, optional domain or host binding identity, intended domain/internal host, environment/stage, reason, correlation, idempotency, privacy, retention, and optional AAF evidence/exception/audit refs.

The repository returns a plain stored-state object that distinguishes:
- `found`
- `missing_domain_intent`
- `missing_domain_binding`
- `missing_host_binding`
- `missing_readiness_evidence`
- `stale_stored_evidence`
- `blocked_readiness`
- `manually_excepted_readiness`
- `not_applicable_readiness`
- `read_failure`

The mapper converts those states into DDOM-3 writer input:
- `ready` -> DDOM `ready`
- `ready_with_warnings` -> DDOM `ready_with_warnings`
- `not_applicable` -> DDOM `not_applicable`
- `manually_excepted` -> DDOM `manually_excepted`
- `blocked` -> DDOM `blocked`
- stale stored evidence -> DDOM `stale`

## Source Tables And Fields Used

The production repository reads only existing stored GNR8 state:
- `public.gnr8_runtime_sites`: site identity and runtime source fields
- `public.gnr8_runtime_site_versions`: site version, state, artifact, ownership site, update timestamps
- `public.sites`: ownership site, organization/client/agency, domain, status when available
- `public.gnr8_runtime_domain_host_bindings`: domain binding, status, Vercel-shaped stored fields, DNS instruction fields, `last_checked_at`, `updated_at`
- `public.gnr8_runtime_host_bindings`: internal host binding, status, kind, update timestamps
- `public.gnr8_aaf_approval_requests` and `public.gnr8_aaf_approval_decisions`: exact domain exception refs when explicitly supplied
- `public.gnr8_aaf_approval_revocations` and `public.gnr8_aaf_approval_supersession_links`: exception invalidation checks
- `public.gnr8_aaf_evidence_packages`: manual completion and domain exception evidence package refs when explicitly supplied
- `public.gnr8_aaf_audit_events`: optional audit event ref when explicitly supplied

## Ambiguity And Fixture Decisions

No richer dedicated domain readiness source table exists in the current reviewed schema. DDOM-5 therefore implements an adapter-shaped repository around current stored runtime domain/host binding fields, Vercel-shaped stored fields, DNS instruction fields, and optional AAF refs.

The disposable DB integration uses local-only fixture tables matching the repository contract instead of applying the full runtime schema. This mirrors the PASR-1 approach because full runtime migrations and runtime-store table creation are coupled to broader runtime behavior that is outside this phase.

## Watermark Strategy

`buildDdomStoredStateSourceWatermark(...)` computes a `sha256:` stable JSON hash over:
- tenant/client/agency/site/site-version/domain/host identity
- environment/stage/request scope
- current stored source rows
- readiness state, freshness state, blockers, warnings, limitations, stale reason, and fresh-until
- source refs and per-source watermarks

It excludes volatile actor display labels, actor ids, correlation ids, idempotency keys, generated DDOM DB ids, DDOM ref ids, and live lookup results. The repository read transaction timestamp is used only for read-time freshness classification and is not persisted into the writer's idempotency-checked semantic payload; the DDOM writer/DB owns snapshot capture time.

## Idempotency Behavior

The manual caller accepts an explicit idempotency key or derives one from tenant/site scope, site version, domain/host subject, request scope, source watermark, environment, and stage.

Same idempotency key plus same semantic writer payload returns the existing DDOM snapshot. Same idempotency key plus semantic drift fails closed through `DdomReadinessSnapshotIdempotencyConflictError`.

## DDOM-To-PASR Mapping

The mapper stores PASR implication metadata in the snapshot payload:
- DDOM `ready` -> PASR `ready`
- DDOM `ready_with_warnings` -> PASR `ready` plus warnings
- DDOM `not_applicable` -> PASR `not_applicable`
- DDOM `manually_excepted` -> PASR `manually_excepted`
- DDOM `blocked` -> PASR `blocked`
- DDOM `stale` -> PASR `blocked` with `domain_readiness_stale`

PASR remains read-only and does not create snapshots during gate evaluation.

## Boundary Confirmations

DDOM readiness is not publish approval. Manual snapshot creation is not publish activation, DNS completion proof, Vercel truth, registrar truth, Openprovider truth, or AI decision truth.

The caller performs no provider calls, no live DNS checks, no Vercel calls, no Openprovider calls, no registrar calls, no Stripe calls, no AI calls, no publish calls, no rollback calls, no source-state mutation, no approvals, no Command Center mutation, no Ops Inbox mutation, no public runtime serving mutation, no worker action, and no route/API creation.

Command Center and Ops Inbox remain unmodified and derived only.

## Validation Results

Passed:
- DDOM-3 writer unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- DDOM-3 writer disposable DB integration tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- DDOM-5 unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- DDOM-5 disposable DB integration tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- Focused TypeScript no-emit validation: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p /private/tmp/ddom-5-tsconfig.json --pretty false`

Disposable DB integration proves:
- the caller writes DDOM snapshots via the DDOM-3 writer
- refs are written
- idempotent retry returns the same snapshot
- idempotency drift fails
- stale state persists as stale
- blocked state persists as blocked
- manually excepted state persists with an exception ref
- append-only triggers block update/delete
- no broad RLS policies are added
- repository/caller execution does not mutate non-DDOM tables

## Commands Run

- `pwd`
- `git status --short`
- `rg --files ...`
- `rg -n ...`
- `sed -n ...`
- `git diff -- docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `git diff --stat`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p /private/tmp/ddom-5-tsconfig.json --pretty false`
- `git diff --check`
- `rg -n "[ \t]+$" ...`
- forbidden import/call guardrail `rg` searches over DDOM-5 implementation files
- changed-file scope checks for migrations, app routes, workers, runtime, AAF, provider/lib paths
- `docker ps --format '{{.Names}}'`

## Static Guardrail Results

Passed static source checks for new DDOM-5 files:
- no Vercel helper imports or calls
- no Openprovider helper imports or calls
- no DNS resolver/provider imports or calls
- no registrar client imports or calls
- no Stripe/billing imports or calls
- no AI imports or calls
- no publish orchestrator/route imports or calls
- no product rollback imports or calls
- no Command Center imports
- no Ops Inbox imports
- no public runtime serving imports
- no worker imports
- no runtime-store imports

The only rollback text in the new implementation is SQL transaction cleanup in the repository. It is not product rollback behavior and is safe.

## Issues Found

The first integration run found that the mapper leaked the read transaction timestamp into the DDOM writer semantic payload, causing idempotent retry drift. The fix keeps read transaction time out of writer idempotency payload and relies on the DDOM snapshot row capture time for execution timestamp.

No schema gap requiring a migration was found.

## Residual Risks

The repository maps from currently available stored runtime domain binding fields because no richer canonical domain readiness source table exists yet. Manual completion evidence and domain exception evidence are included only when exact AAF refs are supplied.

Full platform typecheck was not run for this phase. Focused DDOM-5 TypeScript validation passed.

## Safety Conclusion

DDOM-5 is safe to accept.

Publish-route shadow integration may begin in a later milestone after this closeout is accepted. It should not be considered part of DDOM-5 and must keep PASR read-only.

Recommended next milestone: DDOM-6 publish-route shadow integration design/implementation, with no enforcement and no request-time snapshot creation.

## Final Confirmation

No runtime behavior changed. The new caller core is callable server-side code only and is not wired into routes, UI, workers, PASR, publish, rollback, Command Center, Ops Inbox, providers, billing, Stripe, AI, scheduled jobs, queues, or public runtime serving.
