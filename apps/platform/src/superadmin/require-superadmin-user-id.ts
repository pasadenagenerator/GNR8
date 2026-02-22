import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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
    throw new Error('Not authenticated')
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL
  if (!superadminEmail) {
    throw new Error('SUPERADMIN_EMAIL env var is not set')
  }

  if (user.email !== superadminEmail) {
    throw new Error('Not a superadmin')
  }

  return user.id
}