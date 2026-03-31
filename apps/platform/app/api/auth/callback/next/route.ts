import { NextResponse, type NextRequest } from 'next/server'

import { resolvePostLoginHomeForPage } from '@/src/auth/resolve-post-login-home'
import { ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'
import { ResolveCurrentClientError } from '@/src/auth/resolve-current-client'

export async function GET(request: NextRequest) {
  try {
    const nextPath = request.nextUrl.searchParams.get('next')
    const resolution = await resolvePostLoginHomeForPage({ nextPath })
    return NextResponse.json({ target: resolution.target, kind: resolution.kind }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve redirect target.'
    const status =
      (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') ||
      (error instanceof ResolveCurrentClientError && error.code === 'UNAUTHORIZED') ||
      message === 'Unauthorized'
        ? 401
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
