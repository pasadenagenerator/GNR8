# First Limited Dry Run Builder Design

## Scope

Phase 8B-2 defined how the first limited Dry Run builder will map existing evidence into the Phase 8B-1 output contract. Phase 8B-3 implements the deterministic builder for that mapping.

This is design documentation plus a limited pure builder implementation. It does not execute a dry run, execute simulation, execute reconstruction, change importer behavior, change Evidence Capture behavior, change Original Mirror behavior, change preview behavior, change capture behavior, run candidate discovery or candidate review, call AI systems, generate routes through an LLM, generate navigation, generate sections, generate React, generate GNR8 blocks, generate content, generate design tokens, write database records, dispatch workers, or publish anything.

The builder output remains limited to:

- `LimitedDryRunRouteModel`
- `LimitedDryRunNavigationModel`
- `LimitedDryRunSectionModel`

## Implementation Status

Implemented:

- deterministic builder

Still not implemented:

- dry-run runtime execution
- persistence
- AI
- React/block generation
- content/design-token generation

## Existing Contracts

The builder must produce the existing Phase 8B-1 contract:

- `FirstLimitedDryRunOutput`
- `LimitedDryRunRouteModel`
- `LimitedDryRunNavigationModel`
- `LimitedDryRunSectionModel`

The allowed evidence inputs are:

- Evidence Capture baseline
- `LayoutGeometryEvidence`
- `SectionBoundaryEvidence`
- `NavigationEvidence`
- route scope and limitations carried by `ReconstructionDryRunPackage`

The builder must not add new output model families. It must not create Block Model, Content Model, Design Token Model, React output, CMS bindings, generated site output, simulation artifacts, worker jobs, persistence writes, or publishable artifacts.

## Evidence Reference Format

The builder should use deterministic string refs for traceability. These refs are not new persisted records; they are stable identifiers inside the Dry Run output.

Required ref formats:

| Evidence | Ref format |
|---|---|
| Evidence Capture baseline | `evidence:capture-baseline` |
| Route source evidence | `evidence:route:{routePath}` |
| Layout geometry route evidence | `evidence:layout-geometry:{routePath}` |
| Layout geometry region evidence | `evidence:layout-geometry:{routePath}:region:{regionId}` |
| Section boundary evidence | `evidence:section-boundary:{routePath}:{sectionId}` |
| Navigation evidence group | `evidence:navigation:{routePath}` |
| Navigation evidence item | `evidence:navigation:{routePath}:item:{position}` |

`routePath`, `sectionId`, and `regionId` must be encoded exactly as evidence identity values, after the same deterministic string escaping used elsewhere in the architecture layer for refs. No random suffixes are allowed.

If an existing `NavigationEvidence.sourceEvidenceRefs` value is present, the navigation model must retain that original ref and may also include the deterministic navigation group and item refs above.

## Route Model Mapping

### Input

Route model construction consumes:

- route identity from `ReconstructionDryRunPackage.routeScope.routes`
- source URL from the Evidence Capture baseline route record for that route
- `SectionBoundaryEvidence` for the same `routePath`
- `NavigationEvidence` for the same `routePath`
- limitations from the Evidence Capture baseline and `ReconstructionDryRunPackage.limitations`

The route universe is the ordered `routeScope.routes` array. The builder must not create additional routes from navigation hrefs, section evidence, layout evidence, AI inference, source-site crawling, or preview inspection.

### Output

For each in-scope route with a known source URL, create one `LimitedDryRunRouteModel`:

```ts
{
  routePath: string;
  sourceUrl: string;
  sectionRefs: string[];
  navigationRefs: string[];
  limitationRefs: string[];
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
}
```

Exact field mapping:

