'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type ApiResult =
  | { ok: true; project: any }
  | { ok?: false; error: string }
  | null

export default function AdminPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // lahko si sem daš default test org id (tvoj iz prejšnjih logov)
  const [orgId, setOrgId] = useState('f3bf88ca-8a6a-4218-8ad2-21ac1be05488')

  const [name, setName] = useState('Test projekt')
  const [slug, setSlug] = useState('test-projekt')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ApiResult>(null)

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
    })()
  }, [router, supabase])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function createProject() {
    setBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/orgs/${orgId}/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
      const json = await res.json()

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? 'Request failed' })
      } else {
        setResult({ ok: true, project: json.project })
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Admin (test)</h1>
        <button
          onClick={logout}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        >
          Logout
        </button>
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#444' }}>
          <div>
            <strong>User:</strong> {userEmail ?? '—'}
          </div>
          <div>
            <strong>User ID:</strong> {userId ?? '—'}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Org ID</span>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Project slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          disabled={busy}
          onClick={createProject}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create project'}
        </button>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Result</h2>
        <pre
          style={{
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 12,
            overflow: 'auto',
          }}
        >
          {result ? JSON.stringify(result, null, 2) : '—'}
        </pre>
      </section>
    </main>
  )
}