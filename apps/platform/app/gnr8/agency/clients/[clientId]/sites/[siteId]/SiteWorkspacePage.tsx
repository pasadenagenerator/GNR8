import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'

import SiteContextLayout from './SiteContextLayout'
import SiteActionsPanel from './SiteActionsPanel'
import { listSwitchableAgencyClientsForPage } from '../../../client-switcher-options'
import { getSiteWorkspaceReadModelForPage } from '@/gnr8/site/site-workspace-read-model'
import { type SiteWorkspaceTab } from '@/gnr8/site/site-workspace-navigation'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'

type SearchParams = {
  agency?: string
  admin_view?: string
  variant?: string
}

type Params = {
  clientId?: string
  siteId?: string
}

type Props = {
  activeTab: SiteWorkspaceTab
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function sectionCardStyle(): CSSProperties {
  return {
    border: '1px solid #dbe6f1',
    borderRadius: 12,
    background: '#fff',
    padding: 14,
  }
}

function renderOverviewContent(props: {
  readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>
  structureHref: string
  designHref: string
  previewHref: string
}): ReactNode {
  const readModel = props.readModel
  if (!readModel) return null

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={sectionCardStyle()}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Site Overview</h2>
        <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
          Site: <strong>{readModel.settings.name}</strong>
          {readModel.settings.domain ? ` · ${readModel.settings.domain}` : ''}
        </p>
        <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 13 }}>
          Status: <strong>{readModel.overview.statusLabel.replace('_', ' ')}</strong>
          {readModel.pipeline.latestRunAt ? ` · Last run: ${new Date(readModel.pipeline.latestRunAt).toLocaleString()}` : ''}
        </p>
      </section>

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Pipeline Summary</h3>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
          <div>Sections detected: {readModel.overview.sectionsDetected}</div>
          <div>Hero detected: {readModel.overview.heroDetected ? 'yes' : 'no'}</div>
          <div>CTA detected: {readModel.overview.ctaDetected ? 'yes' : 'no'}</div>
          <div>Design strategy: {readModel.overview.designStrategy}</div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Quick Actions</h3>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={props.previewHref} style={quickActionStyle()}>
            Open Preview
          </Link>
          <Link href={props.structureHref} style={quickActionStyle()}>
            View Structure
          </Link>
          <Link href={props.designHref} style={quickActionStyle()}>
            View Design Decisions
          </Link>
        </div>
      </section>
    </div>
  )
}

function quickActionStyle(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 11px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
    background: '#fff',
  }
}

function renderStructureContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null

  return (
    <section style={sectionCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Structure View</h2>
      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
        Operator/debug surface for detected sections, section types, confidence, and key diagnostics.
      </p>

      {readModel.structure.rows.length > 0 ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {readModel.structure.rows.map((row) => (
            <article key={`${row.pageId}:${row.sectionId}:${row.ordinalIndex}`} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
                <div>
                  <strong>{row.sectionType}</strong> · {row.sectionId}
                </div>
                <div>
                  Page: {row.pagePath} · Order: {row.ordinalIndex}
                </div>
                <div>
                  Confidence: {row.confidenceLabel} ({row.confidenceScore.toFixed(2)})
                </div>
                <div>
                  Diagnostics:{' '}
                  {row.keyDiagnostics.length > 0 ? row.keyDiagnostics.join(', ') : 'none'}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 12, color: '#475569', fontSize: 13 }}>
          No structure sections were detected for the latest runtime snapshot.
        </p>
      )}
    </section>
  )
}

function renderDesignContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={sectionCardStyle()}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Design View</h2>
        <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
          Why GNR8 selected this strategy and section-level design behavior.
        </p>
        <div style={{ marginTop: 10, display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
          <div>Selected page strategy: {readModel.design.selectedPageStrategy}</div>
          <div>AI suggestion status: {readModel.design.aiSuggestionStatus}</div>
          <div>
            Visual signals: hero={readModel.design.visualSignals.heroProminence}, density={readModel.design.visualSignals.visualDensity}, cta={readModel.design.visualSignals.ctaProminence}
          </div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Section Decisions</h3>
        {readModel.design.sectionDecisions.length > 0 ? (
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {readModel.design.sectionDecisions.map((decision) => (
              <article key={decision.sectionId} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
                  <div>
                    <strong>{decision.sectionType}</strong> · {decision.sectionId}
                  </div>
                  <div>Treatment: {decision.visualTreatment}</div>
                  <div>Rationale: {decision.rationale.join(' ')}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: 10, color: '#475569', fontSize: 13 }}>
            No section design decisions are currently available.
          </p>
        )}
      </section>
    </div>
  )
}

function renderPreviewContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null

  return (
    <section style={sectionCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Preview View</h2>
      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
        Preview output from the latest site runtime version.
      </p>
      {readModel.preview.selectedVariantLabel ? (
        <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
          Active variant: <strong>{readModel.preview.selectedVariantLabel}</strong>
        </p>
      ) : null}
      {readModel.preview.previewUrl ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={readModel.preview.previewUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
              Open in New Tab
            </a>
            {readModel.preview.liveUrl ? (
              <a href={readModel.preview.liveUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                Open Live Domain
              </a>
            ) : null}
          </div>
          <iframe
            title='Site preview'
            src={readModel.preview.previewUrl}
            style={{ width: '100%', minHeight: 640, border: '1px solid #dbe6f1', borderRadius: 10, background: '#fff' }}
          />
        </div>
      ) : (
        <p style={{ marginTop: 10, color: '#475569', fontSize: 13 }}>
          No preview is available yet for this site.
        </p>
      )}
    </section>
  )
}

function renderSettingsContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null

  return (
    <section style={sectionCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Settings View</h2>
      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
        Minimal site settings foundation. Publish controls, branding overrides, and environment options will be added later.
      </p>
      <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
        <div>
          <strong>Name:</strong> {readModel.settings.name}
        </div>
        <div>
          <strong>Domain:</strong> {readModel.settings.domain || 'not set'}
        </div>
        <div>
          <strong>Future placeholders:</strong> publish settings, branding overrides, environment
        </div>
      </div>
    </section>
  )
}

function renderAccessError(input: { title: string; message: string; links?: { href: string; label: string }[] }) {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>{input.title}</h1>
      <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
        <p style={{ margin: 0, color: '#7f1d1d' }}>{input.message}</p>
        {input.links && input.links.length > 0 ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {input.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
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
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default async function SiteWorkspacePage(props: Props) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = normalizeText(resolvedParams.clientId)
  const siteId = normalizeText(resolvedParams.siteId)
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null
  const adminView = normalizeText(resolvedSearchParams?.admin_view) === '1'
  const selectedVariantId = normalizeText(resolvedSearchParams?.variant) || null

  if (!clientId || !siteId) {
    return renderAccessError({
      title: 'Site Workspace',
      message: 'Client scope and site scope are required.',
    })
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
      } catch {
        // ignore secondary membership errors
      }
    } else {
      throw error
    }
  }

  if (currentUserAgency == null) {
    return renderAccessError({
      title: 'Site Workspace',
      message:
        agencyAccessErrorCode === 'NO_MEMBERSHIP'
          ? 'No agency membership found for this account.'
          : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
            ? 'Select an agency before opening a site workspace.'
            : 'Agency scope is unavailable for this site view.',
      links: availableAgencyMemberships.map((membership) => ({
        href: `/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard?agency=${encodeURIComponent(membership.agency_id)}${adminView ? '&admin_view=1' : ''}&client_tab=dashboard`,
        label: (membership.agency_name?.trim() || membership.agency_id).trim(),
      })),
    })
  }

  if (!canPerformAction(currentUserAgency.role, 'view_dashboard')) {
    return renderAccessError({
      title: 'Site Workspace',
      message: 'Your role is not authorized to view agency-managed site workspace data.',
    })
  }

  const readModel = await getSiteWorkspaceReadModelForPage({
    agencyId: currentUserAgency.agency_id,
    clientId,
    siteId,
    selectedVariantId,
  })

  if (!readModel) {
    return renderAccessError({
      title: 'Site Workspace',
      message: 'Site was not found in the resolved client/agency scope. Access is blocked by fail-closed policy.',
      links: [
        {
          href: `/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard?agency=${encodeURIComponent(currentUserAgency.agency_id)}${adminView ? '&admin_view=1' : ''}&client_tab=dashboard`,
          label: 'Back to Client Dashboard',
        },
      ],
    })
  }

  const selectedVariantQuery = readModel.variants.selectedVariantId ? `&variant=${encodeURIComponent(readModel.variants.selectedVariantId)}` : ''
  const structureHref = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/structure?agency=${encodeURIComponent(currentUserAgency.agency_id)}${adminView ? '&admin_view=1' : ''}${selectedVariantQuery}`
  const designHref = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/design?agency=${encodeURIComponent(currentUserAgency.agency_id)}${adminView ? '&admin_view=1' : ''}${selectedVariantQuery}`
  const previewHref = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/preview?agency=${encodeURIComponent(currentUserAgency.agency_id)}${adminView ? '&admin_view=1' : ''}${selectedVariantQuery}`
  const canRunTransformation = canPerformAction(currentUserAgency.role, 'run_migration')
  const canPublish = canPerformAction(currentUserAgency.role, 'publish')

  return (
    <SiteContextLayout
      activeTab={props.activeTab}
      readModel={readModel}
      agencyId={currentUserAgency.agency_id}
      requestedAgencyId={requestedAgencyId}
      adminView={adminView}
      memberships={availableAgencyMemberships}
      clientOptions={switchableClients}
      selectedVariantId={readModel.variants.selectedVariantId}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <SiteActionsPanel
          siteId={readModel.site.id}
          agencyId={currentUserAgency.agency_id}
          clientId={readModel.client.clientId}
          siteName={readModel.site.label}
          activeTab={props.activeTab}
          canRunTransformation={canRunTransformation}
          canPublish={canPublish}
          lastRunAt={readModel.pipeline.latestRunAt}
          currentStatus={readModel.actions.currentStatus}
          lastAction={readModel.actions.lastAction}
          variants={readModel.variants}
        />

        {props.activeTab === 'overview'
          ? renderOverviewContent({
              readModel,
              structureHref,
              designHref,
              previewHref,
            })
          : null}
        {props.activeTab === 'structure' ? renderStructureContent(readModel) : null}
        {props.activeTab === 'design' ? renderDesignContent(readModel) : null}
        {props.activeTab === 'preview' ? renderPreviewContent(readModel) : null}
        {props.activeTab === 'settings' ? renderSettingsContent(readModel) : null}
      </div>
    </SiteContextLayout>
  )
}
