import { normalizeHrefForSiteTree, type NormalizedHrefResult } from '@/gnr8/site-tree/core/url-normalization'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export type ExtractedLink = {
  href: string
  linkText: string
  linkContext: string
  normalized: NormalizedHrefResult
}

function sanitizeHtmlText(value: string): string {
  return normalizeText(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
}

export function extractClassifiedLinksFromHtml(input: {
  html: string
  baseUrl: string
}): ExtractedLink[] {
  const html = String(input.html ?? '')
  if (!html) return []

  const links: ExtractedLink[] = []
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const href = normalizeText(match[1])
    const linkText = sanitizeHtmlText(String(match[2] ?? ''))
    const start = Math.max(0, match.index - 64)
    const end = Math.min(html.length, match.index + match[0].length + 64)
    const linkContext = sanitizeHtmlText(html.slice(start, end)).slice(0, 180)

    links.push({
      href,
      linkText,
      linkContext,
      normalized: normalizeHrefForSiteTree({
        href,
        baseUrl: input.baseUrl,
      }),
    })
  }

  return links
}
