# GNR8 Platform MVP 19 — Staging Astro End-to-End Activation

Date: 2026-09-29

Status: `staging_synthetic_activation_complete`

Decision: **READY FOR CONTROLLED INTERNAL PILOT**

## Decision summary

The approved ownership-prerequisite and Astro candidate migrations were applied
unchanged, in order, to the exact `GNR8-STAGING` Supabase project. Essential
catalog, ownership, role, forced-RLS, grant, SECURITY DEFINER, search-path, and
PostgREST checks passed. One test-prefixed runtime site/version was given a
minimal synthetic ownership chain; no customer ownership was changed.

The checked-in `northline_operations_v1` producer built and exported one
synthetic Astro candidate. The existing registration service, repository, and
Supabase gateway registered it under a stable operation identity. Hosted
reconciliation found exactly one candidate, enabled access-state row, and
registration event. A separate fresh process then read the same stored record
and hashes through the production repository/gateway composition after the
producer workspace was no longer involved.

The Astro gate is enabled only for Vercel Preview. A clean archive of committed
revision `5d22f4bb18e70ae3144fd0a749544d522dbacffa` built successfully as a
protected Preview. A real staging Supabase user on the configured superadmin
allowlist completed login, Workspace navigation, the one-candidate list, and
the exact stored candidate preview. Unauthenticated and wrong-candidate paths
were denied. The working replacement Preview and stored candidate are retained.

This establishes a controlled, synthetic, internal staging pilot. It is not
production publishing readiness, and no customer domain, DNS, provider,
billing, publish, live-pointer, or production-worker change occurred.

## Exact target and migrations

| Item | Sanitized evidence | Result |
| --- | --- | --- |
| Supabase project | `GNR8-STAGING`, ref `dpkdxllcxnlytgjbnmvp`, database `postgres` | pass |
| Project URL | `https://dpkdxllcxnlytgjbnmvp.supabase.co` | pass |
| Prerequisite migration | `20260928110000_astro_candidate_hosted_prerequisites.sql`, SHA-256 `7e265905dfcb8df3ef7a15a606ea50e3bc89f64e36cd3b16d9cb478acd810c0a` | applied |
| Candidate migration | `20260928120000_astro_candidate_registry.sql`, SHA-256 `d6e28edaea03fa6c248065b1100c860b65d0361cc1a0ac43a953e90c522070c3` | applied |
| Application order | prerequisite, intermediate checks, candidate, final checks | pass |
| SQL bytes | Re-hashed immediately before application; matched the approved values | pass |

The prerequisite application created the canonical ownership foundation and
nullable runtime ownership link without seeding or backfilling data. The
candidate application created the three immutable/controlled candidate
relations and four gateway RPCs. Both files owned their transactions. A first
SQL-editor submission of the prerequisite file failed during editor parsing
before its transaction began; the editor was cleared and the exact file was
submitted successfully. No partial application was claimed or repaired.

## Essential hosted postchecks

- PostgreSQL 17 and UTF-8 remained in use; `pgcrypto` and `digest` remained in
  the observed `extensions` schema.
- Canonical agencies, organizations, and sites tables, enum types, constraints,
  triggers, ownership link, grants, and RLS state matched the approved package.
- All three candidate tables have forced RLS. Their ownership FKs, restrictive
  direct grants, immutable mutation controls, and supporting indexes matched.
- All four exact gateway RPC signatures exist, are owned by the expected
  privileged owner, use `SECURITY DEFINER` with `search_path=pg_catalog`, and
  are executable by `service_role` but not by `anon` or `authenticated`.
- The functions were available through PostgREST with the service-role client.
  No registration or access-mutation RPC was used as a read-only probe.

## Synthetic ownership and candidate

| Identity | Value |
| --- | --- |
| Runtime site | `test_runtime_e2e_site_0a79046b4425bc2ec85a` |
| Site version | `2bee2d61-b643-4f73-bdaa-1bddd9c8b450` |
| Agency | `eb2dc9df-9c8f-4b95-8fc7-bf24f9e9418a` |
| Organization | `81bb10c1-a801-47cd-90b2-b2ed68439525` |
| Ownership site | `23f060b9-1b80-46cc-ac9d-f7a0dff05b34` |
| Registration operation | `c88ebd41-80f6-4101-b65c-d9583cf67d21` |
| Candidate | `astro_candidate_c88ebd4180f64101b65cd9583cf67d21` |

The ownership rows are explicitly synthetic and contain only the minimum
relationships required by the canonical model. The existing runtime version
was linked to that ownership site. No organization, agency, site, runtime
version, or candidate belonging to a customer was reused or reassigned.

The producer was `northline_operations_v1`, recorded as
`internal_synthetic_astro_build_export_bridge` version `v1`. Registration
returned `created` at `2026-09-29T09:20:45.080Z` with:

- content SHA-256
  `168e4baaeb6f060531ce0503603ebc983c384559aa15e4dafd4de3cd05a92df7`;
- storage SHA-256
  `2255db638fb4cc70ff096cede56b91438b25a43672571bfd8f1e8e4492ea3b96`.

The operation ID, idempotency material, and validated candidate record were
written to a task-owned local retry context before the hosted registration
call. Any ambiguous response would therefore have been reconciled using the
same intent instead of rebuilding or generating a second candidate. The call
returned a definite result, and the retry context was removed only after
hosted reconciliation and fresh-process readback.

