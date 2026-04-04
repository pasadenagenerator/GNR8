# Command Palette V3 Report

## 1) Previous V2 limitations
- Search matching was intentionally shallow (`exact`, `startsWith`, `includes`) and could miss approximate input.
- Search text was limited to `label` + `sublabel`; no first-class alias metadata.
- Ranking had lightweight buckets and a small action boost, but no shared scoring dimensions for fuzzy intent.
- Scope filtering was present, but agency/client option lists were trusted as already scoped at the call site.

## 2) Fuzzy matching approach
- Added a lightweight local scorer in `CommandPalette.tsx` with no backend indexing and no async work.
- Implemented subsequence fuzzy scoring (`fuzzySubsequenceScore`) to tolerate skipped characters and compact queries.
- Matching now supports:
  - full query exact/prefix/includes
  - token coverage
  - token word-boundary preference
  - compact fuzzy subsequence fallback
- Example behavior supported by design:
  - `aset` -> Agency Settings
  - `cl tm` -> Client Team
  - `cmd ag` -> Command Center Agencies

## 3) Scoring and ranking strategy
- Deterministic score order:
  1. exact match
  2. startsWith
  3. word-boundary token match
  4. includes/token coverage
  5. fuzzy subsequence score
  6. slight recent boost (`recentRankBoost`)
  7. slight action/context boost (action + context scope)
- Tie-breakers are deterministic: group order, then label, then id.

## 4) Expanded searchable metadata
- `CommandItem` and `CommandPaletteOption` now support optional `aliases?: string[]`.
- Palette builds normalized searchable fields from:
  - `label`
  - `sublabel`
  - `aliases`
- Added small, targeted aliases for high-value intents (for example settings/config/preferences, team/users/members, command center/admin).

## 5) Scope handling
- Existing recents visibility checks remain in place and unchanged in policy.
- Agency/client static items are now additionally filtered by `accessibleAgencyIds` / `accessibleClientIds` inside palette item construction.
- Command Center action visibility still honors `allowCommandCenter`.
- Result: no intended cross-tenant/cross-scope broadening, only better scoring/coverage of already accessible local data.

## 6) Limitations
- Fuzzy logic is local and heuristic-based; it is not typo-correction or full-text indexing.
- Aliases are intentionally minimal and curated; coverage is good for common paths, not exhaustive.
- Ranking remains local-first and in-memory, suitable for current command volume but not designed as a backend/global search platform.

## 7) Next-step recommendation
- D. Search Result Actions & Preview Pane
