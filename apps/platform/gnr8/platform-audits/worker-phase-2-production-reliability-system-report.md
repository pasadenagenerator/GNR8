# Worker Phase 2: Production Reliability System Report

## 1. Reliability goals
- Make rendered capture execution deterministic, bounded, retry-aware, and truthfully diagnosable.
- Persist capture lifecycle/health state so fallback reasons are explicit and inspectable.
- Keep fallback safe while making root cause clear (timeout, transient failure, terminal failure, pending/unhealthy worker).

## 2. Chosen queue/execution model
- Model: bounded immediate execution over a persisted queue/job record.
- Scoped URL import flow:
1. Build worker request.
2. Submit file-backed job (`queued`) into `rendered-capture-jobs/jobs/<jobId>.json`.
3. Run bounded job execution with max attempts and per-attempt timeout budget.
4. Persist worker health truth in `rendered-capture-jobs/worker-health.json`.
5. Attach job/health truth to snapshot + acquisition evidence + runtime provenance.
- This is intentionally a minimal reliability layer, not a distributed scheduler.

## 3. Job lifecycle
- Statuses implemented:
  - `queued`
  - `running`
  - `completed`
  - `completed_partial`
  - `failed_transient`
  - `failed_terminal`
  - `timed_out`
  - `cancelled`
- Persisted fields include:
  - correlation ids (import/site/snapshot/source URL)
  - attempt records (attempt number, timestamps, status, failure class/code, retryable)
  - timeout budget and max attempts
  - final failure class/code
  - result summary
  - worker diagnostics
  - artifact refs

## 4. Retry/timeout rules
- Deterministic bounded policy:
  - `maxAttempts = 2`
  - `waitBudgetMs = 40_000`
  - per-attempt timeout = min(job timeout budget, remaining wait budget), floor 1000ms
- Retry behavior:
  - retry transient worker transport/unreachable failures
  - retry transient navigation/page failures when worker marks retryable
  - retry retryable `unsupported` worker responses (fixed in this pass)
- Terminal behavior:
  - non-retryable unsupported environment => `failed_terminal`
  - timeout => `timed_out`

## 5. Persistence model
- Durable reliability state:
  - `rendered-capture-jobs/jobs/<jobId>.json`
  - `rendered-capture-jobs/worker-health.json`
- Durable evidence:
  - `acquisition-evidence.json` now carries job, worker health, and explicit fallback reason
  - `rendered-capture.json` remains persisted
  - snapshot return model includes `renderedCaptureReliability`
  - scoped import provenance includes `captureJob` and `workerHealth`

## 6. Provenance/UI truth
- Worker health truth includes:
  - `enabled`
  - `reachable`
  - `browserAvailable`
  - `queueHealthy`
  - `lastSuccessAt`
  - `lastFailureAt`
  - `lastFailureClass`
  - `lastFailureCode`
- Fallback reason taxonomy is explicitly persisted/diagnosed (for worker path):
  - `worker_disabled`
  - `capture_timed_out`
  - `capture_failed_terminal`
  - `capture_failed_transient`
  - `capture_pending_or_not_completed`
  - `worker_unhealthy`
  - `rendered_capture_unusable`

## 7. Manual validation results
- Manual deploy/import validation for:
  - `nazrob.si`
  - `polar.sh`
  - `servis-chs.generator.live`
- Status in this environment: **not executed** (no deployment target + restricted network/runtime context for live import verification in this task run).

## 8. Limitations
- Queue is file-backed and local to execution context (not distributed/multi-worker coordinated).
- Execution model is bounded immediate attempt + deterministic retry; no long-running external queue daemon yet.
- Fleet-wide telemetry/dashboarding remains out of scope.

## 9. Next-step recommendation
- Proceed to **Import Fidelity Hardening (Part 4.6: Capture-Driven Design Quality Lift)**.

## Explicit non-goals in this phase
- multi-page capture
- OCR
- screenshot semantic segmentation
- billing/subscription gating
- enterprise autoscaling platform work beyond minimum current reliability needs
