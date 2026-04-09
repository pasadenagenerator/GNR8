import type { ComputedStyleSample } from '@/gnr8/import-rendered-capture'
import type { PreparedSiteModel } from '@/gnr8/migration/prepared-site-model'
import type { VisualAnalysisModel } from '@/gnr8/visual-analysis/visual-analysis-model'

import {
  STYLE_SIGNAL_MODEL_VERSION,
  type StyleSignalDiagnostic,
  type StyleSignalDiagnosticCode,
  type StyleSignalModel,
  type StyleSignalSourceMode,
} from './style-signal-model'

type RgbColor = { r: number; g: number; b: number; a: number }

type InternalSignals = {
  computedPrimaryAccent: string | null
  computedSecondaryAccent: string | null
  computedBackgroundTone: StyleSignalModel['colors']['backgroundTone']
  computedNeutralPalette: string[]
  computedCtaColorHint: string | null
  computedHeadingFontFamily: string | null
  computedBodyFontFamily: string | null
  computedScaleHint: StyleSignalModel['typography']['scaleHint']
  computedWeightContrast: StyleSignalModel['typography']['weightContrastHint']
  computedRhythm: StyleSignalModel['spacing']['rhythm']
  computedSectionSpacing: StyleSignalModel['spacing']['sectionSpacingHint']
  computedDensity: StyleSignalModel['spacing']['layoutDensity']
  computedRadiusHint: StyleSignalModel['surfaces']['radiusHint']
  computedShadowHint: StyleSignalModel['surfaces']['shadowHint']
  computedCtaStyleHint: StyleSignalModel['cta']['styleHint']
  computedCtaProminence: StyleSignalModel['cta']['prominence']
}

function stringCmp(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))].sort(stringCmp)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function toPx(value: string | null | undefined): number | null {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return null
  const match = raw.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeFontFamily(value: string | null | undefined): string | null {
  const raw = String(value ?? '')
    .replaceAll(/["']/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0)
  return raw ?? null
}

function fontCategoryFromFamily(value: string | null): StyleSignalModel['typography']['headingCategory'] {
  const lower = String(value ?? '').toLowerCase()
  if (!lower) return 'unknown'
  if (/mono|code|courier|menlo|consolas/.test(lower)) return 'mono'
  if (/display|impact|bebas|oswald|headline/.test(lower)) return 'display'
  if (/serif|georgia|times|garamond|baskerville/.test(lower)) return 'serif'
  if (/sans|arial|helvetica|inter|roboto|system-ui|ui-sans/.test(lower)) return 'sans'
  return 'unknown'
}

function parseHexColor(raw: string): RgbColor | null {
  const hex = raw.trim().toLowerCase()
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) return null
  if (hex.length === 4) {
    return {
      r: Number.parseInt(`${hex[1]}${hex[1]}`, 16),
      g: Number.parseInt(`${hex[2]}${hex[2]}`, 16),
      b: Number.parseInt(`${hex[3]}${hex[3]}`, 16),
      a: 1,
    }
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
    a: 1,
  }
}

function parseRgbColor(raw: string): RgbColor | null {
  const normalized = raw.trim().toLowerCase()
  const rgb = normalized.match(/^rgba?\(([^)]+)\)$/)
  if (!rgb) return null
  const parts = rgb[1].split(',').map((p) => p.trim())
  if (parts.length !== 3 && parts.length !== 4) return null
  const r = Number(parts[0])
  const g = Number(parts[1])
  const b = Number(parts[2])
  if (![r, g, b].every((n) => Number.isFinite(n))) return null
  const a = parts.length === 4 ? Number(parts[3]) : 1
  if (!Number.isFinite(a)) return null
  return { r: clamp(Math.round(r), 0, 255), g: clamp(Math.round(g), 0, 255), b: clamp(Math.round(b), 0, 255), a: clamp(a, 0, 1) }
}

function parseColor(raw: string | null | undefined): RgbColor | null {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value || value === 'transparent') return null
  return parseHexColor(value) ?? parseRgbColor(value)
}

