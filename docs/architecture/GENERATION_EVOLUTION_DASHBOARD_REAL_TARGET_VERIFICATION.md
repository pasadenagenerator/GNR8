# Generation Evolution Dashboard Real-Target Verification

## Phase Boundary

MVP-3.0-B performed the first local real-target operator verification pass for
the ODV Generation Evolution Dashboard route:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The phase stayed read-only. It did not add edit controls, Business Alignment
UX, generation controls, regeneration controls, approval controls, publishing,
deployment, provider execution, AI execution, DNS controls, production
mutation, schema changes, workers, broad redesign, or new dashboard concepts.

## Authenticated Route Result

Local platform runtime:

```text
http://localhost:3000
```

Unauthenticated browser and HTTP checks reached the existing superadmin guard:

```text
HTTP/1.1 307 Temporary Redirect
location: /login
```

The in-app browser landed on the Login page with title `GNR8 Platform`.

MVP-3.0-B2 resolved the local-only authenticated verification blocker by
identifying the current cookie-backed local session through the existing app
auth flow and adding that email to the ignored local platform env file through
the existing `SUPERADMIN_EMAILS` mechanism. The private email value is not
documented here.

The authenticated dashboard route then loaded successfully in the browser:

```text
authenticated operator display: success
auth guard: verified through existing superadmin allowlist
route result: 200 at /gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
header/title: Generation Evolution Dashboard / GNR8 Platform
```

## Dashboard Projection Summary

Read-only projection verification loaded the real ODV site version and
confirmed:

```text
siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
Generation Cycle: ODV Generation Cycle
dryRunId: 09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l
current iteration: 2
cycle state: improving
overall trajectory: improved
latest compliance: non_compliant
latest evolution assessment: meaningful_improvement
latest recommendation: create_compliance_report_v2
business confidence: HIGH from persisted artifacts
```

Unresolved knowledge remains explicit:

```text
objectives_represented
navigation_obligations
page_obligations
section_obligations
asset_presence
accessibility_expectations_observable
seo_expectations_observable
```

## Business Foundation

The projection exposes readable read-only references for the required business
foundation chain:

```text
Business Discovery: business_discovery_7b37413651d79de0d109e31690a34b62
Digital Business Twin: digital_business_twin_2614a690e29e87a201658f3de4f72983
Business Understanding Report: business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad
Business Alignment: business_alignment_18c0a6958048bf8985044e4781e788a8
Website Design Brief: website_design_brief_ff19a711c948d28fdd58bdea521c4f59
Website Generation Package: website_generation_package_c2c555025f186178f27c44c7cd272d4d
```

No missing foundation reference was reported.

## Iteration 1 Result

Iteration 1 projection:

```text
status: complete
Generated Proposal status: quarantined
Observed Website readiness: observable
Compliance status: non_compliant
compliant / partial / non-compliant: 0 / 2 / 8
evidence count: 12
limitation count: 268
preview availability: available
```

Artifact references:

```text
Provider Payload: provider_generation_payload_0738b677c762f830c235dae425a8ec1c
Generated Proposal: generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
Observed Website Model: observed_website_model_35499a9cb91a15740910532d451a739a
Compliance: generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7
Compliance Report: generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de
Improvement Plan: generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
```

## Iteration 2 Result

Iteration 2 projection:

```text
status: complete
Generated Proposal status: quarantined
Observed Website readiness: observable
Compliance status: non_compliant
compliant / partial / non-compliant: 2 / 2 / 6
evidence count: 25
limitation count: 252
preview availability: available
meaningful improvement: yes
newly compliant categories: message_coverage, trust_signal_presence
improved categories: constraints_preserved
unresolved categories: 7
no regressions: yes
```

Artifact references:

```text
Provider Payload: provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7
Generated Proposal: generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
Observed Website Model: observed_website_model_0d5e829f546745b1433557978c875626
Compliance: generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b
Compliance Report v2: missing
Improvement Plan v2: missing
Evolution Analysis: generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253
```

The missing Compliance Report v2 is visible as a missing read-only artifact
reference, not as an action control.

## Timeline Readability

The dashboard projection preserves the intended operator sequence:

```text
Business Foundation
-> Iteration 1
-> Compliance v1
-> Improvement Plan
-> Iteration 2
-> Compliance v2
-> Evolution Analysis
```

Authenticated browser inspection confirmed the rendered dashboard presents
this story without reading raw JSON. The page shows the Business Foundation,
Iteration 1, the Improvement Plan transition, Iteration 2, Evolution Analysis,
Attention States, and Artifact Lineage as readable sections.

## Preview Results

The preview boundary resolved both allowlisted proposal bundles in the
authenticated browser. The dashboard links were opened from the rendered
dashboard.

```text
Iteration 1 preview route:
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/1/preview/

index HTML: source/index.html, 8796 bytes, text/html
local CSS: source/styles.css, 6196 bytes, text/css
local JavaScript: source/script.js, 577 bytes, text/javascript
local assets: none under source/assets
browser result: styled HTML rendered; script set quarantined proposal metadata
mutation result: no backend mutation observed
```

