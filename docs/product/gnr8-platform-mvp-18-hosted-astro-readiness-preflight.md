# GNR8 Platform MVP 18 — Hosted Astro Readiness Preflight

Date: 2026-09-29

Status: `superseded_by_mvp_18b_package_ready`

Decision: **BLOCKED**

## MVP 18b follow-up

MVP 18b resolved the cross-environment credential-classification conflict,
rotated the staging password, prepared and fully validated the exact data-empty
compatibility package, and deployed current committed code to a protected
staging-only Preview with Astro disabled. Hosted SQL has not been applied, and
direct password authentication plus real authenticated superadmin behavior
remain unverified. See
`docs/product/gnr8-platform-mvp-18b-staging-isolation-and-compatibility-repair.md`
for the current approval package and remaining blockers. This historical
report's original findings remain below for auditability.

## MVP 18a follow-up

MVP 18a resumed and reached the exact staging project on 2026-09-29. That
resolves this report's target-unreachable blocker, but not activation readiness.
The bounded hosted catalog inspection found missing ownership prerequisites and
an incompatible `pgcrypto` schema dependency; the retained Vercel Preview also
predates MVP 14–17. Credential rotation remains incomplete because one possible
consumer is scoped across all Vercel environments. See
`docs/product/gnr8-platform-mvp-18a-resumed-staging-verification-and-credential-rotation.md`
for current evidence and the revised blocker set. This historical report's
original findings are retained below for auditability.

## Decision summary

The repository implementation is locally coherent through MVP 17, and the exact
candidate migration still matches the SHA-256 validated by MVP 13a. The intended
non-production target cannot, however, be used for a controlled activation:

- repository configuration identifies Supabase staging project
  `dpkdxllcxnlytgjbnmvp` and database `postgres` through the session-pooler
  identity `postgres.dpkdxllcxnlytgjbnmvp`;
- the configured database login is rejected with the sanitized Supabase result
  `tenant/user postgres.<redacted> not found`;
- the configured project hostname does not resolve; and
- no exact Vercel Preview deployment URL, deployment revision, connected project
  metadata, or existing staging superadmin session was available.

Production project `ujfbpzugdsdmroqvhfvn` and
`https://app.pasadenagenerator.com/` were not substituted or inspected. The task
requires staging-first activation and does not authorize silently moving the
pilot to production.

During repository inspection, one search was insufficiently excluded from
local environment files and surfaced the staging database connection line in
tool output. The value is not repeated or retained in this report. Under the
repository's password-handling policy, the staging database password must be
treated as exposed and rotated before the target is repaired or reused. No
credential, environment, or provider configuration was changed in this task.

Consequently, the hosted migration cannot be classified as absent,
present-and-matching, or inconsistent. Its classification is **unverified and a
stop condition** until the selected target is reachable. No migration,
registration, build, feature enablement, deployment, data write, or application
change occurred.

This is readiness for a synthetic internal pilot only. It is not production
publishing readiness.

## Exact selected target

| Field | Result | Classification |
| --- | --- | --- |
| Environment | Staging / non-production, selected according to the repository's staging-first topology | pass |
| Supabase project | `dpkdxllcxnlytgjbnmvp` | pass (configured identity only) |
| Database identity | Database `postgres`; session-pooler user `postgres.dpkdxllcxnlytgjbnmvp`; pooler region `eu-central-2` | pass (configured identity only) |
| Application environment | Vercel Preview is the documented mapping to Supabase staging | pass (repository policy only) |
| Exact application URL | Not present in repository configuration or connected deployment metadata | blocker |
| Database reachability | Login rejected because the tenant/user was not found | blocker |
| Supabase HTTPS reachability | Project hostname did not resolve | blocker |
| Staging database credential | Accidentally surfaced in tool output during local search; value omitted here | blocker: rotate before reuse |
| Connected Supabase metadata | `supabase projects list --output json` returned no projects | unverified |
| Vercel linkage | No `.vercel` project metadata and no Vercel CLI were available | unverified |

The production Supabase configuration is a distinct project in `eu-west-1`.
That separation confirms staging was not an alias for production, but it does
not establish that the stale staging configuration identifies a currently
existing project.

## Repository, migration, and deployment provenance

