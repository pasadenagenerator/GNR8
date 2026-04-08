function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed.length > 0 ? trimmed : null
}

function collectStringsByKeys(input: {
  value: unknown
  keys: Set<string>
  max: number
}): string[] {
  const collected: string[] = []
  const seen = new Set<string>()

  function push(value: unknown) {
    const text = asNonEmptyString(value)
    if (!text) return
    const folded = text.toLowerCase()
    if (seen.has(folded)) return
    seen.add(folded)
    collected.push(text)
  }

  function walk(value: unknown) {
    if (collected.length >= input.max) return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }

    if (!isRecord(value)) {
      push(value)
      return
    }

    const entries = Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [key, next] of entries) {
      if (input.keys.has(key.toLowerCase())) {
        if (Array.isArray(next)) {
          for (const item of next) push(item)
        } else {
          push(next)
        }
      }
      walk(next)
    }
  }

  walk(input.value)
  return collected
}

function collectAllStrings(value: unknown, max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  function push(text: unknown) {
    const normalized = asNonEmptyString(text)
    if (!normalized) return
    const folded = normalized.toLowerCase()
    if (seen.has(folded)) return
    seen.add(folded)
    out.push(normalized)
  }

  function walk(next: unknown) {
    if (out.length >= max) return
    if (Array.isArray(next)) {
      for (const item of next) walk(item)
      return
    }
    if (!isRecord(next)) {
      push(next)
      return
    }

    const entries = Object.entries(next).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [, value] of entries) walk(value)
  }

  walk(value)
  return out
}

type LinkItem = { href: string; label: string }

function sanitizeHref(href: string): string | null {
  const trimmed = href.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return null
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('/') ||
    lower.startsWith('#') ||
    lower.startsWith('./') ||
    lower.startsWith('../')
  ) {
    return trimmed
  }
  if (/^[a-z0-9][a-z0-9/_#?&=.%+-]*$/i.test(trimmed)) {
    return `/${trimmed.replace(/^\/+/, '')}`
  }
  return null
}

