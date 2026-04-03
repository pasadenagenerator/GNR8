import Link from 'next/link'
import { redirect } from 'next/navigation'

import { listSwitchableAgencyClientsForPage } from '../../client-switcher-options'
import ClientContextLayout from '../ClientContextLayout'
import { getClientDashboardReadModelForPage } from '@/gnr8/client/client-dashboard-read-model'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

type SearchParams = {
  agency?: string
}

type Params = {
  clientId?: string
}

type ClientOrganizationRow = {
  id: string | null
  name: string | null
  agency_id: string | null
  organization_type: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientDashboardEntryPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = normalizeText(resolvedParams.clientId)
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null

  if (!clientId) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Client scope is required.</p>
        </div>
      </main>
    )
  }

  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgencyForPage>> | null = null
  let agencyAccessErrorCode: ResolveCurrentAgencyError['code'] | null = null
  let availableAgencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>['memberships'] = []
  let switchableClients: Awaited<ReturnType<typeof listSwitchableAgencyClientsForPage>> = []

  try {
    const resolvedAgency = await resolveCurrentUserAgencyForPage({
      activeAgencyId: requestedAgencyId,
    })
    currentUserAgency = resolvedAgency
    const membershipContext = await listCurrentUserAgencyMembershipsForPage()
    availableAgencyMemberships = membershipContext.memberships
    switchableClients = await listSwitchableAgencyClientsForPage({ agencyId: resolvedAgency.agency_id })
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') {
      redirect('/login')
    }
    if (error instanceof ResolveCurrentAgencyError) {
      agencyAccessErrorCode = error.code
      try {
        const membershipContext = await listCurrentUserAgencyMembershipsForPage()
        availableAgencyMemberships = membershipContext.memberships
      } catch (membershipError) {
        if (!(membershipError instanceof ResolveCurrentAgencyError && membershipError.code === 'UNAUTHORIZED')) {
          throw membershipError
        }
      }
    } else {
      throw error
    }
  }

  if (currentUserAgency == null) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'No agency membership found for this account.'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
                ? 'Select an agency before opening a client dashboard.'
                : 'Agency scope is unavailable for this client view.'}
          </p>
          {availableAgencyMemberships.length > 0 ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {availableAgencyMemberships.map((membership) => (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard?agency=${encodeURIComponent(membership.agency_id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid #fecaca',
                    background: '#fff',
                    color: '#991b1b',
                    textDecoration: 'none',
                    fontSize: 12,
                  }}
                >
                  {(membership.agency_name?.trim() || membership.agency_id).trim()}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    )
  }

  if (!canPerformAction(currentUserAgency.role, 'view_dashboard')) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to view agency-managed client dashboard data.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await getSupabaseServerClientReadOnly()
  const clientResult = await supabase
    .from('organizations')
    .select('id,name,agency_id,organization_type')
    .eq('id', clientId)
    .eq('agency_id', currentUserAgency.agency_id)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (clientResult.error) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to resolve client scope: {clientResult.error.message}</p>
        </div>
      </main>
    )
  }

  const client = clientResult.data as ClientOrganizationRow | null
  if (!client) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for this agency context. Access is blocked by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  const readModel = await getClientDashboardReadModelForPage({
    clientId,
    agencyId: currentUserAgency.agency_id,
    limit: 120,
  })

  return (
    <ClientContextLayout
      agencyId={currentUserAgency.agency_id}
      requestedAgencyId={requestedAgencyId}
      memberships={availableAgencyMemberships}
      clientId={clientId}
      clientName={readModel.client.client_name?.trim() || shortId(clientId)}
      clientOptions={switchableClients}
      activeTab='dashboard'
    >
      <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
        <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
          <div>
            <strong>Client:</strong> {readModel.client.client_name?.trim() || shortId(clientId)}
          </div>
          <div>
            <strong>Parent Agency:</strong> {readModel.agency.agency_name?.trim() || shortId(currentUserAgency.agency_id)}
          </div>
          <div>
            <strong>Role:</strong> {currentUserAgency.role}
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        <article style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Total Sites</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{readModel.summary.total_sites}</div>
        </article>
        <article style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Live</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: '#065f46' }}>{readModel.summary.live_sites}</div>
        </article>
        <article style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Needs Attention</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: '#9a3412' }}>
            {readModel.summary.needs_attention_sites}
          </div>
        </article>
      </section>

      <section style={{ marginTop: 14, border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>Client Sites</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>Domain</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>Site Status</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>Pipeline Status</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>Runtime State</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {readModel.site_rows.map((site) => (
                <tr key={site.site_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', color: '#0f172a' }}>{site.domain || shortId(site.site_id)}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{site.site_status}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{site.migration_status}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{site.latest_runtime_state || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {site.live_url ? (
                        <a
                          href={site.live_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: 7,
                            padding: '4px 7px',
                            fontSize: 12,
                            textDecoration: 'none',
                            color: '#0f172a',
                            background: '#fff',
                          }}
                        >
                          View Site
                        </a>
                      ) : (
                        <span
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 7,
                            padding: '4px 7px',
                            fontSize: 12,
                            color: '#94a3b8',
                            background: '#f8fafc',
                          }}
                        >
                          View Site
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          href={`/gnr8/client?client=${encodeURIComponent(clientId)}`}
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
          Open Client-Side Route
        </Link>
      </div>
    </ClientContextLayout>
  )
}
