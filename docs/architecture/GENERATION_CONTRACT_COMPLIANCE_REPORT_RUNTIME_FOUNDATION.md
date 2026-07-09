# Generation Contract Compliance Report Runtime Foundation

## Phase And Boundary

Phase MVP-1K-5 implements the first deterministic runtime foundation for the
Generation Contract Compliance Report.

This phase consumes only a persisted `GenerationContractComplianceArtifact`.
It explains the persisted compliance result in human-readable form. It does
not recompute compliance.

This phase adds no Business Approval, publishing, provider calls, AI
execution, UI, API, schema migration, workers, deployment, DNS mutation,
production mutation, or runtime mutation outside the explicitly authorized
report persistence boundary.

## Runtime Files

- `apps/platform/gnr8/architecture/generation-contract-compliance-report-contract.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-report-builder.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-report-persistence.ts`

Artifact kind:

```text
generation_contract_compliance_report
```

Runtime version:

```text
MVP-1K-5
```

## Contract

The contract defines `GenerationContractComplianceReportArtifact`, report
sections, recommendation model, readiness model, lineage, evidence summary,
diagnostics, and validation.

Allowed report statuses are:

- `draft`
- `partial`
- `ready`
- `blocked`
- `invalid`
- `stale`

Canonical recommendations are:

- `proceed_to_approval`
- `regenerate`
- `improve_wgp`
- `repeat_business_alignment`
- `insufficient_evidence`
- `human_review_required`

Canonical readiness statuses are:

- `ready`
- `ready_with_limitations`
- `requires_regeneration`
- `requires_alignment`
- `blocked`

## Builder

`buildGenerationContractComplianceReport(...)` consumes only:

- `GenerationContractComplianceArtifact`

The builder creates:

- executive summary
- overall compliance
- business compliance
- experience compliance
- implementation observability
- category results
- deviations
- missing requirements
- constraint violations
- business risks
- recommendation
- generation readiness
- limitations
- evidence summary
- lineage
- diagnostics

The builder is deterministic. IDs, ordering, recommendations, readiness, and
section content are derived from the persisted compliance artifact.

The builder does not:

- compare the generated website against the WGP;
- inspect generated output;
- call providers;
- execute AI;
- approve the generated website;
- authorize publishing;
- mutate upstream artifacts.

Compliance evaluates. The report explains.

## Persistence

Report persistence uses the existing site-version `importProvenanceSummary`
boundary.

It stores:

- `generationContractComplianceReportArtifacts`
- `latestGenerationContractComplianceReportArtifact`

Persistence supports:

- validated append-on-change records;
- equivalent latest reuse;
- latest load;
- by-ID load;
- complete artifact records with metadata references.

No database schema change is introduced in this phase.

## Validation

Validation enforces:

- required report identity and lineage;
- allowed statuses;
- report section structure;
- recommendation and readiness models;
- category coverage;
- source compliance consistency when supplied;
- recursive absence of Business Approval, publishing, provider execution, AI
  execution, runtime mutation, and upstream business mutation fields.

## Real-Target Validation

MVP-1K-5-R attempted real-target validation for ODV
`09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc
`e26b0754-988b-45b9-9e24-8e213179b6cf`.

Both targets are missing the required latest persisted
`GenerationContractComplianceArtifact`, so no real report was built or
persisted. The blocker is upstream of the report runtime:
MVP-1K-4-R must persist real ODV and ViroiDoc Generation Contract Compliance
artifacts before MVP-1K-5-R can validate report build, persistence, latest
reload, by-ID reload, and idempotent retry reuse.

MVP-2.0-E then completed the first real ODV Compliance Report after MVP-2.0-D
persisted the required ODV source compliance artifact.

MVP-2.0-E consumed only
`generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`, confirmed
it was latest for ODV, built the report with
`buildGenerationContractComplianceReport(...)`, and persisted it with
`persistGenerationContractComplianceReport(...)`.

Persisted ODV report:

- artifact ID:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`
- status: `blocked`
- recommendation: `regenerate`
- generation readiness: `requires_regeneration`
- sections: executive summary `blocked`, business compliance `blocked`,
  experience compliance `blocked`, implementation observability `blocked`,
  limitations `partial`
- latest reload, by-ID reload, and idempotent retry all returned
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`

The ODV report explains overall non-compliance, `8` failed categories, `2`
partial categories, `12` compliance evidence records, `17` observed evidence
references, `411` business risks, and the `regenerate` recommendation. It is
not Business Approval and does not authorize publishing.

## Stop Boundary

MVP-1K-5 stops after the report runtime foundation.

It does not implement Business Approval.

It does not implement publishing.

It does not implement UI/API/schema/workers.
