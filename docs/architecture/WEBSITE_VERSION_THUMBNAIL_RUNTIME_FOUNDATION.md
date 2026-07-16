# Website Version Thumbnail Runtime Foundation

WVT-1 adds one immutable `website_version_thumbnail` presentation artifact for source and generated website versions.

The thumbnail is a private product-UX derivative only. It is not source truth, a generated proposal, an observed website model, an approval signal, a publishing artifact, a deployment artifact, or a replacement for the durable interactive preview.

## Ownership Model

The selected model is hybrid: immutable thumbnail for cards and timelines, live authoritative preview on click.

Supported version kinds:

- `original_source`
- `generated_iteration`

Supported capture methods:

- `reused_evidence_capture_screenshot`
- `rendered_durable_generated_preview`

The MVP image format is PNG. Generated captures use the canonical 1440 x 900 opening viewport with device scale factor 1 and `fullPage=false`. Reused source screenshots preserve their truthful persisted dimensions and full-page/viewport metadata.

## Persistence

Persistence uses the existing site-version `importProvenanceSummary` boundary. No table or migration is added.

Artifacts append to `websiteVersionThumbnailArtifacts`; equivalent retries reuse the same deterministic artifact ID. Current selectors return only `ready` thumbnails. Stale or unavailable artifacts remain historical records but are not selected for current cards.

## Serving

The read route is superadmin-only:

- `/gnr8/admin/workspace/[siteVersionId]/thumbnails/original`
- `/gnr8/admin/workspace/[siteVersionId]/thumbnails/iterations/[iteration]`

The route serves persisted bytes only. It performs no capture, no persistence, no filesystem reads, no URL proxying, and no generation. Responses include content type, content length, immutable private cache headers, ETag, `nosniff`, and `no-referrer`.

## Materialization

Original thumbnails reuse persisted raw-import screenshot bytes. If screenshot references exist but exact bytes cannot be loaded from the raw imported site artifact, materialization reports `SOURCE_SCREENSHOT_BYTES_UNAVAILABLE` and does not fall back to representative imported assets.

Generated thumbnails require the exact durable Generated Proposal Bundle and the existing superadmin preview route. The materializer is injectable for tests and browser-backed for controlled authenticated operator capture. WVT-1-VERIFY added the preferred internal persisted-bundle capture path: when no external authenticated preview URL is supplied, the materializer renders the persisted bundle through an in-memory internal preview origin and captures it with Playwright. This preserves preview security, uses persisted bundle bytes only, avoids anonymous HTTP, avoids cookies, and avoids local proposal folders.

## ODV Status

Target site version:

`09dce7ea-d860-4f60-a1eb-26c3335b302e`

Prepared generated bundle targets:

- Iteration 1: `generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4`
- Iteration 2: `generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075`

WVT-1 originally performed no production thumbnail writes. WVT-1-VERIFY later used explicit operator approval to persist exactly three ODV `website_version_thumbnail` artifacts:

```text
Original: website_version_thumbnail_553d438ae24a13985fc18f99debfa55d
Iteration 1: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639
Iteration 2: website_version_thumbnail_a71501efe316a082c6b6534da699264f
```

Canonical verification record:

```text
docs/architecture/ODV_WEBSITE_VERSION_THUMBNAIL_PRODUCTION_VERIFICATION.md
```

Canonical closeout record:

```text
docs/architecture/WEBSITE_VERSION_THUMBNAIL_CLOSEOUT.md
```

The prepared CLI still defaults to dry-run:

`pnpm exec tsx gnr8/architecture/website-version-thumbnail-odv.cli.ts --target=all`

Production materialization has completed for the three approved ODV records only. Equivalent retries reuse the same IDs and do not append duplicates.

WVT-1-CLOSEOUT confirmed all three production records remain present,
unchanged, independently retrievable, private, immutable, and operational in
Workspace and Evolution. The milestone is COMPLETE. Thumbnails remain private
presentation derivatives only; live source and durable generated previews
remain authoritative.

Next recommended track: continuity delivery pipeline design.

## Limitations

- Original source thumbnail availability depends on exact persisted screenshot bytes in raw imported site storage.
- Generated capture requires a safe authenticated or internal persisted-bundle capture context; WVT-1 does not add anonymous/public preview access.
- No worker, queue, recurring job, public URL, publishing, deployment, provider execution, or proposal regeneration is introduced.
