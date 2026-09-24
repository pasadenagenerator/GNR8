# GNR8 Airship Browser Runtime Feasibility Gate

Date: 2026-09-24
Status: `airship_adapter_browser_runtime_feasibility_gate_recorded`

## Summary Verdict

Verdict: **not viable for production**.

A real GNR8 Airship builder should not be planned as a browser-only runtime. The proven local path works because it has a normal Node/Linux-like execution surface: writable source files, Git baseline/diff, package/dev-server process execution, an Airship CLI sidecar process, local HTTP ports, and GNR8 capture/map/apply readback. Current browser-only options can cover fragments of that model, but none provide the full production contract without either StackBlitz-hosted WebContainer dependence or a separate cloud/container/runtime service.

Shortest functional architecture path: **VPS `airship-builder-worker`** for the first controlled online builder, with Cloudflare Containers or another container task model as the stronger later isolation path.

## Existing Evidence

The local GNR8 proof already established that a real `@airshiplabs/cli` session can edit a source-backed static CHS workspace and that GNR8 can capture the result through checksums, Git diff, and served HTML readback:

- `docs/product/gnr8-airship-real-cli-capture-run.md`
- `docs/product/gnr8-airship-sidecar-runner-spike.md`
- `docs/product/gnr8-airship-local-sidecar-process-ownership-spike.md`
- `docs/product/gnr8-airship-online-builder-session-architecture.md`
- `docs/product/gnr8-airship-durable-repository-private-worker-auth-heartbeat.md`

Public Airship evidence, reviewed on 2026-09-24:

- Airship is distributed as the `@airshiplabs/cli` package with a `bin` entry at `./dist/index.js`, requires Node `>=22.13.0`, and depends on Node/server packages including `@openai/codex-sdk`, `@anthropic-ai/claude-agent-sdk`, `@opencode-ai/sdk`, and `ws`: <https://raw.githubusercontent.com/0xnyn/airship/main/apps/cli/package.json>
- Airship's documented quick start runs `npx @airshiplabs/cli --target 3000`, connects to an already-running dev server port, and opens its own editor/proxy port: <https://github.com/0xnyn/airship>
- Airship supports `--exec`, `--cwd`, `--host`, `--port`, `--agent`, `--safe`, and Git-backed undo for Codex/OpenCode. The README says requirements are Node 22.13+ and one of Claude Code, OpenAI Codex, or OpenCode: <https://github.com/0xnyn/airship>

This shape is a CLI/proxy/agent runtime, not a browser library.

## Airship Runtime Requirements

Observed and documented requirements:

- Node 22.13+ runtime with CLI entrypoint.
- Writable source-backed workspace under `--cwd`.
- Running target server on a reachable local port.
- Airship sidecar/proxy process on a second port.
- WebSocket/server behavior for editor communication.
- Child-process style behavior for agent backends and optional `--exec`.
- Access to agent authentication from the runtime environment.
- Git repository or baseline snapshots for reliable undo/diff on Codex/OpenCode.
- Package-manager/dev-server execution for non-static sites.
- Process lifecycle ownership, health, logs, cleanup, and stale session expiry.

Browser APIs alone do not provide process spawning, real local ports, native package manager execution, durable source workspaces shared with a server process, or OS-level sandboxing. A Service Worker can proxy fetches, but it cannot become a long-running Node sidecar with child processes and agent credentials.

## Evaluated Options

### StackBlitz WebContainers / WebContainer API

Status: **partially viable in principle, not enough to recommend without a commercial proof**.

WebContainers are the only browser-family option close to the required shape. Their public API exposes an in-browser Node-like runtime with filesystem access and `spawn`, and can install packages through commands such as `npm i`: <https://webcontainers.io/api>. They require cross-origin isolation headers because they depend on `SharedArrayBuffer`: <https://webcontainers.io/guides/configuring-headers>. The underlying runtime is a hosted StackBlitz component, not just the `@webcontainer/api` client library: <https://webcontainers.io/guides/api-support>. Their troubleshooting docs also call out memory pressure and unsupported native addons: <https://webcontainers.io/guides/troubleshooting>.

This might run a simple static target server and maybe install/import Airship, but production GNR8 would still need to prove:

