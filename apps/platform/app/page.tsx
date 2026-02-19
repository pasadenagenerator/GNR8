import { redirect } from 'next/navigation'

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' ? value : undefined
}

export default async function HomePage(props: { searchParams: any }) {
  const sp = await Promise.resolve(props.searchParams ?? {})

  const code = first(sp.code)
  const type = first(sp.type)

  // Supabase recovery / invite callback routing
  if (code && (type === 'recovery' || type === 'invite')) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}`)
  }

  const error = first(sp.error)
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error)}`)
  }

  redirect('/admin')
}