# GNR8 Platform MVP 05 — Astro Build Export Proof

Date: 2026-09-25

Status: `proof_complete`

## Result

The explicitly invoked build-export proof runner reuses MVP 03 workspace preparation, installs dependencies only inside a fresh disposable workspace, runs `pnpm build`, and requires a successful exit plus a nonempty `dist/index.html`. It then validates a self-contained static export, serves only the validated `dist` files on an ephemeral loopback port, verifies HTML and CSS over HTTP, compares generated source with its baseline, closes the server, and removes the workspace.

The generated stylesheet moved from `src/styles/global.css` to Astro's `public/styles/global.css`, and the page now links `/styles/global.css`. Astro serves that file as CSS during development and copies it to `dist/styles/global.css` during production build. This removes the previous `/src/styles/global.css?direct` dependency, which worked in the Vite development server but was copied unchanged into built HTML.

Nothing runs when the reusable module or CLI module is imported. Registry access, dependency installation, the build, and the temporary server occur only when `runAstroBuildExportProof` or its dedicated command-line entry point is explicitly invoked.

## Export Validation Contract

The `gnr8-astro-static-export:v1` manifest:

- recursively enumerates only regular files inside canonical `dist`;
- rejects a symlinked `dist`, symlinked children, non-regular files, unsafe relative paths, and resolved paths outside `dist`;
- sorts files by relative POSIX path;
- reports each file's byte size and SHA-256, total bytes, and an aggregate SHA-256 framed with path and body lengths;
- requires a nonempty `index.html` with the synthetic fixture title, headline, navigation, section, and contact content;
- resolves local HTML and CSS references after removing URL query strings and fragments;
- requires every local stylesheet and asset reference to name an exported file;
- rejects retained source-workspace paths, `/src/styles/global.css`, `?direct`, Vite client paths, and the development server address;
- requires a local emitted stylesheet containing the expected theme token.

The temporary HTTP server binds only to `127.0.0.1` on an operating-system-selected available port. It serves only paths present in the validated export manifest and returns `404` for workspace or unlisted paths.

## Real Build And HTTP Evidence

One successful final proof invocation produced:

- Node: `v22.22.3`
- pnpm: `10.28.2`
- Astro: `5.18.2`
- dependency installation: `6,509 ms`
- `pnpm build`: successful in `2,270 ms`; Astro reported one static page
- export validation: `2 ms`
- dist-only HTTP verification: `27 ms`
- cleanup: `897 ms`
- total: `10,101 ms`

The validated export contained two files and 3,987 total bytes:

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 1,515 | `84001aebed946155075d0426e577cc538fe1dc8e6b336c7c787cbc596f0172b6` |
| `styles/global.css` | 2,472 | `637543a9f0520315247aebfdfd04f8aeb3041065019f4fc5ce3971a02f4f3002` |

Aggregate export SHA-256: `84accb58aad0ab8a27ac6f1d7379d0793800ca22bf8958e7ee8e7dc950615176`.

The proof served `dist` at the ephemeral URL `http://127.0.0.1:49598/` for that invocation:

- page: `200`, `text/html; charset=utf-8`, exact built `index.html` body;
- stylesheet: `http://127.0.0.1:49598/styles/global.css`, `200`, `text/css; charset=utf-8`;
- verified theme token: `--gnr8-astro-accent: #0f766e;`;
- verified page content: title, headline, `Services` and `Contact` navigation, `Practical operating support`, `Talk with Northline`, and `hello@northline.example`.

The port is evidence from one transient run, not a fixed product port. The server was closed after verification.

## Source, Generated Files, And Cleanup

The source snapshot matched before and after dependency installation, build, export inspection, and HTTP verification:

- baseline aggregate SHA-256: `e2ce2bbf397142da307615d909e4c66c1bb71f2ca6dd24d4d58db311f975de16`
- final aggregate SHA-256: `e2ce2bbf397142da307615d909e4c66c1bb71f2ca6dd24d4d58db311f975de16`
- generated source changed during proof execution: no

Dependency-generated paths were reported as `.pnpm-store/`, `node_modules/`, and `pnpm-lock.yaml`. Build-generated paths were reported separately as `.astro/` and `dist/`. None were added to the Git source baseline.

The final loopback server closed successfully and the exact disposable workspace was removed. Earlier diagnostic runs that exposed the `?direct` production failure and the `?url` development content-type failure also cleaned up their workspaces and owned servers.

Because generated source changed to the `public/` stylesheet contract, the real MVP 04 development smoke proof was rerun. It passed with page `200 text/html`, stylesheet `200 text/css`, the expected theme token, unchanged source, graceful owned-process shutdown, and workspace removal.

## Focused Test Coverage

Focused tests cover:

- deterministic sorted export manifests, byte totals, file hashes, and aggregate hashes;
- query-string and fragment handling for HTML stylesheet and CSS asset references;
- dist-only HTML/CSS serving and rejection of unlisted workspace paths;
- missing and empty `index.html`;
- missing referenced assets;
- retained source/Vite development references;
- symlink escape rejection;
- failed and timed-out builds;
- cleanup after failure;
- import-safe CLI behavior;
- existing Astro adapter, workspace preparation, and development-server lifecycle behavior.

## Boundary And MVP 06

This proves a validated, self-contained static export only. It does **not** create, persist, register, or promote a runtime candidate artifact. It does not invoke an internal preview bridge, Airship, workers, production rendering, CHS/ARIS preview mutation, draft/candidate generation, publishing, live pointers, DNS, providers, billing, environment configuration, source capture, customer domains, rollback, dry-run, or shadow publish. `html-static-artifact` remains the production fallback.

MVP 06 must define and prove the controlled conversion/bridge from this validated Astro output into an internal preview surface, including ownership, artifact persistence, lifecycle, and compatibility rules. It must not infer those contracts from this proof.

Next task: MVP 06 — Astro Output to Internal Preview Bridge.