| Output field | Mapping rule |
|---|---|
| `routePath` | Copy the route identity from `routeScope.routes`. |
| `sourceUrl` | Copy the captured source URL for the same route from the Evidence Capture baseline. Do not synthesize a URL from hrefs or route paths. |
| `sectionRefs` | Ordered IDs of `LimitedDryRunSectionModel` entries for the route. The order must match section model ordering rules. |
| `navigationRefs` | Ordered IDs of `LimitedDryRunNavigationModel` entries for the route. Normally this is zero or one entry per route. |
| `limitationRefs` | IDs of output limitations that apply to the route itself or to route-level source evidence. |
| `confidenceLevel` | The minimum confidence across the route's retained section models and navigation models. If either required model family is absent for the route, use `LOW` and attach a limitation. |

If source URL is missing, the builder must not synthesize a `sourceUrl`. It must either omit the route model and add a blocker limitation or mark the whole output blocked, depending on whether the missing source URL affects every in-scope route.

Route models retain source traceability through:

- `sectionRefs`, which resolve to section models with `sourceEvidenceRefs`
- `navigationRefs`, which resolve to navigation models with `sourceEvidenceRefs`
- top-level `FirstLimitedDryRunOutput.evidenceRefs`, which must include `evidence:route:{routePath}` and the source evidence refs used by the route

The Phase 8B-1 route model contract does not include a direct `sourceEvidenceRefs` field. Adding one would be a contract change and is outside Phase 8B-2.

## Navigation Model Mapping

### Input

Navigation model construction consumes `NavigationEvidence` only, scoped by `routePath`.

### Output

For each route with navigation evidence, create one `LimitedDryRunNavigationModel`:

```ts
{
  navigationId: string;
  routePath: string;
  items: LimitedDryRunNavigationItem[];
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  sourceEvidenceRefs: string[];
  limitationRefs: string[];
}
```

Exact field mapping:

| Output field | Mapping rule |
|---|---|
| `navigationId` | `nav:{routePath}` using deterministic ref escaping. |
| `routePath` | Copy `NavigationEvidence.routePath`. |
| `items` | Dedupe and order `NavigationEvidence.navigationItems` using the rules below. |
| `confidenceLevel` | Minimum confidence across retained navigation items after dedupe. Empty retained item sets are `LOW` and require a limitation. |
| `sourceEvidenceRefs` | Union of `NavigationEvidence.sourceEvidenceRefs`, `evidence:navigation:{routePath}`, and retained item refs. Sort deterministically. |
| `limitationRefs` | IDs for navigation-specific limitations, including empty navigation, low-confidence navigation, duplicate items, or out-of-scope hrefs. |

### Confidence Handling

Navigation item confidence is copied from `NavigationEvidenceItem.confidenceLevel`.

When duplicate items are merged, the retained item confidence is the highest confidence among identical duplicate items because any stronger source occurrence supports the same label/href pair. The navigation model confidence remains conservative: it is the minimum confidence across retained items.

Confidence order is:

```text
LOW < MEDIUM < HIGH
```

### Dedupe Behavior

Navigation items are duplicates only when both normalized values match:

- normalized label: trim leading/trailing whitespace and collapse internal whitespace to one space
- normalized href: trim leading/trailing whitespace

Case must be preserved. The builder must not lowercase labels or hrefs, must not resolve relative URLs, and must not infer canonical URLs.

For duplicate items:

- retain the first item by ascending `position`
- merge source refs from every duplicate occurrence
- retain the lowest numeric `position`
- set item confidence to the highest duplicate confidence
- add a warning limitation if duplicates were merged

Items with an empty normalized label or empty normalized href must not be emitted as navigation items. They require a limitation with the relevant navigation evidence ref.

### Ordering Behavior

Navigation items must be ordered by:

1. ascending numeric `position`
2. normalized href
3. normalized label

The emitted `LimitedDryRunNavigationItem.position` must be rewritten to a contiguous zero-based order after dedupe. This keeps output deterministic even when source evidence has gaps or duplicate positions.

### Evidence References

Each emitted item must include:

- the deterministic item ref `evidence:navigation:{routePath}:item:{sourcePosition}`
- any original `NavigationEvidence.sourceEvidenceRefs` that apply to the navigation group

