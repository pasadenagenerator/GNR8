# GNR8 Airship Durable Repository and Private Worker Auth/Heartbeat

Status: `airship_adapter_durable_repository_private_worker_auth_heartbeat_recorded`

ADAPTER 21 moves the online Airship builder control-plane model from in-memory proof storage toward durable persistence and adds private worker endpoint skeletons. Production online editing remains disabled unless the required worker auth, lease manager, signed editor gateway, durable repository, and real worker deployment are explicitly configured.

No real Airship worker, Airship CLI, sidecar process, target server, publish, live pointer mutation, demo host mutation, DNS/provider/billing change, source capture, rollback, dry-run, shadow-publish, preview-host binding mutation, or public editor URL is enabled by this adapter.

## Durable Repository Shape

The migration `apps/platform/supabase/migrations/20260923120000_airship_online_builder_durable_records.sql` adds one compact JSONB-backed table:

- `public.gnr8_airship_online_builder_records`

The table stores typed control-plane records using `record_kind`, `record_key`, indexed `session_id`, `worker_id`, `token_hash`, `state`, and `status` columns plus `payload_json`.

Supported record kinds:

- online Airship session records
- worker identity records
- worker auth token metadata with token hashes only
- worker lease records
- worker heartbeat snapshots
- signed editor gateway token metadata with token hashes only
- workspace snapshots
- captured diffs
- mapping readbacks
- draft apply readbacks
- generated preview readbacks
- audit events

The migration keeps RLS forced and revokes client roles. It also blocks obvious plaintext worker/editor token shapes such as `aobw_`, `aobe_`, authorization bearer strings, and plaintext token fields from JSON payloads.

## Repository Implementation

`AirshipOnlineBuilderPostgresRepository` implements the ADAPTER 19/20 repository boundary for:

- create/get/update/list-expired/mark-expired sessions
- append/list audit events
- create/get/update worker records
- store worker auth token metadata hashes and last-used timestamps
- acquire/renew/release/reclaim leases through repository persistence
- record and read heartbeat snapshots
- create/read/verify/revoke signed editor gateway token metadata
- store online-builder readbacks for snapshots, diffs, mappings, draft apply, and generated preview

The existing in-memory repository remains available for local proof flow and tests.

## Private Worker Endpoint Contract

Private internal endpoints were added under:

- `/api/internal/gnr8/airship/online-builder/worker-auth`
- `/api/internal/gnr8/airship/online-builder/heartbeat`
- `/api/internal/gnr8/airship/online-builder/leases`
- `/api/internal/gnr8/airship/online-builder/health`

They require worker bearer auth against stored token hashes. When `GNR8_AIRSHIP_ONLINE_BUILDER_WORKER_SIGNING_SECRET` is configured, requests must also include HMAC timestamp/nonce headers and are checked for expiry/replay.

The endpoints append audit events, update worker last-authenticated metadata, record heartbeat snapshots, renew/release lease state, and provide worker health readbacks. They do not call Airship, launch workers, start processes, or expose public unauthenticated editor URLs.

## Control-Plane Readbacks

The security lifecycle readback now includes:

- durable repository configured/not configured
- worker auth configured/not configured
- lease manager configured/not configured
- heartbeat status and last worker seen
- signed editor gateway configured/not configured
- fake test mode state

The UI remains disabled/no-config by default and shows durable repository, worker auth endpoint, heartbeat, lease manager, and signed gateway as not configured. Local proof flow remains available.

## Deployment Recommendation

The GNR8 Vercel app should remain the control plane and UI. Real Airship runtime sessions should not run on Vercel serverless.

The preferred production direction is a separate long-running `airship-builder-worker` service that owns:

- filesystem workspace
- target server process
- Airship CLI sidecar process
- ports and session URL
- health and heartbeat
- cleanup

The existing `gnr8-worker` may later orchestrate jobs or queues if useful, but real Airship runtime/session ownership should not be merged into it unless that worker is explicitly designed for long-running process ownership.

## Still Disabled

- no production route can launch an Airship worker
- no public editor URL is exposed
- no plaintext worker/editor token storage
- create/open/capture/stop stay superadmin-gated and security-lifecycle-gated
- local proof flow is unchanged

## Next Task Recommendation

ADAPTER 22 should add an explicit operator-only provisioning/readiness screen for durable repository and worker security configuration, then decide how the separate `airship-builder-worker` service receives allowlisted worker identity, token rotation, and lease acquisition without introducing public editor exposure.
