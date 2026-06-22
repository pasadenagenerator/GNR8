# Candidate Context Review UI Integration Design

## Phase And Boundary

Phase 8D-23 designs how the existing read-only
`CandidateContextProjection` should appear on the existing Candidate Review
page. This phase is documentation and architecture only. It adds no UI or
projection implementation and changes no Candidate Context Projection,
Candidate Review, Review Action, Review API, Evidence Capture, Candidate
Discovery, Reconstruction, AI, Publishing, schema, or worker behavior.

The integration exists to let an operator see the persisted visual evidence for
the exact candidate before choosing Approve, Reject, or Defer. It does not
interpret evidence, recommend a decision, or expand what approval authorizes.

```text
Candidate
  -> View context
  -> Existing screenshot and optional evidence-backed highlight
  -> Approve / Reject / Defer
```

## UI Placement

### Options Assessed

**A. Inline inside each candidate card.** Always-visible imagery would preserve
local context but make the review page long, visually dense, and expensive to
scan when many candidates share the same full-page screenshot.

**B. Expandable `View context` panel.** Keeps visual evidence attached to the
exact candidate while preserving the current compact scan and action workflow.
The operator can expand context, inspect it, and decide without changing page or
losing the candidate's current action state.

**C. Modal or detail view.** Gives the image more isolated space but obscures or
separates the action controls, adds focus and dismissal state, and weakens
side-by-side comparison with the candidate's label and decision history.

**D. Dedicated side-by-side review layout.** Could support a later image-led
workflow, but it would substantially restructure the existing page and create
more selection, responsive-layout, and synchronization state than the first
integration requires.

### Recommendation

Recommend exactly **B - an inline expandable `View context` panel inside each
existing candidate card** for the first implementation.

The panel is collapsed by default. Its trigger remains visible near the
candidate summary and before the existing decision controls in reading order.
Expanding it must not change candidate selection, decision state, rationale,
action availability, or package identity. Existing Approve, Reject, and Defer
controls remain visible outside the panel so evidence inspection does not hide
or relocate the decision boundary.

## Visual Context Card

The expanded panel contains one read-only visual context card sourced only from
the exact candidate's `CandidateContextProjection`:

1. a full-page screenshot when the projection supplies one;
2. a CSS-rendered highlight overlay when the projection supplies one;
3. the existing readable candidate label;
4. the exact route path;
5. canonical `LOW`, `MEDIUM`, or `HIGH` confidence in operator-readable form;
6. a compact evidence summary;
7. visible limitations in operator language; and
8. projection diagnostics only inside a collapsed `Technical details`
   disclosure.

The screenshot is presented as evidence, not as an editable canvas. It should
fit the panel width while preserving its bitmap aspect ratio. The UI scales the
projection's document-coordinate highlight to the displayed image using the
projection's declared screenshot and coordinate metadata. It must not infer,
move, resize, or visually guess a highlight.

The evidence summary describes the available source categories and counts in
plain language, for example screenshot evidence, candidate evidence, model
evidence, and Dry Run references. Raw artifact paths, evidence refs, capture run
IDs, candidate IDs, rectangle coordinates, and projection diagnostics remain in
`Technical details`. Empty categories are omitted rather than presented as
successful evidence.

Limitations remain separate from projection diagnostics. Limitations that may
affect interpretation are visible near confidence; stable diagnostic codes and
raw refs are audit details. The panel adds no action recommendation and never
maps confidence or projection state to an automatic decision.

## Route Candidate Context

A Route candidate shows:

- the exact persisted desktop full-page screenshot for the candidate route;
- no highlight, because the full page is the candidate target;
- readable Route label and exact route path;
- route summary, including persisted source URL when available and Navigation
  and Section counts;
- canonical confidence, evidence summary, and limitations; and
- existing Approve, Reject, and Defer controls still visible outside the panel.

The absence of a Route highlight is intentional and must not render a warning,
empty overlay, or diagnostic. The UI must not create an artificial full-page
box.

## Navigation Candidate Context

A Navigation candidate shows:

- the exact persisted desktop full-page screenshot for the candidate route;
- the projection's single geometry-backed highlight around the navigation
  region;
- readable Navigation label and exact route path;
- canonical item count;
- ordered, non-empty navigation labels in projection order;
- canonical confidence, evidence summary, and limitations; and
- existing decision controls unchanged and visible outside the panel.

Long label lists may wrap or use a bounded presentation with an explicit
operator-controlled reveal, but must not be reordered, deduplicated, renamed,
or summarized by AI. The overlay is visual context only and is not interactive.

## Section Candidate Context

A Section candidate shows:

- the exact persisted desktop full-page screenshot for the candidate route;
- the projection's single geometry-backed highlight around the section region;
- the deterministic structural label;
- the exact route path;
- canonical confidence, evidence summary, and limitations; and
- existing decision controls unchanged and visible outside the panel.

The UI uses the structural label already supplied by the projection. It must not
infer business purpose, component type, content intent, or reconstruction
meaning from the highlighted region.

## Projection State UX

### Ready

Show the screenshot and, for Navigation and Section, the supplied highlight.
Route shows the screenshot without a highlight by design. Display confidence,
evidence summary, and limitations. The context panel itself adds no restriction
to the existing decision controls.

### Incomplete

Show the available screenshot and a prominent `Visual context incomplete`
warning explaining which contextual evidence is missing or ambiguous in safe
operator language. Do not invent or guess a highlight. Existing decision
controls remain available by default because a non-blocking evidence gap may
still support a human decision from the candidate and other evidence.