- `@airshiplabs/cli` can install and run unmodified inside WebContainers.
- Airship's use of agent SDKs, local sockets, WebSockets, `--exec`, package managers, and any subprocess semantics work.
- Git and package-manager behavior are available enough for Airship undo/diff and arbitrary templates.
- Browser memory and mobile/browser support are acceptable for CHS, ARIS, and larger imported sites.
- Secrets and agent credentials can be handled without putting provider auth in browser-side code.
- Licensing/commercial access supports GNR8's embedded product use.

Because that proof requires the hosted WebContainer runtime and likely commercial/product constraints, this remains **unknown, requires external WebContainer commercial proof** as a sub-verdict, not a basis for the main production path.

### Pure Browser WASM / OPFS

Status: **not viable for production**.

OPFS, WASM tooling, browser `git` implementations, and browser bundlers can support a narrow custom editor or static-site transform. They do not provide a general Node 22 CLI runtime, child process model, real package-manager/dev-server execution, Airship sidecar ports, or agent process integration. Rebuilding enough of Node, npm/pnpm, Git, Vite/Next servers, and Airship's proxy/agent behavior would be a new platform project, not an adapter.

### Service Worker Proxy

Status: **not viable**.

A Service Worker can intercept browser requests and route preview fetches. It cannot run `@airshiplabs/cli`, own child processes, bind local ports, execute package managers, or maintain a secure source workspace with server-side diff capture. It could be a helper inside a browser editor, but it cannot replace the Airship CLI sidecar.

### GitHub Codespaces-Style Browser Dev Environment

Status: **viable technically, disallowed by the goal**.

Codespaces is a browser-accessible IDE backed by a cloud-hosted dev container. GitHub describes it as a cloud development environment, customizable with dev containers, that clones the repo into a container with runtimes/tools: <https://docs.github.com/en/codespaces/about-codespaces/what-are-codespaces>. This would likely run Airship, but it is still an external long-running cloud runtime. It does not satisfy "fully inside the operator's browser."

### Cloudflare Workers-Only

Status: **not viable**.

Cloudflare Workers now provide substantial Node compatibility, but it is still a subset. Their docs distinguish supported APIs from non-functional stubs; `node:child_process` is listed as a stub, not a working implementation: <https://developers.cloudflare.com/workers/runtime-apis/nodejs/>. Workers `node:fs` is a virtual, memory-backed filesystem for bundle and temporary files: <https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/>. Workers `node:net` supports client sockets, but `net.Server` is not supported: <https://developers.cloudflare.com/workers/runtime-apis/nodejs/net/>. Cloudflare's own blog explains Workers do not have a traditional filesystem and run across a global network rather than one machine: <https://blog.cloudflare.com/nodejs-workers-2025/>.

Workers can remain an edge control/gateway layer. They cannot host real Airship sidecar sessions without Cloudflare Containers or another runtime.

## Practical Proof Check

No real browser/WebContainer proof was run in this task.

Reason: the current execution environment is a local macOS shell inside the Codex desktop task, not a browser tab with the StackBlitz WebContainer runtime. Running `pnpm dlx @airshiplabs/cli` here would only retest the already-proven local Node path. It would not answer whether WebContainers can run the CLI in-browser.

Not tested:

- `@airshiplabs/cli` install/import inside WebContainers.
- WebContainer execution of Airship's sidecar/proxy.
- WebContainer ability to run a real target dev server plus Airship editor URL concurrently.
- WebContainer diff capture and filesystem export for GNR8 mapping.
- Browser support, mobile support, memory behavior, and cross-origin isolation behavior in the deployed GNR8 app.
- Commercial embedding constraints for WebContainer API use.

What remains proven:

- Normal local Node/Linux-like runtime can run the GNR8 proof target and real Airship CLI.
- GNR8 can capture simple source-backed edits through file hashes and Git diff in that environment.

## Requirement Matrix