The navigation model `sourceEvidenceRefs` must be the deterministic sorted union of all retained item refs and group refs.

## Section Model Mapping

### Input

Section model construction consumes:

- `SectionBoundaryEvidence`
- `LayoutGeometryEvidence`

Both inputs are scoped by `routePath`.

### Output

For each retained section boundary, create one `LimitedDryRunSectionModel`:

```ts
{
  sectionId: string;
  routePath: string;
  regionType: SectionBoundaryRegionType;
  selector: string;
  boundingBox: EvidenceBoundingBox;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  sourceEvidenceRefs: string[];
  limitationRefs: string[];
}
```

Exact field mapping:

| Output field | Mapping rule |
|---|---|
| `sectionId` | Copy `SectionBoundaryEvidence.sectionId`. If duplicate within a route, suffix deterministically with `:{ordinal}` and add a limitation. |
| `routePath` | Copy `SectionBoundaryEvidence.routePath`. |
| `regionType` | Copy `SectionBoundaryEvidence.regionType`. Do not reclassify. |
| `selector` | Copy `SectionBoundaryEvidence.selector`. Do not generate fallback selectors. |
| `boundingBox` | Copy `SectionBoundaryEvidence.boundingBox` exactly. Do not recompute from layout geometry. |
| `confidenceLevel` | Copy `SectionBoundaryEvidence.confidenceLevel`, then cap at `LOW` if required selector or bounding box evidence is invalid. |
| `sourceEvidenceRefs` | Include `evidence:section-boundary:{routePath}:{sectionId}` plus matching layout geometry refs where available. |
| `limitationRefs` | IDs for section-specific limitations, including low confidence, unknown region type, invalid selector, invalid bounding box, missing layout match, or duplicate section ID. |

### Section Ordering

Section models must be ordered route-by-route using the route order from `routeScope.routes`.

Within a route, sort by:

1. ascending `boundingBox.y`
2. ascending `boundingBox.x`
3. ascending `boundingBox.height`
4. ascending `boundingBox.width`
5. `sectionId`

The builder must not infer visual hierarchy beyond these existing bounding boxes.

### Confidence Propagation

Section confidence is copied from `SectionBoundaryEvidence.confidenceLevel`.

If `regionType` is `unknown`, retain the source confidence but add a limitation.

If the selector is blank, the bounding box has non-finite values, or the bounding box has `width <= 0` or `height <= 0`, cap confidence at `LOW` and add a limitation. A section with an invalid selector or invalid bounding box should not be emitted unless a future implementation has an explicit review mode for invalid evidence; the default builder should omit it and attach a route-level limitation.

### Selector Handling

Selectors are evidence, not generated output.

The builder must:

- copy selectors exactly from `SectionBoundaryEvidence.selector`
- preserve casing and punctuation
- avoid CSS selector repair
- avoid DOM querying outside captured evidence
- avoid fallback selectors such as `section:nth-child(...)`

If a selector is missing or blank, add a blocker limitation for that section and do not invent a selector.

### Bounding Box Handling

Bounding boxes are copied exactly from `SectionBoundaryEvidence.boundingBox`.

`LayoutGeometryEvidence` is used only for traceability and consistency checks:

- If a geometry region has the same selector, include `evidence:layout-geometry:{routePath}:region:{regionId}`.
- If route-level geometry exists but no selector match exists, emit the section model with the section boundary box and add a warning limitation.
- If no layout geometry exists for the route, emit only if the section boundary box is valid, include the section boundary ref, and add a warning limitation.
- If section boundary and matching layout geometry boxes disagree, do not merge or average boxes. Keep the section boundary box and add a warning limitation.

## Limitation Rules

All output limitations live in `FirstLimitedDryRunOutput.limitations` as `ReconstructionDryRunLimitation[]`.

The builder must preserve existing dry-run limitations:

- Copy every `ReconstructionDryRunPackage.limitations` entry unchanged into output `limitations`.
- Preserve each original `limitationId`.
- Preserve severity, source ref, and message.

