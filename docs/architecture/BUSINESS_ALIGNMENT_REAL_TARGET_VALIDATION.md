# Business Alignment Real-Target Validation

## Phase And Boundary

Phase MVP-1D-R validates the MVP-1D Business Alignment runtime against real
ODV and ViroiDoc Digital Business Twin plus Business Understanding Report
artifacts.

This pass is validation plus documentation. It did not add Website Design
Brief, Website Generation Package, provider adapters, external AI, generation,
compliance, Business Approval, publishing changes, UI, API, schema, or
workers.

## Method

For each target, validation loaded the exact supplied source Digital Business
Twin and Business Understanding Report artifacts by ID, then confirmed both
were the latest artifacts of their kind for the site version before alignment.

The validation path executed:

```text
loadDigitalBusinessTwinArtifactById(...)
loadLatestDigitalBusinessTwinArtifact(...)
loadBusinessUnderstandingReportArtifactById(...)
loadLatestBusinessUnderstandingReportArtifact(...)
applyBusinessAlignment(...)
persistBusinessAlignment(...)
loadLatestBusinessAlignment(...)
loadBusinessAlignmentById(...)
persistDigitalBusinessTwinArtifact(...) // DBT vNext
loadLatestDigitalBusinessTwinArtifact(...) // DBT vNext
loadDigitalBusinessTwinArtifactById(...) // DBT vNext
persistBusinessAlignment(...) // idempotent retry
persistDigitalBusinessTwinArtifact(...) // DBT vNext idempotent retry
```

Business Alignment artifact persistence used the MVP-1D
`persistBusinessAlignment(...)` helper. DBT vNext persistence used the existing
`persistDigitalBusinessTwinArtifact(...)` helper because the runtime already
returns a valid `DigitalBusinessTwinArtifact` revision and the helper safely
supports append/reuse behavior for the existing `digital_business_twin`
artifact kind. No new persistence behavior was invented.

The operator decisions were deterministic and validation-only. They confirmed
existing `business_identity`, `brand`, and `digital_presence` DBT knowledge
where present, marked missing `audience` unresolved for both targets, marked
missing ODV `offerings` unresolved, and added no new customer facts.

## Target Results

| Target | siteVersionId | source DBT latest | source BUR latest | Business Alignment artifact | status | DBT vNext artifact |
| --- | --- | --- | --- | --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | yes | yes | `business_alignment_18c0a6958048bf8985044e4781e788a8` | `reviewed` | `digital_business_twin_2614a690e29e87a201658f3de4f72983` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | yes | yes | `business_alignment_7a3ad7e2222e732a895f89c1dc22452a` | `reviewed` | `digital_business_twin_3429791a7d365461306d74059c206f8f` |

## ODV Result

ODV source artifacts:

- Source DBT artifact:
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`
- Source DBT status: `partial`
- Source DBT ID:
  `digital-business-twin:09dce7ea-d860-4f60-a1eb-26c3335b302e:09dce7ea-d860-4f60-a1eb-26c3335b302e-8b-12l:business_discovery_7b37413651d79de0d109e31690a34b62`
- Source DBT knowledge items: `12`
- Source DBT missing knowledge records: `2`
- Source DBT limitations: `104`
- Source DBT latest equality before validation: yes
- Source BUR artifact:
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad`
- Source BUR status: `partial`
- Source BUR sections: `14`
- Source BUR recommendations: `2`
- Source BUR latest equality before validation: yes

ODV validation-only input:

- Decisions: `1`
- Corrections: `5`
- Correction types: `confirm`, `unresolved`
- Confirmed existing knowledge:
  `dbt-knowledge:business_identity:53cd0225868edc0c7c498bd6`,
  `dbt-knowledge:brand:aa196af6713fc86ab5b2c35a`,
  `dbt-knowledge:digital_presence:65b79e3ac02b25f373ea923a`
- Marked unresolved original missing knowledge:
  `dbt-missing:audience`, `dbt-missing:offerings`

Persisted ODV Business Alignment:

- Business Alignment artifact:
  `business_alignment_18c0a6958048bf8985044e4781e788a8`
- Business Alignment ID:
  `business-alignment:b588bc0416fc1eee93de0ac54a8cd2d3`
- Status: `reviewed`
- Decisions: `1`
- Corrections: `5`
- Correction types used: `confirm`, `unresolved`
- Limitations: `2`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_unresolved`
- Resulting DBT vNext ID:
  `digital-business-twin:09dce7ea-d860-4f60-a1eb-26c3335b302e:09dce7ea-d860-4f60-a1eb-26c3335b302e-8b-12l:business_discovery_7b37413651d79de0d109e31690a34b62:alignment:9bf462ca9250eea9`

ODV DBT vNext:

- DBT vNext artifact:
  `digital_business_twin_2614a690e29e87a201658f3de4f72983`
- Status: `partial`
- Knowledge items: `12`
- Missing knowledge records: `4`
- Limitations: `108`
- Original missing knowledge preserved: yes
- Unresolved missing knowledge records added: `2`
- Source DBT preserved by-ID: yes
- Lineage preserved: yes
- Upstream refs include Business Alignment: yes
- Upstream refs include source DBT: yes
- Source limitations preserved: yes

## ViroiDoc Result

ViroiDoc source artifacts:

- Source DBT artifact:
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`
- Source DBT status: `partial`
- Source DBT ID:
  `digital-business-twin:e26b0754-988b-45b9-9e24-8e213179b6cf:e26b0754-988b-45b9-9e24-8e213179b6cf-8b-12n:business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- Source DBT knowledge items: `17`
- Source DBT missing knowledge records: `1`
- Source DBT limitations: `105`
- Source DBT latest equality before validation: yes
- Source BUR artifact:
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10`
- Source BUR status: `partial`
- Source BUR sections: `14`
- Source BUR recommendations: `1`
- Source BUR latest equality before validation: yes

