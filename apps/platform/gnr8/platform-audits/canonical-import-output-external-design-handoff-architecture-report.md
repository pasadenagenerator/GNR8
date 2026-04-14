# Canonical Import Output / External Design Handoff Architecture Report

## Scope
This report documents the architecture and contract artifacts added for canonical import output, vendor-neutral external design handoff, and safe merge-back strategy.

## Artifacts Added
- `apps/platform/gnr8/architecture/canonical-import-output-and-design-handoff-architecture.md`
- `apps/platform/gnr8/architecture/canonical-import-models.ts`
- `apps/platform/gnr8/architecture/external-design-handoff-contracts.ts`
- `apps/platform/gnr8/platform-audits/canonical-import-output-external-design-handoff-architecture-report.md`

## Key Decisions
1. Canonical truth is a structured intermediate model, not HTML-first and not React-first.
2. Import output is split into three authoritative layers: structure, content, style/CGP.
3. External design integration is vendor-neutral via adapter boundaries.
4. Merge-back uses explicit authority policy:
   - Content: canonical import truth by default.
   - Presentation/layout: external design proposal truth when mapping confidence passes policy.
   - Structure: canonical anchor for all mappings.
5. Provenance/evidence/confidence is preserved across layers for deterministic behavior and safe automation.

## Determinism Summary
- Stable IDs and route normalization.
- Deterministic section and repetition signature rules.
- Deterministic tokenization for style values.
- Explicit placeholder and warning records for unresolved ambiguity.

## Product-Safety Summary
- Separation of content and presentation authority.
- Conflict classes and merge result contract.
- Unresolved mapping surfaces via warnings/conflicts rather than silent mutation.
- Editability requirements included in outbound handoff contract.

## CMS Future Compatibility Summary
The content inventory model includes typed fields, scope, bindings, and validation hints that can be converted into future CMS schemas for:
- Page-local editors.
- Global settings/navigation/footer editors.
- Reusable block schemas.

## Recommended Next Implementation Sequence
- Phase A: contracts + architecture (this task).
- Phase B: normalize single-page importer into canonical bundle.
- Phase C: multipage route/global region support.
- Phase D: vendor-neutral adapter + first provider adapter.
- Phase E: merge-back engine with policy gates.
- Phase F: auto-generated CMS schema output.

## Validation
Validation commands were run after adding architecture-only artifacts:
- `pnpm exec tsc --noEmit`
- `pnpm exec next build`

Results are included in task response.
