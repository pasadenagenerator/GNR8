# GNR8 PASR-1 Publish Activation Source Reader Read-Only Core Closeout

PASR-1 implements the first production read-only publish activation source reader. It reads canonical source truth for the AAF-7 publish activation evidence builder without integrating live publish routes, executing publish, creating evidence packages, mutating runtime state, or calling external providers.

## Files Reviewed

Implementation and contracts:
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`

Migrations and runtime table definitions:
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260407_site_actions_layer_v1.sql`
- `apps/platform/supabase/migrations/20260423110000_site_bootstrap_runtime_site_id_text_alignment.sql`
- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/supabase/migrations/20260504120000_content_overrides_version_hardening.sql`
- `apps/platform/supabase/migrations/20260504133000_content_override_history.sql`

Architecture and product docs:
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Locations

Source reader:
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`

Source read repository:
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`

Public entry points:
- `AafPublishActivationSourceReader`
- `AafPublishActivationSourceReadRepository`
- `readPublishActivationSources(...)`

## Transaction And Read-Only Strategy

`AafPublishActivationSourceReadRepository.withReadOnlyTransaction(...)` uses one PostgreSQL transaction:

- `begin isolation level repeatable read read only`
- `select transaction_timestamp()::text as captured_at`
- all source reads under the same snapshot
- `commit`

If transaction setup or source reading fails, the reader fails closed and returns `read_only_transaction_unavailable` or `publish_activation_source_reader_unavailable` as a limitation. Integration tests verify `transaction_read_only = on`, `transaction_isolation = repeatable read`, transaction timestamp capture, and no mutation SQL in the reader query log.

## Source Queries Implemented

PASR-1 reads:

- site version: `public.gnr8_runtime_site_versions`
- runtime artifact: `public.gnr8_runtime_artifacts`
- active pointer: `public.gnr8_runtime_active_pointers`
- publish target: `public.gnr8_publish_targets`
- DDOM readiness: `public.gnr8_ddom_readiness_snapshots`
- content override published state: `public.gnr8_content_overrides`
- launch signoff approval: AAF request/decision/revocation/supersession/partial timeline tables for `launch_signoff`
- publish activation approval: the same AAF timeline tables for `publish_activation`

No runtime-store import, route handler, publish orchestrator, provider module, DNS module, content publish/rollback module, Command Center, Ops Inbox, public runtime, billing, Stripe, AI, or worker module is imported.

## Source Ref Strategy

Every present source uses:

- `sourceSystem`: `gnr8`
- `sourceTable`: exact table name
- `sourceRecordId`: row id or documented aggregate key
- `sourceRef`: `gnr8:<table>:<id-or-aggregate-key>`
- `queryRef`: stable `aaf_publish_activation_source_reader:v1:<source>`
- `snapshotRef`: durable DDOM snapshot ref or aggregate source ref where applicable
- `capturedAt`: the single transaction timestamp, except canonical source capture timestamps inside canonical fields

Aggregate keys:

- content overrides: `site_version:<siteVersionId>:published`
- approval timelines: request or decision row id, with aggregate timeline watermark

## Watermark Strategy

- site version: `updated_at` when present; builder stable hash fallback over canonical fields
- runtime artifact: `bundle_sha256` plus artifact id; builder stable hash fallback
- active pointer: `updated_at`; builder stable hash fallback
- publish target: explicit `source_watermark`; builder stable hash fallback over canonical policy fields
- DDOM readiness: `source_watermark`
- content override state: stable aggregate hash of published rows or not-applicable state
- launch signoff: stable aggregate hash over request, decision, revocation, supersession, expiry, policy, evidence, and partial timeline fields
- publish activation approval: same aggregate approval timeline strategy

## DDOM Mapping Behavior

- `ready` -> AAF `ready`
- `ready_with_warnings` -> AAF `ready` plus warnings
- `not_applicable` -> AAF `not_applicable`
- `manually_excepted` -> AAF `manually_excepted`
- `blocked` -> AAF `blocked`, failed freshness, explicit blockers
- `stale` or stale freshness -> AAF `blocked`, stale freshness, blocker `domain_readiness_stale`

The reader does not run live DNS, Vercel, Openprovider, SSL, registrar, hosting, or provider checks.

## Publish Target Handling

The reader validates the requested target row from `gnr8_publish_targets`:

- missing target returns missing source truth
- disabled target returns present failed source truth with `disabled_publish_target`
- retired target returns present failed source truth with `retired_publish_target`
- environment mismatch returns `publish_target_environment_mismatch`
- stage mismatch returns `publish_target_stage_mismatch`
- artifact stage not allowed by target returns `artifact_stage_not_allowed_by_target`

The default trusted environment and stage are MVP `production`, with optional trusted input fields added to `PublishActivationEvidenceReaderInput`.

## Approval Handling

Launch signoff reads only `launch_signoff` AAF approval truth when required by policy.

Publish activation approval reads only `publish_activation` AAF approval truth when a ref is provided or an exact site-version subject can be queried safely. Wrong-scope refs are returned as failed source truth and are not accepted as publish activation approval.

Revoked, superseded, expired, missing-decision, non-granted, and partial-timeline approval states are explicit through freshness and limitations. Launch signoff, client review, domain readiness, domain exception, AI advisory, Command Center, and Ops Inbox are not inferred as publish activation approval.

## Missing, Stale, And Failed Handling

PASR-1 surfaces:

- `missing_site_version`
- `missing_runtime_artifact`
- `runtime_artifact_site_version_mismatch`
- `runtime_artifact_site_mismatch`
- `missing_active_pointer`
- `missing_publish_target`
- `disabled_publish_target`
- `retired_publish_target`
- `publish_target_environment_mismatch`
- `artifact_stage_not_allowed_by_target`
- `missing_ddom_snapshot`
- `stale_ddom_snapshot`
- `missing_required_content_override_state`
- `missing_required_launch_signoff`
- `missing_publish_activation_approval`
- `approval_wrong_scope`
- `approval_expired`
- `approval_revoked`
- `approval_superseded`
- `partial_aaf_approval_timeline`

Missing required truth is returned as `null` where appropriate, so the AAF-7 builder can fail evidence freshness instead of fabricating success.

## Validation Results

Passed:

- PASR-1 unit tests: `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.test.ts`
- PASR-1 disposable DB integration tests: `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.integration.test.ts`
- existing AAF publish evidence builder unit and integration tests
- existing AAF publish dry-run adapter unit and integration tests
- DDOM-2 focused static tests
- PTT-1 focused static tests
- focused PASR-1 TypeScript no-emit check via `/private/tmp/pasr-1-tsconfig.json`

Full `apps/platform` TypeScript check was attempted and still fails on existing unrelated test fixture/type drift outside AAF/PASR. No PASR-1 diagnostic was present in the focused check.

Disposable DB execution:

- local Docker `postgres:15`
- `--pull=never`
- minimal synthetic runtime fixture tables matching canonical table names/columns used by the reader
- applied AAF persistence core, DDOM-2, and PTT-1 migrations
- seeded synthetic site version, runtime artifact, active pointer, DDOM snapshot, publish target, content override, and approval rows
- verified all snapshots returned, read-only repeatable-read state, disabled target, stale DDOM, and no mutation SQL in reader log

## Runtime And Provider Non-Change Confirmation

No live runtime action path changed. No publish route, publish orchestrator, active pointer mutation, runtime artifact mutation, site version mutation, content publish/rollback, domain route, hosting recheck, rollback, Command Center, Ops Inbox, public runtime serving/rendering, billing, Stripe, AI, worker, provider execution, DNS, Vercel, or Openprovider code was changed.

No production Supabase, staging Supabase, remote Supabase, Vercel, Openprovider, DNS provider, registrar API, Stripe, AI provider, or external provider was called. The only database execution was disposable local Docker Postgres.

## Issues Found

- Full platform `tsc` remains noisy due existing unrelated test fixture/type drift.
- `gnr8_runtime_site_versions`, `gnr8_runtime_artifacts`, and `gnr8_content_overrides` are mutable canonical tables, so PASR-1 watermarks must cover mutable fields. The reader does this through update fields, bundle hashes, and aggregate hashes.
- PTT-1 seed `limitations_json` contains phase commentary; PASR-1 keeps it in canonical fields but does not treat it as a blocking reader limitation.

## Residual Risks

- The reader is not wired into live publish routes by design.
- No DDOM snapshot writer service exists yet, so production DDOM snapshots must be produced by a later milestone before live shadow usage.
- Publish target admin/audit workflow does not exist yet; target policy changes remain a future milestone.
- Full runtime migrations were not applied in integration because they are embedded/mixed with runtime-store behavior; the integration used minimal synthetic runtime fixture tables matching the canonical names and columns the reader selects.

## Safety Conclusion

PASR-1 is safe to accept. It adds a server-only read-only production source reader and repository, implements the AAF-7 source-reader interface, reads canonical source truth across runtime/DDOM/PTT/content/AAF tables, preserves missing/stale/failed states, proves read-only behavior in disposable Postgres, and leaves live runtime/provider behavior untouched.

## Recommended Next Milestone

Wait for architectural review. The next reviewed milestone should be publish-route shadow integration using the PASR-1 reader, still non-blocking and non-executing, after confirming how DDOM snapshots will be produced in production.
