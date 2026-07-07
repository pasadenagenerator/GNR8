# First Real Website Generation Export

## Phase

MVP-2.0-A - First Real Website Generation Export

## Status

Complete.

GNR8 now has its first complete, human-reviewable, deterministic, export-ready
package for manual Codex execution against a real target.

Target:
- ODV only.

Export directory:
- `ODV_EXPORT/`

Export ID:
- `odv-export-25b18a7102ed29c2`

Export timestamp:
- `2026-07-07T00:00:00.000Z`

## Boundary

This phase is execution preparation only.

It does not call a provider, execute Codex, generate a website, publish,
perform compliance, or implement Business Approval.

The output is a deterministic local export bundle that can be handed to Codex
for future manual execution outside GNR8. That future execution remains
proposal-only and any resulting material remains quarantined until explicitly
imported through the Generated Website Proposal boundary.

## Export Contents

`ODV_EXPORT/` contains:

- `manifest.json`
- `lineage.json`
- `website-generation-package.json`
- `provider-generation-payload.json`
- `business-summary.md`
- `limitations.md`
- `execution-readme.md`

`manifest.json` records export identity, timestamp, target, export status,
safety classification, site version, dry run, source URL, contract versions,
artifact IDs, provider type, payload kind, and per-stage validation status.

`lineage.json` records the complete artifact chain and continuity checks.

`website-generation-package.json` is the canonical provider-neutral Website
Generation Package.

`provider-generation-payload.json` is the Codex task ProviderGenerationPayload
serialization of that package.

`business-summary.md` is a human-readable summary of business, objectives,
audience, offerings, messaging, navigation intent, trust strategy,
constraints, known missing knowledge, and confidence.

`limitations.md` lists what Codex must not invent, every missing knowledge
item carried by the export, low-confidence areas, source limitations, and
operational limitations.

`execution-readme.md` explains the manual execution boundary, proposal-only
output expectation, WGP preservation requirement, no hidden prompt edit rule,
and quarantine rule for later generated proposal material.

## Verified Artifact Chain

Site version:
- `09dce7ea-d860-4f60-a1eb-26c3335b302e`

Dry run:
- `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

Source URL:
- `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`

Chain:

| Stage | Artifact ID | Status | Contract |
| --- | --- | --- | --- |
| BusinessDiscovery | `business_discovery_7b37413651d79de0d109e31690a34b62` | `partial` | `MVP-1A` |
| DigitalBusinessTwin | `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` | `partial` | `MVP-1B` |
| BusinessUnderstandingReport | `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad` | `partial` | `MVP-1C` |
| BusinessAlignment | `business_alignment_18c0a6958048bf8985044e4781e788a8` | `reviewed` | `MVP-1D` |
| Aligned DigitalBusinessTwin | `digital_business_twin_2614a690e29e87a201658f3de4f72983` | `partial` | `MVP-1B` |
| WebsiteDesignBrief | `website_design_brief_ff19a711c948d28fdd58bdea521c4f59` | `partial` | `MVP-1E` |
| WebsiteGenerationPackage | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` | `partial` | `MVP-1F` |
| ProviderGenerationPayload | `provider_generation_payload_0738b677c762f830c235dae425a8ec1c` | `draft` | `MVP-1H` |

## Lineage Verification

Every stage loaded through the existing persisted site-version provenance
helpers and validated against its current runtime contract.

Continuity checks passed:

- DBT points to BusinessDiscovery.
- BUR points to the source DBT artifact.
- BUR preserves BusinessDiscovery lineage.
- BusinessAlignment points to BUR.
- BusinessAlignment points to the source DBT.
- BusinessAlignment output matches the aligned DBT.
- Aligned DBT preserves BusinessDiscovery lineage.
- WebsiteDesignBrief points to BusinessAlignment.
- WebsiteDesignBrief points to the aligned DBT.
- WebsiteGenerationPackage points to WebsiteDesignBrief.
- ProviderGenerationPayload points to WGP semantic ID.
- ProviderGenerationPayload points to WGP artifact ID.
- ProviderGenerationPayload serialized WGP matches the source WGP.

No missing links were found.

## Safety Verification

The export safety classification is `export_only_no_execution`.

Verified false:

- `providerExecutionAllowed`
- `aiExecutionAllowed`
- `generatedWebsiteAllowed`
- `publishingAllowed`
- `deploymentAllowed`
- `dnsMutationAllowed`
- `productionMutationAllowed`
- `complianceExecutionAllowed`

The provider payload scan found no forbidden generated-output fields:

- no provider result
- no AI output
- no generated website
- no generated content
- no generated HTML
- no generated React
- no generated components
- no generated blocks
- no deployment artifact
- no publishing artifact
- no execution artifact
- no runtime mutation

This phase created no provider calls, no prompt sends, no Codex execution, no
website generation, no publishing, no compliance, no Business Approval, no API,
no UI, no schema migration, no worker, no deployment, no DNS mutation, and no
production mutation.

## Validation

`git diff --check` passes.

## Recommended Next Step

Manual Codex execution outside GNR8 using `ODV_EXPORT/`, producing an
implementation proposal bundle only.

Stop before generated website import, compliance, Business Approval,
publishing, deployment, DNS mutation, production mutation, UI, API, schema,
workers, provider calls from GNR8, or automated AI execution unless explicitly
authorized.
