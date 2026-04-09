1. LEGACY IMPORT PATH (step-by-step)

Most likely path behind the earlier “better imported site” behavior (including Maver):
- Primary legacy product path: `POST /api/gnr8/runtime/migrate/url` (`apps/platform/app/api/gnr8/runtime/migrate/url/route.ts`).
- Confirmation for Maver specifically: `apps/platform/gnr8/runtime/genesis-records/maver-shadow-genesis.json` records `"route": "/api/gnr8/runtime/migrate/url"`.

Step-by-step (legacy product path):
1. Input source: live URL request body to `/api/gnr8/runtime/migrate/url`.
2. Acquisition mechanism: calls `importPublicSinglePageUrlToSnapshot(...)` (`apps/platform/gnr8/validation/runtime/url-single-page-import.ts`) to fetch entry HTML, attempt rendered capture, and snapshot assets.
3. HTML source actually consumed by migration path: route reads `snapshot.entryHtmlPathAbs` and passes that HTML to `importHtmlToPage(...)` (`apps/platform/gnr8/importer/html-to-page.ts`).
4. Structure extraction: `importHtmlToPage` builds sections from HTML/layout graph and emits section props; this path can yield broad `legacy.html`-style content representation.
5. Semantic/canonical prep: `migrateImportedPageToCanonicalDraft(...)` (`apps/platform/gnr8/runtime/migration-factory.ts`) converts imported page into canonical runtime draft and writes runtime version.
6. Render/preview path: runtime preview route (`/api/gnr8/runtime/versions/[siteVersionId]/preview`) serves debug preview bundle or transformed artifact (`apps/platform/gnr8/runtime/unified-render-preview.ts`).
7. Persistence/lifecycle: DRAFT created first, then separate READY/APPROVE/PUBLISH transitions used by Command Center flows (`apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`, `apps/platform/gnr8/runtime/staging-host-coverage-seed.ts`).
8. Final visible site output: published runtime artifact; Maver output includes `legacy.html` summary rendering markers (`data-gnr8-legacy-summary="visible-v2"`) from artifact builder (`apps/platform/gnr8/runtime/artifact-builder.ts`).

Was this live import / static snapshot / fixture / manual?
- Maver-era legacy product path is a hybrid: live URL import + snapshot capture, then migration from snapshot entry HTML.
- It is not the fixture-only validation path.

Secondary legacy (non-productized) path also present:
- Validation/operator path: `POST /api/validation/url-import` -> `runUrlImportOperatorFlow` (`apps/platform/app/api/validation/url-import/route.ts`, `apps/platform/src/validation-shell/url-import-operator.ts`).
- Fixture validation path: `runRealSiteValidation`/beta export operator (`apps/platform/gnr8/validation/runtime/run-first-real-site-validation.ts`, `apps/platform/src/validation-shell/beta-export-operator.ts`).
- These were strong for diagnostics/preview validation, but they are operator/validation surfaces, not the scoped client product import route.

2. CURRENT SCOPED IMPORT PATH (step-by-step)

Current product path:
- `POST /api/gnr8/agency/clients/[clientId]/sites/import` (`apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`).

Step-by-step:
1. Input + scope gate: validates URL, agency/client authorization, and scoped ownership context.
2. Snapshot acquisition: calls `importPublicSinglePageUrlToSnapshot(...)` (same capture subsystem as above).
3. Capture/fallback decision: snapshot internally tries rendered capture worker/executor, and can degrade to `raw_html_fallback` if rendered DOM is weak/unavailable (`url-single-page-import.ts`).
4. Scoped pipeline execution: calls `runScopedImportPipeline(...)` with `fallbackToLegacyOnPipelineFailure: false` (explicitly disables legacy fallback in this route).
5. Migration stages/artifacts: `importStaticSite` + `createImportManifest` + `runLinearMigrationPipeline`; extracts prepared site/layout/render/preview artifacts (`apps/platform/gnr8/site/scoped-import-pipeline.ts`).
6. Runtime version creation: builds canonical migration input from prepared semantic sections/style signals, writes runtime site version with import provenance.
7. Artifact persistence + bind: deterministic artifact bundle creation, artifact row creation, bind to site version, write-path verification.
8. Ownership + workspace wiring: resolves/creates ownership `sites` row for scoped client and links runtime version to ownership site; returns redirect to scoped Site Workspace.
9. Site Workspace preview/read model: resolves transformed preview vs debug preview readiness from runtime artifacts/page versions (`apps/platform/gnr8/site/site-workspace-read-model.ts`, `apps/platform/gnr8/site/site-preview-contract.ts`).

3. KEY DIFFERENCES

Input source type:
- Legacy product path: live URL -> snapshot -> then direct `importHtmlToPage` migration path.
- Current scoped path: live URL -> snapshot -> full linear migration pipeline -> canonical runtime artifact binding.

Execution runtime and path classification:
- Legacy routes are explicitly non-canonical (`apps/platform/gnr8/site/site-import-contract.ts` lists `/api/gnr8/import/url-and-save`, `/api/gnr8/import/html-and-save`, `/api/gnr8/runtime/migrate/url`).
- Current scoped path is canonical: `scoped_snapshot_import_v1`.

Rendered capture dependency:
- Both paths use the same snapshot capture subsystem.
- Current path is more sensitive to downstream structured outputs (prepared semantic/layout/render artifacts) after capture quality decisions.
- Legacy migrate route can still produce a “full-looking” result even with weak structure, because it relies on HTML-to-page fallback behavior and legacy summary rendering.

Asset/style signal availability:
- Current path persists provenance/style/capture evidence explicitly and exposes it in Site Workspace.
- Legacy path can look visually complete while carrying less explicit provenance semantics.

