import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type ClientContextTab = 'dashboard' | 'settings' | 'users'

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  clientId: string
  clientName: string
  clientSlug?: string | null
  activeTab: ClientContextTab
  children: ReactNode
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 12px',
    borderRadius: 8,
    border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1e3a8a' : '#0f172a',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  }
}

export default function ClientContextLayout(props: Props) {
  const activeAgencyId = props.requestedAgencyId || props.agencyId
  const agencyParam = `agency=${encodeURIComponent(activeAgencyId)}`

  const dashboardHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/dashboard?${agencyParam}`
  const settingsHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/settings?${agencyParam}`
  const usersHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?${agencyParam}`
  const backToAgencyHref = `/gnr8/agency?${agencyParam}`

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <section
        style={{
          border: '1px solid #dbe6f1',
          borderRadius: 12,
          background: '#fff',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href={backToAgencyHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            ← Back to Agency
          </Link>

          <div style={{ display: 'grid', gap: 2, justifyItems: 'end' }}>
            <div style={{ margin: 0, fontSize: 12, color: '#475569' }}>Client Context</div>
            <div style={{ margin: 0, fontSize: 20, color: '#0f172a', fontWeight: 700 }}>{props.clientName}</div>
            <div style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              {props.clientSlug?.trim() ? `Slug: ${props.clientSlug}` : `ID: ${shortId(props.clientId)}`}
            </div>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label='Client context navigation'>
          <Link href={dashboardHref} style={tabStyle(props.activeTab === 'dashboard')}>
            Dashboard
          </Link>
          <Link href={settingsHref} style={tabStyle(props.activeTab === 'settings')}>
            Settings
          </Link>
          <Link href={usersHref} style={tabStyle(props.activeTab === 'users')}>
            Team
          </Link>
        </nav>
      </section>

      <div style={{ marginTop: 14 }}>{props.children}</div>
    </main>
  )
}
