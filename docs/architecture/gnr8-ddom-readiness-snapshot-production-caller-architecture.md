# GNR8 DDOM Readiness Snapshot Production Caller Architecture

DDOM-4 architecture decision for the first controlled production caller that creates DDOM readiness snapshots from already-known GNR8 domain/readiness state.

This document is documentation-only. It does not implement a caller, route, worker, scheduler, provider integration, SQL migration, publish integration, Command Center action, Ops Inbox action, or runtime behavior.

## Status

Recommended for implementation planning after architecture review.

## Final Recommendation

The first production caller should be a server-only, operator-triggered, read-from-stored-state snapshot caller.

It should:

- run only inside an authenticated internal/admin/operator server boundary;
- read stored GNR8 domain, host, readiness, AAF, and evidence refs through a dedicated read-only source repository;
- compute deterministic DDOM-3 writer input from those already-known rows;
- create append-only snapshots through the DDOM-3 writer only;
- return the created or reused snapshot id, source watermark, freshness labels, blockers, warnings, refs, and limitations;
- remain separate from PASR, publish routes, public runtime, provider helpers, domain mutation routes, workers, Command Center projections, and Ops Inbox projections.

The MVP trigger should be manual/operator-triggered. A scheduled refresh may follow after the manual path proves stable. Event-triggered refresh may follow after source-state change events are audited and idempotency discipline is proven. Request-time snapshot creation inside PASR or publish gate evaluation is rejected.

DDOM readiness is not publish approval. PASR must not create snapshots during gate evaluation. Command Center and Ops Inbox are derived only.

## Why The Caller Is Needed Before Publish Shadow Integration

DDOM-2 created append-only snapshot persistence. DDOM-3 created a server-only writer that accepts explicit source state. PASR-1 can read existing DDOM snapshots as publish activation source truth.

The remaining gap is production snapshot creation. Without a reviewed caller:

- PASR will often find `missing_ddom_snapshot`;
- publish shadow evidence will be dominated by missing-source failures;
- provider routes or mutable read models could be tempted to create snapshots at the wrong boundary;
- request-time publish evaluation could accidentally become a mixed read/write flow.

The caller creates the durable DDOM source truth that PASR later reads. It does not evaluate publish approval and does not enforce publish.

## Architecture Shape

Recommended future modules:

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Operator action boundary | Authenticates the operator and collects a snapshot request for a named site/domain/scope. | No provider calls. No publish calls. No source mutation. |
| DDOM source-state reader | Opens a read-only repeatable-read transaction and reads stored GNR8 rows/refs. | Select-only SQL. No runtime-store import while mixed read/write. |
| DDOM source mapper | Converts stored state into DDOM-3 writer input, freshness, source watermarks, refs, blockers, warnings, and limitations. | Pure deterministic transform. |
| DDOM-3 writer | Inserts append-only snapshot and refs with idempotency checks. | Existing writer only. |
| Derived surfaces | Display latest snapshot and stale/missing/blocked state. | Command Center/Ops Inbox are not truth. |
| PASR | Later reads existing snapshots as source truth. | Read-only. Must not create snapshots. |

## Allowed Source State

The caller may read only already-known GNR8 state:

- `gnr8_runtime_domain_host_bindings`;
- `gnr8_runtime_host_bindings`;
- `gnr8_runtime_sites`;
- `gnr8_runtime_site_versions`;
- ownership `sites` rows needed for tenant/client/agency/site identity;
- already-captured Vercel-shaped fields stored on GNR8 domain bindings;
- already-captured manual DNS instruction fields and `dns_instructions_json`;
- previously captured operator/client DNS completion evidence refs;
- previously captured domain exception approval/evidence refs;
- previously captured SSL/readiness snapshots when already stored by GNR8;
- existing AAF approval, evidence package, source-ref, freshness, and audit rows;
- existing external reference rows or accepted evidence refs if such rows already exist;
- prior DDOM snapshots only for comparison, stale display, or idempotency planning, not as a substitute for current source reads.

The caller should use direct read-only repository queries. It should not import mixed runtime-store modules as a production source boundary unless those reads are later extracted into a verified read-only module.

## Forbidden Reads And Calls

The caller must not read or call:

