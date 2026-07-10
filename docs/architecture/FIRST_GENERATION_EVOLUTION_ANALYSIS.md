# First Generation Evolution Analysis

## Phase And Boundary

MVP-2.0-M creates the first deterministic Generation Evolution Analysis for
ODV.

This phase compares two persisted Generation Contract Compliance artifacts
from Iteration 1 and Iteration 2 against the same Website Generation Package.
It does not recompute compliance.

Generation Evolution Analysis is distinct from Generation Contract Compliance,
Generation Contract Compliance Report, Generation Improvement Plan, Provider
Payload, Business Approval, publishing, deployment, DNS, production mutation,
and canonical business truth.

## Runtime Files

- `apps/platform/gnr8/architecture/generation-evolution-analysis-contract.ts`
- `apps/platform/gnr8/architecture/generation-evolution-analysis-builder.ts`
- `apps/platform/gnr8/architecture/generation-evolution-analysis-persistence.ts`

Artifact kind:

```text
generation_evolution_analysis
```

Runtime version:

```text
MVP-2.0-M
```

## Source Artifacts

Target:

- ODV siteVersionId:
  `09dce7ea-d860-4f60-a1eb-26c3335b302e`

Shared Website Generation Package:

- persisted WGP artifact:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
- inner WGP ID referenced by compliance artifacts:
  `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`

Compared compliance artifacts:

- Iteration 1:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`
- Iteration 2:
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`

Both compliance artifacts existed, belonged to the same siteVersionId, shared
the same canonical WGP, preserved WGP lineage, referenced distinct OWM sources,
and Compliance v2 was latest before the analysis was persisted.

The source compliance artifacts were not modified.

## Persisted Result

Persisted Generation Evolution Analysis:

```text
generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253
```

Status:

```text
improved
```

Overall assessment:

```text
meaningful_improvement
```

Recommended next action:

```text
create_compliance_report_v2
```

This recommendation is not Business Approval.

## Category Transitions

| Category | Transition | Iteration 1 | Iteration 2 |
| --- | --- | --- | --- |
| `objectives_represented` | `still_non_compliant` | `non_compliant` | `non_compliant` |
| `navigation_obligations` | `still_non_compliant` | `non_compliant` | `non_compliant` |
| `page_obligations` | `still_non_compliant` | `non_compliant` | `non_compliant` |
| `section_obligations` | `still_non_compliant` | `non_compliant` | `non_compliant` |
| `message_coverage` | `newly_compliant` | `non_compliant` | `compliant` |
| `asset_presence` | `still_non_compliant` | `non_compliant` | `non_compliant` |
| `trust_signal_presence` | `newly_compliant` | `non_compliant` | `compliant` |
| `constraints_preserved` | `evidence_improved` | `non_compliant` | `non_compliant` |
| `accessibility_expectations_observable` | `still_partial` | `partial` | `partial` |
| `seo_expectations_observable` | `still_partial` | `partial` | `partial` |

Improved categories:

- `message_coverage`
- `trust_signal_presence`
- `constraints_preserved`

Regressed categories:

- none

Unresolved categories:

- `objectives_represented`
- `navigation_obligations`
- `page_obligations`
- `section_obligations`
- `asset_presence`
- `accessibility_expectations_observable`
- `seo_expectations_observable`

## Metric Deltas

| Metric | Iteration 1 | Iteration 2 | Delta |
| --- | ---: | ---: | ---: |
| compliant category count | `0` | `2` | `+2` |
| partial category count | `2` | `2` | `0` |
| non-compliant category count | `8` | `6` | `-2` |
| finding count | `149` | `149` | `0` |
| deviation count | `145` | `132` | `-13` |
| evidence record count | `12` | `25` | `+13` |
| limitation count | `268` | `252` | `-16` |
| confidence | `MEDIUM` | `MEDIUM` | `0` |

Metric deltas are diagnostics only. A numerical delta alone is not treated as a
business conclusion, and improvement is not claimed merely because evidence
record counts increased.

## Improvement Plan Effectiveness

Source Generation Improvement Plan:

```text
generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
```

| Improvement Category | Outcome | Related Compliance Category |
| --- | --- | --- |
| `Messages` | `observed_improvement` | `message_coverage` |
| `Trust` | `observed_improvement` | `trust_signal_presence` |
| `Constraints` | `observed_improvement` | `constraints_preserved` |
| `Accessibility` | `no_demonstrated_improvement` | `accessibility_expectations_observable` |
| `Assets` | `no_demonstrated_improvement` | `asset_presence` |
| `Business Positioning` | `no_demonstrated_improvement` | `objectives_represented` |
| `Navigation` | `no_demonstrated_improvement` | `navigation_obligations` |
| `SEO` | `no_demonstrated_improvement` | `seo_expectations_observable` |
| `Sections` | `no_demonstrated_improvement` | `section_obligations` |

The Improvement Plan was not modified or reinterpreted.

## Persistence Verification

- latest reload returned
  `generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`
- by-ID reload returned
  `generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`
- idempotent retry reused
  `generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`

Persistence uses the existing site-version `importProvenanceSummary` boundary
with append-on-change and equivalent-latest reuse. No database schema migration
was introduced.

## Safety Verification

MVP-2.0-M created no Compliance Report v2, Improvement Plan v2, Provider
Payload v3, regenerated website, provider execution, AI output, Business
Approval, publishing artifact, deployment artifact, DNS mutation, production
mutation, runtime mutation, WGP mutation, OWM mutation, source compliance
mutation, canonical business mutation, UI, API, schema migration, or worker.

## Validation

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/generation-evolution-analysis-*.test.ts
```

Result:

```text
17 passed / 0 failed
```

MVP-2.0-M stops after the first measured GNR8 generation evolution.
