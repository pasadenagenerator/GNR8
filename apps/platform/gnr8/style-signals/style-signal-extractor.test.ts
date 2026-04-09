import assert from 'node:assert/strict'
import test from 'node:test'

import { extractStyleSignalModel } from '@/gnr8/style-signals'

test('computed-style extraction derives color, typography, spacing and CTA signals', () => {
  const model = extractStyleSignalModel({
    computedStyleSamples: [
      {
        kind: 'computed_style_sample_v1',
        sampleId: 'root',
        target: 'root',
        selector: 'body',
        tagName: 'body',
        className: 'page shadow-sm',
        styles: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '16px',
          fontWeight: '400',
          lineHeight: '24px',
          color: 'rgb(17, 24, 39)',
          backgroundColor: 'rgb(15, 23, 42)',
          borderRadius: '0px',
          paddingTop: '20px',
          paddingRight: '20px',
          paddingBottom: '20px',
          paddingLeft: '20px',
        },
      },
      {
        kind: 'computed_style_sample_v1',
        sampleId: 'h1',
        target: 'h1',
        selector: 'h1',
        tagName: 'h1',
        className: 'hero-title',
        styles: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '42px',
          fontWeight: '700',
          lineHeight: '46px',
          color: '#e2e8f0',
          backgroundColor: 'transparent',
          borderRadius: '0px',
          paddingTop: '4px',
          paddingRight: '0px',
          paddingBottom: '4px',
          paddingLeft: '0px',
        },
      },
      {
        kind: 'computed_style_sample_v1',
        sampleId: 'cta',
        target: 'primary_cta',
        selector: 'a.button',
        tagName: 'a',
        className: 'btn shadow-lg',
        styles: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          lineHeight: '20px',
          color: '#ffffff',
          backgroundColor: '#2563eb',
          borderRadius: '12px',
          paddingTop: '12px',
          paddingRight: '22px',
          paddingBottom: '12px',
          paddingLeft: '22px',
        },
      },
    ] as any,
  })

  assert.equal(model.sourceMode, 'computed_style')
  assert.equal(model.provenance.computedStyle.used, true)
  assert.equal(model.provenance.computedStyle.sampleCount, 3)
  assert.equal(model.provenance.fallbackUsed, false)
  assert.equal(model.colors.backgroundTone, 'dark')
  assert.equal(model.colors.primaryAccent, '#2563eb')
  assert.equal(model.typography.headingCategory, 'sans')
  assert.equal(model.typography.scaleHint, 'large')
  assert.equal(model.spacing.rhythm, 'balanced')
  assert.equal(model.cta.styleHint, 'solid_button')
  assert.equal(model.cta.prominence, 'high')
  assert.equal(model.surfaces.radiusHint, 'rounded')
})

test('fallback extraction derives signals when computed samples are missing', () => {
  const model = extractStyleSignalModel({
    computedStyleSamples: [],
    preparedSite: {
      documents: [
        {
          isEntry: true,
          fidelity: { bodyClass: 'landing rounded-xl' },
          semantic: {
            sections: Array.from({ length: 3 }).map(() => ({ density: { textDensity: 0.18 } })),
            ctaCandidates: [{ label: 'Book demo', confidence: 'high', rationale: [] }],
            primaryCta: { label: 'Book demo' },
            brandSignals: {
              dominantColors: ['#0f172a'],
              accentColors: ['#0ea5e9'],
              neutralPaletteHints: ['light-neutral'],
              fontFamilyHints: ['Merriweather', 'Inter'],
              fontCategoryHints: ['serif'],
              visualTone: 'formal',
            },
          },
        },
      ],
    } as any,
  })

  assert.equal(model.sourceMode, 'html_css_inference')
  assert.equal(model.provenance.computedStyle.used, false)
  assert.equal(model.provenance.fallbackUsed, true)
  assert.equal(model.colors.primaryAccent, '#0ea5e9')
  assert.equal(model.typography.headingCategory, 'serif')
  assert.equal(model.spacing.layoutDensity, 'airy')
  assert.equal(model.cta.prominence, 'medium')
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_SIGNAL_COMPUTED_SAMPLE_MISSING'))
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_SIGNAL_USING_HTML_FALLBACK'))
})

test('weak signal diagnostics remain explicit instead of pretending certainty', () => {
  const model = extractStyleSignalModel({
    computedStyleSamples: [],
    preparedSite: { documents: [] } as any,
  })

  assert.equal(model.colors.primaryAccent, null)
  assert.equal(model.typography.headingCategory, 'unknown')
  assert.equal(model.cta.styleHint, 'unknown')
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_SIGNAL_WEAK'))
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_COLOR_SIGNAL_WEAK'))
})

test('strong rendered capture with html inference emits explicit computed-style-not-used diagnostic', () => {
  const model = extractStyleSignalModel({
    computedStyleSamples: [],
    preparedSite: { documents: [] } as any,
    renderedCaptureContext: {
      status: 'available',
      quality: 'strong',
    },
  })

  assert.equal(model.sourceMode, 'html_css_inference')
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_SIGNAL_COMPUTED_STYLE_NOT_USED'))
})

test('low computed style coverage emits explicit low-coverage diagnostic', () => {
  const model = extractStyleSignalModel({
    computedStyleSamples: [
      {
        kind: 'computed_style_sample_v1',
        sampleId: 'root',
        target: 'root',
        selector: 'body',
        tagName: 'body',
        className: null,
        styles: {
          fontFamily: 'Inter',
          fontSize: '16px',
          fontWeight: '400',
          lineHeight: '24px',
          color: '#111111',
          backgroundColor: '#ffffff',
          borderRadius: '0px',
          paddingTop: '0px',
          paddingRight: '0px',
          paddingBottom: '0px',
          paddingLeft: '0px',
        },
      },
    ] as any,
  })

  assert.equal(model.provenance.computedStyle.coverage, 0.1)
  assert.ok(model.diagnostics.some((diag) => diag.code === 'STYLE_SAMPLE_LOW_COVERAGE'))
})