function colorToHex(color: RgbColor): string {
  const r = color.r.toString(16).padStart(2, '0')
  const g = color.g.toString(16).padStart(2, '0')
  const b = color.b.toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

function luminance(color: RgbColor): number {
  const norm = [color.r, color.g, color.b].map((value) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * norm[0]! + 0.7152 * norm[1]! + 0.0722 * norm[2]!
}

function isNearNeutral(color: RgbColor): boolean {
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  const spread = max - min
  return spread <= 18
}

function normalizeClassToken(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, ' ')
    .trim()
}

function scoreByTarget(target: ComputedStyleSample['target']): number {
  switch (target) {
    case 'primary_cta':
      return 4
    case 'hero':
      return 3
    case 'h1':
      return 3
    case 'h2':
      return 2
    case 'root':
      return 2
    case 'header_nav':
    case 'footer':
    case 'card':
      return 1.5
    default:
      return 1
  }
}

function pickFromWeightedMap(map: Map<string, number>, exclude?: Set<string>): string | null {
  const sorted = [...map.entries()]
    .filter(([key]) => (exclude ? !exclude.has(key) : true))
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : stringCmp(a[0], b[0])))
  return sorted[0]?.[0] ?? null
}

function inferToneFromBackgrounds(backgrounds: RgbColor[]): StyleSignalModel['colors']['backgroundTone'] {
  if (backgrounds.length === 0) return 'unknown'
  let dark = 0
  let light = 0
  for (const bg of backgrounds) {
    const lum = luminance(bg)
    if (lum <= 0.24) dark += 1
    else if (lum >= 0.72) light += 1
  }
  if (dark === 0 && light === 0) return 'mixed'
  const darkRatio = dark / backgrounds.length
  if (darkRatio >= 0.65) return 'dark'
  if (darkRatio <= 0.35) return 'light'
  return 'mixed'
}

