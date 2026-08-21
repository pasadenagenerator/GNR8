# GNR8 Single-Site MVP CUTLINE-45A Reconcile Proposal Refs And Execute

Date: 2026-08-21
Site: `chs.si`
Scope: reconcile approved proposal-event refs, immediately retry authorized improvement execution, and stop at improved candidate readback.

## Result

CUTLINE-45A succeeded with limitations. The approved proposal plan refs were reconciled to carry the existing proposal approval event and proposal state event, MVP-20 validation passed, MVP-21 created an execution attempt, and the candidate workflow produced draft improved candidate refs/artifacts. No improved candidate review, content/client/launch approval, launch readiness, publish activation, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing, deploy, env, commit, push, rollback, or active pointer mutation occurred.

- Exact approval sentence present: yes.
- Deterministic idempotency/correlation base: `gnr8-cutline-45a-chs-si-reconcile-and-execute-20260820`.
- Reconciliation path: direct guarded JSONB update with identity checks and readback, because no existing proposal-ref retrofit helper exists for an already-approved plan.
- Completion note: canonical candidate creation persisted the runtime candidate and execution output refs, then the service completion step hit duplicate semantic migration-ref guard `idx_gnr8_single_site_migration_refs_semantic_uq`; a narrow completion repair marked the already-created attempt `completed_with_limitations`, inserted the completion event, and advanced the migration state event without inserting a duplicate migration ref.

## Preflight

Read-only production preflight confirmed:

- Proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` existed, was `approved`, and was version `5`.
- Proposal approval event `f7320eae-2426-4c8e-ab91-0cfdac135d82` belonged to the proposal/migration chain and had approved action.
- Proposal state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642` belonged to migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63` and transitioned to `improvement_proposal_approved`.
- Fresh implementation authorization refs remained attached: request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`, evidence `b4ddb218-ce37-42ab-b2f3-433138df6489`, proposal auth ref `21fd1ce8-0531-4f40-a944-1f46d481f395`.
- AAF decision was `granted`, fresh, not expired, not revoked, not superseded, and matched the request/evidence.
- Replay object was present and matched `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`.
- No existing improvement execution attempt existed for idempotency key `gnr8-cutline-45a-chs-si-reconcile-and-execute-20260820`.
- Selected runtime active pointer count was `0`; total runtime active pointers were `6`.

## Proposal Ref Reconciliation

Before, `approval_refs_json` had proposal metadata such as `approvalRefKind`, `approvalWorkflow`, `approvalCorrelationId`, `approvalIdempotencyKey`, `proposalPlanId`, and `proposalPlanWatermark`, but no `proposalEventId` or `stateEventId`.

After, `approval_refs_json` includes:

- `approvalSource=proposal_event`
- `proposalEventId=f7320eae-2426-4c8e-ab91-0cfdac135d82`
- `stateEventId=54ace8d6-401c-4ade-9ad2-ec4539dc3642`
- `sourceTable=gnr8_single_site_improvement_proposal_events`
- `stateEventSourceTable=gnr8_single_site_migration_state_events`
- `proposalStatus=approved`
- `eventAction=approved`
- `proposalEventApprovalEvidenceOnly=true`
- `implementationAuthorizationDecisionSubstitution=false`

No AAF proposal approval rows were created, and proposal-event approval was not treated as implementation authorization truth.

## Execution Readback

MVP-20 validation result:

- `allowed=true`
- `mode=allowed`
- `reason=authorization_valid`
- `blockers=[]`
- freshness `fresh`

MVP-21 execution result:

- `improvementExecutionAttemptId=6dc259c1-b659-4d64-95f2-3858803eb470`
- status `completed_with_limitations`
- execution mode `execute`
- semantic input watermark `single-site-improvement-execution:56f2a08f1b2c0c4173190624bbb46576881564b27e63b64b1a746fc89a2fa29c`
- semantic output watermark `single-site-improved-candidate-creation-output:33927ef17c44860377b45e6f367d30df45ed2fec4f8bebafe3ba8aa97b67f612`
- improved candidate site version ref `gnr8:site_version:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`
- improved runtime artifact ref `gnr8:runtime_artifact:1f80138a-39c2-4210-ac61-16200e5a2254`
- candidate version readback: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, state `DRAFT`
- artifact readback: `1f80138a-39c2-4210-ac61-16200e5a2254`, `publish_stage=shadow`, bound to the candidate version

Applied recommendations: none. The production recommendation rows do not carry deterministic operator-authored change payloads, so the candidate was created with limitations rather than invented content changes.

Not-applied recommendations:

- `0be61bde-6568-4f33-8499-4d5eade70837`: `unsupported_in_mvp`
- `73de9484-1461-4476-b677-f41d7a839df7`: `requires_operator_input`
- `86342f67-7cce-43de-823f-ea0f4adc1a41`: `requires_operator_input`
- `a61e857e-89c1-4ab1-bdc1-581a24e824c1`: `unsupported_in_mvp`

## Forbidden Downstream Readback

Final read-only production readback:

| Scope | Count |
| --- | ---: |
| Improved version reviews | 0 |
| Content approvals | 0 |
| Client approvals | 0 |
| Launch approvals | 0 |
| Launch readiness records | 0 |
| Publish operator actions | 0 |
| Downstream AAF approval requests | 0 |
| Downstream AAF approval decisions | 0 |
| Downstream AAF gate attempts | 0 |
| Runtime active pointers total | 6 |
| Selected runtime active pointers | 0 |

Migration readback after completion repair: `current_state=improvement_implementation_completed`, `current_stage=improvement_content`, `latest_state_event_id=23ca46a5-55b6-4947-9eb8-58948b510c46`.

Online verification status after this task: `improved_candidate_created_pending_review_no_publish`.

Docs updated:

- `docs/product/gnr8-single-site-mvp-cutline-45a-reconcile-proposal-refs-and-execute.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Commit/push/deploy: none.
