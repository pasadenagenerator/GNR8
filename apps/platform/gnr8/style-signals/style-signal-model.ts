export const STYLE_SIGNAL_MODEL_VERSION = '2.0.0' as const

export type StyleSignalSourceMode = 'computed_style' | 'html_css_inference' | 'mixed'

export type StyleSignalSeverity = 'info' | 'warning'

export type StyleSignalDiagnosticCode =
  | 'STYLE_SIGNAL_WEAK'
  | 'STYLE_SIGNAL_PARTIAL'
  | 'STYLE_SIGNAL_COMPUTED_SAMPLE_MISSING'
  | 'STYLE_SIGNAL_COMPUTED_STYLE_NOT_USED'
  | 'STYLE_SIGNAL_RENDERED_DOM_USED'
  | 'STYLE_SIGNAL_COMPUTED_DOMINANT'
  | 'STYLE_SAMPLE_LOW_COVERAGE'
  | 'STYLE_SIGNAL_USING_HTML_FALLBACK'
  | 'STYLE_COLOR_SIGNAL_WEAK'
  | 'STYLE_COLOR_SIGNAL_MIXED'
  | 'STYLE_SIGNAL_COLOR_CONFIDENCE_MEDIUM'
  | 'STYLE_TYPOGRAPHY_SIGNAL_WEAK'
  | 'STYLE_TYPOGRAPHY_FALLBACK_INFERRED'
  | 'STYLE_SIGNAL_TYPOGRAPHY_CONFIDENCE_MEDIUM'
  | 'STYLE_SPACING_SIGNAL_WEAK'
  | 'STYLE_SIGNAL_SPACING_CONFIDENCE_MEDIUM'
  | 'STYLE_CTA_SIGNAL_WEAK'
  | 'STYLE_SIGNAL_CTA_CONFIDENCE_LOW'
  | 'STYLE_SURFACE_SIGNAL_WEAK'

export type StyleSignalDiagnostic = {
  code: StyleSignalDiagnosticCode
  severity: StyleSignalSeverity
  message: string
}

export type ColorSignalModel = {
  backgroundTone: 'light' | 'dark' | 'mixed' | 'unknown'
  primaryAccent: string | null
  secondaryAccent: string | null
  neutralPalette: string[]
  ctaColorHint: string | null
}

export type TypographySignalModel = {
  headingFontFamily: string | null
  bodyFontFamily: string | null
  headingCategory: 'sans' | 'serif' | 'display' | 'mono' | 'unknown'
  bodyCategory: 'sans' | 'serif' | 'display' | 'mono' | 'unknown'
  scaleHint: 'compact' | 'balanced' | 'large' | 'unknown'
  weightContrastHint: 'low' | 'medium' | 'high' | 'unknown'
}

export type SpacingSignalModel = {
  rhythm: 'tight' | 'balanced' | 'airy' | 'unknown'
  sectionSpacingHint: 'tight' | 'balanced' | 'airy' | 'unknown'
  layoutDensity: 'dense' | 'balanced' | 'airy' | 'unknown'
}

export type SurfaceStyleSignal = {
  radiusHint: 'sharp' | 'rounded' | 'mixed' | 'unknown'
  shadowHint: 'flat' | 'soft' | 'elevated' | 'mixed' | 'unknown'
}

export type CtaStyleSignal = {
  prominence: 'low' | 'medium' | 'high' | 'unknown'
  styleHint: 'text_link' | 'outline_button' | 'solid_button' | 'mixed' | 'unknown'
}

export type StyleSignalModel = {
  kind: 'style_signal_model_v2'
  version: typeof STYLE_SIGNAL_MODEL_VERSION
  sourceMode: StyleSignalSourceMode
  provenance: {
    sourceMode: StyleSignalSourceMode
    computedStyle: {
      used: boolean
      sampleCount: number
      coverage: number
    }
    fallbackUsed: boolean
    diagnostics: string[]
  }
  colors: ColorSignalModel
  typography: TypographySignalModel
  spacing: SpacingSignalModel
  surfaces: SurfaceStyleSignal
  cta: CtaStyleSignal
  visualToneHint: 'minimal' | 'editorial' | 'corporate' | 'playful' | 'premium' | 'unknown'
  diagnostics: StyleSignalDiagnostic[]
}
