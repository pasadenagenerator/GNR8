# GNR8 DDOM Readiness Snapshot Caller Options

DDOM-4 decision matrix for possible production callers that create DDOM readiness snapshots.

This document is documentation-only. It does not implement any caller, job, route, provider integration, mutation, migration, or publish behavior.

## Recommendation

Select manual/operator-triggered snapshot creation for MVP.

The chosen caller should be server-only, read stored GNR8 state only, write only append-only DDOM snapshots through the DDOM-3 writer, and keep PASR read-only. Scheduled refresh can be added later. Request-time creation during PASR/publish gate evaluation and fully provider-backed live checking are rejected.

DDOM readiness is not publish approval. PASR must not create snapshots during gate evaluation. Command Center and Ops Inbox are derived only.

## Decision Matrix

| Option | Description | Benefits | Risks | Source-of-truth impact | Auditability | Determinism | Operator ergonomics | MVP suitability | Complexity | Failure modes | Decision now |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manual operator-triggered snapshot | Authorized operator requests a snapshot for a site/domain/internal-host subject. Caller reads stored GNR8 state and writes DDOM snapshot. | Highest reviewability, clear actor, easy to compare source refs, minimal side effects. | Operator may forget refresh; stale state must be visible. | Preserves truth boundaries because inputs are existing records and refs. | Strong: human actor, correlation, evidence refs. | High if read-only transaction and stable watermarks are used. | Good for MVP, especially from a domain readiness/admin surface. | Best fit. | Medium. | Missing source state, stale evidence, idempotency drift, read-only transaction unavailable. | Select for MVP. |
| Scheduled snapshot builder | System periodically scans stored domain/readiness records and creates snapshots. | Keeps stale labels current, reduces manual burden. | Can produce noise, needs policy for scan scope, may hide why snapshot was created. | Safe if stored-state only, but system actor must be clear. | Good if each run is audited/correlated. | High when source watermarks drive idempotency. | Good after setup; less explicit operator control. | Deferred. | Medium/high. | Schedule lag, repeated stale snapshots, missed scopes, system actor ambiguity. | Add after manual path proves stable. |
| Event-triggered after source changes | Domain/evidence/audit changes enqueue snapshot refresh. | Timely, efficient, naturally follows source updates. | Requires canonical event coverage and idempotency discipline. | Safe only if events are canonical and complete. | Good if causation ids point to source events. | High if event payload is only a pointer and reader rereads DB. | Excellent when reliable. | Deferred. | High. | Lost events, duplicate events, out-of-order changes, partial event coverage. | Not first. |
| Request-time during PASR/publish gate evaluation | PASR or publish gate creates a snapshot if missing/stale. | Appears convenient and reduces missing snapshots. | Mixes read/write at publish boundary, can mask missing readiness process, creates pressure to call live providers. | Damages source truth separation. | Weak: publish evaluation becomes causation for evidence creation. | Lower due time pressure and mixed responsibilities. | Poor: hidden side effect during publish attempt. | Not suitable. | High/risky. | Snapshot created from incomplete state, idempotency drift, gate timing races, accidental enforcement coupling. | Reject. |
| Hybrid manual plus scheduled refresh | Manual operator creates first snapshot; scheduled process refreshes stale stored-state snapshots later. | Balances control and freshness. | Needs policy for refresh cadence and system actor audit. | Safe if scheduler reads stored state only. | Strong with clear run ids and source watermarks. | High. | Good after MVP. | Future recommended path. | High after manual core. | Manual/scheduled overlap, duplicate snapshots, stale policy confusion. | Future direction, not first implementation. |
| Fully provider-backed live readiness checker | Caller performs live DNS/Vercel/Openprovider/registrar checks and snapshots results. | Potentially freshest external status. | Violates this milestone, creates provider dependency, risks mutation confusion, rate limits, environment variance, and overclaiming external truth. | High risk to DDOM doctrine. | Harder: external calls vary and may fail without source stability. | Lower due live external variance. | Tempting but unsafe. | Not suitable. | Very high. | Provider outage, stale race, false green, accidental live mutation, credential/rate-limit issues. | Reject. |

## Option Details

## Manual Operator-Triggered Snapshot

The operator chooses a site/domain/internal-host subject and requests a readiness snapshot. The server caller authenticates the actor, reads stored source rows in a read-only transaction, computes source watermarks, and calls the DDOM-3 writer.

Benefits:

- exact human actor and request correlation;
- easiest to review before publish shadow integration;
- no live provider dependency;
- deterministic replay of the input mapping;
- clear place to show missing evidence before snapshot creation.

Risks:

- stale snapshots if operators do not refresh;
- repeated manual attempts require strong idempotency keys;
- UI must not imply the button performs DNS/Vercel checks.

This option should be selected now.

## Scheduled Snapshot Builder

A server-only scheduler scans stored source rows and creates snapshots when the current source watermark differs from the latest snapshot or when freshness expires.

Benefits:

- keeps stale status visible;
- reduces manual refresh burden;
- can prepare PASR shadow reads before publish windows.

Risks:

- requires explicit scan scope and rate limits;
- may generate snapshots without operator context;
- needs careful audit of system actor, run id, source filters, and no-op decisions.

This option is deferred until manual creation is tested.

## Event-Triggered Snapshot Builder

Source changes such as domain binding update, DNS instruction capture, evidence acceptance, or exception approval emit a canonical event. The caller responds by rereading source state and writing a snapshot.

Benefits:

- timely;
- causation can point to source event;
- avoids unnecessary scans.

Risks:

- current domain/evidence event coverage is not proven complete enough;
- out-of-order and duplicate events require careful dedupe;
- event payloads must not be treated as full source truth.

This option is future work.

## Request-Time Snapshot Creation

PASR or publish gate evaluation creates a DDOM snapshot when one is missing or stale.

Benefits:

- fewer missing snapshot errors during publish evaluation.

Risks:

- mixes evidence creation with gate evaluation;
- turns publish shadow into a write path;
- can hide operational readiness gaps;
- makes PASR responsible for more than reading source truth;
- creates pressure for live provider checks at publish time.

This option is rejected. PASR must not create snapshots during gate evaluation.

## Hybrid Manual Plus Scheduled

Operators create first snapshots and can force refresh. A later scheduled builder refreshes stale snapshots from stored state only.

Benefits:

- manual control for first capture;
- scheduled freshness maintenance;
- clear evolution path after MVP.

Risks:

- requires coordination between manual and scheduled idempotency;
- needs display rules to distinguish human and system-created snapshots.

This is the recommended future path after manual MVP.

## Fully Provider-Backed Live Readiness Checker

The caller calls DNS, Vercel, Openprovider, registrar, or SSL providers to build snapshots from live external data.

Benefits:

- freshest possible external result when providers are reachable.

Risks:

- outside DDOM-4 boundary;
- external variance makes deterministic evidence harder;
- credentials, rate limits, and provider failures become snapshot creation failures;
- live checks can be confused with external DNS truth;
- live mutation hazards grow near the caller boundary.

This option is rejected for now.

## Conservative Decision

The MVP caller must prefer deterministic, auditable, non-mutating, already-known state over live provider dependency.

Minimum safe sequence:

1. Implement manual server-only caller.
2. Prove read-only source repository and no provider imports.
3. Prove deterministic watermarks and idempotency conflicts.
4. Create representative DDOM snapshots.
5. Verify PASR reads them as existing source truth.
6. Only then design publish-route shadow integration.
