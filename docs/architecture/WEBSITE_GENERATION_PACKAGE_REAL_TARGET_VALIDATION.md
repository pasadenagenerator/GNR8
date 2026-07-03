# Website Generation Package Real-Target Validation

## Phase And Boundary

Phase MVP-1F-R validates the MVP-1F Website Generation Package runtime against
real persisted ODV and ViroiDoc Website Design Brief artifacts.

This pass is validation plus documentation only. It did not modify runtime
behavior.

This pass did not add provider adapters, external AI, generation, compliance
execution, Business Approval, publishing, UI, API, schema, or workers.

## Method

For each target, validation loaded the exact supplied Website Design Brief by
ID, confirmed it was latest for the site version and dry run, then executed:

```text
loadWebsiteDesignBriefById(...)
loadLatestWebsiteDesignBrief(...)
buildWebsiteGenerationPackage(...)
persistWebsiteGenerationPackage(...)
loadLatestWebsiteGenerationPackage(...)
loadWebsiteGenerationPackageById(...)
persistWebsiteGenerationPackage(...) // idempotent retry
```

Persistence used the existing site-version `importProvenanceSummary` boundary
and artifact kind `website_generation_package`.

## Target Results

| Target | siteVersionId | source WDB latest | source WDB artifact | Website Generation Package artifact | status |
| --- | --- | --- | --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | yes | `website_design_brief_ff19a711c948d28fdd58bdea521c4f59` | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` | `partial` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | yes | `website_design_brief_782c43e390c353d192af867c227d191d` | `website_generation_package_3e34393aef612a2c597042917dc45085` | `partial` |

## ODV Result

Source artifact:

- Website Design Brief artifact:
  `website_design_brief_ff19a711c948d28fdd58bdea521c4f59`
- Website Design Brief latest equality: yes
- Website Design Brief status: `partial`
- Dry run ID: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

Persisted Website Generation Package:

- Artifact ID:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
- Website Generation Package ID:
  `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`
- Status: `partial`
- Objectives: `2`
- Audience requirements: `3`
- Messages: `5`
- Navigation destinations: `4`
- Page contracts: `4`
- Section contracts: `14`
- Content requirements: `128`
- Constraints: `114`
- Validation expectations: `10`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_partial`,
  `missing_business_knowledge`,
  `website_design_brief_projected_from_aligned_dbt`,
  `website_generation_package_projected_from_website_design_brief`,
  `website_only_business_discovery`
- Limitations: `111`
- Diagnostics: `WEBSITE_GENERATION_PACKAGE_ARTIFACT_VALID`,
  `WEBSITE_GENERATION_PACKAGE_CONTAINS_NO_PROMPT_OR_GENERATED_WEBSITE`,
  `WEBSITE_GENERATION_PACKAGE_IS_PROVIDER_NEUTRAL_CONTRACT`,
  `WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION:MVP-1F`,
  `WEBSITE_GENERATION_PACKAGE_STATUS:partial`
- Lineage: source WDB `website-design-brief:b2aa6ffee52dda53095e3e004286de0c`,
  source WDB status `partial`, source WDB contract `MVP-1E`, source DBT
  `digital-business-twin:09dce7ea-d860-4f60-a1eb-26c3335b302e:09dce7ea-d860-4f60-a1eb-26c3335b302e-8b-12l:business_discovery_7b37413651d79de0d109e31690a34b62:alignment:9bf462ca9250eea9`,
  source Business Alignment
  `business-alignment:b588bc0416fc1eee93de0ac54a8cd2d3`, `17` evidence
  refs, and `9` upstream artifact refs.

Human-readability result:

- Explains what an external generation system must create: yes
- Explains what business objectives must be supported: yes
- Explains what messages must be communicated: yes
- Explains what journey, navigation, and content must be represented: yes
- Explains what constraints must be preserved: yes
- Explains what validation expectations must be checked later: yes

## ViroiDoc Result

Source artifact:

- Website Design Brief artifact:
  `website_design_brief_782c43e390c353d192af867c227d191d`
- Website Design Brief latest equality: yes
- Website Design Brief status: `partial`
- Dry run ID: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`

Persisted Website Generation Package:

- Artifact ID:
  `website_generation_package_3e34393aef612a2c597042917dc45085`
- Website Generation Package ID:
  `website-generation-package:fc07e8ff8e4dc327525f69bc51cf6bd8`
- Status: `partial`
- Objectives: `3`
- Audience requirements: `3`
- Messages: `12`
- Navigation destinations: `4`
- Page contracts: `4`
- Section contracts: `14`
- Content requirements: `134`
- Constraints: `111`
- Validation expectations: `10`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_partial`,
  `missing_business_knowledge`,
  `website_design_brief_projected_from_aligned_dbt`,
  `website_generation_package_projected_from_website_design_brief`,
  `website_only_business_discovery`
