# Provider Payload v2 Runtime Foundation

## Phase

MVP-2.0-G implements the deterministic ProviderGenerationPayload v2 runtime
foundation.

Provider Payload v2 is produced from:

```text
WebsiteGenerationPackage
+
GenerationImprovementPlan
```

It prepares the next generation cycle, but performs no provider execution.

Boundary:
- No provider execution.
- No AI execution.
- No website regeneration.
- No Website Generation Package mutation.
- No Generation Improvement Plan mutation.
- No Compliance mutation.
- No Compliance Report mutation.
- No Business Approval.
- No publishing.
- No deployment.
- No canonical business artifact mutation.
- No UI, API, schema, or worker behavior.

## Runtime Modules

Implemented modules:

- `apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-v2.test.ts`

Reused modules:

- `apps/platform/gnr8/architecture/provider-generation-payload-contract.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-persistence.ts`

Provider Payload v2 reuses the existing canonical artifact kind:

```text
provider_generation_payload
```

No `ProviderGenerationPayloadV2` canonical artifact type was introduced.

## Builder

`buildProviderGenerationPayloadV2(...)` consumes only:

```text
WebsiteGenerationPackageArtifact
sourceWebsiteGenerationPackageArtifactId
GenerationImprovementPlanArtifact
sourceGenerationImprovementPlanArtifactId
createdAt optional timestamp
```

The builder is deterministic for identical semantic inputs.

The builder verifies source integrity before building:

- both source artifact IDs are present;
- both artifacts share the same site version;
- both artifacts share the same dry run;
- the Generation Improvement Plan references the source Website Generation
  Package;
- source lineage agrees with source artifact fields.

Broken source lineage fails closed before payload construction.

## Payload Preservation

Provider Payload v2 preserves the original Website Generation Package
unchanged in `serializedWebsiteGenerationPackage`.

It preserves:

- business context;
- objectives;
- audience;
- messages;
- navigation contracts;
- page contracts;
- section contracts;
- content requirements;
- validation expectations;
- confidence;
- limitations;
- lineage.

The original business intent remains unchanged. The Improvement Plan is
integrated only as deterministic regeneration guidance.

## Improvement Integration

Each improvement is translated into `regenerationGuidance.improve`.

Every improvement guidance item records:

- originating improvement ID;
- originating deviation IDs;
- originating requirement IDs;
- category;
- priority;
- expected outcome.

The guidance is business-level only. It contains no provider-specific wording,
HTML, React, CSS, framework decisions, generated website output, or
implementation instructions.

When a source Improvement Plan action has no explicit deviation or requirement
ID, the v2 builder records a deterministic source-plan placeholder reference
instead of silently dropping traceability.

## Regeneration Guidance

Provider Payload v2 adds:

```text
regenerationGuidance
```

This section contains only:

- `preserve`;
- `improve`;
- `do_not_change`;
- `known_limitations`;
- `critical_items`.

The section is regeneration planning only. It does not authorize or perform
execution.

## Delta Summary

Provider Payload v2 adds:

```text
deltaSummary
```

The summary records:

- total improvements;
- critical count;
- high count;
- medium count;
- low count;
- affected categories;
- recommended regeneration strategy.

This is not compliance. It is deterministic regeneration planning.

## Persistence

Provider Payload v2 persists as:

```text
provider_generation_payload
```

using the existing site-version `importProvenanceSummary` provenance boundary.

Persistence supports:

- latest load;
- by-ID load;
- append-on-change history;
- semantic latest reuse;
- idempotent retry.

Persistence rejects:

- `invalid`;
- `stale`.

Persistence allows:

- `draft`;
- `ready`;
- `blocked`;
- legacy `valid` records.

## ODV Result

Target:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Source Website Generation Package:

```text
website_generation_package_c2c555025f186178f27c44c7cd272d4d
```

Source Generation Improvement Plan:

```text
generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
```

Persisted Provider Payload v2 artifact:

```text
provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7
```

Status:

```text
ready
```

Runtime version:

```text
MVP-2.0-G
```

Preserved source WGP summary:

- source WGP status: `partial`;
- business context preserved;
- objectives: `2`;
- audience entries: `3`;
- messages: `5`;
- navigation destinations: `4`;
- page contracts: `4`;
- section contracts: `14`;
- content requirements: `128`;
- validation expectations: `10`;
- confidence: `LOW`.

Improvement summary:

- total improvements: `413`;
- critical: `259`;
- high: `0`;
- medium: `154`;
- low: `0`;
- affected categories: Accessibility, Assets, Business Positioning,
  Constraints, Messages, Navigation, SEO, Sections, Trust.

Regeneration guidance summary:

- preserve entries: `12`;
- improve entries: `413`;
- do-not-change entries: `6`;
- known limitation entries: `112`;
- critical items: `259`;
- recommended strategy: run a full business-level regeneration pass focused
  first on critical items.

Reload evidence:

- latest WGP:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- latest Improvement Plan:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- latest Provider Payload v2 reload:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- by-ID Provider Payload v2 reload:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- idempotent retry:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.

Safety verification passed with no errors or warnings.

## Validation

Focused validation:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/provider-generation-payload-v2*.test.ts
```

Result:

```text
6 tests passed
```

Required build validation:

```text
cd apps/platform && pnpm run vercel-build
```

Result: passed. Build completed successfully with pre-existing lint warnings
in unrelated UI files.

Diff validation:

```text
git diff --check
```

Result: passed.

## MVP-2.0-H Completion

MVP-2.0-H created the first complete Second Generation Delivery Package:

```text
ODV_REGENERATION_EXPORT_002/
```

The package exports persisted Provider Payload v2
`provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7` with the
persisted ODV WebsiteGenerationPackage, GenerationImprovementPlan, manifest,
lineage, business summary, regeneration summary, improvement delta, and manual
external execution readme.

MVP-2.0-H added no provider execution, AI execution, regeneration, Generated
Website Proposal v2, import, compliance mutation, Business Approval,
publishing, deployment, canonical artifact mutation, UI, API, schema, or
workers.

Canonical document:

```text
docs/architecture/SECOND_GENERATION_DELIVERY_PACKAGE.md
```

## Next Phase

Recommended next phase:

```text
MVP-2.0-I - Manual External Regeneration Execution
```

This phase should consume `ODV_REGENERATION_EXPORT_002/` outside GNR8 and
produce an implementation proposal only while still stopping before GNR8
provider execution, automated AI execution from GNR8, Generated Website
Proposal v2 import, compliance, Business Approval, publishing, deployment,
DNS, production mutation, UI, API, schema, or workers unless explicitly
authorized.
