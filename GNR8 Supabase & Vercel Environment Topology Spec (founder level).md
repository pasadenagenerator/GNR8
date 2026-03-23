# GNR8 Supabase & Vercel Environment Topology Spec (founder level)

## 1. Purpose

This document defines the canonical environment topology for GNR8 V1 across:

- Supabase
- Vercel
- runtime verification
- preview/production separation

Its purpose is to prevent:

- environment confusion
- unsafe production verification
- accidental cross-environment data writes
- runtime cutover mistakes

This is an operational architecture document.

---

## 2. Core Principle

GNR8 must never use one database environment for all purposes.

V1 uses a strict two-cloud-environment model:

- Production
- Staging

Local database runtime is intentionally out of scope for the current GNR8 operating model.

This means:

- production is for real live state
- staging is for verification, migration testing, runtime validation, and preview-backed development

---

## 3. Canonical Environment Model

### 3.1 Production

Production is the live customer-facing environment.

It is the source of truth for:

- live sites
- live canonical model state
- live published SiteVersions
- live public runtime
- live billing-adjacent integrations

Production must be treated as protected runtime state.

### 3.2 Staging

Staging is the non-production cloud environment.

It exists for:

- runtime verification
- migration factory verification
- preview deploy validation
- artifact coverage audits
- cutover rehearsals
- controlled publish/rollback testing

Staging must be structurally similar to production, but operationally disposable.

---

## 4. Vercel Environment Mapping

GNR8 V1 uses this Vercel environment mapping:

### Production Environment
Vercel Production → Supabase Production

### Preview Environment
Vercel Preview → Supabase Staging

This is the canonical mapping.

No Preview deployment should ever point to production Supabase.

No Production deployment should ever point to staging Supabase.

---

## 5. Required Supabase Environment Variables

The minimum required environment variables for GNR8 are:

- DATABASE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

These must always point to the same environment as a coherent set.

Mixed sets are forbidden.

Example of forbidden configuration:

- DATABASE_URL = staging
- NEXT_PUBLIC_SUPABASE_URL = production

This creates undefined and dangerous runtime behavior.

---

## 6. Runtime-Specific Environment Variables

GNR8 runtime also uses environment-specific runtime controls.

### Required in staging for verification workflows
- GNR8_PUBLIC_RUNTIME_MODE
- GNR8_RUNTIME_E2E_RUN_ID (when required for explicit test runs)
- GNR8_RUNTIME_TEST_SITE_ID_PREFIX (for isolated runtime test execution)

### Recommended staging value
- GNR8_PUBLIC_RUNTIME_MODE=artifact-only

### Recommended production value during transition
- GNR8_PUBLIC_RUNTIME_MODE=artifact-with-builder-fallback

This lets GNR8 enforce artifact authority in staging while keeping a controlled safety hatch in production during cutover.

---

## 7. DATABASE_URL Rule

DATABASE_URL must use the correct Supabase connection type for the actual runtime/tooling context.

### Recommended for GNR8 Node/server runtime and verification flows
Use Supabase Session Pooler connection strings.

This must be copied exactly from Supabase dashboard, not manually reconstructed.

The expected shape is:

postgresql://postgres.<project_ref>:<db_password>@<pooler-host>:5432/postgres

Rules:
- do not manually mix direct-connection host with pooler user
- do not manually mix transaction pooler and session pooler parts
- do not assume the username is always plain postgres

Always copy the full connection string from Supabase.

---

## 8. Password Handling Rule

Database password is an operational secret.

If a database connection string or password is ever exposed in chat, logs, screenshots, commits, or unsafe tooling output:

- rotate/reset the database password immediately
- update all relevant environment stores
- treat old credentials as compromised

Affected stores may include:
- local .env files
- Vercel Production env vars
- Vercel Preview env vars
- CI secrets
- documentation snippets

---

## 9. Canonical File Strategy in Repo

For the current GNR8 operating model, the recommended file structure is:

### apps/platform/.env.staging
Contains staging environment values only.

### apps/platform/.env.production
Contains production environment values only.

These files must never be confused or sourced interchangeably.

Example staging intent:

DATABASE_URL="..."
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
GNR8_PUBLIC_RUNTIME_MODE="artifact-only"
GNR8_RUNTIME_E2E_RUN_ID="staging-runtime-001"
GNR8_RUNTIME_TEST_SITE_ID_PREFIX="test_runtime_e2e_site"

Example production intent:

DATABASE_URL="..."
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
GNR8_PUBLIC_RUNTIME_MODE="artifact-with-builder-fallback"

---

## 10. Vercel Configuration Rule

In Vercel:

### Production environment variables
must point only to production Supabase values.

### Preview environment variables
must point only to staging Supabase values.

After any environment variable change:

- redeploy the affected Vercel environment
- do not assume existing deploys pick up new values

---

## 11. Safe Runtime Verification Policy

Runtime verification must follow this order:

1. staging first
2. production only after staging proof
3. production verification should be minimal and deliberate

The first execution of:
- runtime happy path tests
- artifact coverage audits
- publish safety verification
- cutover rehearsals

must not happen against production first.

---

## 12. Staging Usage Policy

Staging is the required environment for:

- Phase 5 runtime verification
- Phase 5A/5B happy-path tests
- artifact coverage audit
- builder cutover rehearsals
- artifact-only serving validation
- fallback-risk analysis

Staging is not optional operationally.
It is the safety layer for GNR8 convergence.

---

## 13. Production Usage Policy

Production is allowed only for:

- real live serving
- post-staging validated cutovers
- narrow smoke verification when absolutely necessary
- operational confirmation after controlled rollout

Production must not be used as the first diagnostic environment for new runtime logic.

---

## 14. Environment Integrity Rules

The following are forbidden:

- preview deploys hitting production Supabase
- production deploys hitting staging Supabase
- mixed environment variable sets
- manual database testing against production without explicit reason
- first-run schema bootstrapping against production where staging was not used first

These are architecture hygiene violations, not small operational mistakes.

---

## 15. Minimal Verification Commands

### Staging runtime happy path
Run from apps/platform with staging env loaded.

### Staging artifact coverage audit
Run from apps/platform with staging env loaded.

### Production audit
Only after explicit approval, and only if needed.

This document does not standardize exact shell syntax permanently, but all commands must respect the environment topology defined here.

---

## 16. Future Evolution

Possible future evolution:
- dedicated CI verification environment
- Supabase branch-based ephemeral environments
- stricter secret separation
- automated environment health checks

These are optional future improvements.

They do not replace the V1 rule:

Preview = Staging  
Production = Production

---

## 17. Founder Directive

Environment topology is part of runtime architecture.

If environments are sloppy:
- runtime verification becomes meaningless
- cutovers become dangerous
- production trust collapses

If environments are clean:
- staging becomes a safe proving ground
- production becomes stable
- cutovers become deliberate
- GNR8 can evolve without chaos