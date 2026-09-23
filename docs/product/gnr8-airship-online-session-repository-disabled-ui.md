# GNR8 Airship Online Session Repository + Disabled UI Readback

Date: 2026-09-22
Status: `airship_adapter_online_session_repository_disabled_ui_recorded`

## What Exists Now

ADAPTER 19 adds the first persistence-shaped online Airship session layer without enabling production online editing.

- `AirshipOnlineBuilderRepositoryBoundary` now has an in-memory implementation for session records, worker leases, workspace snapshots, captured diffs, mapping readbacks, draft-apply readbacks, generated-preview readbacks, audit events, and expired-session listing/marking.
- The online builder control plane creates a requested session record before a worker launch would occur.
- Without a worker client, the control plane marks the requested session failed and returns a structured disabled readback with `not_configured` / `remote_worker_not_configured`.
- With the fake worker client, create/status/open/capture/stop persist typed session state, worker lease, captured diff metadata, and audit events.
- Route helpers accept the Adapter 19 action names: `create_online_airship_session`, `get_online_airship_session_status`, `open_online_airship_editor`, `capture_online_airship_changes`, and `stop_online_airship_session`.
- No production `route.ts` was added.

## Disabled UI Readback

The Airship single-site superadmin surface now includes an `Online Airship session` section separate from the local proof panel.

It displays:

- status `not configured`
- `Remote builder worker is not connected yet. Local proof flow remains available.`
- disabled controls for create, open, capture, and stop
- compact disabled reasons: worker not configured, no signed editor gateway yet, no remote worker lease yet
- a link to the current local proof flow

The copy states that online mode is planned but not active, no live site changes happen there, and draft apply / preview generation remain separate confirmed steps. The existing local proof flow is unchanged.

## Safety Boundary

ADAPTER 19 does not launch remote infrastructure, call the real Airship CLI, start local sidecars, publish, mutate live pointers, mutate demo or preview-host bindings, touch DNS/provider/billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, or add database migrations.

The only executable worker path remains the deterministic fake worker used by focused tests.

## Still Blocked

- worker authentication and request signing
- durable DB-backed repository and migrations
- worker lease acquisition/heartbeat/reclaim semantics
- remote workspace materialization and cleanup
- signed editor gateway or private worker proxy
- production route exposure behind explicit no-launch config
- confirmed mapping-to-draft and preview-generation bridges for the online flow

## Recommended ADAPTER 20

Design and implement worker authentication plus lease semantics first: signed control-plane-to-worker requests, lease acquire/heartbeat/release/reclaim behavior, TTL cleanup rules, and tests proving that an expired or unleased session cannot mint an editor URL.
