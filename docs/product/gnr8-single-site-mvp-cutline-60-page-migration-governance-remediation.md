# GNR8 Single-Site MVP CUTLINE-60 Page Migration Governance Remediation

Date: 2026-08-29

## Result

Status: `page_migration_governance_remediation_blocked_no_dry_run`.

Exact approval sentence present: yes.

Approval sentence:

```text
I approve remediating or regenerating the approved chs.si candidate runtime page payload so its pages carry the required migration_governance metadata, if an existing safe workflow supports it, and then rerunning the governed operator dry-run. Do not run shadow-publish in this task.
```

No remediation write was performed and no governed dry-run rerun was performed, because the available existing workflows did not provide a safe source-truth path to materialize page-level `migration_governance` for this candidate chain.

No shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, migration, env mutation, deploy, commit, or push occurred.

## Production Readback

Selected candidate chain:

- Source URL: `https://www.chs.si/`.
- Tenant/agency: `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`.
- Client: `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`.
- Canonical site: `a03fcb5b-6ad9-4b19-a682-4c06f998881a`.
- Migration: `682a09fd-8fd5-4f73-93b8-54f5d4067c63`.
- Runtime site: `site_57d9665a3a5867edf6ef`.
- Candidate site version: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Runtime artifact: `1f80138a-39c2-4210-ac61-16200e5a2254`.

Candidate/runtime readback:

- Candidate state: `APPROVED`.
- Candidate version number: `3`.
- Candidate artifact binding: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Candidate source/actor: `migration` / `human:gregorzigon:improved-candidate`.
- Import provenance summary: present, `importFidelityStatus=high_fidelity_import`, `renderedDomQuality=strong`.
- Candidate page count: `1`.
- Candidate pages with complete page-level `migration_governance`: `0`.
- Candidate page `/`, `page_44f18ca16509a5109482`, is missing all required governance fields: `pageStructuralConfidence`, `weakSectionIds`, `structuralAnomalies`, `pageMigrationGate`, `pageRolloutPolicy`, and `pageEnforcement`.
- Sibling/runtime source versions also have no page-level governance: version `1` `0/1`, version `2` `0/1`.
- Selected runtime active pointer before/after diagnosis: `0 -> 0`.

Artifact and source-truth readback:

- Bound artifact site/version lineage matches the candidate.
- Bound artifact publish stage: `shadow`.
- Bound artifact governance publish stage: `shadow`.
- Bound artifact root path exists with root HTML length `11770`.
- Bound artifact manifest paths include `/`.
- Bound artifact governance has stage summary metadata: page gate state `SINGLE_SITE_IMPROVED_CANDIDATE_READY_FOR_REVIEW`, shadow `ALLOW`, canary `REVIEW`, production `REVIEW`.
- Raw imported/runtime template artifact readback for the candidate returned `null`; the existing imported-runtime reconciliation materializer therefore lacks its required raw/imported artifact evidence source.

Source-owned chain readback:

- Launch readiness `f1be154d-5533-4f88-ad5a-0ca3deaa50fc`: `ready_with_limitations`, freshness `fresh`, candidate/artifact refs match the selected candidate.
- Launch readiness evidence `193bc66e-f9e0-482e-abd1-3fa04356d24e`: `created`, freshness `partial_timeline`.
- Publish activation request `1487a4a7-24bb-469e-9ebf-75315f7b538e`: `requested`, scope `publish_activation`, subject `site_version` / candidate version.
- Publish activation decision `19d1a96d-97ef-4f6b-ab65-38682b5f8751`: `granted_with_limitations`, linked to the refreshed request and evidence package.
- Gate attempt `aaee77bc-2caa-428d-8b3e-848e3622befd`: `allowed`, no fail-closed reason, linked to the refreshed request/decision/evidence refs.
- Publish target `production`: environment `production`, publish stage `production`, status `active`, policy `ptt-1`, allowed artifact stages `["production"]`.
- Last successful dry-run remains `dc2f19ca-00ca-4881-85ae-fb701eafa9ac`, `ok=true`, wrapper `dry_run_ready`, resolver `complete`, blockers `[]`.

## Existing Workflow Inspection

Existing helper found:

- `apps/platform/gnr8/runtime/runtime-store.ts` exports `materializePageMigrationGovernanceForSiteVersion(...)`.
- The helper updates `gnr8_runtime_page_versions.migration_governance` for a specified site version/page set and writes a runtime version audit row with action `materialize_page_migration_governance`.

Existing safe caller found:

- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts` uses the helper only after `inspectPublishGovernanceReadiness(...)` confirms verified raw/imported artifact evidence.
- Its reconstruction requires raw/imported artifact presence, non-empty file map, entry HTML asset, asset-rich evidence, and source URL/provenance signal.
- The broader `applyImportedRuntimeReconciliation(...)` path is not allowed for CUTLINE-60 because it proceeds to `publishApprovedSiteVersion(...)` and transfers runtime host binding after materializing governance.

Existing improved candidate path:

- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts` creates candidate pages by cloning `page.migrationGovernance` from the clone version.
- Because the clone/source sibling page rows have `0/1` governance, regenerating through the current adapter would clone missing governance again.
- The adapter creates artifact-level governance summary metadata, but does not create page-level `migration_governance`.

## Safety Decision

Safe remediation path available: no.

Reason:

- The only existing canonical materialization helper is safe when called with source-truth page governance from a verified workflow.
- The only existing workflow that reconstructs page governance requires raw/imported artifact evidence, but candidate readback returned no raw imported/template artifact for this site version.
- The improved-candidate regeneration path currently preserves missing page governance from its clone input rather than constructing it.
- Inferring required page-level governance from artifact summary metadata would be a new architecture decision, not a supported existing remediation workflow.

## Required Implementation Recommendation

Add a narrow canonical page-governance remediation/regeneration workflow before retrying dry-run or shadow-publish.

Minimum implementation contract:

- Scope to one tenant/client/site/migration/runtime-site/site-version/artifact chain with all identity checks required before mutation.
- Reconstruct page-level `PageMigrationGovernanceSnapshot` only from source-owned evidence: persisted migration diagnostics, raw/imported artifact evidence, or a reviewed improved-candidate source payload that carries page gate/policy/enforcement values.
- Reuse `materializePageMigrationGovernanceForSiteVersion(...)` as the final runtime-store write primitive.
- Reject if source evidence is absent, ambiguous, stale, or linked to a different site/version/artifact/migration.
- Preserve candidate state unless canonical lifecycle rules require a new candidate.
- If new candidate/artifact creation is selected, stop after creation and require refreshed readiness/evidence/publish activation/gate before another dry-run.
- Include read-only preflight, write audit details, and read-only post-write verification of page count, governed page count, governance identity, candidate state, artifact binding, and active pointer.

## Stop Point

Dry-run rerun performed: no.

Reason no dry-run rerun was performed: candidate pages still have `0/1` page-level `migration_governance`; the dry-run prerequisite in CUTLINE-60 was not met.

Shadow-publish eligibility next: not restored by CUTLINE-60. The page-governance blocker remains until a canonical remediation/regeneration workflow is implemented and executed, followed by required source-chain refresh if refs/watermarks change.

