# Command Center UI Report

## 1. Page structure
- Route: `apps/platform/app/gnr8/command-center/page.tsx`
- Protection: server-side superadmin guard via `requireSuperadminUserId()`.
- Layout:
  - Header: `GNR8 Command Center`
  - Filter bar:
    - client filter
    - profitability filter (`all`, `profitable`, `loss-making`)
  - Sites table with ownership, cost, margin, plan simulation, and assignment actions.
- Row action component:
  - `apps/platform/app/gnr8/command-center/_components/site-assignment-control.tsx`
  - Dropdown + Assign button
  - Calls `POST /api/gnr8/assign-site`
  - Refreshes page after successful assignment.

## 2. Data sources
- Core operational data uses existing billing services:
  - Unified cost view: `getUnifiedCostOverview` from `apps/platform/gnr8/billing/unified-cost-view-service.ts`
  - Margin: `getMarginDebugOverview` from `apps/platform/gnr8/billing/margin-service.ts`
  - Pricing simulation: `compareSiteAcrossPlans` from `apps/platform/gnr8/billing/pricing-simulation-service.ts`
- Client dropdown options use:
  - `listClientOrganizationsForCommandCenter` in `apps/platform/gnr8/command-center/command-center-assignment-service.ts`
  - Reads `organizations` (client orgs) and `agencies` (optional agency name).

## 3. Assignment flow
- API route: `apps/platform/app/api/gnr8/assign-site/route.ts`
- Input:
  - `siteId`
  - `clientId`
- Validation and update logic:
  - Superadmin auth required.
  - UUID validation for both fields.
  - Validates site exists.
  - Validates target org exists and has `organization_type='client'`.
  - Validates site agency and client agency match.
  - Updates `public.sites.org_id` to target client.
- Response:
  - Returns updated assignment metadata for UI feedback.

## 4. What can be done in UI
- View all in-scope sites with:
  - domain
  - short site id
  - current client ownership
  - agency
  - AI/runtime/total cost
  - margin and margin %
  - pricing simulation margins for `STARTER`, `GROWTH`, `MANAGED`
  - best-margin plan recommendation
- Filter:
  - by client
  - by profitability
- Assign site to a client from row-level action.

## 5. Limitations
- Plan simulation is computed per site on page load and can be slower with large site counts.
- Assignment only supports moving site ownership to client organizations (no agency/internal target options).
- No pagination yet (current cap is service-level limited list).
- No assignment history timeline in UI (auditing currently relies on DB state and existing logs).

## 6. Next UX improvements
- Add pagination and server-side sort controls (cost, margin, best-plan margin).
- Add assignment confirmation modal with current vs target ownership summary.
- Add bulk assignment mode for multi-site client migration operations.
- Add sticky table header and compact mobile row mode for better scanability.
- Add recent assignment activity panel (who changed what and when).

