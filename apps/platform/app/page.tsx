import { redirect } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // Supabase včasih pošlje recovery/invite kot ?code=...
  const code = first(searchParams.code)
  const type = first(searchParams.type)

  // Če pride recovery/invite na root, ga pošljemo na pravi page
  if (code && (type === 'recovery' || type === 'invite')) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}`)
  }

  // Druga možnost: če pride "error" ali "message" query (auth fail) ga lahko pošlješ na login
  const error = first(searchParams.error)
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error)}`)
  }

  // Default UX: gre na admin
  redirect('/admin')
}