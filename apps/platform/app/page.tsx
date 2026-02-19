'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const url = new URL(window.location.href)

    const hasCode = url.searchParams.has('code')
    const hasType = url.searchParams.has('type')

    const hash = url.hash?.startsWith('#') ? url.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)

    const hasAccessToken = hashParams.has('access_token')
    const hashType = hashParams.get('type') // pogosto "recovery" ali "invite"

    const isSupabaseAuthCallback =
      hasCode ||
      (hasType && url.searchParams.get('type') === 'recovery') ||
      hasAccessToken ||
      hashType === 'recovery' ||
      hashType === 'invite'

    if (isSupabaseAuthCallback) {
      // POMEMBNO: ohranimo query + hash, ker reset-password page zna oboje prebrat
      const nextUrl = `/reset-password${url.search}${url.hash}`
      router.replace(nextUrl)
      return
    }

    router.replace('/admin')
  }, [router])

  return null
}
