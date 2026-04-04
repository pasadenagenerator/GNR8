# Command Palette Layout + Scroll Fix Report

## 1. Root cause(s) found
- The list/preview split container used `maxHeight` instead of a strict flex-owned height, so the list region was not always constrained to an actual scrollable box.
- Results and preview columns had no real inter-column gap (`gap: 0`), so the split looked compressed.
- Active keyboard selection changed index state, but there was no active-row scroll synchronization effect.
- Horizontal guttering was mixed across wrappers in a way that made the right side visually inconsistent in the split area.

## 2. Correct padding ownership
- The modal body now uses an explicit inner content layout:
  - Input/header row owns `padding-inline: 20px`.
  - Results/preview split row owns `padding-inline: 20px`.
- This keeps left and right outer content gutters symmetric across input, list, and preview regions.

## 3. Correct scroll-container ownership
- The results column is now the single intended scroll owner:
  - `overflow-y: auto`
  - `overscroll-behavior: contain`
  - parent containers are flex/grid constrained with `flex: 1`, `min-height: 0`, `min-width: 0`.
- The modal shell is a flex column with bounded height (`maxHeight: 76vh`) and `overflow: hidden`, preventing background scroll leakage while open.

## 4. Active-item auto-scroll strategy
- Added stable row refs keyed by result `item.id`.
- On active index change, the active row is resolved from ref map and scrolled with:
  - `scrollIntoView({ block: 'nearest' })`
- This keeps ArrowDown/ArrowUp navigation visible without large jump behavior.

## 5. Limitations
- Auto-scroll uses browser-native `scrollIntoView` behavior and does not currently apply custom animation tuning.
- Preview pane is fixed (non-scrolling) in this pass; if preview content grows significantly, text may clip in extreme viewport constraints.

## 6. Next-step recommendation
- Add a focused accessibility pass for semantic listbox roles (`listbox`/`option`), `aria-activedescendant`, and explicit screen-reader announcements for active result changes.
