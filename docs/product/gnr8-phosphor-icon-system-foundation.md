# GNR8 Phosphor Icon System Foundation

## Why Phosphor

GNR8 uses Phosphor Icons for platform/editor chrome because the set is React-compatible, MIT licensed, compact, and technical without feeling generic. It fits the operator UI direction better than playful emoji or broad SaaS icon defaults.

## Wrapper

The icon wrapper lives at `apps/platform/app/gnr8/_components/icons/Gnr8Icon.tsx`.

It exposes a typed `Gnr8IconName` set, maps names to Phosphor components, and centralizes size, state, weight, and accessibility behavior.

## Sizing

- `compact`: 14px for dense toolbars and badges.
- `default`: 16px for normal platform controls.
- `nav`: 18px for navigation/action emphasis.

## Weight And State

- Default weight is `regular`.
- Active state uses `bold`.
- `duotone` is reserved for status/readback emphasis.
- Icon color should usually inherit `currentColor`; success/danger states use GNR8 visual tokens.

## Accessibility

- Decorative icons render with `aria-hidden`.
- Icons that carry meaning can pass a `label`, which renders `role="img"` and `aria-label`.
- Labels on existing buttons and links remain the primary accessible name.

## Applied

- Command Center productivity shortcuts.
- Agency, client, and site workspace shortcuts.
- Client dashboard quick actions.
- Airship proof-workflow action buttons and status badges.
- Airship visual editor toolbar controls for select, pan, text, zoom out, fit, and zoom in.
- Internal visual-system reference route icon samples.

## Later

- Convert remaining badge/link glyphs and older blue-coded statuses as shared UI primitives emerge.
- Extend icon use into deeper inspector panels where it improves scanning.
- Keep customer previews, generated artifacts, and imported site HTML/CSS icon-free unless customer content explicitly contains icons.
