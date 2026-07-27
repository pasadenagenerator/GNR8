# GNR8 DDOM Readiness Snapshot Operator Workflow

DDOM-4 product workflow for the first MVP operator experience around DDOM readiness snapshots.

This document is documentation-only. It does not implement UI, API routes, server actions, provider calls, DDOM caller code, publish integration, Command Center changes, or Ops Inbox changes.

## Product Principle

Operators should experience DDOM snapshots as a controlled record of what GNR8 already knows about domain readiness. The workflow must not pretend that GNR8 controls external DNS.

DDOM readiness is not publish approval. PASR must not create snapshots during gate evaluation. Command Center and Ops Inbox are derived only.

## Operator View

The operator should see:

- site, client, agency, runtime site id, and site version scope;
- intended custom domain and internal working host;
- current domain binding and host binding refs;
- latest stored Vercel-shaped check fields, if any;
- DNS instruction snapshot fields, if any;
- manual owner/client completion evidence refs, if any;
- domain exception refs, if any;
- latest DDOM snapshot id, captured time, freshness, source watermark, blockers, warnings, and limitations;
- explicit source labels: GNR8 operating record, Vercel snapshot, external evidence ref, AAF approval/evidence ref.

The UI language should say "Create readiness snapshot" or "Refresh readiness snapshot from stored state." It should not say "Check DNS", "Fix DNS", "Verify live domain", or "Approve publish".

## Creating Or Refreshing A Snapshot

MVP flow:

1. Operator opens the domain/readiness detail for a site.
2. The surface shows current stored GNR8 state and latest DDOM snapshot, if any.
3. Operator selects create/refresh snapshot.
4. Server validates actor scope and subject identity.
5. Caller reads stored source rows only.
6. Caller writes an append-only DDOM snapshot through the DDOM-3 writer.
7. Surface shows the new or reused snapshot id, readiness state, freshness, blockers, warnings, source refs, and limitations.

Allowed result labels:

- `ready`;
- `ready_with_warnings`;
- `not_applicable`;
- `manually_excepted`;
- `blocked`;
- `stale`.

Every result must show "not publish approval" near publish-adjacent contexts.

## Stale Snapshots

Stale snapshots should show:

- stale label;
- stale reason;
- expired `freshUntil` if available;
- source family that caused staleness;
- last captured snapshot id and source watermark;
- allowed next action such as refresh from stored state, regenerate DNS instructions in a separate governed workflow, request external owner evidence, or request exception.

The refresh action creates a new snapshot from stored GNR8 state only. It does not run live DNS checks or provider checks.

## Missing Evidence

Missing readiness evidence should be visible as blockers or limitations:

- missing domain intent;
- missing domain binding;
- missing internal host;
- missing DNS instruction snapshot;
- missing stored Vercel snapshot;
- missing manual completion evidence;
- missing domain exception evidence;
- missing audit/evidence refs;
- partial AAF timeline.

The operator may navigate to the source workflow that creates the missing evidence if that workflow exists and is separately authorized. The DDOM snapshot caller itself must not create those source records.

## Warnings

Warnings should be non-blocking but visible:

- ready with stale-adjacent warning window;
- missing custom domain when internal host path is acceptable;
- manual completion evidence present but not verified by a fresh stored check;
- partial external reference details due redaction;
- Vercel snapshot present but not registrar/DNS truth;
- DNS instructions present but not completion proof.

Warnings must flow to PASR as warnings when DDOM state is `ready_with_warnings`.

## Blocked Readiness

Blocked readiness should show:

- blocker code;
- source refs used to compute the blocker;
- accountable owner when known;
- allowed next actions;
- forbidden actions.

Examples:

- `missing_domain_binding`;
- `missing_dns_instruction_snapshot`;
- `missing_vercel_snapshot`;
- `domain_binding_failed`;
- `domain_readiness_stale`;
- `manual_completion_evidence_missing`;
- `domain_exception_expired`;
- `partial_audit_timeline`.

Blocked DDOM readiness blocks PASR publish evidence. It does not decide publish approval.

## Manual Exceptions

Manual exception display must show:

- exception approval/evidence refs;
- exact subject scope;
- accepted blocker or stale condition;
- expiry;
- limitations;
- revocation/supersession status;
- statement that the exception does not authorize DNS mutation and does not approve publish.

`manually_excepted` can satisfy the DDOM prerequisite only for the named scope while fresh.

## External DNS Owner And Client Evidence

External owner/client evidence should be linked as refs:

- source system or external reference id;
- actor/owner label where safe;
- captured or accepted time;
- redaction/privacy label;
- acceptance status if used to unblock a gate;
- limitation that external evidence is not GNR8 DNS truth.

The operator should see who owns the next external action: client, account manager, registrar/DNS owner, technical operator outside GNR8, or provider support.

## Audit And Evidence Refs

The surface should display compact refs:

- DDOM snapshot id;
- source watermark;
- domain binding id;
- host binding id;
- DNS instruction ref;
- stored Vercel snapshot ref;
- AAF evidence package id;
- AAF approval decision id;
- audit event ids;
- external reference ids.

Large screenshots or provider payloads should remain behind evidence refs and redaction controls.

## Allowed Actions

Allowed in MVP architecture:

- view latest derived readiness;
- view source refs and limitations;
- create or refresh a DDOM readiness snapshot from stored state;
- navigate to existing governed domain/evidence workflows;
- request a domain exception through AAF workflow when implemented;
- use the created snapshot later as PASR source truth.

## Actions Requiring Approval

These actions require separate approval workflows and are not performed by the DDOM caller:

- domain action workflows;
- sharing DNS instructions if policy requires approval;
- accepting an external reference as evidence when it unblocks a gate;
- granting a domain exception;
- launch signoff;
- publish activation approval;
- rollback or incident recovery.

## Forbidden Actions

The DDOM snapshot operator workflow must not offer:

- live DNS mutation;
- live registrar mutation;
- live Openprovider mutation;
- Vercel domain attachment/check created by the snapshot caller;
- autonomous repair;
- autonomous cutover;
- publish activation;
- publish shadow evaluation that creates snapshots;
- AAF approval creation by the snapshot caller;
- closing Ops Inbox items without underlying source transition or audited decision.

## Future Publish Shadow Support

After implementation, the operator can prepare publish shadow evaluation by ensuring a current DDOM snapshot exists before PASR runs. PASR then reads the existing snapshot and maps it into publish activation evidence.

If no current snapshot exists, PASR should report missing DDOM source truth. It must not create a snapshot during gate evaluation.

## DNS Control Boundary

The workflow should repeatedly make the DNS boundary clear:

- external DNS truth belongs to the registrar/DNS provider;
- Vercel truth belongs to Vercel;
- GNR8 owns operating records, snapshots, refs, readiness projections, freshness labels, and evidence;
- DNS instructions are not completion proof;
- DDOM readiness is a publish prerequisite, not publish approval.
