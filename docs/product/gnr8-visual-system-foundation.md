# GNR8 Visual System Foundation

## Direction

GNR8 platform UI uses an operator-product direction: light canvas, white workspace surfaces, dark inspector panels where useful, compact controls, crisp borders, restrained shadows, small radii, and mono readbacks for technical refs. The base stays Supabase-like and neutral: dark gray, white, muted gray, green success, warning/danger states, and one retro orange accent.

This is not a marketing-page language. It is for Command Center, Single-Site Studio, Airship chrome, proof panels, preview/review/readiness states, and future builder flows.

## Tokens

Implemented in `apps/platform/gnr8/visual-system/gnr8-visual-system.ts` and exposed as CSS custom properties in `apps/platform/app/gnr8-visual-system.css`.

Colors:
- `background`
- `surface`
- `surface-muted`
- `panel-dark`
- `panel-dark-muted`
- `border`
- `border-strong`
- `text`
- `text-muted`
- `text-inverse`
- `accent-orange`
- `accent-orange-hover`
- `accent-orange-soft`
- `success`
- `warning`
- `danger`
- `focus-ring`

Typography:
- UI font: system sans stack
- Heading scale: hero, section, compact
- Body scale: base, small, micro
- Mono font: system mono stack for readbacks, command text, refs, hashes, and diagnostics

Spacing:
- 4/8px grid with `xxs`, `xs`, `sm`, `md`, `lg`, `xl`
- Panel padding: 16px
- Toolbar gap: 8px
- Section rhythm: 22px

Radius:
- Button: 6px
- Input: 6px
- Panel: 8px
- Overlay: 8px

Shadows:
- Panel shadow
- Floating toolbar shadow
- Focus ring shadow

Icons:
- Default size: 18px
- Compact size: 14px
- Stroke width guidance: 1.75

## Orange Accent

Orange replaces the earlier Airship/editor blue for GNR8-owned platform chrome. It reads as operational and retro without looking like a public marketing CTA. Use orange for selected tabs, primary operator actions, focus states, active shell context, and internal reference emphasis. Do not apply it to customer site previews, imported page HTML/CSS, CHS/ARIS rendered designs, or generated artifacts.

## Applied

- Added the GNR8 token module and global CSS layer.
- Added internal reference route: `/gnr8/internal/visual-system`.
- Lightly aligned global GNR8 navigation and shared workspace shell.
- Lightly aligned Command Center superadmin context status.
- Lightly aligned Single-Site Studio UI chrome.
- Lightly aligned Airship single-site editor chrome and proof-workflow primary action color.

## Copy Guidance

- Operator labels should be short and concrete: `Run Check`, `Open Preview`, `Draft`, `Ready`, `Blocked`.
- Status copy should state the state first, then the boundary: `Internal preview unavailable. Live site unchanged.`
- Safety copy should name what did not happen: `No pointer mutation. No publish. No rollback.`
- Draft/live/publish boundary wording should keep draft, internal preview, live pointer, and customer domain separate.
- Technical readbacks should use mono styling for refs, ids, hashes, command lines, cwd, and diagnostics.

## Later

- Consolidate repeated inline badge/button helpers into shared platform UI primitives.
- Extend orange selected/focus states across remaining GNR8 admin screens.
- Add icon usage guidance when the platform introduces a shared icon dependency.
- Capture screenshot baselines for the reference page when local dev-server visual checks are stable.