The builder may add normalized limitations from existing evidence gaps only. It must not create speculative limitations about design quality, content quality, business intent, or future generation.

### Evidence Capture Limitations

Evidence Capture limitations flow into Dry Run output as follows:

| Evidence condition | Severity | Ref behavior |
|---|---|---|
| Capture baseline missing for all in-scope routes | `blocker` | output-level limitation, no route models |
| Route source URL missing | `blocker` | route limitation ref on affected route if route model can exist; otherwise output-level limitation |
| Required route evidence missing for one route | `warning` or `blocker` depending on whether a required output field is impossible | route limitation ref |
| Optional evidence missing, such as runtime mutation evidence | `warning` | output-level limitation and affected route limitation refs |
| Existing dry-run package limitation | original severity | copied unchanged |

### Section Evidence Limitations

Section limitations must be attached to the relevant section model when one is emitted, and to the route model when the section model is omitted.

Required limitation cases:

- no section evidence for an in-scope route
- `LOW` section confidence
- `unknown` region type
- blank selector
- invalid bounding box
- duplicate section ID inside one route
- missing matching layout geometry
- section/layout bounding box disagreement

### Navigation Evidence Limitations

Navigation limitations must be attached to the relevant navigation model when one is emitted, and to the route model when the navigation model is omitted.

Required limitation cases:

- no navigation evidence for an in-scope route
- empty retained navigation item list
- `LOW` navigation item confidence
- duplicate navigation items merged
- blank navigation label
- blank navigation href
- href points outside the dry-run route scope and cannot be tied to a captured source URL

Out-of-scope hrefs must not create new routes. They may remain as navigation items if they are captured evidence, but the navigation model must carry a limitation.

### Limitation ID Rules

New limitation IDs must be deterministic:

```text
limited-dry-run:{routePath}:{model}:{code}
limited-dry-run:{routePath}:{model}:{sourceId}:{code}
```

Where:

- `model` is `route`, `navigation`, or `section`
- `sourceId` is `sectionId`, navigation source position, or another existing evidence identity
- `code` is a stable lowercase snake-case condition such as `missing_source_url`, `low_confidence`, or `missing_layout_match`

If multiple evidence records trigger the same limitation condition, emit one limitation with a deterministic message and attach the same `limitationId` wherever relevant.

## Traceability Rules

Every emitted navigation and section model must include a non-empty `sourceEvidenceRefs` array and a `limitationRefs` array. `limitationRefs` may be empty only when no limitations apply to that model.

Every emitted route model must include:

- `sectionRefs` resolving to emitted section models
- `navigationRefs` resolving to emitted navigation models
- `limitationRefs`, which may be empty only when no route-level limitations apply

Because the Phase 8B-1 `LimitedDryRunRouteModel` contract does not include direct `sourceEvidenceRefs`, route source evidence must be retained through:

- top-level `FirstLimitedDryRunOutput.evidenceRefs`
- `evidence:route:{routePath}`
- the `sourceEvidenceRefs` of referenced navigation models
- the `sourceEvidenceRefs` of referenced section models

Top-level `FirstLimitedDryRunOutput.evidenceRefs` must be the deterministic sorted union of:

- every route source evidence ref
- every emitted navigation model source evidence ref
- every emitted section model source evidence ref
- every limitation source ref when present

No model may point to a ref that is not present in the captured evidence or in the deterministic ref formats defined by this document.

## Determinism Rules

The builder must satisfy:

```text
same input = same output
```

Required deterministic behavior:

- no randomness
- no AI or LLM calls
- no current time reads
- no source-site network reads
- no preview DOM reads
- no Original Mirror reads as product truth
- no inference outside existing evidence
- no route creation from navigation hrefs
- no selector generation
- no bounding box recomputation
- stable sorting for routes, navigation items, section models, evidence refs, and limitation refs
- deterministic limitation IDs
- deterministic model IDs

