# GNR8 MVP-63 Single-Site Publish Operator Read-Only Snapshot Diff Closeout

Scope: add a deterministic read-only snapshot comparison view to the internal Command Center single-site publish operator panel.

MVP-63 keeps the MVP-58/MVP-59/MVP-60/MVP-61/MVP-62 surface internal-only, superadmin-only, non-enforcing, and non-mutating. It compares the current export-safe diagnostic snapshot against the safest available baseline and renders what improved, regressed, or changed without adding persistence, routes, actions, downloads, or source-truth mutation.

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
- `docs/product/gnr8-single-site-publish-operator-readonly-source-enrichment-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-drilldown-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-diagnostic-snapshot-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-publish-operator-readonly-snapshot-diff-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Builder And UI Locations

Diff builder/projection location:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- exported helper: `buildSingleSitePublishOperatorDiagnosticSnapshotDiff(...)`
- projection field: `diagnosticSnapshotDiff`

UI location:

- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- section title: `Snapshot Diff`
- route: `/gnr8/command-center/single-site-publish`

## Baseline Strategy

The diff helper compares the current MVP-62 diagnostic snapshot against, in order:

- optional `previousDiagnosticSnapshot` supplied to the read-only projection input, typed as `previous_snapshot`
- latest shadow-publish audit attempt summary, typed as `latest_shadow_publish_audit`
- latest dry-run audit attempt summary, typed as `latest_dry_run_audit`
- explicit `none` baseline with a missing-baseline reason

No previous snapshot persistence was added in MVP-63. Audit-derived baselines are built only from the already-sanitized audit projection fields.

## Diff Schema Shape

The diff exposes:

- `diffSchemaVersion`
- current snapshot watermark and generated timestamp
- baseline type/ref/status/watermark/generated timestamp/missing reason
- comparable baseline metadata
- changed categories
- overall severity
- summary counts
- top regression and top improvement
- added/removed blocker, warning, and limitation codes
- stale/missing added and removed codes
- readiness, request, decision, gate, metadata completeness, next action, and top blocker changes
- source watermark changes
- safe ref changes
- `readOnly: true`
- `actionAvailable: false`
- `mutatesSourceTruth: false`

## Severity Behavior

Severity vocabulary:

- `improved`
- `regressed`
- `changed`
- `unchanged`
- `unknown`

Examples covered by focused tests:

- blocker added: `regressed`
- blocker removed: `improved`
- stale/missing metadata removed: `improved`
- granted decision becoming revoked/invalid/rejected: `regressed`
- allowed gate becoming blocked: `regressed`
- metadata completeness moving from incomplete to complete: `improved`
- watermark-only or safe-ref-only changes: `changed`
- no baseline: `unknown`

## Redaction Behavior

The diff compares only sanitized snapshot fields and sanitized audit-attempt projection fields. It applies the same unsafe key/value sanitization used by the snapshot layer before returning the diff.

The diff does not expose raw SQL, stack traces, secrets, provider payloads, Stripe/payment details, raw AAF payloads, raw resolver payloads, raw orchestrator payloads, cookies, tokens, sessions, or private payment/customer data.

## Access Control And UI Behavior

The page-level `requireSuperadminUserIdForPage()` guard remains present. The Command Center layout guard remains present. No client portal, public route, or Ops Inbox exposure was added.

The `Snapshot Diff` section renders:

- baseline type/ref/status
- current and baseline watermarks
- top regression and top improvement
- changed categories
- added/removed blockers, warnings, limitations, and stale/missing indicators
- status changes
- source watermark changes
- safe ref changes
- no-baseline empty state

No buttons, forms, POST routes, fetch mutation controls, downloads, action-looking controls, dry-run controls, shadow-publish controls, retry controls, approval controls, rollback controls, refresh controls, resolve controls, provider controls, billing controls, domain/DNS controls, or publish controls were added.

## Validation Results

Focused projection/snapshot diff tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- Result: passed, 29/29.

Focused panel/static render tests:

- `pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- Result: passed, 10/10.

Focused TypeScript no-emit:

- temporary `apps/platform/tsconfig.mvp63.tmp.json`, narrowed to MVP-63 changed files with `composite: false`
- `pnpm exec tsc -p apps/platform/tsconfig.mvp63.tmp.json --noEmit --pretty false`
- Result: passed.
- The temporary config was removed.

Static React render validation:

- Passed through `single-site-publish-operator-panel.test.tsx`.
- Tests assert the `Snapshot Diff` section renders, no-baseline state renders, improved/regressed/changed rows render, long refs/watermarks stay constrained, and no `<button>`, `<form>`, or fetch mutation control appears.

Browser screenshot validation:

- Not run. No dev server was started for this bounded internal read-only change; the route is superadmin-gated and the focused static React render tests cover the new markup, empty state, long refs, and no-action controls.

## Guardrail Results

Confirmed by code review, focused tests, changed-file scope review, and forbidden mutation/provider/action searches:

- no AAF writes were added
- no AAF request creation was added
- no AAF decision creation was added
- no gate evaluator invocation was added
- no gate attempt creation was added
- no PASR invocation was added
- no DDOM snapshot creation was added
- no provider, DNS, Vercel, Openprovider, Stripe, billing, domain, or AI calls were added
- no publish, rollback, active pointer, runtime, publish-target, site-version, content, billing, or domain mutation was added
- no POST route was added
- no persistence, migration, or snapshot storage was added
- generic publish route behavior is unchanged
- client portal behavior is unchanged
- Ops Inbox behavior is unchanged
- no commit or push was performed

## Issues Found And Fixed

- The focused TypeScript temporary config initially inherited the platform-wide include list and reported unrelated existing repository errors. The config was corrected to include only MVP-63 files, and the focused no-emit pass succeeded.
- Panel test fixtures needed the new `diagnosticSnapshotDiff` and snapshot `currentNextAction` fields. The fixtures now exercise comparable and no-baseline diff rendering.

## Residual Risks

- `previous_snapshot` is supported as an optional projection input for future callers, but MVP-63 intentionally does not persist snapshots. Current production comparison therefore falls back to audit-derived summaries when no external prior snapshot is supplied.
- Audit-derived baselines cannot fully reconstruct every source-owned snapshot field; they compare only safe attempt refs, status, codes, metadata completeness, and watermarks.
- Browser screenshot validation was not run.

## Acceptance

MVP-63 is safe to accept as a read-only diagnostic snapshot diff view. It lets an internal operator compare the current safe snapshot against a safe baseline and see improvements, regressions, and changes without adding persistence, actions, enforcement, or mutation.

Online GNR8 verification is not needed now because this change is internal, read-only, source-projection based, and covered by focused projection/diff tests plus static React render tests.

Recommended next milestone:

- MVP-64: optional persisted safe diagnostic snapshot history design, still read-only by default and only after an explicit persistence policy is approved.