function inferSignalsFromComputed(samples: ComputedStyleSample[]): InternalSignals {
  const accentWeights = new Map<string, number>()
  const neutralWeights = new Map<string, number>()
  const ctaWeights = new Map<string, number>()
  const bgColors: RgbColor[] = []
  const headingFonts = new Map<string, number>()
  const bodyFonts = new Map<string, number>()
  const headingSizes: number[] = []
  const bodySizes: number[] = []
  const headingWeights: number[] = []
  const bodyWeights: number[] = []
  const spacingValues: number[] = []
  const sectionSpacingValues: number[] = []
  const radiusValues: number[] = []

  let ctaStyleHint: StyleSignalModel['cta']['styleHint'] = 'unknown'
  let ctaProminence: StyleSignalModel['cta']['prominence'] = 'unknown'
  let shadowHint: StyleSignalModel['surfaces']['shadowHint'] = 'unknown'

  for (const sample of samples) {
    const weight = scoreByTarget(sample.target)

    const bg = parseColor(sample.styles.backgroundColor)
    if (bg && bg.a > 0.05) {
      bgColors.push(bg)
      const bgHex = colorToHex(bg)
      if (isNearNeutral(bg)) {
        neutralWeights.set(bgHex, (neutralWeights.get(bgHex) ?? 0) + weight)
      } else {
        accentWeights.set(bgHex, (accentWeights.get(bgHex) ?? 0) + weight * (sample.target === 'primary_cta' ? 1.35 : 1))
      }
      if (sample.target === 'primary_cta') {
        ctaWeights.set(bgHex, (ctaWeights.get(bgHex) ?? 0) + weight * 1.5)
      }
    }

    const fg = parseColor(sample.styles.color)
    if (fg && fg.a > 0.05) {
      const fgHex = colorToHex(fg)
      if (isNearNeutral(fg)) neutralWeights.set(fgHex, (neutralWeights.get(fgHex) ?? 0) + weight * 0.9)
      else accentWeights.set(fgHex, (accentWeights.get(fgHex) ?? 0) + weight * (sample.target === 'primary_cta' ? 1.2 : 0.8))
      if (sample.target === 'primary_cta') ctaWeights.set(fgHex, (ctaWeights.get(fgHex) ?? 0) + weight)
    }

    const font = normalizeFontFamily(sample.styles.fontFamily)
    if (font) {
      if (sample.target === 'h1' || sample.target === 'h2' || sample.target === 'h3' || sample.target === 'hero') {
        headingFonts.set(font, (headingFonts.get(font) ?? 0) + weight)
      }
      if (sample.target === 'body_text' || sample.target === 'root' || sample.target === 'footer') {
        bodyFonts.set(font, (bodyFonts.get(font) ?? 0) + weight)
      }
    }

    const fontSize = toPx(sample.styles.fontSize)
    if (fontSize != null) {
      if (sample.target === 'h1' || sample.target === 'h2' || sample.target === 'h3' || sample.target === 'hero') headingSizes.push(fontSize)
      if (sample.target === 'body_text' || sample.target === 'root' || sample.target === 'footer') bodySizes.push(fontSize)
    }

    const fontWeight = Number(sample.styles.fontWeight)
    if (Number.isFinite(fontWeight)) {
      if (sample.target === 'h1' || sample.target === 'h2' || sample.target === 'h3' || sample.target === 'hero') headingWeights.push(fontWeight)
      if (sample.target === 'body_text' || sample.target === 'root' || sample.target === 'footer') bodyWeights.push(fontWeight)
    }

    const paddings = [sample.styles.paddingTop, sample.styles.paddingRight, sample.styles.paddingBottom, sample.styles.paddingLeft]
      .map((entry) => toPx(entry))
      .filter((entry): entry is number => entry != null && entry >= 0)
    spacingValues.push(...paddings)
    if (sample.target === 'hero' || sample.target === 'card' || sample.target === 'footer' || sample.target === 'root') {
      sectionSpacingValues.push(...paddings)
    }

    const radius = toPx(sample.styles.borderRadius)
    if (radius != null && radius >= 0) {
      const allowZeroRadius = sample.target === "primary_cta" || sample.target === "card" || sample.target === "hero"
      if (radius > 0 || allowZeroRadius) radiusValues.push(radius)
    }

    if (sample.target === 'primary_cta') {
      const ctaBg = parseColor(sample.styles.backgroundColor)
      const ctaFg = parseColor(sample.styles.color)
      const hasPadding = paddings.some((value) => value >= 6)
      const hasRadius = radius != null && radius >= 4
      if (ctaBg && ctaBg.a > 0.1) {
        ctaStyleHint = ctaStyleHint === 'unknown' ? 'solid_button' : ctaStyleHint === 'text_link' ? 'mixed' : ctaStyleHint
      } else if (hasPadding || hasRadius) {
        ctaStyleHint = ctaStyleHint === 'unknown' ? 'outline_button' : ctaStyleHint === 'text_link' ? 'mixed' : ctaStyleHint
      } else {
        ctaStyleHint = ctaStyleHint === 'unknown' ? 'text_link' : ctaStyleHint
      }

      if (ctaBg && ctaFg) {
        const contrast = (Math.max(luminance(ctaBg), luminance(ctaFg)) + 0.05) / (Math.min(luminance(ctaBg), luminance(ctaFg)) + 0.05)
        ctaProminence = contrast >= 4.5 ? 'high' : contrast >= 2.7 ? 'medium' : 'low'
      } else {
        ctaProminence = hasPadding || hasRadius ? 'medium' : 'low'
      }
    }

    const classToken = normalizeClassToken(sample.className)
    if (classToken.includes('shadow-xl') || classToken.includes('shadow-lg') || classToken.includes('elevat')) shadowHint = 'elevated'
    else if ((classToken.includes('shadow') || classToken.includes('drop-shadow')) && shadowHint === 'unknown') shadowHint = 'soft'
    else if (shadowHint === 'unknown') shadowHint = 'flat'
  }

  const headingFontFamily = pickFromWeightedMap(headingFonts)
  const bodyFontFamily = pickFromWeightedMap(bodyFonts)

  const headingAvgSize = headingSizes.length > 0 ? headingSizes.reduce((sum, value) => sum + value, 0) / headingSizes.length : null
  const bodyAvgSize = bodySizes.length > 0 ? bodySizes.reduce((sum, value) => sum + value, 0) / bodySizes.length : null
  const scaleRatio = headingAvgSize && bodyAvgSize ? headingAvgSize / Math.max(1, bodyAvgSize) : null
  const scaleHint: StyleSignalModel['typography']['scaleHint'] =
    scaleRatio == null ? 'unknown' : scaleRatio >= 2 ? 'large' : scaleRatio <= 1.45 ? 'compact' : 'balanced'

  const headingAvgWeight = headingWeights.length > 0 ? headingWeights.reduce((sum, value) => sum + value, 0) / headingWeights.length : null
  const bodyAvgWeight = bodyWeights.length > 0 ? bodyWeights.reduce((sum, value) => sum + value, 0) / bodyWeights.length : null
  const weightContrastHint: StyleSignalModel['typography']['weightContrastHint'] =
    headingAvgWeight == null || bodyAvgWeight == null
      ? 'unknown'
      : Math.abs(headingAvgWeight - bodyAvgWeight) >= 250
      ? 'high'
      : Math.abs(headingAvgWeight - bodyAvgWeight) >= 120
      ? 'medium'
      : 'low'

  const spacingAvg = spacingValues.length > 0 ? spacingValues.reduce((sum, value) => sum + value, 0) / spacingValues.length : null
  const sectionSpacingAvg = sectionSpacingValues.length > 0 ? sectionSpacingValues.reduce((sum, value) => sum + value, 0) / sectionSpacingValues.length : spacingAvg
  const rhythm: StyleSignalModel['spacing']['rhythm'] =
    spacingAvg == null ? 'unknown' : spacingAvg >= 24 ? 'airy' : spacingAvg <= 11 ? 'tight' : 'balanced'
  const sectionSpacingHint: StyleSignalModel['spacing']['sectionSpacingHint'] =
    sectionSpacingAvg == null ? 'unknown' : sectionSpacingAvg >= 28 ? 'airy' : sectionSpacingAvg <= 12 ? 'tight' : 'balanced'

  const layoutDensity: StyleSignalModel['spacing']['layoutDensity'] =
    spacingAvg == null ? 'unknown' : spacingAvg >= 20 ? 'airy' : spacingAvg <= 10 ? 'dense' : 'balanced'

  const roundedCount = radiusValues.filter((value) => value >= 8).length
  const sharpCount = radiusValues.filter((value) => value <= 2).length
  let radiusHint: StyleSignalModel['surfaces']['radiusHint'] = 'unknown'
  if (radiusValues.length > 0) {
    if (roundedCount / radiusValues.length >= 0.65) radiusHint = 'rounded'
    else if (sharpCount / radiusValues.length >= 0.65) radiusHint = 'sharp'
    else radiusHint = 'mixed'
  }

  const primaryAccent = pickFromWeightedMap(accentWeights)
  const secondaryAccent = primaryAccent ? pickFromWeightedMap(accentWeights, new Set([primaryAccent])) : pickFromWeightedMap(accentWeights)
  const neutralPalette = [...neutralWeights.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : stringCmp(a[0], b[0])))
    .map(([value]) => value)
    .slice(0, 4)

  return {
    computedPrimaryAccent: primaryAccent,
    computedSecondaryAccent: secondaryAccent,
    computedBackgroundTone: inferToneFromBackgrounds(bgColors),
    computedNeutralPalette: neutralPalette,
    computedCtaColorHint: pickFromWeightedMap(ctaWeights),
    computedHeadingFontFamily: headingFontFamily,
    computedBodyFontFamily: bodyFontFamily,
    computedScaleHint: scaleHint,
    computedWeightContrast: weightContrastHint,
    computedRhythm: rhythm,
    computedSectionSpacing: sectionSpacingHint,
    computedDensity: layoutDensity,
    computedRadiusHint: radiusHint,
    computedShadowHint: shadowHint,
    computedCtaStyleHint: ctaStyleHint,
    computedCtaProminence: ctaProminence,
  }
}

