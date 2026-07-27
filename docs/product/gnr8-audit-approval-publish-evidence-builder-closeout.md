# GNR8 AAF-7 Publish Activation Evidence Builder Closeout

AAF-7 adds a server-only, read-only publish activation evidence package builder. It creates `publish_activation_evidence` packages and returns the exact AAF-6 dry-run adapter input shape, but it does not integrate with live publish routes and does not execute or allow publish activation.

## Files Reviewed

AAF implementation and contracts:

- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`

Docs:

- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Runtime/source-truth areas:

- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/types.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/content-override-runtime.ts`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260504120000_content_overrides_version_hardening.sql`
- `apps/platform/supabase/migrations/20260504133000_content_override_history.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Builder Location

The builder lives at `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`.

Public exports include:

- `buildPublishActivationEvidencePackage(...)`
- `buildPublishActivationGateDryRunInput(...)`
- `buildPublishActivationSourceWatermark(...)`
- `stablePublishActivationJson(...)`
- `hashPublishActivationStableValue(...)`
- the read-only `PublishActivationEvidenceSourceReader` interface

## Source Truth Contract Summary

The builder source contract represents these publish activation inputs:

- site id
- site version id
- runtime artifact id
- current active pointer state
- intended publish target
- domain readiness state and snapshot ref
- content override published state when relevant
- launch signoff status when required
- publish activation approval reference when present
- source system/table/record/ref/version for every source
- current and evidence source watermark for every present source
- freshness result and stale reason for every source
- limitations and missing-source diagnostics when truth is incomplete

Canonical source keys are `siteVersion`, `runtimeArtifact`, `activePointer`, `publishTarget`, `domainReadiness`, `contentOverridePublishedState`, `launchSignoff`, and `publishActivationApproval`.

Missing required source truth is not hidden. The builder marks package freshness as `failed`, records limitations, returns missing diagnostics, and fills the dry-run source ref with null watermarks so AAF-6 blocks rather than silently allowing.

## Source Reader Decision

AAF-7 introduced a narrow read-only interface instead of wiring directly to runtime repositories.

Reason:

- `runtime-store.ts` has canonical read helpers for site version, artifact, active pointer, and content override state, but the same module also exports mutation helpers.
- Domain readiness currently exists as a report/read-model and domain host binding state; a dedicated canonical DDOM readiness snapshot table was not found in the inspected migrations.
- The builder must not import live publish, runtime mutation, content publish/rollback, provider, DNS, Vercel, Openprovider, public runtime, Command Center, or Ops Inbox paths.

Tests supply synthetic canonical source state through this boundary. A future production reader can be added only after the domain readiness snapshot and publish target source tables are architecturally accepted.

## Deterministic Watermark Strategy

Watermarks prefer explicit canonical version/update fields via `canonicalWatermark` and `canonicalWatermarkField`.

If no canonical watermark is provided, the builder computes:

- `sha256:` plus a stable JSON hash
- ordered object keys
- an explicit minimal `hashFields` field list, or all canonical fields ordered by key

The hash input excludes evidence-build timestamps, generated package ids, created-at defaults, and other non-canonical evidence-build fields.

Tests prove:

- identical source state produces the same watermark
- canonical source changes change the watermark
- reordered object keys do not change the watermark
- volatile evidence-build fields do not change the watermark
- canonical update/version watermarks are preferred over hashes

## Evidence Package Contents

The builder writes through `AafWriterRepository.createEvidencePackageTransaction(...)` or an injected writer:

- `gnr8_aaf_evidence_packages`
  - package type `publish_activation_evidence`
  - subject type `site_version`
  - subject id = target site version id
  - source watermark = AAF-6 aggregate subject watermark when complete
  - `invalid` status and incomplete aggregate watermark when required truth is missing
  - limitations JSON containing the dry-run-only evidence payload
- `gnr8_aaf_evidence_package_source_refs`
  - one source ref per present canonical source with explicit source table/id/version/watermark/hash
- `gnr8_aaf_evidence_package_items`
  - one JSON payload item ref containing the package payload hash
- `gnr8_aaf_evidence_package_freshness_checks`
  - result `fresh`, `stale`, `failed`, or `partial_timeline`
  - current source watermark matching the package watermark

