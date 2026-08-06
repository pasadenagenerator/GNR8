# GNR8 Single-Site Shadow-Publish Execution Contract

Phase: MVP-55
Scope: Documentation and architecture only.

This contract defines the future request, response, failure, logging, and test expectations for an internal operator-only single-site shadow-publish action. It does not implement the action, route, server action, UI, wrapper execute wiring, blocking enforcement, publish behavior changes, runtime mutation, rollback behavior, provider calls, billing/domain execution, Command Center implementation, Ops Inbox actions, client portal exposure, commit, or push.

## Execution Meaning

Future shadow-publish execution means:

1. The future action validates operator auth, flag state, explicit mode, confirmation, idempotency, correlation, source refs, and source watermarks.
2. The action invokes the MVP-52 wrapper with complete strict context, `mode: "shadow_publish"`, and execute intent.
3. The MVP-52 wrapper resolves complete MVP-48 metadata through the MVP-49 read-only resolver.
4. The wrapper calls the existing `publishApprovedSiteVersion(...)` with complete `publishActivationMetadataHandoff`.
5. The existing publish orchestrator performs whatever publish behavior it already performs.

The action does not apply blocking enforcement. MVP-47/MVP-50 diagnostics may observe guard pass/block/error, but the gate result is not used to prevent publish.

## Future Request Input

Required input:

| Field | Rule |
| --- | --- |
| `mode` | Must be exactly `"shadow_publish"`. |
| `tenantId` | Exact persisted tenant/agency id. |
| `clientId` | Exact persisted client id. |
| `siteId` | Exact runtime/single-site site id. |
| `migrationId` | Exact single-site migration id. |
| `candidateSiteVersionRef` | Exact candidate site version ref/id. |
| `runtimeArtifactRef` | Exact runtime artifact ref/id. |
| `expectedPublishTargetRef` | Exact PTT publish target ref/id. |
| `publishStage` | `shadow`, `canary`, or `production`. |
| `publishEnvironment` | Explicit environment, expected `production` for MVP public validation. |
| `expectedLaunchReadinessEvidenceRef` | Exact MVP-40 launch readiness evidence ref. |
| `expectedPublishActivationRequestRef` | Exact MVP-41 AAF request ref. |
| `expectedPublishActivationDecisionRef` | Exact MVP-42 decision ref. |
| `expectedGateAttemptResultRef` | Exact MVP-44 gate attempt/result ref. |
| `expectedHandoffWatermark` | Exact MVP-43 handoff watermark. |
| `expectedGateInputWatermark` | Exact MVP-44 gate input watermark. |
| `operatorConfirmation` | Explicit phrase or boolean bound to exact mode, migration, candidate, artifact, target, and publish-may-execute semantics. |
| `idempotencyKey` | Required stable idempotency key. |
| `correlationId` | Required stable correlation id. |
| `allowWarningsWithLimitations` | Optional; if omitted, limitations block resolver completeness where current resolver policy requires acceptance. |
| `maxGateAgeMs` | Optional freshness policy input. |
| `evaluatedAt` | Optional expected evaluation timestamp. |
| `requestId` | Optional route/API tracing id. |

The actor must be derived from trusted server-side superadmin auth and must not be accepted from request body as authority.

## Future Response Contract

The response must be internal operator-safe and must include:

- caller/action version;
- wrapper version;
- explicit `mode: "shadow_publish"`;
- preflight status;
- resolver status;
- wrapper status;
- publish orchestrator status when called;
- active pointer before/after if returned by existing orchestrator;
- shadow guard diagnostics summary when available;
- metadata completeness summary;
- stable blocker codes;
- warnings and limitation codes;
- safe refs only;
- correlation id;
- idempotency key or safe digest;
- redaction summary.

Explicit flags:

```json
{
  "shadowPublish": true,
  "blockingEnforcementApplied": false,
  "publishMayHaveExecuted": true,
  "createsAafRecords": false,
  "createsGateAttempt": false,
  "evaluatesGate": false
}
```

The response must not include raw `resolverResult`, raw `publishActivationMetadataHandoff`, raw publish orchestrator input, raw AAF rows, raw evidence payloads, provider secrets, Stripe/payment data, credential material, raw SQL errors, raw stack traces, or client-facing diagnostics.

## Preflight Failure Behavior

The future action must fail before wrapper invocation when:

- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` is off;
- the actor is not an authenticated platform superadmin;
- the request is outside internal admin namespace;
- `mode: "shadow_publish"` is missing or wrong;
- confirmation is missing or does not bind the exact publishable identity;
- idempotency key or correlation id is missing;
- any required strict context ref is missing;
- actor scope cannot be proven;
- tenant/client/site/migration/candidate/artifact/target refs do not match persisted source truth;
- expected AAF decision/gate/evidence refs or watermarks do not match persisted resolver output;
- resolver output is incomplete or unavailable;
- warnings/limitations are present without explicit accepted policy where required.

On any preflight failure, the action must not call the wrapper execute path and must not call `publishApprovedSiteVersion(...)`.

## Orchestrator Failure Behavior

If the wrapper calls the existing publish orchestrator and that orchestrator throws or returns a failure, the future action returns an operator-safe shadow-publish failure. It must not:

- invoke rollback automatically;
- retry publish automatically;
- create readiness records;
- create AAF records;
- create gate attempts;
- reevaluate gates;
- call PASR;
- create DDOM snapshots;
- call providers, DNS, Vercel, Openprovider, registrars, SSL, Stripe, billing, AI, production Supabase, or staging Supabase.

Existing publish orchestrator behavior and failure semantics remain the authority for what happened after execute-mode invocation.

## Audit And Logging Expectations

MVP-56 or the implementation milestone must log or audit:

- operator actor id/type/role;
- authorization pass/deny;
- idempotency key and correlation id;
- mode and confirmation result;
- input refs and watermarks;
- resolver status and completeness;
- wrapper status;
- publish orchestrator status/result category;
- shadow guard pass/block/error/unavailable;
- active pointer before/after if available;
- explicit statement that blocking enforcement was not applied.

Conservative first implementation: structured logs are acceptable if no existing operator-action audit mechanism is clearly scoped. Do not write AAF audit/gate records for this action. Durable operator-action audit can be a later narrow milestone.

## Required MVP-56 Test Plan

MVP-56 tests must prove:

- flag off denies before wrapper;
- unauthorized denied before wrapper;
- missing confirmation denied before wrapper;
- dry-run route remains dry-run only;
- shadow-publish route calls wrapper execute only when all checks pass;
- incomplete resolver blocks before wrapper execute;
- wrapper publish failure returns safe failure;
- generic publish route unchanged;
- client portal unchanged;
- Ops Inbox unchanged;
- no AAF records created by action;
- no gate evaluator invoked;
- no PASR, DDOM, provider, billing, domain, DNS, Stripe, Vercel, Openprovider, registrar, SSL, AI, production Supabase, or staging Supabase calls;
- active pointer mutation is observed only through existing orchestrator fake/fixture;
- response redaction hides raw sensitive internals.

## Implementation May Begin Decision

Implementation may begin for MVP-56 as an internal admin API route only, with no visual UI button, no server action unless separately justified, no blocking enforcement, no generic route changes, and tests using a fake publish orchestrator. Command Center UI surfacing should wait until after route-level rehearsal.
