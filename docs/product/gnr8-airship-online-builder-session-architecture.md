# GNR8 Airship Online Builder Session Architecture

Date: 2026-09-22
Status: `airship_adapter_online_builder_session_architecture_recorded`

## Verdict

ADAPTER 17 records the architecture for a future fully online GNR8 Airship editing flow.

The local proof is valid, but the production shape cannot be "Vercel function starts Airship". Real Airship needs a source-backed filesystem workspace, a running target server, an Airship sidecar/proxy process, writable source files, and durable lifecycle control. Those belong in a remote builder worker that GNR8 controls through a narrow authenticated contract.

The recommended path is:

1. GNR8 creates a durable online Airship session record.
2. A remote worker leases that session.
3. The worker materializes a temporary source-backed workspace from the selected migration/draft.
4. The worker starts a local target server and the real Airship CLI sidecar.
5. GNR8 exposes only a signed, short-lived editor URL to the superadmin operator.
6. The operator edits in Airship.
7. GNR8 asks the worker to capture source diffs.
8. GNR8 reuses the ADAPTER 07 mapper, ADAPTER 08 draft apply service, and ADAPTER 12 preview generation bridge.
9. The worker stops processes and deletes the workspace.

This document does not launch infrastructure, add production routes, publish, mutate live pointers, mutate preview-host bindings, change DNS, change provider state, touch billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, or remove the local proof flow.

## Operator Flow

From `https://app.pasadenagenerator.com/`, a superadmin operator should eventually see this explicit sequence:

1. `Create online Airship session`
2. session status moves from `requested` to `provisioning` to `ready`
3. `Open Airship editor`
4. Airship editor opens in a browser against a real worker-hosted sidecar URL
5. operator edits CHS/ARIS source-backed content
6. `Finish editing / capture changes`
7. `Map captured edits`
8. `Apply safe mappings to draft`
9. `Generate internal preview`
10. `Open corrected preview`
11. session stops or expires

Only the explicit draft apply step may mutate GNR8 draft data. Preview generation creates an internal draft candidate preview only. It must not publish, promote, mutate active/live pointers, mutate DNS, mutate provider bindings, or update demo/preview-host bindings.

## Remote Builder Worker Model

The worker should run outside the public Vercel serverless app as a long-lived process or short-lived container with process supervision. It owns the filesystem workspace, target server process, Airship CLI sidecar process, port allocation, health checks, diff capture, and cleanup.

Provisioning steps:

1. Acquire a worker lease for an eligible `online_airship_session`.
2. Create an isolated temporary workspace such as `/srv/gnr8-airship/sessions/<opaque-session-id>/workspace`.
3. Materialize the selected source-backed artifact into that workspace.
4. Write package metadata, Airship config, a manifest, and source files with stable section/element markers.
5. Initialize a git repository or snapshot manifest for baseline diffing.
6. Start the static/dev target server bound to loopback inside the worker environment.
7. Start `@airshiplabs/cli` against that target and bind the Airship sidecar to an internal/private interface.
8. Wait for target and sidecar health to pass.
9. Mint a short-lived editor URL through a GNR8-controlled gateway or worker edge proxy.
10. Report `ready` with process ids, ports, health readback, workspace hash, and editor URL expiry.

Capture steps:

1. GNR8 sends a `capture diff` request for a session owned by the current operator.
2. Worker stops accepting new editor URL mints and flushes pending source writes if Airship exposes a flush signal.
3. Worker computes changed files against the baseline snapshot.
4. Worker returns normalized file hashes and unified diffs for allowed paths only.
5. GNR8 persists the captured diff and runs the mapper on the GNR8 side.

Cleanup steps:

1. Stop Airship sidecar process gracefully.
2. Stop target server process gracefully.
3. Kill only worker-owned child processes after grace timeout.
4. Remove workspace directory.
5. Release lease.
6. Mark session `stopped`, `expired`, or `failed` with cleanup readback.

The worker must never kill by arbitrary port or trust browser-posted process records. Ownership is established only by the worker lease and child process table.

## GNR8 App Integration

GNR8 remains the control plane and source of truth:

