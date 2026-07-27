# GNR8 AAF-8 Publish Source Reader Review Closeout

AAF-8 completed a documentation-only architecture review for the production publish activation source reader, DDOM readiness snapshot persistence, and publish target source truth after AAF-7.

No runtime behavior, TypeScript implementation, SQL migration, route, provider, DNS, billing, AI, worker, public runtime, AAF writer/facade/adapter/builder, staging Supabase, production Supabase, or external provider was changed or called.

## Files Reviewed

AAF implementation and contracts:

- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`

Docs:

- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Runtime/source areas:

- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-site-readiness.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-domain-operations-read-model.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-readiness-drilldown.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-domain-recheck-workflow.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/content-override-runtime.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/pages/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`

Migrations:

- `apps/platform/supabase/migrations/20260407_site_actions_layer_v1.sql`
- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/supabase/migrations/20260504120000_content_overrides_version_hardening.sql`
- `apps/platform/supabase/migrations/20260504133000_content_override_history.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260518120000_runtime_provider_jobs.sql`
- `apps/platform/supabase/migrations/20260519110000_runtime_provider_operation_approvals.sql`
- `apps/platform/supabase/migrations/20260519120000_runtime_provider_execution_handoffs.sql`
- `apps/platform/supabase/migrations/20260522120000_runtime_provider_operator_reviews.sql`
- `apps/platform/supabase/migrations/20260522143000_runtime_provider_governance_snapshots.sql`
- `apps/platform/supabase/migrations/20260525120000_runtime_provider_governance_authorizations.sql`

## Files Created Or Updated

- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Current-State Source Truth Summary

Canonical enough for AAF after read-only wrappers:

- site version: `gnr8_runtime_site_versions`
- runtime artifact: `gnr8_runtime_artifacts`
- active pointer: `gnr8_runtime_active_pointers`
- published content overrides: `gnr8_content_overrides` plus aggregate watermark
- launch and publish activation approvals: AAF approval request/decision/revocation/supersession tables
- AAF evidence/audit refs: AAF append-only tables

Not sufficient yet:

- domain readiness, because current state is mutable domain bindings plus derived readiness/read models, not canonical DDOM snapshot persistence;
- publish target truth, because current state is request/stage input plus artifact stage and no durable target policy source;
- rollback readiness as a publish prerequisite, because rollback target refs exist but rollback approval/evidence remains separate.

Not canonical for publish evidence:

- Command Center, Ops Inbox, previews, thumbnails, WU/VCU, Generated Proposal Bundles, Workspace, Evolution, AI/provider outputs, UI labels, provider payloads, and external screenshots/tickets unless accepted as evidence refs with freshness labels.

## Production Source Reader Recommendation

Implement `PublishActivationEvidenceSourceReader` in a new AAF-owned source reader module backed by a dedicated read-only repository using lower-level Postgres queries.

Do not import `runtime-store.ts` while it remains mixed read/write. Do not import publish routes, orchestrators, rollback, content publish/rollback, Vercel, Openprovider, DNS providers, provider execution, public runtime, Command Center, Ops Inbox, billing/Stripe, AI, or worker code.

Use one read-only repeatable-read transaction, generate source refs from canonical tables, surface missing/stale/partial truth explicitly, and preserve AAF-7's injected-reader boundary.

## DDOM Snapshot Recommendation

Add append-only DDOM readiness snapshot persistence before the production source reader. Proposed MVP tables are:

- `gnr8_ddom_readiness_snapshots`
- `gnr8_ddom_readiness_snapshot_refs`

Snapshots should cite domain bindings, host bindings, Vercel snapshots, DNS instruction snapshots, manual completion evidence, exceptions, external refs, and audit refs. They must preserve DDOM-1: GNR8 stores operating records/snapshots/evidence/freshness/projections, while external DNS providers remain DNS truth and Vercel remains Vercel-state truth.

## Publish Target Recommendation

Represent MVP publish targets as database-backed policy/config records, proposed as `gnr8_publish_targets`, with durable source refs and watermarks.

Do not infer publish target truth from UI labels, route names, button text, or request body alone.

## Watermark And Freshness Recommendation

| Source | Preferred watermark | Fallback | Freshness handling |
| --- | --- | --- | --- |
| Site version | `updated_at` | Stable hash of id/site/version/state/artifact/provenance | Missing or state mismatch blocks. |
| Runtime artifact | `bundle_sha256` plus id, or immutable artifact version | Hash of artifact identity, manifest, stage, governance, asset map | Stage/governance mismatch blocks. |
| Active pointer | `updated_at` | Hash of site_id, active_site_version_id, active_artifact_id | Changed pointer makes evidence stale. |
| Publish target | Proposed `updated_at`/`policy_version` | Hash of target policy fields | Missing/disabled/mismatch blocks. |
| Domain readiness | Proposed DDOM snapshot `source_watermark` | Hash of snapshot payload and refs | TTL expiry or dependency change blocks unless exception. |
| Content override published state | Aggregate max `updated_at`, count, row hash | Hash of exact published rows | Missing required state blocks; empty state must be explicit. |
| Launch signoff | Approval decision/request/evidence/revocation/supersession aggregate | Hash of approval scope/subject/policy/status refs | Wrong scope, expiry, revocation, supersession blocks. |
| Publish activation approval | Same AAF approval aggregate for `publish_activation` | Same | Must match exact subject/evidence/policy. |

## Enforcement Readiness Assessment

Ready now:

- AAF persistence
- AAF writer
- AAF policy/gate facade
- AAF publish dry-run adapter
- AAF publish evidence builder
- approval persistence
- audit event taxonomy
- evidence package persistence
- idempotency conflict behavior

Ready after source reader implementation:

- production source reader
- read-only tests
- disposable DB integration tests
- runtime non-mutation guardrails

Ready after DDOM snapshot persistence:

- DDOM readiness snapshot persistence
- domain readiness source refs for publish evidence

Ready after publish target source truth implementation:

- publish target truth

Not required for MVP:

- live DNS mutation
- registrar mutation
- Openprovider live mutation
- autonomous cutover or DNS repair

Blocked by architectural decision until future ADR:

- provider-backed DNS/registrar automation
- live publish enforcement before source truth exists

## Recommended Next Milestone

Safest next milestone: DDOM readiness snapshot persistence migration/design implementation.

Reason: the production source reader needs a durable `domainReadiness` source ref. Without DDOM snapshots, publish evidence would either depend on mutable domain bindings or derived read models, which violates the source truth boundary and DDOM-1.

After DDOM snapshots, implement publish target truth, then the read-only production source reader, then publish route shadow integration. Do not start live blocking enforcement yet.

## Architecture Warnings

- `runtime-store.ts` is a mixed read/write module and must not be imported by the production source reader as-is.
- Current publish route can call Vercel checks and mutate domain binding state during publish reconciliation.
- Domain readiness read models are projections, not durable readiness snapshots.
- Current publish target truth is ambiguous.
- Runtime artifacts can be refreshed in place; watermarks must cover mutable fields unless immutability is tightened.
- Content override current state is mutable; evidence must use aggregate row hashes.
- Launch signoff, domain exception, and domain readiness must not be treated as publish activation approval.
- Rollback changes runtime pointer only; it does not undo external DNS cutover.

## Validation Performed

Validation was performed after documentation edits:

- confirmed all new docs exist and are readable;
- checked required section headings/content across the new docs;
- confirmed current-state facts and proposed architecture are labeled separately;
- confirmed DDOM and AAF boundaries are preserved;
- confirmed no TypeScript implementation files were changed;
- confirmed no SQL migrations were created;
- confirmed no runtime/provider/DNS/billing/AI/worker/public-runtime files were changed;
- ran `git diff --check`;
- checked Markdown trailing whitespace;
- reviewed `git status --short`.

## Commands Run

Repository inspection only:

- `pwd`
- `git status --short`
- `rg --files ...`
- `rg -n ...`
- `sed -n ...` on inspected files
- `git diff --check`

No runtime tests were run. No external provider, production Supabase, staging Supabase, Vercel, Openprovider, DNS provider, Stripe, AI provider, or remote service was called.

## Safety Conclusion

This review is safe to accept as documentation-only architecture work.

Live publish enforcement may not begin yet. The next phase must implement source truth prerequisites, starting with DDOM readiness snapshot persistence, and should still avoid blocking publish enforcement until shadow evidence and read-only source-reader guardrails are proven.

