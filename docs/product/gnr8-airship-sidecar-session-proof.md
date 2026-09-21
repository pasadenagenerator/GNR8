# GNR8 Airship Sidecar Session Proof

Date: 2026-09-21
Status: `airship_adapter_sidecar_session_proof_recorded`

## Summary Verdict

Verdict: **partially feasible, not yet proven by execution in this repo session**.

Real Airship (`0xnyn/airship`, npm `@airshiplabs/cli`) is a local CLI/proxy that sits in front of a running HTML-serving app. That matches a GNR8 sidecar-builder architecture better than a direct React-component embed. GNR8 can own migration, draft, candidate, preview, and publish/readiness orchestration while Airship owns a local visual editing session, if GNR8 first provides a safe editable target on a local dev server.

The unproven part is edit persistence back into GNR8. Airship documents source-file edits and diffs through Claude, Codex, or OpenCode. It does not document a host-app persistence callback or artifact-HTML export API. GNR8 should therefore assume capture is diff/snapshot based until proven otherwise.

This proof did **not** run Airship, install packages, start long-running services, mutate live pointers, publish, shadow-publish, source-capture, change DNS/provider/billing/env configuration, or touch customer domains.

## Builder Adapter Sketch

This is a proof-only shape, not production wiring.

```ts
export type BuilderAdapterId = "airship-sidecar" | "gnr8-native-fallback";

export type BuilderSessionInput = {
  migrationId: string;
  draftId?: string | null;
  draftVersion?: number | null;
  sourceUrl?: string | null;
  previewInput: {
    kind: "static-html-artifact" | "gnr8-preview-url" | "editable-project";
    url?: string;
    htmlByPath?: Record<string, string>;
    rootDir?: string;
    devCommand?: string;
    targetPort?: number;
  };
  safety: {
    localOnly: true;
    forbidPublish: true;
    forbidSourceCapture: true;
    forbidCustomerDomainMutation: true;
  };
};

export type BuilderSessionRef = {
  adapterId: BuilderAdapterId;
  sessionId: string;
  status: "prepared" | "running" | "stopped" | "failed";
  targetUrl: string;
  sessionUrl?: string;
  targetPort?: number;
  proxyPort?: number;
  workingDirectory?: string;
  proofOnly: true;
};

export type BuilderEditCapture = {
  sessionId: string;
  status: "unsupported" | "no_changes" | "captured";
  sourceDiff?: string;
  changedFiles?: Array<{ path: string; beforeSha256?: string; afterSha256: string }>;
  artifactHtmlByPath?: Record<string, string>;
  normalizedDraftEdits?: Array<{
    targetSectionPage: string;
    fieldKey?: string;
    proposedTextContent: string;
    reasonForChange: string;
  }>;
  proofLimitations: string[];
};

export interface BuilderAdapter {
  readonly id: BuilderAdapterId;
  prepareInputPreview(input: BuilderSessionInput): Promise<BuilderSessionRef>;
  startOrConnectSession(sessionId: string): Promise<BuilderSessionRef>;
  getSessionUrl(sessionId: string): Promise<string | null>;
  stopSession(sessionId: string): Promise<void>;

  // Proof-only stub until Airship edit export is validated.
  captureEdits(sessionId: string): Promise<BuilderEditCapture>;
}

export interface AirshipBuilderAdapter extends BuilderAdapter {
  readonly id: "airship-sidecar";
}
```

Lifecycle intent:

1. `prepareInputPreview`: materialize a safe local preview target from a GNR8 draft/candidate/artifact. For this proof, prefer a temporary static HTML project or a read-only internal preview URL.
2. `startOrConnectSession`: start or attach to Airship CLI against the local target.
3. `getSessionUrl`: return the Airship proxy/editor URL, expected to be `http://127.0.0.1:<proxyPort>/` with default proxy port `target + 1`.
4. `stopSession`: terminate Airship and any proof-local static server.
5. `captureEdits`: **stubbed for proof**. Later candidates are Git diff, changed file snapshots, or regenerated HTML converted into GNR8 draft edits.

The current GNR8-native editor remains a fallback/prototype and should not be expanded as a replacement visual builder until the sidecar capture path is proven.