## Domain Readiness Boundary

The builder accepts domain readiness from the read-only source reader only.

Allowed:

- record a provided readiness snapshot ref
- record `ready`, `not_applicable`, `manually_excepted`, or `blocked`
- surface stale readiness as blocked dry-run input with `domain_readiness_stale`
- surface missing readiness as missing source truth

Forbidden and not implemented:

- live DNS lookup
- Vercel live API call
- Openprovider live API call
- registrar mutation
- DNS mutation
- automatic repair or autonomous cutover

## Approval Boundary

The builder may reference launch signoff and publish activation approval ids when supplied by the source reader or caller.

It does not:

- create approval requests
- create approval decisions
- infer publish approval from launch signoff, client review, domain readiness, domain exception, AI advisory, Command Center, or Ops Inbox
- accept wrong-scope approval as publish activation approval

Wrong-scope approval refs remain visible to the AAF-6 dry-run adapter, which returns a scoped blocker and null accepted approval decision id.

## Idempotency Behavior

Package creation uses the AAF writer transaction and existing idempotency semantics.

Verified behavior:

- same idempotency key and identical semantic payload safely reuses the existing AAF evidence package row
- same idempotency key with changed source truth produces `AafIdempotencyConflictError`
- the freshness check uses `${idempotencyKey}:freshness`

## Tests Run

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- combined AAF unit/contracts suite:
  - `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
  - `packages/gnr8-runtime-contracts/src/index.test.ts`
  - `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
  - `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
  - `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.test.ts`
  - `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- combined disposable DB integration suite:
  - `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
  - `apps/platform/gnr8/aaf/aaf-policy-gate-facade.integration.test.ts`
  - `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.integration.test.ts`
  - `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- focused AAF TypeScript check for the builder and new tests

Full `apps/platform` typecheck was attempted and still fails on existing non-AAF test fixture/type drift, consistent with prior AAF closeouts. No AAF-7 diagnostic was found by the focused check.

## Runtime Non-Mutation Confirmation

AAF-7 does not modify:

- live publish activation behavior
- publish route behavior
- active pointers
- site versions
- runtime artifacts
- public runtime serving
- content overrides
- rollback state
- domain, DNS, Vercel, Openprovider, registrar, SSL, or hosting state
- Command Center or Ops Inbox
- BMF, billing, Stripe, provider execution, or AI execution

Static guardrail tests assert the builder does not import or call publish activation, active pointer mutation, rollback, content publish/rollback, domain/provider/DNS, Vercel, Openprovider, Stripe, or AI execution paths.

## External Provider Non-Call Confirmation

AAF-7 makes no external provider calls. Integration tests use only local disposable Docker Postgres with `postgres:15`, `--pull=never`, and the AAF persistence migration.

No production Supabase, staging Supabase, remote Supabase, Vercel, Openprovider, DNS provider, Stripe, AI provider, or other external provider was called.

## Known Blockers

- A canonical DDOM readiness snapshot persistence table was not found. Domain readiness is therefore represented through the source-reader contract and synthetic tests until DDOM persistence is accepted.
- A canonical publish target table was not found. The builder represents publish target through explicit reader-supplied source truth.
- No live runtime source reader was added in AAF-7 because importing `runtime-store.ts` would pull a mixed read/write module into this phase.

## Residual Risks

- Future integration must provide a carefully reviewed read-only source reader over canonical runtime/domain/content/AAF tables.
- AAF-7 creates evidence packages but does not evaluate the dry-run gate itself.
- Missing source truth packages are persisted as invalid evidence for diagnostics; downstream consumers must continue treating them as blockers.
- Domain readiness stale policy still needs a canonical TTL/source table decision.

## Recommendation For Next Milestone

AAF-7 is safe to accept as a non-executing evidence builder.

The next milestone should be architectural review of the source-reader production implementation and DDOM readiness snapshot persistence. Do not proceed to live publish route integration, blocking publish enforcement, rollback integration, domain/DNS integration, Command Center/Ops Inbox integration, BMF, billing, Stripe, provider execution, or AI execution until that review is complete.