function collectLinks(value: unknown, max: number): LinkItem[] {
  const links: LinkItem[] = []
  const seen = new Set<string>()

  function addLink(hrefCandidate: unknown, labelCandidate: unknown) {
    const href = asNonEmptyString(hrefCandidate)
    if (!href) return
    const sanitizedHref = sanitizeHref(href)
    if (!sanitizedHref) return
    const label = asNonEmptyString(labelCandidate) ?? sanitizedHref
    const key = `${sanitizedHref.toLowerCase()}::${label.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    links.push({ href: sanitizedHref, label })
  }

  function walk(next: unknown) {
    if (links.length >= max) return

    if (Array.isArray(next)) {
      for (const item of next) walk(item)
      return
    }
    if (!isRecord(next)) return

    addLink(next.href, next.label ?? next.text ?? next.title ?? next.name)
    addLink(next.url, next.label ?? next.text ?? next.title ?? next.name)
    addLink(next.link, next.label ?? next.text ?? next.title ?? next.name)

    const entries = Object.entries(next).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [, value] of entries) walk(value)
  }

  walk(value)
  return links
}

type FaqItem = { question: string; answer: string }

function collectFaqItems(sectionProps: Record<string, unknown>, max: number): FaqItem[] {
  const items: FaqItem[] = []
  const seen = new Set<string>()

  function tryPush(entry: unknown) {
    if (!isRecord(entry)) return
    const question =
      asNonEmptyString(entry.question) ??
      asNonEmptyString(entry.q) ??
      asNonEmptyString(entry.title) ??
      asNonEmptyString(entry.heading) ??
      null
    const answer =
      asNonEmptyString(entry.answer) ??
      asNonEmptyString(entry.a) ??
      asNonEmptyString(entry.content) ??
      asNonEmptyString(entry.text) ??
      asNonEmptyString(entry.description) ??
      null
    if (!question && !answer) return
    const normalized = `${question ?? ''}::${answer ?? ''}`.toLowerCase()
    if (seen.has(normalized)) return
    seen.add(normalized)
    items.push({
      question: question ?? 'Question',
      answer: answer ?? 'No answer text extracted.',
    })
  }

  const faqBuckets = [sectionProps.items, sectionProps.faqs, sectionProps.questions, sectionProps.entries]
  for (const bucket of faqBuckets) {
    if (!Array.isArray(bucket)) continue
    for (const entry of bucket) {
      if (items.length >= max) break
      tryPush(entry)
    }
  }

  if (items.length === 0) {
    const nestedArrays = collectNestedArrays(sectionProps, new Set(['items', 'faqs', 'questions', 'entries']))
    for (const bucket of nestedArrays) {
      for (const entry of bucket) {
        if (items.length >= max) break
        tryPush(entry)
      }
      if (items.length >= max) break
    }
  }

  return items
}

function collectNestedArrays(value: unknown, keys: Set<string>): unknown[][] {
  const arrays: unknown[][] = []

  function walk(next: unknown) {
    if (Array.isArray(next)) {
      for (const item of next) walk(item)
      return
    }
    if (!isRecord(next)) return

    const entries = Object.entries(next).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [key, val] of entries) {
      if (keys.has(key.toLowerCase()) && Array.isArray(val)) {
        arrays.push(val)
      }
      walk(val)
    }
  }

  walk(value)
  return arrays
}

type ImageItem = { src: string; caption: string | null }

function collectImages(value: unknown, max: number): ImageItem[] {
  const out: ImageItem[] = []
  const seen = new Set<string>()

  function tryAdd(srcCandidate: unknown, captionCandidate?: unknown) {
    const src = asNonEmptyString(srcCandidate)
    if (!src) return
    const sanitized = sanitizeHref(src)
    if (!sanitized) return
    const key = sanitized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ src: sanitized, caption: asNonEmptyString(captionCandidate) })
  }

  function walk(next: unknown) {
    if (out.length >= max) return

    if (Array.isArray(next)) {
      for (const item of next) walk(item)
      return
    }
    if (!isRecord(next)) return

    tryAdd(next.src, next.caption ?? next.alt ?? next.title)
    tryAdd(next.image, next.caption ?? next.alt ?? next.title)
    tryAdd(next.imageUrl, next.caption ?? next.alt ?? next.title)
    tryAdd(next.url, next.caption ?? next.alt ?? next.title)

    const entries = Object.entries(next).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [key, val] of entries) {
      const keyLower = key.toLowerCase()
      if (['images', 'gallery', 'photos', 'media'].includes(keyLower)) {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (typeof item === 'string') {
              tryAdd(item)
            } else if (isRecord(item)) {
              tryAdd(item.src ?? item.image ?? item.url, item.caption ?? item.alt ?? item.title)
            }
          }
        }
      }
      walk(val)
    }
  }

  walk(value)
  return out
}

function sectionTitle(sectionProps: Record<string, unknown>, fallback: string): string {
  return (
    collectStringsByKeys({
      value: sectionProps,
      keys: new Set(['title', 'heading', 'headline', 'name', 'label']),
      max: 1,
    })[0] ?? fallback
  )
}

function renderLinks(links: LinkItem[]): string {
  if (links.length === 0) return ''
  return [
    '<ul style="margin: 8px 0 0; padding-left: 18px;">',
    ...links.map(
      (link) =>
        `  <li><a href="${escapeHtml(link.href)}" style="color: #0f4f7a; text-underline-offset: 2px;">${escapeHtml(link.label)}</a></li>`,
    ),
    '</ul>',
  ].join('\n')
}

function renderDiagnostics(input: { sectionProps: Record<string, unknown>; textCount: number; linkCount: number; imageCount: number }): string {
  const keys = Object.keys(input.sectionProps).sort()
  const keyList = keys.length > 0 ? keys.join(', ') : 'none'
  return `<p style="margin: 8px 0 0; font-size: 12px; color: #5b6770;">Diagnostics: keys=${escapeHtml(keyList)}; text=${input.textCount}; links=${input.linkCount}; images=${input.imageCount}</p>`
}

function renderFallbackShell(input: { sectionType: string; title: string; bodyHtml: string; diagnosticsHtml: string }): string {
  return [
    `<div data-gnr8-preview-fallback="visible-v1" data-gnr8-fallback-section-type="${escapeHtml(input.sectionType)}" style="margin: 10px 0; padding: 14px; border: 1px solid #d4dde4; border-radius: 10px; background: #f8fbfd; color: #172027; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;">`,
    `  <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #4b6070;">Fallback Preview: ${escapeHtml(input.sectionType)}</p>`,
    `  <h2 style="margin: 0 0 10px; font-size: 20px; line-height: 1.25;">${escapeHtml(input.title)}</h2>`,
    input.bodyHtml,
    input.diagnosticsHtml,
    '</div>',
  ].join('\n')
}

