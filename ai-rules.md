SYSTEM.md is the highest authority in this repository.

# AI Engineering Rules

You are building a long-term platform, not a prototype.

Every decision must favor:

- clarity over cleverness
- simplicity over abstraction
- speed over theoretical scalability
- strong data models over premature microservices

---

## PLATFORM MINDSET

This system is a **composable SaaS platform** that will host multiple independent products sharing a common platform core.

DO NOT tightly couple modules.

Prefer:

- shared identity
- shared billing
- shared org model
- event-driven communication

Avoid direct cross-module database reads unless explicitly allowed.

---

## DEFAULT STACK

Assume the following unless told otherwise:

- Next.js / Vercel
- Supabase (Postgres + Auth)
- Stripe (billing)
- Inngest (background jobs)
- Resend (email)

Do not introduce new infrastructure without strong justification.

---

## DATA PHILOSOPHY

Prioritize excellent schema design.

Use globally unique IDs with prefixes:

org_
usr_
site_
sub_

Design for multi-tenancy from day one.

Every major record must belong to an organization.

---

## COMPLEXITY CONTROL

Never introduce:

- microservices
- message brokers
- distributed systems
- exotic patterns

…unless explicitly requested.

Start monolithic.
Design modular.

---

## AI-NATIVE CODEBASE

Optimize the repository so AI agents can easily reason about it:

- prefer explicit naming
- avoid magic
- minimize hidden behavior
- write readable queries
- keep functions small

Code should be explainable in seconds.

---

## FILE DISCIPLINE

Prefer creating new files over bloated ones.

Ideal file size:
200–400 lines max.

---

## ERROR HANDLING

Fail loudly.

Do not swallow errors.

Use typed results where possible.

---

## BILLING SAFETY

Stripe is the source of truth for billing.

Never grant access based on frontend state.

Always verify server-side.

---

## PERMISSIONS

Assume this platform will support:

- agencies
- sub-accounts
- client users
- internal staff

Design roles carefully.

Avoid hardcoding permissions.

---

## MOST IMPORTANT RULE

This is not a startup hack project.

This is infrastructure for a future category leader.

Act accordingly.