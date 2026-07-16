# Website Version Thumbnail Closeout

## Milestone Purpose

WVT-1-CLOSEOUT formally closes the Website Version Thumbnail milestone after
production materialization and verification of the ODV Original Website,
Iteration 1, and Iteration 2 thumbnails.

Status: COMPLETE.

## Original Product Problem

The Knowledge Workspace and Generation Evolution Dashboard needed stable visual
memory for website versions without treating screenshots as source truth,
business truth, approval, publication, deployment, or a replacement for live
durable previews.

## Final Architecture

Website Version Thumbnail runtime is an immutable, private, superadmin-only
presentation derivative model. It keeps persisted thumbnail bytes for cards and
timelines while preserving live source/durable preview destinations as the
authoritative click-through experience.

The runtime includes:

- immutable `website_version_thumbnail` contract
- deterministic artifact ID builder
- provenance-backed append-only persistence in `importProvenanceSummary`
- narrow ODV materializer
- source Evidence Capture screenshot reuse
- persisted Generated Proposal Bundle rendering for generated thumbnails
- private read-only thumbnail routes
- Workspace projection/rendering integration
- Evolution projection/rendering integration
- focused route, runtime, Workspace, and Evolution tests

It adds no table, migration, public route, screenshot worker, recurring capture,
queue, publication behavior, generated-site deployment, provider execution, AI
execution, Proposal v3, Business Approval, DNS mutation, or mutation UI.

## Implementation Summary

Prior commits:

```text
b4b43282 Implement thumbnail runtime
c8c55f35 Verify ODV thumbnails
```

The closeout phase performed read-only durable-state verification, production
route/UI verification, documentation reconciliation, validation, and a focused
documentation commit only.

## Source Thumbnail Identity

Original Website:

```text
artifactId: website_version_thumbnail_553d438ae24a13985fc18f99debfa55d
source screenshot artifact: 4d046e09-ec56-4a17-830b-1539526636e4
sourceScreenshotArtifactId: raw_imported_site:4d046e09-ec56-4a17-830b-1539526636e4:rendered/screenshots/viewport.png
captureMethod: reused_evidence_capture_screenshot
mediaType: image/png
dimensions: 1366x768
bytes: 586268
sha256: 4f8daa9f45228a613e4a168ffd6ecd82e9464364f7037e3b8c5644ad7be5f1f8
status: ready
immutable: true
```

The original thumbnail points to the persisted Evidence Capture screenshot. It
does not point to a representative imported image.

## Iteration 1 Thumbnail Identity

```text
artifactId: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639
source bundle: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
bundleSha256: c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa
captureMethod: rendered_durable_generated_preview
mediaType: image/png
dimensions: 1440x900
bytes: 403029
sha256: 6323eab2fb5251263358931d04eda3765a3dc6b7f2a9bf935061a3597bf34596
status: ready
immutable: true
```

## Iteration 2 Thumbnail Identity

```text
artifactId: website_version_thumbnail_a71501efe316a082c6b6534da699264f
source bundle: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
bundleSha256: 39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03
captureMethod: rendered_durable_generated_preview
mediaType: image/png
dimensions: 1440x900
bytes: 99211
sha256: f6be158074979f56ed360da1f9d0a827deaef71ae314dd6ebaa4128501e693a5
status: ready
immutable: true
```

## Source And Bundle Lineage

Original lineage:

```text
Evidence Capture screenshot
-> website_version_thumbnail original
```

Iteration 1 lineage:

```text
WebsiteGenerationPackage
-> Provider Payload v1
-> GeneratedWebsiteProposal v1
-> GeneratedProposalBundle v1
-> website_version_thumbnail Iteration 1
```

Iteration 2 lineage:

```text
WebsiteGenerationPackage
-> GenerationImprovementPlan
-> Provider Payload v2
-> GeneratedWebsiteProposal v2
-> GeneratedProposalBundle v2
-> website_version_thumbnail Iteration 2
```

The generated thumbnails point to exact durable Generated Proposal Bundle
artifacts. They do not depend on local proposal folders, and no upstream
artifact was modified during WVT verification or closeout.

## Immutability Model

Artifacts are validated as `website_version_thumbnail`, `ready`, safely
servable, immutable, and private presentation derivatives. Equivalent retries
reuse deterministic artifact IDs and do not append duplicates. Current
selectors ignore unavailable, invalid, blocked, or stale artifacts.

## Idempotency Result

Recorded WVT-1-VERIFY idempotency:

```text
thumbnail count before writes: 0
thumbnail count after first persist: 3
thumbnail count after exact retry: 3
Original artifact ID reused: yes
Iteration 1 artifact ID reused: yes
Iteration 2 artifact ID reused: yes
hashes stable: yes
duplicates appended: no
```

Closeout did not rerun production materialization.

## Private Route Model

