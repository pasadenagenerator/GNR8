Status: `airship_adapter_local_sidecar_process_ownership_spike_recorded`

# GNR8 Airship Local Sidecar Process Ownership Spike

ADAPTER 15 adds a local/proof-only process ownership manager for the real Airship sidecar path.

The implementation lives in:

- `apps/platform/gnr8/airship/proof-session/airship-local-sidecar-process-manager.ts`
- `apps/platform/gnr8/airship/proof-session/airship-local-sidecar-process-manager.test.ts`

## What Process Ownership Means

Process ownership means GNR8 may stop only child processes that were started by this manager instance and are still present in its in-memory ownership map. A matching port is not ownership. A matching URL is not ownership. A process record posted back by a browser or copied from a terminal is not ownership.

The manager records:

- workspace path
- static target URL and Airship session URL
- static/Airship ports
- child process ids
- process status
- health check result
- ownership flag and opaque ownership token
- cleanup result

If a process is manual or external, the manager reports `not-owned` and returns manual cleanup instructions. It does not kill by port.

## Workspace Contract

The manager validates the prepared proof workspace before launch:

- source-backed `index.html`
- `package.json` with package metadata
- `.git` directory
- baseline `HEAD` commit
- clean initial `git status --short`

This preserves the Airship writeback parity contract from the prior proof work.

## Local Only

This spike is not deployable public behavior and is not for Vercel/serverless runtime use. A deployed Vercel function cannot reliably own local operator processes on a developer workstation because the child process, localhost ports, and filesystem workspace exist on the machine that started them, not in the deployed request environment. Serverless lifetimes also do not provide durable process supervision.

The manager is therefore service-only for local proof use. It does not:

- apply drafts
- generate previews
- generate artifacts
- publish
- mutate live pointers
- mutate DNS/provider/source-capture/customer-domain/billing/env state
- kill processes not started by this manager

## Real Airship CLI

The real CLI command shape remains:

```sh
pnpm dlx @airshiplabs/cli --target <staticPort> --port <airshipPort> --host 127.0.0.1 --agent codex --safe --cwd <workspace> --mode canvas
```

The manager can launch that command only through an explicit `startRealAirshipCli: true` local path. Automated tests do not run the real CLI because `pnpm dlx` may require network/approval and would be unsafe as a default test dependency. Tests use a controllable local HTTP fixture process for the Airship-like sidecar while using the real owned static target server path.

## Future UI Enablement

This enables future UI buttons by defining the server-side ownership contract that `Start Airship session`, `Open Airship editor`, and `Stop Airship session` need. ADAPTER 16 should add a durable local proof session owner or a same-process local-only route store before wiring these buttons. The current proof panel remains command/readback driven, because browser-posted process records are not sufficient authority to stop local processes.

ADAPTER 16 remains:

- durable local proof session records
- safe local-only route actions for start/status/stop
- UI state for owned versus not-owned sessions
- open editor button enabled only after owned Airship health is healthy
- stop button enabled only for manager-owned sessions