function renderFaq(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'FAQ')
  const faqItems = collectFaqItems(sectionProps, 8)
  const links = collectLinks(sectionProps, 6)
  const text = collectStringsByKeys({ value: sectionProps, keys: new Set(['description', 'intro', 'subtitle']), max: 2 })

  const lines: string[] = []
  for (const paragraph of text) {
    lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)
  }

  if (faqItems.length > 0) {
    lines.push('<ol style="margin: 0; padding-left: 18px;">')
    for (const item of faqItems) {
      lines.push(`  <li style="margin: 0 0 8px;"><strong>${escapeHtml(item.question)}</strong><br />${escapeHtml(item.answer)}</li>`)
    }
    lines.push('</ol>')
  } else {
    lines.push('<p style="margin: 0;">No FAQ entries extracted for this section.</p>')
  }

  lines.push(renderLinks(links))
  lines.push(
    renderDiagnostics({ sectionProps, textCount: text.length + faqItems.length * 2, linkCount: links.length, imageCount: 0 }),
  )

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: '',
  })
}

function renderNavbar(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'Navigation')
  const links = collectLinks(sectionProps, 10)
  const diagnostics = renderDiagnostics({ sectionProps, textCount: 1, linkCount: links.length, imageCount: 0 })

  const navList =
    links.length > 0
      ? `<nav aria-label="fallback-navbar"><ul style="margin: 0; padding-left: 18px;">${links
          .map((link) => `<li><a href="${escapeHtml(link.href)}" style="color: #0f4f7a;">${escapeHtml(link.label)}</a></li>`)
          .join('')}</ul></nav>`
      : '<p style="margin: 0;">No navigation links extracted for this section.</p>'

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: navList,
    diagnosticsHtml: diagnostics,
  })
}

function renderFooter(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'Footer')
  const links = collectLinks(sectionProps, 10)
  const text = collectStringsByKeys({ value: sectionProps, keys: new Set(['text', 'description', 'copyright', 'legal']), max: 3 })

  const lines: string[] = []
  if (text.length > 0) {
    for (const paragraph of text) lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)
  }
  lines.push(renderLinks(links) || '<p style="margin: 0;">No footer links extracted for this section.</p>')

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({ sectionProps, textCount: text.length, linkCount: links.length, imageCount: 0 }),
  })
}

function renderHero(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title =
    collectStringsByKeys({ value: sectionProps, keys: new Set(['headline', 'heading', 'title']), max: 1 })[0] ?? 'Hero'
  const body =
    collectStringsByKeys({ value: sectionProps, keys: new Set(['subheadline', 'subtitle', 'description', 'body', 'text']), max: 2 })
  const links = collectLinks(sectionProps, 4)
  const images = collectImages(sectionProps, 2)

  const lines: string[] = []
  for (const paragraph of body) lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)
  if (links.length > 0) {
    const primary = links[0]
    lines.push(`<p style="margin: 8px 0 0;"><a href="${escapeHtml(primary.href)}" style="display: inline-block; padding: 7px 12px; border: 1px solid #0f4f7a; border-radius: 7px; color: #0f4f7a; text-decoration: none;">${escapeHtml(primary.label)}</a></p>`)
    if (links.length > 1) lines.push(renderLinks(links.slice(1)))
  }
  if (images.length > 0) {
    lines.push('<ul style="margin: 8px 0 0; padding-left: 18px;">')
    for (const image of images) {
      const label = image.caption ? `${image.caption} (${image.src})` : image.src
      lines.push(`  <li>Image placeholder: ${escapeHtml(label)}</li>`)
    }
    lines.push('</ul>')
  }

  if (lines.length === 0) {
    lines.push('<p style="margin: 0;">No visible hero content extracted.</p>')
  }

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({ sectionProps, textCount: body.length + 1, linkCount: links.length, imageCount: images.length }),
  })
}

function renderCta(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'Call to Action')
  const text =
    collectStringsByKeys({ value: sectionProps, keys: new Set(['body', 'text', 'description', 'subtitle']), max: 2 })
  const links = collectLinks(sectionProps, 4)

  const lines: string[] = []
  for (const paragraph of text) lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)

  if (links.length > 0) {
    const primary = links[0]
    lines.push(`<p style="margin: 8px 0 0;"><a href="${escapeHtml(primary.href)}" style="display: inline-block; padding: 7px 12px; border: 1px solid #0f4f7a; border-radius: 7px; color: #0f4f7a; text-decoration: none;">${escapeHtml(primary.label)}</a></p>`)
    if (links.length > 1) lines.push(renderLinks(links.slice(1)))
  } else {
    lines.push('<p style="margin: 0;">No CTA action link extracted.</p>')
  }

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({ sectionProps, textCount: text.length + 1, linkCount: links.length, imageCount: 0 }),
  })
}