Private routes:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/original
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/iterations/1
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e/thumbnails/iterations/2
```

Routes require superadmin authentication, load persisted thumbnail records, and
serve persisted bytes only. They perform no capture, no write, no filesystem
path read, no arbitrary artifact-ID lookup, and no external URL proxying.

Unauthenticated production `GET` requests returned `401` with `no-store`,
`nosniff`, and `no-referrer`. Unsupported `POST` returned `405`. Focused route
tests cover authenticated image response headers, content length, ETag, private
immutable cache behavior, `nosniff`, `no-referrer`, fail-closed unavailable
behavior, and no synthesis of missing generated thumbnails.

## Production Workspace Verification

Authenticated production Workspace:

```text
https://app.pasadenagenerator.com/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Closeout browser verification confirmed:

- title identity includes `www.odv-cvijanovic.si`
- Original versus Latest visual comparison is visible
- Original displays the persisted source screenshot at natural size `1366x768`
- Latest displays the persisted Iteration 2 thumbnail at natural size `1440x900`
- Website Evolution displays Original, Iteration 1, and Iteration 2 thumbnails
- Future remains an intentional empty state
- no broken thumbnail image appears for completed versions
- Original is labelled as source/original screenshot evidence
- generated thumbnails are labelled as generated proposal thumbnails
- Iteration 2 remains quarantined, not approved, and not published
- Open Preview/Open Latest Preview links target the authoritative source or
  durable generated preview destinations
- no mutation controls were introduced

## Production Evolution Verification

Authenticated production Evolution Dashboard:

```text
https://app.pasadenagenerator.com/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Closeout browser verification confirmed:

- Iteration 1 thumbnail is visible at natural size `1440x900`
- Iteration 2 thumbnail is visible at natural size `1440x900`
- both thumbnails map to their historical iterations
- both preview links remain functional
- both generated preview pages preserve quarantined/not-published messaging
- no broken images were observed
- compliance and Evolution Analysis remain read-only and unchanged
- no approval, publishing, recomputation, or mutation controls were introduced

## Filesystem Independence

The WVT-1-VERIFY record proves local folders were temporarily renamed:

```text
ODV_GENERATED_PROPOSAL_001 -> ODV_GENERATED_PROPOSAL_001.wvt-temp
ODV_GENERATED_PROPOSAL_002 -> ODV_GENERATED_PROPOSAL_002.wvt-temp
```

Generated thumbnail materialization still produced the same IDs, byte counts,
and hashes from persisted Generated Proposal Bundle storage. The folders were
restored. Closeout did not repeat folder renaming.

## Authentication And Security Summary

The thumbnail surface remains private and fail-closed:

- superadmin-only routes
- no public/shareable thumbnail access
- no anonymous positive path
- no arbitrary artifact-ID parameter
- no external URL proxy behavior
- no filesystem path parameter
- no credential/cookie/token persistence
- no auth weakening
- no public preview route

Authenticated positive-header inspection in production remains limited by the
browser tooling. The route tests cover positive headers; production browser
verification independently confirmed image loading, media decoding, natural
dimensions, and authoritative route URLs.

## DB-Pool Result

Closeout read-only durable-state verification reported:

```text
total=1
idle=1
waiting=0
```

No orphan browser capture process, open materialization process, pool
exhaustion, or new DB pooling logic was introduced.

## Approved Production Mutation Summary

The only approved production writes were the three immutable
`website_version_thumbnail` artifacts listed above. WVT-1-CLOSEOUT performed no
production writes, no thumbnail capture, no materialization retry, no provider
execution, no AI execution, no publishing, no deployment, and no DNS mutation.

## No-Write-Beyond-Scope Result

Existing verification records and closeout checks confirm no mutation occurred
to Evidence Capture source screenshots, raw imported artifacts, asset registry,
Generated Proposal Bundles, Generated Website Proposals, Provider Payloads,
WGP, Improvement Plan, OWM, Compliance, Compliance Reports, Evolution Analysis,
Business Discovery, DBT, WDB, Workspace state, publishing state, domains, DNS,
schema, migrations, or workers.

## Known Limitations

- thumbnails are private and superadmin-only
- no public/shareable thumbnail access exists
- no recurring or automatic capture worker exists
- thumbnail generation currently requires explicit materialization
- no thumbnail lifecycle UI exists
- no thumbnail management or recapture controls exist
- original source thumbnail uses the persisted capture available for that import
- thumbnails represent a fixed viewport, not a full-page scroll
- live previews remain authoritative for interaction
- generated proposals remain quarantined, non-compliant, not approved, and not
  published
- repo-wide `tsc --noEmit` still has unrelated existing failures
- authenticated production positive-header inspection remains tooling-limited

## Milestone Status

COMPLETE.

Website Version Thumbnail runtime is implemented, ODV production thumbnails are
durably persisted and independently retrievable, Workspace and Evolution
consume real persisted thumbnails, filesystem independence and idempotency are
verified, security remains fail-closed, and the milestone is closed.

## Next Recommended Track

Proceed to continuity delivery pipeline design. Do not start Proposal v3,
public thumbnail sharing, thumbnail workers, scheduled capture, Workspace or
Evolution redesign, WDB/WGP mutation, provider execution, AI execution,
publishing, generated website deployment, DNS mutation, schema work, or
Business Approval without a separate explicit phase.
