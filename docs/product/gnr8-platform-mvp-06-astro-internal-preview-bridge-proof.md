# GNR8 Platform MVP 06 — Astro Output to Internal Preview Bridge

Date: 2026-09-25

Status: `proof_complete`

## Result

Validated MVP 05 Astro output can now be converted into a proof-only `AstroInternalPreviewCandidate` and selected explicitly by the existing unified preview renderer through injected in-memory storage. A real Astro build completed, conversion revalidated the export, unified preview rendering returned the Astro candidate without a database read or fallback, and a temporary loopback server delivered that rendered preview with the expected content and theme.

This is local bridge compatibility, not persisted or operator-accessible preview support. No database row, runtime artifact binding, UI/API selector, durable object, current preview, live pointer, provider, DNS, billing, source-capture, or production renderer changed.

## Candidate Shape and Contract Gap

The smallest safe representation is a separate proof candidate rather than `RuntimeArtifact`:

- compatible render fields: candidate/site/site-version identity, renderer compatibility version, `htmlByPath`, `compiledTokenStyles`, `assetFingerprintMap`, content SHA-256, and creation time;
- Astro provenance: adapter ID `astro-static-site`, source snapshot SHA-256, MVP 05 export manifest version and aggregate SHA-256, conversion version, and a distinct converted-content SHA-256;
- explicit ownership repeated in the typed manifest and checked again at selection;
- lifecycle metadata: caller-owned in-memory storage, proof-invocation lifetime, and no durable registration.

The candidate intentionally omits `RuntimeArtifact.publishStage`, `shadowRestricted`, and `artifactGovernance`. This proof did not run page/site gates, rollout policy, or enforcement, so supplying passing values would fabricate governance evidence. A production contract therefore cannot safely persist this candidate unchanged. Durable integration needs either a dedicated candidate schema or a governed promotion step that creates a real immutable `RuntimeArtifact` only after actual gates run.

## Export Revalidation and Conversion

Conversion does not trust the previously returned manifest object. It re-runs the MVP 05 inspection from canonical `dist`, compares the complete sorted manifest, then reopens every file and verifies canonical containment, regular-file status, byte size, and SHA-256 immediately before conversion. The reused inspection rejects a symlinked workspace/dist, symlink children, unsafe paths, non-regular files, missing references, and aggregate mismatches.

Version 1 supports exactly one route:

- `dist/index.html` maps to `htmlByPath["/"]`;
- any other HTML route fails with `unsupported_route`;
- only referenced local CSS files may accompany `index.html`;
- scripts, HTML asset elements, non-stylesheet link resources, unreferenced files, CSS `@import`, and non-data CSS `url(...)` dependencies fail explicitly.

HTML is parsed and serialized with `parse5`. Stylesheet links are resolved with URL semantics, including query/fragment stripping for manifest lookup, then replaced structurally by `<style>` elements at the same document position. Supported `media`, `nonce`, and `title` attributes are retained. CSS is parsed with PostCSS before inlining. Anchor elements are not rewritten; root fragment navigation and tested query/fragment anchor values survive serialization.

## Asset Handling

The current export contains `styles/global.css` and no binary assets. The bridge uses a documented self-contained mode:

- stylesheet bytes are embedded in the rendered HTML and also retained in `compiledTokenStyles`;
- `assetFingerprintMap` records the verified exported CSS path and hash;
- the manifest records the exact inlined stylesheet paths and declares that no external asset storage is required for this candidate;
- fingerprints are evidence only, not treated as storage.

Binary images, fonts, scripts, additional routes, CSS imports, and local CSS URL dependencies remain unsupported. Future durable integration must persist their bytes in owned immutable storage and connect preview asset resolution to that store; it must not rely on fingerprints alone.

## Preview Selection and Ownership

`renderSiteVersionPreview` accepts an optional `astroCandidateSelection` only in transformed mode. The selector:

1. loads a candidate from an injected proof dependency;
2. validates the Astro candidate kind, conversion version, adapter ID, repeated ownership, provenance/content hash binding, and candidate content hash;
3. requires exact candidate ID, site ID, and site-version ID matches;
4. resolves `htmlByPath` through the existing transformed-preview path handling, diagnostics annotation, and diagnostic-content guard;
5. returns source `astro_internal_preview_candidate` without falling back on a missing, invalid, or mismatched explicit selection.

