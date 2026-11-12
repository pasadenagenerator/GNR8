export type AcceptedFunctionalReductions = {
  kind: 'static-content-v1'
  scripts: 'remove'
} | {
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
  contact?: { recipient: string; recipientConfirmed: true }
}

export function isContactEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 &&
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(value)
}

/** Shared API/Worker validation; contact replacement requires explicit opt-in. */
export function parseAcceptedFunctionalReductions(value: unknown): AcceptedFunctionalReductions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (input.kind === 'static-content-v1') {
    return Object.keys(input).length === 2 && input.scripts === 'remove'
      ? { kind: 'static-content-v1', scripts: 'remove' } : null
  }
  if (input.kind === 'retained-presentation-v1') {
    if (Object.keys(input).some(key => !['kind', 'search', 'map', 'tracking', 'excludedRoutes', 'contact'].includes(key))) return null
    let contact: { recipient: string; recipientConfirmed: true } | undefined
    if (input.contact !== undefined) {
      if (!input.contact || typeof input.contact !== 'object' || Array.isArray(input.contact)) return null
      const value = input.contact as Record<string, unknown>
      if (Object.keys(value).some(key => !['recipient', 'recipientConfirmed'].includes(key)) ||
        value.recipientConfirmed !== true || !isContactEmail(value.recipient)) return null
      contact = { recipient: value.recipient, recipientConfirmed: true }
    }
    if (input.excludedRoutes !== undefined && (!Array.isArray(input.excludedRoutes) || input.excludedRoutes.length > 32)) return null
    const excludedRoutes: Array<{path:string;reason:'obsolete-template'}> = []
    for (const value of (input.excludedRoutes ?? []) as unknown[]) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      const entry = value as Record<string,unknown>
      if (Object.keys(entry).some(key => !['path','reason'].includes(key)) || entry.reason !== 'obsolete-template' || typeof entry.path !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.html)?\/?$/.test(entry.path)) return null
      const path = entry.path.replace(/\/$/,'')
      if (excludedRoutes.some(entry => entry.path === path)) return null
      excludedRoutes.push({path,reason:'obsolete-template'})
    }
    return input.search === 'remove' && input.map === 'address-link' && input.tracking === 'remove-bundle'
      ? { kind: input.kind, search: input.search, map: input.map, tracking: input.tracking, ...(excludedRoutes.length ? {excludedRoutes} : {}), ...(contact ? {contact} : {}) } : null
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

/** The ordinary SiteActionsPanel uses this builder before the API and Worker
 * independently validate the same serialized contract. No site defaults. */
export function createRetainedPresentationSettings(input: {
  excludedPaths: string; nativeContact: boolean; recipient: string; recipientConfirmed: boolean
}): AcceptedFunctionalReductions | null {
  return parseAcceptedFunctionalReductions({
    kind: 'retained-presentation-v1', search: 'remove', map: 'address-link', tracking: 'remove-bundle',
    excludedRoutes: input.excludedPaths.split('\n').map(path => path.trim()).filter(Boolean).map(path => ({path, reason: 'obsolete-template'})),
    ...(input.nativeContact ? {contact:{recipient:input.recipient,recipientConfirmed:input.recipientConfirmed}} : {}),
  })
}
