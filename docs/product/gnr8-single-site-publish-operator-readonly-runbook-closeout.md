# GNR8 MVP-61 Single-Site Publish Operator Read-Only Runbook Closeout

Scope: add deterministic read-only diagnostic interpretation to the internal Command Center single-site publish operator panel.

MVP-61 keeps the MVP-58/MVP-59/MVP-60 panel internal-only, source-owned where applicable, non-enforcing, and non-mutating. It translates blocker, stale, missing, conflict, gate, metadata, and audit states into compact operator runbook entries with safe inspection guidance and no action surface.

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
- `docs/product/gnr8-single-site-publish-operator-readonly-drilldown-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Projection And UI Locations

Runbook helper/projection location:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- exported helper: `buildSingleSitePublishOperatorRunbook(...)`
- projection fields: `runbookSummary` and `runbookEntries`

UI location:

- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- section title: `Diagnostics Runbook`
- route: `/gnr8/command-center/single-site-publish`

## Runbook Entry Shape

Each entry includes:

- `code`
- `severity`
- `sourceOwner`
- `title`
- `diagnosticExplanation`
- `safeNextInspectionHint`
- `requiredUpstreamSource`
- `blocking`
- `stale`
- `missing`
- `conflict`
- `relatedSafeRefs`
- `relatedSafeCodes`
- `readOnly: true`
- `actionAvailable: false`

Severity vocabulary:

- `info`
- `warning`
- `blocked`
- `critical`

Source owner categories:

- `launch_readiness`
- `publish_activation_request`
- `publish_activation_decision`
- `gate_evaluation`
- `metadata_resolver`
- `operator_audit`
- `runtime_candidate`
- `publish_target`
- `unknown`

## Cases Covered

Launch readiness:

- no readiness record
- readiness blocked
- readiness stale
- missing required dimensions
- open P0 blocker
- ready with limitations

Publish activation request:

- request missing
- request pending
- wrong scope/action/subject
- missing linked evidence

Publish activation decision:

- decision missing
- decision rejected
- decision revoked
- decision superseded
- decision expired
- granted with limitations

Gate evaluation:

- gate result missing
- gate blocked
- gate stale
- gate warning with limitations
- newer gate conflict
- handoff/gate watermark or source-ref mismatch

Metadata resolver:

- metadata incomplete
- missing strict identity
- runtime candidate metadata missing
- publish target metadata missing
- expected ref mismatch
- resolver read failure

Audit:

- no dry-run yet
- latest dry-run failed/preflight failed
- shadow publish available but not run
- latest shadow publish failed
- latest shadow publish completed
- persisted audit mutation/enforcement flags as diagnostic-only critical entries

## Summary Behavior

`runbookSummary` exposes:

- total, blocking, stale, missing, and conflict entry counts
- counts by severity
- counts by source owner
- top blocking reason
- recommended inspection order

Top blocking reason is the first blocking entry after deterministic sort by severity, source owner, and code. `critical` outranks `blocked`, which outranks `warning` and `info`. Source owner ordering starts with launch readiness, runtime candidate, publish target, request, decision, gate, metadata, audit, and unknown.

Recommended inspection order is derived from blocking and warning entries in that same deterministic ordering. Clean projections render an empty runbook state and no top blocking reason.

Existing `nextAction` remains a derived read-only recommendation and is preserved. Runbook entries add interpretive context such as `AUDIT_SHADOW_PUBLISH_AVAILABLE_NOT_RUN` while explicitly setting `actionAvailable: false`.

## Redaction Behavior

Runbook output only emits short deterministic text, safe refs, and safe codes. Unsafe values matching secrets, tokens, credentials, SQL, stack traces, provider payloads, Stripe/payment/billing details, raw payload markers, or known secret env values are redacted or omitted.

Runbook output does not expose raw SQL, stack traces, secrets, provider payloads, Stripe/payment details, raw AAF blobs, raw resolver payloads, or raw orchestrator payloads.

## Access Control

The page-level `requireSuperadminUserIdForPage()` guard remains present. The Command Center layout guard remains present. MVP-61 does not expose the panel to client portal, public routes, or Ops Inbox.

## UI Behavior

The new `Diagnostics Runbook` section renders:

- compact summary counts
- severity and source owner count badges
- recommended inspection order
- top blocking reason
- entries grouped by severity and source owner
- read-only/no-action badges
- safe refs and safe codes with overflow-safe wrapping

No action buttons, forms, POSTs, fetch calls, mutation links, dry-run controls, shadow-publish controls, retry controls, approval controls, rollback controls, refresh controls, resolve controls, provider controls, billing controls, domain/DNS controls, or publish controls were added.

## Validation Results

Focused projection/runbook tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- Result: passed, 19/19.

Focused panel/render tests:

- `pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- Result: passed, 9/9.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false --project apps/platform/tmp-mvp61-tsconfig.json`
- Result: passed after narrowing the temporary config to changed files. The temporary config was removed.

Static React render validation:

- Passed through the panel render tests.
- Tests assert the runbook section renders, severity/source grouping renders, top blocking reason renders, empty/no-issue runbook state renders, long refs remain constrained, no unsafe diagnostic keys render, and no `<button>` or `<form>` appears.

Browser screenshot validation:

- Not run. No dev server was started for this bounded read-only implementation. Static React render validation covered markup structure, empty states, long refs, and no-action controls.

## Guardrail Results

Confirmed by code review, focused tests, changed-file scope review, and forbidden mutation/provider/action searches:

- no AAF writes were added
- no AAF request creation was added
- no AAF decision creation was added
- no gate evaluator invocation was added
- no gate attempt creation was added
- no PASR invocation was added
- no DDOM snapshot creation was added
- no provider, DNS, Vercel, Openprovider, Stripe, billing, domain, AI, production Supabase, or staging Supabase calls were added
- no publish, rollback, active pointer, runtime artifact, site version, publish target, content, billing, or domain mutation was added
- no generic publish route behavior was changed
- no client portal behavior was changed
- no Ops Inbox behavior was changed
- no action buttons or forms were added
- no commit or push was performed

## Issues Found And Fixed

- The first runbook decision test combined `granted_with_limitations` with revoked/superseded/expired flags. The projection correctly treated that as invalid, so the test was split into separate invalid and clean limited-decision cases.
- A failed dry-run fixture used a non-canonical `dry_run_failed` status. It was corrected to the existing `preflight_failed` audit status.
- A first focused TypeScript attempt inherited the full app include list and surfaced unrelated existing platform drift. The temporary focused config was narrowed, and changed-file TypeScript passed.

## Residual Risks

- Browser screenshot validation was not run; static React render coverage is the visual validation for this phase.
- The runbook interprets only states already present in the read-only projection. It does not repair missing upstream records and does not verify live production data.
- Handoff watermark mismatch detection is limited to safe projected watermarks and existing source-ref mismatch indicators.

## Safe-To-Accept Decision

MVP-61 is safe to accept. The internal operator panel can now explain read-only publish-path diagnostics in a deterministic, source-owned way without adding action or mutation capability.

Online GNR8 verification is not needed now. This phase is local, deterministic, and read-only; no production or staging Supabase, provider, DNS, Vercel, Openprovider, Stripe, AI, billing, domain, runtime, publish, rollback, AAF mutation, gate evaluation, PASR, or DDOM verification is required.

Recommended next milestone: MVP-62 should remain read-only unless explicitly scoped otherwise, likely focused on operator evidence cross-linking/export-safe snapshots or acceptance criteria for the eventual source-owned action workflow.

No commit or push was performed.
