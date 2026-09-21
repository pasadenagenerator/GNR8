# GNR8 Airship Sidecar Edit Capture

Date: 2026-09-21
Status: `airship_adapter_manual_sidecar_edit_capture_recorded`

## Summary Verdict

Verdict: **partially feasible; real Airship edit capture remains blocked in this environment**.

GNR8 can prepare a disposable local workspace, initialize local Git inside it, and capture file diffs/snapshots after that workspace changes. The proof runner now serves the workspace `index.html` from disk on every request, so a changed file is visible through the local target page and through the runner readback endpoint.

What was not proven: a real `@airshiplabs/cli` session was not launched, and no edit was made through Airship. There is no local `airship` binary on PATH, and running the documented `pnpm dlx @airshiplabs/cli ...` command would download and execute an external package. Per this manual proof boundary, that step was stopped and recorded rather than run implicitly.

No production routes, live pointers, source-capture/import paths, customer sites, DNS/domain/provider/billing/env configuration, publish, promote, rollback, dry-run, shadow-publish, or external AI providers were touched.

## Disposable Workspace

Runner command used:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --port 4178 --workspace /tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Workspace:

```text
/tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Files present:

```text
index.html
package.json
```

Target/readback URLs:

```text
http://127.0.0.1:4178/
http://127.0.0.1:4178/__gnr8_airship_sidecar_spike/health
http://127.0.0.1:4178/__gnr8_airship_sidecar_spike/readback
```

Initial checksums:

```text
3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9  index.html
e0ac5cf7b5eb72f7387898af020d9913d10a7b527e1d29a4e973e34f9c7291fa  package.json
```

Initial local git state:

```text
git init
git add index.html package.json
git -c user.name=GNR8-Airship-Proof -c user.email=gnr8-airship-proof@example.invalid commit -m baseline
baseline commit: cee3af1
git status --short: clean
```

Initial readback:

```json
{
  "ok": true,
  "route": "/",
  "workspaceDir": "/tmp/gnr8-airship-sidecar-runner-spike/static-site",
  "indexPath": "/tmp/gnr8-airship-sidecar-runner-spike/static-site/index.html",
  "bytes": 11968,
  "sha256": "3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9",
  "initialFixtureSha256": "3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9",
  "containsAirshipMarkers": true
}
```

## Airship CLI

Recommended preflight command:

```bash
pnpm dlx @airshiplabs/cli doctor --target 4178 --agent codex --json --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Recommended sidecar launch command:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site --mode canvas
```

Expected session URL if launched:

```text
http://127.0.0.1:4179/
```

Actual launch result:

- Airship CLI was **not launched**.
- `command -v airship` returned no binary.
- `pnpm dlx --offline ...` and `pnpm --offline dlx ...` are not supported by this pnpm command form and returned `Unknown option: 'offline'`.
- Running the actual documented `pnpm dlx @airshiplabs/cli ...` command would require package download/external package execution, so the proof stopped at manual steps instead of implicitly fetching and running the CLI.

## Edit Capture Test

Because real Airship was not launched, no Airship UI edit was performed. A synthetic local workspace edit was made only to validate the GNR8 capture mechanism that a future Airship write would feed.

Edit attempted:

```text
The CHS team helps your IT change with every technology wave.
```

Changed to:

```text
Airship sidecar capture test
```

Observed file changes:

- Changed file: `index.html`
- Unchanged file: `package.json`
- Post-edit `index.html` SHA-256: `f514bb7a2f9b37c88ea2519c66c6210e95d8ad8a4aca89e7d2136e52f18596de`
- Post-edit `package.json` SHA-256: `e0ac5cf7b5eb72f7387898af020d9913d10a7b527e1d29a4e973e34f9c7291fa`

Diff summary:

```diff
-          <h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>
+          <h1 data-airship-element="hero-headline">Airship sidecar capture test</h1>
```

Post-edit readback:

```json
{
  "ok": true,
  "route": "/",
  "workspaceDir": "/tmp/gnr8-airship-sidecar-runner-spike/static-site",
  "indexPath": "/tmp/gnr8-airship-sidecar-runner-spike/static-site/index.html",
  "bytes": 11936,
  "sha256": "f514bb7a2f9b37c88ea2519c66c6210e95d8ad8a4aca89e7d2136e52f18596de",
  "initialFixtureSha256": "3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9",
  "containsAirshipMarkers": true
}
```

Changed static page reflection:

- `GET http://127.0.0.1:4178/` returned HTTP `200`.
- The served HTML included `<h1 data-airship-element="hero-headline">Airship sidecar capture test</h1>`.
- This verifies file-backed snapshot/readback capture for the disposable target, not an Airship-authored edit.

Airship write classification:

- Source changes: **not proven**, because Airship did not run.
- HTML changes: **capturable if Airship writes `index.html`**; proven by synthetic workspace edit.
- CSS changes: **not observed**.
- Nothing/ephemeral browser state: **not proven**, because there was no Airship browser/proxy session.
- Source-backed framework requirement: **unknown**. Plain static HTML is now prepared in a local source-backed workspace, but only a real Airship run can prove whether Airship can map a visual edit back to `index.html`.

## Capture Adapter Sketch

If a future real Airship session writes files under the disposable workspace, GNR8 can capture:

- File diff: `git diff -- index.html package.json` or a scoped all-file diff from the temporary repo.
- Final HTML snapshot: read `index.html` after the Airship session stops.
- Changed CSS: capture inline CSS diffs in `index.html` or separate CSS file diffs if the fixture is split later.
- Command transcript: capture Airship process stdout/stderr when GNR8 owns the managed sidecar process.

Mapping into GNR8:

- Changed HTML text at known `data-airship-element` markers -> draft element text edit.
- Changed HTML/CSS that affects the rendered artifact -> candidate artifact refresh in a later guarded workflow.
- Arbitrary structural changes, unknown selectors, script changes, or multi-file changes -> manual review/import step before any GNR8 draft/candidate mutation.

If a future Airship session does not write files:

- Treat the session as ephemeral browser/proxy state.
- Capture remains unsupported unless Airship exposes a stable export/event API or GNR8 supplies a source-backed project Airship can edit.
- Adapter viability would fall back to view/inspection only, not draft import.

## Runner Adjustment

The proof runner was kept local-only and outside app runtime routes, but was adjusted so `GET /`, `GET /index.html`, and readback read the current workspace `index.html` from disk instead of an in-memory fixture string. This is required for a later Airship-authored file edit to be visible without restarting the runner.

## Recommended Next Step

Run the recommended Airship command manually with explicit approval for temporary package download/external execution:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site --mode canvas
```

Then perform the same hero headline edit in the Airship UI and capture:

```bash
cd /tmp/gnr8-airship-sidecar-runner-spike/static-site
git diff -- index.html package.json
shasum -a 256 index.html package.json
curl -s http://127.0.0.1:4178/__gnr8_airship_sidecar_spike/readback
```

Adapter viability should be upgraded to **feasible** only if Airship itself writes `index.html` or another local file in the disposable workspace. If Airship only changes browser/proxy state, the adapter remains **blocked for draft/candidate capture** until Airship provides a stable export path or GNR8 provides a richer source-backed target Airship can modify.
