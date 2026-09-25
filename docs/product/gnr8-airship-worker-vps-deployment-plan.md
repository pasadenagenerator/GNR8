# GNR8 Airship Worker VPS Deployment Plan

Date: 2026-09-25
Status: `airship_worker_vps_deployment_plan_and_service_scaffold_recorded`

## Verdict

The first production-like Airship runtime should be a separate `airship-builder-worker` service on a controlled VPS. GNR8/Vercel remains the control plane for UI, auth, durable session records, worker auth, leases, signed editor gateway, capture persistence, mapping, draft apply, preview generation, and audit.

This task adds only a cold worker scaffold. It does not start Airship sessions, launch target servers, expose public editor URLs, publish, mutate live pointers, mutate DNS/provider/customer-domain/billing/source-capture paths, or replace the current renderer.

## VPS MVP Profile

- Ubuntu 24.04 LTS
- 4 dedicated vCPU
- 8 GB RAM
- 200 GB NVMe
- Docker Engine with Compose plugin
- Reverse proxy later: Caddy or Nginx, with TLS terminating before the worker
- Initial concurrency: 1 active session
- Workspace root: `/srv/gnr8-airship/sessions`
- Worker process: low-privilege container user

## Scaffold Added

- `apps/airship-builder-worker`: standalone Node 22 worker service
- `GET /v1/health` and `GET /health`: health/config/capacity readback
- `/v1/airship/sessions*`: explicit `501 not_implemented` scaffold routes
- Dockerfile requiring an explicit pinned `AIRSHIP_CLI_VERSION` build arg
- Compose template binding the worker to loopback only
- `.env.example` for VPS bootstrap

The health endpoint reports contract version, worker id, Airship CLI version readback, capacity, workspace root status, and safety boundaries.

## VPS Bootstrap Checklist

1. Create a non-root deploy user with SSH key access.
2. Enable firewall rules for SSH and proxy ports only.
3. Install Docker Engine and the Compose plugin.
4. Create `/srv/gnr8-airship/sessions`.
5. Copy `apps/airship-builder-worker/deploy/vps/docker-compose.yml` and an `.env` based on `apps/airship-builder-worker/.env.example`.
6. Set an explicit `GNR8_AIRSHIP_CLI_VERSION`; do not use a floating version.
7. Build and start the worker with Compose.
8. Verify `GET http://127.0.0.1:3002/v1/health` locally on the VPS.
9. Add proxy/TLS only after private health is stable.
10. Register the worker identity and hashed auth token in GNR8 durable records in a later scoped task.

## Not Yet Implemented

- Worker bearer/HMAC calls to the GNR8 control plane
- Lease acquisition and heartbeat loop
- Workspace materialization
- Git baseline creation
- Astro dev server startup on `127.0.0.1:4321`
- Airship CLI process supervisor
- Signed editor gateway/proxy routing
- Capture diff, logs, snapshots, cleanup sweeper

## Next Task

`GNR8 - AIRSHIP WORKER VPS 02 - VPS Bootstrap And Worker Health Check`

Scope:

- provision the VPS with Docker/proxy/firewall
- deploy this cold scaffold with a pinned Airship CLI version
- verify private health locally and through the intended private/control-plane path
- do not start Airship sessions
- do not publish, mutate live pointers, mutate DNS/provider/customer-domain/billing/source-capture paths, or expose public editor URLs
