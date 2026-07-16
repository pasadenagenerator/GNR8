# ODV Website Version Thumbnail Production Verification

## Phase

WVT-1-VERIFY - ODV Thumbnail Production Materialization and Workspace Activation.

## Target

ODV site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Approved Writes

Only three immutable `website_version_thumbnail` records were authorized and persisted:

1. Original Website thumbnail.
2. Generated Proposal Iteration 1 thumbnail.
3. Generated Proposal Iteration 2 thumbnail.

No source screenshot artifact, Generated Proposal Bundle, Generated Website Proposal, WGP, Provider Payload, OWM, Compliance, Evolution Analysis, Business Discovery, DBT, publishing state, domain, DNS, schema, migration, worker, provider, or AI state was intentionally changed.

## Capture Boundary

Generated thumbnails used the preferred internal preview rendering boundary. The materializer loads the exact persisted `generated_proposal_bundle`, serves its assets to Playwright from an in-memory internal origin, and captures the durable preview asset tree without issuing an anonymous HTTP request, persisting cookies, weakening superadmin authentication, or reading local proposal folders.

Security properties:

- no public preview or thumbnail route was added
- no credentials, cookies, tokens, or auth headers were written to metadata or files
- no reusable bypass token was introduced
- no generic screenshot endpoint, worker, queue, or recurring capture job was added
- generated captures are private presentation derivatives of persisted bundles

## Preflight

Preflight confirmed WVT-1 contract, persistence, materializer, ODV CLI, private routes, original screenshot storage, both Generated Proposal Bundles, durable preview rendering, and production DB connectivity. Pool waiting count was `0`; no `EMAXCONNSESSION` condition was observed. Thumbnail count before writes was `0`; no equivalent thumbnails already existed.

Original source screenshot:

```text
artifact: 4d046e09-ec56-4a17-830b-1539526636e4
path: rendered/screenshots/viewport.png
mediaType: image/png
dimensions: 1366x768
bytes: 586268
sha256: 4f8daa9f45228a613e4a168ffd6ecd82e9464364f7037e3b8c5644ad7be5f1f8
```

Generated Proposal Bundles:

```text
Iteration 1:
artifactId: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
bundleSha256: c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa
assets: 11
bytes: 28574

Iteration 2:
artifactId: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
bundleSha256: 39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03
assets: 17
bytes: 39875
```

## Persisted Thumbnails

Original Website:

```text
artifactId: website_version_thumbnail_553d438ae24a13985fc18f99debfa55d
captureMethod: reused_evidence_capture_screenshot
sourceArtifactId: 4d046e09-ec56-4a17-830b-1539526636e4
sourceScreenshotArtifactId: raw_imported_site:4d046e09-ec56-4a17-830b-1539526636e4:rendered/screenshots/viewport.png
mediaType: image/png
dimensions: 1366x768
bytes: 586268
sha256: 4f8daa9f45228a613e4a168ffd6ecd82e9464364f7037e3b8c5644ad7be5f1f8
availability: ready
immutable: true
```

Generated Proposal Iteration 1:

```text
artifactId: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639
captureMethod: rendered_durable_generated_preview
sourceArtifactId: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
generatedProposalBundleSha256: c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa
viewport: 1440x900, deviceScaleFactor 1, fullPage false
mediaType: image/png
dimensions: 1440x900
bytes: 403029
sha256: 6323eab2fb5251263358931d04eda3765a3dc6b7f2a9bf935061a3597bf34596
availability: ready
immutable: true
```

Generated Proposal Iteration 2:

```text
artifactId: website_version_thumbnail_a71501efe316a082c6b6534da699264f
captureMethod: rendered_durable_generated_preview
sourceArtifactId: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
generatedProposalBundleSha256: 39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03
viewport: 1440x900, deviceScaleFactor 1, fullPage false
mediaType: image/png
dimensions: 1440x900
bytes: 99211
sha256: f6be158074979f56ed360da1f9d0a827deaef71ae314dd6ebaa4128501e693a5
availability: ready
immutable: true
```

All three artifacts have safety classification `superadmin_private_presentation_derivative`.

## Idempotency And Retrieval

The exact materialization command was run twice with `--persist`.

```text
thumbnail count before: 0
thumbnail count after first persist: 3
thumbnail count after retry: 3
```

The retry reused the same three deterministic artifact IDs, byte counts, hashes, source refs, and lineage. By-ID and by-version retrieval passed for all three and verified exact bytes, SHA-256, dimensions, media type, `ready` availability, immutable state, private safety classification, and correct source lineage.

## Private Routes