function inferFallbackFromPreparedSite(preparedSite: PreparedSiteModel | null | undefined): {
  colors: StyleSignalModel['colors']
  typography: StyleSignalModel['typography']
  spacing: StyleSignalModel['spacing']
  surfaces: StyleSignalModel['surfaces']
  cta: StyleSignalModel['cta']
  visualToneHint: StyleSignalModel['visualToneHint']
} {
  if (!preparedSite || preparedSite.documents.length === 0) {
    return {
      colors: { backgroundTone: 'unknown', primaryAccent: null, secondaryAccent: null, neutralPalette: [], ctaColorHint: null },
      typography: {
        headingFontFamily: null,
        bodyFontFamily: null,
        headingCategory: 'unknown',
        bodyCategory: 'unknown',
        scaleHint: 'unknown',
        weightContrastHint: 'unknown',
      },
      spacing: { rhythm: 'unknown', sectionSpacingHint: 'unknown', layoutDensity: 'unknown' },
      surfaces: { radiusHint: 'unknown', shadowHint: 'unknown' },
      cta: { prominence: 'unknown', styleHint: 'unknown' },
      visualToneHint: 'unknown',
    }
  }

  const entryDoc = preparedSite.documents.find((doc) => doc.isEntry) ?? preparedSite.documents[0]!
  const semantic = entryDoc.semantic
  const brand = semantic?.brandSignals

  const primaryAccent = brand?.accentColors[0] ?? brand?.dominantColors[0] ?? null
  const secondaryAccent = brand?.accentColors[1] ?? brand?.dominantColors[1] ?? null
  const headingFontFamily = brand?.fontFamilyHints[0] ?? null
  const bodyFontFamily = brand?.fontFamilyHints[1] ?? brand?.fontFamilyHints[0] ?? null

  const sectionCount = semantic?.sections.length ?? 0
  const ctaCount = semantic?.ctaCandidates.length ?? 0
  const avgTextDensity = sectionCount > 0
    ? semantic!.sections.reduce((sum, section) => sum + section.density.textDensity, 0) / sectionCount
    : 0

  let visualToneHint: StyleSignalModel['visualToneHint'] = 'unknown'
  if (brand?.visualTone === 'formal') visualToneHint = 'editorial'
  else if (brand?.visualTone === 'playful') visualToneHint = 'playful'
  else if (brand?.visualTone === 'neutral') visualToneHint = ctaCount >= 3 ? 'corporate' : 'minimal'

  const bodyToken = normalizeClassToken(entryDoc.fidelity.bodyClass)
  const radiusHint: StyleSignalModel['surfaces']['radiusHint'] = bodyToken.includes('rounded') ? 'rounded' : 'unknown'
  const shadowHint: StyleSignalModel['surfaces']['shadowHint'] = bodyToken.includes('shadow') ? 'soft' : 'flat'

  const categoryFromHints = (): StyleSignalModel['typography']['headingCategory'] => {
    const first = brand?.fontCategoryHints[0]
    if (first === 'monospace') return 'mono'
    if (first === 'sans' || first === 'serif' || first === 'display') return first
    return 'unknown'
  }

  return {
    colors: {
      backgroundTone: brand?.neutralPaletteHints.some((hint) => hint.includes('dark')) ? 'dark' : 'light',
      primaryAccent,
      secondaryAccent,
      neutralPalette: brand?.neutralPaletteHints ?? [],
      ctaColorHint: semantic?.primaryCta ? primaryAccent : null,
    },
    typography: {
      headingFontFamily,
      bodyFontFamily,
      headingCategory: categoryFromHints(),
      bodyCategory: brand?.fontCategoryHints.includes('sans') ? 'sans' : categoryFromHints(),
      scaleHint: avgTextDensity >= 0.62 ? 'compact' : avgTextDensity <= 0.3 ? 'large' : 'balanced',
      weightContrastHint: 'unknown',
    },
    spacing: {
      rhythm: avgTextDensity >= 0.65 ? 'tight' : avgTextDensity <= 0.28 ? 'airy' : 'balanced',
      sectionSpacingHint: sectionCount >= 10 ? 'tight' : sectionCount <= 4 ? 'airy' : 'balanced',
      layoutDensity: sectionCount >= 10 ? 'dense' : sectionCount <= 4 ? 'airy' : 'balanced',
    },
    surfaces: {
      radiusHint,
      shadowHint,
    },
    cta: {
      prominence: ctaCount >= 3 ? 'high' : ctaCount > 0 ? 'medium' : 'low',
      styleHint: ctaCount > 0 ? 'outline_button' : 'unknown',
    },
    visualToneHint,
  }
}

