# Website Design Brief Real-Target Validation

## Phase And Boundary

Phase MVP-1E-R validates the MVP-1E Website Design Brief runtime against real
ODV and ViroiDoc aligned DBT vNext artifacts plus Business Alignment lineage.

This pass is validation plus documentation. It made one blocking
Website Design Brief runtime fix: source validation now accepts a
Business-Alignment-output DBT whose status is `partial`, because MVP-1D-R
preserves unresolved business knowledge as partial aligned output instead of
inventing facts.

This pass did not add Website Generation Package, provider adapters, external
AI, generation, compliance, Business Approval, publishing, UI, API, schema, or
workers.

## Method

For each target, validation loaded the exact supplied aligned DBT and Business
Alignment artifacts by ID, confirmed each was latest for the site version, then
executed:

```text
loadDigitalBusinessTwinArtifactById(...)
loadLatestDigitalBusinessTwinArtifact(...)
loadBusinessAlignmentById(...)
loadLatestBusinessAlignment(...)
buildWebsiteDesignBrief(...)
persistWebsiteDesignBrief(...)
loadLatestWebsiteDesignBrief(...)
loadWebsiteDesignBriefById(...)
persistWebsiteDesignBrief(...) // idempotent retry
```

Persistence used the existing site-version `importProvenanceSummary` boundary
and artifact kind `website_design_brief`.

## Target Results

| Target | siteVersionId | aligned DBT latest | Business Alignment latest | Website Design Brief artifact | status |
| --- | --- | --- | --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | yes | yes | `website_design_brief_ff19a711c948d28fdd58bdea521c4f59` | `partial` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | yes | yes | `website_design_brief_782c43e390c353d192af867c227d191d` | `partial` |

## ODV Result

Source artifacts:

- Aligned DBT artifact:
  `digital_business_twin_2614a690e29e87a201658f3de4f72983`
- Aligned DBT latest equality: yes
- Aligned DBT status: `partial`
- Aligned DBT knowledge items: `12`
- Aligned DBT missing knowledge records: `4`
- Aligned DBT limitations: `108`
- Business Alignment artifact:
  `business_alignment_18c0a6958048bf8985044e4781e788a8`
- Business Alignment latest equality: yes
- Business Alignment status: `reviewed`
- Business Alignment decisions: `1`
- Business Alignment corrections: `5`
- Business Alignment limitations: `2`

Persisted Website Design Brief:

- Artifact ID:
  `website_design_brief_ff19a711c948d28fdd58bdea521c4f59`
- Website Design Brief ID:
  `website-design-brief:b2aa6ffee52dda53095e3e004286de0c`
- Dry run ID:
  `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`
- Status: `partial`
- Sections: `17`
- Objectives: `2`
- Audience experience: missing-knowledge limitation recorded
- Messages: `5`
- Journey: present, `4` steps
- Constraints: `6`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_partial`,
  `missing_business_knowledge`,
  `website_design_brief_projected_from_aligned_dbt`,
  `website_only_business_discovery`
- Limitations: `109`
- Diagnostics: `WEBSITE_DESIGN_BRIEF_ARTIFACT_VALID`,
  `WEBSITE_DESIGN_BRIEF_CONTAINS_WEBSITE_INTENT_ONLY`,
  `WEBSITE_DESIGN_BRIEF_IS_EXPERIENCE_PROJECTION`,
  `WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION:MVP-1E`,
  `WEBSITE_DESIGN_BRIEF_SECTION_COUNT:17`,
  `WEBSITE_DESIGN_BRIEF_STATUS:partial`

Human-readability result:

- Explains what kind of website should represent the business: yes
- Maps business goals to website objectives: yes
- Keeps missing audience knowledge visible: yes
- Projects brand and digital presence into website intent: yes
- Uses trust, content, and digital presence to shape the website: yes
- Preserves limitations before WGP: yes

## ViroiDoc Result

Source artifacts:

- Aligned DBT artifact:
  `digital_business_twin_3429791a7d365461306d74059c206f8f`
- Aligned DBT latest equality: yes
- Aligned DBT status: `partial`
- Aligned DBT knowledge items: `17`
- Aligned DBT missing knowledge records: `2`
- Aligned DBT limitations: `107`
- Business Alignment artifact:
  `business_alignment_7a3ad7e2222e732a895f89c1dc22452a`
- Business Alignment latest equality: yes
- Business Alignment status: `reviewed`
- Business Alignment decisions: `1`
- Business Alignment corrections: `4`
- Business Alignment limitations: `1`

Persisted Website Design Brief:

- Artifact ID:
  `website_design_brief_782c43e390c353d192af867c227d191d`
- Website Design Brief ID:
  `website-design-brief:0d416a5954c8f8c8cd7ff92566d69a48`
- Dry run ID:
  `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`
- Status: `partial`
- Sections: `17`
- Objectives: `3`
- Audience experience: missing-knowledge limitation recorded
- Messages: `12`
- Journey: present, `4` steps
- Constraints: `4`
- Confidence: `LOW`
- Confidence reasons: `business_alignment_partial`,
  `missing_business_knowledge`,
  `website_design_brief_projected_from_aligned_dbt`,
  `website_only_business_discovery`
- Limitations: `108`
- Diagnostics: `WEBSITE_DESIGN_BRIEF_ARTIFACT_VALID`,
  `WEBSITE_DESIGN_BRIEF_CONTAINS_WEBSITE_INTENT_ONLY`,
  `WEBSITE_DESIGN_BRIEF_IS_EXPERIENCE_PROJECTION`,
  `WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION:MVP-1E`,
  `WEBSITE_DESIGN_BRIEF_SECTION_COUNT:17`,
  `WEBSITE_DESIGN_BRIEF_STATUS:partial`

Human-readability result:

- Explains what kind of website should represent the business: yes
- Maps business goals to website objectives: yes
- Keeps missing audience knowledge visible: yes
- Projects brand and digital presence into website intent: yes
- Uses trust, content, and digital presence to shape the website: yes
- Preserves limitations before WGP: yes

## Reload And Idempotency

| Target | latest WDB equality | by-ID WDB equality | WDB retry reused same artifact |
| --- | --- | --- | --- |
| ODV | yes | yes | yes |
| ViroiDoc | yes | yes | yes |

Both targets produced persisted, reloadable Website Design Brief artifacts. A
second persistence call with equivalent artifacts reused the latest artifact IDs.

## Limitations And Diagnostics

Both briefs are `partial` because the aligned DBT vNext artifacts preserve
missing business knowledge instead of guessing.

- ODV preserves unresolved audience and offerings knowledge.
- ViroiDoc preserves unresolved audience knowledge.
- Both briefs propagate upstream import/capture limitations and record
  `SOURCE_DBT_STATUS_NOT_ALIGNED:partial`.
- Both briefs include `WEBSITE_DESIGN_BRIEF_ARTIFACT_VALID` and
  `WEBSITE_DESIGN_BRIEF_CONTAINS_WEBSITE_INTENT_ONLY`.

## Safety Result

Validation found no forbidden downstream material in either Website Design
Brief:

- no WGP
- no provider payload
- no prompt
- no AI output
- no generated content
- no generated HTML
- no generated React
- no generated components
- no publishing artifact
- no generation
- no compliance
- no Business Approval

## Validation Commands

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/website-design-brief-*.test.ts
```

Result:

```text
17 / 17 passing
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

MVP-1E-R stops after Website Design Brief real-target validation. No WGP, AI,
generation, or publishing was added.

Recommended next phase:

- MVP-1F Website Generation Package Runtime Builder.