If the projection contains a limitation with `severity = "blocking"`, present
that limitation prominently as severe and recommend Defer. Phase 8D-23 does not
define new action disabling behavior; any future decision-blocking policy would
require its own explicit Review behavior design.

### Unavailable

Show a prominent `Visual evidence unavailable` warning, a short safe reason when
available, and an explicit recommendation to Defer until evidence is available.
Do not render a broken image, placeholder highlight, substitute route, live
page, newer capture, or unrelated screenshot.

The recommendation is operator guidance only. It does not select, submit, or
enforce Defer and does not change existing Review Action behavior. Technical
diagnostics remain collapsed.

## Loading And Presentation Rules

The future page must bind each context panel to the same exact Review Package,
Discovery artifact, site version, and candidate identity already rendered by
the candidate card. It must never follow an independent floating latest pointer
or reuse one candidate's projection for another candidate.

Opening or closing the panel is local presentation state only. A canonical
Review Package refresh may replace the rendered candidate set as it does today;
the context integration must not interfere with stale-package, replay, success,
error, rationale, history, or refresh behavior.

Image loading failure in the browser is presented as evidence unavailable for
that rendered panel and never causes fallback acquisition. The first
implementation creates no image crops, screenshots, thumbnails, or persisted
derivatives. The overlay is CSS only and is calculated from already projected
coordinates.

## Safety Constraints

The context panel is read-only and must expose no:

- AI prompt, model call, generated explanation, or recommendation engine;
- reconstruction control, plan, component inference, or handoff;
- publishing, deployment, or preview-generation control;
- candidate, screenshot, geometry, label, or evidence editing;
- crop generation, new screenshot capture, or evidence mutation;
- generated output, React/block generation, or CMS binding;
- batch, select-all, bulk decision, or multi-candidate action; or
- hidden action triggered by panel expansion, image load, or projection state.

Approve, Reject, and Defer remain the existing single-candidate Review Actions.
Approval remains a human review decision only and does not authorize or imply
reconstruction, generation, or publishing.

## First Implementation Scope

The first implementation should be limited to:

- integrating the existing read-only `CandidateContextProjection` into the
  existing superadmin Candidate Review page;
- one inline expandable `View context` panel per candidate card;
- existing full-page screenshot reuse only;
- no image crop generation and no new screenshots;
- a non-interactive CSS overlay from supplied projection coordinates only;
- Route without a highlight and Navigation/Section with supplied highlights;
- ready, incomplete, and unavailable presentation states;
- limitations visible and diagnostics inside collapsed `Technical details`;
- action controls remaining visible with all current behavior unchanged; and
- no new endpoint, persistence, schema, worker, capture, or Review mutation.

## Future Implementation Tests

Focused future tests should verify:

1. each candidate card can render and expand its context panel;
2. the panel uses the projection bound to the exact rendered candidate;
3. Route renders the full-page screenshot without a highlight;
4. Navigation renders the full-page screenshot with the supplied overlay;
5. Section renders the full-page screenshot with the supplied overlay;
6. Navigation item count and ordered labels render without semantic rewriting;
7. Section structural label, route path, and confidence render;
8. ready renders its expected screenshot and type-specific highlight state;
9. incomplete renders its warning and does not invent a highlight;
10. unavailable renders its evidence warning and Defer recommendation without
    a broken image or fallback evidence;
11. limitations are visible while diagnostics and raw refs remain inside
    `Technical details`;
12. panel expansion does not submit or alter a Review Action;
13. Approve, Reject, and Defer still submit through the existing behavior and
    canonical refresh path; and
14. AI, reconstruction, publishing, editing, generated-output, capture, and
    batch controls are absent.

## Phase 8D-23 Exit State

Phase 8D-23 selects one first UI placement and defines the visual card,
candidate-type presentation, projection-state UX, safety boundary, minimal
implementation scope, and future test contract. It changes documentation only.

Recommend exactly one next phase: **Phase 8D-24 - Candidate Context Review UI
Integration Implementation**, limited to the read-only expandable context panel
on the existing Candidate Review page and its focused tests.

## Phase 8D-24 Implementation Resolution

Phase 8D-24 implements the designed read-only integration on the existing
Candidate Review page. The page loads the Review package's exact linked
Candidate Discovery artifact, the matching First Limited Dry Run output, and
the existing Evidence Capture baseline, then builds the existing
`CandidateContextProjection` for every displayed candidate. It creates no
persistence, endpoint, capture, crop, screenshot, or derived image asset.

Every candidate card now contains a collapsed-by-default `View Context`
disclosure before the unchanged single-candidate action controls. Route renders
the full-page screenshot with no artificial highlight. Navigation and Section
render the exact projection rectangle as a non-interactive, visually distinct
CSS overlay and show their type-specific counts, labels, and structural
context. Coordinates are scaled from the declared document space; the bitmap
is reused without manipulation.

Ready shows the screenshot and compatible highlight. Incomplete keeps the
available screenshot and adds `Visual context incomplete`. Unavailable, or a
persisted screenshot that cannot be read for presentation, shows `Visual
evidence unavailable` without a broken image. None of these states disables,
selects, or changes Approve, Reject, or Defer.

The default view shows route, confidence, compact evidence counts, readable
limitations, and type-specific context. Screenshot paths, evidence refs,
geometry refs, lineage, and projection diagnostics remain inside the existing
collapsed candidate `Technical details`. Focused projection and page tests pass
`22 / 22`.

Recommend exactly one next phase: **Phase 8D-25 - Candidate Context Review UI
End-to-End Verification**, limited to read-only real-target UI verification on
ODV and ViroiDoc.
