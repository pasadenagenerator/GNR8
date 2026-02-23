'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type Org = {
  id: string
  name: string
  createdAt: string
  projectsCount: number
}

type OrgsResult =
  | { ok: true; orgs: Org[] }
  | { ok?: false; error: string }
  | null

export default function SuperadminOrgsPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<OrgsResult>(null)

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/login')
        router.refresh()
        return
      }
      setUserId(data.user.id)
      setUserEmail(data.user.email ?? null)
      await load()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function load() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/superadmin/orgs', { method: 'GET' })
      const json = await res.json()

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? 'Failed to load orgs' })
      } else {
        setResult({ ok: true, orgs: json.orgs ?? [] })
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setBusy(false)
    }
  }

  const orgs =
    result && 'ok' in result && result.ok ? result.orgs : []

  return (
    <main style={{ maxWidth: 980, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Superadmin</h1>
          <div style={{ fontSize: 13, color: '#666' }}>
            <div><strong>User:</strong> {userEmail ?? '—'}</div>
            <div><strong>User ID:</strong> {userId ?? '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            disabled={busy}
            onClick={load}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {busy ? 'Loading…' : 'Reload'}
          </button>

          <button
            onClick={logout}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            Logout
          </button>
        </div>
      </div>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Organizations</h2>

        {result && 'ok' in result && !result.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {result.error}
          </div>
        )}

        {orgs.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>
            {busy ? 'Loading…' : 'No orgs.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {orgs.map((o) => (
              <div
                key={o.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{o.name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    <div style={{ wordBreak: 'break-all' }}>
                      <strong>id:</strong> {o.id}
                    </div>
                    <div>
                      <strong>created:</strong> {o.createdAt}
                    </div>
                    <div>
                      <strong>projects:</strong> {o.projectsCount}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/superadmin/orgs/${o.id}`}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}