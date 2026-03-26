# Stripe / Billing / Customer Audit (Repo Truth)

## 1. Executive Summary

Current implementation is **partially operational** for org-level subscription state sync, but **not operational as a full billing platform**.

- Approximate implementation status for Stripe/billing/customer domain: **~60% real for backend sync + entitlement gating, ~40% missing for full lifecycle**.
- What is real today:
  - Stripe webhook verification and event ingestion exists and is live-path code.
  - Subscription state is persisted to `public.subscriptions`.
  - Entitlements are synced from plan and enforced in org/project APIs.
  - Idempotency exists via `public.stripe_events`.
- What is partial/scaffold:
  - Plan mapping is partially hardcoded/fallback-driven.
  - Trial + entitlement model is functional but coarse.
  - No repository-local SQL migration source of truth for core billing tables.
- What is missing:
  - No checkout/session creation flow.
  - No billing portal flow.
  - No invoice/payment-intent lifecycle handling.
  - No customer provisioning flow (`customers.create`) in app code.
  - No account hierarchy (agency -> client account) model.
  - Runtime/site layer is not bound to billing ownership entities.

**Single biggest missing piece:** a **first-class ownership hierarchy and billing binding model** (agency/client/site) that connects runtime sites to billable/account entities.

---

## 2. Stripe Integration Inventory

### 2.1 Dependencies and packages

- `apps/platform/package.json`
  - `stripe: ^18.3.0`
  - Maturity: **REAL**
- repository root `package.json`
  - `stripe: ^18.5.0`
  - Maturity: **REAL** (dependency present in monorepo root)
- `packages/core/package.json`, `packages/data/package.json`
  - No direct Stripe SDK dependency
  - Maturity: **EXPECTED / N-A**

### 2.2 Stripe webhook endpoint

- `apps/platform/app/api/stripe/webhook/route.ts`
  - Uses `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Verifies signature with `stripe.webhooks.constructEvent`.
  - Supports event types:
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
  - Fallback behavior: if `subscription.metadata.org_id` missing, tries to read `customer.metadata.org_id` and writes it back to subscription metadata.
  - Calls `BillingService.handleStripeWebhook(...)`.
  - Maturity: **REAL**

### 2.3 Stripe SDK operations currently used

- `stripe.webhooks.constructEvent(...)`
- `stripe.customers.retrieve(...)`
- `stripe.subscriptions.update(...)` (metadata patch only)
- Maturity: **REAL**

### 2.4 Missing Stripe operations

No in-repo implementation found for:

- `checkout.sessions.create`
- `billing portal` session creation
- `customers.create`
- `subscriptions.create` (direct)
- invoice event handling (`invoice.*`)
- payment intent / charge lifecycle handling

Maturity: **MISSING**

### 2.5 Environment variables observed

Found in active code:

- `STRIPE_SECRET_KEY` (used)
- `STRIPE_WEBHOOK_SECRET` (used)

Not found in active code:

- `STRIPE_PRICE_*` style env vars

Other auth-related vars used by surrounding auth path:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPERADMIN_EMAILS`

### 2.6 Stripe ID usage in persistence

Found in subscription snapshots and repositories:

- `stripe_customer_id`
- `stripe_subscription_id`
- `current_period_end`
- `plan_key`

Primary files:

- `packages/data/src/repositories/postgres-subscriptions-repository.ts`
- `packages/data/src/repositories/postgres-superadmin-billing-repository.ts`
- `packages/data/src/repositories/postgres-org-stats-repository.ts`

Maturity: **REAL**

---

## 3. Customer / Organization Model Inventory

### 3.1 Core ownership entities

- Entity: `Organization`
  - Fields: `id`, `name`, `slug`, `createdAt`, `deletedAt`
  - Files:
    - `packages/core/src/modules/organization/types.ts`
    - `packages/data/src/repositories/postgres-organization-repository.ts`
  - Live usage: org create API + superadmin APIs
  - Tenancy shape: **Org-based multi-tenant (flat orgs)**
  - Maturity: **REAL**

