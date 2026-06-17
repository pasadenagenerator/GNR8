# Production Capture Execution Path Audit

## Audit Scope

Phase 8B-12K-F6.5 audited the rendered-capture execution path to decide whether the proposed worker-accessible raw artifact source-serving endpoint is a required production architecture change or a workaround for a local smoke-test shape.

This phase is architecture audit and decision only. It did not change importer behavior, Evidence Capture behavior, worker behavior, source resolution behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema. It did not create a source-serving endpoint, Evidence Capture artifact, DryRun package, FirstLimitedDryRun output, import, capture retry, repair job, migration, or new capture artifact.

## Intended Production Capture Flow

The codebase contains two materially different production capture lanes.

### Fresh URL Import

Fresh URL import is the normal agency site import path:

- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts` calls `importPublicSinglePageUrlToSnapshot(...)`.
- `importPublicSinglePageUrlToSnapshot(...)` fetches the entry HTML from the public `sourceUrl`, writes run-scoped local snapshot files, then builds a `rendered_capture_worker_request_v1`.
- The worker request uses `sourceUrl = entryFetchUrlUsed ?? normalizedHref`, which is a public `http(s)` URL, not the run-scoped local snapshot file.
- The remote rendered-capture worker receives the public URL and navigates with `page.goto(request.sourceUrl)`.
- `runScopedImportPipeline(...)` then consumes the resulting snapshot and persists import provenance.

Classification: **A. during fresh URL import**, with **D. platform-side source preparation then remote worker** only for evidence snapshot persistence. The worker navigation source is a public URL, not raw HTML or a platform-local file.

### Existing SiteVersion / Admin Or Worker Capture Retry

Existing siteVersion capture is a separate repair/retry-style lane:

- `apps/worker/gnr8/site/inngest/site-render-capture-job.ts` calls `runSiteRenderCapture(...)`.
- `runSiteRenderCapture(...)` resolves existing local provenance if it still exists, otherwise reads durable `raw_imported_site` HTML bytes from persisted artifact storage.
- The resolved HTML is materialized to a temp path under the caller runtime.
- `runSiteRenderCapture(...)` converts that temp path with `pathToFileURL(source.entryHtmlPathAbs).toString()`.
- `executeRenderedCaptureViaWorker(...)` sends that `file://` URL as worker `sourceUrl`.
- The remote worker navigates with `page.goto(request.sourceUrl)`.

Classification: **B. through admin capture/retry route** and **C. through worker-side job** where the source is prepared locally before calling a remote capture worker. In this lane, a platform-local or caller-local temp file is not valid unless the browser process runs in the same filesystem context.

## Local Smoke Path Versus Production Path

| Question | Local F5 path | Intended fresh production import path | Existing-version production retry path |
| --- | --- | --- | --- |
| Where source HTML is resolved | Local shell calls `runSiteRenderCapture(...)`; durable `raw_imported_site` bytes are rehydrated from DB. | Platform import route fetches the live public URL and writes run-scoped snapshot files. | Worker/admin retry resolves existing provenance or durable `raw_imported_site` bytes. |
| Where source file is materialized | Local machine temp dir under `/var/folders/.../gnr8/rendered-capture-source-rehydration/.../index.html`. | Platform runtime snapshot dir, but not used as worker navigation URL. | Caller runtime temp dir, likely platform or worker serverless temp storage. |
| What `sourceUrl` is sent to worker | `file://.../index.html` pointing at the local shell filesystem. | Public `http(s)` URL: `entryFetchUrlUsed ?? normalizedHref`. | `file://.../index.html` pointing at caller-local temp storage. |
| Where worker runs | Deployed remote worker at `https://gnr8-worker.vercel.app`. | Deployed remote worker. | Deployed remote worker or separate request context from the job caller. |
| Is the source worker-accessible | No. The deployed worker cannot read a local shell file. | Yes, assuming the original public URL is reachable by the worker. | No, unless the capture browser runs in the same filesystem context as source materialization. |

## Source Accessibility Analysis

The F5 failure is a real failure for the existing-siteVersion retry lane: a remote worker cannot navigate to a `file://` URL for a file materialized in the caller's local or platform temp directory.

The F5 failure is not proof that fresh production URL import needs a raw artifact source-serving endpoint. Fresh import currently sends the original public URL to the worker, and that path does not require the worker to access the platform's temporary snapshot files.

Therefore:

- Platform-local temp files are never a valid cross-process or cross-host worker contract.
- Fresh URL import can be production-correct without F7 if the public source URL is reachable and deterministic enough for first capture.
- Existing siteVersion retry cannot be production-correct against durable imported bytes unless the selected raw artifact source becomes worker-accessible, the worker materializes it itself, or the worker contract changes to carry raw HTML plus asset context.

## F7 Option Evaluation

| Option | Production correctness | Complexity | Security | Determinism | Asset fidelity | Alignment |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Implement platform source-serving endpoint | Correct for existing-version retry and durable raw artifact recapture. Not required for fresh URL import's current worker source contract. | Medium-high because it must serve HTML and relative assets by immutable artifact path. | Requires strict internal auth, path normalization, no mutation, no directory escape, no public indexing. | High when backed by immutable persisted artifact bytes. | High because relative CSS/images can resolve under the same controlled origin. | Strong for Evidence Capture from durable imported source, but broader than the immediate fresh-import proof. |
| 2. Run capture only during fresh import, before source becomes ephemeral | Correct for new imports when the original public URL is reachable. Does not repair existing imported siteVersions. | Low. Uses existing fresh import contract. | Existing worker auth boundary only. | Medium. It depends on the live source at import time, but that is already the import intake moment. | Medium-high for live public assets. | Strong for the current import pipeline. Weak for retroactive capture. |
| 3. Move source materialization into worker | Correct for existing-version retry if the worker can read durable artifact bytes directly. | High because DB/storage access, provenance lookup, and artifact selection move into the worker. | Larger secret and data-access surface in the worker. | High if it reads immutable artifacts. | High if it materializes the full asset tree. | Mixed; it blurs platform source-resolution ownership. |
| 4. Send raw HTML payload and use `page.setContent(...)` | Correct for DOM-only capture. Incomplete for imported-site screenshots/layout unless assets are also solved. | Medium. Requires worker contract change and payload limits. | Requires logging redaction and request size controls. | High for HTML bytes. | Low-medium without a base URL and asset route. | Partial fit; less aligned with current `page.goto(...)` capture model. |
| 5. Run smoke test inside production platform context instead of local shell | Useful to remove local-shell filesystem artifacts from the test. It still fails for existing-version retry if a remote worker receives a platform-local `file://` URL. | Low-medium operationally. | Existing auth boundary. | Medium. | Same as the chosen source URL. | Good as a diagnostic, but it does not settle fresh import unless it exercises fresh import. |

## F7 Decision

F7 is **not architecturally required as the next step to prove the intended fresh production capture flow**.

F7 is **architecturally required only for the separate existing-siteVersion/admin retry lane** if the product requirement is to recapture persisted raw import artifacts through a remote worker while preserving durable-source determinism and relative asset fidelity.

The F5 failure was partly a local test artifact because the local shell generated a `file://` URL that the deployed worker could not access. However, the same class of failure is not local-only for the existing-version retry design: any caller-local temp file sent to a separate remote worker is an invalid source contract.

The important distinction is:

- Fresh production import: worker receives public `http(s)` URL, so F7 is not the immediate requirement.
- Existing-version retry: worker receives caller-local `file://` URL, so F7 or another source-contract refactor is required before that lane can be production-correct.

## Recommendation

Recommended next step: **D. Fresh import after worker readiness, then reassess**.

Run a fresh production-context import only after worker health and route readiness are confirmed. The fresh import should prove whether the intended production path can produce rendered Evidence Capture when the worker receives the public source URL instead of a caller-local `file://` URL.

Do not implement F7 before that proof. If fresh import succeeds, F7 should be scoped later as a retroactive existing-siteVersion recapture capability, not as the blocker for new production imports. If fresh import fails with a source-accessibility error despite receiving a public URL, reassess the worker source contract with fresh evidence.

## Recommended Next Phase

Phase 8B-12K-F7 should be replaced by:

**Phase 8B-12K-F7 Fresh Production Import Capture Verification**

Boundary for that next phase:

- Use the normal fresh URL import path after worker readiness is confirmed.
- Verify the worker request `sourceUrl` is public `http(s)`, not `file://`.
- Record rendered capture status, worker diagnostics, source mode, screenshot count, computed style sample count, and Evidence Capture baseline availability.
- Do not create a source-serving endpoint, run retroactive capture repair, run Limited Dry Run, run reconstruction, generate AI/React/block output, publish, or change schema.

