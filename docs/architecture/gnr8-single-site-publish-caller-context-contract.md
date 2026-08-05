# GNR8 Single-Site Publish Caller Context Contract

Phase: MVP-51
Scope: Documentation and architecture only.

This contract defines the future strict context package that an eligible server-only single-site publish caller must build before invoking `publishApprovedSiteVersion(...)`. It does not implement the package, caller wiring, resolver calls, enforcement, routes, services, SQL, UI, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

## Contract Name And Version

Recommended future contract:

- contract name: `SingleSitePublishCallerContext`
- contract version: `mvp-51-single-site-publish-caller-context:v1`
- intended consumer: future server-only single-site publish wrapper
- downstream publish consumer: existing `publishApprovedSiteVersion(...)`
- downstream metadata shape: MVP-48 `publishActivationMetadataHandoff`
- downstream resolver: MVP-49 `readAndResolveSingleSitePublishActivationMetadataHandoff(...)`
- first rollout mode: shadow-only through MVP-50

## Required Fields

| Field | Required | Contract rule |
| --- | --- | --- |
| `tenantId` | Yes | Source-owned tenant/agency identity for the single-site migration. |
| `clientId` | Yes | Source-owned client/organization identity. |
| `siteId` | Yes | Canonical single-site/runtime site identity, cross-checked with runtime candidate. |
| `migrationId` | Yes | Exact `gnr8_single_site_migrations` id. |
| `candidateSiteVersionRef` | Yes | Ref or id for the exact candidate `gnr8_runtime_site_versions` row. |
| `runtimeArtifactRef` | Yes | Ref or id for the exact runtime artifact expected for activation. |
| `publishTargetRef` | Yes | Ref or id for the exact PTT `gnr8_publish_targets` row. |
| `publishStage` | Yes | Runtime publish stage: `production`, `canary`, or `shadow`. |
| `publishEnvironment` | Yes | Deployment environment, for MVP expected to be `production` for public activation. |
| `launchReadinessEvidenceRef` | Yes | MVP-40 `single_site_launch_readiness_evidence` ref. |
| `publishActivationRequestRef` | Yes | MVP-41 AAF request ref for `publish_activation` / `publish.activation`. |
| `publishActivationDecisionRef` | Yes | MVP-42 AAF decision ref. |
| `gateAttemptResultRef` | Yes | MVP-44 persisted gate attempt/result ref. |
| `handoffWatermark` | Yes | MVP-43 deterministic handoff watermark. |
| `gateInputWatermark` | Yes | MVP-44 deterministic gate input watermark. |
| `limitations` | Yes, array | Empty array is allowed; omitted value is not. |
| `actor` | Yes | Actor id/type/role from trusted server command context. |
| `correlationId` | Yes | Stable request/workflow correlation id. |
| `idempotencyKey` | Yes | Stable idempotency key for the publish command. |
| `sourceOfContext` | Yes | How the wrapper built the context and which read snapshot/version produced it. |
| `freshnessExpectations` | Yes | Max gate age, reread policy, target freshness policy, and limitation acceptance policy. |

## Recommended Shape

```ts
type SingleSitePublishCallerContext = {
  contextVersion: "mvp-51-single-site-publish-caller-context:v1";
  sourceType: "single_site_publish_caller_context";
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  candidateSiteVersionRef: {
    sourceSystem: "gnr8";
    sourceTable: "gnr8_runtime_site_versions";
    sourceRecordId: string;
    sourceRef: string;
    sourceWatermark?: string;
  };
  runtimeArtifactRef: {
    sourceSystem: "gnr8";
    sourceTable: "gnr8_runtime_artifacts";
    sourceRecordId: string;
    sourceRef: string;
    sourceWatermark?: string;
  };
  publishTargetRef: {
    sourceSystem: "gnr8";
    sourceTable: "gnr8_publish_targets";
    sourceRecordId: string;
    sourceRef: string;
    sourceWatermark: string;
  };
  publishStage: "shadow" | "canary" | "production";
  publishEnvironment: string;
  launchReadinessEvidenceRef: {
    sourceSystem: "gnr8";
    sourceTable: "gnr8_aaf_evidence_packages";
    sourceRecordId: string;
    sourceRef: string;
    sourceWatermark: string;
  };
  publishActivationRequestRef: {
    id: string;
    ref: string;
    status: "requested";
  };
  publishActivationDecisionRef: {
    id: string;
    ref: string;
    status: "granted" | "granted_with_limitations";
  };
  gateAttemptResultRef: {
    gateAttemptId: string;
    gateAttemptRef: string;
    gateResult: "allowed";
    policyEvaluationRef?: string;
    auditEventRef?: string;
  };
  handoffWatermark: string;
  gateInputWatermark: string;
  limitations: string[];
  actor: {
    actorType: "human" | "system";
    actorId: string;
    actorRole: string;
  };
  correlationId: string;
  idempotencyKey: string;
  requestId?: string;
  sourceOfContext: {
    source: "single_site_state_spine" | "single_site_publish_wrapper";
    wrapperVersion: string;
    readSnapshotCapturedAt: string;
    resolverVersion?: "mvp-49-publish-activation-metadata-resolver:v1";
    metadataHandoffVersion?: "mvp-48-publish-activation-metadata-handoff:v1";
  };
  freshnessExpectations: {
    maxGateAgeMs: number;
    rereadAafDecision: true;
    rereadPublishTarget: true;
    detectNewerGateAttempts: true;
    allowWarningsWithLimitations: boolean;
  };
};
```

