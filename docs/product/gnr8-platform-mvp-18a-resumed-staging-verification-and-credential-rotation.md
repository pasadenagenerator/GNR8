# GNR8 Platform MVP 18a — Resumed Staging Verification and Credential Rotation

Date: 2026-09-29

Status: `superseded_by_mvp_18b_package_ready`

Decision: **BLOCKED**

## MVP 18b follow-up

MVP 18b privately classified the worker's all-environments database entry as
production and left it unchanged, isolated the platform Preview consumer,
completed a second staging password reset after the first replacement was
exposed, and stored the replacement as a non-revealable Preview-only Secret.
The original and first replacement passwords have provider control-plane
invalidation evidence; direct authentication with the current Secret remains
unverified because Vercel correctly refused to export it.

MVP 18b also prepared and fully validated a two-file, data-empty compatibility
package and deployed committed revision `5d22f4b` to a protected staging-only
Preview with the Astro gate disabled. `SUPERADMIN_EMAILS` is present at All
Environments scope, correcting this report's earlier absence statement. Hosted
SQL application and real authenticated application verification remain blocked
pending separate approval/user session. See
`docs/product/gnr8-platform-mvp-18b-staging-isolation-and-compatibility-repair.md`.

The original MVP 18a evidence is retained below for auditability.

## Decision summary

The exact staging project is resumed and reachable, and authorized read-only
catalog inspection succeeded. It is not ready for MVP 19 activation.

The highest-priority blockers are:

1. Credential rotation was deliberately stopped before mutation. The
   `gnr8-worker` Vercel project has one masked `DATABASE_URL` scoped to all
   environments, so its staging/production identity cannot be isolated from
   scope metadata. Rotating staging or changing that variable could disrupt
   production. The replacement credential also cannot be safely entered by the
   agent without putting it through browser/tool input. The original password
   is therefore **not confirmed invalidated**.
2. The hosted schema lacks `public.organizations`, `public.agencies`,
   `public.sites`, and
   `public.gnr8_runtime_site_versions.ownership_site_id`. These are mandatory
   prerequisites for the candidate migration. The older ownership-foundation
   migration cannot simply be applied as-is because it assumes that
   `public.organizations` already exists, while catalog evidence proves it does
   not.
3. Hosted `pgcrypto` is installed in `extensions`, not `public`. The required
   `extensions.digest(bytea,text)` exists, but
   `public.digest(bytea,text)` does not. The reviewed candidate migration calls
   `public.digest`, so its locally validated bytes are incompatible with this
   target.
4. The latest retained Vercel Preview deployment is revision
   `20eb571262332c85bfb1f74538209653305abeaf`, not the repository revision that
   contains MVP 14–17. It is protected by Vercel SSO and cannot verify the real
   superadmin flow or Astro surface.

Candidate objects and a Supabase migration-history relation are absent. The
candidate migration is classified **absent**, not failed. RPC, RLS,
SECURITY DEFINER, grant, and PostgREST checks are pending a future compatible
migration application; their absence is not reported as a failed security
check.

No credential, configuration, schema, data, product, deployment, feature gate,
or production state changed. This is a synthetic internal-pilot readiness
assessment, not production publishing readiness.

## Exact target and reachability

| Check | Sanitized evidence | Classification |
| --- | --- | --- |
| Supabase project | `GNR8-STAGING`, ref `dpkdxllcxnlytgjbnmvp` | pass |
| Project URL | `https://dpkdxllcxnlytgjbnmvp.supabase.co` | pass |
| Region / engine | `eu-central-2`; PostgreSQL 17, platform version `17.6.1.084` | pass |
| Supabase control-plane state | CLI reported `ACTIVE_HEALTHY`; dashboard overview reported `Unhealthy` during the same resumed-session inspection | unverified health convergence |
| HTTPS service reachability | Host resolved and TLS succeeded; unauthenticated Auth health request returned `401` | pass for reachability only |
| Database catalog reachability | Authorized Supabase SQL Editor ran bounded read-only transactions against database `postgres` | pass |
| Password authentication | Not retested because rotation and staged consumer updates were stopped | pending |
| Production | Not inspected or substituted | scope preserved |

The HTTPS result is not database authentication evidence. SQL Editor catalog
access proves an authorized control-plane database path, not that an updated
application `DATABASE_URL` works.

## Repository, migration, and deployment provenance

