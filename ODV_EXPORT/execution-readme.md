# Manual Codex Execution Readme

Export ID: `odv-export-25b18a7102ed29c2`

`ODV_EXPORT/` is the first GNR8 Generation Delivery Package. It is a
deterministic, human-reviewable export package for manual Codex execution
outside GNR8.

## Boundary

- Manual execution only.
- Implementation proposal only.
- No business reinterpretation.
- No hidden prompt edits.
- Preserve the Website Generation Package exactly as the source of meaning.
- Preserve all limitations, low-confidence areas, constraints, validation
  expectations, and lineage references.
- Do not call providers from GNR8.
- Do not generate, publish, deploy, run compliance, or create Business Approval
  from this export.

## Files

- `manifest.json`: export identity, status, safety classification, contract
  versions, and artifact IDs.
- `lineage.json`: complete BusinessDiscovery -> DBT -> BUR ->
  BusinessAlignment -> Aligned DBT -> WDB -> WGP -> ProviderPayload chain.
- `website-generation-package.json`: canonical provider-neutral generation
  contract.
- `provider-generation-payload.json`: Codex task serialization of the WGP, with
  non-canonical execution-facing mission guidance.
- `business-summary.md`: business-readable source summary for execution review.
- `limitations.md`: missing knowledge, low-confidence areas, limitations,
  non-invention rules, and preservation rules.

## Expected Deliverables

A future manual Codex run should return a quarantined implementation proposal
bundle only. The bundle should include:

- working website source bundle
- README
- implementation notes
- WGP mapping
- assumptions
- limitations
- open questions
- files created/modified
- no deployment/publishing proof

The output must remain suitable for later Generated Website Proposal import and
compliance review. It must not claim deployment, publishing, DNS mutation,
production mutation, compliance approval, Business Approval, or provider
execution from GNR8.

## Expected Manual Codex Output Bundle

The expected output of a future manual Codex run is an implementation proposal
bundle only. It should include:

- proposal summary
- WGP preservation mapping
- navigation, page, and section implementation approach
- content coverage approach
- constraint preservation approach
- validation expectation mapping
- limitations and confidence preservation notes
- lineage references used
- non-execution confirmation

It must not include deployment instructions, publishing instructions, DNS
instructions, provider results, compliance results, Business Approval, or any
claim that the proposal is live in production.

## Stop Conditions

Stop immediately and report the blocker if:

- the WGP, provider payload, lineage, or manifest is missing or cannot be
  parsed
- source artifact IDs cannot be preserved in the output notes
- the task would require inventing audience, offerings, trust claims, contact
  details, legal claims, prices, guarantees, testimonials, or business truth
- the task would require provider calls from GNR8, automated AI execution from
  GNR8, publishing, deployment, DNS changes, production mutation, compliance,
  approval, schema work, UI/API/workers, or generated website import
- the output cannot be kept quarantined for later import/compliance

## Forbidden Actions

- Do not call Codex or any provider from GNR8.
- Do not mutate production, DNS, deployment targets, or publishing settings.
- Do not run compliance or create Business Approval.
- Do not import generated output back into GNR8.
- Do not update canonical artifacts such as Business Discovery, DBT, BUR,
  Business Alignment, WDB, WGP, or ProviderGenerationPayload.
- Do not treat missing business knowledge as resolved.

## Output Folder Recommendation

Place any future manual execution output outside `ODV_EXPORT/`, for example:

- `ODV_GENERATED_WEBSITE_PROPOSAL/`

Keep `ODV_EXPORT/` unchanged as the source Generation Delivery Package. The
future proposal folder should include its own README, implementation notes, WGP
mapping, assumptions, limitations, open questions, file inventory, and explicit
confirmation that there is no deployment or publishing proof.

## Quarantine Rule

Any later generated proposal remains quarantined until explicitly imported
through the Generated Website Proposal boundary. It cannot update Business
Discovery, DBT, BUR, Business Alignment, WDB, WGP, ProviderGenerationPayload,
compliance, approval, publishing, or business truth.
