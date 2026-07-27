# GNR8 DDOM-3 Readiness Snapshot Writer Core Closeout

DDOM-3 implements the first server-only writer/repository layer for canonical append-only DDOM readiness snapshots. The writer accepts explicit caller-supplied source state, validates it, computes deterministic source watermarks, inserts one snapshot row plus zero or more refs, and handles idempotent retries without wiring into runtime or provider workflows.

This phase does not perform live DNS checks, live Vercel checks, Openprovider calls, registrar calls, DNS mutation, publish integration, PASR source-reader integration, AAF evidence building, Command Center projection, Ops Inbox projection, workers, queues, schedulers, or publish enforcement.

## Files Reviewed

Required architecture and product docs:

- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Required implementation and migration baseline:

- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`

Repository searches reviewed existing runtime domain/host binding migrations, domain readiness/read-model code, Vercel/domain helper vocabulary, append-only persistence patterns, idempotency behavior, SQL guardrails, and disposable Docker Postgres integration patterns.

## Files Created Or Updated

- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Writer Location

Writer:

- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`

Public entry points:

- `DdomReadinessSnapshotWriter`
- `DdomReadinessSnapshotRepository`
- `createDdomReadinessSnapshot(...)`
- `buildDdomReadinessSnapshotInput(...)`
- `buildDdomSourceWatermark(...)`

## Input Contract Summary

The writer input includes:

- tenant/client/site scope: `tenantId`, optional `clientId`, `siteId`
- optional source anchors: `ownershipSiteId`, `siteVersionId`, `domainBindingId`, `hostBindingId`
- domain/host intent: optional `domain`, `internalHost`, `intendedLaunchDomain`
- readiness: `readinessState`, `readinessBlockers`, `readinessWarnings`
- freshness: `freshnessState`, optional `freshUntil`, optional `staleReason`
- source payloads: optional explicit `sourceWatermark`, `sourceWatermarkJson`, `snapshotJson`
- supporting refs: `refs`
- actor/correlation/idempotency: `actorType`, `actorId`, `correlationId`, optional `causationId`, `idempotencyKey`
- storage labels: optional `privacyLabel`, optional `retentionClass`

Allowed readiness states:

- `ready`
- `ready_with_warnings`
- `blocked`
- `not_applicable`
- `manually_excepted`
- `stale`

Allowed freshness states:

- `fresh`
- `stale`
- `failed`
- `partial_timeline`

Allowed ref roles:

- `domain_binding`
- `host_binding`
- `vercel_snapshot`
- `dns_instruction_snapshot`
- `manual_completion_evidence`
- `domain_exception`
- `audit_event`
- `external_reference`
- `aaf_evidence_package`
- `aaf_approval`
- `freshness_watermark`

## Validation Rules

The writer validates before DB write where practical:

- readiness state vocabulary
- freshness state vocabulary
- actor type vocabulary
- privacy label vocabulary
- retention class vocabulary
- non-empty `tenantId`, `siteId`, `actorId`, `correlationId`, and `idempotencyKey`
- UUID shape for optional UUID-backed snapshot anchors
- timestamp parseability for `freshUntil` and ref `capturedAt`
- blockers and warnings are arrays of non-empty strings
- `sourceWatermarkJson`, `snapshotJson`, and ref `metadataJson` are JSON objects
- ref role vocabulary
- non-empty ref type and source record id
- at least one of `domain`, `internalHost`, `intendedLaunchDomain`, `domainBindingId`, or `hostBindingId` unless readiness is `not_applicable`

## Watermark Strategy

The default `source_watermark` is a `sha256:` stable JSON hash over canonical source payload:

- tenant/site/domain/host identity and optional source anchors
- readiness state, blockers, and warnings
- freshness state, `freshUntil`, and stale reason
- `sourceWatermarkJson`
- `snapshotJson`
- canonical refs, including source watermarks and captured timestamps

The hash excludes DB-generated and volatile execution fields:

