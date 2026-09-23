# GNR8 Airship Worker Auth, Lease, Heartbeat, and Signed Editor Gateway Design

Date: 2026-09-23
Status: `airship_adapter_worker_auth_lease_heartbeat_gateway_design_recorded`

## Purpose

ADAPTER 20 records the security and lifecycle layer required before any real online Airship remote builder worker can be launched.

Production online editing remains disabled. The local proof flow remains available. No real worker infrastructure, Airship CLI, sidecar process, publish, live pointer, demo host, DNS, provider, billing, env, source-capture, rollback, dry-run, shadow-publish, or preview-host binding mutation is enabled by this adapter.

## Worker Auth Approach

Workers are identified by an allowlisted `AirshipOnlineBuilderWorkerIdentity` record. The worker readback includes:

- worker id and display name
- allowlist/status
- deployment mode
- contract version
- capability list
- worker image / Airship CLI / adapter version readback
- registration, rotation, and last-auth timestamps

The selected auth shape is bearer-token authentication with hashed token storage. The plaintext worker token is only accepted at the request boundary. Repository storage holds `AirshipOnlineBuilderWorkerAuthTokenMetadata` with token id, hash, status, audience, issue/expiry timestamps, rotation metadata, and last-used timestamp.

The design also defines HMAC-SHA256 signed worker requests with timestamp and nonce fields for replay protection. The control plane can reject stale timestamps and repeated nonces before processing a worker-originated request.

Audit event names are typed for `worker_auth_success` and `worker_auth_failure`.

## Lease Lifecycle

Online sessions must acquire an explicit worker lease before real execution. A lease binds:

- opaque online session id
- worker id
- lease token hash
- active/released/expired/failed state
- heartbeat timestamp
- TTL expiry
- acquisition/release timestamps

Lease helpers cover acquire, renew, release, and stale-heartbeat reclaim. Lease acquisition enforces:

- allowlisted active worker
- session state eligibility
- one active lease per session
- max concurrent sessions per worker
- max concurrent sessions per operator
- max concurrent sessions per site
- max concurrent sessions per migration

Blocked lease reasons are typed so the control plane can distinguish worker capacity, operator capacity, site capacity, migration capacity, disabled workers, and already leased sessions.

## Heartbeat And Reclaim Rules

Worker heartbeat requests report:

- worker status
- active sessions
- process health summary
- cleanup health summary
- capabilities and deployment mode

The default heartbeat policy is a 30-second interval with a 90-second stale threshold. Stale workers and stale leases can be reclaimed by comparing the latest heartbeat timestamp to the configured threshold.

Heartbeat records and audit metadata are type-only/in-memory in this adapter. They are intentionally ready for a future durable repository without adding a database migration now.

## Signed Editor Gateway

Operators must not receive a public unauthenticated worker/Airship URL. The control plane mints a short-lived signed gateway token and returns a gateway URL only after lifecycle gates pass.

Editor token claims include:

- token id
- opaque session id
- requested operator user id
- owner organization id
- migration id
- site key
- allowed origin
- one-session editor scope
- issue and expiry timestamps

Verification rejects invalid, expired, wrong-owner, wrong-session, wrong-origin, wrong-migration, and wrong-site tokens. Token metadata is stored by hash, not plaintext token.

## Control Plane Gate

The online builder control plane now refuses create/open/capture/stop unless all three security lifecycle components are configured:

- worker auth
- lease manager
- signed editor gateway

The fake worker path still exists for tests, but it must be paired with explicit fake/test security lifecycle config. Fake mode returns a signed fake gateway URL rather than the worker URL.

## Repository Boundary

The repository boundary now includes in-memory repositories for:

- worker records
- worker auth token metadata
- worker leases
- worker heartbeat status
- signed editor gateway token metadata
- audit events

No database migration was added. The boundary remains type/in-memory only until a later adapter explicitly introduces durable storage.

## Why This Comes Before Real Worker Launch

Real remote workers would otherwise create an unauthenticated path to a browser-editable workspace. Before launch, GNR8 needs a clear answer for who the worker is, what it can do, who owns a session, when a session expires, whether the worker is still alive, how abandoned sessions are reclaimed, and how the operator reaches the editor without exposing a public Airship URL.

ADAPTER 20 answers those questions without turning on production execution.

## Recommended Next Task

ADAPTER 21 should add a durable repository migration and a private internal worker heartbeat/auth endpoint behind the typed ADAPTER 20 boundary, still without launching real remote workers by default.
