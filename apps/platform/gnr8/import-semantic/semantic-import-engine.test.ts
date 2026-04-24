import assert from 'node:assert/strict'
import test from 'node:test'

import { runSemanticImportEngine } from '@/gnr8/import-semantic/semantic-import-engine'

test('semantic engine detects hero with cta', () => {
  const html = `<!doctype html><html lang="en"><head><title>Acme</title></head><body>
  <header><a href="/"><img src="/assets/logo.svg" alt="Acme logo"></a></header>
  <section><h1>Build better sites</h1><p>Launch quickly with our templates.</p><a href="/contact">Get started</a><img src="/assets/hero.jpg" alt="Hero"></section>
  </body></html>`

  const result = runSemanticImportEngine({
    normalizedHtml: html,
    entryHtmlPath: 'index.html',
    captureMode: 'raw_html_only',
  })

  assert.equal(result.sourceMode, 'raw_html_only')
  assert.equal(result.hero?.title, 'Build better sites')
  assert.equal(result.hero?.cta?.label, 'Get started')
  assert.ok(result.diagnostics.some((diag) => diag.code === 'HERO_DETECTED'))
})

test('semantic engine detects gallery', () => {
  const html = `<!doctype html><html><body>
  <section id="gallery"><h2>Gallery</h2>
    <img src="/img/g1.jpg"><img src="/img/g2.jpg"><img src="/img/g3.jpg"><img src="/img/g4.jpg">
  </section>
  </body></html>`

  const result = runSemanticImportEngine({ normalizedHtml: html, entryHtmlPath: 'index.html' })
  assert.ok(result.sections.some((section) => section.type === 'gallery'))
  assert.ok(result.diagnostics.some((diag) => diag.code === 'GALLERY_DETECTED'))
  assert.ok((result.assets.groupedByRole.gallery_image ?? []).length >= 4)
})

test('semantic engine detects service cards', () => {
  const html = `<!doctype html><html><body>
  <section class="services"><h2>Services</h2>
    <div><h3>Design</h3><p>Modern layouts</p></div>
    <div><h3>Development</h3><p>Production websites</p></div>
    <div><h3>SEO</h3><p>Grow your traffic</p></div>
  </section>
  </body></html>`

  const result = runSemanticImportEngine({ normalizedHtml: html, entryHtmlPath: 'index.html' })
  const services = result.sections.find((section) => section.type === 'services')
  assert.ok(services)
  assert.ok((services?.items.length ?? 0) >= 2)
  assert.ok(result.diagnostics.some((diag) => diag.code === 'SERVICE_GROUP_DETECTED'))
})

test('semantic engine detects contact form section', () => {
  const html = `<!doctype html><html><body>
  <section id="contact"><h2>Contact</h2><p>Email us at hello@example.com</p>
    <form action="/submit" method="post"><input name="name"><input name="email"><textarea name="message"></textarea></form>
  </section>
  </body></html>`

  const result = runSemanticImportEngine({ normalizedHtml: html, entryHtmlPath: 'index.html' })
  const contact = result.sections.find((section) => section.type === 'contact')
  assert.ok(contact)
  assert.ok((contact?.forms[0]?.fieldCount ?? 0) >= 3)
  assert.ok(result.diagnostics.some((diag) => diag.code === 'CONTACT_SECTION_DETECTED'))
})

test('semantic engine extracts logo header nav content', () => {
  const html = `<!doctype html><html><body>
  <header><img src="/assets/logo.svg" alt="Brand logo"></header>
  <nav><a href="/">Home</a><a href="/services">Services</a><a href="/contact">Contact</a></nav>
  <section><h2>Welcome</h2><p>Hello</p></section>
  </body></html>`

  const result = runSemanticImportEngine({ normalizedHtml: html, entryHtmlPath: 'index.html' })
  assert.ok(result.navigation.length >= 3)
  assert.ok((result.assets.groupedByRole.logo ?? []).some((src) => src.includes('logo')))
})

test('semantic engine marks low confidence for weak structure', () => {
  const html = `<!doctype html><html><body><div><span>Welcome text only</span></div></body></html>`
  const result = runSemanticImportEngine({ normalizedHtml: html, entryHtmlPath: 'index.html' })
  assert.ok(result.diagnostics.some((diag) => diag.code === 'LOW_CONFIDENCE_SECTION_CLASSIFICATION'))
  assert.ok(result.diagnostics.some((diag) => diag.code === 'HERO_NOT_DETECTED'))
})
