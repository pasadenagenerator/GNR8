# Preview Visible Fallback Rendering Hardening Report

## 1. Prior Blank Preview Problem
Site Workspace previews could resolve correctly to transformed/debug artifacts while still appearing white/blank because many sections rendered only embedded JSON payload scripts and no human-visible HTML. This created an observability gap where data existed but operators could not inspect it visually.

## 2. Fallback Rendering Strategy
A deterministic server-side fallback renderer was introduced at `apps/platform/gnr8/runtime/preview-fallback-renderer.ts` and wired into artifact HTML generation in `apps/platform/gnr8/runtime/artifact-builder.ts`.

For each section:
- Existing section props JSON payload script is preserved.
- Visible fallback HTML is always emitted.
- `legacy.html` keeps its specialized summary renderer when available; otherwise it falls back to the shared visible renderer.

## 3. Section Type Coverage
The fallback renderer includes explicit readable outputs for:
- `faq.*` (including `faq.basic`)
- `navbar.*` (including `navbar.basic`)
- `footer.*` (including `footer.basic`)
- `content.*` and `content`
- `hero.*`
- `cta.*`
- `gallery.*`

## 4. Generic Fallback Behavior
Unknown section types now render a generic visible block with:
- section type label
- inferred heading/title when present
- text excerpts
- extracted links
- media placeholders when present
- diagnostics summary

If content is weak/empty, the fallback still renders a non-empty placeholder state (`No visible preview content extracted.` or section-specific no-content message) instead of silent blank output.

## 5. Safety and Determinism Approach
Safety:
- Text is HTML-escaped before output.
- Links are sanitized to block unsafe schemes (`javascript:`, `data:`, `vbscript:`).
- Rendering does not execute client-side JS and does not inject raw HTML from props.

Determinism:
- Object traversal is key-sorted where needed.
- Deduping and capped extraction limits are fixed.
- Same input props produce the same output HTML.

## 6. Limitations
This hardening does not provide design-accurate rendering. It is intentionally a readable fallback layer.

Not included in this task:
- high-fidelity component rendering
- full design-accurate preview reconstruction
- screenshot-based reconstruction
- client-side rich section renderer/hydration
- style signal extraction v2
- advanced layout fidelity

## 7. Next-Step Recommendation
Proceed with **Import Fidelity Hardening (Part 3: Section Consolidation & Merge Pass Tuning)** so fallback rendering receives cleaner, better-grouped section inputs and preview readability improves further without changing preview contracts.
