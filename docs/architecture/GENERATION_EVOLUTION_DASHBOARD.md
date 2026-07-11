# Generation Evolution Dashboard

## Phase And Boundary

Phase MVP-2.0-N defines the canonical Generation Evolution Dashboard.

This phase is architecture and documentation only. It adds no runtime
behavior, persistence behavior, UI implementation, route, API, database schema,
worker, provider execution, AI execution, publishing behavior, artifact
contract mutation, Generation Cycle runtime mutation, compliance runtime
mutation, or automatic future-iteration comparison.

Phase MVP-3.0-A implements the first read-only runtime foundation for this
architecture:

```text
docs/architecture/GENERATION_EVOLUTION_DASHBOARD_RUNTIME_FOUNDATION.md
apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.ts
apps/platform/app/gnr8/admin/evolution/[siteVersionId]/page.tsx
```

The MVP-3.0-A surface remains read-only. It consumes existing canonical
artifacts, renders artifact references, and opens quarantined generated
proposal previews. It does not edit artifacts, create business truth, approve,
publish, deploy, mutate DNS, mutate production, execute providers, execute AI,
run workers, change schema, change persistence, recompute compliance, or
perform automatic visual comparison.

Phase MVP-3.0-B performs the first local real-target operator verification
pass:

```text
docs/architecture/GENERATION_EVOLUTION_DASHBOARD_REAL_TARGET_VERIFICATION.md
```

MVP-3.0-B verifies the real ODV projection, the two allowlisted preview
bundles, preview security behavior, attention states, forbidden-control
absence, and the existing superadmin guard. Authenticated visual display is
still blocked until a valid local `SUPERADMIN_EMAILS` allowlist and
superadmin browser session are available. The dashboard remains read-only and
does not gain edit, approval, generation, publishing, deployment, provider,
AI, DNS, worker, schema, persistence, or production mutation behavior.

Runtime route:

```text
/gnr8/admin/evolution/[siteVersionId]
```

ODV route:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Purpose

The Generation Evolution Dashboard answers:

```text
What happened to my website over time?
```

It does not answer:

```text
What does my latest website look like?
```

The dashboard is the primary historical view of one website's evolution across
Generation Cycles and Iterations. It is read-only. It visualizes existing
canonical artifacts and makes the full history inspectable without becoming
the source of business truth.

## Dashboard Philosophy

Dashboard visualizes history.

Dashboard never edits artifacts.

Dashboard never becomes business truth.

Dashboard consumes canonical artifacts only.

The dashboard is an interpretive historical surface over the artifact lineage
and Generation Cycle model. Business Discovery, Digital Business Twin, Business
Understanding Report, Business Alignment, Website Design Brief, Website
Generation Package, Provider Payload, Generated Website Proposal, Observed
Website, Compliance, Compliance Report, Improvement Plan, and Evolution
Analysis remain the canonical records.

The dashboard may group, order, summarize, and link those records. It must not
create new facts, rewrite artifact meaning, approve a website, publish a
website, regenerate a website, call a provider, execute AI, or compare future
iterations automatically.

## Canonical Timeline

The dashboard presents a website's evolution as an ordered timeline:

```text
Generation Cycle
  ->
Iteration 1
  ->
Iteration 2
  ->
Iteration 3
  ->
...
  ->
Approved
  ->
Published
```

Generation Cycle is the organizing container. Iterations are the ordered
generation attempts inside that cycle. Approved marks the iteration accepted
by the future business approval boundary. Published marks the future
publishing boundary after approval.

An iteration that is superseded by a later iteration remains visible. An
approved iteration remains visible. A published iteration remains visible.
History is append-only from the dashboard's point of view.

## Generation Cycle Summary

The top section of the dashboard summarizes the currently selected website and
Generation Cycle.

Canonical summary fields:

- Generation Cycle status
- current iteration
- overall trajectory
- latest recommendation
- latest compliance
- current business confidence

Generation Cycle status reflects the cycle's historical state, such as
`created`, `active`, `improving`, `ready_for_approval`, `approved`,
`published`, or `archived`.

Current iteration identifies the latest iteration participating in the cycle.
It does not hide earlier iterations.

