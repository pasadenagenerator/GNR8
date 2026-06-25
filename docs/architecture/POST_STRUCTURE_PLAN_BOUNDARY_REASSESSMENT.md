# Post-Structure Plan Boundary Reassessment

## Decision

Phase 8F-11 selects exactly one next major architectural boundary:

> **Option A - Layout Plan Foundation**

The safest and highest-value next layer after verified persisted
`StructurePlan` artifacts is a metadata-only `LayoutPlan` foundation. The next
boundary should convert the organized route, navigation, section, and assignment
metadata in the latest Structure Plan into explicit visual placement intent:
section order, grouping, region roles, density hints, layout constraints, and
source evidence refs. It must not generate React, blocks, content, CSS, CMS
schemas, runtime output, AI proposals, publishing artifacts, or editable
website state.

This document is an architectural assessment only. Phase 8F-11 adds no
Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review,
Review Actions, Reconstruction Package, StructurePlan contract, StructurePlan
builder, StructurePlan persistence, StructurePlan UI, AI, generation,
publishing, schema, worker, runtime, API, or UI behavior.

## Proven Starting Point

The verified deterministic chain is now:

```text
Import
  -> Evidence Capture
  -> Candidate Discovery
  -> Candidate Context
  -> Candidate Review
  -> Reconstruction Package
  -> StructurePlan
  -> Read-only StructurePlan UI
```

ODV and ViroiDoc prove that latest persisted `structure_plan` artifacts can be
loaded, projected, and inspected through the real admin chain. ODV has one
planned route, two planned sections, and three assignments. ViroiDoc has one
planned route, no planned sections, one assignment, and propagated limitations.
Both preserve exact Reconstruction Package, Review Package, Discovery Result,
`siteVersionId`, and `dryRunId` lineage.

The next unresolved question is not what is eligible or how approved candidates
are organized. Structure Plan answers that. The next question is how the
approved structure should be spatially arranged before any content, semantic
experience interpretation, component mapping, or code generation exists.

## Decision Criteria

| Option | Readiness | Dependencies | Migration value | Business value | GNR8 alignment | Generic CMS/builder risk |
|---|---|---|---|---|---|---|
| A. Layout Plan Foundation | Highest: StructurePlan already exposes route/section/navigation organization, and earlier evidence contains layout geometry and section boundary refs when available | Latest StructurePlan; linked ReconstructionPackage; evidence/context lineage as supporting refs | High: begins the canonical layout graph path without output generation | High: makes migration shape inspectable and reviewable before rendering | Strongest immediate fit: design before rendering, evidence before proposal, metadata before mutation | Low if kept as placement intent only, with no components, styling UI, or editable blocks |
| B. Content Plan Foundation | Medium: content evidence exists, but content slots are safer after layout intent exists | Needs stable layout/section targets plus content provenance and media refs | High later: needed for editable site knowledge | High later: content is user-visible and business-critical | Strong, but premature immediately after StructurePlan because slot targets are not yet defined | Medium: can become a CMS if it creates editable content models before migration layout is bounded |
| C. Intent / Experience Plan Foundation | Medium-low: section labels and candidates hint at purpose, but verified inputs are still mostly structural | Needs semantic confidence rules, business-purpose evidence, and governance against interpretation drift | Medium later: guides journeys and conversion editing | Medium-high later: connects migration to user outcomes | Important to the Digital Twin, but too interpretive as the next deterministic boundary | Medium-high: risks generic website strategy or AI interpretation before source-grounded layout/content models exist |
| D. Block Plan Foundation | Low now: component mapping depends on layout and content granularity | Needs LayoutPlan, ContentPlan, design/component vocabulary, and rendering constraints | High later: bridges to implementation | Medium later: supports preview/generation workflows | Useful only after canonical model layers exist | High: closest option to a builder schema or component generator |
| E. Other | Not justified | No lower prerequisite beats LayoutPlan | Varies | Varies | No stronger current fit identified | Varies |

