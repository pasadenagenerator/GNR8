import { NextResponse } from 'next/server'

import { resolvePostLoginHomeForPage } from '@/src/auth/resolve-post-login-home'
import { ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'
import { ResolveCurrentClientError } from '@/src/auth/resolve-current-client'

const AUTH_DEBUG_ENABLED = process.env.NODE_ENV !== 'production' || process.env.AUTH_DEBUG_LOGIN === '1'

function logAuthDebug(event: string, payload: Record<string, unknown>): void {
  if (!AUTH_DEBUG_ENABLED) return
  console.info(`[auth.post_login_route.${event}]`, payload)
}

export async function resolvePostLoginHomeRoute(
  nextPath: string | null,
  options?: {
    requestId?: string | null
  },
) {
  const requestId = String(options?.requestId ?? '').trim() || null
  logAuthDebug('start', {
    requestId,
    nextPath: nextPath ?? null,
  })
  try {
    const resolution = await resolvePostLoginHomeForPage({ nextPath, requestId })
    console.info('[auth.post_login.resolved]', {
      entry: 'post_login',
      requestId,
      kind: resolution.kind,
      target: resolution.target,
    })
    logAuthDebug('resolved', {
      requestId,
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
      requestId,
      status,
      error: message,
    })
    logAuthDebug('failed', {
      requestId,
      status,
      error: message,
    })

    return NextResponse.json({ error: message }, { status })
  }
}
