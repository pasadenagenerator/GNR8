import { NextResponse, type NextRequest } from 'next/server'

import { listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage, OWNER_SETUP_PATH } from '@/src/auth/owner-setup-gate'

const AUTH_CALLBACK_PATH = '/auth/callback'
const DEFAULT_AUTH_SUCCESS_PATH = '/gnr8/agency'

function normalizeNextPath(candidate: string | null): string {
  const value = String(candidate ?? '').trim()
  if (!value.startsWith('/')) return DEFAULT_AUTH_SUCCESS_PATH
  if (value.startsWith('//')) return DEFAULT_AUTH_SUCCESS_PATH
  if (value === AUTH_CALLBACK_PATH || value.startsWith(`${AUTH_CALLBACK_PATH}?`)) {
    return DEFAULT_AUTH_SUCCESS_PATH
  }
  return value
}

function tryExtractAgencyId(pathnameWithSearch: string): string | null {
  try {
    const url = new URL(pathnameWithSearch, 'http://localhost')
    if (url.pathname !== '/gnr8/agency') return null
    const agencyId = String(url.searchParams.get('agency') ?? '').trim()
    return agencyId || null
  } catch {
    return null
  }
}

function onboardingPathForAgency(agencyId: string | null): string {
  if (!agencyId) return OWNER_SETUP_PATH
  return `${OWNER_SETUP_PATH}?agency=${encodeURIComponent(agencyId)}`
}

export async function GET(request: NextRequest) {
  try {
    const nextPath = normalizeNextPath(request.nextUrl.searchParams.get('next'))
    const requestedAgencyId = tryExtractAgencyId(nextPath)
    const incompleteAgencyIds = await listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage()

    if (requestedAgencyId && incompleteAgencyIds.includes(requestedAgencyId)) {
      return NextResponse.json({ target: onboardingPathForAgency(requestedAgencyId) }, { status: 200 })
    }

    if (incompleteAgencyIds.length > 0) {
      return NextResponse.json({ target: onboardingPathForAgency(incompleteAgencyIds[0] ?? null) }, { status: 200 })
    }

    return NextResponse.json({ target: nextPath }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve redirect target.'
    const status = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
