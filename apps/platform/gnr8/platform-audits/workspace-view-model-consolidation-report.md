# Workspace View-Model Consolidation Report

## 1. Repeated Patterns Identified

- Header models were built inline per workspace with the same field wiring pattern (`contextLabel`, `title`, `subtitle`, optional `backHref/backLabel`, optional `meta`).
- Tab models were built inline per workspace with duplicated `active` mapping logic (`tab.key === activeTab`).
- Active-tab behavior was implemented inconsistently in terms of fallback behavior (implicit in each layout rather than standardized).
- Back-link assembly was duplicated (`backHref/backLabel` pair, optional in admin/superadmin contexts).

## 2. Shared Helper/Factory Approach Introduced

Introduced a shared helper module at:

- `apps/platform/app/gnr8/_components/workspace/workspace-view-model.ts`

Key helpers:

- `buildWorkspaceHeader(input)`
  - Accepts workspace header input and optional `backLink` object.
  - Normalizes to `WorkspaceHeaderModel` (`backLink` -> `backHref/backLabel`).
- `buildWorkspaceTabs({ tabs, activeKey, fallbackActiveKey })`
  - Applies one consistent active-tab mapping across workspaces.
  - Includes normalized fallback behavior if an active key is missing.
- `buildWorkspaceViewModel({ header, tabs, activeKey, fallbackActiveKey })`
  - Small adapter/factory wrapper that returns `{ header, tabs }` ready for `WorkspaceLayout`.

## 3. What Remained Workspace-Specific

- Command Center:
  - Path-based active key resolution and command-center tab destinations.
  - Superadmin context meta details.
- Agency Workspace:
  - Agency identity/slug resolution.
  - Membership role/admin-view context and admin-view badge.
  - Membership switcher rendering and agency-scoped query handling.
- Client Workspace:
  - Client identity/slug resolution.
  - Parent agency back link.
  - Client-specific tab routes.

RBAC/scoping, routing structure, and context resolution were not flattened or merged.

## 4. Maintainability Benefits

- Reduced duplicated adapter code for header/tab view-model construction.
- Centralized and explicit active-tab normalization.
- Centralized optional back-link handling via one small model (`backLink`).
- Layout files are now thinner and focus more on workspace-specific context assembly.

## 5. Limitations

- Query-string and route construction is still workspace-specific by design; only view-model assembly was consolidated.
- `meta` remains free-form `ReactNode`, which keeps flexibility but intentionally avoids strict schema constraints.
- `WorkspaceLayout` rendering primitives were unchanged, so this does not yet enforce stronger visual-token consistency beyond existing usage.

## 6. Next-Step Recommendation

- Add an optional shared breadcrumb/state layer on top of the new view-model helpers so parent/child workspace transitions and context ancestry can be expressed consistently without changing routing ownership.