## Option A - Layout Plan Foundation

### Readiness

LayoutPlan is ready because StructurePlan now provides the authorized route,
navigation, section, and assignment envelope. Evidence Capture and Candidate
Discovery already carry layout geometry, section boundary, navigation, and
candidate refs where available. The new boundary can therefore remain
deterministic and metadata-only: it does not need to infer content, choose
components, generate code, or ask AI what the site should become.

### Dependencies

- latest persisted `structure_plan` artifact for the requested `siteVersionId`;
- exact linked Reconstruction Package artifact and package lineage;
- Candidate Review and Candidate Discovery lineage as audit refs;
- Candidate Context and Evidence Capture refs as supporting evidence only;
- existing StructurePlan validation, status, limitations, diagnostics, and
  staleness behavior;
- explicit fail-closed behavior when the latest StructurePlan is missing,
  blocked, stale, invalid, or inconsistent with its linked package.

### Boundary Shape

A future LayoutPlan foundation should define only layout intent metadata:

- route-level layout containers and page-level rhythm;
- section order, grouping, and major region roles;
- navigation placement intent where navigation is planned;
- density, prominence, alignment, responsive, and containment hints when they
  are source-grounded;
- source evidence refs and StructurePlan assignment refs for every planned
  layout entity;
- limitations and diagnostics for missing geometry, missing sections, missing
  navigation, ambiguous grouping, and source-fidelity gaps.

It should explicitly exclude generated React, generated blocks, component
selection, content extraction, content rewriting, design tokens, CSS,
publishing, execution, worker jobs, AI output, and mutable editor state.

### Risks And Controls

| Risk | Required control |
|---|---|
| LayoutPlan becomes generated UI | Store placement intent only; forbid React, blocks, CSS, components, and renderable output |
| LayoutPlan invents visual hierarchy not in evidence | Require StructurePlan assignment refs and source evidence refs for every planned entity |
| ViroiDoc-like no-section cases produce fake sections | Allow blocked or limitation-bearing plans; do not synthesize missing section plans |
| Content sneaks into layout slots | Permit stable refs and slot placeholders only; defer content extraction and copy/media mapping |
| Component mapping starts too early | Defer block/component vocabulary until LayoutPlan and ContentPlan exist |
| AI/editor governance is bypassed | Keep the artifact deterministic and read-only; no proposals, edits, approvals, or publish flow |
| Generic CMS/builder drift | Do not expose editable templates, drag-and-drop schema, content fields, or component palettes |

### Migration And Business Value

LayoutPlan is the first artifact that moves from organized candidate structure
toward the canonical layout graph without crossing into generation. It gives
operators a reviewable answer to "what goes where?" while preserving the
evidence-first chain. That is higher immediate migration value than content
slotting or component mapping because it defines the spatial substrate those
later artifacts need.

Business value comes from making the migrated site shape legible before
expensive reconstruction work begins. A stakeholder can inspect route and
section arrangement, spot missing or ambiguous structure, and decide whether the
migration is spatially ready without seeing a generated site or editing content.

## Option B - Content Plan Foundation

ContentPlan is valuable, but it is deferred. GNR8's canonical content model says
content is structured, governed, and versionable website knowledge rather than
page HTML. That remains true. The sequencing issue is that content extraction
after StructurePlan needs stable placement targets: which route, section,
region, and slot a text or media item belongs to.

If ContentPlan comes immediately after StructurePlan, it would either create a
parallel CMS-like model with weak layout anchoring or force content to define
its own slots. That increases drift. ContentPlan should follow once LayoutPlan
has defined source-grounded section/region placement intent and can provide
canonical slot anchors.

## Option C - Intent / Experience Plan Foundation

Intent or Experience Plan is important to GNR8's AI-editor and Digital Twin
future because Experience answers how users move and what outcomes the site
supports. It is not the next safest boundary.

