# GNR8 Airship Sidecar Writeback Parity Diagnostic

Date: 2026-09-22
Status: `airship_adapter_sidecar_writeback_parity_diagnostic_recorded`

## Summary Verdict

The ADAPTER 10 proof session prepared a source-backed local `index.html`, but it did not fully match the ADAPTER 04 workspace contract that proved real Airship writeback. The material difference was Git state: ADAPTER 04 used a disposable Git repository with a baseline commit, while the observed ADAPTER 10 workspace had no `.git` directory.

Airship was not launched during this diagnostic. No capture/import, draft apply, preview regeneration, publish, dry-run, shadow publish, rollback, active pointer, DNS, provider, billing, env, or customer-domain mutation was performed.

## ADAPTER 04 Versus ADAPTER 10

ADAPTER 04 successful run:

- Workspace: `/private/tmp/gnr8-airship-sidecar-runner-spike/static-site`
- Files: `index.html`, `package.json`, `.git`
- `package.json`: `private`, `name: "gnr8-airship-sidecar-runner-spike"`, `version: "0.0.0"`
- Static server: `pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts --port 4178 --workspace /tmp/gnr8-airship-sidecar-runner-spike/static-site`
- Server behavior: Node proof runner re-read `index.html` from disk for `/`, plus health/readback endpoints.
- Airship command: `pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-runner-spike/static-site --mode canvas`
- Target URL shape: Airship target was the port `4178`; browser target was `http://127.0.0.1:4178/`
- Cwd: exact disposable source workspace.
- Git: initialized on `main` with baseline commit; post-edit `git status` showed `M index.html`.
- H1 shape: `<h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>`
- Result: Airship wrote `Airship real capture test` back to `index.html`.

Observed ADAPTER 10 workspace before this fix:

- Workspace: `/private/tmp/gnr8-airship-proof-sessions/682a09fd-HcRav5`
- Files: `index.html`, `package.json`, `gnr8-airship-proof-session.json`, `.gnr8-airship-builder-session.json`
- `package.json`: `private` plus `scripts.serve`; no `name` or `version`
- Static server command: `python3 -m http.server 4178 --bind 127.0.0.1 --directory /tmp/gnr8-airship-proof-sessions/682a09fd-HcRav5`
- Airship command: `pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-proof-sessions/682a09fd-HcRav5 --mode canvas`
- Target URL shape: same port-based target shape as ADAPTER 04.
- Cwd: exact disposable source workspace.
- Git: not initialized.
- H1 shape: same marked `hero-headline` target, but generated from the current CHS artifact builder and not byte-identical to ADAPTER 04.
- Result: manual Airship canvas state did not write back to disk; `index.html` SHA stayed unchanged.

## Static Serving Behavior

The ADAPTER 10 static target is disk-backed. A bounded local readback served `/` with Python `SimpleHTTPRequestHandler` and produced the same SHA and byte count as the workspace `index.html`:

```text
served_sha 06e81d9b0c72e18450006867565521c81a285e0834bf1e51215f38a3d5f81c68 served_bytes 12757
disk_sha   06e81d9b0c72e18450006867565521c81a285e0834bf1e51215f38a3d5f81c68 disk_bytes   12757
matches_disk true
```

This rules out cached in-memory HTML, a proof-service generated response, or an opaque copied fixture as the direct cause. The served file was the same local source file that ADAPTER 10 later checksums.

## Source Mapping Diagnosis

Airship could write in ADAPTER 04 because the target was a local source file under `--cwd`, served from disk, and backed by a clean Git repository with a baseline commit. The real CLI identified the project as `editing ... with codex`, then a simple H1 text change landed as a normal source diff.

ADAPTER 10 had the same important HTTP target and cwd shape, and the edited H1 still had a direct `data-airship-element="hero-headline"` marker. The missing Git baseline was the clearest parity break. For Airship's Codex/OpenCode style agent path, Git-backed files are part of the proven local source editing contract and are needed for reliable diff/undo/source-writeback behavior.

The ADAPTER 10 HTML did differ from the ADAPTER 04 fixture: it was the current CHS artifact builder output, 279 lines and 12,757 bytes, versus the successful runner's older 165-line fixture. Several non-H1 `data-airship-element` markers were absent in the newer artifact. That does not explain the H1 writeback failure by itself, because the H1 target marker remained present, but it means ADAPTER 10 was not a byte-for-byte replay of the successful proof.

## Fix Applied

The ADAPTER 10 proof-session preparation now:

- Initializes a Git repository in the disposable workspace.
- Configures local proof-only Git identity.
- Adds `index.html`, `package.json`, and `gnr8-airship-proof-session.json`.
- Creates a `baseline` commit before any manual Airship edit.
- Requires the builder workspace contract to be Git-backed.
- Removes the extra `.gnr8-airship-builder-session.json` file from the prepared proof workspace so fresh `git status --short` is clean.
- Adds `name` and `version` metadata to `package.json` while preserving the manual `serve` script.

Fresh readback after the fix:

```json
{
  "workspacePath": "/var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8-airship-proof-sessions/writeback-parity-readback",
  "targetUrl": "http://127.0.0.1:43910/",
  "expectedAirshipSessionUrl": "http://127.0.0.1:43911/",
  "gitStatus": "",
  "gitHead": "28db81a baseline",
  "hasMetadataPath": false,
  "workspaceContract": {
    "requiresGitRepository": true,
    "expectedMutationModel": "local-source-files",
    "primaryCaptureFiles": ["index.html"]
  }
}
```

Manual command shape for a future approved Airship run:

```bash
python3 -m http.server 43910 --bind 127.0.0.1 --directory /var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8-airship-proof-sessions/writeback-parity-readback
```

```bash
pnpm dlx @airshiplabs/cli --target 43910 --port 43911 --host 127.0.0.1 --agent codex --safe --cwd /var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8-airship-proof-sessions/writeback-parity-readback --mode canvas
```

Expected capture path after a manual edit remains `index.html` in the prepared workspace.

## Validation

Focused checks:

```bash
pnpm exec tsx --test apps/platform/gnr8/airship/adapter/builder-adapter.test.ts
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/airship/proof-session/airship-proof-session-entry.test.ts
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/airship/proof-session/airship-proof-workflow-orchestrator.test.ts
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/airship-proof-workflow-route.test.ts
```

Additional proof readback prepared one local workspace and inspected hashes, command descriptors, clean Git status, and baseline commit. Airship was not launched.
