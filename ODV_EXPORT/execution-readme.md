# Manual Codex Execution Readme

Export ID: `odv-export-25b18a7102ed29c2`

This directory is a deterministic, human-reviewable export package for manual Codex execution outside GNR8.

## Boundary
- Manual execution only.
- Implementation proposal only.
- No business reinterpretation.
- No hidden prompt edits.
- Preserve the Website Generation Package exactly as the source of meaning.
- Preserve all limitations, low-confidence areas, constraints, validation expectations, and lineage references.
- Do not call providers from GNR8.
- Do not generate, publish, deploy, run compliance, or create Business Approval from this export.

## Files
- `manifest.json`: export identity, status, safety classification, contract versions, and artifact IDs.
- `lineage.json`: complete BusinessDiscovery -> DBT -> BUR -> BusinessAlignment -> Aligned DBT -> WDB -> WGP -> ProviderPayload chain.
- `website-generation-package.json`: canonical provider-neutral generation contract.
- `provider-generation-payload.json`: Codex task serialization of the WGP.
- `business-summary.md`: human-readable business and generation summary.
- `limitations.md`: missing knowledge, low-confidence areas, limitations, and non-invention rules.

## Expected Manual Codex Output Bundle
The expected output of a future manual Codex run is an implementation proposal bundle only. It should include:
- proposal summary
- WGP preservation mapping
- navigation, page, and section implementation approach
- content coverage approach
- constraint preservation approach
- validation expectation mapping
- limitations and confidence preservation notes
- lineage references used
- non-execution confirmation

It must not include generated website code, generated HTML, generated React, generated components, deployment instructions, publishing instructions, DNS instructions, provider results, compliance results, or Business Approval.

## Quarantine Rule
Any later generated proposal remains quarantined until explicitly imported through the Generated Website Proposal boundary. It cannot update Business Discovery, DBT, BUR, Business Alignment, WDB, WGP, ProviderGenerationPayload, compliance, approval, publishing, or business truth.
