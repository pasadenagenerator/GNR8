# Codex Task Provider Payload Real-Target Validation

## Phase

MVP-1H-R validates the MVP-1H Codex task ProviderGenerationPayload runtime
against real persisted ODV and ViroiDoc Website Generation Package artifacts.

Boundary:
- Validation only.
- No provider call.
- No prompt sent.
- No AI execution.
- No generated website.
- No generated content, HTML, React, components, code, framework, or library
  output.
- No compliance execution.
- No Business Approval.
- No publishing or deployment artifact.
- No UI, API, schema, or worker behavior.

## Source Targets

| Target | Site Version | Source WGP Artifact | Latest Source WGP |
| --- | --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` | Yes |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `website_generation_package_3e34393aef612a2c597042917dc45085` | Yes |

Both source Website Generation Package artifacts were loaded by exact artifact
ID and confirmed as the latest WGP for their site version and dry run.

## Validation Procedure

For each target, the validation performed:

1. Load exact `WebsiteGenerationPackageArtifact` by ID.
2. Confirm the WGP is latest for the target site version and dry run.
3. Build `ProviderGenerationPayload` with
   `buildCodexTaskProviderPayload(...)`.
4. Persist with `persistProviderGenerationPayload(...)`.
5. Reload latest with `loadLatestProviderGenerationPayload(...)`.
6. Reload exact artifact with `loadProviderGenerationPayloadById(...)`.
7. Re-run persistence with the same semantic payload to prove idempotent latest
   reuse.
8. Verify envelope readability and export readiness.
9. Verify the export-only safety boundary and absence of forbidden generated
   output/provider-result fields.

## ODV Result

Source:
- site version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- source WGP artifact:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
- source WGP semantic ID:
  `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`
- source WGP status: `partial`
- source WGP latest: yes

Persisted provider payload:
- provider payload artifact:
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`
- provider generation payload ID:
  `provider-generation-payload:c8f60618b95a4bd13003a68606860705`
- persisted at: `2026-07-04T20:39:24.527Z`
- status: `draft`
- provider type: `codex`
- payload kind: `codex_task`
- preserved constraints: `114`
- validation expectations: `10`
- limitations: `112`
- diagnostics: `8`
- confidence: `LOW`

Lineage and preservation:
- `sourceWebsiteGenerationPackageId` preserved.
- `sourceWebsiteGenerationPackageArtifactId` preserved.
- source WGP status `partial` and contract version `MVP-1F` preserved.
- full serialized WGP present.
- Codex task envelope present.
- constraints, validation expectations, confidence, limitations, and
  diagnostics preserved.

Reload/idempotency:
- latest reload equality: passed.
- by-ID reload equality: passed.
- idempotent retry reused the same provider payload artifact ID.

## ViroiDoc Result

Source:
- site version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- source WGP artifact:
  `website_generation_package_3e34393aef612a2c597042917dc45085`
- source WGP semantic ID:
  `website-generation-package:fc07e8ff8e4dc327525f69bc51cf6bd8`
- source WGP status: `partial`
- source WGP latest: yes

Persisted provider payload:
- provider payload artifact:
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230`
- provider generation payload ID:
  `provider-generation-payload:3852b55826a72ec74223c01d74685dbb`
- persisted at: `2026-07-04T20:39:33.618Z`
- status: `draft`
- provider type: `codex`
- payload kind: `codex_task`
- preserved constraints: `111`
- validation expectations: `10`
- limitations: `111`
- diagnostics: `8`
- confidence: `LOW`

Lineage and preservation:
- `sourceWebsiteGenerationPackageId` preserved.
- `sourceWebsiteGenerationPackageArtifactId` preserved.
- source WGP status `partial` and contract version `MVP-1F` preserved.
- full serialized WGP present.
- Codex task envelope present.
- constraints, validation expectations, confidence, limitations, and
  diagnostics preserved.

Reload/idempotency:
- latest reload equality: passed.
- by-ID reload equality: passed.
- idempotent retry reused the same provider payload artifact ID.

## Envelope Export Readiness

Both target payloads include a complete Codex task envelope with:

- objective;
- source package summary;
- required website outcomes;
- navigation, page, and section requirements;
- content requirements;
- constraints;
- validation expectations;
- forbidden actions;
- expected output shape;
- stop conditions.

The expected output kind is:

```text
implementation_proposal_only
```

Each envelope includes `11` forbidden actions and `7` stop conditions.

Result:
- ODV envelope/export readiness: passed.
- ViroiDoc envelope/export readiness: passed.

## Safety Verification

Both persisted payloads carry safety classification:

```text
export_only_no_execution
```

All execution and mutation flags are false:
- provider execution;
- AI execution;
- generated website output;
- publishing;
- deployment;
- DNS mutation;
- production mutation;
- compliance execution.

The validation found no:
- provider call;
- prompt sent;
- AI execution;
- generated website;
- generated content;
- generated HTML;
- generated React;
- generated components;
- code/framework/library output;
- publishing artifact;
- deployment artifact;
- execution artifact;
- compliance execution;
- Business Approval.

## Validation Commands

Focused tests:

```bash
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/provider-generation-payload-*.test.ts apps/platform/gnr8/architecture/codex-task-provider-payload-builder.test.ts
```

Platform build:

```bash
cd apps/platform && pnpm run vercel-build
```

Diff hygiene:

```bash
git diff --check
```

## Result

MVP-1H-R is complete.

Real ODV and ViroiDoc Website Generation Package artifacts now produce
persisted, reloadable, export-ready Codex task ProviderGenerationPayload
artifacts.

Recommended next phase:

- MVP-1I Provider Execution Boundary Design, documentation and contract design
  only. Define the authorization boundary for a future provider call from a
  persisted `provider_generation_payload`. Stop before provider calls, prompts
  sent, AI execution, generated websites, compliance execution, Business
  Approval, publishing, UI, API, schema, or workers unless explicitly
  authorized.
