import { redirect } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

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