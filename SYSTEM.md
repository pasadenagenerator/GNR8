# GNR8 Platform — System Contract

This repository is designed for AI-first development.

The platform MUST remain a modular monolith until explicitly re-architected.

## Architectural Laws

- Multi-tenant by default
- API-first
- Stripe is billing truth
- Strong schema-first data model
- No cross-module database access
- Business logic NEVER lives in route handlers
- Routes call services
- Services use repositories
- Repositories talk to the database

## Module Isolation

Modules must NOT:

- import each other's repositories
- directly query foreign tables
- embed billing logic outside billing module
- embed authorization logic outside membership module

Communication happens via services.

## Simplicity Rule

Prefer:

- fewer abstractions
- explicit code
- transactional safety
- idempotent workflows

Avoid:

- premature microservices
- event buses too early
- over-engineering

## AI Instructions

When generating code:

- prefer clarity over cleverness
- write senior-level TypeScript
- avoid magic
- avoid hidden side effects
- make data flow obvious

## Service Architecture

- The platform follows a strict service-layer architecture.
- All business capabilities must be exposed via domain services.
- Repositories are internal to modules.