- snapshot id
- ref ids
- DB `created_at`
- DB-generated `captured_at`
- idempotency key
- actor/correlation metadata
- random ids and non-canonical execution timing

Inputs are normalized deterministically:

- object keys are sorted
- blockers/warnings are deduped and sorted
- refs are sorted by canonical JSON
- domain/host identity is lowercased
- timestamp strings are normalized to ISO to avoid retry drift after Postgres `timestamptz` round-trips

If a caller supplies `sourceWatermark`, the writer validates it as non-empty, stores it as `source_watermark`, and records the writer-computed payload hash in `source_watermark_json._ddomWriterPayloadHash`.

## Idempotency Behavior

The repository inserts snapshots with `on conflict (idempotency_key) do nothing`.

Same idempotency key plus same semantic payload:

- returns the existing snapshot id
- returns existing ref ids
- reports `reusedExisting: true`

Same idempotency key plus different semantic payload:

- throws `DdomReadinessSnapshotIdempotencyConflictError`
- identifies drift at high-level payload groups:
  - `scope_payload`
  - `snapshot_payload`
  - `refs_payload`
  - `actor_payload`

The writer never silently returns an existing snapshot for drifted input.

## Ref Handling

The writer inserts refs only into `public.gnr8_ddom_readiness_snapshot_refs`.

For each ref it preserves:

- role and type
- source system
- source table
- source record id
- source version
- source watermark
- captured-at timestamp
- metadata JSON

Duplicate input refs are deduped deterministically when their semantic payload is identical. Duplicate refs with the same DDOM-2 semantic key but different payload are rejected with a validation error before DB write.

## Optional Domain-Binding Transform Decision

DDOM-3 includes `buildDdomReadinessSnapshotInput(...)` as a pure transformation helper for already-read domain binding state.

The helper:

- accepts plain domain binding data supplied by the caller
- does not query the DB
- does not import runtime-store
- does not call Vercel
- does not call DNS
- does not call Openprovider
- does not call provider workflows
- does not mutate domain binding rows

It maps stored domain binding, Vercel-shaped fields, DNS instruction fields, and freshness timestamps into snapshot JSON and snapshot refs. This keeps production orchestration out of scope while giving later architecture-reviewed code a deterministic input builder.

## DDOM-1 Boundary Confirmation

DDOM-3 preserves DDOM-1:

- GNR8 stores operating records, readiness snapshots, evidence refs, freshness labels, and projections.
- External DNS providers remain DNS truth.
- Registrar/provider systems remain registrar/provider truth.
- Vercel-shaped fields are recorded only as Vercel project/domain state snapshots, not DNS or registrar truth.
- Manual DNS instructions are stored as instruction snapshots, not DNS completion proof.
- Manual completion evidence remains evidence/ref material, not DNS truth.
- Domain readiness remains a publish prerequisite, not publish approval.

## Runtime Non-Change Confirmation

No runtime behavior changed. No publish route, publish activation orchestrator, active pointer mutation, site version mutation, artifact mutation, content publish/rollback, domain route, hosting recheck workflow, runtime-store behavior, public runtime serving, Command Center, Ops Inbox, worker, provider execution, billing, Stripe, AI, Vercel, Openprovider, DNS provider, or registrar workflow was wired to the writer.

## External Provider Non-Call Confirmation

No production Supabase, staging Supabase, remote Supabase, Vercel, Openprovider, DNS provider, registrar API, Stripe, AI provider, or external provider was called.

The only database execution used disposable local Docker Postgres containers.

## Validation Results

Passed:

- DDOM-3 writer unit tests
- DDOM-3 disposable DB writer integration tests
- DDOM-2 persistence unit tests
- DDOM-2 disposable DB persistence integration tests
- focused DDOM-3 TypeScript no-emit check
- focused DDOM/PASR TypeScript no-emit check
- `git diff --check`
- trailing whitespace check on DDOM-3 changed files
- guardrail search for provider/runtime mutation imports and calls
- guardrail search proving writer SQL inserts only DDOM snapshot/ref tables and has no update/delete/merge/truncate SQL
- changed-file review confirming no live runtime action path files changed