| Requirement | Local proof status | Browser-only status | Risk | Blocker / workaround |
| --- | --- | --- | --- | --- |
| Source workspace persistence | Proven for disposable local workspace | Partial only with WebContainer VFS/OPFS; weak for arbitrary browser-only | High | Use remote worker workspace; browser-only needs export/import and quota proof |
| Git baseline/diff | Proven locally | Unknown in WebContainers; custom WASM Git possible but not Airship-proven | High | Remote worker Git baseline; browser-only needs WebContainer proof |
| Package install | Avoided during most tests; real CLI ran through approved local `pnpm dlx` path previously | Unknown for `@airshiplabs/cli`; WebContainers can run package commands but package compatibility unproven | High | Pin Airship in worker image |
| Target server | Proven static local target | WebContainers likely for JS servers; pure browser/SW no real server port | Medium to high | Remote worker target server |
| Airship CLI sidecar | Proven locally | Unknown in WebContainers; not possible in pure browser/SW/Workers-only | Critical | Remote worker runs real CLI |
| Editor session URL | Proven local `localhost` URL | WebContainers may expose preview URLs; GNR8 signed URL/gateway unproven | High | Signed gateway to worker-hosted sidecar |
| Cross-origin isolation/browser support | Not needed locally | Required for WebContainers; affects headers, embeds, third-party content, browsers | High | Separate isolated editor origin or remote worker |
| Secrets/provider safety | Local proof uses local agent auth | Browser-side credentials are unacceptable for production | Critical | Keep provider/agent auth server-side in worker |
| Large site/template performance | Not proven beyond CHS static proof | Browser memory and WASM limits likely risky | High | Worker with capacity limits and cleanup |
| Session cleanup | Proven for owned local child processes | Browser cleanup tied to tab lifecycle; WebContainer teardown/export needs proof | High | Worker leases, heartbeat, TTL sweeper |
| Multi-user concurrency | Not a local proof goal | Browser CPU/memory per operator; no central fleet scheduling | High | Worker capacity/lease manager |
| CHS/ARIS support | CHS real edit proven; ARIS draft/demo path recorded separately | Browser-only unproven for both | High | Enable CHS first on worker, ARIS after workspace parity |
| Generic website/template/store support | Not proven; architecture calls for phased support | Browser-only high risk for package/native/dev-server diversity | Critical | Worker with pinned runtime and capability allowlist |
| Cloudflare Workers-only | Not applicable | Cannot run child processes or server ports; VFS is temporary | Critical | Use Workers only as gateway; use Containers/worker service for runtime |
| Codespaces-style browser IDE | Technically likely | Violates no external long-running runtime goal | Policy/architecture blocker | Treat as out of scope |

## Risks

- WebContainer fit is product and licensing risk, not only technical risk.
- Browser memory quotas and cross-origin isolation can become user-specific support failures.
- Any browser-side provider credentials would violate the safety model.
- A partial browser proof for static HTML would not establish generic website/template/store support.
- Pure browser reconstruction of Airship semantics would create a second editor/runtime product.
- Cloudflare Workers-only can look Node-compatible at import time while failing at the exact APIs Airship needs.

## Recommendation

Recommended path: **VPS `airship-builder-worker` first**.

Why:

- It is the shortest path to a functional GNR8 Airship builder.
- It matches the already-proven local runtime assumptions.
- It can pin Node 22 and `@airshiplabs/cli`.
- It can own real child processes, target server ports, sidecar ports, Git baselines, logs, and cleanup.
- It avoids browser-side secrets and WebContainer commercial uncertainty.
- It reuses the existing durable session, worker auth, heartbeat, lease, capture, mapping, apply, and preview readback architecture.

Second choice: **Cloudflare Containers** or another per-session container task once isolation and cleanup become more important than first-delivery speed.

Not recommended:

- browser-only for production
- Cloudflare Workers-only
- GitHub Codespaces as product runtime
- pure browser WASM/OPFS as a replacement for real Airship

Hybrid/local companion remains useful as a fallback and development/operator proof path, but not the main online product architecture.

## Next Task Proposal

`GNR8 - AIRSHIP ADAPTER 23 - VPS AIRSHIP BUILDER WORKER MINIMAL PROVISIONING PLAN`

Scope:

- define the minimal VPS worker process contract from the existing ADAPTER 17-21 types
- pin Node and `@airshiplabs/cli` versions
- define session workspace layout, process supervisor, port allocation, logs, and cleanup
- keep CHS-only initial allowlist
- keep GNR8 app as control plane only
- do not publish, mutate live pointers, mutate demo/preview-host bindings, touch DNS/provider/billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, or call live provider APIs

