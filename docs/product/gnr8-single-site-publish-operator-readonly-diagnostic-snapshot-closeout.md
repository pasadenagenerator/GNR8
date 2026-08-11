# GNR8 MVP-62 Single-Site Publish Operator Read-Only Diagnostic Snapshot Closeout

Scope: add a deterministic, redacted, export-safe diagnostic snapshot layer to the internal Command Center single-site publish operator panel.

MVP-62 keeps the MVP-58/MVP-59/MVP-60/MVP-61 surface read-only, superadmin-only, non-enforcing, and non-mutating. It adds a semantic snapshot over the existing sanitized operator projection so the current publish-path diagnostic state can be captured, compared, and shared internally without raw source payloads or action capability.

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
- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-publish-operator-readonly-diagnostic-snapshot-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Builder And UI Locations

Snapshot builder/projection location:

- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- exported helper: `buildSingleSitePublishOperatorDiagnosticSnapshot(...)`
- projection field: `diagnosticSnapshot`

UI location:

- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- section title: `Diagnostic Snapshot`
- route: `/gnr8/command-center/single-site-publish`

## Snapshot Schema Shape

The snapshot exposes:

- `snapshotVersion`
- `snapshotGeneratedAt`
- `snapshotWatermark`
- `sourceWatermarks`
- explicit flags: `readOnly: true`, `exportSafe: true`, `actionAvailable: false`, `publishes: false`, `runtimeMutation: false`, `enforcementApplied: false`
- safe identity and lookup refs
- candidate/artifact/publish-target safe refs
- launch readiness summary
- publish activation request summary
- publish activation decision summary
- gate/handoff summary
- metadata resolver summary
- operator audit summary
- runbook summary
- top blocking reason
- recommended inspection order
- blocker/warning/limitation/stale/missing/conflict code lists
- source-owned versus derived-only labels
- safe display references
- redacted `exportSafeJsonPreview`

## Snapshot Watermark Behavior

`snapshotWatermark` is computed from canonical JSON over semantic snapshot content. Object keys are sorted recursively before hashing. `snapshotGeneratedAt` is intentionally excluded from the hash so the watermark remains stable across repeated reads that only differ by display timestamp.

The watermark format is:

- `single-site-publish-operator-diagnostic-snapshot:<sha256>`

Safe source watermarks are exposed under `sourceWatermarks` when already available in the sanitized projection.

## Safe References Shown

The panel renders display-only safe refs:

- launch readiness record ref
- launch readiness evidence ref
- publish activation request ref
- publish activation decision ref
- gate result ref
- candidate version ref
- runtime artifact ref
- publish target ref
- latest dry-run audit ref
- latest shadow-publish audit ref

These are not mutation links and do not call routes. They render as copyable/display-only text.

## JSON Preview Decision

MVP-62 renders a compact, collapsible `Export-safe JSON preview`.

No download button was added. The preview is built from the already-rendered safe snapshot and contains no raw source payloads.

## Redaction Behavior

Snapshot construction reuses the MVP-58/MVP-59/MVP-60/MVP-61 sanitized projection and applies an additional recursive sanitizer to snapshot output. Unsafe keys or values matching secrets, tokens, credentials, SQL, stack traces, provider payload markers, raw payload markers, Stripe/payment/billing data, or known secret env names are redacted or omitted.

The snapshot does not expose raw SQL, stack traces, secrets, provider payloads, Stripe/payment data, raw AAF payloads, raw resolver payloads, raw orchestrator payloads, cookies, tokens, sessions, or private customer/payment details.

## Access Control

The page-level `requireSuperadminUserIdForPage()` guard remains present. The Command Center layout guard remains present. No client portal, public route, or Ops Inbox exposure was added.

## Validation

Focused tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`

Focused TypeScript no-emit:

- temporary `apps/platform/tsconfig.mvp62.tmp.json` with only MVP-62 changed files and `composite: false`
- `pnpm exec tsc -p apps/platform/tsconfig.mvp62.tmp.json --noEmit --pretty false`
- result: pass
- the temporary config was removed after validation

Repo-level TypeScript no-emit:

- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`
- result: failed on unrelated existing repository test/type errors outside MVP-62, including candidate review action route tests, first-limited dry-run tests, client site-create route tests, migration/runtime tests, preview/runtime tests, provider setting tests, and template intake tests.

Static render validation:

- `single-site-publish-operator-panel.test.tsx` renders the panel with React static markup.
- It verifies the `Diagnostic Snapshot` section, safe refs, JSON preview, long-ref wrapping, empty states, and no mutation controls.

Diff/whitespace/scope:

- `git diff --check`: pass
- trailing whitespace search over changed files: pass
- changed-file scope stayed limited to the operator projection, operator panel, focused tests, closeout doc, and canonical index.

Browser screenshot validation:

- Not run in MVP-62 closeout. Static React render validation was run; a browser-backed visual pass is optional follow-up because this phase did not add routes, server actions, or client-side data fetching.

## Guardrails

MVP-62 did not add:

- action buttons
- forms
- POST routes
- fetch mutation controls
- AAF request creation
- AAF decision creation
- gate evaluator invocation
- gate attempt creation
- PASR invocation
- DDOM snapshot creation
- provider, DNS, Vercel, Openprovider, Stripe, billing, domain, or AI calls
- active pointer mutation
- publish, rollback, runtime, publish-target, or content mutation
- generic publish route behavior changes
- client portal changes
- Ops Inbox action changes
- commits
- pushes

Guardrail searches were run across the changed projection/panel/page and protected generic publish/client portal/Ops Inbox files. Protected route searches returned no imports or references to the diagnostic snapshot/panel. Mutation/action searches returned no POST route, button, form, fetch, download, active pointer mutation, publish invocation, provider call, AAF write, gate evaluation, PASR, DDOM, DNS/domain, Stripe/billing, AI, or runtime mutation additions. The only `rollback` hit is the pre-existing read-only SQL transaction cleanup rollback inside the SELECT-only projection repository.

## Residual Risks

- The JSON preview is intentionally display-only and not downloadable. If a future phase adds a client-side copy/download affordance, it should use only `diagnosticSnapshot.exportSafeJsonPreview` and must keep route calls out of the panel.
- Repo-wide TypeScript no-emit currently has unrelated failures; MVP-62 acceptance should rely on focused tests/checks until those existing repository issues are cleaned up.
- Browser screenshot validation was not run in this closeout.

## Acceptance

MVP-62 is safe to accept as a read-only diagnostic snapshot layer. It makes the current single-site publish operator diagnostic state deterministic, redacted, export-safe, and displayable without adding action or mutation capability.

Online GNR8 verification is not needed now because this change is internal, read-only, source-projection based, and covered by focused static render plus projection tests.

Recommended next milestone:

- MVP-63: optional snapshot comparison/diff view over two safe diagnostic snapshots, still read-only and without routes/actions unless a separate export policy is approved.
