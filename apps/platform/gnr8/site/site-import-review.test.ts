import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeSiteImportAnalysis } from './site-import-analysis'
import { cleanImportedHtml } from './site-import-html-cleanup'
import { buildSiteImportRequestPayload } from './site-import-multipage-ui'
import { brandStyleKitCss, buildBrandStyleKit } from './brand-style-kit'
import type { StyleSignalModel } from '@/gnr8/style-signals/style-signal-model'

test('review defaults to the source language and passes selected routes to acquisition', () => {
  const analysis = summarizeSiteImportAnalysis('https://example.com/', `
    <html lang="sl"><head><link rel="alternate" hreflang="en" href="https://example.com/en/"></head>
    <body><form role="search"><input type="search"></form><a href="/blog/post">Post</a></body></html>
  `, [
    { path: '/', title: 'Home', role: 'homepage' },
    { path: '/blog/post', title: 'Post', role: 'article' },
    { path: '/en/about', title: 'About', role: 'standard' },
  ])
  assert.deepEqual(analysis.languages, ['sl', 'en'])
  assert.equal(analysis.routes.find((route) => route.path === '/en/about')?.language, 'en')
  assert.equal(analysis.blogPostCount, 1)
  assert.equal(analysis.features.search, true)
  const selectedRoutes = analysis.routes.filter((route) => route.language === analysis.baseLanguage).map((route) => route.path)
  const payload = buildSiteImportRequestPayload({
    url: analysis.sourceUrl, agencyId: 'agency', multiPageImportEnabled: true, selectedRoutes,
  })
  assert.deepEqual(payload.multiPageDiscovery?.selectedRoutes, ['/', '/blog/post'])
})

test('HTML cleanup removes tracking and only chosen optional controls', () => {
  const html = `<html><head><script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script></head><body>
    <header><img src="/logo.webp"></header><main><h1>Keep this content</h1><img loading="lazy" src="/hero.webp">
    <form class="search-form"><input type="search"></form><form id="contact"><input name="email"></form>
    <div class="cookie-banner">Cookie choice</div><button class="back-to-top">Top</button></main></body></html>`
  const clean = cleanImportedHtml(html, { omitCookies: true, omitBackToTop: true, omitSearch: true, lazyLoadImages: false })
  assert.match(clean, /Keep this content/)
  assert.match(clean, /id="contact"/)
  assert.doesNotMatch(clean, /googletagmanager|cookie-banner|back-to-top|search-form|loading="lazy"/)
  assert.equal(cleanImportedHtml(clean, { omitCookies: true, omitBackToTop: true, omitSearch: true, lazyLoadImages: false }), clean)
})

test('brand kit exports observed values and leaves unknown animation unclaimed', () => {
  const signals = {
    sourceMode: 'computed_style',
    colors: { primaryAccent: '#f36e21', secondaryAccent: null, ctaColorHint: '#f36e21', neutralPalette: ['#fff'] },
    typography: { headingFontFamily: 'Inter', bodyFontFamily: 'Arial' },
  } as StyleSignalModel
  const kit = buildBrandStyleKit({ sourceUrl: 'https://example.com', signals, samples: [], assets: [] })
  const css = brandStyleKitCss(kit)
  assert.match(css, /--brand-500: #f36e21/)
  assert.match(css, /--primary-family: Arial/)
  assert.doesNotMatch(css, /--brand-section-space/)
  assert.equal(kit.animation.status, 'not_sampled')
  assert.equal(kit.status, 'candidate_requires_review')
})