function mergePreferred<T>(preferred: T, fallback: T, isUnknown: (value: T) => boolean): T {
  return isUnknown(preferred) ? fallback : preferred
}

function isNullishOrUnknown(value: string | null): boolean {
  return value == null || value === 'unknown'
}

function normalizeDiagnostics(input: StyleSignalDiagnostic[]): StyleSignalDiagnostic[] {
  const byCode = new Map<StyleSignalDiagnosticCode, StyleSignalDiagnostic>()
  for (const item of input) {
    if (!byCode.has(item.code)) byCode.set(item.code, item)
  }
  return [...byCode.values()].sort((a, b) => stringCmp(a.code, b.code))
}

function deriveVisualTone(input: {
  spacing: StyleSignalModel['spacing']
  typography: StyleSignalModel['typography']
  colors: StyleSignalModel['colors']
  cta: StyleSignalModel['cta']
}): StyleSignalModel['visualToneHint'] {
  if (input.cta.prominence === 'high' && input.colors.primaryAccent) return 'corporate'
  if (input.spacing.rhythm === 'airy' && (input.typography.headingCategory === 'serif' || input.typography.headingCategory === 'display')) return 'premium'
  if (input.spacing.layoutDensity === 'dense' && input.typography.scaleHint === 'compact') return 'corporate'
  if (input.colors.backgroundTone === 'dark' && input.colors.primaryAccent) return 'playful'
  if (input.typography.bodyCategory === 'serif' && input.spacing.rhythm !== 'tight') return 'editorial'
  if (input.colors.primaryAccent == null && input.colors.secondaryAccent == null) return 'minimal'
  return 'unknown'
}

