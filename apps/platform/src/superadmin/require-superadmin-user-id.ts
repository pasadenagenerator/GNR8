import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { AuthorizationError, DomainError } from '@gnr8/core'

export async function requireSuperadminUserId(): Promise<string> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  if (error || !user) {
    throw new AuthorizationError('Not authenticated')
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL
  if (!superadminEmail) {
    // to je konfiguracijska napaka -> 500
    throw new DomainError('SUPERADMIN_EMAIL env var is not set')
  }

  if (!user.email || user.email !== superadminEmail) {
    throw new AuthorizationError('Not a superadmin')
  }

  return user.id
}