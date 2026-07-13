# Business Foundation Product UX Transformation

## Phase Boundary

MVP-3.1-A transforms the ODV Business Foundation page from a
diagnostic-first artifact surface into a story-first product experience.

Target site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Target route:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

This phase is read-only. It extends runtime projections and page
information architecture using existing persisted data only. It does not add
business editing, Business Alignment correction UX, AI interpretation, new
business facts, CGP inference, asset extraction, generation controls,
regeneration controls, provider execution, approval, publishing, deployment,
DNS mutation, schema changes, persistence changes, workers, or mutation
server actions.

## Previous UX Problem

The MVP-3.0-C/D Business Foundation page was accurate, but it opened as a
technical diagnostic surface. Artifact IDs, dry-run markers, evidence counts,
and terse attention codes were more prominent than the business story.

That made it harder for a non-technical operator to answer the first product
questions:

- Which business did GNR8 import?
- Where is the original website?
- What does GNR8 currently understand?
- What is still unresolved?
- Which visual identity and original assets are available?
- Which generated website iterations can be inspected?

## New Story-First Hierarchy

MVP-3.1-A changes the top-level hierarchy to:

1. Business Hero
2. Website Versions
3. What GNR8 Understands
4. Offerings and Audience
5. Detected Brand & Visual Identity
6. Original Imported Assets
7. What GNR8 Still Needs to Know
8. Transformation Story
9. Advanced: Evidence, Lineage & Canonical Artifacts

The primary experience now starts with the observed business identity,
original website, business description, website purpose, current
understanding state, and the most important missing-knowledge summary.
Technical lineage remains available, but it is moved into the advanced
section.

## Runtime Projection Extensions

The runtime projection remains a read model only:

```text
apps/platform/gnr8/architecture/generation-business-foundation-projection.ts
```

MVP-3.1-A adds product-facing projection concepts for:

- Business hero
- Source website
- Generated iteration links
- Business narrative
- Product attention summary
- Visual identity
- Brand colors
- Typography
- Imported asset summary and previews
- Missing knowledge and generation risks
- Advanced technical details

These projections compose existing persisted data. They are not canonical
artifacts and are not persisted.

## Source Website Linking

The original website link is sourced from the persisted imported-site
artifact metadata when available. The page displays the hostname, full source
URL, imported timestamp when present, and a read-only external link using
safe external-link behavior.

If the source URL is unavailable, the page states:

```text
Original website URL is not available in the current persisted evidence.
```

No URL is constructed or guessed.

## Generated Iteration Linking

The Website Versions section appears near the top and presents:

```text
Original Website
↓
Iteration 1 - Generated Proposal Preview
↓
Iteration 2 - Generated Proposal Preview
```

The iteration links come from the existing evolution dashboard projection and
existing preview routes. MVP-3.1-A does not recompute evolution or
compliance.

Iteration 2 is visually emphasized as the latest quarantined generated
proposal. It is explicitly not approved, not published, still non-compliant,
and a measurable improvement over Iteration 1 with no regressions according
to existing persisted evolution data.

## Business Narrative

The page now presents a concise business-readable narrative before evidence
details. It deterministically formats existing persisted statements from the
business foundation chain, including observed identity, apparent website
purpose, business goals, trust signals, digital presence, and unresolved
knowledge.

The narrative does not call AI, does not reinterpret raw evidence into new
business truth, and does not add new business facts.

## Offerings And Audience

Offerings and Audience are product-facing panels.

For ODV, the page explicitly communicates that GNR8 has not yet confirmed
the service portfolio and that the target audience remains unresolved. The
page avoids making "0 known offerings" the primary operator message without
context.

## Visual Identity And CGP Coverage

The Visual Identity section distinguishes detected, partially detected, not
available, and unresolved states.

For ODV in MVP-3.1-A:

- no confirmed logo preview is available
- no canonical brand colors are persisted
- typography was not captured as canonical brand knowledge
- tone and style statements remain limited to persisted upstream signals
- imported assets may contain visual cues, but the page does not claim a
  complete CGP capture

No color extraction, font guessing, or logo inference is added.

## Imported Asset Coverage

