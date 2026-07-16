# Knowledge Workspace Visual Command Center

KWX-3 - Knowledge Workspace visual command center

Primary route:

```text
/gnr8/admin/workspace/[siteVersionId]
```

Primary ODV target:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Product Role

Knowledge Workspace is the primary product surface for one website.

Business Foundation, Website Understanding, Source Content & Visual
Continuity, and Generation Evolution remain supporting inspection pages.

The Workspace now tells one compact story:

```text
Original Website
What GNR8 understood
What should remain recognizable
Iteration 1
What improved
Iteration 2
What still needs confirmation
Next recommended action
```

## UX Audit Findings

The deployed pre-KWX-3 Workspace still behaved like an admin console:

- The hero used product language but did not visually compare the original
  website and latest proposal above the fold.
- Website Evolution was presented as similar cards instead of a timeline.
- Original visual material could be represented by imported assets without a
  sufficiently explicit label.
- Business Understanding used repeated card copy and equal visual weight.
- Original visual signals and Source Content & Visual Continuity duplicated
  the same idea.
- Knowledge Gaps and Next Recommended Action overlapped.
- Supporting inspection pages appeared close in weight to the primary story.
- Advanced details were available but the primary view still exposed too much
  artifact vocabulary.

## New Information Hierarchy

The Workspace renders these read-only sections:

1. Command-center hero with website identity, original URL, generation cycle,
   current iteration, proposal state, evolution state, compliance state,
   plain-language interpretation, and current recommendation.
2. Original Website versus Latest Proposal visual comparison.
3. Website Evolution timeline: Original Website, Iteration 1, Iteration 2,
   Future.
4. Known Or Observed versus Needs Confirmation.
5. What Will Remain Recognizable.
6. Knowledge Progress rail.
7. Prioritized Knowledge Gaps.
8. One primary Next Recommended Action.
9. Secondary supporting inspection links.
10. Collapsed Advanced.

## Preview Truthfulness Rules

Original visual selection is deterministic and semantic:

```text
source_screenshot
source_preview
representative_source_asset
unavailable
```

Selection priority:

1. Existing source screenshot with safe access.
2. Existing source preview.
3. Representative imported source asset.
4. Honest unavailable state.

Representative imported assets are labelled:

```text
Representative imported image
```

Generated preview presentation is also semantic:

```text
live_generated_proposal_preview
persisted_generated_screenshot
bundle_cover_image
live_preview_available
generated_unavailable
```

Current generated previews use existing durable live preview routes where
available. KWX-3 does not capture screenshots, generate thumbnails, persist
new preview images, or create screenshot access routes.

## ODV Composition Result

WVT-1-VERIFY materialized the ODV original-source and generated-iteration
Website Version Thumbnail artifacts. The ODV Workspace now displays persisted
real thumbnails instead of representative or unavailable panels for completed
versions.

Persisted thumbnail IDs:

```text
Original: website_version_thumbnail_553d438ae24a13985fc18f99debfa55d
Iteration 1: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639
Iteration 2: website_version_thumbnail_a71501efe316a082c6b6534da699264f
```

The Latest Proposal panel uses the Iteration 2 persisted generated thumbnail
and keeps the existing authenticated live generated proposal preview route as
the click target. It is labelled as a quarantined generated proposal, not
approved and not published.

The deterministic interpretation explains the apparently contradictory state:

```text
Iteration 2 is meaningfully better than Iteration 1, but the website is not
ready for approval because offerings, audience, and visual identity still need
confirmation.
```

The primary recommendation is derived from ranked existing gaps, not hardcoded
for ODV.

## Continuity Showcase

The former separate visual-signal and continuity sections are consolidated as:

```text
What Will Remain Recognizable
```

It summarizes:

- Candidate logo, labelled confirmation required.
- Representative imported images, capped at six.
- Observed color signals, not brand colors.
- Typography candidates, with Fontello kept as icon-font evidence.
- Navigation, CTA, and contact signals.
- Key source content and layout continuity.