The final bounded database aggregate was `1/1/1/1/1/1`: one total candidate,
one exact candidate, one enabled state, one registration event, one complete
ownership chain, and one runtime-version link. The independent readback
returned the exact candidate, both hashes above, a list count of one, and no
next cursor.

## Retained protected Preview

| Field | Evidence | Result |
| --- | --- | --- |
| Source revision | Clean `git archive` of `5d22f4bb18e70ae3144fd0a749544d522dbacffa` | pass |
| Deployment ID | `dpl_8Y89j2GzNhwgZMsayL2pZUPfdF2m` | pass |
| Preview URL | `https://gnr8-platform-fsdou39ss-pasadena-generators-projects.vercel.app` | pass |
| Vercel target/state | Preview / Ready | pass |
| Build | Cold-cache production build completed successfully in 4m07s; existing warnings only | pass |
| Production alias | none | pass |
| Deployment protection | Vercel Authentication retained | pass |
| Supabase linkage | Preview configuration privately matched `dpkdxllcxnlytgjbnmvp` | pass |
| Astro gate | `GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED=1`, Preview scope only | enabled |

The deployment was uploaded from a clean archive, so Vercel has no native Git
revision field for it. Revision provenance is the locally verified archive
input, the successful build, and deployed-route evidence; it is not presented
as provider Git metadata.

An earlier successful Preview used for initial authenticated testing was
removed after a URL-scoped deployment-protection credential appeared in
diagnostic tool output. The credential is not reproduced here. Diagnostic work
stopped immediately, a clean replacement was created under the user's explicit
approval, the affected deployment was deleted, and its ID subsequently
returned not found. The application session credential was not exposed.

## End-to-end validation

| Check | Result |
| --- | --- |
| Real Supabase password login, token verification, and superadmin allowlist enforcement | pass |
| Authenticated `/gnr8/command-center` on the retained replacement | pass |
| Exact synthetic Workspace and `Astro Candidates` link | pass |
| Candidate list | exactly one item; enabled and supported; expected producer, versions, and hash prefixes |
| Exact candidate preview | HTTP success in authenticated UI; expected `Northline Operations Proof` content rendered |
| Fresh-process stored readback | pass; exact identity and hashes, independent of removed producer workspace |
| Unauthenticated exact-preview request | denied with `401` |
| Denied-response headers | `no-store`, restrictive CSP, `nosniff`, `no-referrer`, restrictive permissions policy, same-origin CORP |
| Incorrect syntactically valid candidate | denied with `Preview not found.`; no fallback candidate selected |
| Existing preview bindings | unchanged |
| Focused TypeScript checks for the activation/readback harness | pass |
| Vercel application build | pass |
| Broad product suite | not run; the task required focused integration validation |

The working authenticated links are:

- Candidate list:
  `https://gnr8-platform-fsdou39ss-pasadena-generators-projects.vercel.app/gnr8/admin/astro-candidates/2bee2d61-b643-4f73-bdaa-1bddd9c8b450`
- Exact candidate preview:
  `https://gnr8-platform-fsdou39ss-pasadena-generators-projects.vercel.app/api/gnr8/admin/astro-candidates/2bee2d61-b643-4f73-bdaa-1bddd9c8b450/astro_candidate_c88ebd4180f64101b65cd9583cf67d21/preview?path=%2F`

Both remain behind Vercel deployment protection and the real application
superadmin session. The exact preview was left open in the authorized browser.

## Changes and boundaries

Hosted staging changes made:

- applied the two approved SQL migrations;
- created the minimum synthetic agency/organization/site ownership chain and
  linked the synthetic runtime version;
- registered one immutable synthetic candidate and its registration/access
  records; and
- enabled the global Astro gate only in Vercel Preview configuration.

Deployment changes made:

- retained one protected Preview deployment of the verified revision; and
- deleted only the earlier compromised Preview deployment after explicit user
  approval.

Repository product-code changes made: none. This report is the only MVP 19
repository change. The existing MVP 18b migration and harness changes remain
preserved and were not rewritten during activation. No production database,
worker configuration, production alias, customer data, customer preview,
publishing state, live pointer, DNS, domain, billing, provider execution,
Airship state, or rollback state was changed.

## Next milestone: publishing-workflow connection

The observed missing integration is a promotion/materialization boundary, not
another preview proof. The Astro registry stores an
`AstroProductionCandidateRecord` in its dedicated candidate tables and can
render it only through the isolated admin route. The existing website publish
activation path instead calls `getArtifactById` and validates a canonical
runtime artifact, publish stage/governance, approvals, target readiness, and an
active-pointer switch. No checked-in adapter converts an approved Astro
candidate into that canonical runtime-artifact record or hands its resulting
artifact ID into the existing publish workflow.

The next milestone should therefore add an explicitly authorized promotion
operation that reads one approved, enabled Astro candidate; revalidates its
ownership and hashes; materializes its export into the existing governed
runtime-artifact model with lineage back to the candidate; and then hands that
artifact to the existing approval/publish activation path. It must preserve the
current publish gates and must not make the admin preview route or candidate ID
itself a live pointer.

## Remaining limitations

- The pilot account and global gate are suitable only for this internal
  synthetic Preview; per-candidate operator disable/re-enable UI remains
  deferred.
- The synthetic runtime site's unrelated command-center enrichment reports
  missing optional tables/evidence; this did not affect candidate storage,
  listing, authentication, or preview rendering.
- Existing build warnings were not expanded into unrelated cleanup work.
- Production publishing behavior remains untested and unauthorized by this
  milestone.