## Airship CLI Execution Contract

Primary source: upstream Airship README at `https://github.com/0xnyn/airship`.

Observed contract:

- Package/binary: `npx @airshiplabs/cli ...` or installed `airship ...`.
- Quick start command: `npx @airshiplabs/cli --target 3000`.
- Installed command: `airship --target 3000`.
- Agent command for Codex sandboxing: `airship --target 3000 --agent codex --safe`.
- Optional dev-server ownership: `airship --exec "pnpm dev"`.
- CLI syntax: `airship [options]`, `airship --target <port> [options]`, or `airship <command> [options]`.
- `--target <port>` is documented as the port of an already-running dev server. The docs emphasize a port, not an arbitrary full URL.
- `--port <port>` sets the Airship proxy port. Default is `target + 1`.
- `--host <address>` defaults to `127.0.0.1`.
- `--allowed-hosts <names>` can add hostnames the proxy will answer to.
- `--cwd <dir>` is the project root used to resolve source paths for edits. In a monorepo, this must be the app root, not necessarily the repository root.
- `--mode <name>` supports `canvas` and `inline`.
- `--open` opens the editor once listening.
- `--json`, `--quiet`, and `--debug` are available for process supervision.
- `airship doctor --target <port> --agent codex --json` is the safest preflight shape to inspect before launching a managed session.
- Configuration can come from flags, `AIRSHIP_*` environment variables, `airship.config.json`, or an `airship` key in `package.json`.
- Upstream package engines in the repo require Node `>=22.13.0`. This workspace currently reports `node -v` as `v22.22.3`.

Implication for GNR8:

- Real Airship can likely target anything served over HTTP by a local port, including static HTML, because upstream says it works with anything that serves HTML over HTTP.
- Real editing value likely requires source-backed local files under `--cwd`; a plain remote/internal URL or opaque artifact page may show the visual UI but may not produce useful source edits.
- The safest adapter target is a temporary local project containing GNR8-materialized HTML/source, served on `127.0.0.1:<targetPort>`, with Airship on `127.0.0.1:<proxyPort>`.

## Proof Input

Preferred proof input: an existing polished CHS or ARIS Airship demo artifact materialized into a local static project.

Safe candidates already recorded:

- CHS GNR8-controlled demo URL: `https://chs-airship.app.pasadenagenerator.com/`
- ARIS GNR8-controlled demo URL: `https://aris-airship.app.pasadenagenerator.com/`
- CHS local HTML generator: `apps/platform/gnr8/single-site/airship-chs-demo-artifact-repair.ts`, `buildAirshipChsMvpDemoHtml()`.
- Existing ARIS candidate refs from docs: migration `ebf62324-1e51-4435-abd7-004722fb48d6`, candidate site version `6d712ab9-f48e-49a3-9c26-03915365d746`, artifact `8073651e-510b-47e7-8363-8a742b7967db`.

For the first sidecar run, CHS static HTML is better than either public demo URL because it avoids public HTTP targets and customer-domain confusion. The static target should be treated as a disposable editable workspace, not as the production artifact.

## Local-Only Sidecar Proof Path

These commands are proposed for a terminal run with explicit approval to start local servers and download/run the Airship package. They are not production functionality.

Option A: static artifact target.

```bash
# Terminal 1: create a disposable project from known-safe GNR8 demo HTML.
mkdir -p /tmp/gnr8-airship-sidecar-proof/static-site
cd /tmp/gnr8-airship-sidecar-proof/static-site

# Put the CHS polished artifact HTML at ./index.html.
# Recommended source: buildAirshipChsMvpDemoHtml() from:
# apps/platform/gnr8/single-site/airship-chs-demo-artifact-repair.ts

python3 -m http.server 4178 --bind 127.0.0.1
```

```bash
# Terminal 2: preflight Airship against the static target.
cd /tmp/gnr8-airship-sidecar-proof/static-site
npx @airshiplabs/cli doctor --target 4178 --agent codex --json --cwd /tmp/gnr8-airship-sidecar-proof/static-site
```

```bash
# Terminal 2: launch the sidecar editor.
cd /tmp/gnr8-airship-sidecar-proof/static-site
npx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-sidecar-proof/static-site --mode canvas
```

