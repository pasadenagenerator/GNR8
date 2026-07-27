# GNR8 DDOM Readiness Snapshot Persistence Design

AAF-8 DDOM/domain readiness snapshot persistence design for publish activation evidence.

This document is documentation-only. It proposes future tables and rules but does not create SQL migrations, implement readers, call providers, or modify domain/DNS behavior.

## Current State

Current implementation facts:

- `public.gnr8_runtime_domain_host_bindings` stores mutable GNR8 domain binding state, Vercel-shaped verification fields, DNS instruction JSON, `last_checked_at`, `vercel_domain_id`, and `updated_at`.
- `public.gnr8_runtime_host_bindings` stores internal/working host bindings.
- `runtime-store.ts` can upsert/update/list domain bindings and activate active domain bindings for a site version.
- Publish route code can call Vercel check helpers and update domain binding rows during publish reconciliation.
- Hosting operations read models and readiness reports derive readiness from runtime/domain bindings.
- No dedicated canonical DDOM readiness snapshot table was found in inspected migrations.

Current DDOM facts from DDOM-1:

- No live DNS mutation.
- No registrar mutation.
- No Openprovider live mutation.
- No autonomous DNS repair.
- No autonomous cutover.
- Vercel checks are snapshots of Vercel state, not DNS truth.
- External DNS providers remain authoritative for DNS truth.
- GNR8 owns operating records, snapshots, evidence, freshness labels, exceptions, and projections.

## Proposed Tables

Proposed MVP tables:

1. `public.gnr8_ddom_readiness_snapshots`
2. `public.gnr8_ddom_readiness_snapshot_refs`

The first table is the canonical snapshot header and compact readiness payload. The second table stores append-only refs to supporting source/evidence/audit records without making those refs DNS truth.

## `gnr8_ddom_readiness_snapshots`

Proposed MVP-required fields:

| Field | Purpose |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Durable snapshot id used by AAF source refs. |
| `tenant_id text not null` | AAF tenant scope. |
| `client_id text null` | Client scope when known. |
| `site_id text not null` | Runtime site id. |
| `ownership_site_id uuid null references public.sites(id)` | Ownership/site anchor when known. |
| `site_version_id uuid null references public.gnr8_runtime_site_versions(id)` | Site version the snapshot applies to, when version-scoped. |
| `domain_binding_id uuid null references public.gnr8_runtime_domain_host_bindings(id)` | GNR8 domain binding source, if custom-domain scoped. |
| `host_binding_id uuid null references public.gnr8_runtime_host_bindings(id)` | GNR8 internal/working host binding source, if relevant. |
| `domain text null` | Normalized custom domain. |
| `internal_host text null` | Normalized internal/working host. |
| `intended_launch_domain text null` | Intended custom domain if different from current binding. |
| `readiness_state text not null` | `ready`, `ready_with_warnings`, `blocked`, `not_applicable`, `manually_excepted`, or `stale`. |
| `readiness_blockers jsonb not null default '[]'::jsonb` | Stable blocker codes. |
| `readiness_warnings jsonb not null default '[]'::jsonb` | Stable warning codes. |
| `freshness_state text not null` | `fresh`, `stale`, `failed`, or `partial_timeline`. |
| `fresh_until timestamptz null` | TTL expiration for the snapshot. |
| `stale_reason text null` | Primary stale reason. |
| `captured_at timestamptz not null default now()` | Snapshot capture time. |
| `source_watermark text not null` | Deterministic aggregate watermark for source refs. |
| `source_watermark_json jsonb not null default '{}'::jsonb` | Per-source watermarks used to build the aggregate. |
| `snapshot_json jsonb not null default '{}'::jsonb` | Compact canonical snapshot payload. |
| `created_by_actor_type text not null` | `human`, `system`, `provider`, `external_reference`, or `ai_advisory` where applicable. |
| `created_by_actor_id text not null` | Actor id. |
| `correlation_id text not null` | Workflow correlation. |
| `causation_id text null` | Causation ref. |
| `idempotency_key text not null unique` | Idempotent snapshot creation. |
| `privacy_label text not null default 'client_confidential'` | Privacy label. |
| `retention_class text not null default 'compliance_long'` | Retention label. |
| `created_at timestamptz not null default now()` | DB insertion timestamp. |

Recommended constraints:

- `readiness_state` check in `ready`, `ready_with_warnings`, `blocked`, `not_applicable`, `manually_excepted`, `stale`
- `freshness_state` check in `fresh`, `stale`, `failed`, `partial_timeline`
- JSON shape checks for arrays/objects
- Unique semantic snapshot key: `(site_id, coalesce(site_version_id::text, ''), coalesce(domain_binding_id::text, ''), source_watermark)`

## Vercel Snapshot Fields

MVP fields should live inside `snapshot_json.vercel` and be copied from existing Vercel check results only:

- `domain`
- `domainId`
- `verified`
- `status`
- `verificationRecord`
- `routingRecord`
- `lastCheckedAt`
- `capturedAt`
- `source`: `vercel`

These fields are Vercel project/domain state snapshots. They are not registrar ownership, nameserver, DNS zone, or publish approval truth.

## Manual DNS Instruction Snapshot Refs

MVP should include refs in `gnr8_ddom_readiness_snapshot_refs`:

- `ref_role`: `dns_instruction_snapshot`
- `ref_type`: `runtime_domain_host_binding` or future `ddom_dns_instruction_snapshot`
- `source_table`: current binding table or proposed instruction snapshot table
- `source_record_id`
- `source_watermark`
- `metadata_json`: instruction count, generatedAt, source basis, stale rule