`createdAt` must come from the existing `ReconstructionDryRunPackage.createdAt`, matching `createEmptyFirstLimitedDryRunOutput(...)`. The builder must not stamp a fresh timestamp.

## Output Status Rules

The first limited builder may set only Phase 8B-1 output statuses:

- `valid`
- `invalid`
- `blocked`

It must not set executed, simulated, completed, published, or migration-like statuses.

Recommended status mapping:

| Condition | Output status |
|---|---|
| All in-scope route, navigation, and section models are constructible with required traceability | `valid` |
| Models are constructible but validation fails the Phase 8B-1 contract | `invalid` |
| Required route identity, source URL, section evidence, or navigation evidence is missing such that required models cannot be constructed | `blocked` |

## Success Example

This example is illustrative only.

### Input

Route scope:

```json
{
  "scopeType": "route_set",
  "routes": ["/", "/about", "/contact"]
}
```

Route source URLs:

```json
[
  { "routePath": "/", "sourceUrl": "https://example.com/" },
  { "routePath": "/about", "sourceUrl": "https://example.com/about" },
  { "routePath": "/contact", "sourceUrl": "https://example.com/contact" }
]
```

Navigation evidence:

```json
[
  {
    "routePath": "/",
    "navigationItems": [
      { "label": "Home", "href": "/", "position": 0, "confidenceLevel": "HIGH" },
      { "label": "About", "href": "/about", "position": 1, "confidenceLevel": "HIGH" },
      { "label": "Contact", "href": "/contact", "position": 2, "confidenceLevel": "HIGH" }
    ],
    "navigationCount": 3,
    "sourceEvidenceRefs": ["evidence:nav-dom:home"]
  }
]
```

Eight section boundaries:

```json
[
  { "sectionId": "home-hero", "routePath": "/", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 620 }, "confidenceLevel": "HIGH" },
  { "sectionId": "home-proof", "routePath": "/", "regionType": "content", "selector": "main > section:nth-of-type(2)", "boundingBox": { "x": 0, "y": 700, "width": 1440, "height": 420 }, "confidenceLevel": "MEDIUM" },
  { "sectionId": "home-footer", "routePath": "/", "regionType": "footer", "selector": "footer", "boundingBox": { "x": 0, "y": 1120, "width": 1440, "height": 260 }, "confidenceLevel": "HIGH" },
  { "sectionId": "about-hero", "routePath": "/about", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 440 }, "confidenceLevel": "HIGH" },
  { "sectionId": "about-story", "routePath": "/about", "regionType": "content", "selector": "main > section:nth-of-type(2)", "boundingBox": { "x": 0, "y": 520, "width": 1440, "height": 560 }, "confidenceLevel": "MEDIUM" },
  { "sectionId": "contact-hero", "routePath": "/contact", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 360 }, "confidenceLevel": "HIGH" },
  { "sectionId": "contact-form", "routePath": "/contact", "regionType": "form", "selector": "main form", "boundingBox": { "x": 160, "y": 480, "width": 720, "height": 620 }, "confidenceLevel": "MEDIUM" },
  { "sectionId": "contact-footer", "routePath": "/contact", "regionType": "footer", "selector": "footer", "boundingBox": { "x": 0, "y": 1180, "width": 1440, "height": 260 }, "confidenceLevel": "HIGH" }
]
```

### Output Design

Route models:

```json
[
  {
    "routePath": "/",
    "sourceUrl": "https://example.com/",
    "sectionRefs": ["home-hero", "home-proof", "home-footer"],
    "navigationRefs": ["nav:/"],
    "limitationRefs": [],
    "confidenceLevel": "MEDIUM"
  },
  {
    "routePath": "/about",
    "sourceUrl": "https://example.com/about",
    "sectionRefs": ["about-hero", "about-story"],
    "navigationRefs": [],
    "limitationRefs": ["limited-dry-run:/about:navigation:missing_navigation_evidence"],
    "confidenceLevel": "LOW"
  },
  {
    "routePath": "/contact",
    "sourceUrl": "https://example.com/contact",
    "sectionRefs": ["contact-hero", "contact-form", "contact-footer"],
    "navigationRefs": [],
    "limitationRefs": ["limited-dry-run:/contact:navigation:missing_navigation_evidence"],
    "confidenceLevel": "LOW"
  }
]
```

