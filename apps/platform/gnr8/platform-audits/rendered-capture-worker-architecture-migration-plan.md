# Rendered Capture Worker Architecture & Migration Plan

## 1. Problem Summary
- Scoped imports are operationally healthy for persistence, provenance, fallback, and pipeline progression.
- Rendered browser capture still degrades in live-like execution with environment-oriented diagnostics (`ENVIRONMENT_UNSUPPORTED`, Playwright package/binary checks, runtime probe).
- Root issue is execution surface suitability for browser automation, not importer heuristics.

## 2. Production Constraints Observed
- Browser automation requires a reliable Node runtime with predictable browser binaries and launch permissions.
- Current route-level import surface should remain request-bounded and resilient; browser execution is heavier and operationally different.
- Long-term artifact handoff must not rely on ephemeral local `/tmp` as a service boundary.
- Failure diagnostics must remain deterministic and provenance-compatible with existing Site Workspace evidence.

## 3. Recommended Architecture (Primary Direction)
- **Recommendation: A dedicated internal capture worker/service (synchronous HTTP call in phase 1, queue option in phase 2).**

Why this is the best fit:
- Browser reliability: isolates Playwright runtime and browser binaries in a purpose-built Node surface.
- Deployment simplicity: importer app and capture worker can be deployed/scaled independently without forcing browser concerns into every API path.
- Operational safety: bounded worker timeouts, isolated failures, explicit support truth.
- GNR8 fit: importer keeps orchestration and persistence responsibilities; worker focuses only on capture execution.
- Scalability path: same contract can move from sync request/response to async queue without redesigning importer data model.

Options considered:
- Queue-only first: stronger for heavy load, but slower to integrate and higher infra complexity for immediate unblock.
- Separate external API service: viable but adds extra auth/network boundary overhead now; internal service is faster first step.
- Keep in app surface: rejected as long-term architecture because runtime/deployment/browser constraints remain coupled.

## 4. Worker Contract

Scaffolded types:
- `apps/platform/gnr8/import-rendered-capture-worker/worker-contract.ts`

Request (`rendered_capture_worker_request_v1`):
- `requestId`, `importId`, `sourceUrl`
- `trace`: `agencyId`, `clientId`, `siteId` (tracing only)
- `capture.viewport`
- `capture.readinessPolicy`
- `capture.captureScreenshots|captureComputedStyles|captureRenderedDom`
- `capture.timeoutBudgetMs`

Response (`rendered_capture_worker_response_v1`):
- `status`: `available | partial | failed | unsupported`
- `environment`:
  - `runtimeKind`
  - `environmentSupported`
  - `browserPackageAvailable`
  - `browserBinaryAvailable`
  - `supportDecision`
- `artifacts`: typed refs (`rendered_dom_html`, `computed_style_samples_json`, `screenshot_png`)
- `computedStyleSamples`
- `diagnostics`
- `qualitySummary`
- `failure` (class/code/retryable/message)
- `timings` (queue/execution/total)

Contract properties:
- deterministic shape
- explicit support truth
- directly mappable into current provenance/evidence model

## 5. Artifact Handoff Model
- **Primary model:** worker writes capture artifacts to object storage and returns immutable artifact refs (`uri`, `sha256`, `byteLength`, `mediaType`).
- Inline payloads only for small control data (diagnostics, small sample arrays), not full DOM/screenshots in production.
- Main app persists refs + selected derived metrics in current provenance summary and evidence manifest.
- Shared local disk is allowed only for local/dev simulation, not cross-service production boundary.

## 6. Failure Model
Worker failure classes:
- `environment_unsupported`
- `browser_launch_failed`
- `navigation_failed`
- `dom_empty_after_render`
- `style_sampling_failed`
- `screenshot_failed`
- `timed_out`
- `internal_error`

Mapping principles:
- Environment-support failures set `status=unsupported` and `failureClass=environment_unsupported`.
- Capture execution failures set `status=failed` or `partial` with precise failure class and retryability.
- Partial success remains first-class (for example screenshots succeeded but style sampling failed).
- Keep existing diagnostics taxonomy compatible and additive.

## 7. Phased Migration Plan

### Phase 1 — Contract + Sync Worker Path (Recommended immediate)
- Finalize contract types and adapter boundary.
- Deploy internal capture worker service with bounded synchronous endpoint.
- Add importer-side worker client adapter.
- Route a controlled subset of scoped imports through worker call.
- Preserve current fallback behavior if worker is unavailable/unsupported.

### Phase 2 — Default Worker-backed Capture
- Switch scoped import rendered capture to worker by default.
- Keep in-process capture only as temporary fallback/feature-flagged rollback.
- Persist worker environment/failure truth into existing provenance fields.
- Expand operational telemetry (latency/failure-class distribution).

### Phase 3 — Async Capture Expansion
- Introduce queue mode for heavier sites or long-running captures.
- Support richer capture profiles (multi-viewport first, multi-page later if separately approved).
- Maintain same request/response schema and evidence persistence model.

## 8. Reusable Components (Do Not Rebuild)
- Runtime provenance summary model
- Diagnostics taxonomy and code semantics
- Acquisition evidence and rendered-capture manifest patterns
- Scoped import pipeline stages and persistence wiring
- Style signal model consumption path
- Preview fallback behavior

## 9. Risks
- Auth/authorization between app and worker if service boundary is networked.
- Storage consistency and lifecycle management for worker artifacts.
- Timeout budget drift between importer route and worker execution windows.
- Partial rollout complexity if both in-process and worker paths coexist.

Mitigations:
- Signed internal requests + strict allowlist.
- Immutable artifact refs with hash verification.
- Explicit timeout contracts at both caller and worker.
- Feature flags and staged rollout by client/site cohort.

## 10. Recommendation For Implementation Order
1. Keep contract and adapter boundary as the stable API.
2. Implement minimal sync worker endpoint with browser execution + object-storage artifact writes.
3. Integrate scoped import call path with bounded timeout + truthful fallback.
4. Roll out gradually and monitor environment/failure truth metrics.
5. Add async queue path only after sync path is stable.

## Architecture Diagram
```text
Scoped Import Route
  -> Rendered Capture Worker Client (sync, bounded timeout)
      -> Capture Worker Service (Node + Playwright)
          -> Browser launch/navigation/capture
          -> Object Storage artifacts (DOM/screenshots/styles)
          -> Response manifest + diagnostics + support truth
  -> Import Pipeline (existing)
  -> Runtime Persistence (existing provenance model)
  -> Site Workspace Evidence (existing read model)
```

## Explicit Limitations
- No full worker implementation in this task.
- No deployment rollout in this task.
- No queue infrastructure implementation in this task.
- No billing/subscription changes.
- No multi-page capture implementation.