- `Create online Airship session`: superadmin-only action that records a requested session and asks the worker fleet to provision it.
- session status/readback endpoint: returns durable state, health, errors, next action, and URLs when available.
- `Open Airship editor`: reads a short-lived editor URL. It should mint a new URL when the session is still ready but the previous URL expired.
- `Finish editing / capture changes`: asks the worker to capture diffs and transitions through `capture_requested` to `captured`.
- `Map captured edits`: uses the ADAPTER 07 captured diff mapper against persisted captured diff content.
- `Apply safe mappings to draft`: uses ADAPTER 08, requires explicit operator confirmation, and applies only exact safe mappings to the current draft after stale-version checks.
- `Generate internal preview`: uses the ADAPTER 12 preview generation bridge from the applied draft.
- `Open corrected preview`: opens the generated internal preview URL readback, not a public live site pointer.

The online flow should coexist with the current local proof flow. The existing GNR8-native editor route can remain a fallback/control surface while the remote Airship editor becomes an explicit adapter action.

## Session Lifecycle

Required states:

- `requested`: GNR8 accepted the operator action and persisted the session request.
- `provisioning`: a worker lease exists and workspace/process startup is in progress.
- `ready`: target server and Airship sidecar are healthy, editor URL can be minted.
- `editor_opened`: operator opened a valid editor URL.
- `capture_requested`: operator asked to finish editing and capture diffs.
- `captured`: worker returned a captured diff bundle.
- `mapped`: GNR8 mapped captured edits into exact/probable/unsupported draft candidates.
- `applied_to_draft`: confirmed safe mappings were written to the saved GNR8 draft.
- `preview_generated`: internal preview was generated from the applied draft.
- `stopping`: stop/cleanup is in progress.
- `stopped`: processes are stopped and workspace cleanup succeeded or was safely completed.
- `expired`: TTL elapsed before normal completion; worker should cleanup.
- `failed`: provisioning, editor, capture, mapping, apply, preview, or cleanup failed.

State transitions must be monotonic except that recoverable failures may move from `failed` to `stopping` for cleanup readback. A session should have one active worker lease at a time.

## Security Model

Access control:

- superadmin-only in GNR8 for create/status/open/capture/map/apply/preview/stop actions
- session ownership checked against the requesting user and organization context
- allowed migration/site allowlist, initially CHS only, then ARIS after parity fixes
- explicit draft id/version expected during map/apply

Session identity:

- opaque session ids, not sequential ids
- signed editor tokens with short TTL
- one editor token scoped to one session, one actor, one allowed origin, one operation window
- no public unauthenticated Airship URL

Request protection:

- CSRF validation on browser actions
- strict origin checks for app actions and editor gateway calls
- service-to-worker authentication through mTLS, signed JWT, or HMAC request signing
- idempotency keys for create, capture, apply, preview, and stop
- rate limits per superadmin, migration, and organization
- concurrency limits per worker and per migration

Isolation:

- one workspace per session
- no shared writable source directory between sessions
- worker runs Airship as a low-privilege user
- filesystem allowlist for capture and cleanup
- egress restrictions where practical
- secrets injected through the worker runtime, never written to source workspace
- logs redact tokens, signed URLs, env values, source snapshots if marked sensitive

Audit events:

- session requested
- lease acquired
- workspace materialized
- target server started
- Airship sidecar started
- editor URL minted
- editor opened
- capture requested
- diff captured
- mapping generated
- mappings applied to draft
- preview generated
- stop requested
- cleanup completed
- session expired
- session failed

Cleanup guarantees:

- TTL sweeper marks stale sessions expired
- worker startup registers cleanup hooks
- lease heartbeat expiry allows another cleanup worker to reclaim a dead session
- cleanup failure is audited and retried, but never grants public editor access

## Minimal Data Model

`online_airship_sessions`

- `id`
- `opaque_session_id`
- `state`
- `migration_id`
- `site_key`
- `allowed_edit_scope`
- `requested_by_user_id`
- `owner_organization_id`
- `expected_draft_id`
- `expected_draft_version`
- `editor_url_expires_at`
- `expires_at`
- `created_at`
- `updated_at`
- `last_error_code`
- `last_error_message`

`online_airship_worker_leases`

- `id`
- `session_id`
- `worker_id`
- `lease_token_hash`
- `state`
- `heartbeat_at`
- `expires_at`
- `acquired_at`
- `released_at`

`online_airship_workspace_snapshots`

- `id`
- `session_id`
- `snapshot_kind` (`baseline`, `capture`, `cleanup`)
- `workspace_hash`
- `source_manifest_json`
- `allowed_paths_json`
- `created_at`

`online_airship_captured_diffs`

- `id`
- `session_id`
- `capture_request_id`
- `baseline_snapshot_id`
- `capture_snapshot_id`
- `changed_file_count`
- `index_html_changed`
- `diff_bundle_json`
- `created_at`

