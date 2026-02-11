# Platform Architecture

## Vision

We are building an AI-native, multi-tenant platform that agencies depend on to operate their business.

The platform must support multiple independent products sharing a common core.

Primary design goal:

👉 Fast product velocity without architectural rewrites.

---

## Architecture Style

Start as a **modular monolith**.

NOT microservices.

Structure the codebase so modules can be extracted later if needed.

---

## Platform Core (Highest Priority)

Everything revolves around these primitives:

### Organizations
Top-level tenant.

Owns:
- users
- subscriptions
- projects
- permissions

---

### Users
Can belong to one or multiple organizations.

---

### Billing
Handled via Stripe.

Stripe is the source of truth.

The platform mirrors billing state but never invents it.

---

### Identity & Access
Role-based access.

System must support:

- agency owners  
- agency staff  
- clients  
- platform admins  

Never hardcode permissions.

---

## Product Layer

Products must be **loosely coupled**.

Early candidate products:

- Site / Builder management (Chaibuilder)
- Hosting orchestration
- Analytics
- AI tooling
- Client portal

Products communicate via:

👉 internal services  
👉 events (later)

Never direct database coupling between products.

---

## Data Strategy

Use a single Postgres database (Supabase).

Design for multi-tenancy from day one.

Every major table must include:

org_id

Prefer globally unique IDs with prefixes.

---

## Async Jobs

Use **Inngest** for:

- provisioning
- Stripe sync
- emails
- lifecycle workflows

Avoid background logic inside API routes.

---

## Infrastructure

Frontend / API: Vercel  
Database: Supabase  
Jobs: Inngest  
Billing: Stripe  
Email: Resend  

Keep infrastructure minimal early.

---

## Non-Goals (For Now)

Do NOT build:

- microservices
- custom orchestrators
- multi-region infra
- complex queue systems

Earn complexity later.











## Platform Core Objects (Must Exist Before Migration)

The following objects are REQUIRED before onboarding real customers:

- Organization
- User
- Membership (user ↔ organization)
- Subscription
- Product entitlement
- Project / Site