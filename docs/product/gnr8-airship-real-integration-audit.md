# GNR8 Airship Real Integration Audit

Date: 2026-09-21
Status: `airship_real_integration_audit_recorded`

## Executive Summary

GNR8 currently uses the name "Airship" for an internal GNR8-owned imported-site editor, draft store, preview candidate generator, readiness flow, and demo-preview workflow. Repo inspection did not find an installed upstream Airship package, lockfile entry, SDK import, embeddable React component, iframe app dependency, CLI invocation, or adapter boundary for the original Airship editor.

The public Airship project that matches the intended "real/original Airship editor" is:

- GitHub: `https://github.com/0xnyn/airship`
- npm package / binary: `@airshiplabs/cli`, binary `airship`
- CLI examples: `npx @airshiplabs/cli --target 3000`, `airship --target 3000`, `airship --exec "pnpm dev"`, `airship --target 3000 --agent codex --safe`
- License: MIT
- Published CLI metadata from upstream: package name `@airshiplabs/cli`, version observed in upstream package file `0.3.0`, binary entry `airship: ./dist/index.js`
- Upstream repo packages include `@airship/core`, `@airship/overlay`, `@airship/protocol`, `@airship/server`, `@airship/source`, `@airship/git`, `@airship/editor-tokens`, and `@airship/site-tokens`, but the public integration contract is documented as a CLI/proxy, not as a host-app React SDK.

Direct native embedding of real Airship inside `/gnr8/airship/single-site/editor` is **partially feasible, not feasible yet as a direct React embed**. The feasible path is to treat Airship as an external local builder session/proxy launched against a GNR8-generated editable dev-server workspace, then have GNR8 ingest resulting source or artifact changes. The current GNR8-native editor should stop expanding as a visual-builder clone and be frozen/reframed as orchestration, draft/readiness, and fallback controls.

## Direct Integration Verdict

Verdict: **partially feasible**.

What is feasible:

- GNR8 can wrap an Airship launch/session with its own header and actions if Airship is hosted as a separate local proxy URL or iframe target.
- GNR8 can provide the upstream Airship input it expects by materializing a temporary editable project or route, starting a dev server, and pointing `@airshiplabs/cli` at that port.
- GNR8 can keep ownership of imports, migrations, draft/candidate records, preview generation, publish readiness, and later hosting.
- GNR8 can hide the builder behind a `BuilderAdapter` so Airship can be swapped later.

What is not feasible yet:

- There is no evidence of a drop-in upstream React component that GNR8 can import and render inside the existing Next route.
- There is no local GNR8 code that invokes `@airshiplabs/cli`, manages Airship process/session lifecycle, or captures Airship diffs back into draft/candidate storage.
- Public Airship is source/dev-server oriented. It is not primarily an artifact-HTML editor or custom storage adapter.
- The current `/gnr8/airship/single-site/editor` page is a bespoke GNR8 editor workspace, not an embedded upstream Airship surface.

## Local Repo Findings

No upstream Airship dependency is installed:

- `package.json` contains no Airship dependency.
- `apps/platform/package.json` contains no Airship dependency.
- `pnpm-lock.yaml` has no `airship` match.

Current GNR8 Airship files are internally owned:

- `apps/platform/app/gnr8/airship/single-site/editor/page.tsx` loads GNR8 projections, requires superadmin access, and renders `AirshipSingleSiteVisualEditorWorkspace`.
- `apps/platform/app/gnr8/airship/single-site/editor/airship-single-site-visual-editor-workspace.tsx` is a custom React client editor with canvas overlays, inspector tabs, text/style state, draft saves, and internal preview candidate creation.
- `apps/platform/gnr8/single-site/airship-single-site-draft-service.ts` defines GNR8 draft rows, edit statuses, draft metadata, and style settings.
- `apps/platform/gnr8/single-site/airship-single-site-draft-candidate-service.ts` materializes saved Airship draft edits into GNR8 runtime site versions and runtime artifacts.
- `apps/platform/gnr8/single-site/airship-valid-artifact-html.ts` validates GNR8-generated Airship artifact HTML with `data-airship-section` and `data-airship-element` markers.
- `docs/product/gnr8-airship-visual-editor-workspace-openable-chs-si-closeout.md` explicitly records the current visual editor as a GNR8 route and component with draft-only save behavior.

Legacy related builder evidence:

- `docs/_archive_legacy/chai-builder/builder_pages_snapshot_2026-03-26.csv` contains ChaiBuilder-like block/page JSON. This is not Airship and does not provide a direct upstream Airship integration path.

## Upstream Airship Model

Based on the public Airship README and package metadata, original Airship expects:

