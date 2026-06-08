import { buildSiteVersionPreviewUrl } from '@/gnr8/site/site-preview-contract'

export type MultiPagePreviewLinkRoute = {
  routePath: string
  status?: string | null
}

export type MultiPageRawTemplatePreviewLink = {
  label: string
  routePath: string
  href: string
}

function normalizeRoutePath(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '/'
  return text.startsWith('/') ? text : `/${text}`
}

export function buildMultiPageRawTemplatePreviewLinks(input: {
  siteVersionId: string | null
  routes: MultiPagePreviewLinkRoute[]
}): MultiPageRawTemplatePreviewLink[] {
  if (!input.siteVersionId) return []

  const normalizedRoutes = input.routes
    .map((route) => ({
      routePath: normalizeRoutePath(route.routePath),
      status: String(route.status ?? '').trim(),
    }))
    .filter((route) => route.routePath)

  if (normalizedRoutes.length === 0) return []

  const childPath = normalizedRoutes.find((route) => route.routePath !== '/' && route.status !== 'missing' && route.status !== 'failed')
    ?.routePath
    ?? normalizedRoutes.find((route) => route.routePath !== '/')?.routePath
    ?? null

  return [
    {
      label: 'Open Root Raw Preview',
      routePath: '/',
      href: buildSiteVersionPreviewUrl({ siteVersionId: input.siteVersionId, mode: 'raw_template_preview', path: '/' }),
    },
    ...(childPath
      ? [
          {
            label: 'Open First Child Raw Preview',
            routePath: childPath,
            href: buildSiteVersionPreviewUrl({ siteVersionId: input.siteVersionId, mode: 'raw_template_preview', path: childPath }),
          },
        ]
      : []),
  ]
}
