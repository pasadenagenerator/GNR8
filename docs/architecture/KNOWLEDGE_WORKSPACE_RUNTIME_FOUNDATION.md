# Knowledge Workspace Runtime Foundation

## Phase

GX-1 - GNR8 Knowledge Workspace Foundation

## Status

Implemented as a read-only runtime UX foundation.

GX-2 adds product polish over this foundation without changing the runtime
architecture. Canonical polish record:

```text
docs/architecture/KNOWLEDGE_WORKSPACE_PRODUCT_POLISH.md
```

WVT-1-CLOSEOUT confirms the ODV Workspace consumes private immutable Website
Version Thumbnail records for Original Website, Iteration 1, and Iteration 2.
The Workspace remains read-only: thumbnails are presentation derivatives only,
and source/durable generated previews remain authoritative.

Canonical WVT closeout record:

```text
docs/architecture/WEBSITE_VERSION_THUMBNAIL_CLOSEOUT.md
```

## Target

ODV site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Workspace route:

```text
/gnr8/admin/workspace/[siteVersionId]
```

ODV workspace route:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Purpose

The Knowledge Workspace is the first operator-first home for everything GNR8
currently understands about one website.

It is not an artifact explorer first.

It is a product workspace that lets a first-time operator understand the
website, latest generated proposal, quality state, and current gaps without
opening Business Foundation, Website Understanding, Evolution, and preview
pages one by one.

## Runtime Boundary

GX-1 adds no new canonical artifact and no runtime mutation.

The Workspace composes existing runtime projections:

- Business Foundation projection.
- Source Website Understanding projection.
- Generation Evolution Dashboard projection.

It does not modify:

- Business Discovery.
- Website Understanding.
- Digital Business Twin.
- Business Understanding Report.
- Business Alignment.
- Website Design Brief.
- Website Generation Package.
- Generation.
- Compliance.
- Evolution logic.
- Persistence.
- Schema.
- API.
- Workers.
- AI.
- Publishing.
- Deployment.
- DNS.

## Projection Composition

New composition file:

```text
apps/platform/gnr8/architecture/knowledge-workspace-projection.ts
```

The projection loader calls only existing read loaders:

- `loadGenerationBusinessFoundationProjection(...)`
- `loadSourceWebsiteUnderstandingProjection(...)`
- `loadGenerationEvolutionDashboardProjection(...)`

It then normalizes those projections into product-facing workspace sections:

- Workspace Hero.
- Website Versions.
- Business Understanding.
- Visual Identity.
- Transformation Story.
- Current Knowledge Gaps.
- Workspace Health.
- Advanced.

The composition is deterministic and read-only. It writes no records and does
not recompute downstream runtime artifacts.

## Product Language Boundary

The main Workspace uses product language:

- Understand.
- Design.
- Generate.
- Evaluate.
- Improve.
- Website imported.
- Website understood.
- Business understood.
- Website planned.
- Website generated.
- Website evaluated.
- Website improved.

Internal artifact names remain in Advanced disclosure sections only.

## Sections

GX-2 first-inspection order is:

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

### 1. Workspace Hero

Shows business name, original website URL, latest iteration, generation
status, compliance status, improvement status, current recommendation, and
workspace confidence.

Primary read-only links:

- Open Original Website.
- Open Latest Preview.
- Open Evolution.

Secondary read-only links:

- Open Business Foundation.
- Open Website Understanding.

### 2. Website Versions

Shows timeline cards for:

- Original Website.
- Iteration 1.
- Iteration 2.
- Future iterations.

Generated iteration previews use existing Evolution preview routes only.
Generated versions are labeled as quarantined generated proposals and never
imply a published website. The latest persisted iteration is visually
emphasized.

WVT-1-VERIFY activated persisted thumbnails for the ODV version timeline:

```text
Original: website_version_thumbnail_553d438ae24a13985fc18f99debfa55d
Iteration 1: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639
Iteration 2: website_version_thumbnail_a71501efe316a082c6b6534da699264f
```

The Workspace still opens existing authoritative destinations on click:
Original opens the source/original URL, and generated versions open durable
Evolution preview routes. Thumbnails are private presentation derivatives and
do not imply approval, publication, or deployment.

### 3. Business Understanding

Shows human-readable cards for:

- Identity.
- Purpose.
- Offerings.
- Audience.
- Goals.
- Trust.
- Brand.
- Content.

Each card separates Known, Unknown, Needs confirmation, and Confidence.

### 4. Visual Identity

Shows only persisted visual evidence:

- Logo candidate.
- Primary colors.
- Typography candidates.
- Imported images.
- Imported icons.
- Imported fonts.

Missing visual identity signals are explained rather than fabricated.
Signals are labeled as Observed, Candidate, Needs confirmation, or Unavailable.
Candidates are never promoted into canonical brand truth or CGP.

### 5. Transformation Story

Maps the runtime chain into product language:

```text
Website imported
-> Website understood
-> Business understood
-> Website planned
-> Website generated
-> Website evaluated
-> Website improved
```

Each stage links to the supporting runtime page.

### 6. Current Knowledge Gaps

Prioritizes:

- Audience.
- Offerings.
- Brand.
- Differentiators.
- Trust signals.
- Typography.
- Colors.
- Logo confirmation.

Each gap explains why it matters for future generation quality.

### 7. Workspace Health

Shows human-readable states based on existing runtime state only:

- Website structure.
- Business understanding.
- Visual identity.
- Generation quality.
- Compliance.
- Evolution.
- Readiness.

No invented scores are introduced.

### 8. Advanced

Technical details are collapsed under `details/summary`:

- Artifact Explorer.
- Diagnostics.
- IDs.
- Evidence counts.
- Limitations.
- DryRun IDs.
- Generation IDs.

## Navigation

The new top-level navigation relationship is:

```text
Workspace
-> Business Foundation
-> Website Understanding
-> Evolution
-> Proposal Preview
```

GX-1 also adds reciprocal read-only `Open Knowledge Workspace` links to:

- Business Foundation.
- Website Understanding.
- Generation Evolution Dashboard.

## Reusable UI Components

New reusable read-only components:

```text
apps/platform/app/gnr8/admin/workspace/[siteVersionId]/knowledge-workspace-components.tsx
```

Components:

- `WorkspaceHero`
- `KnowledgeCard`
- `WorkspaceMetric`
- `VersionCard`
- `VisualIdentityCard`
- `GapCard`
- `HealthCard`
- `StoryTimeline`
- `AdvancedDetails`

The components render links and read-only cards only. They render no forms,
inputs, buttons, editable controls, or mutation controls.

## Validation

Focused test:

```text
pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test \
  apps/platform/app/gnr8/admin/knowledge-workspace-page.test.ts \
  apps/platform/app/gnr8/admin/business-foundation-page.test.ts \
  apps/platform/app/gnr8/admin/website-understanding-page.test.ts \
  apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Required build:

```text
cd apps/platform && pnpm run vercel-build
```

Diff safety:

```text
git diff --check
```

GX-1 validation status:

- Focused admin UX tests pass.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.
- Local ODV browser navigation to the Workspace route redirects to `/login`
  without a signed-in superadmin browser session. The route is therefore
  confirmed auth-gated in the browser, but authenticated Workspace DOM
  verification became the GX-2 follow-up.

GX-2 validation status is recorded in:

```text
docs/architecture/KNOWLEDGE_WORKSPACE_PRODUCT_POLISH.md
```

GX-3 should verify the deployed GX-2 Workspace after deployment.

## Success Criteria

The Workspace becomes the page every operator opens first.

Business Foundation, Website Understanding, Evolution, and future modules are
supporting pages.

The Workspace remains read-only and adds no editing, generation,
regeneration, approval, publishing, deployment, DNS, persistence, schema, API,
worker, AI, or runtime architecture changes.

## KWX-3 Visual Command Center Relationship

KWX-3 promotes the Knowledge Workspace from an operator card collection into
the primary visual command center for one website.

Canonical record:

```text
docs/architecture/KNOWLEDGE_WORKSPACE_VISUAL_COMMAND_CENTER.md
```

The Workspace now prioritizes Original Website, Latest Proposal, evolution,
known facts, recognizable continuity, unresolved knowledge, and the next
recommended action. Business Foundation, Website Understanding, Source Content
& Visual Continuity, and Generation Evolution remain supporting inspection
pages.

KWX-3 adds deterministic read-only projection composition only. It adds no
source parsing, screenshot capture, thumbnail generation, persistence, schema,
API, worker, AI, confirmation mutation, proposal regeneration, approval,
publishing, deployment, DNS, or runtime mutation behavior.
# WVT-1 Update

The runtime foundation consumes the WVT-1 thumbnail projection as presentation-only state. Thumbnail reads are authenticated, read-only, and backed by site-version provenance artifacts; Workspace does not capture, persist, regenerate, approve, publish, or deploy from the page render path.
