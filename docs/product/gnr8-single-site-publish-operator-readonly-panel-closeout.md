# GNR8 MVP-58 Single-Site Publish Operator Read-Only Panel Closeout

Scope: first visible internal-only Command Center panel for reading single-site governed publish status and latest MVP-57 operator audit attempts.

MVP-58 adds a superadmin-only, read-only Command Center page backed by a SELECT-only projection over MVP-57 audit records. It displays identity, publish readiness context, publish activation refs/watermarks, latest dry-run and shadow-publish audit attempts, blockers/warnings/limitations, redacted diagnostic summaries, persisted result flags, and a derived next operator action.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-operator-action-audit-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`
- `docs/product/gnr8-single-site-shadow-publish-internal-admin-route-closeout.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/supabase/migrations/20260806120000_single_site_publish_operator_action_audit.sql`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/gnr8/command-center/layout.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`

Updated:

- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## UI Location

Selected location: `/gnr8/command-center/single-site-publish`

This is safe because `/gnr8/command-center/layout.tsx` already requires `requireSuperadminUserIdForPage()` and redirects anonymous users to `/login` and forbidden non-superadmin users to `/superadmin`. The new page also calls `requireSuperadminUserIdForPage()` directly so the route remains fail-closed if reused outside the layout.

No client portal route, public route, Ops Inbox route, or generic publish route was added or changed.

## Read Projection

Location: `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`

Lookup supports:

- `migrationId`
- `siteId`
- `candidateSiteVersionRef`

The repository issues only SELECT queries against:

- `public.gnr8_single_site_publish_operator_actions`
- `public.gnr8_single_site_publish_operator_action_refs`
- `public.gnr8_single_site_publish_operator_action_events`

The pure projection mapper returns latest dry-run, latest shadow-publish, recent timeline, identity, candidate/artifact/target refs, launch readiness evidence ref, publish activation request/decision refs, gate result ref, handoff/gate watermarks, safe actor/correlation/idempotency fields, blocker/warning/limitation codes, redacted diagnostic summaries, and panel boundary flags.

## Data Shown

Identity:

- tenant id
- client id
- site id
- migration id
- candidate site version ref
- runtime artifact ref
- publish target ref
- publish stage
- publish environment

Governed publish chain:

- launch readiness evidence ref/status
- publish activation request ref/status
- publish activation decision ref/status
- gate result ref/status
- handoff watermark
- gate input watermark

Operator audit:

- latest dry-run status/result/wrapper/resolver/orchestrator status
- latest shadow-publish status/result/wrapper/resolver/orchestrator status
- recent audit timeline
- actor role/type/id safe projection
- correlation id
- idempotency key
- persisted mutation-result flags from audit summaries when present

Blockers and limitations:

- blocker codes
- warning codes
- limitation codes
- stale or missing metadata indicators
- redacted diagnostic status/reason codes

Panel flags:

- `readOnly: true`
- `publishes: false`
- `runtimeMutation: false`
- `enforcementApplied: false`
- `createsAafRecords: false`
- `createsGateAttempt: false`
- `evaluatesGate: false`
- `pasrInvoked: false`
- `createsDdomSnapshots: false`
- `providerCalls: false`

## Next Action Vocabulary

- `run_internal_dry_run`
- `resolve_missing_metadata`
- `await_publish_activation_decision`
- `refresh_launch_readiness`
- `review_gate_blockers`
- `shadow_publish_available`
- `no_action`

## Redaction Behavior

The projection only carries safe codes, statuses, refs, watermarks, actor role/type/id, correlation, idempotency, and persisted boolean flags. Unsafe diagnostic keys or values such as raw SQL errors, stack traces, provider secrets, Stripe/payment/billing data, raw resolver payloads, and raw publish orchestrator payloads are omitted from the rendered model. Tests assert that unsafe diagnostic keys do not surface.

## Boundary Confirmations

- No action buttons were added.
- No dry-run, shadow-publish, publish, approve, reject, retry, refresh, resolve, rollback, domain, DNS, billing, provider, AAF request, AAF decision, AAF gate, PASR, DDOM, or runtime mutation action was added.
- Generic publish route is unchanged by MVP-58.
- Client portal publish route is unchanged by MVP-58.
- Ops Inbox is unchanged by MVP-58.
- No AAF records are created.
- No gate evaluator is invoked.
- No PASR path is invoked.
- No DDOM snapshot is created.
- No provider, DNS, Vercel, Openprovider, Stripe, billing, AI, production Supabase, or staging Supabase call was added.
- No active pointer, runtime artifact, site version, publish target, content override, billing, domain, or rollback mutation was added.

## Validation Results

Focused tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- Result: passed, 5/5.

- `pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- Result: passed, 6/6.

Focused TypeScript:

- `pnpm exec tsc -p tmp-mvp58-tsconfig.json --pretty false`
- Result: passed with a temporary standalone focused config. The temporary config was removed.

An earlier focused TypeScript attempt inherited app-wide includes and surfaced existing unrelated platform test drift plus four local projection narrowing errors. The local narrowing errors were fixed, and the standalone focused config passed.

Render validation:

- Static React render test passed for the panel component.
- The test asserts no `<button>`, constrained long refs through ellipsis/nowrap styling, and no unsafe diagnostic keys in rendered markup.
- Browser screenshot validation was not performed; no dev server was started.

## Issues Found And Fixed

- The panel test initially imported the server-only projection builder, which forced React server conditions and blocked `react-dom/server`; the render test now uses a plain fixture model.
- The panel component needed an explicit React import for standalone static rendering.
- The first access-control source assertion read the client layout shell instead of the route layout; it now checks `layout.tsx`.
- The projection had four strict-null narrowing issues in governed-chain status derivation; these were fixed.

## Residual Risks

- The page reads only MVP-57 audit records, so sites with no dry-run or shadow-publish audit record show an empty/readiness-unknown state.
- Chain statuses are derived from safe refs and persisted result summaries; the panel does not re-read or evaluate AAF/gate/source truth in MVP-58.
- Browser screenshot validation was not run, so visual QA is covered by static render assertions rather than real viewport screenshots.

## Safe-To-Accept Decision

MVP-58 is safe to accept. Internal platform superadmins can view governed single-site publish status and latest audit history in a read-only Command Center surface, with no ability to mutate publish/runtime/approval/provider state.

## Recommended Next Milestone

MVP-59 should add a source-owned governed status enrichment read model that can safely join persisted launch readiness / AAF decision / gate handoff source truth into the same read-only panel, still without buttons, blocking enforcement, provider calls, client exposure, or runtime mutation.

No commit or push was performed.
