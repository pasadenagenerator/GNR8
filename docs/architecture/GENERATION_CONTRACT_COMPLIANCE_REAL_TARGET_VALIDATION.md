# Generation Contract Compliance Real-Target Validation

## Phase And Boundary

Phase MVP-1K-4-R validates the Generation Contract Compliance runtime against
real ODV and ViroiDoc Website Generation Package plus Observed Website Model
inputs.

This phase is validation only.

It does not add a Compliance Report, Business Approval, publishing, provider
calls, AI execution, UI, API, schema, workers, or generated content mutation.

## Validation Targets

| Target | siteVersionId | Source WGP |
| --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `website_generation_package_3e34393aef612a2c597042917dc45085` |

## Result

Real-target Generation Contract Compliance validation is blocked by a missing
Observed Website Model prerequisite on both targets.

| Target | Latest ObservedWebsiteModelArtifact | Exact WGP loaded | Compliance built | Compliance persisted | Result |
| --- | --- | --- | --- | --- | --- |
| ODV | missing | no | no | no | blocked |
| ViroiDoc | missing | no | no | no | blocked |

The validation harness called `loadLatestObservedWebsiteModel(...)` by
`siteVersionId` with no dry-run filter for each target. Both calls returned
`null`, meaning neither target currently has a valid latest persisted
`ObservedWebsiteModelArtifact` in the existing site-version
`importProvenanceSummary` boundary.

Because the Observed Website Model is missing, the phase stopped before
loading the exact WGP artifacts, before calling
`buildGenerationContractCompliance(...)`, and before calling
`persistGenerationContractCompliance(...)`.

## Blocker

ODV blocker:

- `siteVersionId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- missing prerequisite: latest persisted `ObservedWebsiteModelArtifact`
- required recovery phase: MVP-1K-3-R

ViroiDoc blocker:

- `siteVersionId`: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- missing prerequisite: latest persisted `ObservedWebsiteModelArtifact`
- required recovery phase: MVP-1K-3-R

## Persisted Compliance References

No `GenerationContractComplianceArtifact` was persisted in MVP-1K-4-R.

Persisted references:

- ODV: none
- ViroiDoc: none

## Reload And Idempotency

Latest reload, by-ID reload, and idempotent retry reuse were not exercised
because no compliance artifact could be built or persisted without an
Observed Website Model input.

## Compliance Summary

No compliance summary exists for either target yet.

Fields not produced because the source OWM is missing:

- compliance artifact ID
- status
- category results
- findings count
- deviations count
- evidence count
- limitations
- confidence
- diagnostics
- lineage
- latest reload equality
- by-ID reload equality

## Safety Verification

The validation stopped after missing Observed Website Model checks.

No Compliance Report artifact was created.

No Business Approval artifact was created.

No publishing artifact was created.

No provider call was made.

No AI output was produced.

No generated content mutation was performed.

No UI, API, schema, or worker surface was added.

## Validation Evidence

Focused real-target harness output at `2026-07-05T19:10:33.224Z`:

```json
{
  "executedAt": "2026-07-05T19:10:33.224Z",
  "results": [
    {
      "label": "ODV",
      "siteVersionId": "09dce7ea-d860-4f60-a1eb-26c3335b302e",
      "result": "missing_observed_website_model",
      "missingPrerequisite": "latest persisted ObservedWebsiteModelArtifact",
      "recommendation": "MVP-1K-3-R"
    },
    {
      "label": "ViroiDoc",
      "siteVersionId": "e26b0754-988b-45b9-9e24-8e213179b6cf",
      "result": "missing_observed_website_model",
      "missingPrerequisite": "latest persisted ObservedWebsiteModelArtifact",
      "recommendation": "MVP-1K-3-R"
    }
  ],
  "safety": {
    "complianceReportCreated": false,
    "businessApprovalCreated": false,
    "publishingCreated": false,
    "providerCallMade": false,
    "aiOutputProduced": false,
    "generatedContentMutated": false,
    "uiApiSchemaWorkerChanged": false
  }
}
```

## Recommended Next Phase

Recommended next phase: MVP-1K-3-R Observed Website Model Real-Target
Validation.

After ODV and ViroiDoc have latest persisted
`ObservedWebsiteModelArtifact` inputs, rerun MVP-1K-4-R. Do not rerun
MVP-1K-5-R, start Business Approval, publish, call providers, execute AI, add
UI/API/schema/workers, or mutate generated content until MVP-1K-4-R succeeds.