function renderGallery(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'Gallery')
  const images = collectImages(sectionProps, 12)
  const links = collectLinks(sectionProps, 6)

  const lines: string[] = []
  if (images.length > 0) {
    lines.push('<ul style="margin: 0; padding-left: 18px;">')
    for (const image of images) {
      const label = image.caption ? `${image.caption}: ${image.src}` : image.src
      lines.push(`  <li>${escapeHtml(label)}</li>`)
    }
    lines.push('</ul>')
  } else {
    lines.push('<p style="margin: 0;">No gallery images extracted for this section.</p>')
  }

  if (links.length > 0) lines.push(renderLinks(links))

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({ sectionProps, textCount: 1, linkCount: links.length, imageCount: images.length }),
  })
}

function renderContent(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, 'Content')
  const text = collectStringsByKeys({ value: sectionProps, keys: new Set(['heading', 'headline', 'title', 'body', 'text', 'description', 'content']), max: 6 })
  const links = collectLinks(sectionProps, 6)

  const lines: string[] = []
  const paragraphs = text.filter((line) => line.toLowerCase() !== title.toLowerCase())
  if (paragraphs.length > 0) {
    for (const paragraph of paragraphs) lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)
  } else {
    lines.push('<p style="margin: 0;">No text paragraphs extracted for this section.</p>')
  }

  if (links.length > 0) lines.push(renderLinks(links))

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({ sectionProps, textCount: paragraphs.length, linkCount: links.length, imageCount: 0 }),
  })
}

function renderGeneric(sectionType: string, sectionProps: Record<string, unknown>): string {
  const title = sectionTitle(sectionProps, `Section: ${sectionType}`)
  const strings = collectAllStrings(sectionProps, 7)
  const links = collectLinks(sectionProps, 6)
  const images = collectImages(sectionProps, 4)

  const lines: string[] = []
  const paragraphs = strings.filter((entry) => entry.toLowerCase() !== title.toLowerCase()).slice(0, 3)
  for (const paragraph of paragraphs) {
    lines.push(`<p style="margin: 0 0 8px;">${escapeHtml(paragraph)}</p>`)
  }

  if (links.length > 0) lines.push(renderLinks(links))

  if (images.length > 0) {
    lines.push('<ul style="margin: 8px 0 0; padding-left: 18px;">')
    for (const image of images) {
      lines.push(`  <li>Media placeholder: ${escapeHtml(image.src)}</li>`)
    }
    lines.push('</ul>')
  }

  if (paragraphs.length === 0 && links.length === 0 && images.length === 0) {
    lines.push('<p style="margin: 0;">No visible preview content extracted.</p>')
  }

  return renderFallbackShell({
    sectionType,
    title,
    bodyHtml: lines.join('\n'),
    diagnosticsHtml: renderDiagnostics({
      sectionProps,
      textCount: strings.length,
      linkCount: links.length,
      imageCount: images.length,
    }),
  })
}

export function renderPreviewFallbackSectionHtml(input: {
  sectionType: string
  sectionProps: Record<string, unknown>
}): string {
  const sectionType = (input.sectionType || 'unknown').trim().toLowerCase()
  const sectionProps = input.sectionProps ?? {}

  if (sectionType === 'faq.basic' || sectionType.startsWith('faq.')) {
    return renderFaq(sectionType, sectionProps)
  }
  if (sectionType === 'navbar.basic' || sectionType.startsWith('navbar.')) {
    return renderNavbar(sectionType, sectionProps)
  }
  if (sectionType === 'footer.basic' || sectionType.startsWith('footer.')) {
    return renderFooter(sectionType, sectionProps)
  }
  if (sectionType.startsWith('hero.')) {
    return renderHero(sectionType, sectionProps)
  }
  if (sectionType.startsWith('cta.')) {
    return renderCta(sectionType, sectionProps)
  }
  if (sectionType.startsWith('gallery.')) {
    return renderGallery(sectionType, sectionProps)
  }
  if (sectionType.startsWith('content.') || sectionType === 'content') {
    return renderContent(sectionType, sectionProps)
  }

  return renderGeneric(sectionType, sectionProps)
}