Raw asset inventories, full filenames, full font-file lists, evidence counts,
artifact IDs, and diagnostics stay in supporting pages or collapsed Advanced.

## Boundaries

KWX-3 is projection composition and UX only.

It does not add or change:

- source parsing
- source capture
- screenshot capture
- thumbnail generation
- thumbnail persistence
- asset extraction
- classifiers
- canonical knowledge
- Business Discovery
- Website Understanding
- VCU runtime truth
- DBT, WDB, WGP, Provider Payload
- compliance recomputation
- proposal regeneration
- Proposal v3
- approval, publishing, deployment, DNS
- schema, migrations, tables
- APIs, workers, AI execution
- forms, inputs, mutation controls, or server actions

No source or canonical artifact is mutated.

## Browser Verification

Authenticated production browser access initially reached the deployed ODV
Workspace and confirmed it was still the pre-KWX-3 UI. A later production
reload returned:

```text
Application error: a server-side exception has occurred
Digest: 1178603228
```

A read-only local projection probe then hit production database pool
exhaustion:

```text
EMAXCONNSESSION max clients reached in session mode
```

Because KWX-3 explicitly performs no deployment, the new command-center UI was
not production-verified in browser. The branch was verified by focused tests,
the platform production build, and static safety checks. Production browser
verification should be rerun after deployment and after the database pool
condition clears.

### WVT-1-VERIFY Browser Update

On 2026-07-16, authenticated production browser verification loaded the ODV
Workspace at:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Verified:

- Original Website thumbnail loaded real PNG bytes, natural size `1366x768`.
- Iteration 1 thumbnail loaded real PNG bytes, natural size `1440x900`.
- Iteration 2 thumbnail loaded real PNG bytes, natural size `1440x900`.
- Hero comparison displayed Original and latest Iteration 2 visually.
- Future remained an intentional empty state.
- Clicking Original still targets the source/original URL.
- Clicking Iteration 1 and Iteration 2 still targets durable preview routes.
- No broken images or generic gray placeholders remained for the three
  completed versions.

## Validation

Commands run:

```text
pnpm exec tsx --test apps/platform/app/gnr8/admin/knowledge-workspace-page.test.ts
pnpm exec tsx --test apps/platform/app/gnr8/admin/source-content-visual-continuity-page.test.ts
pnpm exec tsx --test apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.test.ts apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.test.ts apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.test.ts
cd apps/platform && pnpm run vercel-build
git diff --check
```

Result:

- Focused Workspace tests pass.
- Continuity page and VCU projection tests pass.
- Platform production build passes.
- `git diff --check` passes.

The build reports existing style/lint warnings for `<img>` preview surfaces and
unrelated hook/image warnings elsewhere. No build-blocking TypeScript failure
remains.

## Remaining Limitations

- Production browser verification of the new UI requires deployment.
- Production ODV route currently needs the server-side app error and database
  pool exhaustion to clear before verification can be completed.
- Original source screenshots do not yet have safe screenshot access refs for
  Workspace display.
- Generated iteration thumbnails remain unavailable unless already persisted by
  another system.
- Representative source images are useful but must remain labelled as
  representative, never as screenshots.

## Recommended Next Phase

KWX-4 should be a deployed verification and narrow UX tuning phase only:

- Deploy the KWX-3 Workspace.
- Reopen the production ODV Workspace as superadmin.
- Verify at 1440px, 1600px, and 1920px.
- Confirm no broken images, no mutation controls, Advanced collapsed, and the
  original/latest comparison above the fold.
- Do not add screenshot generation, thumbnail persistence, confirmation
  mutations, WDB/WGP enrichment, Provider Payload v3, Proposal v3, publishing,
  deployment of generated websites, DNS, or AI.
# WVT-1 Update

Knowledge Workspace now projects immutable `website_version_thumbnail` references when present. The Original Website card uses a persisted original-source screenshot thumbnail or an honest unavailable state; representative imported images are no longer used as Original Website thumbnails. Generated cards prefer persisted generated proposal thumbnails and keep durable live preview links for inspection.
