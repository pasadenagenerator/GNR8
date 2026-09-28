# GNR8 Platform MVP 08 — Astro Candidate Persistence And Readback Proof

Date: 2026-09-27

Status: `proof_complete`

## Result

An immutable, self-contained Astro internal preview candidate was written by process A to isolated local filesystem storage, process A exited after its disposable Astro workspace and dependencies were deleted, and fresh process B loaded the candidate from that storage alone. Process B injected the loaded candidate into the existing unified preview selector, selected `astro_internal_preview_candidate` with no database access or secondary fallback, and served the resulting HTML from a temporary loopback server with HTTP 200.

This is a local proof boundary. It adds no database, object storage, migration, application route, authentication, publish, live-pointer, DNS, provider, billing, source-capture, customer-domain, rollback, dry-run, or shadow-publish behavior. It does not construct a `RuntimeArtifact` or claim fabricated governance results.

## Repository and record contract

`AstroInternalPreviewCandidateRepository` exposes immutable `create` and ownership-checked `read` operations. The local implementation stores schema `gnr8-astro-persisted-preview-candidate:v1` records below a caller-provided canonical root in `astro-candidates-v1/<key-prefix>/<key>.json`. The key is a SHA-256 derivation of the schema version and candidate ID; caller IDs never become path segments.

Each record contains:

- candidate, site, and site-version identities;
- self-contained root HTML, compiled inline CSS, and asset fingerprints;
- renderer/conversion/export compatibility versions;
- source, export, and converted-content hashes;
- candidate creation and repository storage timestamps;
- explicit local-proof lifecycle metadata; and
- a storage SHA-256 over the complete versioned record envelope except the storage hash field itself.

The bridge still creates transient candidates with `caller_owned_in_memory` / `proof_invocation_only`. Repository creation copies the validated candidate and marks only the persisted copy as `isolated_local_filesystem` / `proof_retained_until_explicit_cleanup`; both lifecycle variants retain `durableRegistration: false`. Existing bridge defaults and rendering compatibility remain unchanged.

The content hash binds renderable content, ownership, compatibility, source/export provenance, CSS, and asset fingerprints. The storage hash additionally binds persisted metadata, lifecycle, and timestamps. These hashes detect accidental or unsophisticated modification; they do not authenticate a writer and must not be presented as signatures or access control.

## Immutability and filesystem safety

Create writes a bounded record to an exclusive temporary file in the destination directory, syncs it, atomically hard-links it into the final immutable name, syncs the directory, and removes the temporary name. A complete final record is therefore visible or absent; a partially written final record is never published.

An identical retry returns the original record as `idempotent`, including its original storage timestamp and storage hash. A different candidate at the same candidate identity fails with `conflicting_write` and does not overwrite the winner. Concurrent conflicting creates were tested and produced exactly one complete winning record.

Roots, storage directories, key-prefix directories, and record files must be canonical non-symlink filesystem objects inside the configured root. Root replacement is detected during a repository instance's lifetime. Traversal-like IDs are hashed, static root/key-prefix symlink escapes fail closed, and records are limited to 2 MiB by default.

Deserialized values are treated as unknown input. Read validates exact record structure, supported schema, identities, ISO timestamps, lifecycle, candidate structure, content integrity, storage integrity, and containment. Outcomes distinguish `missing`, `conflicting_write`, `unsupported_version`, `corrupt`, and `ownership_mismatch`; ownership mismatch errors do not return or include the other owner's payload.

## Actual two-process evidence

The explicitly invoked proof command was:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/output-adapters/run-astro-candidate-persistence-proof.ts run
```

Writer process A was PID `27800`; reader process B was PID `27973`. The processes were distinct and sequential: the writer exited before the reader was launched.

| Evidence | Value |
| --- | --- |
| Node / pnpm / Astro | `v22.22.3` / `10.28.2` / `5.18.2` |
| Candidate / site / site version | `candidate-astro-mvp08-local-proof` / `site-astro-mvp08-local-proof` / `sv-astro-mvp08-local-proof` |
| Source snapshot SHA-256 | `e2ce2bbf397142da307615d909e4c66c1bb71f2ca6dd24d4d58db311f975de16` |
| Export SHA-256 | `84accb58aad0ab8a27ac6f1d7379d0793800ca22bf8958e7ee8e7dc950615176` |
| Converted content SHA-256 | `a856bb3d19d0e89b9aa384ba3ff62aba045cf18ba36a6c53f8f1aa0260d8210f` |
| Persisted storage SHA-256 | `6b004b9a500229f46fce434e6038275880db5d54076fd87430b7041a5e526fcb` |
| Build | one page; two files; 3,987 bytes; source unchanged |
| Unified preview | `astro_internal_preview_candidate`; fallback false; database reads 0 |
| Content | `Work that reads clearly`; `Practical operating support`; `Talk with Northline` |
| CSS / anchors | inline `--gnr8-astro-accent: #0f766e;`; `#services`; `#contact` |
| Reader HTTP | `200 text/html; charset=utf-8` on ephemeral `127.0.0.1` port `64014` |

Process A's generated `.pnpm-store`, `node_modules`, lockfile, `.astro`, `dist`, and entire source workspace were removed before A returned evidence and exited. Process B confirmed that workspace was absent, loaded matching source/export/content/storage hashes from persisted storage, and rendered without a source path or installed Astro dependencies.

## Validation

- The final repository suite passed 20/20 checks, covering exact round-trip, an independent reader, idempotency, conflicting and concurrent writes, malformed/truncated JSON, content and metadata tampering, unsupported versions, missing records, wrong ownership, traversal-like identities, symlink roots/key prefixes/record files, bounded create/read size, stored unified selection, and missing/corrupt fail-closed selection without fallback.
- The affected candidate, bridge, and full unified-preview regression command passed 93/93 checks. The final additional record-symlink case then passed in the 20/20 repository rerun.
- Focused TypeScript no-emit validation passed with `apps/platform/next-env.d.ts`, the repository, bridge, proof/CLI, tests, and unified preview files included.
- The real Astro writer/reader proof completed in `13,410 ms` for writer build/export/persist/cleanup plus the fresh reader process. Both build and readback loopback servers stopped.
- The proof-owned storage and workspace roots were removed after reader verification. No dependency was installed in the checkout and no unrelated process was stopped.

## Product behavior and limitations

Product behavior changed only by adding an opt-in local proof repository and allowing the internal candidate validator to recognize the explicit stored-proof lifecycle. No application route selects this repository, and the unified renderer's default Astro loader remains empty. Existing default previews and the `html-static-artifact` production fallback are unchanged.

This does not provide authenticated admin access, production durability, object storage, promotion, deployment, governance, or publish eligibility. Local filesystem survival across two processes is not evidence of production durability. Explicit cleanup is the only supported retention policy for these proof records; there is no garbage collector or operator retention service.

Recommended next bounded task: define and test an authenticated, ownership-enforcing internal readback service boundary that uses this repository contract through an injected production-capable immutable storage adapter, while still excluding promotion, publish, deployment, and live-pointer changes.
