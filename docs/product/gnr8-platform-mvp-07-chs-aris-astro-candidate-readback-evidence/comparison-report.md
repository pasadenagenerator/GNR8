# GNR8 Platform MVP 07 — CHS/ARIS Astro Candidate Readback Evidence

Status: `needs_fixes`

Generated: 2026-09-27T07:35:38.321Z

This proof uses synthetic businesses and in-memory ownership only. It performed no customer reads, database writes, durable candidate registration, production preview activation, provider/DNS/billing operation, or publish mutation.

## Comparison matrix

| Fixture | Variant | Preview source | Runtime fallback used | Content | Broken anchors | Order | Theme values | Ownership | Browser |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| chs-like | astro | astro_internal_preview_candidate | false | 27/27 | 0 | pass | 6/6 | pass | 2/2 captured |
| chs-like | fallback | transformed_artifact | false | 26/27 | 3 | fail | 6/6 | pass | 2/2 captured |
| aris-like | astro | astro_internal_preview_candidate | false | 27/27 | 0 | pass | 6/6 | pass | 2/2 captured |
| aris-like | fallback | transformed_artifact | false | 26/27 | 3 | fail | 6/6 | pass | 2/2 captured |

Note: `fallbackUsed=false` for the fallback rows means the intended `html-static-artifact` transformed artifact was selected directly; no secondary recovery fallback was invoked.

## Findings

- 6 static comparison defect finding(s).
- Browser validation confirmed 4 capture(s) with missing expected content and 12 missing fragment target(s).

Unsupported or intentionally non-equivalent fields:

- theme.tone: No dedicated canonical style-token or renderer behavior exists.
- brand/header semantics: Represented as navbar title/content rather than a dedicated brand primitive.
- card layout semantics: Current content fallback flattens card fields into text paragraphs.
- theme application: Theme values are retained as compiled CSS custom properties but the fallback shell uses fixed inline colors.

The Astro and fallback hashes are expected to differ because their adapter structures and styling differ. Pixel-identical output is not a requirement.

## Retained evidence

- Machine-readable evidence: `evidence.json`
- Browser evidence: `browser-evidence.json`
- Rendered previews: `previews/`
- Desktop/mobile captures: `screenshots/`

## Cleanup

- chs-like: workspace removed=true; build server stopped=true; database reads=0.
- aris-like: workspace removed=true; build server stopped=true; database reads=0.
- Comparison server stopped=true.
