# Site Actions Layer Report (V1)

## 1. Action Model
- Added canonical model in `gnr8/site-actions/site-action-model.ts`.
- Supported actions:
  - `rerun_transformation`
  - `generate_redesign`
  - `publish_site`
- Persistent state is stored in:
  - `public.gnr8_site_actions`
  - `public.gnr8_site_variants`
  - `public.gnr8_site_publish_events`

## 2. Execution Flow
1. Workspace or command palette triggers `/api/gnr8/site-actions`.
2. API enforces agency action scope via `requireAgencyActionContext`.
3. Service executes deterministic V1 operation:
   - `rerun_transformation`: rebuilds runtime version from latest site version with deterministic design-intelligence pass.
   - `generate_redesign`: same as rerun but with deterministic strategy override + variant persistence.
   - `publish_site`: marks selected/latest runtime version as `PUBLISHED` and stores simulated publish metadata.
4. Action rows are updated (`running` -> `completed|failed`) with diagnostics and summary.

## 3. UI Integration
- Added client action surface: `SiteActionsPanel.tsx`.
- Integrated on Site workspace tabs with context-aware controls:
  - Overview: rerun, redesign, publish
  - Design: redesign
  - Preview: rerun, publish
- Added state indicators:
  - current status
  - last run timestamp
  - last action summary + diagnostics
- Added variant switcher with selected variant persistence via `?variant=` query.

## 4. Pipeline Integration
- Rerun/redesign uses existing Design Intelligence pipeline logic (`createDesignIntelligenceResultFromInput`) to derive deterministic strategy data from current runtime structure.
- New runtime versions are created through existing runtime store APIs (`createSiteVersionFromMigration`).
- Preview now resolves to selected variant runtime version when available.

## 5. Limitations (Explicit V1)
- No background job queue; actions are synchronous request/response.
- No multi-variant comparison UI (only single active variant switch).
- No real deployment infrastructure; publish is simulated metadata + runtime state change.
- No billing/subscription gating yet.

## 6. Next-Step Recommendation
- Add subscription-ready action gates at service boundary:
  - per-action quota checks
  - action credit consumption hooks
  - policy-based denials with actionable diagnostics