- Entity: `Membership`
  - Fields: `id`, `orgId`, `userId`, `role (owner|admin|member)`, timestamps
  - Files:
    - `packages/core/src/modules/organization/types.ts`
    - `packages/data/src/repositories/postgres-membership-repository.ts`
    - `packages/data/src/repositories/postgres-superadmin-users-repository.ts`
  - Live usage: role checks in project/org activity/stats flows
  - Tenancy shape: **Org membership RBAC**
  - Maturity: **REAL**

- Entity: `Project`
  - Fields: `id`, `orgId`, `name`, `slug`, `createdAt`, `deletedAt`
  - Files:
    - `packages/core/src/modules/project/types.ts`
    - `packages/data/src/repositories/postgres-project-repository.ts`
  - Live usage: CRUD + audit + entitlement-limited project count
  - Tenancy shape: **Child of org (not a client-account model)**
  - Maturity: **REAL**

### 3.2 User/profile linkage

- Organization creation requires actor profile existence in `public.profiles`.
- Membership/user lookup joins `auth.users` for superadmin views.
- Files:
  - `packages/data/src/repositories/postgres-organization-repository.ts`
  - `packages/data/src/repositories/postgres-superadmin-users-repository.ts`
  - `apps/platform/src/auth/require-actor-user-id.ts`
- Maturity: **REAL**

### 3.3 Stripe customer linkage to customer/org model

- Stripe customer identity is stored only as `subscriptions.stripe_customer_id`.
- There is **no dedicated first-class Customer domain entity** (no `customers` table/repository/module found in this repo).
- Mapping from Stripe to org relies on metadata (`org_id`) + existing subscription lookup fallback.
- Maturity: **PARTIAL**

### 3.4 Tenancy readiness assessment

- Single-tenant: **No** (supports multiple orgs).
- Org-based multi-tenant: **Yes**.
- Hierarchical multi-tenant (agency -> client account): **No evidence**.

---

## 4. Subscription / Billing Model Inventory

### 4.1 Subscription persistence model

- Persistence operations implemented:
  - upsert by `stripe_subscription_id`
  - lookup by `stripe_subscription_id`
  - cancel status update helper exists (`markSubscriptionCanceled`) but is not actively used by `BillingService`
- Files:
  - `packages/data/src/repositories/postgres-subscriptions-repository.ts`
  - `packages/data/src/repositories/postgres-billing-repository.ts`
  - `packages/core/src/modules/billing/service.ts`

Classification:

- Is subscription state persisted? **Yes** -> **OPERATIONAL**
- Is it connected to org/account/site? **Connected to org only** -> **PARTIAL**
- Is it usable for real gating? **Yes at org/project gate level** -> **PARTIAL to OPERATIONAL** (not full billing lifecycle)

### 4.2 Plan and status model

- Stored/handled fields:
  - `status`
  - `plan_key`
  - `current_period_end`
  - `stripe_customer_id`
  - `stripe_subscription_id`
- Plan resolution:
  - metadata override
  - Stripe price `lookup_key`
  - hardcoded price-id fallback map
  - default fallback to `starter`
- File: `packages/core/src/modules/billing/service.ts`
- Classification: **PARTIAL** (works, but fallback-heavy and not complete lifecycle)

### 4.3 Entitlement linkage

- BillingService syncs entitlements from plan via `EntitlementService.syncFromPlan(...)`.
- Entitlements stored and toggled in `public.entitlements`, keyed by org and Stripe subscription id.
- Trial fallback exists via `organizations.trial_started_at` / `trial_ends_at`.
- Files:
  - `packages/core/src/modules/entitlement/service.ts`
  - `packages/core/src/modules/entitlement/plan-map.ts`
  - `packages/data/src/repositories/postgres-entitlement-repository.ts`
- Classification: **OPERATIONAL** for coarse feature gating.

### 4.4 Usage metering hooks