export function extractStyleSignalModel(input: {
  computedStyleSamples?: ComputedStyleSample[] | null
  preparedSite?: PreparedSiteModel | null
  visualAnalysis?: VisualAnalysisModel | null
}): StyleSignalModel {
  const computedStyleSamples = (input.computedStyleSamples ?? []).filter((sample) => sample?.kind === 'computed_style_sample_v1')
  const hasComputed = computedStyleSamples.length >= 3
  const computedSignals = inferSignalsFromComputed(computedStyleSamples)
  const fallbackSignals = inferFallbackFromPreparedSite(input.preparedSite)

  const sourceMode: StyleSignalSourceMode =
    hasComputed
      ? (input.preparedSite ? 'mixed' : 'computed_style')
      : 'html_css_inference'

  const colors: StyleSignalModel['colors'] = {
    backgroundTone: mergePreferred(
      computedSignals.computedBackgroundTone,
      fallbackSignals.colors.backgroundTone,
      (value) => value === 'unknown',
    ),
    primaryAccent: computedSignals.computedPrimaryAccent ?? fallbackSignals.colors.primaryAccent,
    secondaryAccent:
      (computedSignals.computedSecondaryAccent && computedSignals.computedSecondaryAccent !== computedSignals.computedPrimaryAccent)
        ? computedSignals.computedSecondaryAccent
        : fallbackSignals.colors.secondaryAccent,
    neutralPalette: uniqueSorted([
      ...computedSignals.computedNeutralPalette,
      ...fallbackSignals.colors.neutralPalette,
    ]).slice(0, 4),
    ctaColorHint: computedSignals.computedCtaColorHint ?? fallbackSignals.colors.ctaColorHint,
  }

  const typography: StyleSignalModel['typography'] = {
    headingFontFamily: computedSignals.computedHeadingFontFamily ?? fallbackSignals.typography.headingFontFamily,
    bodyFontFamily: computedSignals.computedBodyFontFamily ?? fallbackSignals.typography.bodyFontFamily,
    headingCategory: fontCategoryFromFamily(computedSignals.computedHeadingFontFamily) !== 'unknown'
      ? fontCategoryFromFamily(computedSignals.computedHeadingFontFamily)
      : fallbackSignals.typography.headingCategory,
    bodyCategory: fontCategoryFromFamily(computedSignals.computedBodyFontFamily) !== 'unknown'
      ? fontCategoryFromFamily(computedSignals.computedBodyFontFamily)
      : fallbackSignals.typography.bodyCategory,
    scaleHint: mergePreferred(computedSignals.computedScaleHint, fallbackSignals.typography.scaleHint, (value) => value === 'unknown'),
    weightContrastHint: mergePreferred(
      computedSignals.computedWeightContrast,
      fallbackSignals.typography.weightContrastHint,
      (value) => value === 'unknown',
    ),
  }

  const visualDensityFromVisual: StyleSignalModel['spacing']['layoutDensity'] =
    input.visualAnalysis?.pageObservations.visualDensity === 'high'
      ? 'dense'
      : input.visualAnalysis?.pageObservations.visualDensity === 'low'
      ? 'airy'
      : input.visualAnalysis?.pageObservations.visualDensity === 'medium'
      ? 'balanced'
      : 'unknown'

  const spacing: StyleSignalModel['spacing'] = {
    rhythm: mergePreferred(computedSignals.computedRhythm, fallbackSignals.spacing.rhythm, (value) => value === 'unknown'),
    sectionSpacingHint: mergePreferred(
      computedSignals.computedSectionSpacing,
      fallbackSignals.spacing.sectionSpacingHint,
      (value) => value === 'unknown',
    ),
    layoutDensity: computedSignals.computedDensity !== 'unknown'
      ? computedSignals.computedDensity
      : visualDensityFromVisual !== 'unknown'
      ? visualDensityFromVisual
      : fallbackSignals.spacing.layoutDensity,
  }

  const surfaces: StyleSignalModel['surfaces'] = {
    radiusHint: mergePreferred(computedSignals.computedRadiusHint, fallbackSignals.surfaces.radiusHint, (value) => value === 'unknown'),
    shadowHint: mergePreferred(computedSignals.computedShadowHint, fallbackSignals.surfaces.shadowHint, (value) => value === 'unknown'),
  }

  const cta: StyleSignalModel['cta'] = {
    styleHint: mergePreferred(computedSignals.computedCtaStyleHint, fallbackSignals.cta.styleHint, (value) => value === 'unknown'),
    prominence: mergePreferred(computedSignals.computedCtaProminence, fallbackSignals.cta.prominence, (value) => value === 'unknown'),
  }

  const diagnostics: StyleSignalDiagnostic[] = []
  if (!hasComputed) {
    diagnostics.push({
      code: 'STYLE_SIGNAL_COMPUTED_SAMPLE_MISSING',
      severity: 'warning',
      message: 'Computed style samples were missing or weak; style signals relied on HTML/CSS inference fallback.',
    })
    diagnostics.push({
      code: 'STYLE_SIGNAL_USING_HTML_FALLBACK',
      severity: 'info',
      message: 'Fallback style inference path is active for this import.',
    })
  } else if (sourceMode === 'mixed') {
    diagnostics.push({
      code: 'STYLE_SIGNAL_USING_HTML_FALLBACK',
      severity: 'info',
      message: 'Computed style samples were used with fallback inference to fill missing style fields.',
    })
  }

  if (colors.primaryAccent == null && colors.secondaryAccent == null) {
    diagnostics.push({
      code: 'STYLE_COLOR_SIGNAL_WEAK',
      severity: 'warning',
      message: 'Primary/secondary accent colors were not confidently identified.',
    })
  }
  if (colors.backgroundTone === 'mixed') {
    diagnostics.push({
      code: 'STYLE_COLOR_SIGNAL_MIXED',
      severity: 'info',
      message: 'Background tone appears mixed rather than strongly light or dark.',
    })
  }

  if (isNullishOrUnknown(typography.headingFontFamily) && isNullishOrUnknown(typography.bodyFontFamily)) {
    diagnostics.push({
      code: 'STYLE_TYPOGRAPHY_SIGNAL_WEAK',
      severity: 'warning',
      message: 'Typography family hints are weak or unavailable.',
    })
  }
  if (!hasComputed && (!isNullishOrUnknown(typography.headingFontFamily) || !isNullishOrUnknown(typography.bodyFontFamily))) {
    diagnostics.push({
      code: 'STYLE_TYPOGRAPHY_FALLBACK_INFERRED',
      severity: 'info',
      message: 'Typography hints were inferred via fallback signals.',
    })
  }

  if (spacing.rhythm === 'unknown' && spacing.layoutDensity === 'unknown') {
    diagnostics.push({
      code: 'STYLE_SPACING_SIGNAL_WEAK',
      severity: 'warning',
      message: 'Spacing rhythm and density hints are weak.',
    })
  }

  if (cta.styleHint === 'unknown' && cta.prominence === 'unknown') {
    diagnostics.push({
      code: 'STYLE_CTA_SIGNAL_WEAK',
      severity: 'warning',
      message: 'CTA style and prominence could not be confidently inferred.',
    })
  }

  if (surfaces.radiusHint === 'unknown' && surfaces.shadowHint === 'unknown') {
    diagnostics.push({
      code: 'STYLE_SURFACE_SIGNAL_WEAK',
      severity: 'info',
      message: 'Surface radius/shadow hints are weak.',
    })
  }

  const weakMetricCount = [
    colors.primaryAccent == null,
    typography.headingCategory === 'unknown' && typography.bodyCategory === 'unknown',
    spacing.rhythm === 'unknown',
    cta.styleHint === 'unknown',
    surfaces.radiusHint === 'unknown' && surfaces.shadowHint === 'unknown',
  ].filter(Boolean).length

  if (weakMetricCount >= 4) {
    diagnostics.push({
      code: 'STYLE_SIGNAL_WEAK',
      severity: 'warning',
      message: 'Most style signals are weak; downstream design should remain conservative.',
    })
  } else if (weakMetricCount >= 2) {
    diagnostics.push({
      code: 'STYLE_SIGNAL_PARTIAL',
      severity: 'info',
      message: 'Style signal extraction is partial; downstream decisions should combine style and structure evidence.',
    })
  }

  const visualToneHint = deriveVisualTone({ spacing, typography, colors, cta })

  return {
    kind: 'style_signal_model_v2',
    version: STYLE_SIGNAL_MODEL_VERSION,
    sourceMode,
    colors,
    typography,
    spacing,
    surfaces,
    cta,
    visualToneHint,
    diagnostics: normalizeDiagnostics(diagnostics),
  }
}

