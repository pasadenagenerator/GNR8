# GNR8 Single-Site MVP CUTLINE-43 Authorized Improvement Execution Candidate Readback

Date: 2026-08-20
Site: `chs.si`
Scope: authorized improvement execution and improved candidate creation only

## Result

Improvement execution did not create an execution attempt or improved candidate. Execution-time MVP-20 validation passed with the fresh replay-backed attached refs, then the existing MVP-21 execution service blocked before attempt persistence because the proposal approval row is stored as a proposal-event approval and the MVP-21 service still requires AAF-shaped proposal approval request/decision/evidence fields on `approval_refs_json`.

- Exact improvement-execution approval sentence: present.
- Deterministic idempotency/correlation base: `gnr8-cutline-43-chs-si-improvement-execution-20260820`.
- Workflow path used: MVP-20 `ImprovementExecutionAafValidator.validateImprovementExecutionAuthorization(...)`, then MVP-21 `ImprovementExecutionService.createOrReuseExecutionAttempt(...)`.
- MVP-23 improved-candidate dry-run adapter: not run because MVP-21 blocked before attempt creation.
- MVP-24 improved-candidate creation adapter: not run because MVP-21 blocked before attempt creation.
- Online verification status: `improvement_execution_blocked`.

## Fresh Attached Refs

Proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` remains `approved`, version `5`, with fresh replay-backed implementation authorization refs attached:

- Proposal auth ref: `21fd1ce8-0531-4f40-a944-1f46d481f395`.
- Proposal auth event: `635188b5-5720-4be0-bf38-0478f573f23a`.
- Fresh AAF request: `0b3a888e-cc6a-4cc1-bc53-476d70a20144`.
- Fresh AAF decision: `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`.
- Fresh AAF evidence package: `b4ddb218-ce37-42ab-b2f3-433138df6489`.
- Scope: `single_site_improvement_implementation_authorization`.
- Replay contract/version: `single_site_implementation_authorization_semantic_replay` / `1`.
- Replay semantic watermark: `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`.
- Attached limitations: `[]`.

Direct AAF readback confirmed:

- Decision status: `granted`.
- Request subject: `single_site_improvement_proposal_plan` / `f541075c-4641-4f70-b5ff-64a8af071571`.
- Decision request/evidence match: yes.
- Evidence type: `single_site_improvement_implementation_authorization_evidence`.
- Evidence freshness check: `fresh`.
- Request/decision/evidence/freshness expiry: `null`.
- Revocations: `0`.
- Decision supersessions: `0`.
- Evidence supersessions: `0`.

## MVP-20 Validation

Execution-time MVP-20 validation was rerun from the stored semantic replay object.

- Allowed: `true`.
- Mode: `allowed`.
- Reason code: `authorization_valid`.
- Blocker codes: `[]`.
- Matched AAF request: `0b3a888e-cc6a-4cc1-bc53-476d70a20144`.
- Matched AAF decision: `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`.
- Matched evidence package: `b4ddb218-ce37-42ab-b2f3-433138df6489`.
- Freshness status: `fresh`.
- Expected semantic watermark: `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`.
- Proposal watermark matched: `true`.
- Selected recommendation watermark matched: `true`.
- Implementation scope watermark matched: `true`.
- Semantic watermark matched: `true`.
- Drifted roles: `[]`.
- `mutatesSourceTruth=false`.
- `nonExecuting=true`.

## Execution Blocker

MVP-21 `ImprovementExecutionService.createOrReuseExecutionAttempt(...)` blocked before creating an attempt:

- Blocker: `proposal approval request ref is required`.
- Cause: proposal approval for this rehearsal is persisted as `approvalSource=proposal_event` evidence, with proposal approval event `f7320eae-2426-4c8e-ab91-0cfdac135d82` and state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642`, while MVP-21 still reads `approval_refs_json` through an AAF-only helper requiring `approvalRequestId`, `approvalDecisionId`, and `evidencePackageId`.
- Safety decision: no compatibility shim or fabricated AAF proposal approval refs were used.

## Candidate Readback

- `improvementExecutionAttemptId`: not created.
- Execution status/mode: `blocked_before_attempt_creation` / `execute`.
- Improved candidate site version ref: not created.
- Improved runtime artifact ref: not created.
- Applied recommendations: none.
- Not-applied recommendations: none; MVP-23/MVP-24 did not run.
- Warnings/limitations: none from candidate creation; execution blocker only.
- Semantic output watermark: not created.
- Improved candidate published state: not applicable.

The accepted recommendations remain pre-execution source truth:

- `73de9484-1461-4476-b677-f41d7a839df7`
- `86342f67-7cce-43de-823f-ea0f4adc1a41`
- `0be61bde-6568-4f33-8499-4d5eade70837`
- `a61e857e-89c1-4ab1-bdc1-581a24e824c1`

## Forbidden Downstream Counts

Production before/after counts stayed clean:

| Scope | Before | After |
| --- | ---: | ---: |
| Improvement execution attempts | 0 | 0 |
| Improved version review acceptance | 0 | 0 |
| Improved version reviews | 0 | 0 |
| Content approvals | 0 | 0 |
| Client approvals | 0 | 0 |
| Launch approvals | 0 | 0 |
| Launch readiness records | 0 | 0 |
| Publish operator actions | 0 | 0 |
| Publish activation requests | 0 | 0 |
| Publish activation decisions | 0 | 0 |
| AAF gate attempts | 0 | 0 |
| Runtime active pointers total | 6 | 6 |
| Selected runtime active pointers | 0 | 0 |

Active pointer fingerprint stayed `67f2f987170cbf15dcd4733ac174a2df6e73bb7f0079f68c5818a79a08a5eeab`.

## Boundary

No execution attempt, improved candidate site version, improved runtime artifact, improved version review acceptance, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing/Stripe/Openprovider mutation, deployment, migration, env mutation, active pointer mutation, commit, or push occurred.

## Validation

- Execution-time MVP-20 validation: passed.
- MVP-21 execution attempt creation: blocked before persistence with `proposal approval request ref is required`.
- `git diff --check`: passed.
- Trailing whitespace scan on changed docs: passed.
- Changed-file scope: docs/index only; temporary runner files were outside the repo under `/private/tmp`.

Recommended next milestone: align MVP-21 improvement execution service with the proposal-event approval refs already supported by the implementation authorization bridge and MVP-20 validator, then rerun authorized improvement execution after fresh exact approval.