| Check | Sanitized evidence | Classification |
| --- | --- | --- |
| Repository revision | `5d22f4bb18e70ae3144fd0a749544d522dbacffa` on `main`; commit subject `Expose Astro candidates from the knowledge workspace` | pass |
| Remote parity | Local `HEAD` and the locally known `origin/main` ref were `0/0` ahead/behind | pass, but no network refresh was performed |
| Relevant baseline dirty state | Clean before this report was created | pass |
| Migration file | `apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql` | pass |
| Migration SHA-256 | `c3aaafe800b9a4d2b1f73b1eba2e5d3002a6b3b7f25e0c7ca1b4f7b0cc6e2154` | pass |
| MVP 13a alignment | Current hash exactly matches the repository file applied by the normal MVP 13a disposable-database harness | pass, local evidence only |
| Deployed revision | No connected Preview deployment metadata was available | blocker |
| Deployed Astro code | It is not established that MVP 15–17 or repository revision `5d22f4b` is deployed to a staging Preview application | blocker |

The migration remains the exact locally validated artifact. This does not show
that any hosted migration-history row or object exists.

## Read-only inspection boundary and evidence

Only the selected staging configuration was contacted. The database connection
attempt used the existing `pg` dependency, an eight-second connection timeout,
and was prepared to issue `BEGIN READ ONLY`, a five-second statement timeout,
and a one-second lock timeout before catalog queries. Authentication failed
before a transaction or query began. A subsequent read-only HTTPS health check
failed at DNS resolution. No registration or access-mutation RPC was invoked.

The report and retained file contain no credential value. Apart from the
credential-handling incident disclosed above, the following were deliberately
not used: production database/application,
provider execution, DNS mutation, registrar/API mutation, billing, Airship,
publish, live pointers, rollback, dry-run, shadow publish, customer payloads,
HTML capture, source capture, or broad table export.

## Hosted finding matrix

| Area | Finding | Classification |
| --- | --- | --- |
| PostgreSQL version and UTF-8 encoding | Could not query `server_version` or `server_encoding` | blocker |
| `pgcrypto` placement | Could not verify extension schema or `public.digest(bytea,text)` dependency | blocker |
| Required PostgreSQL built-ins | Stored generated columns and `hashtextextended(text,bigint)` support could not be verified on the target | blocker |
| Prerequisite relations | Exact hosted types, constraints, FKs, and owners for runtime sites/versions, sites, organizations, and agencies could not be read | blocker |
| Organizations history assumption | Repository history still lacks the original `organizations` creation. Hosted `id`, `agency_id`, owner, constraints, and FK history could not resolve that assumption | blocker |
| Ownership coverage | No target version could be checked for non-null `ownership_site_id` or `sites.agency_id = organizations.agency_id` | blocker |
| Migration history | Hosted migration ledger was not reachable | blocker |
| Candidate object collisions | Catalog names, overloads, indexes, and triggers were not reachable | blocker |
| Migration runner | Identity, role membership, superuser/BYPASSRLS state, and expected resulting ownership are unknown | blocker |
| Request roles | `anon`, `authenticated`, and `service_role` inheritance/BYPASSRLS attributes and memberships are unknown | blocker |
| Default privileges | Relevant table/function default ACLs are unknown | blocker |
| Candidate objects | Presence is unknown; no claim that they are absent is made | unverified |
| RPC/RLS/security-definer shape | Pending migration-state verification; no hosted claim is made | pending activation |
| PostgREST exposure | The staging REST endpoint was unreachable; table/RPC exposure is unknown | blocker |
| Synthetic runtime target | No minimal metadata read was possible | blocker |
| Existing superadmin auth | No exact staging URL or authorized staging session was available | blocker |
| Disabled Astro surface | Not requested because no exact staging application URL/deployed revision was established | unverified |

If later inspection proves the candidate objects are absent, RPC/RLS/PostgREST
checks remain pending until after migration in MVP 19. An absent object set must
not be reported as a passed RPC check. If any candidate name already exists,
MVP 19 must stop until every existing definition is compared with the reviewed
migration; it must not repair or replace objects ad hoc.

## Verified repository prerequisites

The following are verified from the checked-in source, not from hosted state:

- Candidate migration creates three tables:
  `gnr8_astro_candidate_records`, `gnr8_astro_candidate_access_states`, and
  `gnr8_astro_candidate_access_events`.