- No usage metering pipeline/hooks found.
- Classification: **MISSING**

---

## 5. Webhook / Sync Flow Inventory

### 5.1 Endpoint + verification

- Endpoint: `POST /api/stripe/webhook`
- File: `apps/platform/app/api/stripe/webhook/route.ts`
- Signature verification: implemented with raw body + `stripe-signature`.
- Maturity: **REAL**

### 5.2 Supported events

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Maturity: **PARTIAL** (subscription-focused only)

### 5.3 Idempotency

- `public.stripe_events` used with unique conflict handling.
- File: `packages/data/src/repositories/postgres-stripe-events-repository.ts`
- Behavior: insert-once guard via `on conflict do nothing`.
- Maturity: **REAL**

### 5.4 Stripe -> DB update path

- Verified flow:
  - webhook route -> `BillingService.handleStripeWebhook`
  - transaction boundary in `PostgresBillingRepository`
  - subscription upsert in `public.subscriptions`
  - entitlement replacement/deactivation in `public.entitlements`
- Files:
  - `apps/platform/app/api/stripe/webhook/route.ts`
  - `packages/core/src/modules/billing/service.ts`
  - `packages/data/src/repositories/postgres-billing-repository.ts`
  - `packages/data/src/repositories/postgres-subscriptions-repository.ts`
  - `packages/data/src/repositories/postgres-entitlement-repository.ts`
- Maturity: **REAL**

### 5.5 Missing webhook sync pieces

- No processing for invoice/payment/charge events.
- No explicit dead-letter/retry workflow in app layer.
- No observable audit trail tied to Stripe event payload snapshots.
- Requires `org_id` mapping (metadata or existing row), otherwise fails with DomainError.
- Classification: **PARTIAL**

---

## 6. Ownership Hierarchy Readiness

Target hierarchy:

Platform
└ Agency
  └ Client Account
    └ Site
      └ Site Versions / Runtime / Subscription

### A. One-agency-now support

- **Partial**: one agency can be modeled as one `organization` with users/projects.
- But no explicit agency domain behavior beyond entitlement key `agency.mode` in plan map.

### B. Future multi-agency support

- **Partial**: multiple organizations already supported.
- Missing parent/child org structures and agency-level aggregation controls.

### C. Client account support

- **Not supported as first-class entity**.
- Closest object is `project`, but project is not modeled as client account (no client-level billing or membership boundary).

### D. Site ownership binding

- **Weak / missing for platform-wide consistency**.
- Runtime site tables (`gnr8_runtime_*`) are site-id based and do not show org/project/account FK linkage.
- `gnr8_pages` includes nullable `org_id`, but runtime store path is separate and not clearly bound to org ownership.

### E. Subscription binding target (current)

- Current binding is effectively **org-level** (`public.subscriptions.org_id`).
- No client-level subscription model.
- No site-level subscription model.
- Mixed binding: **Not implemented**.

Conclusion: current ownership model is **too flat** for agency -> client -> site billing operations.

---

## 7. Current Gaps for 200-Site Agency Operation

Priority-ordered gaps:

1. **Missing parent/child account hierarchy**
- No native agency -> client account model.

2. **Missing site-to-billing ownership binding**
- Runtime site records are not tightly bound to org/client billing entities.

3. **Subscription lifecycle is narrow**
- Only subscription events handled; no invoices/payments/failures/dunning.

4. **No customer lifecycle orchestration**
- No explicit customer creation/provisioning flow in application code.

5. **Entitlement granularity is coarse**
- Org-wide entitlement toggling; no per-client/per-site entitlement segmentation.

6. **Missing agency-scoped operational reporting**
- Stats are org-centric, not agency portfolio/client layered.

7. **Missing tenant/customer assignment controls**
- No formal assignment model for which agency/client owns which site at runtime level.

8. **Missing billing admin operations**
- Superadmin snapshot views exist, but no billing portal/checkout/admin remediation paths.

