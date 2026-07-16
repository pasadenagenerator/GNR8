# Knowledge Workspace Product Polish

## Phase

GX-2 - Knowledge Workspace Real-Target Verification and Product UX Polish

## Status

Implemented as a read-only UX refinement over the GX-1 Knowledge Workspace.

## Target

ODV site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Workspace route:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Boundary

GX-2 changes the Workspace presentation and product wording only. It reuses
the existing Business Foundation, Source Website Understanding, and Generation
Evolution projections.

GX-2 does not change Business Discovery, Website Understanding, DBT, WDB,
WGP, generation, compliance, evolution logic, persistence, schema, API,
workers, AI, publishing, deployment, DNS, editing, mutation controls, or
server actions.

## Product UX Changes

The Workspace now prioritizes first-inspection understanding in this order:

```text
Hero
-> Website Versions
-> Business Understanding
-> Visual Identity
-> Current Knowledge Gaps
-> Workspace Health
-> Transformation Story
-> Advanced
```

The Hero now foregrounds:

- business name
- original website
- latest iteration
- generation status
- compliance status
- improvement status
- current recommendation
- workspace confidence

Primary actions are limited to read-only navigation:

- Open Original Website
- Open Latest Preview
- Open Evolution

Secondary supporting links remain:

- Open Business Foundation
- Open Website Understanding

## Website Versions

Version cards now distinguish:

- Original Website
- Iteration 1
- Iteration 2
- Future iterations

Generated iteration cards are explicitly labeled as quarantined generated
proposals. Iteration 2 is emphasized when it is the latest persisted
iteration. Cards show status, preview, compliance, recommendation,
improvement, and Open Preview. They do not imply a published website.

## Preview Presentation

GX-2 kept the existing preview UX. P0 Durable Generated Proposal Preview
Runtime Foundation changed only the preview source:

- original/source visual previews use existing imported asset preview routes
- generated proposal previews use existing Evolution preview routes in an iframe
- those Evolution preview routes now reconstruct from persisted
  `generated_proposal_bundle` artifacts, not from local
  `ODV_GENERATED_PROPOSAL_001/` or `ODV_GENERATED_PROPOSAL_002/` directories

No screenshot generation, image pipeline, storage, or proposal asset mutation
was added to the Workspace UX.

Canonical durable preview record:

```text
docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md
```

P0-VERIFY production materialized both ODV generated proposal bundles:

```text
Iteration 1: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
Iteration 2: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
```

Production Workspace verification confirmed:

- the ODV Workspace route loaded in an authenticated superadmin browser
- `PREVIEW_UNAVAILABLE` was absent
- Iteration 1 and Iteration 2 preview links were present
- Iteration 1 and Iteration 2 preview iframe sources were present
- generated proposal wording remained quarantined and did not imply published
  or approved state
- no Workspace redesign or mutation controls were introduced in P0-VERIFY

P0-CLOSEOUT later confirmed both production preview URLs remain operational,
both Workspace preview links and iframe sources remain present, and the
previews continue to be presented as quarantined generated proposals rather
than published or approved websites.

Canonical production verification record:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_PRODUCTION_VERIFICATION.md
```

Canonical closeout record:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_CLOSEOUT.md
```

`<img>` remains intentional for imported preview assets and logo candidates.
Those URLs are runtime preview-asset routes under the authenticated app
boundary; using Next/Image would introduce optimizer fetch behavior and remote
pattern concerns that are outside GX-2 and could blur the existing security
boundary. The build warning is therefore documented rather than silenced.

## Visual Identity

Visual Identity now uses explicit product states:

- Observed
- Candidate
- Needs confirmation
- Unavailable

Unavailable logo, colors, typography, images, icons, or fonts explain why the
signal is unavailable. The Workspace still does not promote visual candidates
into canonical CGP or brand truth.

## Business Understanding

Business cards now use operator wording:

- We know...
- GNR8 has not confirmed...
- This still requires confirmation...

