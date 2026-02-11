# Architecture Overview

## Philosophy

This system is designed for AI-assisted development.

Primary goals:

- extreme clarity over cleverness
- composability
- predictable infrastructure
- low cognitive load for developers and AI agents
- fast deployment cycles

Every architectural decision must optimize for **machine readability** as much as human readability.

---

## Core Principles

### 1. Thin Backend Strategy
We avoid large monolith backends.

Backend responsibilities:

- auth
- payments
- data ownership
- critical business logic

Everything else should live in composable services.

---

### 2. API First
Every capability must be exposed through an API.

Rules:

- no hidden logic
- no UI-only data transformations
- server is the source of truth

---

### 3. Serverless by Default
Prefer:

- Vercel functions
- edge runtimes
- managed databases

Avoid custom infra unless there is a strong reason.

---

### 4. Replaceable Components
Assume every service will be replaced.

Never tightly couple:

- auth
- database
- CMS
- queues
- AI providers

Always isolate behind adapters.

---

## High-Level Architecture

Client (Next.js / App Router)  
↓  
BFF Layer (server actions / edge functions)  
↓  
Service Layer  
↓  
Managed Infrastructure  

---

## Recommended Stack Shape

### Frontend
- Next.js
- Tailwind
- shadcn/ui
- React Server Components

### Backend / Data
- Postgres (Neon / Supabase / RDS)
- Prisma or Drizzle
- Redis (Upstash)

### Auth
- Clerk or Auth.js

### Payments
- Stripe

### AI Layer
Wrap ALL model providers.

Never call OpenAI/Anthropic directly from product code.

Create:

`/core/ai`

Example:

```ts
generateText()
generateObject()
embed()
routeModel()