- Its four service-role RPC signatures are:
  - `gnr8_register_astro_candidate(text,text,text,text,text,integer)`;
  - `gnr8_read_astro_candidate_for_scope(text,text,uuid,uuid,uuid,uuid)`;
  - `gnr8_list_astro_candidate_metadata(text,uuid,uuid,uuid,uuid,timestamptz,text,integer)`;
  - `gnr8_set_astro_candidate_access(text)`.
- The intended migration shape forces RLS on all three tables, revokes direct
  table access from `PUBLIC`, `anon`, `authenticated`, and `service_role`,
  revokes internal helpers, grants only the four RPCs to `service_role`, and
  gives each gateway RPC `SECURITY DEFINER` with fixed
  `search_path = pg_catalog`.
- The migration contains seven `ON DELETE RESTRICT` ownership/data FKs, three
  mutation-protection triggers, four candidate indexes, and immutable record
  plus append-only event enforcement.
- Repository runtime DDL expects `gnr8_runtime_sites.id text` and
  `gnr8_runtime_site_versions.id uuid` with `site_id text`. The ownership
  migration adds nullable `ownership_site_id uuid` referencing `sites(id)` with
  `ON DELETE SET NULL`.
- Checked-in ownership shape expects `sites.id/org_id/agency_id`,
  `organizations.id/agency_id`, and `agencies.id` to be UUIDs. The original
  `organizations` creation remains absent from migration history and must be
  established from hosted catalogs.
- The authoritative resolver requires this complete chain:
  `site version -> runtime site + ownership site -> site organization/agency ->
  organization agency -> agency`; it fails closed on missing, duplicate, or
  inconsistent rows.
- MVP 15's only producer is
  `internal_synthetic_astro_build_export_bridge` version `v1`, and its only
  allowed fixture is `northline_operations_v1`.
- The registration composition is unmounted and process-local. No checked-in
  route or CLI invokes it. The producer creates a temporary workspace, installs
  Astro `^5.0.0` with `pnpm`, performs a real static build/export/readback, and
  removes its workspace before registration.
- MVP 16 mounts the root-only preview GET route, and MVP 17 mounts the
  payload-free candidate list plus Workspace link. Both use real existing
  superadmin guards and stateless service-role Supabase composition.
- The single global gate is
  `GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED`; only the exact value `1`
  enables it.

These source facts do not verify function ownership, grants, RLS enforcement,
PostgREST schema cache, real auth, producer runtime suitability, or a deployed
route.

## Configuration and authentication