Preview path differences:
- Validation/operator path has temporary preview hosting (`/validation/previews/by-output/...`) from materialized static bundles.
- Current scoped product preview is runtime site-version preview (`/api/gnr8/runtime/versions/[siteVersionId]/preview`), with transformed/debug modes.

Persistence complexity:
- Legacy path: simpler migration create + separate lifecycle actions.
- Current scoped path: more persistence contracts in one flow (provenance write, artifact create, bind verification, ownership linkage).

False differences vs real differences:
- False difference: “old path had better capture engine.” Code shows both old/new rely on the same snapshot capture subsystem (`url-single-page-import.ts`) for live URL capture.
- Real difference: old productized output quality often came from lenient legacy rendering (`legacy.html` + `htmlSummary` visible renderer), not from stronger canonical semantic transformation.
- Real difference: validation/operator path quality can appear stronger because it often runs on prepared/static fixture inputs and dedicated operator surfaces.

4. WHAT LEGACY DID BETTER

Concrete strengths:
- Produced user-visible, content-dense pages even when structure quality was weak, via legacy section rendering (`legacy.html` summarized rendering in artifact builder).
- Tolerated degraded input better in outward appearance (less brittle perception under partial capture/weak structure).
- Simpler end-to-end path for command-center operations (`/api/gnr8/runtime/migrate/url` + lifecycle actions), reducing immediate failure surfaces.
- Validation/operator tooling provided strong temporary preview and diagnostics for snapshot/materialize analysis (`/api/validation/url-import`, `/validation/previews/by-output/...`).

What was “better” but not necessarily “more correct”:
- Better perceived completeness came partly from rendering/summarization strategy, not necessarily from richer canonical semantic extraction.

5. WHAT CURRENT DOES BETTER

Concrete strengths:
- Correct scoped product integration (agency/client authorization + ownership linking in one canonical path).
- Canonical migration path with explicit runtime provenance, rendered capture telemetry, style signals, and evidence paths persisted.
- Deterministic artifact creation/binding verification and stronger write-path integrity checks.
- Clear Site Workspace diagnostics model for fidelity status (`sourceMode`, `renderedCaptureStatus`, style coverage, evidence refs).
- Better long-term architecture for productization and governance than operator/legacy ad-hoc paths.

6. REUSABLE LEGACY COMPONENTS

Reusable:
- Legacy visible fallback rendering pattern (`legacy.html`/`htmlSummary` rendering in `artifact-builder.ts`) as a controlled fallback presentation layer within canonical scoped flow.
- Operator diagnostics concepts from URL import operator (compare evidence, explicit mismatch flags) for internal observability.
- Temporary preview-hosting behavior for controlled debugging/operator surfaces, not as primary product preview.

Not worth reviving directly:
- Non-canonical import routes as primary product entry (`/api/gnr8/import/url-and-save`, `/api/gnr8/import/html-and-save`, `/api/gnr8/runtime/migrate/url`).
- Fixture-dependent validation assumptions as user-facing import quality claims.

Dangerous to reintroduce:
- Replacing canonical scoped pipeline persistence with legacy direct migration path in production scope.
- Masking structured pipeline failures entirely behind legacy summary rendering without surfacing fidelity/provenance state.

7. MAVER / EARLIER IMPORT CASE ASSESSMENT

Assessment:
- High confidence Maver site was produced through the legacy command-center/runtime route `/api/gnr8/runtime/migrate/url`, then promoted through lifecycle to published shadow host.
- Evidence: `apps/platform/gnr8/runtime/genesis-records/maver-shadow-genesis.json` explicitly records route, lifecycle, artifact, and rendered output with `legacy.html` summary markers.

What this implies:
- Maver’s “better” visible result is consistent with legacy rendering behavior that presents dense extracted content attractively, not necessarily proof that legacy capture/semantic pipeline was inherently stronger.

Uncertainty statement:
- I cannot prove from current code alone the full historical UI/operator sequence users clicked at that time; but the persisted genesis record strongly grounds the backend path and artifact chain used.

8. RECOMMENDED REUSE STRATEGY

Recommendation:
- A. Reuse Legacy Static/Snapshot Rendering Strengths in Current Product Flow

Why this one:
- Keep canonical scoped architecture (authorization, provenance, artifact integrity, ownership linkage) as system-of-record.
- Borrow only the legacy “content-visible fallback rendering” strengths as a bounded fallback layer when scoped pipeline fidelity is degraded.
- Avoid reviving non-canonical routes as primary entrypoints; use them only as reference behavior and internal diagnostics.

Files/routes/services inspected (primary evidence set):
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts`
- `apps/platform/app/api/gnr8/import/url-and-save/route.ts`
- `apps/platform/app/api/gnr8/import/html-and-save/route.ts`
- `apps/platform/gnr8/runtime/migration-factory.ts`
- `apps/platform/gnr8/importer/html-to-page.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `apps/platform/gnr8/site/site-import-contract.ts`
- `apps/platform/gnr8/site/site-importer-routing.ts`
- `apps/platform/gnr8/site/site-workspace-read-model.ts`
- `apps/platform/gnr8/site/site-preview-contract.ts`
- `apps/platform/gnr8/runtime/unified-render-preview.ts`
- `apps/platform/app/api/validation/url-import/route.ts`
- `apps/platform/src/validation-shell/url-import-operator.ts`
- `apps/platform/gnr8/validation/runtime/run-first-real-site-validation.ts`
- `apps/platform/app/validation/previews/by-output/[previewKey]/[[...previewPath]]/route.ts`
- `apps/platform/gnr8/runtime/genesis-records/maver-shadow-genesis.json`
- `apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`
