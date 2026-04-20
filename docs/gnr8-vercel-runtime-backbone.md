# GNR8 Runtime Backbone (Vercel Only)

## Why split runtime now

GNR8 stays fully on Vercel, but runtime responsibilities are split across two Vercel projects to keep control-plane API bundles thin and move heavy execution into an isolated execution plane.

## Project ownership

### Platform project (`apps/platform`)
- Next.js UI and auth.
- Template/site CRUD and preview/workspace surfaces.
- Template upload route: validates input, stores ZIP, writes template row as `processing`, emits processing event.
- Template list/detail/site-create routes read truth from Supabase.
- Optional watchdog trigger is thin and event-oriented only.

### Worker project (`apps/worker`)
- Next.js app with dedicated Inngest endpoint at `/api/inngest`.
- Owns template processing execution lifecycle and retries.
- Loads processing payload, marks attempts, executes heavy ZIP intake, persists results, and finalizes `ready`/`failed`.
- Intended landing zone for future migration/render/AI background jobs.

## Shared contracts (`packages/gnr8-runtime-contracts`)
- Event names.
- Event payload shapes and parser.
- Processing state contract helpers.

Contract rules:
- Must remain pure TypeScript contracts.
- Must not import `next/*`.
- Must not import `react/*`.
- Must not import app-layer repositories/services.

## Import boundary rules

1. Platform is control plane and event trigger surface.
2. Worker is execution plane for background jobs.
3. Platform must not host `/api/inngest` runtime execution.
4. Worker execution code must not be imported into Platform route handlers.
5. Shared contracts stay narrow and framework-free.

## Environment model

### Platform env
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Inngest event key/env needed for event emission from platform (`inngest.send`).

### Worker env
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GNR8_TEMPLATE_SOURCE_ZIP_BUCKET` (optional override)
- `GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS` (optional override)
- Inngest signing/event keys for worker serve endpoint.

## Vercel setup

Create two Vercel projects:
- Platform project root: `apps/platform`
- Worker project root: `apps/worker`

Keep all runtime infrastructure Vercel-only; no Railway dependency is required for this split.
