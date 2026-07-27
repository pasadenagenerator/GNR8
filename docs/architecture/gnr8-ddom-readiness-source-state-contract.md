# GNR8 DDOM Readiness Source-State Contract

DDOM-4 source-state contract for the future production caller that creates DDOM readiness snapshots from already-known GNR8 state.

This document is documentation-only. It does not implement source readers, writers, routes, migrations, provider calls, or runtime behavior.

## Contract Summary

The caller input is a read-only, transactionally captured bundle of stored GNR8 state. It is not live DNS truth, not live Vercel truth, not Openprovider truth, not registrar truth, and not publish approval.

The future caller must convert this bundle into the existing DDOM-3 writer input:

- subject identity;
- readiness/freshness state;
- source watermarks;
- compact `snapshotJson`;
- append-only source refs;
- actor/correlation/idempotency;
- privacy and retention labels.

PASR must not create snapshots during gate evaluation. Command Center and Ops Inbox are derived only. DDOM readiness is not publish approval.

## Required Subject Identity

Every snapshot request must resolve the strongest available identity:

| Field | Requirement |
| --- | --- |
| `tenantId` | Required. AAF/GNR8 tenant scope. |
| `agencyId` | Required when ownership scope exists. May be represented as tenant or source ref metadata if no DDOM column exists. |
| `clientId` | Required when known. Nullable only for platform/internal subjects. |
| `ownershipSiteId` | Required when an ownership `sites.id` row is known. |
| `siteId` | Required runtime site id. |
| `siteVersionId` | Required when snapshot is version-scoped or publish-shadow relevant. Nullable only for site-level domain readiness. |
| `domainBindingId` | Required for custom-domain binding snapshots. Nullable for internal-host or not-applicable states. |
| `hostBindingId` | Required for internal-host snapshots when the host binding is the source. |
| `intendedDomain` | Required when a custom domain is intended, even if no binding exists. |
| `internalHost` | Required when internal host readiness or exception path is represented. |
| `environment` | Required in source watermark JSON, for example `production`, `staging`, `preview`, or `development`. |
| `stage` | Required when publish target relationship exists, for example `production`, `canary`, or `shadow`. |
| `publishTargetId` | Required when the snapshot is prepared for PASR/publish shadow use. Stored as source metadata/ref, not a DDOM header field. |
| `publishTargetRelationship` | Required when applicable: target id, environment, stage, target kind, policy version, and source watermark. |

The caller must fail closed if a required identity value is ambiguous.

## Allowed Input Categories

The caller may read these stored GNR8 categories:

| Category | Representative sources | Allowed use |
| --- | --- | --- |
| GNR8 domain binding records | `gnr8_runtime_domain_host_bindings` | Domain binding state, intended domain, status, Vercel-shaped fields, DNS instruction fields, source watermark. |
| GNR8 host binding records | `gnr8_runtime_host_bindings` | Internal working host identity, active/inactive status, host binding freshness. |
| Runtime site/version identity | `gnr8_runtime_sites`, `gnr8_runtime_site_versions`, ownership `sites` | Subject identity, site version scope, ownership/client/agency refs. |
| Previously captured Vercel check snapshots | Stored `vercel_domain_id`, verification fields, DNS record fields, `last_checked_at` | Vercel project/domain snapshot evidence only. |
| Previously captured manual DNS instruction snapshots | Stored DNS record fields and `dns_instructions_json` | Manual instruction evidence. Not completion proof. |
| Previously captured operator/client completion evidence | Existing evidence refs, external refs, audit refs, operator notes if persisted | Evidence that an external owner said or showed that action occurred. Not DNS truth. |
| Previously captured domain exception evidence | AAF `domain_exception` approval/evidence rows | `manually_excepted` only for exact scope, subject, expiry, and freshness. |
| Previously captured SSL/readiness checks | Stored readiness/check refs if already captured by GNR8 | Readiness evidence with TTL and limitations. |
| Existing audit/evidence refs | AAF audit/evidence/source-ref/freshness rows and accepted external refs | Supporting refs and partial timeline detection. |
| Prior DDOM snapshots | `gnr8_ddom_readiness_snapshots`, refs | Comparison and stale display only. Current snapshot input must still read current source rows. |

## Forbidden Input Categories

The caller must not use:

- live DNS query results created by this caller;
- live Vercel API calls created by this caller;
- live Openprovider calls;
- registrar calls;
- DNS provider calls;
- inferred client approval;
- inferred publish approval;
- Command Center UI labels as source truth;
- Ops Inbox state as source truth;
- AI recommendations as source truth;
- external ticket/email/message status as approval truth unless an existing GNR8 acceptance/evidence ref cites it.

## Required Output Fields For DDOM-3 Writer Input

The caller must produce:

| DDOM-3 field | Requirement |
| --- | --- |
| `tenantId` | Required. |
| `clientId` | Nullable only when unknown/not applicable. |
| `siteId` | Required. |
| `ownershipSiteId` | Required when available. |
| `siteVersionId` | Required when version-scoped. |
| `domainBindingId` | Required for custom-domain binding snapshot. |
| `hostBindingId` | Required for internal-host snapshot when available. |
| `domain` | Normalized lowercase custom domain. |
| `internalHost` | Normalized lowercase internal host. |
| `intendedLaunchDomain` | Normalized intended custom domain when known. |
| `readinessState` | One of DDOM-3 states. |
| `readinessBlockers` | Stable sorted blocker codes. Empty only for acceptable states. |
| `readinessWarnings` | Stable sorted warning codes. |
| `freshnessState` | One of DDOM-3 freshness states. |
| `freshUntil` | Required for fresh time-bounded state when policy has a TTL. |
| `staleReason` | Required for stale/failed/partial states. |
| `sourceWatermark` | Caller-computed aggregate watermark or omitted for writer hash. Recommended to supply. |
| `sourceWatermarkJson` | Per-source watermarks plus freshness policy id/version. |
| `snapshotJson` | Compact canonical payload and limitations. |
| `refs` | Source refs for every material input. |
| `actorType` | `human` for manual MVP action. `system` only for future scheduled/event path. |
| `actorId` | Required actor or service account id. |
| `correlationId` | Required request/workflow correlation id. |
| `causationId` | Optional, should link to operator request or prior audit event when available. |
| `idempotencyKey` | Required stable semantic key. |
| `privacyLabel` | Required or defaulted to `client_confidential`. |
| `retentionClass` | Required or defaulted to `compliance_long`. |

## Required Refs

The caller must create refs for every source family it relied on:

| Source family | Ref role | Required metadata |
| --- | --- | --- |
| Domain binding | `domain_binding` | status, domain, source version, updated timestamp, binding watermark. |
| Host binding | `host_binding` | host, status, binding kind, source version, binding watermark. |
| Vercel-shaped snapshot fields | `vercel_snapshot` | `lastCheckedAt`, Vercel domain id if stored, limitation that this is not DNS/registrar truth. |
| DNS instructions | `dns_instruction_snapshot` | record count/type/purpose, instruction basis, limitation that instructions are not completion proof. |
| Manual completion evidence | `manual_completion_evidence` or `external_reference` | actor/ref, captured time, acceptance status, redaction label. |
| Domain exception | `domain_exception`, `aaf_approval`, `aaf_evidence_package` | scope, decision id, expiry, revocation/supersession status. |
| SSL/readiness checks | `audit_event` or future readiness ref role if added | check id, captured time, TTL, failure code. |
| Audit timeline | `audit_event` | event id/type, correlation, partial timeline marker if incomplete. |
| Freshness policy | `freshness_watermark` | policy id/version, TTL inputs, computed `freshUntil`, stale reason. |

Refs should use exact source table names when GNR8-owned and `sourceSystem` values that identify external references without implying GNR8 owns the external system.

## Required Freshness Fields

`sourceWatermarkJson` must include:

- `freshnessPolicyId`;
- `freshnessPolicyVersion`;
- `capturedSourceTransactionAt`;
- `domainBindingWatermark` when applicable;
- `hostBindingWatermark` when applicable;
- `vercelStoredSnapshotWatermark` when applicable;
- `dnsInstructionWatermark` when applicable;
- `manualEvidenceWatermark` when applicable;
- `domainExceptionWatermark` when applicable;
- `auditTimelineWatermark` or partial marker;
- `computedFreshUntil`;
- `computedStaleReason`.

`snapshotJson.freshness` must include:

- per-source freshness state;
- source timestamp used;
- TTL basis;
- stale triggers;
- whether freshness was computed from stored state only.

## Required Limitation Fields

`snapshotJson.limitations` must include all applicable limitation codes:

- `ddom_snapshot_from_stored_gnr8_state_only`;
- `external_dns_truth_not_checked_by_snapshot_caller`;
- `vercel_truth_not_checked_by_snapshot_caller`;
- `dns_instruction_snapshot_not_completion_proof`;
- `manual_completion_evidence_not_dns_truth`;
- `external_reference_not_gnr8_truth`;
- `domain_exception_not_publish_approval`;
- `domain_readiness_not_publish_approval`;
- `pasr_must_not_create_snapshots`;
- `command_center_ops_inbox_derived_only`;
- `partial_audit_timeline` when applicable.

## Readiness Mapping Rules

| Source condition | DDOM readiness | Freshness | Notes |
| --- | --- | --- | --- |
| Fresh active required custom-domain binding and required evidence present | `ready` | `fresh` | Vercel dependency may be satisfied; DNS truth remains external. |
| Fresh acceptable state with non-blocking warnings | `ready_with_warnings` | `fresh` | PASR maps to ready plus warnings. |
| No custom domain required by policy/target | `not_applicable` | `fresh` | Must cite policy/target relationship. |
| Approved domain exception exactly covers subject | `manually_excepted` | `fresh` unless exception stale | Does not approve publish. |
| Required source missing or failed | `blocked` | `failed` or `partial_timeline` | Must include blocker codes. |
| Previous/derived state expired or source changed after evidence | `stale` | `stale` | PASR maps to blocked. |

## Actor And Correlation Fields

MVP manual caller:

- `actorType = human`;
- `actorId = authenticated operator id`;
- `correlationId = operator request/action correlation id`;
- `causationId = optional prior audit/request/evidence id`;
- `idempotencyKey = stable semantic key for the same source watermark and subject`.

Future scheduled/event caller:

- `actorType = system`;
- `actorId = named service account`;
- `correlationId = scheduler run id or event id`;
- `causationId = source event id when available`.

## Privacy And Retention

Default labels:

- `privacyLabel = client_confidential`;
- `retentionClass = compliance_long`.

Escalate to:

- `provider_sensitive` when provider payload details are included;
- `credential_sensitive` if redacted sensitive provider/account details are referenced;
- `legal_sensitive` if domain ownership/legal evidence is referenced;
- `internal_operational` for internal-only diagnostics without client data.

The snapshot should store compact refs and hashes rather than screenshots, credentials, full provider payloads, or external account details.
