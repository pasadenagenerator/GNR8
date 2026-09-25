# GNR8 Platform MVP 04 — Astro Dev Server Smoke Proof

Date: 2026-09-25

Status: `proof_complete`

## Result

The explicitly invoked proof runner reuses MVP 03 workspace preparation, installs the generated Astro dependency inside a fresh operating-system temporary workspace, starts an owned Astro dev server on `127.0.0.1:4321`, verifies the synthetic Northline Operations page and its stylesheet, compares generated source with the preparation baseline, then stops the server and removes only that workspace.

Nothing runs when the reusable proof module is imported. Registry access, dependency installation, and process execution occur only through `runAstroDevServerSmokeProof` or the dedicated command-line entry point. The generated project now references `/src/styles/global.css?direct`, which makes Vite serve the linked development stylesheet as `text/css` while preserving the deterministic source manifest.

## Real Smoke-Proof Evidence

One successful final proof invocation produced:

- Node: `v22.22.3`
- pnpm: `10.28.2`
- Astro: `5.18.2`
- URL: `http://127.0.0.1:4321/`
- preparation: `147 ms`
- dependency installation: `7,486 ms`
- readiness: `1,490 ms`
- page and stylesheet verification: `8 ms`
- cleanup: `844 ms`
- total: `10,216 ms`

The server was launched directly from the workspace-installed Astro executable with host `127.0.0.1`, port `4321`, and strict-port behavior. The runner first proved the port was available; a conflict would fail without stopping or reconfiguring the existing owner.

HTTP verification passed for:

- page: `200`, `text/html`
- stylesheet: `http://127.0.0.1:4321/src/styles/global.css?direct`, `200`, `text/css`
- title: `Northline Operations Proof`
- headline: `Work that reads clearly`
- navigation: `Services` and `Contact`
- section: `Practical operating support`
- contact: `Talk with Northline` and `hello@northline.example`
- stylesheet token: `--gnr8-astro-accent: #0f766e;`

Two earlier diagnostic invocations failed safely while tightening the stylesheet contract: the first showed that an Astro frontmatter CSS import was inlined, and the second showed that a raw Vite CSS module request returns JavaScript without `?direct`. Both failures stopped their owned server and removed their disposable workspace. They are diagnostic runs, not successful smoke-proof evidence.

## Source And Generated Files

The final MVP 03 source snapshot matched before and after install/server execution:

- baseline aggregate SHA-256: `715bf750a838eb030669f3e0dfc5cfe9ecc4431f3ac03087e9c1ca5c856f30dd`
- final aggregate SHA-256: `715bf750a838eb030669f3e0dfc5cfe9ecc4431f3ac03087e9c1ca5c856f30dd`
- generated source changed: no

Install-generated paths were reported separately as `.pnpm-store/`, `node_modules/`, and `pnpm-lock.yaml`. Astro dev generated `.astro/` after installation. None were added to or used to refresh the source baseline.

The final server process exited after the runner's owned `SIGTERM` shutdown path; forced shutdown was not required. The exact disposable workspace was removed and port `4321` was not left serving.

## Focused Test Evidence

Mocked/local focused tests cover:

- readiness polling against the exact URL;
- readiness timeout and early process exit as distinct failures;
- occupied-port reporting while the unrelated listener remains alive;
- owned-process shutdown and workspace removal after failure;
- the existing Astro adapter contract and MVP 03 workspace preparation behavior.

These tests do not claim a registry install or real Astro execution. The version, HTTP, source-comparison, process-shutdown, and workspace-cleanup evidence above comes from the real proof invocation.

## Boundaries And Next Step

This remains proof-only. It does not build or export Astro output, replace `html-static-artifact`, connect a preview bridge, execute Airship or a worker, mutate CHS/ARIS preview state, alter drafts/candidates, or touch publish, live pointers, DNS, providers, billing, environment configuration, source capture, customer domains, rollback, dry-run, or shadow-publish flows.

Product behavior changed: no. The generated Astro proof source now uses an explicit development stylesheet link, but no production or operator path selects or executes this adapter.

Limitation: successful local development rendering does not prove Astro build/export or deployment behavior.

Next task: MVP 05 — Astro Build Export Proof.
