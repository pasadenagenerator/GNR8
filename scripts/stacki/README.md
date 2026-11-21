# Unmodified native Stacki integration

GNR8 opens the project's native `/studio`. Drafts autosave; native **Push to
GitHub** stores source and **Deploy to hosting** publishes to Cloudflare. The user
accepted these exact native controls. No generated EditorHeader patch is used.

## Pinned release and new projects

`release-pin.mjs` pins Stacki 1.4.8 and its verified SHA-256. The downloader checks
bounded GitHub-to-release-assets redirects and verifies the entire payload before
caching. There are no requests on module import.

```sh
node scripts/stacki/prepare-native-studio.mjs PROJECT RELEASE_JSON SITE_JSON
```

`site.example.json` defines the strict, non-secret binding. The caller must first
verify agency/client/site ownership, the dedicated repository and current source
acceptance. Preparation never creates resources, writes GitHub, calls AI or deploys.
It requires a locked Astro project and refuses unsupported server exports.

Generated files:

- `studio/`: every native release file byte-for-byte, with native licensing.
- `studio/cloudflare/wrangler.jsonc`: repository-authorized Studio, bounded container,
  private draft bucket and separate preview origin.
- `wrangler.json`: native static site gateway and `/studio` forwarding. The root
  location is required by native direct Cloudflare publishing.
- `.stacki/publish.json`: native Cloudflare Workers configuration with distinct
  GitHub and hosting targets; default Publish performs both.
- `.gnr8/native-studio.json`: local preparation receipt.

The scripts never alter an existing unmanaged Studio. A matching retry fills
missing files but rejects edited files, changed identities or symlinks.

`prepare-from-confirmed-export.mjs` reuses verified retained Astro files or the
existing immutable standalone release store. It validates exact source manifests,
confirmation and site/repository identities. Its persisted identities include the
native release and complete generated configuration. A retry cannot silently reuse
another publishing mode. `prepare-git-branch.mjs` can stage and make a local commit
of this exact package; it does not push. The existing Vercel publication job is
separate and must not be used to activate native Cloudflare Studio.
Before a future first Studio deployment, `verifyCommittedStudioSource` checks
the retained source ID against the dedicated checkout's exact branch, remote,
clean working files and committed HEAD. It returns the commit but performs no
build, push, provider request or deployment.

`first-studio-deployment.mjs` contains the one-attempt first-install runner for
a disposable Docker host. Its caller must supply a scoped Cloudflare readback
and private per-site intent store plus a host-owned, read-only Wrangler executable
outside the site checkout. Local or symlinked site executables are refused.
Builds and dry run receive no Cloudflare key or runtime secrets. A separate
trusted deployment callback must use the exact prepared source and provide all
six secrets to the first `wrangler deploy` in an isolated environment; the
default command runner cannot deploy. `trusted-studio-deploy.mjs` implements
the callback for a dedicated deployment job: it accepts only the exact Worker
command, puts the six secrets in a private temporary file for Wrangler, strips
ambient environment variables, sanitizes provider errors and removes the file.
It must never run in the build job or alongside site-owned processes. Any ambiguous
result requires active-version tag readback and review, never an automatic second
deploy. The tag binds the intended source, commit and keyed secret identity to
the deploy attempt; it does not prove deployed bytes. This
library is not connected to a hosted job or a ready-Studio receipt yet.

## Existing sites and upgrades

Use the official Stacki updater with the verified release JSON:

```sh
node /path/to/current/studio/dist/cli.mjs update PROJECT RELEASE_JSON --replace-customizations
```

It stages, installs, typechecks and builds before swapping, retains connection
configuration/state and backs up prior code. Keep project-specific settings in
`studio/cloudflare/`, native `.stacki` project metadata and root site configuration.
Do not modify `studio/src`, `studio/vendor`, native controls or native AI adapters.
Preserve the real existing resource names, repositories and draft buckets.

A changed central pin does not automatically deploy or overwrite existing sites.
Review and deploy each native update after preserving current drafts.

## Lumos library

```sh
node scripts/stacki/prepare-lumos-library.mjs PROJECT VERIFIED_LUMOS_CHECKOUT
```

The source is pinned to Lumos 1.0.4 and a full source-tree digest. It adds 35
components and BaseLayout under `src/lumos`, relocates their internal imports,
loads required Lumos styles when used, and merges native folder/insertion/style
settings. It preserves existing page source and component defaults. Edited library
files stop a repeat; upgrades require a reviewed migration rather than overwriting
customer edits. Lumos pages and sample navigation are not installed as site routes.
Configure Astro >=7.4.7, supported Node >=22.23.4, `site` and the local Inter font as
specified in the result before using BaseLayout. These are site settings, not edits
to Stacki. Existing designs need not import Lumos styles until they use its components.

## Retained sandbox-source migration

```sh
node --import tsx scripts/stacki/materialize-retained-assets.mjs PROJECT SITE_ID
```

For an existing `.gnr8-stacki.json` Git source, this verifies its source record and
all asset SHA-256/Git-blob identities. It uses the existing `stackiDeliveryEntries`
URL mapping to populate `public/` at the same paths. It does not execute Astro
configuration to find assets, infer filenames or recapture a site. Only after this
step may the old development-only asset middleware be replaced with ordinary Astro
configuration. Preserve the original commit/manifest as migration provenance.

## External requirements before activation

- Native GitHub App repository access, matching callbacks and Worker secrets.
- Site/Studio Workers, container, private R2 bucket and verified working/preview hosts.
- Native `PUBLISH_CLOUDFLARE_API_TOKEN` secret for direct hosting deployment.
- Native `AI_BASE_URL`, `AI_MODEL`, optional `AI_MODELS` and secret `AI_API_KEY`.
- Disable external public-site automatic deployments on GitHub push. Generated
  Studio config intentionally omits `GITHUB_DEPLOY_*`; this alone cannot disable
  an existing Workers Builds trigger.
- Native GitHub authentication remains authoritative. Only configure launch
  bindings after these requirements pass; missing bindings fail closed.

All provider writes, credential setup and exact-host migrations need the task's
external rollout authorization. Do not present an offline receipt as hosting proof.
The legacy deployment-SHA endpoint reports unknown until a real SHA is supplied;
native direct hosting success alone is not proof of that endpoint's Git identity.

## Validation

```sh
STACKI_RELEASE_FILE=/path/to/stacki-studio-1.4.8.json \
LUMOS_SOURCE_DIRECTORY=/path/to/lumos-for-astro \
NODE_OPTIONS=--conditions=react-server TSX_TSCONFIG_PATH=apps/platform/tsconfig.json \
node --import tsx --test scripts/stacki/*.test.mjs
```

Release/source-dependent checks are skipped if inputs are absent; skips are not
acceptance. Current decisions, retained site identities, local evidence and hosted
rollout boundaries are in `docs/product/stacki-native-end-to-end-workflow.md`.