9. **Schema governance visibility gap**
- Core billing table migrations are not present in this workspace as authoritative SQL history.

---

## 8. Reuse vs Rebuild Assessment

- Stripe integration: **REUSE_WITH_HARDENING**
  - Keep webhook foundation; add missing lifecycle events and operational controls.

- Org model: **REUSE_WITH_EXTENSION**
  - Organizations/memberships/projects are a solid base, but need hierarchy extension.

- Subscription persistence: **REUSE_WITH_HARDENING**
  - Existing `subscriptions` model is useful; extend ownership binding and lifecycle completeness.

- Entitlement model: **REUSE_WITH_EXTENSION**
  - Existing entitlements work for coarse gating; extend to finer scopes and stronger provenance.

- Webhook sync: **REUSE_WITH_HARDENING**
  - Idempotent + transactional flow is good; event coverage and failure handling need expansion.

- Billing-to-governance bridge: **REUSE_WITH_EXTENSION**
  - Current org/project gating exists; needs binding into runtime site governance.

- Agency/client ownership: **REBUILD_REQUIRED**
  - No first-class agency/client account hierarchy currently exists.

---

## 9. Recommended Next Architecture Step

**Ownership Hierarchy Extension** (single next step).

Reason from audit evidence:

- Billing state currently binds to org, while runtime/site domain is not consistently bound to org/client ownership.
- Without first defining agency/client/site ownership structure, Stripe lifecycle completion cannot be safely mapped for 200-site operations.
- This is the highest-leverage prerequisite for all subsequent billing hardening.

---

## 10. Appendix: exact searches / files inspected

### 10.1 Exact search commands executed

```bash
rg --files | rg 'package.json$'

rg -n "stripe|subscription|billing|customer|organization|membership|entitlement|current_period_end|stripe_customer|stripe_subscription" apps/platform

rg -n "STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|STRIPE_PRICE|stripe" -g"*.env*" -g"*.ts" -g"*.tsx" -g"*.js" -g"*.md"

rg --files apps/platform packages/core packages/data | rg '(billing|subscription|entitlement|organization|membership|org|customer|stripe|auth|profile)'

rg --files | rg '\.sql$'

rg -n "import Stripe from 'stripe'|new Stripe\(|stripe\." apps/platform packages/core packages/data --glob '!**/*.d.ts' --glob '!**/*.js' --glob '!**/tsconfig.tsbuildinfo'

rg -n "STRIPE_[A-Z0-9_]+|SUPERADMIN_EMAILS|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY" apps/platform packages/core packages/data --glob '!**/*.d.ts' --glob '!**/*.js' --glob '!**/tsconfig.tsbuildinfo'

rg -n "markSubscriptionCanceled|billing portal|checkout|checkout\.sessions|customer\.create|subscriptions\.create|invoices|payment_intent|portal" apps/platform packages/core packages/data

rg -n "public\.subscriptions|public\.entitlements|public\.organizations|public\.memberships|public\.stripe_events|trial_started_at|trial_ends_at|projects" apps/platform packages/core packages/data --glob '!**/*.d.ts' --glob '!**/*.js' --glob '!**/tsconfig.tsbuildinfo'

rg -n "create table if not exists public\.(gnr8_pages|gnr8_page_versions|gnr8_runtime_sites|gnr8_runtime_host_bindings|gnr8_runtime_pages|gnr8_runtime_site_versions|gnr8_runtime_page_versions|gnr8_runtime_artifacts|gnr8_runtime_active_pointers|gnr8_runtime_form_submissions)" apps/platform/gnr8 --glob '!**/*.d.ts'
```

### 10.2 Files inspected (primary)

