# GNR8 Single-Site MVP CUTLINE-57 Candidate Publishable Promotion And Shadow-Publish Retry

Date: 2026-08-28

## Scope

CUTLINE-57 resolved the CUTLINE-56 blocker `candidate_state_not_publishable:DRAFT` for the reviewed CHS improved candidate, then retried the approved shadow-publish exactly once.

Fresh approval sentence present: yes.

Approved sentence:

```text
I approve promoting the reviewed chs.si improved candidate from DRAFT to the canonical publishable runtime state if an existing safe workflow supports it, and then retrying the approved shadow-publish, understanding that shadow-publish may move the active pointer for the selected runtime site.
```

## Candidate

- Candidate site version: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`
- Runtime artifact: `1f80138a-39c2-4210-ac61-16200e5a2254`
- Runtime site: `site_57d9665a3a5867edf6ef`
- Host binding: `www.chs.si`, binding kind `shadow`, status `ACTIVE`
- Source URL: `https://www.chs.si/`

## Preflight

Read-only production preflight confirmed:

- Candidate state before promotion: `DRAFT`
- Candidate publishable before promotion: no
- Artifact binding unchanged: yes
- Improved review: `accepted_with_limitations`
- Content approval: `approved_with_limitations`
- Client approval: `approved_with_limitations`
- Launch approval: `approved_with_limitations`
- Launch readiness: `ready_with_limitations`
- Publish activation decision: `granted_with_limitations`
- Publish activation gate: `allowed`
- Last governed dry-run action: `882304c9-fc52-4c3c-9cd3-533d9ebf1eed`
- Last governed dry-run result: `ok=true`, wrapper `dry_run_ready`, resolver `complete`, blockers `[]`
- Selected runtime site active pointer count before promotion: `0`

## Promotion Workflow

Canonical existing workflow used:

- `apps/platform/gnr8/runtime/version-lifecycle-enforcer.ts` - `transitionSiteVersionState(...)`
- `apps/platform/gnr8/runtime/version-lifecycle-rules.ts` - lifecycle path `DRAFT -> READY_FOR_REVIEW -> APPROVED -> PUBLISHED`
- Existing route-backed workflow parity:
  - `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route.ts`
  - `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route.ts`

The candidate was promoted through the existing lifecycle path only:

- `DRAFT -> READY_FOR_REVIEW`
- `READY_FOR_REVIEW -> APPROVED`

Audit details preserved the CUTLINE-57 approval context, candidate id, artifact id, and accepted limitations. No raw database state update was used.

## Promotion Readback

- Candidate state before: `DRAFT`
- Candidate state after: `APPROVED`
- Candidate publishable after: yes
- Artifact binding unchanged after promotion: yes, `1f80138a-39c2-4210-ac61-16200e5a2254`
- Selected runtime site active pointer before shadow-publish retry: `0`

## Shadow-Publish Retry

Shadow-publish retry was performed exactly once.

- Operator action id: `58200758-fe05-40a0-9f5e-5317849c9176`
- Idempotency/correlation ref: `gnr8-cutline-57-chs-si-shadow-publish-retry-20260828`
- Caller: `mvp-56-single-site-shadow-publish-operator-caller:v1`
- Wrapper: `mvp-52-single-site-publish-wrapper-orchestrator:v1`
- Mode: `shadow_publish`
- `dryRun`: `false`

Result:

- Action status: `shadow_publish_failed`
- Route status: `wrapper_preflight_blocked`
- Wrapper status: `preflight_blocked`
- Preflight status: `wrapper_blocked`
- Resolver status: `incomplete`
- Publish orchestrator status: `not_called`
- `publishMayHaveExecuted`: `false`
- Active pointer before: `0`
- Active pointer after: `0`
- Active pointer target after: none

Blockers:

- `improved_candidate_site_version_ref_mismatch`
- `improved_runtime_artifact_ref_mismatch`
- `publish_activation_gate_mismatch`
- `publish_activation_gate_stale`
- `publish_activation_handoff_watermark_mismatch`
- `publish_target_ref_mismatch`
- `single_site_publish_wrapper_resolver_incomplete`

Warnings:

- `limitations_carried_forward`
- `single_site_shadow_publish_warning_redacted`

## Final Readback

Read-only production readback after the retry confirmed:

- Candidate state: `APPROVED`
- Candidate publishable: yes
- Artifact binding: unchanged
- Artifact stage: `shadow`
- Artifact bundle SHA-256: `c652e15c369a9861b05004cf303ecc8a51f79a8d1c79a2a80a8b9186d23ae237`
- Selected runtime site active pointer count: `0`
- Runtime publish orchestrator: not called
- New CUTLINE-57 shadow operator action count: `1`
- New CUTLINE-57 AAF approval request rows: `0`
- New CUTLINE-57 AAF approval decision rows: `0`
- New CUTLINE-57 AAF gate attempt rows: `0`
- Provider approval rows: `0`
- Provider job rows: `0`
- Domain binding rows for candidate: `0`

## Online Verification

- `https://app.pasadenagenerator.com/` returned HTTP `200`.
- `https://www.chs.si/` returned HTTP `200`; this is the existing public site because the selected runtime active pointer did not move.
- Candidate preview route returned HTTP `403` with `Unable to resolve agency scope for site version`, so unauthenticated candidate preview verification was not available from the shell.

## Boundary Confirmation

No rollback, second shadow-publish, runtime publish, active pointer mutation, provider mutation, DNS mutation, domain mutation, billing mutation, Stripe mutation, Openprovider mutation, migration, env mutation, deploy, commit, push, new content approval, new client approval, new launch approval, new launch readiness, new publish activation request, new publish activation decision, or new gate attempt occurred.

The stop condition after the single retry is the wrapper preflight blocker set above. The candidate remains publishable, but a second shadow-publish was not run.