The selected repository staging file has a coherent, distinct staging set for
`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; values were
not recorded in this report. It also has the documented staging runtime
controls.

`GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED` is absent from that file, so the
repository staging configuration is **disabled** and was left unchanged.
`SUPERADMIN_EMAILS` is also absent from that file. This is not evidence about
Vercel Preview variables, because deployed variable metadata was unavailable.
The deployed gate and superadmin allowlist therefore remain unverified.

No existing staging superadmin login could be confirmed. The exact remaining
check is: establish the exact Vercel Preview URL and deployed revision, confirm
without displaying values that its Supabase URL, anon key, service-role key,
and non-empty `SUPERADMIN_EMAILS` all belong to the selected staging project,
then use an already authorized allowlisted session to open the real Workspace
and candidate list. Authentication must not be bypassed and raw credentials
must not be requested in chat.

A disabled `503` from the Astro surface, if later observed, proves only the gate
path. It does not prove storage integration, ownership resolution, RPC
exposure, or candidate readback.

## Synthetic target requirements

No existing synthetic runtime site/version could be identified because the
target was unreachable. A customer site must not be substituted.

If MVP 19 finds no clearly synthetic version with a complete chain, it needs a
minimal, explicitly synthetic set of records using the target's existing
schema and normal write path:

1. one synthetic agency, unless a dedicated non-customer pilot agency already
   exists;
2. one synthetic organization linked to that agency;
3. one synthetic first-class `sites` row linked to the same organization and
   agency, with no customer domain;
4. one synthetic `gnr8_runtime_sites` row; and
5. one synthetic `gnr8_runtime_site_versions` row whose `site_id` references
   that runtime site and whose `ownership_site_id` references the synthetic
   first-class site.

Before registration, read back only identifiers, types/status needed by the
resolver, and the agency equality. Do not create pages, customer content,
domains, host bindings, artifacts, active pointers, or publish records merely
to satisfy this pilot.

## MVP 15 retry limitation and required pilot control

The current retry store is an in-memory `Map`. It preserves the exact generated
candidate and registration intent only while that operator process survives.
Reusing the operation UUID deterministically preserves candidate ID,
correlation ID, idempotency key, and producer ref, but blind regeneration after
process loss would change timestamps and can change installed Astro output. It
is not an acceptable ambiguous-write recovery procedure.

MVP 19 must add or approve a controlled operator invocation with a durable,
access-restricted retry journal before its first registration RPC. The journal
must persist the server-owned operation UUID, actor, site-version and producer
selection, resolved ownership scope, candidate ID and creation timestamp,
registration context, exact validated synthetic candidate/canonical intent,
and resulting hashes. It must be written before the RPC and must never contain
credentials or customer data.

On an ambiguous result:

1. stop all further writes and keep the global gate disabled;
2. keep the same operation process alive when possible;
3. use the deterministic candidate ID and authoritative scope for a bounded
   read/list reconciliation;
4. if the record exists, verify operation identity, hashes, ownership, enabled
   access state, and original `storedAt` before accepting it;
5. if absence is conclusively established, replay the exact preserved intent
   through the same registration RPC; and
6. if readback is unavailable or conflicts, retain the journal and escalate.
   Do not allocate a new operation, rebuild, regenerate, delete, or overwrite.

This can be implemented as a narrow file-backed/operator-store adapter or an
equivalent durable orchestration record. A transient Vercel request using the
current process-local composition is not sufficient for the pilot.

## MVP 19 controlled activation plan

MVP 19 should remain one explicitly approved, staging-only activation task.
Authorization must name the exact replacement/repaired non-production project,
database, Vercel Preview project/deployment URL, migration hash, actor, and
synthetic target before any write.

### Required explicit authorization

The approval must separately cover:

- rotation of the exposed staging database password and coherent update of all
  authorized staging/Preview secret stores before any connection or deploy;
- repair or replacement of the stale staging configuration, without creating
  infrastructure unless specifically approved;
- application of only migration
  `20260928120000_astro_candidate_registry.sql` with SHA-256
  `c3aaafe800b9a4d2b1f73b1eba2e5d3002a6b3b7f25e0c7ca1b4f7b0cc6e2154`;
- creation of the minimum synthetic ownership/runtime records only if no
  qualifying synthetic target exists;
- a narrow durable operator invocation/retry journal;
- the producer's transient dependency installation and real Astro build/export
  for fixture `northline_operations_v1`;
- exactly one candidate registration operation and idempotent replay only for
  ambiguity reconciliation;
- deployment of revision `5d22f4b` or a reviewed descendant if the target does
  not already run MVP 15–17;
- staging Preview configuration of the required Supabase/auth variables and
  the global Astro gate; and
- real authenticated and denied-access verification against the exact staging
  application URL.

No approval should include production, customer records/content, access-toggle
RPCs, deletion, schema rollback, data rollback, publishing, live pointers,
DNS, provider execution, billing, Airship, source capture, dry-run, or shadow
publish.

### Ordered operations and expected evidence

1. **Rotate and re-establish the target.** Rotate the exposed staging database
   password, update only authorized staging/Preview secret stores, and confirm
   the exact non-production
   Supabase project, database identity, Vercel Preview project/deployment URL,
   deployed Git SHA, and coherent variable-to-project mapping. Expected
   evidence: sanitized project refs, database/application identities, and
   deployment SHA; no values.
2. **Repeat the read-only catalog preflight.** In `BEGIN READ ONLY` with bounded
   timeouts, capture PostgreSQL version/encoding, `pgcrypto`, required function
   signatures, prerequisite columns/types/FKs/owners, organizations history,
   ownership coverage, migration ledger, collisions, runner authority, role
   inheritance/BYPASSRLS, and default ACLs. Expected evidence: every MVP 18
   blocker becomes pass or a named stop condition.
3. **Verify code prerequisites before writes.** Confirm the deployed revision
   contains MVP 14–17, that auth/service-role configuration is present, and
   that the controlled operator environment has pinned Node/pnpm plus outbound
   package access for the producer. Expected evidence: revision match and
   dependency/tool versions without secrets.
4. **Select or create only the synthetic ownership chain.** Prefer an existing
   qualifying synthetic version. If none exists, create only the minimal
   records listed above under separate data-write approval, then boundedly read
   back the chain. Expected evidence: synthetic labels/IDs and complete,
   consistent ownership; no customer identifiers.
5. **Apply the exact migration once.** Use the reviewed trusted migration
   runner. Stop on any error and verify transaction rollback; do not repair or
   mark history manually. Expected evidence: migration ledger entry tied to the
   hash and clean application result.
6. **Verify post-migration security before registration.** Inspect all objects,
   owners, FKs, constraints, triggers, indexes, forced RLS, grants, fixed search
   paths, default privileges, and PostgREST exposure. Exercise only safe
   role-denial and non-mutating list/read behavior; do not use registration or
   access mutation as probes. Expected evidence: only the four RPCs exposed to
   `service_role`, no direct candidate-table privileges, and payload-free list
   shape.
7. **Install/build the allowlisted synthetic producer.** Allocate one operation
   UUID, create the durable retry journal, run the real transient Astro install
   and build/export, validate hashes/size/ownership, and confirm workspace
   cleanup. Expected evidence: tool versions, operation/correlation IDs,
   candidate ID, hashes, byte size, and cleanup status; no HTML/source payload.
8. **Register exactly once.** Re-resolve ownership, call only
   `gnr8_register_astro_candidate`, and preserve the journal. Expected evidence:
   `created` or reconciled `idempotent`, original `storedAt`, enabled state, one
   registration event, and exact hash agreement.
9. **Prove persistence from a fresh context while the gate remains disabled.**
   End the writer process, start a fresh process/request context, resolve
   ownership, list metadata, and read the exact candidate. Expected evidence:
   same candidate ID, timestamps, hashes, size, scope, and enabled state.
10. **Deploy if needed, still disabled.** Deploy the reviewed revision to the
    exact Vercel Preview project and verify the disabled surface only as a gate
    check. Expected evidence: deployment SHA/URL and `503`; do not call this
    storage proof.
11. **Enable the global gate only after steps 1–10 pass.** Set the exact value
    `1` in Vercel Preview and redeploy if the platform requires it. Expected
    evidence: configuration presence/state reported only as `enabled` and the
    resulting deployment SHA/URL.
12. **Run the real admin path.** With an existing allowlisted session: login,
    open Workspace for the exact synthetic site version, open the Astro
    candidate list, and follow the exact candidate preview link. Expected
    evidence: metadata-only list, exact candidate render, no fallback, and no
    automatic/latest selection.
13. **Run negative and header checks.** Verify unauthenticated `401`/redirect,
    authenticated non-superadmin `403`/redirect, malformed or wrong-scope
    selectors as non-enumerating `404`, and successful preview headers:
    `no-store`, `nosniff`, `no-referrer`, same-origin resource policy,
    restrictive Permissions-Policy, and sandbox CSP. Expected evidence: status
    and header names/values only; no HTML capture.
14. **Close out without cleanup writes.** Record immutable IDs/hashes and leave
    the candidate retained. Do not call the deferred access-toggle RPC. The
    global gate is the pilot disable mechanism.

### Failure handling

- On any prerequisite, migration, ownership, build, registration, deployment,
  auth, or preview mismatch: stop further writes.
- For uncertain registration, follow the exact journal-based reconciliation
  above; never blindly regenerate.
- Preserve immutable candidate/access/event rows and the operator journal for
  investigation.
- If the candidate is registered but the application/auth/readback path is
  unsafe or inconsistent, keep or return the global gate to disabled and
  redeploy as required by Vercel.
- Do not delete pilot data and do not attempt schema/data rollback in MVP 19.
  Any later deletion or rollback requires a separate design and authorization.

## Checks not executed and unavailable permissions/tools

- No working staging PostgreSQL identity or DNS endpoint was available, so no
  catalog, migration-history, metadata-row, ownership, role, ACL, or candidate
  query ran.
- Supabase CLI 2.90.0 was installed but had no connected projects available.
- No Vercel CLI, `.vercel` linkage, deployment metadata, or exact Preview URL
  was available.
- No authorized staging browser session/application URL was available, so real
  superadmin, denied-access, responsive UI, preview, or response-header checks
  ran.
- No product build, test suite, migration application, schema-cache reload,
  producer execution, dependency installation, registration, deployment, or
  configuration change ran.

## Scope and change statement

Files changed: this report only.

Product behavior changed: no.

Configuration changed: no.

Data/schema changed: no.

Provider, DNS, billing, Airship, publish, live-pointer, rollback, dry-run, and
shadow-publish changes: none.
