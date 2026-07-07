# Observed Website Model Real-Target Validation

## Phase And Boundary

Phase MVP-1K-3-R validates the Observed Website Model runtime against real
ODV and ViroiDoc Generated Website Proposal artifacts.

This phase is validation only.

It does not add Generation Contract Compliance, a Compliance Report, Business
Approval, publishing, provider calls, AI execution, UI, API, schema, workers,
or generated content mutation.

## Validation Targets

| Target | siteVersionId |
| --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` |

## Result

Real-target Observed Website Model validation is blocked by a missing
Generated Website Proposal prerequisite on both targets.

| Target | Latest GeneratedWebsiteProposalArtifact | OWM built | OWM persisted | Result |
| --- | --- | --- | --- | --- |
| ODV | missing | no | no | blocked |
| ViroiDoc | missing | no | no | blocked |

The validation harness called `loadLatestGeneratedWebsiteProposal(...)` by
`siteVersionId` with no dry-run filter for each target. Both calls returned
`null`, meaning neither target currently has a valid latest persisted
`GeneratedWebsiteProposalArtifact` in the existing site-version
`importProvenanceSummary` boundary.

Because the source Generated Website Proposal is missing, the phase stopped
before calling `buildObservedWebsiteModel(...)`, before calling
`persistObservedWebsiteModel(...)`, before latest reload, before by-ID reload,
and before idempotent retry reuse.

## Blocker

ODV blocker:

- `siteVersionId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- missing prerequisite: latest persisted `GeneratedWebsiteProposalArtifact`
- existing generated proposal count: `0`
- required recovery step: import the manually generated output bundle as a
  quarantined Generated Website Proposal for this site version, then rerun
  MVP-1K-3-R.

ViroiDoc blocker:

- `siteVersionId`: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- missing prerequisite: latest persisted `GeneratedWebsiteProposalArtifact`
- existing generated proposal count: `0`
- required recovery step: import the manually generated output bundle as a
  quarantined Generated Website Proposal for this site version, then rerun
  MVP-1K-3-R.

## Persisted OWM References

No `ObservedWebsiteModelArtifact` was persisted in MVP-1K-3-R.

Persisted references:

- ODV: none
- ViroiDoc: none

## Reload And Idempotency

Latest reload equality, by-ID reload equality, and idempotent retry reuse were
not exercised because no Observed Website Model artifact could be built or
persisted without a source Generated Website Proposal.

## Observation Fields

Fields not produced because the source Generated Website Proposal is missing:

- OWM artifact ID
- status
- readiness
- pages count
- navigation count
- sections count
- messages count
- assets count
- constraints count
- technical signals count
- evidence count
- limitations
- diagnostics
- lineage
- latest reload equality
- by-ID reload equality

## Observation Quality

ODV observation quality: `blocked`.

Reason: no latest persisted `GeneratedWebsiteProposalArtifact` exists to
observe.

ViroiDoc observation quality: `blocked`.

Reason: no latest persisted `GeneratedWebsiteProposalArtifact` exists to
observe.

No Website Generation Package comparison was performed and no compliance
judgment was made.

## Safety Verification

The validation stopped after missing Generated Website Proposal checks.

No Observed Website Model artifact was persisted.

No Generation Contract Compliance artifact was created.

No Compliance Report artifact was created.

No Business Approval artifact was created.

No publishing artifact was created.

No provider call was made.

No AI output was produced.

No generated content mutation was performed.

No UI, API, schema, or worker surface was added.

Existing provenance counts before and after the harness were unchanged for
both targets:

| Target | Generated proposals | OWMs | Compliance artifacts | Compliance reports | Business approvals | Publishing artifacts | Provider payloads |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ODV | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `1 -> 1` |
| ViroiDoc | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `0 -> 0` | `1 -> 1` |

## Validation Evidence

Focused real-target harness output at `2026-07-07T07:10:48.346Z`:

```json
{
  "executedAt": "2026-07-07T07:10:48.346Z",
  "results": [
    {
      "label": "ODV",
      "siteVersionId": "09dce7ea-d860-4f60-a1eb-26c3335b302e",
      "result": "missing_generated_website_proposal",
      "blocker": "latest persisted GeneratedWebsiteProposalArtifact missing",
      "safetyBefore": {
        "generatedWebsiteProposalArtifacts": 0,
        "observedWebsiteModelArtifacts": 0,
        "generationContractComplianceArtifacts": 0,
        "generationContractComplianceReportArtifacts": 0,
        "businessApprovalArtifacts": 0,
        "publishingArtifacts": 0,
        "providerGenerationPayloadArtifacts": 1
      },
      "safetyAfter": {
        "generatedWebsiteProposalArtifacts": 0,
        "observedWebsiteModelArtifacts": 0,
        "generationContractComplianceArtifacts": 0,
        "generationContractComplianceReportArtifacts": 0,
        "businessApprovalArtifacts": 0,
        "publishingArtifacts": 0,
        "providerGenerationPayloadArtifacts": 1
      }
    },
    {
      "label": "ViroiDoc",
      "siteVersionId": "e26b0754-988b-45b9-9e24-8e213179b6cf",
      "result": "missing_generated_website_proposal",
      "blocker": "latest persisted GeneratedWebsiteProposalArtifact missing",
      "safetyBefore": {
        "generatedWebsiteProposalArtifacts": 0,
        "observedWebsiteModelArtifacts": 0,
        "generationContractComplianceArtifacts": 0,
        "generationContractComplianceReportArtifacts": 0,
        "businessApprovalArtifacts": 0,
        "publishingArtifacts": 0,
        "providerGenerationPayloadArtifacts": 1
      },
      "safetyAfter": {
        "generatedWebsiteProposalArtifacts": 0,
        "observedWebsiteModelArtifacts": 0,
        "generationContractComplianceArtifacts": 0,
        "generationContractComplianceReportArtifacts": 0,
        "businessApprovalArtifacts": 0,
        "publishingArtifacts": 0,
        "providerGenerationPayloadArtifacts": 1
      }
    }
  ],
  "safety": {
    "complianceArtifactCreatedByHarness": false,
    "complianceReportCreatedByHarness": false,
    "businessApprovalCreatedByHarness": false,
    "publishingCreatedByHarness": false,
    "providerPayloadCreatedByHarness": false,
    "providerCallMade": false,
    "aiOutputProduced": false,
    "generatedContentMutated": false,
    "uiApiSchemaWorkerChanged": false
  }
}
```

## Recommended Next Phase

Recommended next phase: manually import the ODV and ViroiDoc Generated
Website Proposal artifacts as quarantined proposal material under the existing
MVP-1K-1 import boundary.

After both targets have latest persisted `GeneratedWebsiteProposalArtifact`
inputs, rerun MVP-1K-3-R. Do not proceed to Generation Contract Compliance,
Compliance Report, Business Approval, publishing, provider calls, AI
execution, UI/API/schema/workers, or generated content mutation until OWM
real-target validation succeeds.