If a future dedicated DNS instruction snapshot table is added, DDOM snapshots should cite it instead of reading mutable `dns_instructions_json` directly.

## Manual Completion Evidence Refs

Manual completion evidence is proposed as source refs, not DNS truth:

- `ref_role`: `manual_dns_completion_evidence`
- `ref_type`: `external_reference`, `aaf_evidence_package`, `audit_event`, or `operator_note`
- actor/ref/capturedAt/freshness metadata
- privacy/redaction labels for screenshots or external account data

Client/operator statements can support a recheck or exception. They do not by themselves prove DNS truth.

## Exception Refs

Domain exception refs should cite AAF approval/evidence rows:

- `gnr8_aaf_approval_requests`
- `gnr8_aaf_approval_decisions`
- `gnr8_aaf_evidence_packages`
- revocation and supersession links where applicable

Domain exception can produce `manually_excepted` only for the named scope and time window. It does not authorize publish activation.

## `gnr8_ddom_readiness_snapshot_refs`

Proposed MVP-required fields:

| Field | Purpose |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Ref row id. |
| `snapshot_id uuid not null references public.gnr8_ddom_readiness_snapshots(id)` | Parent snapshot. |
| `ref_role text not null` | `domain_binding`, `host_binding`, `vercel_snapshot`, `dns_instruction_snapshot`, `manual_completion_evidence`, `domain_exception`, `audit_event`, `external_reference`. |
| `ref_type text not null` | Domain-specific ref type. |
| `source_system text not null default 'gnr8'` | Source system. |
| `source_table text null` | Source table when GNR8-owned. |
| `source_record_id text not null` | Source record id or external ref id. |
| `source_version text null` | Source version if known. |
| `source_watermark text null` | Source watermark. |
| `captured_at timestamptz null` | Source capture/check time. |
| `metadata_json jsonb not null default '{}'::jsonb` | Ref details and limitations. |
| `created_at timestamptz not null default now()` | Ref row creation time. |

Refs are append-only with unique `(snapshot_id, ref_role, ref_type, source_record_id)`.

## Append-Only Vs Mutable

Snapshots and snapshot refs should be append-only. Do not update a snapshot to change readiness meaning. A new check, new instruction set, owner confirmation, exception, binding update, or TTL refresh creates a new snapshot.

Mutable current-state projections may be added later for Command Center/Ops Inbox, but they must derive from append-only snapshots and source tables.

## RLS Posture

Enable RLS on both proposed tables.

Recommended policy posture:

- tenant/client/site-scoped select for authorized agency/client roles;
- insert only through server-side service role or controlled writer;
- no ordinary update/delete;
- superadmin/service maintenance only for redaction or legal retention workflows, with compensating audit where applicable.

## Indexes

MVP indexes:

- `gnr8_ddom_snapshots_site_created_idx` on `(site_id, captured_at desc)`
- `gnr8_ddom_snapshots_site_version_created_idx` on `(site_version_id, captured_at desc)` where `site_version_id is not null`
- `gnr8_ddom_snapshots_domain_binding_created_idx` on `(domain_binding_id, captured_at desc)` where `domain_binding_id is not null`
- `gnr8_ddom_snapshots_readiness_idx` on `(readiness_state, freshness_state, captured_at desc)`
- `gnr8_ddom_snapshots_fresh_until_idx` on `(fresh_until)` where `fresh_until is not null`
- `gnr8_ddom_snapshot_refs_lookup_idx` on `(source_system, source_table, source_record_id, source_watermark)`
- `gnr8_ddom_snapshot_refs_parent_role_idx` on `(snapshot_id, ref_role)`

## Migration Ordering Relative To AAF

Recommended order:

1. AAF persistence core already exists.
2. Add DDOM readiness snapshot persistence.
3. Add publish target source truth.
4. Implement production source reader.
5. Add publish route shadow integration.
6. Consider blocking enforcement only after shadow evidence proves stable.

DDOM snapshots should be available before production publish evidence references `domainReadiness`.

## AAF Evidence Source Refs

Publish activation evidence should cite DDOM snapshots as:

- `sourceTable`: `gnr8_ddom_readiness_snapshots`
- `sourceRecordId`: snapshot id
- `sourceVersion`: `captured_at` or explicit snapshot version
- `currentWatermark`: snapshot `source_watermark`
- `evidenceWatermark`: same value at evidence build time
- `snapshotRef`: `gnr8:gnr8_ddom_readiness_snapshots:<id>`

If no DDOM snapshot exists, the source reader should return missing domain readiness source truth and the builder should create invalid evidence.

## Future Fields

Future-only fields, not required for MVP:

- registrar snapshot refs;
- nameserver chain snapshots;
- DNS provider-specific record-set snapshots;
- SSL certificate chain diagnostics;
- owner/delegation workflow tables;
- provider-neutral domain operating records;
- incident recovery links;
- cost/rate-limit snapshot refs;
- generated external instruction documents.

## Forbidden Fields And Actions

Do not add fields or semantics that imply:

- GNR8 owns external DNS zone truth;
- GNR8 mutated DNS records;
- GNR8 mutated registrar/nameserver state;
- Openprovider live mutation occurred;
- autonomous DNS repair occurred;
- autonomous cutover occurred;
- Vercel verified means registrar/DNS truth;
- domain readiness equals publish approval.

## Recommendation

Create append-only DDOM readiness snapshot persistence before implementing the production source reader. Existing domain binding rows are useful inputs, but not sufficient canonical readiness evidence for publish activation.

