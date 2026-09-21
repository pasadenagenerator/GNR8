# GNR8 Airship Real CLI Capture Run

Date: 2026-09-21
Status: `airship_adapter_real_cli_capture_run_recorded`

## Summary Verdict

Verdict: **feasible for simple static HTML text edits**.

A real one-time `@airshiplabs/cli` sidecar session was launched against the disposable local CHS proof workspace. A visible Airship canvas edit changed the hero headline to `Airship real capture test`, and Airship wrote the change back to the local workspace `index.html`. GNR8 can capture that edit through ordinary file checksums, Git diff, and served/readback HTML.

This proof did not touch production routes, runtime/product state, live pointers, publish/promote/rollback/dry-run/shadow-publish flows, source capture/import, DNS/domain/provider/billing/env configuration, external customer domains, or external AI provider APIs. No packages were installed globally.

## Runner And Session

Proof runner command:

```bash
pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --port 4178 --workspace /tmp/gnr8-airship-sidecar-runner-spike/static-site
```

Disposable workspace:

```text
/tmp/gnr8-airship-sidecar-runner-spike/static-site
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

Runner readback smoke check returned HTTP `200` for health and readback. Initial readback reported `bytes=11968`, `containsAirshipMarkers=true`, and the same initial `index.html` SHA above.

Approved real Airship command:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site --mode canvas
```

Airship session URL:

```text
http://localhost:4179
```

Airship CLI output identified the process as:

```text
airship — editing /tmp/gnr8-airship-sidecar-runner-spike/static-site with codex
Sandboxed: edits are confined to the project and the network is off.
```

The package version was not printed by the one approved command output.

## Edit Attempt

Edit target:

```text
hero headline / h1[data-airship-element="hero-headline"]
```

Requested text:

```text
Airship real capture test
```

Observed Airship UI behavior:

- Airship opened the CHS fixture in desktop and iPhone canvas frames.
- Selecting the desktop hero headline exposed an `h1` design/content panel.
- Airship showed `Source no source` for the selected node, but still created a pending text change.
- Applying the pending change showed `Applied 1 edit`.
- The desktop frame updated immediately; the iPhone frame remained visually stale during the observed session, but the served source changed after Airship wrote the file.

## Captured Diff

Changed files:

```text
index.html
```

Unchanged files:

```text
package.json
```

Post-edit checksums:

```text
3c10f936ade0dd793133651ee8fa8ae269f7e90eb79da05ca21e85982970fed6  index.html
e0ac5cf7b5eb72f7387898af020d9913d10a7b527e1d29a4e973e34f9c7291fa  package.json
```

Diff summary:

```text
index.html | 4 ++--
1 file changed, 2 insertions(+), 2 deletions(-)
```

Exact diff:

```diff
diff --git a/index.html b/index.html
index dc9bef6..c311d0a 100644
--- a/index.html
+++ b/index.html
@@ -90,7 +90,7 @@
       <div class="shell hero-grid">
         <div>
           <p class="eyebrow">Computer Help Specialists</p>
-          <h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>
+          <h1 data-airship-element="hero-headline">Airship real capture test</h1>
           <p data-airship-element="hero-body">The people behind the technology matter more than the technology itself. We bring deep, lived expertise and the practical discipline to drive real change, so your organization can move forward with confidence.</p>
           <div class="hero-actions">
             <a class="button" href="#contact" data-airship-element="hero-cta">Contact Us</a>
@@ -162,4 +162,4 @@
     <div class="shell">CHS Airship MVP demo. GNR8 preview render for review.</div>
   </footer>
 </body>
-</html>
\ No newline at end of file
+</html>
```

Post-edit readback:

```json
{
  "ok": true,
  "route": "/",
  "workspaceDir": "/tmp/gnr8-airship-sidecar-runner-spike/static-site",
  "indexPath": "/tmp/gnr8-airship-sidecar-runner-spike/static-site/index.html",
  "bytes": 11933,
  "sha256": "3c10f936ade0dd793133651ee8fa8ae269f7e90eb79da05ca21e85982970fed6",
  "initialFixtureSha256": "3c9659545e4e5272802d3ea519bfdf1a00367b47a3bcd3142a009795cfb400d9",
  "containsAirshipMarkers": true
}
```

Served HTML after the edit included:

```html
<h1 data-airship-element="hero-headline">Airship real capture test</h1>
```

## Capture Result

- Did `index.html` change? **Yes**.
- Did any other file change? **No**.
- Did readback/served HTML contain `Airship real capture test`? **Yes**.
- Did Airship write source files, generated files, CSS, or nothing? **Source HTML file only**. No CSS or generated file changes were observed.
- Was the edit capturable by GNR8? **Yes**, for this source-backed static HTML case.

This proves the smallest useful capture path: materialize a GNR8 artifact into a disposable local source workspace, run Airship against that workspace, then capture changed files and diffs after the session.

## Validation

Cleanup:

- Airship sidecar was stopped with Ctrl-C.
- Static proof runner was stopped with Ctrl-C.
- `lsof -nP -iTCP:4178 -sTCP:LISTEN` returned no listeners after cleanup.
- `lsof -nP -iTCP:4179 -sTCP:LISTEN` returned no listeners after cleanup.

Required checks to run after recording this document:

```bash
git diff --check
```

Touched-file trailing whitespace scan:

```bash
rg -n "[[:blank:]]$" docs/product/gnr8-airship-real-cli-capture-run.md docs/product/gnr8-airship-sidecar-edit-capture.md
```

## Recommended Next Step

Build the next proof-only adapter layer that:

1. Creates a fresh disposable source-backed workspace per Airship session.
2. Starts the static/dev target and real Airship sidecar with owned process lifecycle.
3. Captures `git diff`, changed-file checksums, and final HTML snapshots.
4. Normalizes simple `data-airship-element` text diffs into GNR8 draft edits.
5. Sends structural/CSS/multi-file edits to manual review before any guarded GNR8 draft/candidate persistence.

Keep this path local-only and outside production routes until the adapter has process isolation, stale-session cleanup, conflict handling, and reviewed import semantics.
