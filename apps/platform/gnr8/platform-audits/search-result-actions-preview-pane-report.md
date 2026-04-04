# Search Result Actions & Preview Pane Audit

## 1) Result model expansion
- Expanded `CommandItem` with optional `preview` and `secondaryActions`.
- Added `CommandResultAction` for per-result lightweight actions (`href` or client-only `action`).
- Kept all executable functions inside the client component (`CommandPalette.tsx`) to avoid server/client boundary violations.

## 2) Preview strategy
- Added per-result preview metadata during item construction in `CommandPalette`.
- Preview updates from the highlighted result (`activeIndex`).
- Desktop: preview renders in a right-side pane.
- Compact/mobile fallback: preview renders below the list.
- If data is limited, preview remains minimal and only uses already-available local item fields.

## 3) Result action strategy
- Added compact secondary actions per result type:
- Agency: `Open Dashboard`, `Open Settings`, `Open Team`.
- Client: `Open Dashboard`, `Open Settings`, `Open Team`.
- Route: `Open`.
- Recent: `Open`.
- Action: `Run`.
- Actions reuse existing `href` routes and existing client-side action execution.
- Secondary actions are shown only on the active row to keep the list compact.

## 4) Scope safety rules
- Agency/client entries still pass through existing `accessibleAgencyIds` / `accessibleClientIds` filtering.
- Recent items still use existing visibility checks by type + allowed scope.
- Preview and actions are derived only from already accessible command items and known local route patterns.
- No new backend query path was introduced, and no cross-tenant data source was added.

## 5) Interaction model
- Existing behavior preserved:
- `Cmd/Ctrl + K` toggles palette.
- Arrow keys change highlighted item.
- `Enter` executes highlighted primary action.
- `Escape` closes palette.
- Fuzzy ranking and grouping remain unchanged.
- Added mouse-triggered secondary actions (`click`).
- Added lightweight selected-row pairing with a compact type badge and synchronized preview pane.

## 6) Limitations
- Secondary actions are intentionally mouse-first in this iteration (no expanded keyboard action menu).
- Preview content is concise and template-based from local fields; it does not include deeper record inspection.
- Client parent-agency context in preview depends on locally provided `sublabel`/query context.

## 7) Next-step recommendation
- Add a tiny keyboard affordance for secondary actions (for example, `Cmd+Enter` to trigger first secondary action) only if it can be done without disrupting current keyboard flow.
