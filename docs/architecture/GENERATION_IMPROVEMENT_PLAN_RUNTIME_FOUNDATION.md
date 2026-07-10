# Generation Improvement Plan Runtime Foundation

## Phase And Boundary

Phase MVP-2.0-F implements the first deterministic runtime foundation for the
Generation Improvement Plan.

This phase consumes only a persisted
`GenerationContractComplianceReportArtifact`. It translates compliance report
findings into provider-neutral, business-governed regeneration instructions.

This phase does not regenerate a website, modify the Website Generation
Package, modify Compliance, modify the Compliance Report, create Business
Approval, publish, deploy, call providers, execute AI, create provider payload
v2, or add UI, API, schema, or workers.

## Runtime Files

- `apps/platform/gnr8/architecture/generation-improvement-plan-contract.ts`
- `apps/platform/gnr8/architecture/generation-improvement-plan-builder.ts`
- `apps/platform/gnr8/architecture/generation-improvement-plan-persistence.ts`

Artifact kind:

```text
generation_improvement_plan
```

Runtime version:

```text
MVP-2.0-F
```

## Contract

The contract defines `GenerationImprovementPlanArtifact`,
`GenerationImprovementAction`, `GenerationImprovementPriority`,
`GenerationImprovementCategory`, `GenerationImprovementLineage`,
`GenerationImprovementValidationResult`, and `GenerationImprovementStatus`.

Allowed statuses are:

- `draft`
- `ready`
- `blocked`
- `invalid`
- `stale`

Persistence rejects `invalid` and `stale`; it allows `draft`, `ready`, and
`blocked`.

Allowed priorities are:

- `critical`
- `high`
- `medium`
- `low`

Allowed improvement categories are:

- `Business Positioning`
- `Audience`
- `Navigation`
- `Messages`
- `Sections`
- `Trust`
- `Assets`
- `Accessibility`
- `SEO`
- `Constraints`
- `Other`

Allowed recommended next actions are:

- `regenerate`
- `collect_more_information`
- `human_review`
- `stop`

## Builder

`buildGenerationImprovementPlan(...)` consumes only:

- `GenerationContractComplianceReportArtifact`

The builder creates deterministic, provider-neutral improvement actions. Each
action includes:

- stable action ID;
- category;
- priority;
- business explanation;
- originating deviation IDs;
- originating requirement IDs;
- expected improvement outcome;
- evidence references.

Actions do not contain provider prompts, HTML, React, implementation
instructions, CSS, framework decisions, provider payloads, provider execution,
AI execution, regeneration output, approval, or publishing permission.

Priority is derived only from the compliance report's deviations, missing
requirements, business risks, and recommendation. It does not depend on
provider identity.

## Persistence

Generation Improvement Plan persistence uses the existing site-version
`importProvenanceSummary` boundary.

It stores:

- `generationImprovementPlanArtifacts`
- `latestGenerationImprovementPlanArtifact`

Persistence supports:

- latest load;
- by-ID load;
- append-on-change;
- latest reuse;
- idempotent retry reuse.

No database schema change is introduced.

## First Real ODV Plan

MVP-2.0-F created the first real ODV Generation Improvement Plan from persisted
Compliance Report
`generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.

Target:

- ODV siteVersionId:
  `09dce7ea-d860-4f60-a1eb-26c3335b302e`

Persisted plan:

- artifact ID:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`
- status: `ready`
- improvement count: `413`
- critical count: `259`
- high count: `0`
- medium count: `154`
- low count: `0`
- recommended next action: `regenerate`
- estimated regeneration readiness: `ready`

Category summary:

- `Constraints`: `228`
- `Assets`: `123`
- `Sections`: `36`
- `Navigation`: `8`
- `Messages`: `6`
- `Trust`: `6`
- `Business Positioning`: `4`
- `Accessibility`: `1`
- `SEO`: `1`

Source report verification:

- source report artifact ID matched the requested artifact;
- source report was latest for the ODV siteVersion;
- source report status was `blocked`;
- report validation passed with no errors or warnings;
- lineage matched siteVersion, dry run, source Compliance, source Website
  Generation Package, and source Observed Website Model.

Persistence verification:

- latest reload returned
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- by-ID reload returned
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- idempotent retry returned
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.

Safety verification:

- no WGP mutation;
- no Compliance mutation;
- no Compliance Report mutation;
- no provider payload mutation;
- no provider execution;
- no AI execution;
- no regeneration;
- no Business Approval;
- no publishing.

## MVP-2.0-M Evolution Effectiveness

MVP-2.0-M later consumed the persisted plan
`generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694` without
modifying it and compared stored Iteration 1 and Iteration 2 compliance
results against the same WGP.

Persisted Generation Evolution Analysis:

```text
generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253
```

The analysis found observed improvement for:

- `Messages`
- `Trust`
- `Constraints`

The analysis found no demonstrated improvement for:

- `Accessibility`
- `Assets`
- `Business Positioning`
- `Navigation`
- `SEO`
- `Sections`

This effectiveness view is deterministic and source-only. It does not
reinterpret the Improvement Plan, recompute compliance, create Improvement
Plan v2, create Provider Payload v3, regenerate, execute providers, execute
AI, approve, publish, deploy, or mutate production.

## Stop Boundary

MVP-2.0-F stops after the Generation Improvement Plan runtime foundation and
first persisted ODV plan.

It does not regenerate.

It does not create a new Website Generation Package.

It does not build Provider Payload v2.

It does not execute AI.