```text
Iteration 2 preview route:
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/2/preview/

index HTML: source/index.html, 12357 bytes, text/html
local CSS: source/styles.css, 7049 bytes, text/css
local JavaScript: source/script.js, 1005 bytes, text/javascript
local assets: 5 SVG files under source/assets
browser result: styled HTML rendered with 6 image elements and 0 broken images
script result: active desktop navigation state applied
mutation result: no backend mutation observed
```

The dashboard preview card now labels these links as `Generated Proposal
Preview` and states that the bundle is a read-only quarantined proposal, not a
published website.

## Human Visual-Difference Assessment

Without changing artifacts or creating automated comparison results, the
authenticated browser review showed visible practical differences between
Iteration 1 and Iteration 2:

- Iteration 1 is simpler and more text-forward, with a blue-toned hero,
  a boundary card, and no raster/SVG image elements.
- Iteration 2 is visually richer, with a green-toned identity hero,
  larger brand-first messaging, a status/evidence visual panel, and local SVG
  assets for identity, navigation evidence,
  contact path, asset inventory, and constraint mapping.
- Iteration 2 strengthens trust presentation with explicit supported-trust and
  constraint messaging.
- Iteration 2 adds an `Evidence` navigation destination and clearer evidence
  section structure.
- Iteration 2 exposes more validation/evidence hooks through
  `data-validation-area` and asset evidence markup.
- Both iterations preserve unresolved knowledge rather than inventing services,
  guarantees, certifications, contact facts, audience facts, or offering facts.

Remaining shortcomings are still visible: unresolved audience/offering
knowledge, remaining non-compliance, and missing Compliance Report v2.

## Preview Security Result

Focused handler verification confirmed fail-closed behavior:

```text
unknown iteration: 404 UNKNOWN_ITERATION
missing file: 404 ASSET_NOT_FOUND
plain traversal: 400 PATH_TRAVERSAL_REJECTED
encoded traversal: 400 PATH_TRAVERSAL_REJECTED
absolute path attempt: 400 PATH_TRAVERSAL_REJECTED
outside-source file attempt: 400 PATH_TRAVERSAL_REJECTED
outside-bundle resolver path: 403 ASSET_OUTSIDE_BUNDLE_REJECTED
unavailable bundle path: 410 PREVIEW_UNAVAILABLE
```

Restrictive headers remained present:

```text
cache-control: no-store
x-content-type-options: nosniff
referrer-policy: no-referrer
content-security-policy: default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-scripts allow-same-origin
```

No arbitrary filesystem path can be supplied through the preview URL.

## Attention States

The real ODV projection reports:

```text
compliance_non_compliant
limitations_present
evolution_improved
improvement_available
unresolved_knowledge_present
```

The states do not contradict each other: Iteration 2 is meaningfully improved
with no regressions, but the current proposal remains non-compliant and has
unresolved knowledge and limitations.

## Forbidden Controls

Authenticated browser and focused test verification confirm the dashboard page
contains no:

```text
forms
inputs
textareas
selects
mutation buttons
generate controls
regenerate controls
approve controls
publish controls
deploy controls
provider controls
AI controls
DNS controls
server actions
```

Allowed read-only navigation and preview links remain present. Iteration 2's
preview contains a non-mutating menu button for responsive navigation; it is
not a generation, approval, publishing, provider, AI, DNS, or backend mutation
control.

## Narrow Fix Made

Three narrowly scoped rendering/UX fixes were made:

```text
Generated Website -> Generated Proposal Preview
Artifact lineage React keys now include artifact identity to avoid duplicate
key warnings.
Preview HTML rewrites local ./asset references through /preview/source/ so
CSS, JavaScript, and SVG assets resolve in the browser.
```

The preview card now explicitly states:

```text
Read-only quarantined proposal bundle, not a published website.
```

No authorization logic, artifact grouping, persistence, schema, provider, AI,
worker, approval, publishing, deployment, DNS, production behavior, canonical
artifact, or generated source bundle changed.

## Validation

Focused tests:

```text
cd apps/platform &&
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test \
  gnr8/architecture/generation-evolution-dashboard-projection.test.ts \
  app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Result:

```text
13/13 passing
```

Full build:

```text
cd apps/platform && pnpm run vercel-build
```

Result:

```text
passed
```

The build emitted existing lint warnings in unrelated UI files, including
missing React hook dependencies and `<img>` optimization warnings. It compiled
and generated the route table successfully, including:

```text
/gnr8/admin/evolution/[siteVersionId]
/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]
```

## Remaining UX Limitations

- The dashboard is intentionally dense and read-only; it does not provide edit,
  approval, regeneration, publishing, or comparison tools.
- The preview displays static proposal bundles. It does not imply publication,
  approval, compliance, deployment, provider execution, AI execution, or DNS
  binding.
- Iteration 1 has no image elements; its visual evidence is typography,
  layout, and text-only boundary/status presentation.
- Iteration 2 still preserves unresolved audience/offering/contact knowledge
  and remains non-compliant despite visible improvement.

## Recommended Next Phase

MVP-3.0-B is complete. The next safe phase is documentation-only planning for
the next read-only dashboard enhancement boundary, or a separate explicitly
authorized phase for operator-facing Evolution Dashboard UX polish. Do not
proceed to edit UX, Business Alignment UX, generation controls, approval,
publishing, deployment, provider execution, AI execution, DNS, or production
mutation without a new phase boundary.
