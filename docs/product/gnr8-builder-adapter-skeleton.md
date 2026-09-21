# GNR8 Builder Adapter Skeleton

Date: 2026-09-21
Status: `airship_builder_adapter_skeleton_recorded`

## Why This Exists

GNR8 needs a narrow internal adapter boundary for third-party visual builders before any builder is wired into product routes. The first skeleton targets Airship as a sidecar backend because the real CLI proof showed that a source-backed static HTML workspace can be edited externally and captured by GNR8 through ordinary local file diffs.

This is architecture and proof-only code. It does not replace the current GNR8 Airship editor route, launch Airship from production, mutate live pointers, publish, promote, rollback, dry-run, shadow-publish, import customer sites, change DNS/domains/billing/providers/env, or call external AI providers.

## ADAPTER 04 Feasibility Result

ADAPTER 04 prepared a disposable static workspace containing `index.html` and `package.json`, served it locally, launched a real `@airshiplabs/cli` sidecar session manually, and made a visible canvas edit.

The Airship edit changed the local source file:

```text
The CHS team helps...
Airship real capture test
```

GNR8 captured the result as a real `index.html` file diff plus updated file hashes and served/readback HTML. That proves the smallest useful integration shape: materialize a GNR8 artifact into a disposable source-backed workspace, let Airship edit local files, then capture the changed files after the sidecar session.

## Interface Overview

The skeleton lives at:

```text
apps/platform/gnr8/airship/adapter/builder-adapter.ts
```

It defines the internal types:

```text
BuilderAdapter
BuilderSession
BuilderSessionInput
BuilderSessionTarget
BuilderSessionStartResult
BuilderSessionCaptureResult
BuilderSessionCleanupResult
```

The adapter surface covers:

- capability readback
- source-backed workspace preparation
- manual Airship command descriptor generation
- workspace hash and diff capture
- local proof metadata cleanup

The current implementation is `AirshipSidecarBuilderAdapter`. Its `startSession` method returns the same descriptor as `prepareSession`; it does not spawn a process.

## Airship Sidecar Lifecycle

1. GNR8 prepares or receives a disposable local workspace.
2. The workspace must contain `index.html` and `package.json`.
3. A local static target serves the workspace.
4. The adapter returns a manual command descriptor like:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /path/to/workspace --mode canvas
```

5. An operator or future proof-only UI starts Airship outside production route code.
6. Airship is expected to edit local source files in the workspace.
7. GNR8 captures changed hashes, snapshots, and text diffs from the workspace.
8. Cleanup removes only the local proof metadata marker when it is safely inside the workspace.

## Capture Contract

The proven workspace contract is:

- `index.html` exists.
- `package.json` exists.
- the target can be served locally.
- Airship edits are expected to modify local files.
- GNR8 captures changed files, especially `index.html`.
- future mapping can convert reviewed HTML diffs into GNR8 draft edits or candidate artifacts.

The adapter exposes these capabilities:

```text
supportsSidecarSession: true
supportsStaticHtmlTarget: true
supportsFileDiffCapture: true
supportsDirectReactEmbed: false
requiresLocalProcess: true
requiresSourceBackedWorkspace: true
productionReady: false
```

## Not Implemented Yet

- no managed Airship process lifecycle
- no production route integration
- no GNR8 draft/candidate mutation
- no conflict handling
- no stale sidecar cleanup
- no source-map level conversion from arbitrary HTML/CSS edits
- no customer-site source capture/import path
- no publish/promote/rollback/dry-run/shadow-publish wiring

## Next Recommended Task

Build a proof-only GNR8 UI/session entry that prepares a disposable source-backed workspace, shows the manual Airship command descriptor, lets an operator mark the sidecar session complete, and then displays the captured file diff for review without mutating production state.