The first plain unit command without `NODE_OPTIONS='--conditions=react-server'` failed on the expected `server-only` package guard. The same tests passed with the server test condition used by nearby AAF/PASR tests.

PASR-1 source reader tests were not rerun because PASR implementation files were not changed. PASR source-reader files were included in the focused DDOM/PASR TypeScript check.

Disposable DB result:

- local Docker `postgres:15`
- `--pull=never`
- applied only `20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- created one valid snapshot and refs
- verified snapshot/ref rows
- verified duplicate idempotency same-payload reuse
- verified duplicate idempotency drift conflict
- verified append-only update/delete triggers still fail
- verified invalid DB readiness constraint still fails
- verified no non-DDOM tables are required
- verified writer SQL contains no update/delete/merge/truncate
- verified writer SQL touches only DDOM snapshot/ref tables

## Commands Run

- `sed -n ...` on all reviewed docs and implementation files listed above
- `rg --files apps/platform/supabase/migrations`
- `rg -n "gnr8_runtime_domain_host_bindings|runtime_domain_host_binding|domain_dns|dns_instructions|vercel|domainBinding|hostBinding" apps/platform/supabase/migrations apps/platform/gnr8 apps/platform/src -g '*.sql' -g '*.ts' -g '*.tsx'`
- `rg -n "IdempotencyConflict|idempotency|semantic payload|driftedFields|on conflict" apps/platform/gnr8/aaf apps/platform/gnr8/ptt apps/platform/gnr8 -g '*.ts'`
- `rg --files apps/platform/gnr8/ddom apps/platform/gnr8/ptt apps/platform/gnr8/aaf`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p tmp-ddom-3-tsconfig.json --pretty false`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p tmp-ddom-pasr-tsconfig.json --pretty false`
- `git diff --check`
- `rg -n "[ \t]+$" apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.integration.test.ts docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `rg -n "from\\s+[\\\"'][^\\\"']*(runtime-store|hosting-domain-recheck|vercel|openprovider|dns-provider|provider-execution|publish-|rollback|stripe|billing|ai_execution|worker)[^\\\"']*[\\\"']|\\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname)\\b" apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `rg -n "\\b(update\\s+public\\.|delete\\s+from\\s+public\\.|merge\\s+into\\s+public\\.|truncate\\s+)" apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `rg -n "insert into public\\." apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `git diff --name-only`
- `git ls-files --others --exclude-standard`
- `git status --short`

## Issues Found

- No blocking schema gap was found.
- During integration testing, Postgres `timestamptz` text round-trips initially caused false idempotency drift for identical retries. The writer now normalizes timestamp fields to ISO before hashing and comparing.

## Residual Risks

- The writer is intentionally not wired into production workflows, so snapshots still require an architecture-reviewed caller before appearing in real publish activation flows.
- The writer trusts explicit caller-supplied source state; a later integration must prove the caller reads the right canonical rows without provider calls or runtime mutation.
- Caller-supplied `sourceWatermark` is supported, but later production callers should prefer writer-computed watermarks unless an upstream canonical source already has a reviewed watermark.
- The pure domain-binding transform maps stored Vercel-shaped fields as snapshots only; it does not prove external DNS truth.

## Safety Conclusion

DDOM-3 is safe to accept after validation. It adds a server-only controlled writer core, writes only the DDOM snapshot/ref tables, validates vocabulary and shapes, computes deterministic watermarks, supports refs, handles idempotent retry and drift conflict, preserves append-only persistence, and leaves runtime/provider behavior unchanged.

## Recommended Next Milestone

Wait for architectural review. A later reviewed milestone should define the first controlled production caller that supplies already-known DDOM source state to this writer without live provider checks, runtime mutation, or publish enforcement.
