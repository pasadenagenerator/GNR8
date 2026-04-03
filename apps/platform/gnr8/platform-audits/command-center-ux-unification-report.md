# Command Center UX Unification Report

## 1. Previous UX issues
- `/gnr8/command-center` functioned as a single mixed surface that combined migration operations and agency administration.
- No persistent Command Center context/header existed across sub-surfaces.
- No unified workspace navigation existed for superadmin workflow switching.
- Information hierarchy made discoverability of Agencies actions weaker than Sites operations.

## 2. New Command Center context model
- Command Center context now applies to `/gnr8/command-center*`.
- A shared route-level layout now enforces:
  - superadmin-only fail-closed guard
  - persistent Command Center identity
  - persistent superadmin context indicator
  - persistent workspace navigation
- The context shell is implemented once and reused by all Command Center pages.

## 3. Navigation structure
- Primary navigation tabs introduced:
  - Overview: `/gnr8/command-center`
  - Sites: `/gnr8/command-center/sites`
  - Agencies: `/gnr8/command-center/agencies`
- Overview remains a valid landing surface.

## 4. Section/surface breakdown
- Overview
  - Portfolio-level summary metrics
  - Migration status distribution
  - Operational instrumentation signals
  - Entry links to Sites and Agencies surfaces
- Sites
  - Existing migration operations table and controls (reused)
  - Existing site/client assignment controls (reused)
  - Existing profitability/client filtering model (reused)
  - Existing instrumentation/fallback visibility (reused)
  - Section-specific empty-state messaging
- Agencies
  - Existing Create Agency workflow (reused)
  - Existing agencies table with Agency Dashboard / Settings / Team actions (reused)
  - Explicit discoverability line for client-users admin paths through agency admin-view
  - Section-specific empty-state messaging

## 5. Reused vs newly introduced components/routes
- Reused
  - `getCommandCenterReadModel`
  - `CommandCenterOpsTable`
  - `CreateAgencyForm`
  - `ExistingAgenciesTable`
  - Existing admin-view action routes under `/gnr8/admin/agencies/*`
- Newly introduced
  - Route layout: `apps/platform/app/gnr8/command-center/layout.tsx`
  - Shared workspace shell: `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
  - Shared view-model helper: `apps/platform/app/gnr8/command-center/_lib/command-center-view-model.ts`
  - New surfaces:
    - `apps/platform/app/gnr8/command-center/page.tsx` (Overview)
    - `apps/platform/app/gnr8/command-center/sites/page.tsx`
    - `apps/platform/app/gnr8/command-center/agencies/page.tsx`

## 6. Limitations
- Agencies surface still depends on existing agencies summary payload and does not provide direct per-client user table inline; client-users admin flow remains route-based via agency admin-view pages.
- Active tab styling is pathname-driven in a client shell component; no server-side selected-tab rendering optimization was added.
- This pass focuses on structure and hierarchy, not deep visual redesign.

## 7. Next-step recommendation
- Consolidate shared workspace primitives (header/nav shell patterns) into a cross-workspace layout system to reduce repeated styling logic across Command Center, Agency, and Client contexts.