The exact TypeScript implementation may differ in a later milestone, but it must preserve the semantic fields above.

## Validation Rules

The future wrapper must fail structured preflight for eligible single-site wrapper calls when:

- any required field is missing or empty;
- tenant/client/site/migration identity does not match across state spine, launch readiness evidence, AAF request, AAF decision, MVP-43 handoff, MVP-44 gate, PTT target, and runtime candidate;
- candidate site version ref does not match the runtime version about to publish;
- runtime artifact ref does not match the artifact about to publish or the expected post-build artifact identity policy;
- publish target is missing, disabled, retired, wrong environment, wrong stage, or incompatible with the artifact stage;
- launch readiness evidence is missing, stale, blocked, wrong type, or wrong subject;
- approval request is not exact scope/action/subject or is not linked to the expected launch readiness evidence;
- approval decision is rejected, revoked, expired, superseded, cancelled, wrong scope, wrong subject, or mismatched;
- gate attempt is missing, stale, wrong scope/action/subject, not `allowed`, conflicting with a newer attempt, or semantically mismatched;
- handoff or gate input watermark mismatches;
- limitations are present without explicit acceptance policy;
- actor role/type, correlation id, or idempotency key is missing;
- any read failure prevents proving the chain.

For the first wrapper implementation, this structured preflight failure applies only to wrapper calls. It must not change generic runtime publish callers.

## Mapping To MVP-48 Handoff

When the context is complete, the future wrapper maps it to MVP-48 `publishActivationMetadataHandoff`:

- identity fields map directly to tenant/client/site/migration;
- candidate, artifact, and target refs map to their MVP-48 refs;
- publish stage/environment map directly;
- request, decision, and gate refs map directly;
- handoff and gate input watermarks map directly;
- limitations map from readiness plus decision limitations;
- actor type/role, correlation id, idempotency key, and request id map directly.

The wrapper may also provide `publishActivationMetadataResolverShadowInput` with expected refs so MVP-50 can verify resolver fallback diagnostics, but complete explicit metadata should be preferred.

## Source-Of-Truth Rules

The future implementation must use:

- single-site state spine/read model for migration identity and stage context;
- runtime-store rows for site version, artifact, active pointer, and existing publish behavior;
- MVP-37/MVP-39 launch readiness records for readiness source refs;
- MVP-40 AAF evidence package for launch readiness evidence;
- MVP-41 request and MVP-42 decision rows for human publish activation approval;
- MVP-43 handoff for deterministic request/decision/evidence watermarks;
- MVP-44 gate attempt for the persisted gate result;
- MVP-49 resolver for read-only reconstruction and completeness checks;
- PTT `gnr8_publish_targets` for publish target identity and policy;
- trusted server command metadata for actor, correlation id, idempotency key, and request id.

The future implementation must not use:

- UI labels, button labels, page titles, hostnames, or route names as source truth;
- Command Center or Ops Inbox derived statuses as approval, target, billing, domain, or gate truth;
- PASR shadow readiness as gate truth;
- DDOM readiness as approval;
- launch readiness as approval;
- generic runtime rows as migration truth unless ownership/migration linkage has been explicitly reviewed.

## Freshness Expectations

Default future policy:

- gate attempt freshness: configured max age, default proposed 24 hours for internal validation unless later product policy chooses otherwise;
- AAF decision reread: required;
- revocation/supersession reread: required;
- PTT target reread: required;
- newer gate attempt conflict detection: required;
- limitations acceptance: required when limitations exist;
- DDOM/PASR/provider live rereads: forbidden during publish caller context assembly;
- billing/domain source refresh: forbidden during publish caller context assembly.

Freshness failures must be explicit preflight blockers, not repair triggers.

## Boundary Confirmation

This contract is not an implementation. It does not modify `publishApprovedSiteVersion(...)`, publish routes, generic callers, SQL, runtime-store, AAF, DDOM, PASR, providers, billing, domain/DNS, Command Center, Ops Inbox, or client portal code.