The explicit Astro branch runs before request-scoped database acquisition. No app route supplies this selector and the default loader always returns `null`. Existing transformed artifact bindings, `html-static-artifact` fallback behavior, and the separate `airshipArtifactId` path are unchanged. Astro candidates do not set Airship manifest or governance markers and cannot satisfy the Airship-specific validity checks.

## Focused Validation

The focused bridge suite passed 11/11 checks. It covers:

- deterministic converted-content hashes and distinct export/converted hashes;
- query/fragment stylesheet resolution and preserved anchor behavior;
- corrupt bytes, removed stylesheet bytes, and symlink substitution after initial inspection;
- unsupported second HTML routes, non-CSS files, and CSS asset dependencies;
- CSS/theme delivery through self-contained HTML;
- exact site/version ownership rejection and invalid candidate-kind rejection without persisted fallback reads;
- import-safe proof command behavior.

Focused TypeScript no-emit validation passed with `apps/platform/next-env.d.ts`, the changed implementation/tests, the proof runner, and `unified-render-preview.ts`. The temporary TypeScript configuration was removed after the pass.

Targeted existing unified preview regression tests also passed for normal transformed binding selection and explicit Airship selection/rejection. This confirms the new path is opt-in and does not weaken Airship ownership/validity behavior or the ordinary transformed/fallback path.

## Real Build and Preview-Pipeline Evidence

The explicit bridge proof ran in a fresh disposable workspace:

- Node `v22.22.3`, pnpm `10.28.2`, Astro `5.18.2`;
- dependency installation `8,165 ms`, production build `2,373 ms`, total proof `11,813 ms`;
- one generated page, two export files, `3,987` bytes;
- source snapshot SHA-256 `e2ce2bbf397142da307615d909e4c66c1bb71f2ca6dd24d4d58db311f975de16`, unchanged after install/build;
- export SHA-256 `84accb58aad0ab8a27ac6f1d7379d0793800ca22bf8958e7ee8e7dc950615176`;
- converted candidate SHA-256 `72f2b0d6d3da800d55d1c8ef655a4e4b3e2fd899abfc70032359e1dd0d7ddbb1`;
- explicit synthetic ownership `site-astro-mvp06-local-proof` / `sv-astro-mvp06-local-proof`;
- unified preview source `astro_internal_preview_candidate`, path `/`, fallback false, database reads `0`;
- verified content: `Work that reads clearly`, `Practical operating support`, and `Talk with Northline`;
- verified theme token `--gnr8-astro-accent: #0f766e;` inside the converted preview HTML;
- verified `#services` and `#contact` anchor behavior;
- bridge preview HTTP response `200 text/html; charset=utf-8` on an ephemeral `127.0.0.1` port, with exact unified-renderer output;
- the separate MVP 05 dist server also returned page/CSS `200` and was not counted as bridge evidence.

Both owned loopback servers stopped. The exact disposable workspace, its local pnpm store, installed dependencies, `.astro`, `dist`, and generated lockfile were removed. Nothing was installed into the checkout.

## Product Behavior and Promotion Requirements

The only behavior addition is an explicit, programmatic, dependency-injected Astro candidate selection path. It is unreachable from current application routes and does not change existing default previews. There is no persisted readback, operator surface, activation, or production rendering change.

Promotion beyond this proof requires:

- a durable immutable candidate/asset storage contract with ownership and cleanup/retention policy;
- authenticated site/version/candidate readback and selection, without site-version rebinding;
- actual governance/gate execution and an auditable promotion boundary before constructing a persisted `RuntimeArtifact`;
- multi-file asset serving with media types, hashes, and fail-closed ownership checks;
- additional-route and script policy decisions;
- transactional registration, diagnostics, lifecycle/garbage collection, and operator visibility;
- regression validation against current CHS/ARIS and HTML/static production previews.

Next task: MVP 07 — CHS/ARIS Astro Candidate Readback, using synthetic fixtures without changing current previews.