Overall trajectory describes the historical direction across available
evidence, such as improving, unchanged, regressing, blocked, or insufficient
evidence.

Latest recommendation is read from the latest applicable canonical artifact,
such as a Compliance Report, Improvement Plan, or Evolution Analysis.

Latest compliance is read from the latest applicable Generation Contract
Compliance artifact.

Current business confidence is a dashboard summary of existing confidence
signals. It must be traceable to canonical artifacts and must not invent
business confidence that the artifacts do not support.

## Iteration Cards

Each iteration is represented by one dashboard card.

Canonical iteration card fields:

- iteration number
- generation cycle
- creation timestamp
- status
- overall assessment
- recommendation
- compliance status
- confidence
- improvement summary

The card is a read-only summary. It may display missing, unavailable, or
blocked values when the underlying artifacts do not exist yet. It must not
fill gaps with inferred business facts.

### Iteration Status

The card status is derived from existing lifecycle evidence. Examples include:

- `planned`
- `generated`
- `observed`
- `evaluated`
- `improved`
- `superseded`
- `approved`
- `published`
- `blocked`

These statuses are presentation states for the dashboard model. MVP-2.0-N does
not add status fields to runtime contracts.

### Overall Assessment

Overall assessment summarizes the iteration's result in business-readable
terms. It may come from an Evolution Analysis, Compliance Report, or other
future canonical evaluation artifact.

Examples:

- meaningful improvement
- minor improvement
- unchanged
- regression
- blocked
- insufficient evidence

### Recommendation

Recommendation reflects the next governed action indicated by canonical
artifacts. Examples include regenerate, create compliance report, improve
specific areas, prepare for approval, approve, publish, or continue review.

The dashboard does not execute the recommendation.

### Compliance Status And Confidence

Compliance status is read from the applicable Generation Contract Compliance
artifact or Compliance Report. Confidence is read from the applicable
compliance, report, observation, or evolution artifact.

Missing confidence remains missing. Unknown confidence remains unknown.

## Artifact Links

Every iteration card links to the canonical artifacts that explain that
iteration.

Canonical read-only artifact link examples:

- Business Discovery
- Digital Business Twin
- Business Understanding Report
- Business Alignment
- Website Design Brief
- Website Generation Package
- Provider Payload
- Generated Proposal
- Observed Website
- Compliance
- Compliance Report
- Improvement Plan
- Evolution Analysis

Links are read-only references. They open, inspect, or navigate to canonical
artifact records. They do not mutate artifacts, recalculate artifacts,
validate artifacts, regenerate artifacts, publish artifacts, or change latest
pointers.

An iteration card may link to artifacts created before that iteration when
those artifacts authorized or informed the iteration. For example, Iteration 2
may link back to the same Website Generation Package as Iteration 1, plus the
Improvement Plan and Provider Payload that specifically informed Iteration 2.

## Website Preview Model

Every iteration card contains links to the generated website for that
iteration when generated material exists.

In the MVP-3.0 runtime surface these links are labelled as generated proposal
previews. They are read-only quarantined proposal bundles, not published
websites.

Conceptual preview relationship:

```text
Generated Website
  ->
Preview URL
  ->
Open Preview
  ->
Static Snapshot
  ->
Proposal Bundle
```

Generated Website is the user-facing generated result for the iteration.

Preview URL is the address or future preview route where the generated result
can be opened.

Open Preview is the dashboard action that opens that generated version.

Static Snapshot is the captured or stored representation of that generated
version when available.

Proposal Bundle is the quarantined Generated Website Proposal source material
that preserves the generated implementation output.

The dashboard must allow users to open every generated version. Users must be
able to visually compare versions manually by opening multiple iteration
previews or inspecting them one by one.

MVP-2.0-N defines no comparison engine.

## Preview Philosophy

Every generated website remains permanently reachable through its iteration.

The dashboard links to:

- generated proposal bundle
- preview website
- future published website, if applicable

Iteration history must never disappear.

Preview links are historical references. If a generated version is superseded,
its preview remains reachable from its iteration. If a later version is
approved or published, earlier generated versions remain inspectable for
history, audit, and manual comparison.

The dashboard does not promote a preview to production. It does not publish a
preview. It does not mutate preview content. It does not decide whether a
preview is business-approved.

