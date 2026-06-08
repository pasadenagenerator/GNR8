import { buildSiteVersionPreviewUrl } from '@/gnr8/site/site-preview-contract'

export type MultiPagePreviewLinkRoute = {
  routePath: string
  status?: string | null
  rawFilePath?: string | null
}

export type MultiPageRawTemplatePreviewLink = {
  label: string
  routePath: string
  href: string
}

export type MultiPageRawTemplatePreviewDiagnostics = {
  links: MultiPageRawTemplatePreviewLink[]
  selectedRoutePath: string | null
  selectedRawFilePath: string | null
  htmlByteLengthBeforeRewrite: number | null
  htmlByteLengthAfterRewrite: number | null
  rewrittenLinkCount: number | null
  evidenceSource: 'persisted_raw_template_preview' | 'route_map_expected_live_preview'
}

export type RawTemplatePreviewEvidenceInput = {
  selectedRoutePath: string
  selectedRawFilePath: string
  htmlByteLengthBeforeRewrite: number
  htmlByteLengthAfterRewrite: number
  rewrittenLinkCount: number
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
      rawFilePath: normalizeText(route.rawFilePath),
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

function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function finiteNumberOrNull(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function buildMultiPageRawTemplatePreviewDiagnostics(input: {
  siteVersionId: string | null
  routes: MultiPagePreviewLinkRoute[]
  rawTemplatePreviewEvidence?: RawTemplatePreviewEvidenceInput | null
}): MultiPageRawTemplatePreviewDiagnostics | null {
  const links = buildMultiPageRawTemplatePreviewLinks(input)
  const evidence = input.rawTemplatePreviewEvidence ?? null
  if (evidence) {
    return {
      links,
      selectedRoutePath: evidence.selectedRoutePath,
      selectedRawFilePath: evidence.selectedRawFilePath,
      htmlByteLengthBeforeRewrite: finiteNumberOrNull(evidence.htmlByteLengthBeforeRewrite),
      htmlByteLengthAfterRewrite: finiteNumberOrNull(evidence.htmlByteLengthAfterRewrite),
      rewrittenLinkCount: finiteNumberOrNull(evidence.rewrittenLinkCount),
      evidenceSource: 'persisted_raw_template_preview',
    }
  }

  if (links.length === 0) return null
  const normalizedRoutes = input.routes.map((route) => ({
    routePath: normalizeRoutePath(route.routePath),
    status: String(route.status ?? '').trim(),
    rawFilePath: normalizeText(route.rawFilePath),
  }))
  const selectedRoute = normalizedRoutes.find((route) => route.routePath === '/')
    ?? normalizedRoutes.find((route) => route.routePath !== '/' && route.status !== 'missing' && route.status !== 'failed')
    ?? normalizedRoutes[0]
    ?? null

  return {
    links,
    selectedRoutePath: selectedRoute?.routePath ?? null,
    selectedRawFilePath: selectedRoute?.rawFilePath ?? null,
    htmlByteLengthBeforeRewrite: null,
    htmlByteLengthAfterRewrite: null,
    rewrittenLinkCount: null,
    evidenceSource: 'route_map_expected_live_preview',
  }
}
