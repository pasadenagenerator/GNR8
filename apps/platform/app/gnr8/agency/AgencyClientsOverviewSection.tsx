import Link from 'next/link'
import type { CSSProperties } from 'react'

type ClientDirectoryRow = {
  id: string
  name: string | null
  slug: string | null
  created_at: string | null
}

type Props = {
  agencyId: string
  canCreateClient: boolean
  canEditClientSettings: boolean
  canViewClientUsers: boolean
  clientDirectory: ClientDirectoryRow[]
}

function formatTimestamp(value: string | null): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.valueOf())) return raw
  return parsed.toISOString()
}

function actionLinkStyle(): CSSProperties {
  return {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#0f172a',
    background: '#fff',
  }
}

function disabledActionStyle(): CSSProperties {
  return {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    color: '#94a3b8',
    background: '#f8fafc',
    display: 'inline-flex',
    alignItems: 'center',
  }
}

export default function AgencyClientsOverviewSection(props: Props) {
  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ marginTop: 0, marginBottom: 0, color: '#0f172a' }}>Client Overview</h2>
        {props.canCreateClient ? (
          <Link href={`/gnr8/agency/clients/new?agency=${encodeURIComponent(props.agencyId)}`} style={actionLinkStyle()}>
            Add Client
          </Link>
        ) : (
          <span style={disabledActionStyle()}>Add Client</span>
        )}
      </div>

      {props.clientDirectory.length === 0 ? (
        <p style={{ marginBottom: 0, color: '#475569' }}>No clients yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                <th style={{ padding: '8px 10px' }}>Name</th>
                <th style={{ padding: '8px 10px' }}>Slug</th>
                <th style={{ padding: '8px 10px' }}>Client ID</th>
                <th style={{ padding: '8px 10px' }}>Created At</th>
                <th style={{ padding: '8px 10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.clientDirectory.map((client) => (
                <tr key={client.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 10px' }}>{client.name?.trim() || '-'}</td>
                  <td style={{ padding: '8px 10px' }}>{client.slug?.trim() || '-'}</td>
                  <td
                    style={{
                      padding: '8px 10px',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                    }}
                    title={client.id}
                  >
                    {client.id}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{formatTimestamp(client.created_at)}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link
                        href={`/gnr8/agency/clients/${encodeURIComponent(client.id)}/dashboard?agency=${encodeURIComponent(props.agencyId)}`}
                        style={actionLinkStyle()}
                      >
                        Enter Client Workspace
                      </Link>
                      {props.canEditClientSettings ? (
                        <Link
                          href={`/gnr8/agency/clients/${encodeURIComponent(client.id)}/settings?agency=${encodeURIComponent(props.agencyId)}`}
                          style={actionLinkStyle()}
                        >
                          Client Settings
                        </Link>
                      ) : (
                        <span style={disabledActionStyle()}>Client Settings</span>
                      )}
                      {props.canViewClientUsers ? (
                        <Link
                          href={`/gnr8/agency/clients/${encodeURIComponent(client.id)}/users?agency=${encodeURIComponent(props.agencyId)}`}
                          style={actionLinkStyle()}
                        >
                          Client Team
                        </Link>
                      ) : (
                        <span style={disabledActionStyle()}>Client Team</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