## Visual History

The dashboard presents generated versions as a visible historical sequence:

```text
Iteration 1 Preview
Iteration 2 Preview
Iteration 3 Preview
...
```

Users can manually inspect differences between versions by opening each
preview and reviewing the corresponding artifacts. Future automated visual
diff, visual regression analysis, screenshot comparison, and semantic
comparison are outside MVP-2.0-N.

## Improvement Summary

Every iteration card displays an improvement summary.

Canonical improvement summary fields:

- improved areas
- unchanged areas
- regressions
- evidence quality
- recommendation

Improved areas are areas where canonical artifacts show better alignment,
better compliance, better evidence, or better business fit compared with an
earlier iteration.

Unchanged areas are areas that show no material movement.

Regressions are areas that became worse or less supported.

Evidence quality describes the strength, coverage, limitations, and
confidence of available evidence.

Recommendation presents the next governed action, if one exists.

The summary must be traceable to canonical artifacts such as Compliance,
Compliance Report, Improvement Plan, and Evolution Analysis. When no Evolution
Analysis exists, the dashboard may show unavailable rather than comparing
iterations itself.

## Future Metrics

MVP-2.0-N documents possible future metrics only.

Potential future metrics:

- compliance trend
- improvement velocity
- average regeneration gain
- average evidence growth
- business confidence trend
- iteration duration
- provider comparison

No metric is implemented by this phase. Future metric definitions must remain
traceable to canonical artifacts and must not turn the dashboard into a new
source of business truth.

## Architecture Diagrams

### Generation Cycle Timeline

```text
Website
  |
  v
Generation Cycle
  |
  +-- Iteration 1
  |     |
  |     +-- Generated
  |     +-- Observed
  |     +-- Evaluated
  |     +-- Improved or superseded
  |
  +-- Iteration 2
  |     |
  |     +-- Generated
  |     +-- Observed
  |     +-- Evaluated
  |     +-- Improved or superseded
  |
  +-- Iteration 3
        |
        +-- Generated
        +-- Observed
        +-- Evaluated
        +-- Ready, approved, or superseded
```

### Iteration Card

```text
+-------------------------------------------------------------+
| Iteration Card                                              |
+-------------------------------------------------------------+
| Iteration number                                            |
| Generation Cycle                                            |
| Creation timestamp                                          |
| Status                                                      |
| Overall assessment                                          |
| Recommendation                                              |
| Compliance status                                           |
| Confidence                                                  |
| Improvement summary                                         |
+-------------------------------------------------------------+
| Artifact links                                              |
| Preview links                                               |
+-------------------------------------------------------------+
```

### Artifact Relationship

```text
Business Discovery
  ->
Digital Business Twin
  ->
Business Understanding Report
  ->
Business Alignment
  ->
Website Design Brief
  ->
Website Generation Package
  ->
Provider Payload
  ->
Generated Proposal
  ->
Observed Website
  ->
Compliance
  ->
Compliance Report
  ->
Improvement Plan
  ->
Evolution Analysis

                 |
                 v
        Iteration Card Links
```

The artifact chain remains canonical. The iteration card links to the chain;
it does not replace it.

### Preview Relationship

```text
Iteration Card
  |
  +-- Generated Proposal Bundle
  |
  +-- Preview Website
  |     |
  |     +-- Open Preview
  |
  +-- Static Snapshot
  |
  +-- Future Published Website
```

The preview relationship preserves reachability for every generated version.

## Boundary Rules

- The dashboard is read-only.
- The dashboard visualizes existing canonical artifacts.
- The dashboard never edits artifacts.
- The dashboard never becomes business truth.
- The dashboard never executes providers or AI.
- The dashboard never publishes.
- The dashboard never mutates previews, proposal bundles, snapshots, or
  published sites.
- The dashboard never modifies artifact contracts.
- The dashboard never modifies Generation Cycle runtime.
- The dashboard never modifies compliance runtime.
- The dashboard never automatically compares future iterations.

## MVP-2.0-N Result

At the end of MVP-2.0-N, GNR8 has a canonical Generation Evolution Dashboard
architecture describing how users will browse every historical generation,
open every generated website, inspect every proposal, and follow the complete
evolution of their website.