| Check | Evidence | Classification |
| --- | --- | --- |
| Repository revision | `5d22f4bb18e70ae3144fd0a749544d522dbacffa` on `main` | pass |
| Candidate migration | `apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql` | pass |
| Candidate migration SHA-256 | `c3aaafe800b9a4d2b1f73b1eba2e5d3002a6b3b7f25e0c7ca1b4f7b0cc6e2154` | pass; matches MVP 13a |
| Ownership migration | `apps/platform/supabase/migrations/20260326090000_ownership_foundation.sql`; SHA-256 `00c9aa471a94512308b9768093cc3b1abe3ae55c04f68766f3356da6fdbf4af4` | blocker as-is on this schema |
| Vercel team/project | `Pasadena Generator` / `gnr8-platform` | pass |
| Exact retained Preview URL | `https://gnr8-platform-gfpjylc6z-pasadena-generators-projects.vercel.app` | pass |
| Preview revision | `20eb571262332c85bfb1f74538209653305abeaf`, branch `codex/single-site-mvp-cutline-release`, title `Record migration approval` | pass |
| Deployed Astro code | Preview revision is not an ancestor of current `HEAD`; the MVP 14–17 route, list, and repository files differ from that deployment | blocker |
| Preview application access | URL returned a Vercel SSO redirect; browser navigation was blocked by the protected deployment | unverified app/auth |

The retained Preview is the exact non-production deployment found; no
production URL was substituted. Any Vercel environment-variable update applies
only to a future deployment, not this retained deployment. A later, separately
authorized Preview deployment is required before changed secrets or current
Astro code can be claimed active.

## Credential rotation and staging consumers

| Consumer/store | Scope evidence | Status |
| --- | --- | --- |
| Supabase database password | Reset control available for exact staging project; one shared password affects every database connection | not rotated |
| `gnr8-platform` Vercel `DATABASE_URL` | One masked Preview-only entry, marked `Needs Attention`; a separate masked Production+Development entry exists | staging-isolatable but not updated |
| `gnr8-worker` Vercel `DATABASE_URL` | One masked entry scoped to All Environments | blocker: staging identity cannot be isolated from metadata |
| Local staging database entry | Present in a Git-tracked staging environment file | blocker: replacement secret must not be written to a tracked file |
| Shared Vercel variables | None shown for `gnr8-platform` | pass for inspected project |

The task's stop rule was applied: no password reset and no consumer update was
performed while a possible production consumer remained in an all-environment
scope. Secret values were not opened, copied, printed, logged, persisted in new
files, or included in evidence.

The secure remaining operator action is:

1. In Vercel, privately determine whether `gnr8-worker`'s all-environment
   database entry points to staging. Do not send its value in chat.
2. If it is staging, replace it with a Preview-only staging entry and a
   separately managed production entry. If it is production, leave it unchanged
   and create/update only a Preview-only staging entry if the worker actually
   needs staging.
3. Move the local staging database secret to an ignored local secret mechanism;
   do not place the replacement in the tracked environment file.
4. In the exact Supabase staging dashboard, generate and reset the database
   password, then update only the isolated staging consumers. Do not share the
   value in conversation.
5. Confirm direct database authentication using the updated staging
   configuration. Record only success/failure and project identity.
6. Treat Vercel variable updates as configuration for a future Preview
   deployment. Do not claim the retained deployment received them.

Only a completed Supabase reset is evidence that the original password was
invalidated. This report does not make that claim.

Provider guidance used for this boundary: Supabase documents password reset in
the project's Database settings and warns that consumers must be updated;
Vercel documents that environment-variable changes apply only to new
deployments and require redeployment. See
<https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB>
and
<https://vercel.com/docs/environment-variables/managing-environment-variables>.

## Hosted catalog preflight

All SQL inspection used `BEGIN TRANSACTION READ ONLY`, a five-second statement
timeout, and a one-second lock timeout where applicable. Queries were limited
to catalogs, roles, exact object names, and test-prefixed runtime identifiers.
No RPC was invoked.

| Area | Sanitized finding | Classification |
| --- | --- | --- |
| Server | Database `postgres`; PostgreSQL `17.6`; UTF-8; not in recovery | pass |
| Query identity | `current_user` and `session_user` were `postgres` | pass |
| `pgcrypto` | Version `1.3` in schema `extensions` | pass with incompatibility below |
| Digest signature | `extensions.digest(bytea,text)` exists; `public.digest(bytea,text)` absent | blocker |
| Hash built-in | `hashtextextended(text,bigint)` exists | pass |
| Runtime site prerequisite | `gnr8_runtime_sites.id text not null` | pass |
| Runtime version prerequisites | `id uuid not null`, `site_id text not null`; FK to runtime site with `ON DELETE CASCADE` | partial pass |
| Runtime ownership link | `ownership_site_id` absent | blocker |
| Ownership relations | `organizations`, `agencies`, and `sites` absent | blocker; resolves the MVP 18 history assumption |
| Existing owners | Both runtime relations owned by `postgres` | pass |
| Candidate migration history | `supabase_migrations.schema_migrations` absent | absent |
| Candidate collisions | All three candidate relations, four exact gateway RPC signatures, candidate-prefixed functions, indexes, and triggers absent | pass; migration classified absent |
| Runner authority | SQL Editor identity `postgres`; expected new objects would be owned by `postgres` | pass, subject to exact MVP 19 runner confirmation |
| Request roles | `anon` and `authenticated`: NOLOGIN, INHERIT, NOBYPASSRLS; `service_role`: NOLOGIN, INHERIT, BYPASSRLS | pass with expected Supabase service-role caveat |
| Runner role | `postgres`: LOGIN, INHERIT, BYPASSRLS, nonsuperuser; member/admin of request roles including `service_role` | pass for authority |
| Default privileges | Existing `postgres`/`supabase_admin` defaults grant public-schema objects to request roles | pending post-migration verification |
| Candidate security shape | Objects absent | pending migration, not failed |
| PostgREST exposure | Objects absent | pending migration, not failed |

