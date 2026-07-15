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

GX-2 keeps the existing preview boundary:

- original/source visual previews use existing imported asset preview routes
- generated proposal previews use existing Evolution preview routes in an
  iframe

No screenshot generation, image pipeline, storage, or proposal asset mutation
was added.

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

The deployed Iteration 2 preview route did not produce a normal document tab
during this pass, so full deployed preview-page verification remains a GX-3
deployment-verification item after GX-2 is deployed.

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