Internal artifact language remains in Advanced only.

## Knowledge Gaps

Current Knowledge Gaps are ranked by business impact:

```text
Audience
-> Offerings
-> Brand
-> Differentiators
-> Trust signals
-> Typography
-> Colors
-> Logo confirmation
```

Every gap includes why it matters and current evidence. The Workspace remains
conservative when evidence is missing.

## Workspace Health

Health labels are product-facing and use existing runtime state only:

- Website Structure
- Business Understanding
- Visual Identity
- Generation Quality
- Compliance
- Readiness

No invented scores were introduced.

## Advanced

Advanced remains collapsed by default and retains artifact IDs, diagnostics,
evidence counts, DryRun IDs, Generation IDs, and limitations.

## Authenticated Verification

Production browser verification reached the deployed ODV Workspace at:

```text
https://app.pasadenagenerator.com/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The in-app browser had an authenticated superadmin session: the route loaded
without redirecting to `/login` or `/superadmin`.

Authenticated production navigation also confirmed that the deployed Business
Foundation, Website Understanding, and Evolution pages load without auth
redirects and include reciprocal `Open Knowledge Workspace` links.

Important limitation: production served the previously deployed GX-1
Workspace, not the local GX-2 code, because GX-2 does not deploy. Local
browser verification of the GX-2 page was blocked by the safe execution
policy: starting an unsandboxed local dev server with production database
credentials was rejected. No workaround was attempted.

That GX-2 limitation was superseded by P0-VERIFY and P0-CLOSEOUT: both
production preview pages now render from durable persisted bundle storage, and
Workspace keeps both preview links available without redesigning the UX.

## Tests

Focused GX-2 tests cover:

- Workspace layout and section composition
- Hero product fields
- Version card badges and latest-iteration emphasis
- Knowledge gap ranking
- Visual Identity states
- Advanced collapsed details
- Read-only navigation
- Mutation absence
- Preview rendering boundary
- Product wording

Command:

```text
pnpm exec tsx --test apps/platform/app/gnr8/admin/knowledge-workspace-page.test.ts
```

## Result

GX-2 makes the Knowledge Workspace a stronger first-stop operator console
without changing runtime architecture or mutating persisted state.

## VCU-0 Thumbnail Audit Relationship

VCU-0 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_REALITY_AUDIT.md` as a
documentation-only audit of Workspace thumbnail behavior. The audit finds that
Original Website cards currently use the first imported asset preview rather
than Evidence Capture screenshot evidence, and generated iteration cards set
`previewImageHref` to `null` while relying on live preview iframes.

VCU-0 does not create thumbnails, screenshot workers, new routes, new UI, new
storage, or preview behavior. The recommended thumbnail direction is a future
hybrid model: persisted screenshot thumbnails for cards with existing live
previews kept for click-through inspection.

## VCU-1 Thumbnail Relationship

VCU-1 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_SPECIFICATION.md`
and keeps the Workspace thumbnail model conceptual. Original Website cards
should eventually use persisted Evidence Capture screenshot thumbnails.
Generated Iteration cards should eventually use derived immutable screenshot
child artifacts associated with Generated Proposal Bundles. Existing live
preview routes remain the authoritative interactive click-through path.

VCU-1 does not create thumbnails, screenshot workers, new routes, new UI,
storage, preview behavior, WDB/WGP changes, Provider Payload changes,
generation, publishing, deployment, DNS, schema, API, workers, or production
mutation.

## VCU-2 Workspace Relationship

VCU-2 adds the read-only Content & Visual Continuity page and links it from the
Knowledge Workspace:

```text
/gnr8/admin/continuity/[siteVersionId]
```

The Workspace still does not generate thumbnails. VCU projects original-source
thumbnail readiness only; ODV and ViroiDoc both have existing source screenshot
references but no safe screenshot access ref yet, so Workspace thumbnail
suitability remains blocked. Generated iteration thumbnails remain outside VCU
and outside this phase.