Navigation models:

```json
[
  {
    "navigationId": "nav:/",
    "routePath": "/",
    "items": [
      { "label": "Home", "href": "/", "position": 0, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:navigation:/:item:0", "evidence:nav-dom:home"] },
      { "label": "About", "href": "/about", "position": 1, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:navigation:/:item:1", "evidence:nav-dom:home"] },
      { "label": "Contact", "href": "/contact", "position": 2, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:navigation:/:item:2", "evidence:nav-dom:home"] }
    ],
    "confidenceLevel": "HIGH",
    "sourceEvidenceRefs": ["evidence:navigation:/", "evidence:navigation:/:item:0", "evidence:navigation:/:item:1", "evidence:navigation:/:item:2", "evidence:nav-dom:home"],
    "limitationRefs": []
  }
]
```

Section models:

```json
[
  { "sectionId": "home-hero", "routePath": "/", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 620 }, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:section-boundary:/:home-hero"], "limitationRefs": [] },
  { "sectionId": "home-proof", "routePath": "/", "regionType": "content", "selector": "main > section:nth-of-type(2)", "boundingBox": { "x": 0, "y": 700, "width": 1440, "height": 420 }, "confidenceLevel": "MEDIUM", "sourceEvidenceRefs": ["evidence:section-boundary:/:home-proof"], "limitationRefs": [] },
  { "sectionId": "home-footer", "routePath": "/", "regionType": "footer", "selector": "footer", "boundingBox": { "x": 0, "y": 1120, "width": 1440, "height": 260 }, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:section-boundary:/:home-footer"], "limitationRefs": [] },
  { "sectionId": "about-hero", "routePath": "/about", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 440 }, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:section-boundary:/about:about-hero"], "limitationRefs": [] },
  { "sectionId": "about-story", "routePath": "/about", "regionType": "content", "selector": "main > section:nth-of-type(2)", "boundingBox": { "x": 0, "y": 520, "width": 1440, "height": 560 }, "confidenceLevel": "MEDIUM", "sourceEvidenceRefs": ["evidence:section-boundary:/about:about-story"], "limitationRefs": [] },
  { "sectionId": "contact-hero", "routePath": "/contact", "regionType": "hero", "selector": "main > section:nth-of-type(1)", "boundingBox": { "x": 0, "y": 80, "width": 1440, "height": 360 }, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:section-boundary:/contact:contact-hero"], "limitationRefs": [] },
  { "sectionId": "contact-form", "routePath": "/contact", "regionType": "form", "selector": "main form", "boundingBox": { "x": 160, "y": 480, "width": 720, "height": 620 }, "confidenceLevel": "MEDIUM", "sourceEvidenceRefs": ["evidence:section-boundary:/contact:contact-form"], "limitationRefs": [] },
  { "sectionId": "contact-footer", "routePath": "/contact", "regionType": "footer", "selector": "footer", "boundingBox": { "x": 0, "y": 1180, "width": 1440, "height": 260 }, "confidenceLevel": "HIGH", "sourceEvidenceRefs": ["evidence:section-boundary:/contact:contact-footer"], "limitationRefs": [] }
]
```

The example produces no generated routes, no generated navigation, no generated sections, no React, no blocks, no content model, no design tokens, no persistence writes, and no publishing logic.

## Recommended Next Phase

Phase 8B-4 should be First Limited Dry Run Builder Re-Assessment.

That phase should reassess the deterministic builder implementation and its readiness boundary. It should not broaden the output contract, generate content, generate blocks, call AI, persist output, dispatch workers, execute reconstruction, or publish.