- Limitations: `110`
- Diagnostics: `WEBSITE_GENERATION_PACKAGE_ARTIFACT_VALID`,
  `WEBSITE_GENERATION_PACKAGE_CONTAINS_NO_PROMPT_OR_GENERATED_WEBSITE`,
  `WEBSITE_GENERATION_PACKAGE_IS_PROVIDER_NEUTRAL_CONTRACT`,
  `WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION:MVP-1F`,
  `WEBSITE_GENERATION_PACKAGE_STATUS:partial`
- Lineage: source WDB `website-design-brief:0d416a5954c8f8c8cd7ff92566d69a48`,
  source WDB status `partial`, source WDB contract `MVP-1E`, source DBT
  `digital-business-twin:e26b0754-988b-45b9-9e24-8e213179b6cf:e26b0754-988b-45b9-9e24-8e213179b6cf-8b-12n:business_discovery_360fa099cbcede288c2d0e04f2ec7986:alignment:3131e94025f0dc1d`,
  source Business Alignment
  `business-alignment:2ab20b1fa6d066b730274e8f764a097b`, `13` evidence
  refs, and `9` upstream artifact refs.

Human-readability result:

- Explains what an external generation system must create: yes
- Explains what business objectives must be supported: yes
- Explains what messages must be communicated: yes
- Explains what journey, navigation, and content must be represented: yes
- Explains what constraints must be preserved: yes
- Explains what validation expectations must be checked later: yes

## Reload And Idempotency

| Target | latest WGP equality | by-ID WGP equality | rebuilt semantic equality | WGP retry reused same artifact |
| --- | --- | --- | --- | --- |
| ODV | yes | yes | yes | yes |
| ViroiDoc | yes | yes | yes | yes |

Both targets produced persisted, reloadable Website Generation Package
artifacts. A second persistence call with equivalent artifacts reused the
latest artifact IDs.

ODV and ViroiDoc exact rebuilt equality differs only by rebuilt `createdAt`
after the stored equivalent latest artifact is reused. Semantic equality,
latest reload equality, by-ID reload equality, and retry reuse all pass.

## Generation Contract Summary

Both WGPs are provider-neutral generation contracts. They define:

- business context that must be preserved;
- generation objectives that must be supported;
- audience requirements with unresolved knowledge kept visible;
- required messages;
- journey and navigation obligations;
- page contracts and section contracts;
- content requirements;
- constraints and limitations.

They do not define provider payloads, prompts, code, framework choices,
library choices, generated websites, generated content, publishing outputs, or
execution artifacts.

## Validation Contract Summary

Both WGPs contain `10` validation expectations covering:

- business positioning;
- audience representation;
- message coverage;
- brand consistency;
- navigation completeness;
- journey completeness;
- trust signal coverage;
- accessibility expectations;
- SEO intent;
- constraint preservation.

MVP-1F-R did not execute compliance. These expectations are carried forward
for a later authorized compliance boundary.

## Safety Result

Validation found no forbidden downstream material in either Website Generation
Package:

- no provider payload
- no prompt
- no OpenAI/Claude/Gemini prompt
- no AI output
- no generated website
- no generated content
- no generated HTML
- no generated React
- no generated components
- no code/framework/library fields
- no publishing artifact
- no generation
- no compliance execution
- no Business Approval

## Validation Commands

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/website-generation-package-*.test.ts
```

Result:

```text
18 / 18 passing
```

The first sandbox run hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe`
issue. The same command passed outside the sandbox.

Platform build:

```text
cd apps/platform && pnpm run vercel-build
```

Result:

```text
passed
```

Diff whitespace:

```text
git diff --check
```

Result:

```text
passed
```

## Boundary Confirmation

MVP-1F-R stops after Website Generation Package real-target validation. No
provider adapter, prompt, AI, generated website, compliance execution, Business
Approval, or publishing was added.

Recommended next phase:

- MVP-1G Provider Adapter Boundary Design, documentation and contract design
  only. Stop before provider payloads, prompts, external AI calls, generated
  websites, compliance execution, Business Approval, publishing, UI, API,
  schema, or workers unless explicitly authorized.
