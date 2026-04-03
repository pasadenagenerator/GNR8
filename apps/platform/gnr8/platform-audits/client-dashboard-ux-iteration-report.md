# Client Dashboard UX Iteration Report

## 1. Previous Dashboard Limitations
- `apps/platform/app/gnr8/client/page.tsx` and `apps/platform/app/gnr8/agency/clients/[clientId]/dashboard/page.tsx` rendered mostly technical placeholder content:
  - basic top header copy
  - summary counters
  - table-style site listing
- Quick actions were limited or missing:
  - agency-managed view only exposed a single `Open Client-Side Route` link
  - client-self view had no dashboard action block
- Empty state was minimal (`No client sites found for this membership scope.`) and did not provide clear next steps.
- Site overview was readable but utilitarian and not optimized for a landing-page workspace experience.
- Existing read model (`apps/platform/gnr8/client/client-dashboard-read-model.ts`) already had enough safe data for UX improvements (client/agency identity, status summary, site rows, live/preview URLs).

## 2. New Sections Added
- Added shared dashboard home component:
  - `apps/platform/app/gnr8/_components/client-dashboard/ClientDashboardHome.tsx`
- Added clearer top summary area with:
  - client name
  - parent agency name
  - access role
  - high-level status sentence derived from existing summary
- Kept compact summary cards for:
  - total sites
  - live
  - needs attention
- Replaced table-first listing with clearer site overview cards including:
  - domain/label
  - site ID (short)
  - site, migration, and runtime status chips
  - live/preview links when available

## 3. Quick Actions Added
- Agency-managed dashboard quick actions:
  - `View Sites`
  - `Open Settings`
  - `Open Team`
  - `Back to Agency`
  - `Open Client-Side Route`
- Client-self dashboard quick actions:
  - `View Sites`
- Empty state also surfaces action links where applicable (settings/team/back in agency-managed context).

## 4. Empty-State Behavior
- If no sites exist, dashboard now shows a dedicated empty-state card with supportive explanation.
- Agency-managed context includes immediate next steps:
  - settings
  - team
  - back to agency
- Client-self context avoids pretending agency admin controls exist and shows only context-appropriate guidance.

## 5. Agency-Managed vs Client-Self Considerations
- Agency-managed route (`/gnr8/agency/clients/[clientId]/dashboard`) keeps `ClientContextLayout`, tabs, breadcrumbs, and agency query scoping.
- Client-self route (`/gnr8/client`) gets the same improved information hierarchy and site overview style without exposing agency-only management controls.
- Both routes now share one dashboard content component for consistent UX while preserving route-specific actions.

## 6. Limitations
- No new backend/read-model fields were introduced by design.
- No advanced charts, analytics integrations, billing, or domain-management features were added.
- No dedicated site context route is introduced in this iteration; existing safe links (live/preview) are used.

## 7. Next-Step Recommendation
- Add a small client-scoped "sites workspace" route (within current access model) to support a first-class `Open Site Area` quick action from both dashboard contexts.