- A running web app/dev server reachable by port, e.g. `--target 3000`.
- Optionally a command to start the dev server, e.g. `--exec "pnpm dev"`.
- A local project root, configurable with `--cwd`, so source paths can be resolved.
- A codebase that a supported coding agent can edit.
- A supported agent: `claude`, `codex`, or `opencode`.
- A browser/editor session served by Airship's local proxy on a port such as `target + 1`.

Original Airship appears to output:

- Source-code edits/diffs through an agent.
- Undo information tied to file snapshots or Git for Codex/OpenCode.
- Visual inspector/DOM/CSS editing context over a live app.
- No documented host-app persistence callback, draft storage adapter, or artifact-HTML export callback.

Original Airship supports:

- Canvas and inline editing modes.
- Multi-device live frames.
- DOM/CSS/inspector interaction.
- CLI configuration via flags, `AIRSHIP_*` environment variables, `airship.config.json`, or an `airship` key in `package.json`.
- Reverse-proxy behavior in front of an existing app, with no required project dependency or plugin.

Original Airship does not currently appear to provide:

- An embeddable React component API.
- A stable iframe embedding API intended for SaaS host apps.
- A GNR8 draft/candidate persistence hook.
- An artifact HTML import/export hook.
- A custom toolbar/header integration point.
- A custom storage adapter.
- A direct API/SDK contract for intercepting edits before they land in source.

## GNR8 Model

GNR8 currently expects:

- Imports and migrations produce source evidence, clone/runtime versions, and candidate refs.
- Airship draft rows live in `public.gnr8_airship_single_site_editor_drafts`.
- Draft events live in `public.gnr8_airship_single_site_editor_draft_events`.
- Operators edit normalized GNR8 draft fields and optional style settings.
- Apply/generate preview creates an internal draft candidate and runtime artifact.
- Publish/readiness remains separate and guarded.
- Live pointers, provider/DNS/domain/billing/source-capture mutations are out of scope unless explicitly authorized by separate workflows.

GNR8 currently outputs:

- GNR8 runtime site versions.
- GNR8 runtime artifacts.
- Internal preview routes.
- Readiness packages and activation-chain metadata.
- Demo URLs and host binding readbacks.

The model is database/artifact oriented. Real Airship is source/dev-server oriented. That mismatch is the central integration issue.

## Feasibility Questions

Can GNR8 directly embed real Airship in `/gnr8/airship/single-site/editor`?

- Not as a direct React component with currently evidenced public APIs.
- Potentially as an iframe/proxy panel if GNR8 launches Airship as a sidecar process and embeds the Airship proxy URL.

Can GNR8 wrap Airship with its own header/actions?

- Yes, if Airship runs as an iframe or adjacent browser surface below a GNR8-owned shell.
- No confirmed upstream toolbar-extension API was found, so GNR8 actions should live outside Airship rather than inside Airship's own toolbar.

Can Airship edit generated artifact HTML?

- Not directly as the primary model. Airship expects a running app backed by local source files and uses source-location metadata to map selected elements to code.
- A GNR8 artifact could be materialized into an editable temporary project, served by a dev server, edited by Airship, then re-ingested by GNR8.
- Editing an opaque stored HTML artifact in place is not the documented Airship path.

Can GNR8 capture Airship edits into the existing draft/candidate model?

- Partially. GNR8 can capture source diffs, file snapshots, generated HTML, or a post-edit artifact after the Airship session.
- GNR8 cannot yet capture first-class draft field edits through a documented Airship callback.
- A translation layer would be needed: source diff or edited project -> normalized GNR8 draft edits -> draft version -> internal preview candidate.

Can Airship be swapped later with another builder behind an adapter interface?

- Yes. This should be the primary architecture: GNR8 owns a builder adapter contract, and Airship is one implementation.

## Proposed Architecture

Introduce a builder adapter boundary before adding more editor features.

```ts
export type BuilderSessionInput = {
  migrationId: string;
  draftId?: string | null;
  sourceUrl: string;
  currentCandidate?: {
    siteVersionId: string;
    runtimeArtifactId: string;
    htmlByPath?: Record<string, string>;
  } | null;
  editableProjectRef?: {
    rootDir: string;
    devCommand: string;
    targetPort: number;
  } | null;
};

export type BuilderSessionRef = {
  builder: "airship" | "gnr8-native" | string;
  sessionId: string;
  mode: "external_proxy" | "embedded_iframe" | "native_component";
  url: string;
  draftId?: string | null;
};

export type BuilderEditCapture = {
  sessionId: string;
  sourceDiff?: string | null;
  changedFiles?: Array<{ path: string; beforeHash?: string; afterHash: string }>;
  artifactHtmlByPath?: Record<string, string>;
  normalizedDraftEdits?: Array<{
    targetSectionPage: string;
    fieldKey?: string;
    proposedTextContent: string;
    reasonForChange: string;
  }>;
};

export interface BuilderAdapter {
  readonly id: string;
  prepareSession(input: BuilderSessionInput): Promise<BuilderSessionRef>;
  readSession(sessionId: string): Promise<BuilderSessionRef | null>;
  captureEdits(sessionId: string): Promise<BuilderEditCapture>;
  closeSession(sessionId: string): Promise<void>;
}
```

