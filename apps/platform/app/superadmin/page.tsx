'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

export default function SuperadminHome() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [status, setStatus] = useState<'checking' | 'ok' | 'nope'>('checking')
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/login')
        router.refresh()
        return
      }

      // server-side guard test
      const res = await fetch('/api/superadmin/whoami')
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        setStatus('nope')
        setMsg(json?.error ?? `HTTP ${res.status}`)
        return
      }

      setStatus('ok')
      setMsg(`Superadmin OK (userId: ${json.userId})`)
    })()
  }, [router, supabase])

  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Superadmin</h1>
      {status === 'checking' && <p>Checking…</p>}
      {status === 'ok' && <p>{msg}</p>}
      {status === 'nope' && (
        <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
          <strong>Access denied:</strong> {msg}
        </div>
      )}
    </main>
  )
}