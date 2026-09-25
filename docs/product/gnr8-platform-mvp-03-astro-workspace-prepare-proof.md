# GNR8 Platform MVP 03 — Astro Workspace Prepare Proof

Date: 2026-09-25

Status: `proof_complete`

## Result

`prepareAstroStaticSiteWorkspace` now turns the existing single-page Astro manifest into a fresh disposable workspace, commits the generated source as a clean local Git baseline, reads the files back, and returns a path-independent source snapshot. It is proof-only and is not wired into platform, renderer, preview, publish, or Airship execution flows.

The default workspace is created under the operating system temporary directory. An exact destination is created exclusively and an existing destination is rejected. Manifest validation happens before workspace creation and rejects absolute paths, traversal, duplicates (including case-equivalent paths), file/directory collisions, backslash paths, and `.git` path segments. Source writes and readback reject symlink boundary escapes.

## Snapshot Contract

The snapshot includes only the files returned by `createAstroStaticSiteProjectManifest`:

- `astro.config.mjs`
- `package.json`
- `src/pages/index.astro`
- `src/styles/global.css`

Files are sorted by validated manifest path and read back from disk. Each entry reports its UTF-8 byte size and SHA-256. The aggregate `gnr8-astro-source-snapshot:v1` SHA-256 frames each path and exact file body with byte lengths. Workspace paths, timestamps, `.git`, commit metadata, and proof readback metadata are excluded. Commit IDs are intentionally not deterministic.

## Git Boundary

The workspace is initialized as a real local repository with a workspace-local proof identity. Hooks and commit/tag signing are disabled. Inherited `GIT_*` repository redirects are removed, system/global Git config is disabled for proof commands, no remotes are configured, and no global Git config is changed.

## Synthetic Readback Evidence

A synthetic `Northline Operations` business-site fixture was prepared through the default temp-workspace path:

- workspace: `/private/var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8-astro-workspace-xldKSh`
- baseline commit: `36c57358f0f1db0a4bd3394ebf140ffbd3a94bf0`
- aggregate source SHA-256: `988ec2349b5e5531f090ba1b450b0245871aef55750d97fc8e4110508b8ea27c`
- committed source files: 4
- total source bytes: 4,728
- Git status after baseline: clean
- retained: no; the exact disposable workspace was removed after readback

Focused tests also prove that identical content has the same aggregate source hash in two independently created workspaces, while a controlled source edit changes the hash and appears in `git diff`.

## Execution Boundary And Next Step

Port `4321`, `pnpm dev --host 127.0.0.1 --port 4321`, and `pnpm build` are returned as future-step descriptors only. This proof did not install dependencies or execute a dev server, build, preview server, Airship, provider, DNS, publish, billing, source-capture, customer-domain, rollback, dry-run, or shadow-publish flow.

The next task is Platform MVP 04. It must explicitly authorize Astro installation and dev-server execution before either occurs.