- live DNS query results created by this caller;
- live Vercel API calls created by this caller;
- live Openprovider calls;
- registrar APIs;
- DNS provider APIs;
- Stripe;
- AI providers;
- provider execution modules;
- Vercel attach/check helpers;
- Openprovider inventory/mutation helpers;
- domain routes;
- hosting recheck workflows;
- publish routes, publish orchestrators, publish guards, or publish enforcement;
- rollback routes or rollback switch helpers;
- public runtime serving;
- Command Center labels as source truth;
- Ops Inbox item state as source truth;
- AI recommendations as source truth.

## Mutations The Caller Must Never Perform

The caller must not mutate:

- runtime domain bindings;
- runtime host bindings;
- site versions;
- runtime artifacts;
- active pointers;
- content overrides or content history;
- publish target records;
- AAF approvals;
- AAF evidence packages directly during MVP;
- provider jobs, handoffs, authorizations, or governance rows;
- Command Center read models;
- Ops Inbox work items;
- public runtime state;
- billing, Stripe, or AI state.

The only write in the first implementation should be the DDOM-3 append-only snapshot/ref write. If audit-event writing is added later, it must be separately reviewed and must remain evidence of snapshot creation, not source mutation.

## Authority Model

| Subject | Authoritative owner | Caller treatment |
| --- | --- | --- |
| External DNS records, nameservers, registrar ownership | Registrar/DNS provider | Not read live and not mutated. Only existing accepted refs may be cited as evidence. |
| Vercel project/domain state | Vercel | Only previously captured GNR8 snapshot fields may be read. |
| GNR8 domain operating association | GNR8 domain binding rows | Read as mutable source state and watermark precisely. |
| GNR8 internal host association | GNR8 host binding rows | Read as mutable source state and watermark precisely. |
| Manual DNS instructions | GNR8 stored instruction snapshot fields | Evidence/instruction refs only, not completion proof. |
| DDOM readiness snapshot | GNR8 DDOM append-only tables | Created by this caller through DDOM-3 writer. |
| AAF approvals/evidence/audit | GNR8 AAF append-only tables | Read/cite refs. Do not create approvals. |
| Publish approval | AAF publish activation approval records | Not created or inferred by this caller. |
| Command Center/Ops Inbox | Derived surfaces | Display only. Never source truth. |

## Trigger Decision

| Trigger type | Decision |
| --- | --- |
| Manual/operator-triggered | Recommended for MVP. Deterministic, auditable, easy to inspect, and provider-safe. |
| Scheduled | Deferred. Useful for stale refresh after manual path proves stable and rate/audit policy exists. |
| Event-triggered | Deferred. Useful after domain/evidence change events are canonical enough to trust. |
| Request-time during PASR/publish gate evaluation | Rejected. It mixes evidence reads with snapshot writes at the most sensitive boundary. |
| Hybrid manual plus scheduled | Recommended future path, not MVP first step. |
| Provider-backed live checker | Rejected for this milestone. It violates the already-known-state boundary. |

## When To Create A Snapshot

A snapshot should be created when an authorized operator explicitly asks to capture DDOM readiness for a named subject and one of these is true:

- a domain binding exists and no DDOM snapshot exists for the current source watermark;
- a host binding/internal-host launch path needs a `not_applicable` or `manually_excepted` snapshot;
- stored domain binding fields changed since the latest DDOM snapshot;
- stored DNS instruction fields changed since the latest DDOM snapshot;
- stored Vercel-shaped check fields changed since the latest DDOM snapshot;
- existing operator/client completion evidence refs changed;
- existing domain exception approval/evidence refs changed;
- a prior fresh snapshot is now stale by TTL and a stale snapshot should be recorded;
- publish shadow preparation needs a current pre-existing DDOM snapshot, but outside PASR evaluation.

## When Not To Create A Snapshot

A snapshot should not be created when:

- the caller would need live DNS, Vercel, Openprovider, registrar, Stripe, or AI calls;
- required subject identity is missing and no `not_applicable` state is justified;
- the request comes from PASR, publish gate evaluation, public runtime, or a publish mutation path;
- the operator lacks scope or actor identity;
- read-only source transaction setup fails;
- the only available status is a Command Center label or Ops Inbox item;
- the request attempts to mark readiness as approval;
- the same idempotency key is reused with drifted semantic input.

## Idempotency Keys

The caller should construct an idempotency key from stable semantic inputs:

`ddom.snapshot.production-caller:v1:<tenantId>:<siteId>:<siteVersionOrNone>:<domainBindingOrHostBindingOrNone>:<triggerType>:<sourceWatermark>:<requestScope>`