`online_airship_mapping_readbacks`

- `id`
- `session_id`
- `captured_diff_id`
- `status`
- `safe_entry_count`
- `unsupported_entry_count`
- `mapping_json`
- `mapped_against_draft_id`
- `mapped_against_draft_version`
- `created_at`

`online_airship_draft_apply_readbacks`

- `id`
- `session_id`
- `mapping_readback_id`
- `status`
- `applied_count`
- `skipped_count`
- `draft_id_before`
- `draft_version_before`
- `draft_id_after`
- `draft_version_after`
- `readback_json`
- `created_at`

`online_airship_generated_preview_readbacks`

- `id`
- `session_id`
- `draft_apply_readback_id`
- `status`
- `site_version_id`
- `artifact_id`
- `internal_preview_url`
- `readback_json`
- `created_at`

`online_airship_audit_events`

- `id`
- `session_id`
- `actor_user_id`
- `event_type`
- `severity`
- `correlation_id`
- `idempotency_key`
- `metadata_json`
- `created_at`

## Worker API Contract

The worker API is internal only. Browser clients should call GNR8, and GNR8 should call the worker.

`POST /v1/airship/sessions`

Request:

```json
{
  "sessionId": "opaque-session-id",
  "migrationId": "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
  "siteKey": "chs",
  "sourceBundle": {
    "kind": "single-html-artifact",
    "files": [{ "path": "index.html", "sha256": "...", "contentsBase64": "..." }]
  },
  "expectedDraft": { "id": "draft-id", "version": 3 },
  "ttlSeconds": 1800,
  "idempotencyKey": "..."
}
```

Response:

```json
{
  "ok": true,
  "sessionId": "opaque-session-id",
  "state": "provisioning",
  "workerId": "worker-1",
  "leaseId": "lease-id",
  "statusUrl": "/v1/airship/sessions/opaque-session-id"
}
```

`GET /v1/airship/sessions/:sessionId`

Returns session state, process health, workspace snapshot hashes, editor URL expiry, last error, warnings, and next recommended action.

`POST /v1/airship/sessions/:sessionId/editor-url`

Returns a short-lived signed editor URL only if the session is `ready` or `editor_opened`, healthy, owned by the calling GNR8 session, and not expired.

`POST /v1/airship/sessions/:sessionId/capture`

Requests diff capture. Returns `capture_requested` immediately or `captured` if capture is synchronous and completed within the request budget.

`POST /v1/airship/sessions/:sessionId/stop`

Stops owned processes and starts cleanup. Returns `stopping`, then status later reports `stopped` or `failed`.

`POST /v1/airship/cleanup-expired`

Internal sweeper endpoint or queue handler. Stops expired sessions, reclaims dead leases, and reports cleanup results.

`GET /v1/health`

Reports worker identity, version, Airship CLI version, capacity, active lease count, and dependency health. It must not expose secrets or session URLs.

The minimal type skeleton for these records and API shapes lives in `apps/platform/gnr8/airship/online-builder/airship-online-builder-worker-contract.ts`.

## Runtime And Deployment Options

Long-running worker service on Fly.io/Render/Railway:

- Best first production-like shape.
- Supports warm Airship CLI cache, supervised child processes, worker health, logs, per-session workspace cleanup, and a private service URL.
- Matches the existing rendered-capture worker operating model better than Vercel-only.
- Needs capacity limits, queue/lease management, and hard cleanup sweeps.

Container task per session:

- Strong isolation and simple cleanup by destroying the task.
- Good for high-risk editing and future tenant isolation.
- Slower cold starts and more orchestration complexity.
- Higher per-session cost, but easier to reason about process ownership.

Internal VPS/VM worker:

- Simplest operational surface for an early controlled superadmin-only rollout.
- Full process control, persistent package cache, and straightforward debugging.
- Requires disciplined patching, monitoring, secret rotation, and manual capacity planning.

Local desktop companion fallback:

- Useful for development and emergency operator workflows.
- Preserves the local proof flow when cloud worker capacity is unavailable.
- Not self-serve for normal online use and not suitable as the primary production path.

Vercel serverless alone is insufficient because it does not provide a durable writable workspace, stable long-running child process supervision, reliable port ownership, browser-reachable sidecar process lifetime, or cleanup hooks that survive across requests. It can orchestrate, authorize, and persist state, but it should not host the Airship process itself.

## Airship CLI Packaging

The worker image should pin and preinstall `@airshiplabs/cli` rather than running `pnpm dlx` on every session.