Expected session URL: `http://127.0.0.1:4179/`.

Expected proof observations:

- If Airship opens a canvas/inline editor for `http://127.0.0.1:4178/`, the sidecar display path is feasible.
- If element selection works but agent edits fail or cannot map selected elements to `index.html`, Airship requires richer source mapping than plain static HTML provides.
- If a simple text edit modifies `index.html`, GNR8 can capture that changed file and translate it into draft/artifact state in a later adapter spike.

Option B: GNR8 platform dev-server target.

```bash
# Terminal 1: start the local platform app only if env and auth are already safe for local read-only preview work.
cd apps/platform
pnpm dev -- --hostname 127.0.0.1 --port 3000
```

```bash
# Terminal 2: launch Airship against the platform app, with app root as cwd.
cd apps/platform
npx @airshiplabs/cli --target 3000 --port 3001 --host 127.0.0.1 --agent codex --safe --cwd /Users/gregorzigon/Documents/Codex/GNR8/apps/platform --mode canvas
```

Expected session URL: `http://127.0.0.1:3001/`.

Then manually navigate within the Airship session to a read-only GNR8 preview route. This option is less clean because it targets the platform app source, not a disposable artifact workspace.

## Proof Answers

Can real Airship target a GNR8-generated preview/artifact page?

- **Likely yes for viewing/inspection** if the page is served from a local HTTP port.
- **Unproven for useful editing** until a sidecar run proves Airship can map selected DOM elements back to editable local files.

Does Airship require a local source-code project instead of plain HTML?

- It requires a local `--cwd` for source resolution and agent edits.
- Plain static HTML may be enough if `index.html` is inside `--cwd` and served locally.
- A remote/internal preview URL without local source under `--cwd` is likely view-only or poor-fit for edit capture.

Does it show a visual editor UI for the target?

- Upstream says Airship opens a visual editor on the proxy port after targeting a running dev server.
- This repo session did not launch it, because doing so would require package execution/download and long-running local services.

Can edits be captured/exported back into GNR8?

- No first-class export callback was found in public docs.
- Feasible capture candidates are:
  - Git diff from the disposable target project.
  - Changed-file snapshots and hashes.
  - Re-read `index.html` or generated app output after Airship edits.
  - Later normalization into GNR8 draft edits and existing draft-candidate generation.
- This is the riskiest part of the adapter and should be the next proof milestone.

## Risks

- Process management: GNR8 must own local process lifecycle, port assignment, health checks, logs, stale sessions, and cleanup.
- Sandbox/security: Airship with Codex `--safe` is the best documented Airship sandbox path, but GNR8 still needs its own workspace, port, and filesystem boundaries.
- Persistence: Airship edits source; GNR8 persists drafts/artifacts. Translation is non-trivial and may lose intent.
- Source-code assumptions: opaque runtime artifact HTML or remote preview pages may not carry enough source mapping for useful edits.
- Multi-tenant/session isolation: each session needs a unique local workspace, allowed host/port scope, and no customer-domain writes.
- Hosted SaaS fit: upstream Airship appears local-developer oriented. Running it as a multi-user server feature may require architecture not documented by upstream.
- Auth and agent state: Airship reuses local Claude/Codex/OpenCode auth, which is a poor fit for tenant-hosted production sessions without stronger isolation.
- Iframe/proxy embedding: CSP, frame headers, same-origin behavior, and local proxy URLs need explicit testing before embedding in GNR8 UI.

## Recommended Next Step

Build a proof-only `AirshipBuilderAdapter` skeleton plus local sidecar runner, but keep it outside production routes:

- Materialize one disposable static CHS artifact project under `/tmp` or another ignored proof directory.
- Start a local static server bound to `127.0.0.1`.
- Run `airship doctor --json`.
- Launch `@airshiplabs/cli` with `--agent codex --safe --cwd <proof-project>`.
- Make one benign text edit.
- Stop the session.
- Capture `git diff` or the edited `index.html`.
- Prove conversion into a GNR8 draft edit without publishing or mutating live state.

Do **not** replace the current GNR8-native editor route yet. Freeze bespoke visual-builder expansion and keep the existing editor as fallback/demo until this sidecar capture path succeeds.
