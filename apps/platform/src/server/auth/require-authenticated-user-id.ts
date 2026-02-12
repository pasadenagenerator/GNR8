import { AuthorizationError } from '@gnr8/core'
import type { NextRequest } from 'next/server'

export function requireAuthenticatedUserId(request: NextRequest): string {
  // Middleware is expected to hydrate this from Supabase auth context.
  const userId = request.headers.get('x-user-id')?.trim()
  if (!userId) {
    throw new AuthorizationError('Authentication required')
  }

  return userId
}