The candidate migration explicitly revokes direct request-role privileges after
creation, but the hosted default ACLs make the post-migration grant audit
mandatory. `service_role` has hosted BYPASSRLS, unlike the focused local MVP 13a
fixture; forced RLS alone is therefore not the security boundary. Direct table
revokes and RPC-only exposure must be verified after migration.

## Synthetic target and ownership conclusion

Bounded queries found five runtime sites with the exact test prefix
`test_runtime_e2e_site` and ten linked runtime versions. Five identifier pairs
were inspected; no content, HTML, source, domain, or customer row was read.

These records are clearly synthetic at the runtime layer, but none can satisfy
the candidate resolver because the hosted database has no first-class ownership
relations or `ownership_site_id` column. They are candidates for later linkage,
not qualifying MVP 19 targets today.

Before candidate migration or registration, a separately reviewed prerequisite
change must establish:

1. the original `organizations` table and its required UUID identity;
2. compatible `agencies` and `sites` ownership relations and constraints;
3. the runtime-version `ownership_site_id` FK; and
4. one explicitly synthetic agency/organization/site chain linked to one of the
   existing test-prefixed runtime versions, with agency equality verified.

The existing ownership-foundation migration is not authorization or proof for
this work. It contains writes/backfills and assumes `organizations` exists, so
MVP 19 must not apply it blindly.

## Configuration and authenticated application checks

- The exact global gate
  `GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED` is absent from inspected Vercel
  project variables. It is therefore **disabled** and was left unchanged.
- `SUPERADMIN_EMAILS` is absent from the inspected `gnr8-platform` Vercel
  variables. A real allowlisted admin session was not available.
- The protected retained Preview could not be used for login, Workspace/list,
  candidate preview, denied-access, or security-header checks.
- Because the deployed revision predates MVP 14–17 and candidate objects are
  absent, a disabled or protected response would not prove storage integration.

## Revised MVP 19 authorization scope

MVP 19 is not ready to begin under the original activation-only scope. A user
approval must first name and authorize these staging-only operations:

1. complete the password reset and isolated staging-consumer updates described
   above, followed by direct authentication verification;
2. design and apply a reviewed prerequisite migration that creates the missing
   organizations/ownership foundation without using customer data and without
   silently replaying the incompatible historical migration;
3. correct and revalidate the candidate migration's digest schema dependency,
   producing a new exact revision and SHA-256;
4. link or create only the minimum synthetic ownership records for one existing
   test-prefixed runtime version;
5. deploy a reviewed descendant containing MVP 14–17 to Vercel Preview, with
   staging-only Supabase/auth configuration and the Astro gate still disabled;
6. apply the exact revalidated candidate migration using the trusted staging
   runner, then verify objects, ownership, forced RLS, direct revokes, gateway
   RPC grants/search paths, default-ACL effects, and PostgREST exposure;
7. use a durable operation journal, install/build only the allowlisted synthetic
   producer, register exactly one candidate, and reconcile any ambiguous result
   without regeneration;
8. prove persistence from a fresh process/request context before enabling the
   gate; and
9. only then enable the global gate and run real login -> Workspace/list ->
   exact preview, denied-access, and security-header checks.

Any prerequisite, ownership, migration, registration, deployment, auth, or
readback mismatch must stop further writes. Preserve immutable records and the
operation journal; keep or return the global gate to disabled. Data deletion
and schema/data rollback remain outside this scope.

Production, customer records/content, access-toggle RPCs, publishing, live
pointers, DNS, provider execution, billing, Airship, source capture, dry-run,
shadow publish, deletion, and rollback are not authorized.

## Checks not executed and scope statement

- Password rotation, secret updates, direct password authentication, and old
  credential invalidation were not executed because staging could not be
  isolated safely and browser/tool entry would expose the replacement.
- No migration, grant, schema-cache reload, SQL write, synthetic record,
  registration/access RPC, build, dependency install, deployment, or feature
  enablement ran.
- No application payload, HTML, source, customer data, credential value, or
  secret-bearing screenshot was captured.
- Product/configuration/data/provider changes: none.
- Files changed: this report and the MVP 18 status note only.