export function styleSignalsToSemanticLabels(model: StyleSignalModel): string[] {
  return uniqueSorted([
    `style.source_mode:${model.sourceMode}`,
    `style.background_tone:${model.colors.backgroundTone}`,
    `style.primary_accent:${model.colors.primaryAccent ?? 'none'}`,
    `style.secondary_accent:${model.colors.secondaryAccent ?? 'none'}`,
    `style.typography.heading_category:${model.typography.headingCategory}`,
    `style.typography.body_category:${model.typography.bodyCategory}`,
    `style.spacing.rhythm:${model.spacing.rhythm}`,
    `style.spacing.density:${model.spacing.layoutDensity}`,
    `style.cta.style:${model.cta.styleHint}`,
    `style.cta.prominence:${model.cta.prominence}`,
    `style.surfaces.radius:${model.surfaces.radiusHint}`,
    `style.surfaces.shadow:${model.surfaces.shadowHint}`,
    `style.visual_tone:${model.visualToneHint}`,
    ...model.diagnostics.map((diag) => `style.diagnostic:${diag.code}`),
  ])
}

export function styleSignalsToStyleTokens(model: StyleSignalModel): Record<string, string> {
  const spacingToken =
    model.spacing.sectionSpacingHint === 'airy'
      ? '64px'
      : model.spacing.sectionSpacingHint === 'tight'
      ? '32px'
      : '48px'
  const radiusToken =
    model.surfaces.radiusHint === 'rounded'
      ? '12px'
      : model.surfaces.radiusHint === 'sharp'
      ? '2px'
      : '8px'

  return {
    'color.background': model.colors.backgroundTone === 'dark' ? '#111827' : '#ffffff',
    'color.text': model.colors.backgroundTone === 'dark' ? '#f8fafc' : '#111111',
    'color.accent.primary': model.colors.primaryAccent ?? '#2563eb',
    'color.accent.secondary': model.colors.secondaryAccent ?? (model.colors.primaryAccent ?? '#1d4ed8'),
    'color.cta': model.colors.ctaColorHint ?? (model.colors.primaryAccent ?? '#2563eb'),
    'spacing.section': spacingToken,
    'radius.component': radiusToken,
  }
}
