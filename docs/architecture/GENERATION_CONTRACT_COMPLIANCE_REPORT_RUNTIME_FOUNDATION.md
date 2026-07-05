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

## Stop Boundary

MVP-1K-5 stops after the report runtime foundation.

It does not implement Business Approval.

It does not implement publishing.

It does not implement UI/API/schema/workers.