Private routes:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/original
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/iterations/1
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/iterations/2
```

Production unauthenticated checks returned `401 UNAUTHORIZED` with `cache-control: no-store`, `x-content-type-options: nosniff`, and `referrer-policy: no-referrer`.

Authenticated production browser loading verified all three routes returned PNG image assets. Browser-downloaded bytes matched persisted hashes:

```text
Original: 4f8daa9f45228a613e4a168ffd6ecd82e9464364f7037e3b8c5644ad7be5f1f8
Iteration 1: 6323eab2fb5251263358931d04eda3765a3dc6b7f2a9bf935061a3597bf34596
Iteration 2: f6be158074979f56ed360da1f9d0a827deaef71ae314dd6ebaa4128501e693a5
```

Route tests verify authenticated serving uses private immutable cache headers, content length, ETag, `nosniff`, `no-referrer`, no capture-on-GET, no write-on-GET, and fail-closed unavailable behavior.

## Workspace Verification

Authenticated production Workspace:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Verified:

- Original Website displays the persisted source screenshot thumbnail at natural size `1366x768`
- Iteration 1 displays the persisted generated proposal thumbnail at natural size `1440x900`
- Iteration 2 displays the persisted generated proposal thumbnail at natural size `1440x900`
- Hero comparison displays Original source screenshot and latest Iteration 2 generated thumbnail
- all three completed versions load actual PNG bytes; no broken image icons or gray placeholders were observed
- generated versions remain labelled quarantined, not approved, and not published
- Original links to the existing source/original URL
- Iteration 1 and Iteration 2 link to existing durable preview routes
- Future remains an intentional empty state

## Evolution Dashboard Verification

Authenticated production Evolution Dashboard:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Verified:

- Iteration 1 thumbnail is visible and loaded at natural size `1440x900`
- Iteration 2 thumbnail is visible and loaded at natural size `1440x900`
- each thumbnail links to its existing durable preview route
- both durable preview routes render the existing quarantined generated proposal previews
- no approved label was present
- published language remains the truthful warning that the preview is not a published website
- compliance and evolution values remained read-only and were not recomputed

## Filesystem Independence

Local folders were temporarily renamed:

```text
ODV_GENERATED_PROPOSAL_001 -> ODV_GENERATED_PROPOSAL_001.wvt-temp
ODV_GENERATED_PROPOSAL_002 -> ODV_GENERATED_PROPOSAL_002.wvt-temp
```

The WVT dry-run still produced the same three artifact IDs, byte counts, and hashes while those folders were absent. The folders were restored exactly. This proves generated thumbnail capture uses persisted Generated Proposal Bundles and the private preview boundary, not the local proposal source directories.

## DB And Process Discipline

All real-target operations were run sequentially. The ODV CLI closes the superadmin pool in `finally`, matching the existing generated-bundle CLI pattern.

Observed pool status after reload:

```text
totalCount: 1
idleCount: 1
waitingCount: 0
```

No pool exhaustion or `EMAXCONNSESSION` condition was observed. Playwright browser instances used by materialization closed after capture.

## Validation

Focused tests:

```text
cd apps/platform
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test \
  gnr8/architecture/website-version-thumbnail-runtime.test.ts \
  app/gnr8/admin/website-version-thumbnail-route.test.ts \
  app/gnr8/admin/knowledge-workspace-page.test.ts \
  app/gnr8/admin/generation-evolution-dashboard-page.test.ts \
  gnr8/architecture/generation-evolution-dashboard-projection.test.ts
```

Result:

```text
39 pass / 0 fail
```

Additional checks:

```text
git diff --check
```

Result: pass.

Broad TypeScript validation:

```text
cd apps/platform && pnpm exec tsc --noEmit --pretty false
```

Result: failed on pre-existing unrelated repository-wide test/type issues outside WVT. The touched WVT files were validated through the focused TypeScript test run above.

## Remaining Limitations

- Authenticated production header verification for positive image routes was limited by browser tooling; route header behavior is covered by focused route tests, and production authenticated browser asset downloads verified PNG content type plus exact bytes/hashes.
- WVT persistence remains in `siteVersion.importProvenanceSummary`; no dedicated thumbnail table exists.
- Generated thumbnails are presentation derivatives only and do not imply approval, publication, deployment, or business acceptance.

## Closeout

WVT-1-CLOSEOUT is recorded in:

```text
docs/architecture/WEBSITE_VERSION_THUMBNAIL_CLOSEOUT.md
```

Closeout re-verified the three persisted ODV thumbnails, Workspace and
Evolution consumption, private fail-closed route behavior, DB pool health, and
no-write-beyond-scope. Website Version Thumbnail status is COMPLETE.

Recommended next track: continuity delivery pipeline design. Do not create
Proposal v3, public thumbnail routes, public preview sharing, thumbnail
workers, scheduled captures, confirmation mutations, publishing, deployment,
provider execution, AI execution, DNS mutation, schema migration, generated
website deployment, Business Approval, or WDB/WGP mutation without separate
explicit approval.