- `package.json`
- `apps/platform/package.json`
- `packages/core/package.json`
- `packages/data/package.json`
- `apps/platform/app/api/stripe/webhook/route.ts`
- `apps/platform/src/di/core.ts`
- `apps/platform/app/api/organizations/route.ts`
- `apps/platform/app/api/superadmin/orgs/route.ts`
- `apps/platform/app/api/superadmin/orgs/[orgId]/route.ts`
- `apps/platform/app/api/superadmin/orgs/[orgId]/billing/route.ts`
- `apps/platform/app/api/superadmin/orgs/[orgId]/users/route.ts`
- `apps/platform/app/api/superadmin/orgs/[orgId]/trial/route.ts`
- `apps/platform/app/api/orgs/[orgId]/stats/route.ts`
- `apps/platform/app/api/orgs/[orgId]/projects/route.ts`
- `apps/platform/app/api/orgs/[orgId]/projects/deleted/route.ts`
- `apps/platform/app/api/orgs/[orgId]/projects/[projectId]/route.ts`
- `apps/platform/app/api/orgs/[orgId]/projects/[projectId]/restore/route.ts`
- `apps/platform/app/api/orgs/[orgId]/activity/route.ts`
- `apps/platform/src/auth/require-actor-user-id.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/src/auth/supabase-server.ts`
- `apps/platform/src/server/auth/require-authenticated-user-id.ts`
- `apps/platform/middleware.ts`
- `packages/core/src/modules/billing/service.ts`
- `packages/core/src/modules/billing/types.ts`
- `packages/core/src/modules/billing/repository.ts`
- `packages/core/src/modules/entitlement/service.ts`
- `packages/core/src/modules/entitlement/types.ts`
- `packages/core/src/modules/entitlement/plan-map.ts`
- `packages/core/src/modules/entitlement/repository.ts`
- `packages/core/src/modules/organization/service.ts`
- `packages/core/src/modules/organization/types.ts`
- `packages/core/src/modules/organization/repository.ts`
- `packages/core/src/modules/project/service.ts`
- `packages/core/src/modules/project/types.ts`
- `packages/core/src/modules/project/repository.ts`
- `packages/core/src/modules/org-stats/service.ts`
- `packages/core/src/modules/org-stats/types.ts`
- `packages/core/src/modules/superadmin-org/service.ts`
- `packages/core/src/modules/superadmin-billing/service.ts`
- `packages/core/src/modules/superadmin-billing/types.ts`
- `packages/core/src/modules/superadmin-users/service.ts`
- `packages/core/src/modules/superadmin-trial/service.ts`
- `packages/core/src/modules/authorization/service.ts`
- `packages/core/src/modules/authorization/types.ts`
- `packages/data/src/repositories/postgres-billing-repository.ts`
- `packages/data/src/repositories/postgres-subscriptions-repository.ts`
- `packages/data/src/repositories/postgres-stripe-events-repository.ts`
- `packages/data/src/repositories/postgres-entitlement-repository.ts`
- `packages/data/src/repositories/postgres-organization-repository.ts`
- `packages/data/src/repositories/postgres-membership-repository.ts`
- `packages/data/src/repositories/postgres-project-repository.ts`
- `packages/data/src/repositories/postgres-org-stats-repository.ts`
- `packages/data/src/repositories/postgres-superadmin-org-repository.ts`
- `packages/data/src/repositories/postgres-superadmin-billing-repository.ts`
- `packages/data/src/repositories/postgres-superadmin-users-repository.ts`
- `packages/data/src/repositories/postgres-superadmin-trial-repository.ts`
- `packages/data/src/db/pool.ts`
- `apps/platform/src/superadmin/db.ts`
- `apps/platform/gnr8/core/page-storage.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/chai-removal/db-schema-retirement-plan.md`

### 10.3 Package manifests inspected

- root `package.json`
- `apps/platform/package.json`
- `packages/core/package.json`
- `packages/data/package.json`

### 10.4 Relevant env var names found

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPERADMIN_EMAILS`

### 10.5 Limitations / unknowns

- No authoritative SQL migration set for `organizations/memberships/subscriptions/entitlements/stripe_events` is present in this workspace.
- Could not validate live DB constraints/indexes/RLS/triggers for billing tables from repo alone.
- Assessment is code-truth from repository implementation paths and references.
