# Command Palette Audit Report

## 1. Data Sources
- Recent items: `getRecentItems()` from `/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/src/workspace/workspace-recents.ts`.
- Agencies: existing agency membership list already used by workspace switching (`memberships` from `listCurrentUserAgencyMembershipsForPage`).
- Clients: existing client switcher source (`listSwitchableAgencyClientsForPage`) scoped to active agency.
- Static routes: local in-memory route list assembled per workspace context.

## 2. Filtering Logic
- Query normalization: trim + lowercase.
- Match fields: `label` and `sublabel`.
- Match mode: case-insensitive `includes` filtering.
- Recent items are scope-filtered first by allowed agency/client ids and command-center visibility.

## 3. Ranking Strategy
- Rank bucket 0: exact match on `label` or `sublabel`.
- Rank bucket 1: `startsWith` on `label` or `sublabel`.
- Rank bucket 2: `includes` fallback.
- Sorting only applies when query is non-empty.

## 4. Keyboard Handling
- Global toggle listener for `Meta+K` and `Ctrl+K` with `preventDefault()`.
- Palette-open listener handles `Escape`, `ArrowDown`, `ArrowUp`.
- Input `Enter` selects active result and navigates via `router.push(href)`.
- Listeners are attached in `useEffect` with cleanup to prevent duplicate listeners and memory leaks.

## 5. Scope Enforcement
- Recent items enforce existing visibility constraints:
  - command-center items only when allowed.
  - agency/client recents filtered by explicit allowed ids.
- Agencies are sourced only from current membership scope.
- Clients are sourced only from active agency client switcher scope.
- No backend/global search was added; no cross-tenant broad query path introduced.

## 6. Limitations
- V1 is local-only and non-fuzzy by design (no typo tolerance beyond `includes`).
- Command-center layout does not currently enumerate agency/client jumps because that context does not provide a membership/client-switcher scope source.
- Keyboard looping is linear and minimal; no advanced accessibility announcements beyond standard ARIA dialog labeling.

## 7. Next-Step Recommendation
- Add action commands (not only navigation), plus optional scoped fuzzy matching while preserving tenant boundaries.
