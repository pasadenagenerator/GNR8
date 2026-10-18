export type AcceptedFunctionalReductions = {
  kind: 'legacy-forms-to-disclosed-links-v1'
  contactEmail: string
  commentLinks: 'source-article'
  sourceWidgetRemovals?: Array<'cookie-consent' | 'form-captcha' | 'back-to-top'>
} | {
  kind: 'retained-presentation-v1'
  search: 'remove'
  map: 'address-link'
  tracking: 'remove-bundle'
  sourceWidgetRemovals?: never
  excludedRoutes?: Array<{ path: string; reason: 'obsolete-template' }>
}

/** Shared API/Worker validation; the presentation variant never authorizes forms. */
export function parseAcceptedFunctionalReductions(value: unknown): AcceptedFunctionalReductions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (input.kind === 'retained-presentation-v1') {
    if (Object.keys(input).some(key => !['kind', 'search', 'map', 'tracking', 'excludedRoutes'].includes(key))) return null
    if (input.excludedRoutes !== undefined && (!Array.isArray(input.excludedRoutes) || input.excludedRoutes.length > 32)) return null
    const excludedRoutes: Array<{path:string;reason:'obsolete-template'}> = []
    for (const value of (input.excludedRoutes ?? []) as unknown[]) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      const entry = value as Record<string,unknown>
      if (Object.keys(entry).some(key => !['path','reason'].includes(key)) || entry.reason !== 'obsolete-template' || typeof entry.path !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\/?$/.test(entry.path)) return null
      const path = entry.path.replace(/\/$/,'')
      if (excludedRoutes.some(entry => entry.path === path)) return null
      excludedRoutes.push({path,reason:'obsolete-template'})
    }
    return input.search === 'remove' && input.map === 'address-link' && input.tracking === 'remove-bundle'
      ? { kind: input.kind, search: input.search, map: input.map, tracking: input.tracking, ...(excludedRoutes.length ? {excludedRoutes} : {}) } : null
  }
  if (input.kind !== 'legacy-forms-to-disclosed-links-v1' || typeof input.contactEmail !== 'string' || input.commentLinks !== 'source-article') return null
  const email = input.contactEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null
  if (input.sourceWidgetRemovals !== undefined && !Array.isArray(input.sourceWidgetRemovals)) return null
  const removals = (input.sourceWidgetRemovals ?? []) as unknown[]
  if (removals.some(item => typeof item !== 'string' || !['cookie-consent', 'form-captcha', 'back-to-top'].includes(item)) || new Set(removals).size !== removals.length) return null
  return { kind: input.kind, contactEmail: email, commentLinks: input.commentLinks,
    ...(removals.length ? { sourceWidgetRemovals: removals as Array<'cookie-consent' | 'form-captcha' | 'back-to-top'> } : {}) }
}
