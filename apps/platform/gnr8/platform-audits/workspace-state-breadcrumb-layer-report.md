# Workspace State / Breadcrumb Layer Report

## 1. Prior Context Limitations

- `WorkspaceLayout` rendered context label, title, subtitle, optional back-link, optional meta, and tabs, but had no shared lineage surface.
- Workspace hierarchy existed implicitly in each layout via href construction (`/gnr8/command-center/*`, `/gnr8/agency/*`, `/gnr8/agency/clients/[clientId]/*`) but was not rendered as state context.
- Command Center, Agency, and Client contexts each had local active-tab resolution, yet users had to infer parent/child scope from title text and tabs only.
- Admin-view context was visible through badges/back-links in Agency layout, but not expressed in a shared hierarchy trail.

## 2. Breadcrumb Model Introduced

- Added shared breadcrumb item model in `WorkspaceLayout`:

```ts
export type WorkspaceBreadcrumbItem = {
  label: string
  href?: string
}
```

- Extended shared workspace header model with optional breadcrumb support:
  - `WorkspaceHeaderModel.breadcrumbs?: WorkspaceBreadcrumbItem[]`
- Reused existing shared view-model helpers by passing breadcrumbs through `header` in `buildWorkspaceViewModel` without introducing duplicate workspace rendering logic.

## 3. Shared Rendering Approach

- Added one shared breadcrumb renderer in `WorkspaceLayout` (`BreadcrumbTrail`) and integrated it into shared identity rendering (`renderIdentity`).
- Breadcrumbs render as compact, visually light inline context with `/` separators and optional links.
- Placement is near/above workspace title, preserving existing structure:
  - back link
  - context label
  - title/subtitle
  - meta/admin badges
  - tabs
- No route, RBAC, or business-logic changes were introduced.

## 4. Workspace-Specific Breadcrumb Examples

- Command Center:
  - `Command Center / Overview`
  - `Command Center / Sites`
  - `Command Center / Agencies`
- Agency workspace (membership):
  - `Agency / Dashboard`
  - `Agency / Clients`
  - `Agency / Team`
  - `Agency / Settings`
- Agency workspace (admin_view):
  - `Command Center / Agencies / <Agency Name> / Dashboard`
  - `Command Center / Agencies / <Agency Name> / Clients`
  - `Command Center / Agencies / <Agency Name> / Team`
  - `Command Center / Agencies / <Agency Name> / Settings`
- Client workspace:
  - `Agency / Clients / <Client Name> / Dashboard`
  - `Agency / Clients / <Client Name> / Settings`
  - `Agency / Clients / <Client Name> / Team`

## 5. Limitations

- Breadcrumb labels are currently assembled per layout with simple local mappings; no central label registry exists.
- Client workspace lineage currently models agency scope generically (`Agency`) and does not display an agency-name segment.
- Breadcrumb model remains intentionally lightweight (label + optional href); no icons, truncation policy, or overflow UX is included.

## 6. Next-Step Recommendation

- Introduce a small shared breadcrumb factory helper for workspace contexts (command-center/agency/client) to keep lineage definitions centralized while preserving local route ownership.
