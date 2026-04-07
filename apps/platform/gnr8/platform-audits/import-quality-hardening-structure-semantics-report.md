# Import Quality Hardening — Structure + Semantics Report

## 1. Previous Weaknesses
- Structure preparation produced a deterministic DOM outline but no explicit semantic contract.
- Section semantics were inferred later inside Design Intelligence from sparse signals.
- Header/navigation/footer and hero/CTA/media detection lacked section-level rationale and confidence.
- Brand signal extraction was effectively placeholder-only (body class fallback).
- Uncertain cases had limited structured diagnostics for operator visibility.

## 2. New Semantic Contracts
- Extended `PreparedSiteModel` (`modelVersion: 1.6.0`) with document-level semantic output:
  - `PreparedPageSemanticModel`
  - `PageSemanticModel`
  - `SectionSemanticModel`
  - `BrandSignalModel`
  - `SemanticDiagnostic`
- Added deterministic confidence bands (`low|medium|high`) and rationale arrays for semantic decisions.
- Added section-level density signals:
  - text/image/heading/CTA/repetition density
  - readability tendency

## 3. Section/Page Classification Improvements
- Added deterministic section classification for:
  - `header`, `navigation`, `hero`, `cta`, `about`, `services`, `features`, `gallery`, `testimonials`, `contact`, `footer`, `unknown`
- Added deterministic page-type inference for:
  - `home`, `about`, `services`, `contact`, `product_landing`, `gallery_portfolio`, `unknown`
- Added style family inference:
  - `corporate`, `service`, `gallery`, `editorial`, `unknown`

## 4. CTA/Hero/Nav/Footer/Media Improvements
- Navigation/header/footer detection now uses:
  - semantic tags + role/aria hints + DOM position + link/legal/contact clusters
- Hero detection now uses:
  - top-window prominence + heading/media/CTA combinations + hero-name hints
  - hero composition hint: `text_only|split_media|centered_cta|image_first|unknown`
- CTA detection now emits:
  - section CTA candidates
  - likely primary CTA
  - CTA rationale/confidence
- Media/gallery detection now emits:
  - media density
  - gallery-like confidence

## 5. Brand Signal Extraction Model
- Added deterministic brand signal extraction from available import-safe sources:
  - color tokens (inline/style-block HTML content)
  - stylesheet/body class naming hints
  - font-family declarations in HTML-contained CSS
  - inferred font categories (`sans|serif|display|monospace`)
  - visual tone (`formal|playful|neutral`)
- Emits confidence + rationale and marks weak extraction explicitly.

## 6. Confidence/Diagnostic Model
- Added semantic diagnostics:
  - `SEMANTIC_SECTION_LOW_CONFIDENCE`
  - `SEMANTIC_PAGE_TYPE_UNKNOWN`
  - `BRAND_SIGNAL_WEAK`
  - `CTA_PRIMARY_UNCLEAR`
  - `HERO_SECTION_UNCLEAR`
  - `NAVIGATION_SECTION_UNCLEAR`
  - `FOOTER_SECTION_UNCLEAR`
- Diagnostics are deterministic and section/page-addressable.

## 7. Integration into Design Intelligence
- `createDesignIntelligenceInputFromPreparedSite` now consumes prepared semantic outputs directly when available.
- Design input now includes:
  - inferred section type/confidence/rationale
  - hero composition/media density/gallery confidence/readability tendency
  - primary CTA label + semantic diagnostics
  - richer brand signal payload
- Deterministic Design Intelligence decisions remain active and now use strengthened semantic signals.

## 8. Limitations
- No screenshot/image-based visual analysis.
- No OCR-driven understanding.
- No learned/ML classifier system.
- No autonomous redesign generation.
- No external trend ingestion.
- No full external stylesheet design-token extraction when CSS is only referenced by URL/path.

## 9. Next-Step Recommendation
- Proceed with **Visual Screenshot-Assisted Design Analysis (V1)** after this deterministic hardening baseline is validated in production-like imports.
