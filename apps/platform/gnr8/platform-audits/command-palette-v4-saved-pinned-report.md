# Command Palette v4 (Saved Commands & Pinned Results) Report

## 1) Personalization model
- Added client-side personalization model in `command-palette-saved.ts`:
  - `SavedCommandItem`:
    - `id: string` (stable command/result identity)
    - `label: string`
    - `href?: string`
    - `type: 'route' | 'action' | 'agency' | 'client'`
    - `pinned?: boolean`
    - `timestamp: number`
- Palette runtime supports two presentation-only result groups:
  - `Pinned` (items with `pinned=true`)
  - `Saved` (saved-but-not-pinned items)
- Stable IDs are reused from existing command IDs (for example `action-*`, `route-*`, `agency:*`, `client:*`) to avoid fragmentation.

## 2) Storage strategy
- Local-only persistence via `localStorage` key:
  - `gnr8.workspace.command-palette.saved.v1`
- Implemented helper API:
  - `getSavedCommands()`
  - `saveCommand(item)`
  - `removeSavedCommand(id)`
  - `pinCommand(item)`
  - `unpinCommand(id)`
  - `normalizeSavedCommands(input)`
- Storage safety behavior:
  - Parse/write failures are fail-safe (silently ignored).
  - Entries are normalized and deduped by stable `id`.
  - Newest-first sorting (`timestamp`) with cap (`MAX_SAVED_COMMANDS = 80`).

## 3) Pin/save behavior
- Added compact per-result controls in palette rows and preview pane:
  - `Pin` / `Unpin`
  - `Save` / `Saved` (remove via toggle)
- Supported result types for persistence:
  - actions
  - routes
  - agencies
  - clients
- Pinned implies saved state. Unpin keeps the item saved; remove clears it.
- Execution model remains unchanged:
  - Enter executes primary action/navigation
  - Secondary result actions still run
  - Preview pane remains active

## 4) Scope filtering behavior
- Scope/access safety is preserved by design:
  - Pinned/saved entries are only materialized if a matching currently-visible command item exists.
  - Existing access filters (`accessibleAgencyIds` / `accessibleClientIds`) run before personalization materialization.
  - Stale or inaccessible entries remain in local storage but are not rendered/exposed.
- No new server-side data path or tenant-crossing query was introduced.

## 5) Ranking/display behavior
- Section order now:
  1. `Pinned`
  2. `Saved`
  3. `Actions`
  4. `Navigation`
  5. `Recent`
  6. `Agencies`
  7. `Clients`
- Pinned/saved sections only render when non-empty.
- Personalized items are de-duplicated from lower sections to avoid noisy repeats.
- Fuzzy search includes pinned/saved entries and applies a lightweight score boost:
  - pinned > saved > base types

## 6) Limitations
- Persistence is intentionally local-only (no sync across browsers/devices/users).
- No settings UI or bulk personalization management panel is included.
- Saved metadata is minimal and intentionally tied to existing command IDs.
- Keyboard-only toggling for save/pin is not yet added (controls are click/tap).

## 7) Next-step recommendation
- Command Palette v5: usage-based ranking that combines recency/frequency with explicit pin/save state while keeping tenant-scoped filtering fail-closed.
