# Worker Phase 2: Production Reliability System Report

## 1. Reliability goals
- Move rendered capture from request-coupled best-effort execution to explicit, bounded, retryable job execution.
- Persist lifecycle truth so capture behavior is diagnosable and reproducible.
- Make fallback reasons explicit (`timed_out`, `failed_transient`, `failed_terminal`, worker health unavailable) instead of generic unavailable.

## 2. Chosen queue/execution model
- Implemented a file-backed reliability orchestrator: `FileBackedRenderedCaptureJobOrchestrator`.
- Scoped import now uses this path:
  1. Create worker request.
  2. Submit capture job (`queued`).
  3. Run bounded execution with deterministic retry policy.
  4. Persist job + health + result summary to durable JSON.
  5. Map worker response into rendered capture artifacts.
- Integration model: **bounded immediate attempt with deterministic retries**, then truthful fallback when not completed.

## 3. Job lifecycle
- Implemented status model:
  - `queued`
  - `running`
  - `completed`
  - `completed_partial`
  - `failed_transient`
  - `failed_terminal`
  - `timed_out`
  - `cancelled` (reserved)
- Persisted fields include:
  - job id
  - request payload
  - import/site/snapshot correlation
  - status
  - attempt count
  - attempt records (`startedAt`, `completedAt`, failure class/code, retryable)
  - timeout budget
  - failure class/code
  - result summary
  - diagnostics summary
  - artifact refs

## 4. Retry/timeout rules
- Deterministic policy:
  - `maxAttempts = 2`
  - bounded execution wait window (`CAPTURE_JOB_WAIT_BUDGET_MS = 40_000`)
  - per-attempt timeout bounded by remaining wait budget and capture timeout budget
- Retry behavior:
  - retry once for transient failures (`response.failure.retryable=true`)
  - retry once for timeout/execute throw conditions
  - no endless retry loops
- Terminal behavior:
  - unsupported/environment failures classify terminal
  - final state persists as terminal or timed out

## 5. Persistence model
- New durable artifacts under snapshot root:
  - `rendered-capture-jobs/jobs/<jobId>.json`
  - `rendered-capture-jobs/worker-health.json`
- Existing persisted evidence now includes reliability truth:
  - `acquisition-evidence.json` includes `renderedCapture.job` and `renderedCapture.workerHealth`
  - snapshot return model includes `renderedCaptureReliability`
- Runtime provenance persistence now carries optional `captureJob` + `workerHealth` fields.

## 6. Provenance/UI truth
- Scoped import provenance now reflects:
  - job id/status/attempts/failure class/failure code/timing
  - worker health truth (reachable, browserAvailable, queueHealthy, last success/failure)
- New diagnostics taxonomy added and emitted:
  - `CAPTURE_JOB_QUEUED`
  - `CAPTURE_JOB_STARTED`
  - `CAPTURE_JOB_RETRIED`
  - `CAPTURE_JOB_TIMED_OUT`
  - `CAPTURE_JOB_FAILED_TRANSIENT`
  - `CAPTURE_JOB_FAILED_TERMINAL`
  - `CAPTURE_JOB_COMPLETED_PARTIAL`
  - `CAPTURE_JOB_COMPLETED`
  - `CAPTURE_WORKER_HEALTH_UNAVAILABLE`

## 7. Manual validation results
Validation run timestamp (UTC): 2026-04-10.

### Real imports (reliability path enabled)
- `https://nazrob.si`
  - job created and tracked: `completed_partial`, attempts=1
  - rendered DOM captured, screenshots captured, no raw fallback
  - reliability diagnostics present (`CAPTURE_JOB_*`, `CAPTURE_WORKER_HEALTH_UNAVAILABLE`)
- `https://polar.sh`
  - job created and tracked: `completed_partial`, attempts=1
  - rendered DOM captured, screenshots captured, no raw fallback
  - reliability diagnostics present (`CAPTURE_JOB_COMPLETED_PARTIAL`, `RENDERED_CAPTURE_RECOVERED_ON_RETRY`)
- `https://servis-chs.generator.live`
  - job created and tracked: `completed_partial`, attempts=1
  - rendered DOM captured, screenshots captured, no raw fallback
  - reliability diagnostics present (`CAPTURE_JOB_COMPLETED_PARTIAL`, `RENDERED_CAPTURE_TIMEOUT` in diagnostics stream)

### Forced degraded fallback check
- URL: `https://nazrob.si` with intentionally unavailable worker client.
- Result:
  - `sourceMode=raw_html_fallback`
  - capture job status `failed_terminal`
  - failure class `unsupported_environment`
  - clear reason taxonomy preserved in diagnostics (`CAPTURE_JOB_FAILED_TERMINAL`, `CAPTURE_WORKER_UNAVAILABLE`, `RAW_HTML_FALLBACK_USED`)

## 8. Limitations
- Queue is file-backed and local to snapshot execution context; it is intentionally minimal and not a distributed scheduler.
- Phase uses bounded immediate execution + deterministic retries; no long-lived async daemon is introduced in this phase.
- Worker health truth is persisted per execution context and does not yet aggregate fleet-wide telemetry.

## 9. Next-step recommendation
- Proceed to **Import Fidelity Hardening (Part 4.6: Capture-Driven Design Quality Lift)** now that reliability truth and deterministic capture execution are in place.

## Explicit non-goals in this phase
- multi-page capture
- OCR
- screenshot semantic segmentation
- billing/subscription gating
- enterprise autoscaling platform work beyond current minimum reliability layer
