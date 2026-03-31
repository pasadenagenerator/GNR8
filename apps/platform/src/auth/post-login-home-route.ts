import { NextResponse } from 'next/server'

import { resolvePostLoginHomeForPage } from '@/src/auth/resolve-post-login-home'
import { ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'
import { ResolveCurrentClientError } from '@/src/auth/resolve-current-client'

export async function resolvePostLoginHomeRoute(nextPath: string | null) {
  try {
    const resolution = await resolvePostLoginHomeForPage({ nextPath })
    console.info('[auth.post_login.resolved]', {
      entry: 'post_login',
      kind: resolution.kind,
      target: resolution.target,
    })
    return NextResponse.json({ target: resolution.target, kind: resolution.kind }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve post-login home.'
    const status =
      (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') ||
      (error instanceof ResolveCurrentClientError && error.code === 'UNAUTHORIZED') ||
      message === 'Unauthorized'
        ? 401
        : 400

    console.warn('[auth.post_login.failed]', {
      entry: 'post_login',
      status,
      error: message,
    })

    return NextResponse.json({ error: message }, { status })
  }
}