`AirshipBuilderAdapter` should:

- Materialize a temporary editable project from a GNR8 draft/candidate/artifact.
- Start or attach to a dev server for that editable project.
- Launch `@airshiplabs/cli` with `--target`, `--cwd`, `--agent codex`, and likely `--safe`.
- Return the Airship proxy URL for the GNR8 shell to show.
- On save/apply, capture Git diff or file snapshots from the editable project.
- Convert captured edits to GNR8 draft rows or regenerate artifact HTML.
- Create or update a GNR8 draft version without mutating live pointers.
- Let existing GNR8 apply/generate-preview create the internal preview candidate.

Recommended data flow:

1. GNR8 migration/draft/candidate -> `AirshipBuilderAdapter.prepareSession`.
2. Adapter creates editable workspace and serves it through a dev server.
3. Adapter launches Airship CLI/proxy.
4. GNR8 `/gnr8/airship/single-site/editor` renders a GNR8 header/action shell plus an iframe/link to the Airship session.
5. Airship edits source files in the temporary workspace.
6. GNR8 Save draft calls `captureEdits`, normalizes source/artifact changes, and writes GNR8 draft storage.
7. GNR8 Apply/generate preview uses the existing draft-candidate service to create a candidate artifact.
8. Internal preview, GNR8 demo, Live/readiness remain GNR8-owned actions outside Airship.

## Required Changes

- Stop adding visual-editor features to `AirshipSingleSiteVisualEditorWorkspace` except bug fixes needed to preserve the current demo.
- Add a `BuilderAdapter` abstraction under a neutral GNR8 builder namespace.
- Add an `AirshipBuilderAdapter` spike that can launch, monitor, and close `@airshiplabs/cli` locally without publish/live mutations.
- Add session storage for builder sessions and their editable workspace refs.
- Add a draft-capture translator from source diff or generated artifact HTML into GNR8 draft edits.
- Add security boundaries for process spawning, filesystem scope, allowed ports, authentication, and session cleanup.
- Add a clear fallback path to the current GNR8-native editor if Airship is unavailable.

## Risks

- Airship may not be suitable for server-hosted SaaS use if it is intended only as a local developer CLI.
- Process management in a hosted platform is more complex than a React component: ports, cleanup, cwd isolation, logs, and permissions must be owned by GNR8.
- Source-code edits may not map cleanly to GNR8's normalized draft edit model.
- Artifact-only imports may require GNR8 to synthesize editable source projects before Airship can be useful.
- Airship's agent-driven edits could change code beyond allowed draft scope unless run in a tightly isolated workspace.
- `--safe` behavior depends on the selected agent; Airship documents Codex as the strongest sandbox mode, but GNR8 still needs its own guardrails.
- Iframe embedding may hit local proxy, CSP, auth, framing, or same-origin limitations.
- Without a documented persistence/export API, edit capture will likely be diff-based and therefore less stable than a formal SDK callback.

## Current GNR8-Native Editor Work

Keep for now:

- Draft storage and event tables.
- Draft route handlers.
- Draft-candidate generation.
- Artifact validation/readiness/publish guard services.
- GNR8 shell/header/actions.
- Current editor as a demo fallback and compatibility surface.

Freeze or stop expanding:

- Canvas overlays.
- DOM/CSS inspector clone behavior.
- Visual selection affordances.
- AI command box as a builder/editor feature.
- Style-control expansion beyond current demo preservation.

Replace later if the Airship adapter succeeds:

- `apps/platform/app/gnr8/airship/single-site/editor/airship-single-site-visual-editor-workspace.tsx` should become a thin builder-shell route or fallback implementation.
- GNR8-specific `data-airship-*` editor markers should become adapter-owned hints, not the core visual editor model.

## Recommended Next Step

Run a narrow local-only integration spike:

- Create a temporary editable single-page project from one existing GNR8 draft candidate.
- Start its dev server.
- Launch `npx @airshiplabs/cli --target <port> --agent codex --safe --cwd <temp-project>`.
- Open the Airship proxy manually or in an iframe shell.
- Make one benign text edit.
- Capture the resulting diff or artifact HTML.
- Prove conversion into one GNR8 draft edit and one internal preview candidate.

Success criteria:

- No live pointer, DNS, provider, billing, source-capture, publish, or hosting mutation.
- Airship session starts reliably and can be closed.
- GNR8 can capture an edit without relying on manual copy/paste.
- Captured edit can flow through existing draft/candidate services.

Until that spike succeeds, treat direct real-Airship integration as partially feasible but unproven, and do not continue building a larger GNR8-native Airship-like editor.
