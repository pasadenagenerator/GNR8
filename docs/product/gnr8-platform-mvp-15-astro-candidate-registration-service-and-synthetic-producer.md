# GNR8 Platform MVP 15 — Astro Candidate Registration Service And Synthetic Producer

Date: 2026-09-28

Status: `implementation_complete_injected_local_validation_only`

## Result

MVP 15 adds an explicitly invoked, server-only registration service and the
single approved producer `internal_synthetic_astro_build_export_bridge` version
`v1`. The producer accepts only the allowlisted
`northline_operations_v1` synthetic fixture and composes the existing workspace
preparation, build/export proof, export inspection, and bridge conversion
stages. The modules are unmounted and import-safe; construction and import do
not authenticate, allocate a Supabase client, build Astro, access storage, or
start a server.

The explicit platform composition reuses `requireSuperadminUserId`, the MVP 14
authoritative ownership resolver and Supabase RPC gateway, and the MVP 11
gateway-backed repository. Missing injected dependencies fail closed. No route,
page, feature flag, configuration, migration, access control, preview binding,
`RuntimeArtifact`, pointer, publish, provider, DNS, billing, source-capture,
customer-domain, rollback, dry-run, shadow-publish, Airship, or deployment flow
was added or changed.

## Operation ordering

1. Apply the existing superadmin authentication policy before reading retry
   state, resolving ownership, invoking the producer, or accessing the
   repository.
2. Validate the server-owned operation identity, named producer selection, and
   allowlisted synthetic input.
3. Resolve the exact runtime-version, runtime-site, first-class site,
   organization, and agency ownership chain.
4. Claim a process-local server-owned operation context before conversion. The
   context fixes candidate ID, candidate creation timestamp, authenticated
   actor, producer kind/version/ref, idempotency key, correlation ID, ownership,
   and synthetic input.
5. Invoke the producer's existing stages. Bridge output must be a fresh
   `caller_owned_in_memory` candidate.
6. Validate candidate identity, runtime ownership, provenance, supported
   compatibility/content, content hash, lifecycle, and the 2 MiB canonical
   record limit, then preserve the exact validated candidate in retry state.
7. Re-resolve ownership after producer work and require it to equal the initial
   authoritative scope. The registration RPC still performs its final locked,
   transactional ownership validation.
8. Call the repository's one atomic create operation and return only
   created/idempotent status plus operation/correlation identity and minimal
   candidate metadata.

Producer output never supplies first-class site, organization, or agency
authorization. Those values come only from the authoritative resolver and are
passed unchanged to repository registration.

## Retry, ambiguous writes, and cleanup

The retry store belongs to the registration service, not the producer. For an
uncertain repository response, the service reports `ambiguous_write` with the
stable correlation ID and does not claim failure, delete anything, allocate a
new identity, change timestamps, or rebuild content. Replaying the same
operation re-authenticates, re-resolves ownership, skips producer execution,
and submits the exact preserved candidate and registration intent. Repository
idempotency returns the database winner's original candidate and `storedAt`.

Reusing an operation identity with a different actor, site version, producer,
or synthetic input fails as `operation_context_conflict`. Ownership changes
before registration fail closed. The included retry store is process-local;
durable recovery after process loss requires a later authorized orchestration
task. In particular, this milestone does not claim that an operation context
survives a restart.

The existing build/export stage owns workspace/server cleanup and completes it
before the producer returns a candidate. Registration therefore cannot happen
until cleanup has succeeded. Producer or cleanup failure causes zero writes,
and no post-registration cleanup step can hide a confirmed registration
result.

## Validation

All tests use clearly labeled injected authentication, producer, ownership,
repository, transport, and build-stage stubs or the in-memory MVP 11 gateway.
They are not evidence of a real Astro installation/build, logged-in session,
hosted Supabase transport, or deployed registration write.

- New registration and producer suites: 25/25 checks passed, including explicit
  composition import safety.
- Combined v2 record/repository, MVP 14 gateway/resolver, build-export, bridge,
  authenticated-readback, and MVP 15 suites: 111/111 checks passed.
- Focused TypeScript no-emit validation passed from the platform TypeScript
  configuration with `next-env.d.ts` and the imported dependency graph.
- Coverage includes auth-first denial, unsupported producer/input, incomplete
  and mismatched ownership, invalid and oversized candidates, exact
  actor/producer/ownership propagation, ownership changes during production,
  changed-intent conflicts, concurrent operation isolation, cleanup on success
  and failure, and commit-then-timeout idempotent replay with original
  `storedAt` and no duplicate. The ambiguous-write test also traps access-toggle
  calls and verifies zero occurred; the service dependency contract exposes no
  route, binding, `RuntimeArtifact`, pointer, publish, or access-toggle method.

No Astro dependency installation, Astro build, application server, hosted auth
or database call, customer-data access, credential inspection, migration,
configuration change, route execution, or deployed write was performed.

## Changed files

- `apps/platform/gnr8/output-adapters/astro-production-candidate-registration-contract.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-registration-service.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-registration-composition.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-registration-service.test.ts`
- `apps/platform/gnr8/output-adapters/internal-synthetic-astro-candidate-producer.ts`
- `apps/platform/gnr8/output-adapters/internal-synthetic-astro-candidate-producer.test.ts`
- this report

## Product behavior and remaining boundary

Product behavior changed: no. Existing routes, previews, Airship/generation
flows, fallback selection, runtime artifacts, preview bindings, pointers,
access state, publish behavior, and deployed workflows remain unchanged.

Hosted PostgREST/RPC behavior, deployed schema/configuration, real
authentication, real producer execution, and durable retry recovery across
process restarts remain unverified and unauthorized.

The next bounded task is a default-off authenticated production-candidate
preview route, without feature enablement, producer execution, deployment, or
any default/latest preview binding.
