# Second Generated Website Proposal Import

## Phase And Boundary

Phase MVP-2.0-J imported the second manually generated ODV website proposal as
a quarantined `GeneratedWebsiteProposalArtifact`.

This phase imported Iteration 2 only.

It did not build Observed Website Model v2, run compliance v2, compare
iterations, create Compliance Report v2, create Business Approval, publish,
deploy, mutate DNS, mutate production, execute providers, execute AI,
regenerate the website, modify WGP, modify the Generation Improvement Plan,
modify Provider Payload v2, or add UI/API/schema/workers.

## Target

ODV site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Source bundle:

```text
ODV_GENERATED_PROPOSAL_002/
```

## Source Manifest Verification

`ODV_GENERATED_PROPOSAL_002/proposal-manifest.json` was loaded and verified.

Verified manifest signals:

- proposal identity: `ODV_GENERATED_PROPOSAL_002`;
- proposal kind/status: `GeneratedWebsiteProposal` / `quarantined`;
- target: `ODV`;
- iteration: `2`;
- generation cycle: `odv-generation-cycle-002`;
- source export: `odv-regeneration-export-002`;
- source WGP artifact:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- source Generation Improvement Plan artifact:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- source Provider Payload v2 artifact:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- source Compliance Report artifact:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`;
- proposal-only safety boundary flags were false for deployment, publishing,
  DNS mutation, production mutation, proposal import already executed,
  compliance execution, Business Approval creation, and canonical artifact
  modification.

Output bundle completeness was verified for all manifest files and
deliverables. The persisted output-bundle metadata records:

- file count: `17`;
- byte size: `39875`;
- content hash:
  `sha256:28fbb2b9fd11cfea1ea8e096c0de55b0942042f3c1986cc7b23e3402575bcab2`;
- entrypoint: `source/index.html`.

## Source Lineage Verification

The required source chain was verified through persisted artifacts:

```text
WebsiteGenerationPackage
  ↓
GenerationContractCompliance
  ↓
ComplianceReport
  ↓
GenerationImprovementPlan
  ↓
ProviderGenerationPayload v2
  ↓
GeneratedWebsiteProposal v2
```

Verified artifact chain:

- WebsiteGenerationPackage:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- GenerationContractCompliance:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`;
- ComplianceReport:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`;
- GenerationImprovementPlan:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- ProviderGenerationPayload v2:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- GeneratedWebsiteProposal v2:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.

Iteration 1 remains preserved by ID:

```text
generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
```

Generation cycle and iteration metadata were preserved in source diagnostics
and operator attestation. No canonical proposal contract fields were added for
cycle metadata.

## Persisted Artifact

The proposal was built with:

```text
buildGeneratedWebsiteProposalFromManualOutput(...)
```

It was persisted with the existing Generated Website Proposal persistence
helper using artifact kind:

```text
generated_website_proposal
```

Persisted Iteration 2 artifact:

```text
generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
```

Generated proposal identity:

```text
generated-website-proposal:0428d911ceda6f91099ce6fbec2cd8e4
```

Status:

```text
quarantined
```

Validation readiness:

```text
ready
readyForCompliance: true
```

The status means the artifact is ready for a future observation/compliance
input boundary. It does not mean observation, compliance, report generation,
approval, publishing, deployment, provider execution, or AI execution
occurred.

## Persistence Verification

Before import:

- `generatedWebsiteProposalArtifacts`: `1`;
- latest proposal: Iteration 1
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`.

After first persist:

- `generatedWebsiteProposalArtifacts`: `2`;
- latest proposal: Iteration 2
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.

After idempotent retry:

- `generatedWebsiteProposalArtifacts`: `2`;
- retry reused
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.

Reload verification:

- latest reload returned
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`;
- by-ID reload returned
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`;
- latest reload equaled by-ID reload;
- Iteration 1 by-ID reload still returned
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`;
- Iteration 2 artifact ID is distinct from Iteration 1.

## Safety Verification

The persisted artifact is quarantined.

Unchanged downstream counts before/after/retry:

- `observedWebsiteModelArtifacts`: `2`;
- `generationContractComplianceArtifacts`: `1`;
- `generationContractComplianceReportArtifacts`: `1`;
- `businessApprovalArtifacts`: `0`.

Confirmed false on the persisted artifact:

- GNR8 provider execution allowed;
- GNR8 AI execution allowed;
- publishing allowed;
- deployment allowed;
- DNS mutation allowed;
- production mutation allowed;
- runtime mutation allowed;
- compliance execution allowed;
- Business Approval allowed;
- canonical truth update allowed.

## Iteration Register

Iteration 1:

- artifact:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`;
- source bundle: `ODV_GENERATED_PROPOSAL_001/`;
- source Provider Payload:
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`;
- role: first generated proposal and source for the first real ODV OWM.

Iteration 2:

- artifact:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`;
- source bundle: `ODV_GENERATED_PROPOSAL_002/`;
- source Provider Payload v2:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- generation cycle: `odv-generation-cycle-002`;
- role: latest quarantined proposal, ready for future observation.

Iteration 2 does not overwrite, supersede destructively, or mutate Iteration 1.

## Validation

Required validation commands:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/generated-website-proposal-*.test.ts
cd apps/platform && pnpm run vercel-build
git diff --check
```

## Recommended Next Phase

MVP-2.0-K - Observed Website Model v2 for ODV.

The next phase should consume latest GeneratedWebsiteProposal v2
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e` and build the
second Observed Website Model only if explicitly authorized.

It should still stop before compliance v2, iteration comparison, Compliance
Report v2, Business Approval, publishing, deployment, DNS mutation, production
mutation, provider execution, AI execution, UI, API, schema, or workers.
