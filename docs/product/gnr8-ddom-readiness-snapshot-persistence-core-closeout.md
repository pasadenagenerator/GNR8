# GNR8 DDOM-2 Readiness Snapshot Persistence Core Closeout

DDOM-2 adds the database persistence foundation for canonical DDOM readiness snapshots. It creates append-only snapshot and source-ref tables that can later become canonical `domainReadiness` source refs for AAF publish activation evidence.

This phase does not implement live domain checks, DNS checks, Vercel checks, Openprovider calls, registrar or DNS mutation, publish route integration, production source-reader integration, Command Center projections, Ops Inbox items, publish enforcement, or a DDOM snapshot writer service.

## Files Reviewed

Required architecture and product docs:

- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Required implementation and migration baseline:

- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260423110000_site_bootstrap_runtime_site_id_text_alignment.sql`
- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260326090000_ownership_foundation.sql`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- root, platform, and contracts `package.json` files
- existing AAF disposable Docker Postgres integration tests under `apps/platform/gnr8/aaf/*.integration.test.ts`

Repository pattern review used `rg` searches for append-only triggers, RLS, check constraints, idempotency keys, JSONB type checks, indexes, policies, grants, Docker Postgres test setup, and runtime table definitions.

## Files Created Or Updated

- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Migration

Migration file:

- `20260727120000_ddom_readiness_snapshot_persistence_core.sql`

Tables created:

- `public.gnr8_ddom_readiness_snapshots`
- `public.gnr8_ddom_readiness_snapshot_refs`

No runtime, provider, DNS, publish, rollback, billing, Stripe, AI, worker, public runtime, Command Center, or Ops Inbox files were changed.

## Constraints Summary

`gnr8_ddom_readiness_snapshots` includes:

- primary key `id uuid default gen_random_uuid()`
- unique `idempotency_key`
- readiness state check: `ready`, `ready_with_warnings`, `blocked`, `not_applicable`, `manually_excepted`, `stale`
- freshness state check: `fresh`, `stale`, `failed`, `partial_timeline`
- actor type check aligned with AAF: `human`, `system`, `provider`, `external_reference`, `ai_advisory`
- AAF privacy-label check: `public_operational`, `internal_operational`, `client_confidential`, `credential_sensitive`, `billing_sensitive`, `provider_sensitive`, `legal_sensitive`
- AAF retention-class check: `short_operational`, `mvp_operational`, `security`, `compliance_long`, `legal_hold`
- JSONB checks requiring `readiness_blockers` and `readiness_warnings` arrays, and `source_watermark_json` and `snapshot_json` objects

`gnr8_ddom_readiness_snapshot_refs` includes:

- primary key `id uuid default gen_random_uuid()`
- `snapshot_id` FK to `public.gnr8_ddom_readiness_snapshots(id)`
- unique semantic ref key on `(snapshot_id, ref_role, ref_type, source_record_id)`
- ref-role check for DDOM/AAF source-ref roles
- JSONB check requiring `metadata_json` object

## Indexes Summary

Created indexes:

- `idx_gnr8_ddom_readiness_snapshots_site_captured` on `(site_id, captured_at desc)`
- `idx_gnr8_ddom_readiness_snapshots_site_version_captured` on `(site_version_id, captured_at desc)` where `site_version_id is not null`
- `idx_gnr8_ddom_readiness_snapshots_domain_binding_captured` on `(domain_binding_id, captured_at desc)` where `domain_binding_id is not null`
- `idx_gnr8_ddom_readiness_snapshots_readiness_freshness` on `(readiness_state, freshness_state, captured_at desc)`
- `idx_gnr8_ddom_readiness_snapshots_fresh_until` on `(fresh_until)` where `fresh_until is not null`
- `idx_gnr8_ddom_readiness_snapshots_semantic_watermark` unique on `(site_id, coalesce(site_version_id::text, ''), coalesce(domain_binding_id::text, ''), source_watermark)`
- `idx_gnr8_ddom_readiness_snapshot_refs_lookup` on `(source_system, source_table, source_record_id, source_watermark)`
- `idx_gnr8_ddom_readiness_snapshot_refs_snapshot_role` on `(snapshot_id, ref_role)`

## Append-Only Behavior

The migration adds `public.gnr8_ddom_prevent_update_delete()` and attaches `before update or delete` triggers to both DDOM tables:

- `trg_gnr8_ddom_readiness_snapshots_append_only`
- `trg_gnr8_ddom_readiness_snapshot_refs_append_only`

Corrections, TTL refreshes, exception changes, evidence changes, or source changes must be represented by new snapshots and refs, not mutable edits.

## RLS Posture

RLS is enabled on both DDOM tables.

No policies are created. No broad public policies or grants are added. This matches the closed-by-default AAF persistence-core posture and leaves future service-role/server-side access design to a later phase.

## FK Decisions

Added unconditionally:

- `gnr8_ddom_readiness_snapshot_refs.snapshot_id` references `gnr8_ddom_readiness_snapshots(id)`

Added conditionally when the referenced table exists:

- `site_id` to `public.gnr8_runtime_sites(id)`
- `ownership_site_id` to `public.sites(id)`
- `site_version_id` to `public.gnr8_runtime_site_versions(id)`
- `domain_binding_id` to `public.gnr8_runtime_domain_host_bindings(id)`
- `host_binding_id` to `public.gnr8_runtime_host_bindings(id)`

Conditional FK rationale:

- Runtime tables are created by existing runtime-table setup and migrations in current environments, but not all are created by applying this new migration alone. Conditional attachment allows disposable local DB verification to apply only the new migration while preserving FK hardening in environments where the source tables exist.

Intentionally omitted FKs:

- `client_id`: current ownership/client identifiers are UUID-backed organization/site concepts while the DDOM snapshot field is text and AAF-scoped; forcing a FK would be ambiguous.
- `source_record_id` in refs: source refs are intentionally polymorphic across GNR8 tables and external references; a single FK would be incorrect.
- `source_table`: table name metadata, not a relational target.

## Readiness-State Mapping To AAF Publish Adapter

The DDOM persistence vocabulary is intentionally slightly richer than the current AAF publish adapter status vocabulary.

- The AAF publish adapter currently accepts `ready`, `not_applicable`, `manually_excepted`, and `blocked`.
- Future source reader must map DDOM persistence `ready_with_warnings` to adapter status `ready` plus warnings unless the adapter contract is explicitly expanded later.
- Future source reader must map DDOM persistence `stale` to adapter status `blocked` with blocker `domain_readiness_stale`.

## TypeScript Contracts Decision

No TypeScript contracts were added in DDOM-2.

Reason: `packages/gnr8-runtime-contracts` is a pure contract package and already exposes AAF vocabulary, but DDOM readiness snapshots are not yet consumed by a production writer, reader, or adapter. Adding public exports now would widen the contract surface ahead of the architecture-reviewed source-reader/writer design. Static SQL tests pin the persistence vocabulary for this phase.

## DDOM-1 Boundary Confirmation

DDOM-2 preserves DDOM-1:

- GNR8 stores operating records, snapshots, evidence refs, freshness labels, and projections.
- External registrars and DNS providers remain DNS/registrar truth.
- Vercel snapshots remain Vercel project/domain state snapshots, not registrar/DNS truth.
- Domain readiness remains a publish prerequisite, not publish approval.
- Manual DNS completion evidence remains evidence/ref material, not DNS truth.

## Validation Performed

Passed:

- static migration checks
- destructive SQL guardrails
- disposable local Docker Postgres migration execution
- PostgreSQL catalog verification
- positive snapshot/ref insert tests
- negative readiness/freshness/JSON/privacy/retention/actor tests
- duplicate idempotency key test
- duplicate semantic source-watermark test
- duplicate snapshot-ref semantic key test
- append-only update/delete trigger tests
- RLS/no-policy checks
- `git diff --check`
- trailing whitespace check on DDOM-2 changed files
- changed-file review confirming no runtime/provider/AI/billing/publish files changed

Disposable DB target:

- local Docker `postgres:15`
- `--pull=never`
- migration applied alone: `20260727120000_ddom_readiness_snapshot_persistence_core.sql`

Prerequisite migrations applied:

- none

Reason:

- The migration uses conditional FKs for optional runtime/ownership source tables and has no dependency on AAF tables.

## Runtime Non-Change Confirmation

No runtime behavior changed. No publish activation route, active pointer mutation, runtime-store behavior, rollback behavior, domain/DNS/Vercel/Openprovider behavior, provider execution behavior, Command Center, Ops Inbox, BMF, billing, Stripe, AI, worker, public runtime, content publish, or content rollback file was changed.

## External Provider Non-Call Confirmation

No production Supabase, staging Supabase, remote Supabase, Vercel, Openprovider, DNS provider, registrar API, Stripe, AI provider, or external provider was called.

The only database execution was a disposable local Docker Postgres container.

## Safety Conclusion

DDOM-2 is safe to accept as a persistence-core phase. It adds the intended append-only DDOM snapshot storage foundation, validates it in disposable local Postgres, documents the AAF mapping, and leaves runtime behavior and external providers untouched.

## Residual Risks

- Conditional FKs will no-op in a database where source tables are absent; this is intentional for standalone verification and should be checked again during full environment migration review.
- No production DDOM snapshot writer exists yet, so canonical snapshots can be stored but are not created by runtime workflows.
- No production publish source reader exists yet, so AAF publish evidence still cannot use DDOM snapshots until a later phase.
- No DDOM current-state projection exists; Command Center and Ops Inbox remain unchanged and derived from existing sources.

## Recommended Next Milestone

After architectural review of DDOM-2, proceed to the next source-truth prerequisite: publish target source truth persistence, then the read-only production publish source reader. Do not implement live publish enforcement until source-reader shadow evidence has been reviewed.

## Commands Run

- `pwd`
- `git status --short`
- `rg --files docs/architecture docs/product docs/ai apps/platform/supabase/migrations`
- `rg -n "append-only|append only|prevent.*update|prevent.*delete|FOR EACH ROW|ENABLE ROW LEVEL SECURITY|privacy_label|retention_class|idempotency_key|jsonb_typeof|CREATE POLICY|ALTER TABLE.*ENABLE ROW LEVEL SECURITY" apps/platform/supabase/migrations gnr8 apps test docs -g '*.sql' -g '*.ts' -g '*.tsx' -g '*.md'`
- `sed -n ...` on the reviewed docs, migrations, contract files, package files, and AAF integration tests listed above
- `rg -n "create table.*gnr8_runtime_sites|gnr8_runtime_sites \\(|gnr8_runtime_site_versions \\(|gnr8_runtime_host_bindings \\(|ownership_site_id|createRuntime|ensureRuntimeTables" apps packages gnr8 -g '*.ts' -g '*.tsx' -g '*.sql'`
- `rg --files | rg '(^|/)(.*migration.*test|.*supabase.*test|.*sql.*test|.*contracts.*test)\\.(ts|tsx)$'`
- `find . -maxdepth 4 -type f \\( -name '*migration*test.ts' -o -name '*sql*test.ts' -o -name '*contract*test.ts' \\) | sort`
- `pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts`
- `pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `git diff --name-only`
- `git diff --check`
- `git status --short`
- `rg -n "[ \\t]+$" apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `git ls-files --others --exclude-standard`