Rules:

- include tenant/client/site scope;
- include site version when version-scoped;
- include domain binding or host binding when present;
- include a normalized intended domain or internal host when no binding id exists;
- include trigger type such as `manual_operator`;
- include the computed aggregate source watermark;
- include explicit request scope such as `custom_domain`, `internal_host`, or `no_custom_domain`;
- do not use timestamps alone;
- do not include provider response timing because this caller does not call providers.

## Source Watermarks

The source watermark should be a stable `sha256:` hash over sorted canonical source families:

- subject identity fields;
- domain binding canonical fields and `updated_at`;
- host binding canonical fields and `updated_at`;
- DNS instruction payload and instruction source/basis fields;
- stored Vercel-shaped status fields and `last_checked_at`;
- stored manual completion evidence refs and captured timestamps;
- stored exception approval/evidence refs, decision status, expiry, revocation, and supersession markers;
- stored SSL/readiness refs if present;
- freshness policy id/version and computed `fresh_until`/stale reason;
- limitations and privacy/retention labels;
- ref semantic payloads.

The caller may pass this watermark to the DDOM-3 writer. The writer should still record its own `_ddomWriterPayloadHash` when the caller supplies a watermark.

## Source Refs

The caller should create refs with the DDOM-3 ref roles:

| Ref role | Expected source |
| --- | --- |
| `domain_binding` | `gnr8_runtime_domain_host_bindings` row. |
| `host_binding` | `gnr8_runtime_host_bindings` row. |
| `vercel_snapshot` | Vercel-shaped fields already stored in GNR8. |
| `dns_instruction_snapshot` | Stored DNS instruction fields or future instruction snapshot row. |
| `manual_completion_evidence` | Existing operator/client evidence or accepted external ref. |
| `domain_exception` | Existing domain exception decision/evidence refs. |
| `audit_event` | Existing audit timeline refs where available. |
| `external_reference` | Existing accepted external reference snapshot. |
| `aaf_evidence_package` | Existing AAF evidence package refs. |
| `aaf_approval` | Existing AAF approval request/decision refs. |
| `freshness_watermark` | Synthetic ref describing the freshness policy inputs. |

Refs prove what GNR8 knew and cited. They do not become DNS truth.

## Missing, Stale, Failed, And Blocked State

Missing source state should be explicit:

- missing domain intent: `blocked` with `missing_domain_intent`, unless no custom domain is required and policy supports `not_applicable`;
- missing domain binding for required custom domain: `blocked` with `missing_domain_binding`;
- missing internal host when internal path is required: `blocked` with `missing_internal_host`;
- missing Vercel-shaped check when required: `blocked` or `partial_timeline` with `missing_vercel_snapshot`;
- missing DNS instructions when external DNS owner action is required: `blocked` with `missing_dns_instruction_snapshot`;
- missing completion evidence when owner action is required: `blocked` with `missing_manual_completion_evidence`;
- missing audit/evidence timeline: `partial_timeline` freshness with limitation `partial_audit_timeline`.

Stale source state should become `readiness_state = stale` and `freshness_state = stale`, or a non-stale readiness state with stale freshness only when preserving a prior semantic state for display. PASR maps either stale form to blocked gate semantics.

Failed/blocked readiness should use `readiness_state = blocked`, `freshness_state = failed`, stable blocker codes, and refs to the failed stored check/evidence rows.

## DDOM To PASR Semantics

| DDOM state | PASR domain readiness status | PASR freshness | Gate meaning |
| --- | --- | --- | --- |
| `ready` | `ready` | `fresh` unless source says otherwise | Domain prerequisite can be considered satisfied, not approval. |
| `ready_with_warnings` | `ready` plus warnings | `fresh` unless source says otherwise | Satisfies prerequisite with visible warnings. |
| `not_applicable` | `not_applicable` | `fresh` unless source says otherwise | Domain prerequisite is not required for this subject. |
| `manually_excepted` | `manually_excepted` | `fresh` unless exception is stale | Exception can satisfy prerequisite only for named scope. |
| `blocked` | `blocked` | `failed` or `partial_timeline` | Blocks publish evidence/gate. |
| `stale` | `blocked` | `stale` | Blocks publish evidence/gate with `domain_readiness_stale`. |

DDOM readiness is not publish approval in every row of this table.

## Freshness Calculation

The first caller should compute freshness from stored timestamps and source watermarks:

- domain binding freshness changes when binding `updated_at` changes;
- Vercel-shaped snapshot freshness changes when `last_checked_at` is absent, outside TTL, or the binding/domain changed after `last_checked_at`;
- DNS instruction freshness changes when instruction fields are absent, generated from old basis fields, or binding/domain/policy changed after instruction capture;
- manual completion evidence freshness changes when evidence is absent, stale by policy, or predates the current instruction snapshot;
- exception freshness changes when approval/evidence expired, revoked, superseded, or no longer matches the subject;
- internal host freshness changes when host binding status is inactive or updated after the prior snapshot;
- partial audit timeline produces `partial_timeline`.

Recommended MVP TTLs should be policy constants in implementation, not hard-coded in docs. The architecture requires the caller to persist `fresh_until`, `stale_reason`, freshness policy id/version in `source_watermark_json`, and limitation codes in `snapshot_json`.

## Snapshot Limitations

Every snapshot should include limitations that make overclaiming difficult:

- `ddom_snapshot_from_stored_gnr8_state_only`;
- `external_dns_truth_not_checked_by_snapshot_caller`;
- `vercel_truth_not_checked_by_snapshot_caller`;
- `dns_instruction_snapshot_not_completion_proof` when instructions are present;
- `manual_completion_evidence_not_dns_truth` when owner evidence is present;
- `domain_readiness_not_publish_approval`;
- `pasr_must_not_create_snapshots`;
- `command_center_ops_inbox_derived_only`.

## Command Center And Ops Inbox Display

Command Center may show the latest DDOM snapshot id, readiness state, freshness, stale reason, blockers, warnings, evidence refs, and allowed next actions. Ops Inbox may derive `domain_action_needed`, `dns_verification_failed`, `approval_needed`, `publish_readiness_failed`, or `external_workflow_update` from the latest snapshot and source state.

Neither surface may become truth. Closing an Ops Inbox item must require a canonical source transition, a new DDOM snapshot, or an audited decision that the work is no longer required. A Command Center button may trigger the future caller, but the button label is not source state.

## Future PASR And Publish Shadow Integration

PASR should later consume created snapshots exactly as PASR-1 already does:

- read the latest matching `gnr8_ddom_readiness_snapshots` row;
- use `source_watermark` as the DDOM current watermark;
- map stale DDOM state to blocked publish evidence;
- surface missing DDOM snapshots as missing source truth;
- never create snapshots during publish gate evaluation.

Publish route shadow integration must call PASR/readers only after snapshots already exist. If no snapshot exists, shadow evidence should report `missing_ddom_snapshot`. It must not compensate by creating a snapshot inside the publish path.

## Why This Is Not Publish Enforcement

The caller creates a readiness snapshot. It does not:

- create publish activation approval;
- decide that publish may proceed;
- evaluate the full publish gate;
- switch active pointers;
- publish content overrides;
- attach Vercel domains;
- mutate DNS;
- call providers;
- close incidents;
- resolve Ops Inbox work by itself.

Implementation of this caller may begin only after this architecture is accepted and a narrow server-only read repository/writer integration milestone is approved. Publish-route shadow integration must wait until the caller exists, test data proves snapshots are produced deterministically, and PASR can read them without missing-source noise.

## Explicit Architecture Answers

| Question | Answer |
| --- | --- |
| Should the first caller be manual, scheduled, event-triggered, request-time, or hybrid? | Manual/operator-triggered for MVP. Hybrid manual plus scheduled is a future path. |
| Should PASR ever create DDOM snapshots during publish gate evaluation? | No. PASR must read existing snapshots only. |
| Should the caller call Vercel? | No. It may read previously captured Vercel-shaped GNR8 fields only. |
| Should the caller call DNS providers? | No. |
| Should the caller call Openprovider? | No. |
| Should the caller mutate domain bindings? | No. |
| Should the caller create AAF approvals? | No. |
| Should the caller create AAF evidence packages directly or only refs? | MVP caller should cite existing AAF evidence/approval refs only. Direct AAF evidence package creation is deferred. |
| What is the minimum safe implementation path? | Server-only manual action, read-only source repository, deterministic mapper, DDOM-3 writer call, static guardrails, disposable DB tests, no provider calls. |
| What must happen before publish-route shadow integration? | Implement and validate this caller, create representative snapshots, verify PASR reads them, define shadow observation/audit behavior, and keep publish non-enforcing. |