The Imported Assets section summarizes original imported assets from the
existing imported-site artifact metadata. It distinguishes logo candidates,
content images, decorative images, icons, fonts, videos, other files, and
unclassified assets.

The gallery shows a reasonable sample of original imported assets and their
references. It does not merge generated proposal assets into the original
asset gallery. Generated assets remain part of their iteration preview and
history.

When a logo preview is not safely available, the page shows the asset
reference state instead of exposing a filesystem path or creating an unsafe
asset endpoint. Non-logo visual assets are presented as imported-asset
records with verified preview availability status rather than being labeled
as brand assets.

## Missing CGP Limitations

The page moves the large limitation ledger out of the top-level experience.
The operator-facing "What GNR8 Still Needs to Know" section prioritizes the
material missing areas:

- target audience
- service portfolio and offerings
- canonical brand colors
- canonical typography
- logo confirmation when unresolved
- differentiators and trust evidence when missing upstream

Each major gap includes a conservative generation-impact label, such as
affecting generation confidence, message accuracy, audience targeting,
service hierarchy, or visual brand fidelity when that impact is represented
by existing limitations or recommendations.

## Advanced Technical Disclosure

Advanced details are grouped under:

```text
Advanced: Evidence, Lineage & Canonical Artifacts
```

This section contains site version IDs, dry-run IDs, evidence counts,
diagnostic markers, full artifact IDs, detailed knowledge-group evidence,
limitations, contract versions, and the Artifact Explorer.

The Artifact Explorer remains read-only and groups business artifacts into:

- Understanding
- Alignment
- Website Intent

Provider payloads, generated proposals, compliance artifacts, and evolution
artifacts are not added to the business artifact explorer.

## Real ODV Browser Result

Authenticated superadmin browser verification loaded the ODV route locally
and confirmed:

- the hero is understandable and no longer leads with `dryRunId`
- the original website link is present and uses the persisted source URL
- Iteration 1 and Iteration 2 preview links are visible near the top
- the Evolution Dashboard link is visible in both the hero and version area
- offerings and audience are visibly unresolved
- Visual Identity states logo, colors, and typography gaps honestly
- imported original assets are summarized without claiming all images are
  brand assets
- advanced technical lineage is secondary
- desktop layout uses the available width more effectively
- no mutation controls, forms, editable fields, provider controls, approval
  controls, publishing controls, or generation controls are present

## Upstream Data Gaps

MVP-3.1-A intentionally exposes the following upstream gaps instead of
filling them:

- no confirmed service portfolio
- no confirmed target audience
- no canonical brand colors
- no canonical typography
- no confirmed logo preview for ODV
- visual identity remains partial
- generated proposals remain quarantined and non-compliant overall

Recommended next phase:

```text
MVP-3.1-B - Business Foundation Upstream Evidence Gap Planning
```

Keep the next phase read-only and source-evidence focused. Do not add
Business Alignment correction UX, generation, provider execution, AI
execution, approval, publishing, deployment, schema changes, persistence
changes, or workers.

## MVP-3.1-B Upstream Gap Planning Result

MVP-3.1-B completed the read-only upstream evidence-gap analysis for ODV.
Canonical record:

```text
docs/architecture/BUSINESS_FOUNDATION_UPSTREAM_EVIDENCE_GAP_PLAN.md
```

The MVP-3.1-A UX is correct to expose gaps. ODV lacks canonical offerings,
audience, logo, colors, typography, and complete CGP knowledge because the
current business chain does not classify or govern those candidates from raw
HTML, CSS, imported asset metadata, body copy, or structured logo evidence.

Imported evidence exists: body copy contains service and audience signals,
the HTML contains a logo candidate with `alt="Logo"` plus structured logo
metadata, CSS contains repeated visual color signals, and the imported file
map contains `17` font files. These are candidates only. They must not become
canonical truth without deterministic source refs, confidence, conflict
visibility, and human confirmation.

Recommended next phase:

```text
MVP-3.1-C - Asset Evidence Classification and Visual Identity Candidate Planning
```

Keep that phase candidate-only and original-import focused. Do not mutate DBT,
edit Business Alignment, persist canonical visual identity, regenerate WDB/WGP,
call AI, or publish anything.