The current verified chain proves structural organization and read-only
inspection, not business-purpose interpretation. Moving next to hero/contact/
services/gallery/testimonials semantics would invite subjective classification,
especially on limited or warning-bearing real targets. That is the point where
AI or human strategy could easily outrun evidence. Experience planning should
come after layout and content anchors exist, when intent can be attached to
known routes, sections, and content entities rather than inferred from structure
alone.

## Option D - Block Plan Foundation

BlockPlan is deferred because it is closest to generation. Mapping structure to
future blocks or components is useful only after GNR8 has layout placement,
content slots, and a design/component vocabulary. If introduced now, it would
pressure StructurePlan into a builder schema and collapse the separation between
planning and implementation.

BlockPlan should be reconsidered only after LayoutPlan and ContentPlan can tell
the system what spatial entity and content entity a block candidate would
represent. Until then, block mapping carries too much generic builder risk.

## Option E - Other

No other boundary is strongly justified. Earlier layers are already verified
for this reassessment, and later layers such as preview, generation, publishing,
AI editing, or runtime mutation would skip the missing layout-planning layer.

## Primary Layer Answer

The next layer is primarily **visual/layout**.

It is not primarily content, because content extraction and slot intent need
layout anchors. It is not primarily semantic intent, because business and user
purpose should be attached after source-grounded structure and layout are
stable. It is not primarily component/block mapping, because component mapping
is downstream of layout, content, and design constraints.

## AI-Editor Architecture Alignment

- **Import layer:** remains the evidence-producing source. LayoutPlan should
  reference import/evidence lineage but not recapture, refetch, or mutate
  import output.
- **Code layer:** remains out of scope. LayoutPlan is not React, not a block
  tree, not CSS, and not an executable rendering contract.
- **Content layer:** remains deferred but enabled. LayoutPlan should provide
  source-grounded placement anchors that a future ContentPlan can map text,
  media, SEO, and navigation labels into.
- **Editing layer:** remains proposal-governed. LayoutPlan is not an edit,
  proposal, approval, or mutation. It can later become an input to governed
  Human/AI Editor proposals.
- **Publish flow:** remains out of scope. LayoutPlan does not create versions,
  publish artifacts, deployments, or public rendering behavior.

This preserves the AI Editor principle that AI does not mutate models directly
and that proposals, approval, versioning, and publish remain separate from
architecture artifacts.

## Digital Twin Alignment

LayoutPlan strengthens the Digital Twin as operational understanding rather
than HTML replay. It creates a bridge from migration evidence into the Twin's
Design State and Experience State without claiming a generated frontend exists.

The fit is especially strong with the Digital Twin governance chain:

```text
evidence before observation
observation before recommendation
recommendation before proposal
proposal before mutation
approval before publish
audit before execution
```

StructurePlan is the organized observation of approved candidates. LayoutPlan is
the next source-grounded observation of visual organization. It is not a
recommendation, proposal, mutation, or publishable artifact.

## Canonical Input To The Next Phase

The canonical authorizing input to Layout Plan Foundation should be:

1. the latest persisted `StructurePlan` artifact for the requested
   `siteVersionId`;
2. the exact linked Reconstruction Package artifact referenced by that
   StructurePlan;
3. supporting lineage refs to Candidate Review, Candidate Discovery, Candidate
   Context, Evidence Capture, `dryRunId`, and `siteVersionId`.

Only the latest valid or explicitly blocked StructurePlan should authorize a new
LayoutPlan. Supporting refs may explain placement evidence and limitations, but
they must not add candidates or override the StructurePlan envelope.

## Final Recommendation

Proceed next with **Phase 8G-0 - Layout Plan Foundation** and nothing beyond it.
Limit that phase to documentation and contract architecture for a metadata-only
`LayoutPlan` artifact derived from the latest persisted `StructurePlan` plus
linked Reconstruction Package lineage. Do not add content planning, intent
planning, block planning, AI, generation, publishing, schema, workers, or
runtime behavior.
