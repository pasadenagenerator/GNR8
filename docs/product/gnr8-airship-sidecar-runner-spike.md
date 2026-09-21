# GNR8 Airship Sidecar Runner Spike

Date: 2026-09-21
Status: `airship_adapter_local_sidecar_runner_spike_recorded`

## Summary

This spike adds a local-only proof runner for testing real Airship against a GNR8-generated artifact-style page without wiring anything into production routes or mutating live state.

Runner:

- `apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts`

Verdict: **partially feasible**.

The runner can materialize and serve a CHS polished-artifact-derived HTML fixture from `127.0.0.1` and print the real Airship commands needed to target it. Real Airship was **not** launched in this task because that would require downloading/running `@airshiplabs/cli` with `pnpm dlx` and starting an external sidecar process. No package install, source capture, publish, active pointer mutation, DNS/provider/billing/env mutation, or customer-domain change occurred.

## Local Runner

Run the proof target server:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts
```

Run a bounded smoke check that starts, reads back, and stops:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --smoke
```

Optional fixed port and workspace:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --port 4178 --workspace /tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Expected URLs when `--port 4178` is used:

- Target page: `http://127.0.0.1:4178/`
- Health: `http://127.0.0.1:4178/__gnr8_airship_sidecar_spike/health`
- Readback: `http://127.0.0.1:4178/__gnr8_airship_sidecar_spike/readback`

The runner writes `index.html` and a minimal `package.json` into the disposable workspace. It does not launch Airship, install packages, initialize Git, or write outside the chosen proof workspace.

## Observed Runner Readback

Smoke command executed:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --smoke
```

Observed target URL during smoke run:

- `http://127.0.0.1:63973/`

Observed readback:

- Target page returned HTTP `200`.
- Health endpoint returned HTTP `200`.
- Readback endpoint returned HTTP `200`.
- Fixture size: `11968` bytes.
- Fixture SHA-256: `3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9`.
- The served fixture includes `data-airship-section` / `data-airship-element` markers.
- The smoke server stopped before task completion.

## Airship CLI Command

Upstream Airship docs describe `@airshiplabs/cli` as a CLI/proxy in front of a running dev server. The documented target shape is a **port**, not a full target URL:

- Quick start: `npx @airshiplabs/cli --target 3000`
- Installed binary: `airship --target 3000`
- Codex sandbox shape: `airship --target 3000 --agent codex --safe`
- Proxy port: `--port`, defaulting to `target + 1`
- Project root for edits: `--cwd`
- Safe preflight: `airship doctor --target <port> --agent codex --json`

Sources:

- [0xnyn/airship README](https://github.com/0xnyn/airship)
- [Airship package/root metadata](https://github.com/0xnyn/airship/blob/main/package.json)

For a fixed local runner on port `4178`, use:

```bash
pnpm dlx @airshiplabs/cli doctor --target 4178 --agent codex --json --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Then launch the sidecar manually:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site --mode canvas
```

Expected Airship proxy URL:

- `http://127.0.0.1:4179/`

For an ephemeral runner port, copy the exact commands printed by the runner.

## Expected Airship Session Behavior

Expected if Airship is launched manually:

- Airship should proxy the local proof target because upstream says it works with anything that serves HTML over HTTP.
- The Airship visual editor should open on the configured proxy port.
- Viewing/inspection is likely feasible because the CHS fixture is ordinary static HTML.
- Useful source editing is unproven. Airship is source/dev-server oriented and tries to map selected DOM back to local files under `--cwd`; a single static `index.html` may be enough for simple edits, but this needs a real sidecar run.

## Static Artifact Fit

Can Airship target static artifact HTML?

- **Likely yes for viewing/inspection**, when the artifact is served from a local HTTP port.
- **Partially proven locally**, because the runner serves a CHS-derived artifact page and readback endpoint successfully.
- **Not yet proven for useful edits**, because Airship itself was not launched.

Does Airship require source-backed files?

- For real editing, likely yes. Upstream describes changes landing in source and `--cwd` resolving project files.
- This runner gives Airship a local source-backed `index.html`, not an opaque DB artifact or remote preview URL.
- A remote GNR8 preview URL without local files would likely be view-only or weak for capture.

## Capture Feasibility

No first-class GNR8-capturable Airship export callback was found in upstream docs.

Potential capture paths:

- Source patch/diff: feasible if the disposable workspace is a Git repo and Airship modifies files.
- DOM changes: unknown; no documented stable host-app event stream found.
- CSS changes: likely visible as source diffs if Airship edits inline CSS or local CSS files.
- Saved files: feasible by snapshotting `index.html` and other files before/after the Airship session.
- Websocket events: unknown/not documented as a stable integration API.
- Generated artifacts: feasible later by re-reading edited local files and re-materializing a GNR8 runtime artifact in a separate guarded workflow.
- Command transcript: feasible by capturing the Airship process output when GNR8 owns a managed sidecar process.

Recommended capture baseline for the next proof:

1. Start the runner with `--workspace /tmp/gnr8-airship-sidecar-runner-spike/static-site --port 4178`.
2. Initialize a local Git repo inside that disposable workspace.
3. Run `airship doctor`.
4. Launch Airship with `--agent codex --safe`.
5. Make one benign copy edit.
6. Stop Airship and the runner.
7. Capture `git diff -- index.html` plus a post-edit SHA-256/readback.

## Blockers And Risks

- Running real Airship requires `pnpm dlx @airshiplabs/cli`, which downloads/executes an external package and was intentionally not done without explicit approval.
- A single static `index.html` may not provide enough source mapping for rich Airship edits.
- Codex/OpenCode undo support in Airship depends on Git-backed files, so the disposable workspace should be initialized as Git for a serious edit proof.
- Airship agent execution still needs strict local workspace boundaries even with `--agent codex --safe`.
- There is no documented draft persistence/export API; GNR8 should plan on diff/snapshot capture first.
- A future managed sidecar must own process lifecycle, port cleanup, logs, stale sessions, and iframe/proxy security.

## Recommendation

Next step: run a manual local Airship session against the fixed-port runner with explicit approval for `pnpm dlx @airshiplabs/cli`, then capture whether a benign text edit changes `index.html` and whether `git diff` is enough to feed a later GNR8 draft-import translator.

Do not wire this runner into app routes, publish flows, source capture, active pointer logic, provider/DNS/billing/env configuration, or customer-domain operations.
