# GNR8 MVP-59 Single-Site Publish Operator Read-Only Source Enrichment Closeout

Scope: enrich the MVP-58 internal Command Center read-only panel with source-owned read projections from the governed single-site publish chain.

MVP-59 keeps the panel internal-only, read-only, non-enforcing, and non-mutating. It adds source-owned launch readiness, publish activation request/decision, gate/handoff, metadata completeness, and audit sections to the existing MVP-57 audit projection.

## Files Reviewed

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`

## Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-publish-operator-readonly-source-enrichment-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Projection And UI Locations

Projection: `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`

UI: `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`

Route: `/gnr8/command-center/single-site-publish`, guarded by `requireSuperadminUserIdForPage()` at the page and Command Center layout boundary.

## Source Systems Read

- MVP-57 operator audit actions, refs, and events.
- MVP-37/MVP-39 launch readiness records, dimensions, refs, and blockers.
- MVP-40 launch readiness evidence packages and freshness checks.
- MVP-41 AAF publish activation approval requests and evidence links.
- MVP-42 AAF publish activation decisions, evidence links, revocation, and supersession refs.
- MVP-43 handoff-equivalent request/decision/evidence refs and safe watermarks.
- MVP-44 AAF action gate attempts and policy evaluation rows through read-only SELECTs only.
- MVP-49-style metadata completeness diagnostics derived from persisted refs.
- PTT publish target refs from `gnr8_publish_targets` when resolvable.

Cross-source reads use a repeatable-read read-only transaction when the repository is backed by a real pool with `connect()`.

## Fields Shown

Launch readiness:

- record ref/id, status, freshness, source watermark
- ready, ready-with-limitations, blocked, stale, and missing flags
- missing, stale, and blocked dimensions
- accepted limitations
- open blockers by severity/category/status
- evidence package ref/status/watermark

Publish activation request and decision:

- request ref/id, status, scope, action, subject, linked launch readiness evidence ref
- request policy version, policy evaluation id, requested expiration
- decision ref/id, status, projection, granted/granted-with-limitations/rejected/invalid flags
- decision limitations, expiration, revoked and superseded indicators

Gate and metadata:

- handoff readiness status
- handoff and gate input watermarks when available
- gate result ref/id/status
- gate blockers, warnings, mismatches, and newer-conflict indicator
- metadata completeness, missing metadata codes, expected/resolved mismatch codes, and resolver-safe diagnostics

Audit:

- latest dry-run and shadow-publish action ids
- recent audit timeline
- actor role, correlation id, idempotency key
- persisted result flags, including publishMayHaveExecuted/runtimeMutation/enforcement flags

## Next Action Vocabulary

- `collect_launch_readiness_evidence`
- `resolve_launch_readiness_blockers`
- `request_publish_activation_approval`
- `await_publish_activation_decision`
- `review_rejected_publish_activation`
- `prepare_gate_evaluation`
- `resolve_gate_blockers`
- `run_internal_dry_run`
- `shadow_publish_available`
- `review_shadow_publish_failure`
- `no_action`

Examples:

- no launch readiness source row: `collect_launch_readiness_evidence`
- stale or blocked launch readiness: `resolve_launch_readiness_blockers`
- launch readiness ready but no request: `request_publish_activation_approval`
- request without decision: `await_publish_activation_decision`
- rejected/invalid/revoked/expired decision: `review_rejected_publish_activation`
- approved decision but no gate result: `prepare_gate_evaluation`
- allowed gate and completed dry-run with no shadow publish: `shadow_publish_available`

## Boundary And Redaction

Every enriched section is labeled as source-owned read or derived-only plus non-enforcing and non-mutating. Command Center remains a visibility surface only, not source truth.

The projection only emits safe statuses, ids, refs, watermarks, codes, actor/correlation/idempotency fields, and boolean flags. Unsafe raw diagnostics such as SQL, stack traces, secrets, provider payloads, payment/billing values, raw resolver payloads, and raw orchestrator payloads are omitted.

## Validation Results

Focused tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- Result: passed, 11/11.

- `pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- Result: passed, 7/7.

Focused changed-file TypeScript:

- `pnpm exec tsc --noEmit --pretty false --project apps/platform/tmp-mvp59-tsconfig.json`
- Result: passed. The temporary config disabled `composite`, included only MVP-59 changed files, and was removed.

Full platform TypeScript:

- `pnpm exec tsc --noEmit --pretty false --project apps/platform/tsconfig.json`
- Result: failed on unrelated existing platform drift in tests and runtime modules. No local MVP-59 errors remained after the focused pass.

Render validation:

- Static React render validation passed.
- Desktop/mobile browser screenshot validation was not performed because no dev server was started in this bounded implementation. Static render tests assert constrained long refs, no unsafe diagnostics, useful empty states, and no buttons/forms.

## Guardrail Results

Confirmed by code review, focused tests, and forbidden-term/source-scope searches:

- No action buttons, forms, POST calls, fetch mutations, dry-run controls, shadow-publish controls, retry controls, approval controls, rollback controls, or refresh/resolve controls were added.
- Generic publish route was not changed.
- Client portal routes were not changed.
- Ops Inbox routes/actions were not changed.
- No AAF request or decision creation was added.
- No AAF gate evaluator invocation was added.
- No gate attempt creation was added.
- No PASR invocation was added.
- No DDOM snapshot creation was added.
- No provider, DNS, Vercel, Openprovider, Stripe, billing, domain, AI, production Supabase, or staging Supabase calls were added.
- No runtime artifact, active pointer, site version, publish target, content override, rollback, billing, or domain mutation was added.

## Issues Found And Fixed

- MVP-58 audit-only assumptions meant source-empty projections dominated next-action derivation; MVP-59 now preserves audit-only behavior while using source rows when present.
- Publish activation subject-type reads were corrected to the existing `site_version` contract.
- A strict TypeScript narrowing issue around shadow-publish status comparison was fixed.
- The panel fixture was expanded from MVP-58 shape to the enriched MVP-59 model.

## Residual Risks

- Handoff watermark is shown when stored in audit metadata; source-only handoff watermark is not reconstructed beyond available persisted gate input metadata.
- Browser screenshot validation was not run; visual validation is static-render based.
- Source reads assume the canonical MVP-37/MVP-40/MVP-41/MVP-42/MVP-44 tables are present in the platform database.

## Safe-To-Accept Decision

MVP-59 is safe to accept. The internal operator panel is meaningfully more informative from source-owned read models while remaining strictly read-only, internal-only, non-enforcing, and non-mutating.

## Recommended Next Milestone

MVP-60 should add a read-only operator drilldown or filtering pass for historical source timelines and source-specific freshness detail, still without mutation controls or enforcement behavior.

No commit or push was performed.