Packaging rules:

- pin the exact CLI version in the worker image build
- record CLI version in worker health and every session readback
- keep a package-manager cache inside the image or runtime volume
- fail closed if the installed CLI version does not match the GNR8-supported contract
- do not fetch arbitrary packages during an operator session
- run the CLI under a low-privilege user with a per-session working directory
- store stdout/stderr as bounded, redacted logs
- expose only health summaries and relevant diagnostics to GNR8

Network/package risk is highest if the worker installs Airship at session time. Preinstalling reduces supply-chain variability, startup latency, and live npm availability risk.

## Diff-To-Draft Pipeline Reuse

Production online flow should reuse:

- ADAPTER 07 mapper: captured diff to exact/probable/unsupported draft mapping readback
- ADAPTER 08 apply service: confirmed safe mappings to saved draft with stale draft protection
- ADAPTER 12 preview generation bridge: explicit internal preview generation from the applied draft
- ADAPTER 15/16 process ownership lessons: worker owns only processes it started, and browser-provided process records are never authority

Proof-only elements that should not become production as-is:

- local temp workspace on the operator/Codex machine
- manual CLI commands as the only launch mechanism
- in-memory process ownership only
- CHS-only hardcoded proof artifact selection
- fixture sidecar used by tests

Production path:

- durable session records
- durable worker leases
- remote source-backed workspaces
- real Airship CLI sidecar
- signed editor URL gateway
- persisted captured diffs
- persisted mapping/apply/preview readbacks
- audited cleanup

## CHS/ARIS Rollout

Phase 1: CHS only

- allow only the known CHS migration id
- support text edits for headline, subheading/body, and CTA labels
- reject structure, CSS, script, marker removal, marker addition, and multi-file edits from auto-apply
- generate internal preview only after explicit apply

Phase 2: ARIS parity preparation

- fix ARIS source-backed workspace materialization parity
- add ARIS marker/draft field map
- run the same capture/map/apply/preview readbacks
- keep exact safe text edit scope

Phase 3: generalized migration support

- require source-backed workspace generation for each migration
- require marker coverage and draft field map validation before enabling online Airship
- add migration-level allowlist and capability readback
- expand supported edits only after mapper/apply services understand them safely

Explicit initial limits:

- no structural auto-apply
- no arbitrary CSS/script auto-apply
- no media upload writeback
- no route tree changes
- no publish/promotion/live pointer mutation
- no DNS/provider/customer-domain mutation

## Failure Modes

Worker cannot provision:

- state: `failed`
- readback: worker unavailable, capacity exceeded, invalid source bundle, or lease acquisition failure
- recovery: retry create or choose local companion fallback

Airship CLI fails:

- state: `failed` or `stopping`
- readback: CLI exit code, sanitized stderr, installed CLI version
- recovery: stop session, inspect logs, retry after packaging/config fix

Editor URL expires:

- state remains `ready` or `editor_opened` if process health is valid
- recovery: mint a new editor URL

No file changes captured:

- state: `captured`
- readback: changed file count zero, next action to reopen editor or stop
- recovery: no draft apply

Unsupported edits captured:

- state: `mapped`
- readback: unsupported entries with reasons
- recovery: operator manually reviews or edits through supported draft controls

Stale draft version:

- state remains `mapped` or moves to failed apply readback
- recovery: refresh draft, rerun mapping against current draft, then confirm apply

Preview generation fails:

- state: `applied_to_draft` with failed preview readback
- recovery: retry preview generation; draft changes remain saved

Cleanup fails:

- state: `failed` or `expired`
- readback: cleanup diagnostics without exposing paths/tokens publicly
- recovery: sweeper retries, operator cannot open editor URL

Worker crashes mid-session:

- lease heartbeat expires
- session becomes `expired` or `failed`
- cleanup worker reclaims workspace/processes when possible
- editor URLs stop validating
- GNR8 preserves last durable readback and captured diff if one was already persisted

## Recommended Next Task

`GNR8 - AIRSHIP ADAPTER 18 - REMOTE WORKER CONTRACT SKELETON`

Scope:

- add durable session and worker lease service interfaces
- add no-op/in-memory contract tests for state transitions
- add route-handler skeletons that do not start workers
- add UI readback placeholders for `Create online Airship session`, status, and disabled/open editor states
- keep all launch behavior behind unimplemented worker client interfaces

The next task should still avoid publishing, live pointer mutation, demo/preview-host binding mutation, DNS/provider/billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, and real remote infrastructure launch.
