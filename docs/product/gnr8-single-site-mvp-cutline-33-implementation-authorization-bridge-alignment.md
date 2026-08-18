# GNR8 Single-Site MVP CUTLINE-33 Implementation Authorization Bridge Alignment

Date: 2026-08-18

Status: local bridge alignment complete. No production AAF rows were created.

## Scope Confirmed

The installed canonical AAF implementation authorization scope is:

`single_site_improvement_implementation_authorization`

The shorter `single_site_implementation_authorization` value is not part of the AAF approval scope vocabulary and is rejected as a wrong scope.

## Alignment

`SingleSiteImplementationAuthorizationBridge.prepareImplementationAuthorizationRequest(...)` now accepts proposal approval evidence in two explicit forms:

- AAF proposal approval refs: `approvalRequestId`, `approvalDecisionId`, `evidencePackageId`, and `sourceWatermark`.
- Proposal-event approval refs: `proposalEventId`, `stateEventId`, and `sourceWatermark`, with optional event/source metadata.

Proposal-event approval refs are evidence for preparing the implementation authorization request only. They are not treated as the implementation authorization decision, do not create an implementation authorization decision, and do not satisfy execution-time implementation authorization.

For the accepted `chs.si` proposal, the bridge can now prepare an exact-scope request using:

- Proposal plan: `f541075c-4641-4f70-b5ff-64a8af071571`
- Proposal approval event: `f7320eae-2426-4c8e-ab91-0cfdac135d82`
- Proposal approval state event: `54ace8d6-401c-4ade-9ad2-ec4539dc3642`
- Proposal watermark: `sha256:22fd5d1cfbb488a3153cd6ddba186ea7f2b8676a6c96521ae8f4d98771f8a42a`
- Source evidence review: `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`
- Clone review: `79176567-4911-4900-bc86-0fefa6043fbe`
- Clone runtime site version: `6b172a5b-200e-471c-9599-5dc70f04ea53`
- Clone runtime artifact: `929106cd-fa19-47eb-9582-ce6931d0e370`
- Accepted recommendation ids: `73de9484-1461-4476-b677-f41d7a839df7`, `86342f67-7cce-43de-823f-ea0f4adc1a41`, `0be61bde-6568-4f33-8499-4d5eade70837`, and `a61e857e-89c1-4ab1-bdc1-581a24e824c1`

## Boundary

This task was local implementation, tests, and docs only.

- Production/staging Supabase writes: not run.
- Production AAF evidence packages, approval requests, approval decisions, and gate attempts: not created.
- Implementation authorization decision: not run.
- Improvement execution and improved candidate creation: not run.
- Content/client/launch approvals, launch readiness, dry-run, shadow-publish, runtime publish, rollback, and active pointer mutation: not run.
- Provider, DNS, domain, billing, Stripe, Openprovider, deploy, env mutation, commit, and push: not run.

## Validation

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p /tmp/gnr8-cutline33-tsconfig.json --noEmit --pretty false`

Broad TypeScript no-emit:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`
- Result: failed on existing unrelated platform test fixture errors. Filtered diagnostics contained no errors for `implementation-authorization-bridge`, `improvement-execution-service`, or `aaf-contracts`.

## Migration And Retry

No SQL migration is required for this bridge alignment. The installed SQL vocabulary already includes `single_site_improvement_implementation_authorization` and `single_site_improvement_implementation_authorization_evidence`.

Bridge code deploy is required before retrying CUTLINE-32 in production.

Recommended next milestone: CUTLINE-34 should retry exact-scope implementation authorization request preparation for the accepted `chs.si` proposal using proposal-event approval evidence, then stop after production AAF request/evidence row creation and readback unless separately authorized to continue.
