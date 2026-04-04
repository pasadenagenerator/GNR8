# Command Palette v5 (Usage-Based Ranking) Report

## 1) Usage model
- Added local usage model in `apps/platform/src/workspace/command-palette-usage.ts`:
  - `CommandUsageEntry`:
    - `id: string` (stable command identity)
    - `count: number` (execution frequency)
    - `lastUsedAt: number` (unix ms)
- Usage identity is stable across base and personalized rows:
  - pinned/saved rows (`pinned:*` / `saved:*`) resolve to their source command id.
  - This prevents fragmented usage history and keeps ranking coherent.

## 2) Storage strategy
- Local-only persistence via `localStorage` key:
  - `gnr8.workspace.command-palette.usage.v1`
- Helper API implemented:
  - `getCommandUsage()`
  - `recordCommandUsage(id)`
  - `clearCommandUsage()`
  - `normalizeCommandUsage(input, options?)`
- Safety/shape controls:
  - normalization + dedupe by stable id
  - deterministic sort by recency, then count, then id
  - max entry cap (`MAX_USAGE_ITEMS = 240`)
  - fail-safe parse/write behavior (storage errors ignored)

## 3) Execution tracking rules
- Usage is recorded only when execution actually happens:
  - primary item with `href` navigation
  - primary item with executable `action`
  - secondary result action (`href`/`action`) records usage for its parent command result
- Usage is not recorded for:
  - hover/highlight
  - query typing/searching
  - non-executable rows

## 4) Ranking formula / score components
- Existing deterministic text scoring remains the base:
  - exact
  - startsWith
  - includes/token coverage/word-boundary
  - fuzzy subsequence
- Added deterministic additive boosts:
  1. pinned boost
  2. saved boost
  3. recent item positional boost (existing behavior)
  4. action/type boosts (existing behavior)
  5. usage frequency boost (log-scaled, capped)
  6. usage recency boost (small, time-bucketed)
  7. context relevance boost (existing action scope boost)
- Tie-breakers remain deterministic:
  - score desc
  - group order
  - label
  - id

## 5) Scope safety behavior
- Scope/access filtering is still applied before result rendering and before usage hydration in ranking.
- Usage cannot resurrect inaccessible or removed entities:
  - usage lookup runs only against currently visible command ids.
  - stale entries are ignored and lazily pruned during `getCommandUsage({ validIds })`.
- No backend calls, no telemetry, no cross-user data flow were introduced.

## 6) Limitations
- Usage is browser-local and not synchronized across devices/browsers.
- Recency uses current wall-clock buckets (deterministic but time-sensitive).
- No UI for usage inspection/reset is added (helper supports programmatic clear only).
- Ranking enhancement is intentionally lightweight; no separate “Most used” section yet.

## 7) Next-step recommendation
- D. Command Palette v6 (Pinned Groups & Team Presets)
