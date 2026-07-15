# Second Generation Delivery Package

## Phase

MVP-2.0-H creates the first complete Second Generation Delivery Package for
ODV Iteration 2.

The package is a deterministic export for manual external generation. It does
not execute Codex, execute a provider, execute AI, regenerate a website, import
a Generated Website Proposal v2, create compliance, create Business Approval,
publish, deploy, mutate canonical artifacts, or add UI, API, schema, or
workers.

## Export

Export folder:

```text
ODV_REGENERATION_EXPORT_002/
```

Export ID:

```text
odv-regeneration-export-002
```

Generation cycle ID:

```text
odv-generation-cycle-002
```

Iteration:

```text
2
```

Target site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Export status:

```text
ready_for_manual_external_generation
```

## Source Artifacts

The package was created from already persisted canonical artifacts:

| Artifact | Artifact ID |
| --- | --- |
| WebsiteGenerationPackage | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` |
| ProviderGenerationPayload v2 | `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7` |
| GenerationImprovementPlan | `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694` |
| GenerationContractComplianceReport | `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de` |

The export copies canonical JSON values into:

- `website-generation-package.json`
- `provider-generation-payload-v2.json`
- `generation-improvement-plan.json`

These are export copies only. The canonical persisted artifacts were not
mutated.

## Files

The package contains:

- `manifest.json`
- `lineage.json`
- `website-generation-package.json`
- `provider-generation-payload-v2.json`
- `generation-improvement-plan.json`
- `business-summary.md`
- `regeneration-summary.md`
- `improvement-delta.md`
- `execution-readme.md`

## Lineage

`lineage.json` records the complete Iteration 2 source chain:

```text
BusinessDiscovery
-> DigitalBusinessTwin
-> BusinessUnderstandingReport
-> BusinessAlignment
-> WebsiteDesignBrief
-> WebsiteGenerationPackage
-> ProviderPayload v1
-> GeneratedProposal
-> ObservedWebsite
-> Compliance
-> ComplianceReport
-> GenerationImprovementPlan
-> ProviderPayload v2
```

Lineage continuity checks passed for all links, including:

- GeneratedProposal follows ProviderPayload v1.
- ObservedWebsite follows GeneratedProposal.
- Compliance follows WebsiteGenerationPackage.
- Compliance follows ObservedWebsite.
- ComplianceReport follows Compliance.
- GenerationImprovementPlan follows ComplianceReport.
- ProviderPayload v2 follows WebsiteGenerationPackage.
- ProviderPayload v2 follows GenerationImprovementPlan.

## Regeneration Summary

The package records:

- iteration: `2`;
- current compliance: `NON_COMPLIANT`;
- reason: `Regeneration Required`;
- improvement items: `413`;
- critical improvements: `259`;
- medium improvements: `154`;
- business intent: `Preserve`;
- expected result: `Higher contractual compliance`.

`improvement-delta.md` is derived from the
`GenerationImprovementPlanArtifact`. It includes KEEP, IMPROVE, DO NOT CHANGE,
KNOWN LIMITATIONS, CRITICAL IMPROVEMENTS, and EXPECTED COMPLIANCE GAINS.

## Safety Classification

The manifest safety classification is:

```text
export_only_no_execution
```

Verified false:

- provider execution;
- AI execution;
- regeneration;
- generated website creation;
- proposal import;
- compliance mutation;
- Business Approval;
- publishing;
- deployment;
- production mutation;
- canonical artifact mutation.

## Validation

Validation performed for MVP-2.0-H:

- all JSON files parse;
- manifest export ID, generation cycle ID, iteration, siteVersionId, source
  references, safety classification, and export status are consistent;
- copied canonical artifact files match manifest references;
- lineage continuity is complete;
- `git diff --check` passes.

## Durable Preview Follow-Up

P0 Durable Generated Proposal Preview Runtime Foundation later introduced the
`generated_proposal_bundle` artifact so Iteration 2 preview can be
reconstructed from persisted runtime storage.

`ODV_GENERATED_PROPOSAL_002/` remains the historical manual output folder and
the materialization input for the durable bundle. It is no longer the preview
route's runtime dependency once the bundle artifact is persisted.

Canonical record:

```text
docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md
```

## Next Phase

Recommended next phase:

```text
MVP-2.0-I - Manual External Regeneration Execution
```

That phase should consume `ODV_REGENERATION_EXPORT_002/` outside GNR8 and
produce an implementation proposal only. It must still stop before GNR8
provider execution, automated AI execution from GNR8, Generated Website
Proposal v2 import, compliance, Business Approval, publishing, deployment,
DNS mutation, production mutation, UI, API, schema, or workers unless
explicitly authorized.