ViroiDoc validation-only input:

- Decisions: `1`
- Corrections: `4`
- Correction types: `confirm`, `unresolved`
- Confirmed existing knowledge:
  `dbt-knowledge:business_identity:5d8aa393f91e57456be7c129`,
  `dbt-knowledge:brand:d90a802a054df6814af377b5`,
  `dbt-knowledge:digital_presence:314e20aa8bf920f74c5b12c8`
- Marked unresolved original missing knowledge:
  `dbt-missing:audience`

Persisted ViroiDoc Business Alignment:

- Business Alignment artifact:
  `business_alignment_7a3ad7e2222e732a895f89c1dc22452a`
- Business Alignment ID:
  `business-alignment:2ab20b1fa6d066b730274e8f764a097b`
- Status: `reviewed`
- Decisions: `1`
- Corrections: `4`
- Correction types used: `confirm`, `unresolved`
- Limitations: `1`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_unresolved`
- Resulting DBT vNext ID:
  `digital-business-twin:e26b0754-988b-45b9-9e24-8e213179b6cf:e26b0754-988b-45b9-9e24-8e213179b6cf-8b-12n:business_discovery_360fa099cbcede288c2d0e04f2ec7986:alignment:3131e94025f0dc1d`

ViroiDoc DBT vNext:

- DBT vNext artifact:
  `digital_business_twin_3429791a7d365461306d74059c206f8f`
- Status: `partial`
- Knowledge items: `17`
- Missing knowledge records: `2`
- Limitations: `107`
- Original missing knowledge preserved: yes
- Unresolved missing knowledge records added: `1`
- Source DBT preserved by-ID: yes
- Lineage preserved: yes
- Upstream refs include Business Alignment: yes
- Upstream refs include source DBT: yes
- Source limitations preserved: yes

## Reload And Idempotency

| Target | latest Business Alignment equality | by-ID Business Alignment equality | Business Alignment retry reused same artifact | latest DBT vNext equality | by-ID DBT vNext equality | DBT vNext retry reused same artifact |
| --- | --- | --- | --- | --- | --- | --- |
| ODV | yes | yes | yes | yes | yes | yes |
| ViroiDoc | yes | yes | yes | yes | yes | yes |

Both targets persisted reloadable Business Alignment artifacts and reloadable
DBT vNext artifacts. A second persistence call with equivalent artifacts reused
the latest artifact IDs for both targets.

## Lineage And Preservation

For both targets:

- source DBT IDs were preserved in Business Alignment lineage;
- source BUR IDs were preserved in Business Alignment lineage;
- source DBT evidence refs remained present in the Business Alignment
  artifact;
- Business Alignment upstream refs include the source DBT and source BUR;
- DBT vNext lineage preserved source DBT evidence refs;
- DBT vNext upstream refs include the Business Alignment artifact;
- source DBT remained reloadable by its original artifact ID;
- source DBT limitations were preserved in DBT vNext;
- original missing knowledge remained present and was explicitly marked
  unresolved by added missing knowledge records.

## Safety Result

Validation produced only:

- `BusinessAlignmentArtifact`
- DBT vNext `DigitalBusinessTwinArtifact`

Validation found no forbidden downstream keys in the produced artifacts:

- no Website Design Brief
- no Website Generation Package
- no provider payload
- no prompt
- no AI output
- no generated content
- no publishing artifact
- no generation
- no compliance
- no Business Approval

## Validation Results

The real-target harness initially hit the known local `tsx` IPC pipe
permission issue inside the sandbox. The rerun used the configured production
environment and an explicit longer-timeout DB client passed into the existing
helpers; runtime behavior was not modified.

Closure validation:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/business-alignment-*.test.ts
cd apps/platform && pnpm run vercel-build
git diff --check
```

Results:

- Focused Business Alignment tests passed `16 / 16`; the first sandbox run hit
  the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue, and the rerun
  outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passed with existing unrelated
  frontend lint warnings for hook dependency and `<img>` usage.
- `git diff --check` passed.

## Next Phase Boundary

The next recommended phase is MVP-1E Website Design Brief Runtime Builder.

That phase should consume aligned DBT output and Business Alignment lineage.
It should stop before Website Generation Package, provider adapters, external
AI, generation, compliance, Business Approval, and publishing.
