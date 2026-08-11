# GNR8 MVP-60 Single-Site Publish Operator Read-Only Drilldown Closeout

Scope: improve the MVP-58/MVP-59 internal Command Center single-site publish operator panel with read-only drilldown, local filtering, sorting, and timeline detail.

MVP-60 keeps the panel internal-only, read-only, non-enforcing, and non-mutating. It adds projection-derived drilldown rows for launch readiness, publish activation, gate handoff, metadata resolver diagnostics, and audit history so an internal operator can inspect blocked, stale, missing, incomplete, and ready states without any action surface.

## Files Reviewed

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `apps/platform/app/gnr8/command-center/layout.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-source-enrichment-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-publish-operator-readonly-drilldown-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## UI Location

Route: `/gnr8/command-center/single-site-publish`

The route remains guarded by `requireSuperadminUserIdForPage()` at the page level and by the Command Center layout.

## Projection Changes

The read-only projection now exposes:

- launch readiness dimension drilldown rows grouped as ready, stale, missing, blocked, or optional
- blocker counts by severity and category
- freshness status per launch readiness dimension
- accepted limitations
- publish activation request evidence refs
- publish activation decision evidence refs, limitation codes, and revocation/supersession/expiration/invalid indicators
- gate conflict and mismatch detail rows
- metadata resolver diagnostic detail rows
- recent sanitized audit event rows
- compact audit timeline summary rows

No persistence, SQL migration, external call, approval creation, gate evaluation, publish action, or runtime mutation was added.

## Drilldown Sections

Launch readiness:

- grouped dimension rows
- ready/stale/missing/blocked/optional group summaries
- blocker count by severity/category
- freshness status per dimension
- accepted limitations

Publish activation:

- request scope/action/subject/policy/expiration details
- request evidence refs
- decision status/projection/expiration details
- decision evidence refs
- decision limitations and invalidating indicators

Gate handoff:

- gate result, blockers, warnings, watermarks, and refs
- mismatch and newer-conflict detail rows

Metadata resolver:

- completeness status
- missing metadata codes
- mismatch codes
- safe resolver diagnostics

Audit:

- latest dry-run attempt
- latest shadow-publish attempt
- recent sanitized event history
- compact filtered timeline summaries

## Filtering And Sorting

The UI adds passive local controls only:

- row status select: show all, blockers only, stale only, missing only
- timeline mode select: all attempts, dry-run only, shadow-publish only
- timeline sort select: newest first or oldest first
- safe ref/code search input

These controls filter already-projected arrays in the client component. They do not call `fetch`, submit forms, write data, evaluate gates, or trigger runtime behavior.

## Empty States

Added or preserved operational empty states for:

- no audit history
- no launch readiness record
- no launch readiness dimension rows
- no publish activation request
- no publish activation decision
- no gate attempt
- incomplete metadata
- source table/read failure codes through safe metadata diagnostic rows

## Redaction

MVP-59 redaction rules remain in force. The projection emits safe statuses, refs, watermarks, codes, labels, actor roles, correlation/idempotency values, and boolean result flags only.

It does not expose raw SQL, stack traces, provider secrets, Stripe/payment details, raw AAF payloads, raw resolver/orchestrator payloads, or internal source blobs. Focused tests assert unsafe diagnostic keys and values stay absent from the rendered/projection JSON.

## Access Control

The page-level `requireSuperadminUserIdForPage()` guard remains present. The Command Center layout guard remains present. No client portal, public route, or Ops Inbox exposure was added.

## Validation Results

Focused projection tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- Result: passed, 12/12.

Focused panel/render tests:

- `pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- Result: passed, 8/8.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false --project apps/platform/tmp-mvp60-tsconfig.json`
- Result: passed. The temporary config included only MVP-60 changed files and was removed.

Static render validation:

- Passed through the panel render test.
- Static render asserts drilldown sections, controls, constrained long refs, safe empty states, no `<button>`, no `<form>`, and no unsafe diagnostics.

Browser screenshot validation:

- Not run. No dev server was started for this read-only bounded implementation; static React render validation covered desktop-safe markup structure and long-ref constraints.

## Guardrail Results

Confirmed by code review, focused tests, changed-file scope review, and forbidden mutation/provider/action searches:

- No action buttons or forms were added.
- No dry-run, shadow-publish, publish, approve, reject, retry, refresh, resolve, rollback, domain, DNS, billing, provider, AAF request, AAF decision, AAF gate, PASR, DDOM, or runtime mutation behavior was added.
- No AAF writes were added.
- No AAF request or decision creation was added.
- No gate evaluator invocation was added.
- No gate attempt creation was added.
- No PASR invocation was added.
- No DDOM snapshot creation was added.
- No provider, DNS, Vercel, Openprovider, Stripe, AI, billing, or domain calls were added.
- No publish, rollback, active pointer, runtime, publish-target, site-version, content, billing, or domain mutation was added.
- Generic publish route behavior is unchanged.
- Client portal behavior is unchanged.
- Ops Inbox behavior is unchanged.

## Issues Found And Fixed

- Optional launch readiness dimensions could be grouped as missing when their source status was missing; MVP-60 now keeps non-required dimensions in the optional group unless blocked or stale.
- The operator panel needed pure display-filter helpers so focused tests can verify filtering without adding a browser or action surface.
- The enriched model fixtures were expanded to include new drilldown, event, and summary fields.

## Residual Risks

- Browser viewport screenshots were not captured.
- Source table availability is still represented as safe diagnostic codes rather than raw database errors.
- Handoff watermark remains limited to persisted source/audit watermarks already available to the read-only projection.

## Safe-To-Accept Decision

MVP-60 is safe to accept. The internal operator panel is easier to inspect and diagnose while remaining strictly internal, read-only, non-enforcing, and non-mutating.

## Online Verification

Online GNR8 verification is not needed now. This milestone is a local read-only UI/projection change with focused tests and no external provider behavior.

## Recommended Next Milestone

MVP-61 should add a documentation-only or read-only operator runbook pass for interpreting common blocked/stale/missing combinations, still without buttons, mutation routes, gate evaluation, provider calls, or client exposure.

No commit or push was performed.
