import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'

import SiteContextLayout from './SiteContextLayout'
import SiteActionsPanel from './SiteActionsPanel'
import ContentBindingsPanel from './ContentBindingsPanel'
import SiteDeletePanel from './SiteDeletePanel'
import SiteDomainSettingsPanel from './SiteDomainSettingsPanel'
import SiteBootstrapStatusPanel from './SiteBootstrapStatusPanel'
import { listSwitchableAgencyClientsForPage } from '../../../client-switcher-options'
import { getSiteWorkspaceReadModelForPage } from '@/gnr8/site/site-workspace-read-model'
import { type SiteWorkspaceTab } from '@/gnr8/site/site-workspace-navigation'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'
import {
  buildMultiPageRawTemplatePreviewDiagnostics,
  buildMultiPageRawTemplatePreviewLinks,
  buildPreviewModeGuardrailWarning,
} from '@/gnr8/site/site-multipage-preview-links'
import { hasMultiPageImportOperatorSignal } from '@/gnr8/site/site-multipage-operator-signal'

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
      {(() => {
        const isImportedSite = readModel.overview.rawImportArtifactFound
        const readinessTitle = isImportedSite ? 'Site Import Readiness' : 'Template Bootstrap Readiness'
        const templateSourceLabel = isImportedSite ? 'Import source' : 'Template source'
        const previewReadyLabel = isImportedSite ? 'Import preview ready' : 'Preview ready'
        const artifactFoundLabel = isImportedSite ? 'Raw import artifact found' : 'Raw template artifact found'
        const entryHtmlFoundLabel = isImportedSite ? 'Imported entry HTML found' : 'Template entry HTML found'
        const fileMapCountLabel = isImportedSite ? 'Raw import file map count' : 'Raw template file map count'

        return (
          <>
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
        <div style={{ marginTop: 10, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
          <div>Latest Import Run ID: {readModel.pipeline.importVersion.latestImportRunId ?? 'n/a'}</div>
          <div>Latest Import siteVersionId: {readModel.pipeline.importVersion.latestImportSiteVersionId ?? 'n/a'}</div>
          <div>Latest Import artifactId: {readModel.pipeline.importVersion.latestImportArtifactId ?? 'n/a'}</div>
          <div>Latest Import createdAt: {formatTimestamp(readModel.pipeline.importVersion.latestImportCreatedAt)}</div>
          <div>Latest Import updatedAt: {formatTimestamp(readModel.pipeline.importVersion.latestImportUpdatedAt)}</div>
          <div>Selected Workspace siteVersionId: {readModel.pipeline.importVersion.selectedWorkspaceSiteVersionId ?? 'n/a'}</div>
          <div>Selected Workspace artifactId: {readModel.pipeline.importVersion.selectedWorkspaceArtifactId ?? 'n/a'}</div>
          <div>Workspace Version Selection: {readModel.pipeline.importVersion.selectionLabel}</div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{readinessTitle}</h3>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
          <div>{templateSourceLabel}: {readModel.overview.templateSource ?? 'unknown'}</div>
          {isImportedSite ? <div>Import source URL: {readModel.overview.rawImportSourceUrl ?? 'n/a'}</div> : null}
          {isImportedSite ? <div>Final URL: {readModel.overview.rawImportFinalUrl ?? 'n/a'}</div> : null}
        </div>
        <SiteBootstrapStatusPanel
          clientId={readModel.client.clientId}
          siteId={readModel.site.id}
          labels={{
            previewReady: previewReadyLabel,
            artifactFound: artifactFoundLabel,
            entryHtmlFound: entryHtmlFoundLabel,
            fileMapCount: fileMapCountLabel,
          }}
          initialStatus={{
            ok: true,
            siteId: readModel.site.id,
            runtimeSiteId: readModel.pipeline.runtimeSelection.selectedSiteId,
            siteVersionId: readModel.pipeline.runtimeSelection.selectedVersionId,
            status: readModel.overview.previewReady
              ? 'preview_ready'
              : readModel.overview.bootstrapStatus === 'failed'
                ? 'failed'
                : 'bootstrap_running',
            previewReady: readModel.overview.previewReady,
            previewUrl: readModel.preview.previewUrl,
            rawTemplateArtifactFound: readModel.overview.rawTemplateArtifactFound,
            entryHtmlFound: readModel.overview.rawTemplateEntryHtmlFound,
            fileMapCount: readModel.overview.rawTemplateFileMapCount,
            slotCount: readModel.overview.contentSlotCount,
            publishReady: readModel.overview.publishReady,
            diagnostics: [
              'TEMPLATE_SITE_STATUS_REQUESTED',
              ...readModel.overview.createDiagnostics,
              readModel.overview.bootstrapStatus === 'failed' ? 'TEMPLATE_SITE_STATUS_FAILED' : null,
              'TEMPLATE_SITE_STATUS_RESOLVED',
            ].filter((value): value is string => Boolean(value)),
            reasonCode: readModel.overview.reasonCode,
          }}
        />
      </section>
          </>
        )
      })()}

      {renderMultiPageImportOperatorContent(readModel)}

      {renderOriginalMirrorFidelity(readModel)}
      {renderReconstructionReadiness(readModel)}

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Pipeline Summary</h3>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
          <div>Sections detected: {readModel.overview.sectionsDetected}</div>
          <div>Hero detected: {readModel.overview.heroDetected ? 'yes' : 'no'}</div>
          <div>CTA detected: {readModel.overview.ctaDetected ? 'yes' : 'no'}</div>
          <div>Design strategy: {readModel.overview.designStrategy}</div>

          <div style={{ marginTop: 8, fontWeight: 700, color: '#0f172a' }}>Import Evidence</div>
          <div>Source mode: {readModel.pipeline.renderedCapture?.used ? 'Rendered Capture' : 'Raw HTML (fallback)'}</div>
          <div>Capture mode: {readModel.pipeline.captureMode}</div>
          <div>Fidelity: {readModel.pipeline.importFidelityDegraded ? 'degraded' : 'high'}</div>
          <div>Rendered capture status: {readModel.pipeline.renderedCaptureStatus}</div>
          <div>Rendered capture quality: {readModel.pipeline.renderedCapture?.quality ?? readModel.pipeline.renderedDomQuality}</div>
          <div>DOM size: {readModel.pipeline.renderedCapture?.nodeCount ?? 0} nodes</div>
          <div>Screenshot count: {readModel.pipeline.screenshotCount}</div>
          <div>Preview mode: {readModel.preview.previewMode ?? 'unknown'}</div>
          <div>
            Style samples: {readModel.pipeline.renderedCapture?.styleSampleCount ?? readModel.pipeline.computedStyleSampleCount} (coverage{' '}
            {Math.round((readModel.pipeline.renderedCapture?.styleCoverage ?? readModel.pipeline.styleSignalCoverage ?? 0) * 100)}%)
          </div>
          <div>
            Screenshots: viewport {readModel.pipeline.renderedCapture?.screenshots.viewport ? 'yes' : 'no'} / full {readModel.pipeline.renderedCapture?.screenshots.fullPage ? 'yes' : 'no'}
          </div>
          <div>Style source: {readModel.pipeline.styleSignalSourceMode}</div>
          <div>Style coverage: {Math.round(readModel.pipeline.styleSignalCoverage * 100)}%</div>
          <div>Fallback used: {readModel.pipeline.sourceMode === 'raw_html_fallback' ? 'yes' : 'no'}</div>
          <div>Raw import artifact: {readModel.overview.rawImportArtifactFound ? 'yes' : 'no'}</div>
          <div>Persisted asset count: {readModel.overview.rawImportPersistedAssetCount}</div>
          <div>External fallback asset count: {readModel.overview.rawImportExternalFallbackAssetCount}</div>
          <div>Source URL: {readModel.overview.rawImportSourceUrl ?? 'n/a'}</div>
          <div>Final URL: {readModel.overview.rawImportFinalUrl ?? 'n/a'}</div>
          {readModel.pipeline.styleSignals ? (
            <>
              <div>
                Style summary: background {readModel.pipeline.styleSignals.colors.backgroundTone}, accent {readModel.pipeline.styleSignals.colors.primaryAccent ?? 'none'}, cta{' '}
                {readModel.pipeline.styleSignals.cta.styleHint}/{readModel.pipeline.styleSignals.cta.prominence}
              </div>
              <div>
                Typography/spacing: {readModel.pipeline.styleSignals.typography.headingCategory}/{readModel.pipeline.styleSignals.typography.bodyCategory} ·{' '}
                {readModel.pipeline.styleSignals.spacing.rhythm}/{readModel.pipeline.styleSignals.spacing.layoutDensity}
              </div>
              <div>
                Style confidence: {Math.round(readModel.pipeline.styleSignalCoverage * 100)}% coverage · {readModel.pipeline.styleSignals.diagnostics.length} diagnostic
                {readModel.pipeline.styleSignals.diagnostics.length === 1 ? '' : 's'}
              </div>
            </>
          ) : null}

          <details style={{ marginTop: 6 }}>
            <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>Show Import Evidence Details</summary>
            <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 12 }}>
              <div>rendered-dom.html: {readModel.pipeline.evidencePaths.renderedDomPath ?? 'missing'}</div>
              <div>computed-styles.json: {readModel.pipeline.evidencePaths.computedStylesPath ?? 'missing'}</div>
              <div>acquisition-evidence.json: {readModel.pipeline.evidencePaths.acquisitionEvidencePath ?? 'missing'}</div>
              <div>
                Diagnostics:{' '}
                {readModel.pipeline.evidenceDiagnostics.length > 0 ? readModel.pipeline.evidenceDiagnostics.join(' · ') : 'none'}
              </div>
            </div>
          </details>

          <div>Import diagnostics: {readModel.pipeline.importDiagnosticCodes.length > 0 ? readModel.pipeline.importDiagnosticCodes.join(' · ') : 'none'}</div>
          <div>Capture evidence refs: {readModel.pipeline.captureEvidenceRefs.length > 0 ? readModel.pipeline.captureEvidenceRefs.join(' · ') : 'none'}</div>
          <div>Acquisition diagnostics: {readModel.pipeline.diagnosticsSummary.length > 0 ? readModel.pipeline.diagnosticsSummary.join(' · ') : 'none'}</div>
          {readModel.pipeline.importFidelityDegraded ? (
            <div>Imported using raw HTML fallback. Some structure may be incomplete.</div>
          ) : null}
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
          <div>Hero title: {readModel.content.hero?.title ?? 'n/a'}</div>
          <div>Hero subtitle: {readModel.content.hero?.subtitle ?? 'n/a'}</div>
          <div>Sections: {readModel.content.sections.length}</div>
          <div>
            Section types:{' '}
            {readModel.content.sections.length > 0
              ? readModel.content.sections.map((section) => section.type).join(' · ')
              : 'none'}
          </div>
          <div>
            Images by role:{' '}
            {Object.entries(readModel.content.imagesByRole)
              .map(([role, values]) => `${role}=${values.length}`)
              .join(' · ')}
          </div>
          <div>
            Semantic diagnostics:{' '}
            {readModel.content.diagnostics.length > 0
              ? readModel.content.diagnostics.map((diag) => diag.code).join(' · ')
              : 'none'}
          </div>
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

function compactMetricStyle(): CSSProperties {
  return {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 10,
    background: '#f8fafc',
    minWidth: 150,
  }
}

function renderMetric(label: string, value: string | number): ReactNode {
  return (
    <div style={compactMetricStyle()}>
      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function badgeStyle(value: 'HIGH' | 'MEDIUM' | 'LOW'): CSSProperties {
  const colors =
    value === 'HIGH'
      ? { border: '#bbf7d0', background: '#f0fdf4', text: '#166534' }
      : value === 'MEDIUM'
        ? { border: '#fde68a', background: '#fffbeb', text: '#92400e' }
        : { border: '#fecaca', background: '#fff5f5', text: '#991b1b' }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.background,
    color: colors.text,
    padding: '3px 7px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0,
  }
}

function reconstructionReadinessBadgeStyle(value: 'NOT_READY' | 'MINIMUM_READY' | 'RECOMMENDED' | 'HIGH_CONFIDENCE'): CSSProperties {
  const colors =
    value === 'HIGH_CONFIDENCE'
      ? { border: '#bbf7d0', background: '#f0fdf4', text: '#166534' }
      : value === 'RECOMMENDED'
        ? { border: '#bfdbfe', background: '#eff6ff', text: '#1d4ed8' }
        : value === 'MINIMUM_READY'
          ? { border: '#fde68a', background: '#fffbeb', text: '#92400e' }
          : { border: '#fecaca', background: '#fff5f5', text: '#991b1b' }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.background,
    color: colors.text,
    padding: '3px 7px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0,
  }
}

function renderInlineList(items: string[]): string {
  return items.length > 0 ? items.join(' · ') : 'none'
}

function renderReconstructionReadiness(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null
  const readiness = readModel.reconstructionReadiness

  return (
    <section style={sectionCardStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Reconstruction Readiness</h3>
        <span style={reconstructionReadinessBadgeStyle(readiness.readinessLevel)}>{readiness.readinessLevel}</span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 10, fontSize: 12, color: '#334155' }}>
        <div style={{ fontSize: 13 }}>{readiness.readinessSummary}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
          <div style={compactMetricStyle()}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Readiness Level</div>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginTop: 4 }}>{readiness.readinessLevel}</div>
          </div>
          <div style={compactMetricStyle()}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Blocker Count</div>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginTop: 4 }}>{readiness.blockerCount}</div>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>Blockers</div>
          {readiness.blockers.length > 0 ? (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {readiness.blockers.map((blocker) => (
                <li key={blocker.id}>
                  <strong>{blocker.title}</strong> ({blocker.severity}): {blocker.description}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 4, color: '#64748b' }}>none</div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>Required Evidence Present</div>
            <div style={{ marginTop: 4 }}>{renderInlineList(readiness.requiredEvidencePresent)}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>Required Evidence Missing</div>
            <div style={{ marginTop: 4 }}>{renderInlineList(readiness.requiredEvidenceMissing)}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>Optional Evidence Present</div>
            <div style={{ marginTop: 4 }}>{renderInlineList(readiness.optionalEvidencePresent)}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>Optional Evidence Missing</div>
            <div style={{ marginTop: 4 }}>{renderInlineList(readiness.optionalEvidenceMissing)}</div>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>Confidence Inputs</div>
          <div style={{ marginTop: 4 }}>
            {readiness.confidenceInputs.length > 0
              ? readiness.confidenceInputs.map((input) => `${input.kind}: ${input.description}`).join(' · ')
              : 'none'}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>Next Recommended Capture Expansion</div>
          <div style={{ marginTop: 4 }}>{renderInlineList(readiness.nextRecommendedCaptureExpansion)}</div>
        </div>
      </div>
    </section>
  )
}

function renderOriginalMirrorFidelity(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null
  const fidelity = readModel.originalMirrorFidelity
  const coverage = fidelity.summary

  return (
    <section style={sectionCardStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Original Mirror Fidelity</h3>
        <span style={badgeStyle(fidelity.badge)}>{fidelity.badge}</span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <div style={compactMetricStyle()}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Capture Status</div>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginTop: 4 }}>{coverage.captureStatus}</div>
          </div>
          <div style={compactMetricStyle()}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Coverage Status</div>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginTop: 4 }}>{coverage.coverageStatus}</div>
          </div>
          <div style={compactMetricStyle()}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Reconstruction Readiness</div>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginTop: 4 }}>{fidelity.reconstructionReadiness}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {renderMetric('Supported', `${coverage.supportedEvidenceCount} (${coverage.supportedPercentage}%)`)}
          {renderMetric('Partial', `${coverage.partialEvidenceCount} (${coverage.partialPercentage}%)`)}
          {renderMetric('Missing', `${coverage.missingEvidenceCount} (${coverage.missingPercentage}%)`)}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Known Limitations</div>
          {fidelity.limitationsByCategory.length > 0 ? (
            fidelity.limitationsByCategory.map((group) => (
              <div key={group.category} style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{group.category}</div>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#334155', fontSize: 12 }}>
                  {group.limitations.map((limitation) => (
                    <li key={limitation.id}>
                      <strong>{limitation.title}</strong> ({limitation.severity}): {limitation.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div style={{ color: '#64748b', fontSize: 12 }}>No known limitations were present in the Evidence Capture Baseline.</div>
          )}
        </div>

        {fidelity.routeLimitations.length > 0 ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Route-Level Limitations</div>
            {fidelity.routeLimitations.map((route) => (
              <div key={route.routePath} style={{ fontSize: 12, color: '#334155' }}>
                <strong style={{ color: '#0f172a' }}>{route.routePath}</strong>: {route.limitations.map((limitation) => limitation.title).join(' · ')}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'n/a'
}

type DiscoveryPriorityTierOperatorRow = {
  tier: string
  candidateCount: number
  selectedCount: number
  excludedCount: number
}

function formatDiscoveryPriorityTier(row: DiscoveryPriorityTierOperatorRow): string {
  const tierLabel = row.tier.replace('tier_', 'T').replace('_', ' ')
  return `${tierLabel} ${row.selectedCount}/${row.candidateCount} selected, ${row.excludedCount} excluded`
}

function renderMessageList(title: string, items: string[], tone: 'warning' | 'blocker'): ReactNode {
  if (items.length === 0) return null
  const colors =
    tone === 'blocker'
      ? { border: '#fecaca', background: '#fff5f5', text: '#7f1d1d' }
      : { border: '#fde68a', background: '#fffbeb', text: '#78350f' }
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.background, padding: '8px 10px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: colors.text }}>{title}</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: colors.text, fontSize: 12 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function renderMultiPageImportOperatorContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null
  const summary = readModel.multiPageImport
  const rawPreviewSiteVersionId = readModel.pipeline.importVersion.latestImportSiteVersionId ?? readModel.pipeline.latestRuntimeSiteVersionId
  const previewLinks = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: rawPreviewSiteVersionId,
    routes: summary.routes,
  })
  const previewModeGuardrailWarning = buildPreviewModeGuardrailWarning({
    workspacePreviewUrl: readModel.preview.previewUrl,
    rawPreviewLinks: previewLinks,
  })
  const priorityBalance = summary.overview.discoveryPriorityBalancing
  const priorityTierRows: DiscoveryPriorityTierOperatorRow[] = priorityBalance.tiers
  const hasMultiPageSignal = hasMultiPageImportOperatorSignal({
    rawImportArtifactFound: readModel.overview.rawImportArtifactFound,
    discoveredRoutes: summary.overview.discovery.discoveredRoutes,
    sitemapCount: summary.overview.sitemapDiscovery.sitemapCount,
    sitemapDiscoveredUrlCount: summary.overview.sitemapDiscovery.discoveredUrlCount,
    canonicalUrlCount: summary.overview.canonicalDiscovery.canonicalUrlCount,
    hreflangGroupCount: summary.overview.canonicalDiscovery.hreflangGroupCount,
    prioritySelectedRouteCount: priorityBalance.selectedRouteCount,
    priorityExcludedRouteCount: priorityBalance.excludedRouteCount,
    fetchedPages: summary.overview.acquisition.fetchedPages,
    assembledPages: summary.overview.assembly.assembledPages,
    routeCount: summary.routes.length,
  })
  if (!hasMultiPageSignal) return null

  return (
    <section style={sectionCardStyle()}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Multi-Page Import</h3>
      <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {renderMetric('Discovery', `routes ${summary.overview.discovery.discoveredRoutes} / skipped ${summary.overview.discovery.skippedLinks}`)}
          {renderMetric(
            'Sitemap Discovery',
            `sitemaps ${summary.overview.sitemapDiscovery.sitemapCount} / urls ${summary.overview.sitemapDiscovery.discoveredUrlCount} / skipped ${summary.overview.sitemapDiscovery.skippedUrlCount}`,
          )}
          {renderMetric(
            'Canonical Discovery',
            `canonicals ${summary.overview.canonicalDiscovery.canonicalUrlCount} / conflicts ${summary.overview.canonicalDiscovery.conflictCount} / duplicates ${summary.overview.canonicalDiscovery.duplicateRouteCount} / hreflang ${summary.overview.canonicalDiscovery.hreflangGroupCount}`,
          )}
          {renderMetric(
            'Priority Balance',
            `selected ${priorityBalance.selectedRouteCount} / excluded ${priorityBalance.excludedRouteCount}`,
          )}
          {renderMetric('Acquisition', `fetched ${summary.overview.acquisition.fetchedPages} / failed ${summary.overview.acquisition.failedPages}`)}
          {renderMetric('Assembly', `assembled ${summary.overview.assembly.assembledPages} / excluded ${summary.overview.assembly.excludedPages}`)}
          {renderMetric('Validation', summary.overview.validation.status)}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: '8px 10px', color: '#334155', fontSize: 12 }}>
          <strong style={{ color: '#0f172a' }}>Raw Multi-Page Preview Version:</strong>{' '}
          selected siteVersionId {rawPreviewSiteVersionId ?? 'n/a'} · latest import run {readModel.pipeline.importVersion.latestImportRunId ?? 'n/a'} · artifact{' '}
          {readModel.pipeline.importVersion.latestImportArtifactId ?? 'n/a'}
        </div>

        {previewModeGuardrailWarning ? (
          <div style={{ border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb', padding: '8px 10px', color: '#92400e', fontSize: 12 }}>
            <strong style={{ color: '#78350f' }}>Preview Mode Warning:</strong> {previewModeGuardrailWarning.message}
          </div>
        ) : null}

        {summary.overview.sitemapDiscovery.warnings.length > 0 ? (
          <div style={{ border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb', padding: '8px 10px', color: '#92400e', fontSize: 12 }}>
            <strong style={{ color: '#78350f' }}>Sitemap Discovery:</strong> {summary.overview.sitemapDiscovery.warnings.join(' ')}
          </div>
        ) : null}

        {summary.overview.canonicalDiscovery.warnings.length > 0 ? (
          <div style={{ border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb', padding: '8px 10px', color: '#92400e', fontSize: 12 }}>
            <strong style={{ color: '#78350f' }}>Canonical Discovery:</strong> {summary.overview.canonicalDiscovery.warnings.join(' ')}
          </div>
        ) : null}

        {priorityTierRows.length > 0 ? (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: '8px 10px', color: '#334155', fontSize: 12 }}>
            <strong style={{ color: '#0f172a' }}>Priority Balance:</strong>{' '}
            {priorityTierRows.map(formatDiscoveryPriorityTier).join(' | ')}
          </div>
        ) : null}

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: '8px 10px', color: '#334155', fontSize: 12 }}>
          <strong style={{ color: '#0f172a' }}>Recommendation:</strong> {summary.overview.validation.recommendation}
        </div>

        {previewLinks.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gap: 4, fontSize: 12, color: '#334155' }}>
              {previewLinks.map((link, index) => (
                <div key={`${link.label}:${link.routePath}:url`}>
                  {index === 0 ? 'Root Raw Multi-Page Preview URL' : 'First Child Raw Multi-Page Preview URL'}: {link.href}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {previewLinks.map((link) => (
                <a key={`${link.label}:${link.routePath}`} href={link.href} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                {['Route', 'Priority', 'Status', 'Reason', 'Source URL', 'Final URL', 'Raw File'].map((heading) => (
                  <th key={heading} style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.routes.length > 0 ? (
                summary.routes.map((route) => (
                  <tr key={`${route.routePath}:${route.status}:${route.rawFilePath ?? 'none'}`}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#0f172a', fontWeight: 700 }}>{route.routePath}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#334155' }}>
                      {route.priorityTier ? route.priorityTier.replace('tier_', 'T').replace('_', ' ') : 'n/a'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: route.status === 'assembled' ? '#166534' : route.status === 'missing' || route.status === 'failed' ? '#991b1b' : '#334155' }}>
                      {route.status}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#334155' }}>
                      {route.skippedReason ?? route.selectionReason ?? 'n/a'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#334155' }}>{route.sourceUrl ?? 'n/a'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#334155' }}>{route.finalUrl ?? 'n/a'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f7', color: '#334155' }}>{route.rawFilePath ?? 'n/a'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '10px', color: '#64748b' }}>
                    No multi-page routes have been captured for this site version.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gap: 8, fontSize: 12, color: '#334155' }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>Validation Summary</div>
          <div>
            valid preview routes: {summary.validation.validPreviewRoutes} · missing preview routes: {summary.validation.missingPreviewRoutes} · rewritten links:{' '}
            {summary.validation.rewrittenLinksEvidenceSource === 'preview_validation' ? summary.validation.rewrittenLinks : 'not captured live'} · skipped links:{' '}
            {summary.validation.skippedLinks} · warnings: {summary.validation.warnings} · blockers: {summary.validation.blockers}
          </div>
          {renderMessageList('Warnings', summary.validation.warningSamples, 'warning')}
          {renderMessageList('Blockers', summary.validation.blockerSamples, 'blocker')}
        </div>

        <details style={{ display: 'grid', gap: 6, fontSize: 12, color: '#334155' }}>
          <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}>Show developer diagnostics</summary>
          <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
            {summary.diagnostics.map((group) => (
              <div key={group.group}>
                <strong>{group.group}:</strong> {group.count}
                {group.samples.length > 0 ? ` · ${group.samples.join(' · ')}` : ''}
              </div>
            ))}
            <div style={{ color: '#64748b' }}>
              Raw diagnostic codes are retained for debugging; operator warnings and blockers above are the primary readiness surface.
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}

function renderStructureContent(readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>): ReactNode {
  if (!readModel) return null

  return (
    <section style={sectionCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Structure View</h2>
      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
        Operator/debug surface for detected sections, section types, confidence, and key diagnostics.
      </p>
      <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
        Import provenance: {readModel.pipeline.sourceMode} · {readModel.pipeline.importFidelityStatus} · capture={readModel.pipeline.renderedCaptureStatus}
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
                  Merged blocks: {row.mergedBlockCount ?? 'n/a'} · Dominant candidate: {row.dominantCandidate ?? 'n/a'}
                </div>
                <div>
                  Top rationale: {row.dominantRationale ?? 'n/a'}
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
        <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
          Import provenance: {readModel.pipeline.sourceMode} · quality={readModel.pipeline.renderedDomQuality}
        </p>
        <div style={{ marginTop: 10, display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
          <div>Selected page strategy: {readModel.design.selectedPageStrategy}</div>
          <div>AI suggestion status: {readModel.design.aiSuggestionStatus}</div>
          <div>
            Visual signals: hero={readModel.design.visualSignals.heroProminence}, density={readModel.design.visualSignals.visualDensity}, cta={readModel.design.visualSignals.ctaProminence}
          </div>
          <div>
            Style signals: source={readModel.design.styleSignals.sourceMode}, tone={readModel.design.styleSignals.backgroundTone}, accent={readModel.design.styleSignals.primaryAccent ?? 'none'},
            type={readModel.design.styleSignals.headingCategory}/{readModel.design.styleSignals.bodyCategory}, spacing={readModel.design.styleSignals.spacingRhythm}/{readModel.design.styleSignals.layoutDensity},
            cta={readModel.design.styleSignals.ctaStyle}/{readModel.design.styleSignals.ctaProminence}
          </div>
          <div>
            Style diagnostics: {readModel.design.styleSignals.diagnostics.length > 0 ? readModel.design.styleSignals.diagnostics.join(' · ') : 'none'}
          </div>
          <div>
            Style confidence snapshot: coverage={Math.round(readModel.pipeline.styleSignalCoverage * 100)}% · fallback={readModel.pipeline.styleSignalFallbackUsed ? 'yes' : 'no'}
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
  const sectionRows = readModel.structure.rows
  const lowConfidenceCount = sectionRows.filter((row) => row.confidenceScore < 0.5).length
  const weakStructureMajority = sectionRows.length > 0 && lowConfidenceCount > sectionRows.length / 2
  const sectionsDetectedLow = readModel.overview.sectionsDetected <= 2
  const missingRenderedCapture = readModel.pipeline.renderedCaptureStatus !== 'available'
  const degradedImport = readModel.pipeline.importFidelityStatus !== 'high_fidelity_import'
  const weakDomQuality =
    (readModel.pipeline.renderedCapture?.nodeCount ?? 0) === 0 || readModel.pipeline.renderedDomQuality !== 'strong'

  const contentRecoveryReasons: string[] = []
  if (degradedImport) contentRecoveryReasons.push('degraded import')
  if (missingRenderedCapture) contentRecoveryReasons.push('missing rendered capture')
  if (weakStructureMajority || sectionsDetectedLow) contentRecoveryReasons.push('weak structure')
  if (weakDomQuality) contentRecoveryReasons.push('weak dom quality')
  const contentRecoveryModeActive = contentRecoveryReasons.length > 0

  const readinessLabel =
    readModel.preview.readiness === 'preview_available'
      ? 'Preview available'
      : readModel.preview.readiness === 'debug_only_artifact_available'
        ? 'Debug-only artifact available'
        : readModel.preview.readiness === 'import_captured_not_transformed'
          ? 'Import captured, transformed preview pending'
        : 'Preview unavailable'
  const previewModeLabel =
    readModel.preview.previewMode === 'react_preview'
      ? 'React preview'
      : readModel.preview.previewMode === 'react_preview_degraded'
        ? 'React preview (degraded)'
        : readModel.preview.previewMode === 'fallback_preview'
          ? 'Fallback preview'
          : readModel.preview.previewMode === 'semantic_fallback_preview'
            ? 'Semantic fallback preview'
            : readModel.preview.previewMode === 'raw_template_preview'
              ? 'Raw template preview'
            : contentRecoveryModeActive
              ? 'content recovery'
              : 'canonical'
  const primaryPreviewLabel = readModel.preview.sourceType === 'raw_imported'
    ? 'Open Original Preview'
    : 'Open Preview'
  const showExperimentalTransformedPreview =
    Boolean(readModel.preview.transformedPreviewUrl)
    && readModel.preview.transformedPreviewUrl !== readModel.preview.previewUrl
  const familyRenderModeLabel = readModel.preview.familyRenderMode ?? 'unavailable'
  const familyRenderDiagnostics = readModel.preview.familyRenderDiagnostics
  const rawPreviewSiteVersionId = readModel.pipeline.importVersion.latestImportSiteVersionId ?? readModel.pipeline.latestRuntimeSiteVersionId
  const rawPreviewLinks = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: rawPreviewSiteVersionId,
    routes: readModel.multiPageImport.routes,
  })
  const previewModeGuardrailWarning = buildPreviewModeGuardrailWarning({
    workspacePreviewUrl: readModel.preview.previewUrl,
    rawPreviewLinks,
  })
  const rawPreviewDiagnostics = buildMultiPageRawTemplatePreviewDiagnostics({
    siteVersionId: rawPreviewSiteVersionId,
    routes: readModel.multiPageImport.routes,
    rawTemplatePreviewEvidence: readModel.preview.previewRuntimeSummary?.rawTemplatePreviewEvidence ?? null,
  })
  const rawPreviewAssetEvidence = rawPreviewDiagnostics?.rawPreviewAssetRewriteEvidence ?? null
  const rawPreviewAssetGraphEvidence = rawPreviewDiagnostics?.rawPreviewAssetGraphEvidence ?? null
  const rawPreviewScriptPolicyEvidence = rawPreviewDiagnostics?.rawPreviewScriptPolicyEvidence ?? null
  const rawPreviewDuplicateGuardEvidence = rawPreviewDiagnostics?.rawPreviewDuplicateGuardEvidence ?? null
  const rawPreviewEmbedEvidence = rawPreviewDiagnostics?.rawPreviewEmbedEvidence ?? null
  const rawPreviewAssetsInspected =
    rawPreviewAssetEvidence?.assetReferencesInspected
    ?? ((rawPreviewAssetEvidence?.cssUrlReferencesFound ?? 0)
      + (rawPreviewAssetEvidence?.imageReferencesFound ?? 0)
      + (rawPreviewAssetEvidence?.fontStylesheetsFound ?? 0))
  const rawPreviewAssetsRewritten = rawPreviewAssetEvidence?.assetReferencesRewritten
    ?? ((rawPreviewAssetEvidence?.cssUrlReferencesRewritten ?? 0) + (rawPreviewDiagnostics?.rawPreviewAssetRewriteEvidence?.imageReferencesRewritten ?? 0))
  const rawPreviewAssetsMissing = rawPreviewAssetEvidence?.assetReferencesMissing
    ?? ((rawPreviewAssetEvidence?.cssUrlReferencesMissing ?? 0) + (rawPreviewAssetEvidence?.imageReferencesMissing ?? 0))
  const rawPreviewExternalPreserved = rawPreviewAssetEvidence?.assetReferencesExternalPreserved
    ?? ((rawPreviewAssetEvidence?.cssUrlReferencesExternalPreserved ?? 0) + (rawPreviewAssetEvidence?.fontStylesheetsPreserved ?? 0))
  const rawPreviewMissingRefs = rawPreviewAssetEvidence?.missingAssetReferences?.slice(0, 10) ?? []
  const primaryCssOrderPreview = rawPreviewAssetGraphEvidence?.cssCascadeOrderAfter
    ?.filter((entry) => entry.tagName === 'link' || entry.tagName === 'style' || entry.tagName === '@import')
    .slice(0, 8)
    .map((entry) => {
      const label = entry.reference ?? entry.tagName
      const media = entry.media ? ` media=${entry.media}` : ''
      const rel = entry.rel ? ` rel=${entry.rel}` : ''
      const asValue = entry.as ? ` as=${entry.as}` : ''
      return `${entry.index}:${entry.tagName}:${label}${rel}${asValue}${media}`
    }) ?? []
  const topMissingStylesheetRefs = rawPreviewAssetGraphEvidence?.missingStylesheetRefs?.length
    ? rawPreviewAssetGraphEvidence.missingStylesheetRefs.slice(0, 5)
    : rawPreviewAssetGraphEvidence?.topMissingStylesheetRefs?.slice(0, 5) ?? []
  const rawPreviewBlockedScriptReasons = rawPreviewScriptPolicyEvidence
    ? Object.entries(rawPreviewScriptPolicyEvidence.scriptsBlockedByReason)
        .sort(([leftReason, leftCount], [rightReason, rightCount]) => rightCount - leftCount || leftReason.localeCompare(rightReason))
        .slice(0, 8)
    : []
  const latestRawPreviewValidationEvidence = readModel.preview.latestRawPreviewValidationEvidence

  return (
    <section style={sectionCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Preview View</h2>
      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
        Original imported-site preview is the primary migration preview. GNR8 transformed preview remains available as an experimental debug surface.
      </p>
      <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
        Status: <strong>{readinessLabel}</strong>
      </p>
      <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
        Import provenance: {readModel.pipeline.sourceMode} · {readModel.pipeline.importFidelityStatus} · capture={readModel.pipeline.renderedCaptureStatus}
      </p>
      <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
        Preview mode: <strong>{previewModeLabel}</strong>
      </p>
      <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
        <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>GNR8 Transformed Preview (experimental)</div>
        <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
          <div>Mode: transformed</div>
          <div>Selected Workspace siteVersionId: {readModel.pipeline.importVersion.selectedWorkspaceSiteVersionId ?? 'n/a'}</div>
          <div>Selected Workspace artifactId: {readModel.pipeline.importVersion.selectedWorkspaceArtifactId ?? 'n/a'}</div>
          <div>URL: {readModel.preview.transformedPreviewUrl ?? readModel.preview.previewUrl ?? 'n/a'}</div>
        </div>
      </div>
      <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
        <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>Raw Imported Preview</div>
        <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
          <div>Mode: raw_template_preview</div>
          <div>Latest Import siteVersionId: {rawPreviewSiteVersionId ?? 'n/a'}</div>
          <div>Latest Import artifactId: {readModel.pipeline.importVersion.latestImportArtifactId ?? 'n/a'}</div>
          {rawPreviewLinks.length > 0 ? (
            rawPreviewLinks.map((link, index) => (
              <div key={`${link.label}:${link.routePath}:preview-mode-url`}>
                {index === 0 ? 'Root Raw Multi-Page Preview URL' : 'First Child Raw Multi-Page Preview URL'}: {link.href}
              </div>
            ))
          ) : (
            <div>URL: n/a</div>
          )}
        </div>
      </div>
      <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
        <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>Public/Published Preview</div>
        <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
          <div>Mode: public_published</div>
          <div>URL: {readModel.preview.liveUrl ?? 'n/a'}</div>
        </div>
      </div>
      {previewModeGuardrailWarning ? (
        <div
          style={{
            marginTop: 8,
            border: '1px solid #fcd34d',
            background: '#fffbeb',
            color: '#92400e',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
          }}
        >
          <strong style={{ color: '#78350f' }}>Preview Mode Warning:</strong> {previewModeGuardrailWarning.message}
        </div>
      ) : null}
      {readModel.pipeline.sourceMode === 'raw_html_fallback' ? (
        <div
          style={{
            marginTop: 8,
            border: '1px solid #fcd34d',
            background: '#fffbeb',
            color: '#92400e',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
          }}
        >
          This preview is based on raw imported HTML. Layout and structure improvements are pending.
        </div>
      ) : null}
      {readModel.preview.previewRuntimeSummary ? (
        <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
          Runtime truth: contract={readModel.preview.previewRuntimeSummary.rendererContractAvailable ? 'yes' : 'no'} · final-site=
          {readModel.preview.previewRuntimeSummary.finalSiteModelAvailable ? 'yes' : 'no'} · fallback=
          {readModel.preview.previewRuntimeSummary.renderedWithFallback ? 'yes' : 'no'} · matchedPage=
          {readModel.preview.previewRuntimeSummary.matchedPageId ?? 'none'} · contentResolution=
          {readModel.preview.previewRuntimeSummary.contentResolutionApplied ? 'yes' : 'no'} · resolved=
          {readModel.preview.previewRuntimeSummary.resolvedContentCount} · unresolved=
          {readModel.preview.previewRuntimeSummary.unresolvedContentCount} · degraded=
          {readModel.preview.previewRuntimeSummary.contentResolutionDegraded ? 'yes' : 'no'} · semanticSections=
          {readModel.preview.previewRuntimeSummary.semanticSectionCount ?? 0} · semanticImages=
          {readModel.preview.previewRuntimeSummary.semanticImageCount ?? 0} · semanticCtas=
          {readModel.preview.previewRuntimeSummary.semanticCtaCount ?? 0}
        </p>
      ) : null}
      <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
        <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>Latest Raw Preview Validation</div>
        {latestRawPreviewValidationEvidence ? (
          <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
            <div>capturedAt: {formatTimestamp(latestRawPreviewValidationEvidence.capturedAt)}</div>
            <div>siteVersionId: {latestRawPreviewValidationEvidence.siteVersionId ?? 'n/a'}</div>
            <div>artifactId: {latestRawPreviewValidationEvidence.artifactId ?? 'n/a'}</div>
            <div>validationStatus: {latestRawPreviewValidationEvidence.validationStatus ?? 'n/a'}</div>
            <div>routePath: {latestRawPreviewValidationEvidence.routePath ?? 'n/a'}</div>
            <div>selectedRawFilePath: {latestRawPreviewValidationEvidence.selectedRawFilePath ?? 'n/a'}</div>
            <div>rewrittenLinksCount: {latestRawPreviewValidationEvidence.rewrittenLinksCount ?? 'n/a'}</div>
            <div>responseStatus: {latestRawPreviewValidationEvidence.responseStatus ?? 'n/a'}</div>
            <div>responseBytes: {latestRawPreviewValidationEvidence.responseBytes ?? 'n/a'}</div>
            <div>htmlBytesAfterRewrite: {latestRawPreviewValidationEvidence.htmlBytesAfterRewrite ?? 'n/a'}</div>
            {(latestRawPreviewValidationEvidence.warnings?.length ?? 0) > 0 ? (
              <div>warning diagnostics: {latestRawPreviewValidationEvidence.warnings?.slice(0, 3).join(' · ')}</div>
            ) : null}
            {(latestRawPreviewValidationEvidence.blockers?.length ?? 0) > 0 ? (
              <div>blocker diagnostics: {latestRawPreviewValidationEvidence.blockers?.slice(0, 3).join(' · ')}</div>
            ) : null}
            {(latestRawPreviewValidationEvidence.routeEvidence?.length ?? 0) > 0 ? (
              <div style={{ marginTop: 6, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: '#475569' }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>route</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>status</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>raw file</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>rewritten links</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestRawPreviewValidationEvidence.routeEvidence?.map((route) => (
                      <tr key={`${route.routePath}:${route.selectedRawFilePath}:raw-validation`}>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>{route.routePath ?? 'n/a'}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>{route.validationStatus ?? 'n/a'}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>{route.selectedRawFilePath ?? 'n/a'}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{route.rewrittenLinksCount ?? 'n/a'}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{route.responseBytes ?? route.htmlBytesAfterRewrite ?? 'n/a'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div>evidence source: {latestRawPreviewValidationEvidence.evidenceSource}</div>
          </div>
        ) : (
          <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>No raw preview validation evidence captured.</div>
        )}
      </div>
      {rawPreviewDiagnostics ? (
        <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
          <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>Raw Preview Asset Fidelity</div>
          <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
            <div>evidence source: {rawPreviewDiagnostics.evidenceSource}</div>
            <div>routePath: {rawPreviewDiagnostics.selectedRoutePath ?? 'n/a'}</div>
            <div>rawFilePath: {rawPreviewDiagnostics.selectedRawFilePath ?? 'n/a'}</div>
            <div>htmlByteLengthBeforeRewrite: {rawPreviewDiagnostics.htmlByteLengthBeforeRewrite ?? 'n/a'}</div>
            <div>htmlByteLengthAfterRewrite: {rawPreviewDiagnostics.htmlByteLengthAfterRewrite ?? 'n/a'}</div>
            <div>rewrittenLinkCount: {rawPreviewDiagnostics.rewrittenLinkCount ?? 'n/a'}</div>
            <div>assetRefsInspected: {rawPreviewAssetsInspected}</div>
            <div>assetRefsRewritten: {rawPreviewAssetsRewritten}</div>
            <div>assetRefsMissing: {rawPreviewAssetsMissing}</div>
            <div>externalAssetRefsPreserved: {rawPreviewExternalPreserved}</div>
            <div>disabledScripts: {readModel.preview.previewRuntimeSummary?.rawTemplatePreviewEvidence?.disabledScriptCount ?? 0}</div>
            {rawPreviewDuplicateGuardEvidence ? (
              <div>
                duplicateRootGuard: detected={rawPreviewDuplicateGuardEvidence.duplicateRootBlockDetected ? 'yes' : 'no'} · removed={rawPreviewDuplicateGuardEvidence.duplicateRootBlockRemovedCount} · listing={rawPreviewDuplicateGuardEvidence.listingContainerDetected ? 'yes' : 'no'}
                {rawPreviewDuplicateGuardEvidence.guardReason.length > 0 ? ` · ${rawPreviewDuplicateGuardEvidence.guardReason.join(' · ')}` : ''}
              </div>
            ) : null}
            {rawPreviewEmbedEvidence ? (
              <div>
                mapEmbed: detected={rawPreviewEmbedEvidence.mapEmbedDetected ? 'yes' : 'no'} · preserved={rawPreviewEmbedEvidence.mapEmbedPreserved ? 'yes' : 'no'}
                {rawPreviewEmbedEvidence.externalMapProviders.length > 0 ? ` · providers=${rawPreviewEmbedEvidence.externalMapProviders.join(' · ')}` : ''}
                {rawPreviewEmbedEvidence.blockedMapRefs.length > 0 ? ` · blockedRefs=${rawPreviewEmbedEvidence.blockedMapRefs.length}` : ''}
              </div>
            ) : null}
            {rawPreviewScriptPolicyEvidence ? (
              <>
                <div>
                  scripts: found={rawPreviewScriptPolicyEvidence.totalScriptsFound} · preserved={rawPreviewScriptPolicyEvidence.scriptsPreserved} · blocked={rawPreviewScriptPolicyEvidence.scriptsBlocked}
                </div>
                <div>
                  script loading: local rewritten={rawPreviewScriptPolicyEvidence.scriptsRewrittenToControlledPreviewAssetUrls} · external preserved={rawPreviewScriptPolicyEvidence.scriptsExternalPreserved}
                </div>
                <div>
                  script candidates: gallery={rawPreviewScriptPolicyEvidence.galleryCandidateScriptsDetected ? 'yes' : 'no'} · map={rawPreviewScriptPolicyEvidence.mapCandidateScriptsDetected ? 'yes' : 'no'} · form={rawPreviewScriptPolicyEvidence.formCandidateScriptsDetected ? 'yes' : 'no'} · lazyload={rawPreviewScriptPolicyEvidence.lazyloadCandidateScriptsDetected ? 'yes' : 'no'}
                </div>
              </>
            ) : null}
            {(rawPreviewScriptPolicyEvidence?.scriptsBlocked ?? 0) > 0 ? (
              <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', borderRadius: 6, padding: '6px 8px' }}>
                Warning: raw preview blocked {rawPreviewScriptPolicyEvidence?.scriptsBlocked ?? 0} script(s); original-site interactivity may be reduced.
              </div>
            ) : null}
            <div>detectedFontFamilies: Dongle={rawPreviewDiagnostics.fontFamilyDongleDetected === null ? 'n/a' : rawPreviewDiagnostics.fontFamilyDongleDetected ? 'yes' : 'no'}</div>
            {rawPreviewAssetGraphEvidence ? (
              <div style={{ marginTop: 4 }}>
                <div>graphRoutePath: {rawPreviewAssetGraphEvidence.routePath}</div>
                <div>graphRawFilePath: {rawPreviewAssetGraphEvidence.rawFilePath}</div>
                <div>
                  stylesheets: found={rawPreviewAssetGraphEvidence.stylesheetRefsFound.length} · rewritten={rawPreviewAssetGraphEvidence.stylesheetRefsRewritten.length} · missing={rawPreviewAssetGraphEvidence.stylesheetRefsMissing.length}
                </div>
                <div>CSS cascade changed: {rawPreviewAssetGraphEvidence.cssOrderChanged ? 'yes' : 'no'}</div>
                <div>inline style blocks: {rawPreviewAssetGraphEvidence.inlineStyleBlockCount}</div>
                <div>
                  stylesheet refs: found={rawPreviewAssetGraphEvidence.stylesheetRefsFoundCount} · rewritten={rawPreviewAssetGraphEvidence.stylesheetRefsRewrittenCount} · external={rawPreviewAssetGraphEvidence.stylesheetRefsPreservedExternalCount} · missing={rawPreviewAssetGraphEvidence.stylesheetRefsMissingCount}
                </div>
                <div>media stylesheets: {rawPreviewAssetGraphEvidence.mediaStylesheetCount} · preload styles: {rawPreviewAssetGraphEvidence.preloadStyleCount}</div>
                <div>
                  images: found={rawPreviewAssetGraphEvidence.imageRefsFound.length} · rewritten={rawPreviewAssetGraphEvidence.imageRefsRewritten.length} · missing={rawPreviewAssetGraphEvidence.imageRefsMissing.length}
                </div>
                <div>
                  fonts: found={rawPreviewAssetGraphEvidence.fontRefsFound.length} · rewritten={rawPreviewAssetGraphEvidence.fontRefsRewritten.length} · missing={rawPreviewAssetGraphEvidence.fontRefsMissing.length}
                </div>
                <div>
                  dongleEvidence: {rawPreviewAssetGraphEvidence.dongleEvidence.detected ? 'detected' : 'not detected'}
                  {rawPreviewAssetGraphEvidence.dongleEvidence.source ? ` · ${rawPreviewAssetGraphEvidence.dongleEvidence.source}` : ''}
                  {rawPreviewAssetGraphEvidence.dongleEvidence.ref ? ` · ${rawPreviewAssetGraphEvidence.dongleEvidence.ref}` : ''}
                </div>
                {rawPreviewAssetGraphEvidence.primaryCssCandidates.length > 0 ? (
                  <div>primaryCssCandidates: {rawPreviewAssetGraphEvidence.primaryCssCandidates.join(' · ')}</div>
                ) : null}
                {primaryCssOrderPreview.length > 0 ? (
                  <div>primary CSS order preview: {primaryCssOrderPreview.join(' · ')}</div>
                ) : null}
                {topMissingStylesheetRefs.length > 0 ? (
                  <div>top missing stylesheet refs: {topMissingStylesheetRefs.join(' · ')}</div>
                ) : null}
                {rawPreviewAssetGraphEvidence.topMissingImageRefs.length > 0 ? (
                  <div>topMissingImageRefs: {rawPreviewAssetGraphEvidence.topMissingImageRefs.join(' · ')}</div>
                ) : null}
              </div>
            ) : null}
            {rawPreviewMissingRefs.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>top missing asset refs</div>
                <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {rawPreviewMissingRefs.map((ref, index) => (
                    <li key={`${ref.originalReference}:${ref.routePath}:${index}`}>
                      {ref.originalReference} · {ref.reason} · {ref.assetKind} · {ref.routePath} · {ref.rawFilePath}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence ? (
              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}>Asset rewrite evidence</summary>
                <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                  <div>assetReferencesInspected: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.assetReferencesInspected ?? 0}</div>
                  <div>assetReferencesRewritten: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.assetReferencesRewritten ?? 0}</div>
                  <div>assetReferencesMissing: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.assetReferencesMissing ?? 0}</div>
                  <div>assetReferencesExternalPreserved: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.assetReferencesExternalPreserved ?? 0}</div>
                  <div>stylesheetsInspected: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.stylesheetsInspected}</div>
                  <div>cssUrlReferencesFound: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.cssUrlReferencesFound}</div>
                  <div>cssUrlReferencesRewritten: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.cssUrlReferencesRewritten}</div>
                  <div>cssUrlReferencesExternalPreserved: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.cssUrlReferencesExternalPreserved}</div>
                  <div>cssUrlReferencesMissing: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.cssUrlReferencesMissing}</div>
                  <div>imageReferencesFound: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.imageReferencesFound}</div>
                  <div>imageReferencesRewritten: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.imageReferencesRewritten}</div>
                  <div>imageReferencesMissing: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.imageReferencesMissing}</div>
                  <div>fontStylesheetsFound: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.fontStylesheetsFound}</div>
                  <div>fontStylesheetsPreserved: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.fontStylesheetsPreserved}</div>
                  <div>fontFilesFound: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.fontFilesFound}</div>
                  <div>fontFilesRewritten: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.fontFilesRewritten}</div>
                  {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.rootHeadingDongleEvidence.length > 0 ? (
                    <div>rootHeadingDongleEvidence: {rawPreviewDiagnostics.rawPreviewAssetRewriteEvidence.rootHeadingDongleEvidence.join(' · ')}</div>
                  ) : null}
                </div>
              </details>
            ) : null}
            {rawPreviewScriptPolicyEvidence ? (
              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}>Script policy evidence</summary>
                <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                  <div>totalScriptsFound: {rawPreviewScriptPolicyEvidence.totalScriptsFound}</div>
                  <div>scriptsPreserved: {rawPreviewScriptPolicyEvidence.scriptsPreserved}</div>
                  <div>scriptsBlocked: {rawPreviewScriptPolicyEvidence.scriptsBlocked}</div>
                  <div>scriptsRewrittenToControlledPreviewAssetUrls: {rawPreviewScriptPolicyEvidence.scriptsRewrittenToControlledPreviewAssetUrls}</div>
                  <div>scriptsExternalPreserved: {rawPreviewScriptPolicyEvidence.scriptsExternalPreserved}</div>
                  {rawPreviewBlockedScriptReasons.length > 0 ? (
                    <div>blocked script reasons: {rawPreviewBlockedScriptReasons.map(([reason, count]) => `${reason}=${count}`).join(' · ')}</div>
                  ) : null}
                  {rawPreviewScriptPolicyEvidence.topBlockedRefs.length > 0 ? (
                    <div>top blocked script refs: {rawPreviewScriptPolicyEvidence.topBlockedRefs.join(' · ')}</div>
                  ) : null}
                </div>
              </details>
            ) : null}
            {rawPreviewDiagnostics.links.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {rawPreviewDiagnostics.links.map((link) => (
                  <a key={`${link.label}:${link.routePath}`} href={link.href} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div style={{ margin: '8px 0 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
        <div style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 700 }}>Family Render</div>
        <div style={{ marginTop: 6, display: 'grid', gap: 4, color: '#334155', fontSize: 12 }}>
          <div>Family Render: {readModel.preview.familyRenderUsed ? 'Yes' : 'No'}</div>
          <div>Family Mode: {familyRenderModeLabel}</div>
          <div>Family ID: {readModel.preview.familyRenderFamilyId ?? '—'}</div>
          <div>Fallback to Page: {readModel.preview.familyRenderFallbackToPage ? 'Yes' : 'No'}</div>
          <div>Family Diagnostics: {readModel.preview.familyRenderDiagnosticsCount}</div>
          {familyRenderDiagnostics.length > 0 ? <div>Diagnostic codes: {familyRenderDiagnostics.join(' · ')}</div> : null}
        </div>
      </div>
      {contentRecoveryModeActive ? (
        <div style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>Reason:</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {contentRecoveryReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {readModel.preview.selectedVariantLabel ? (
        <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
          Active variant: <strong>{readModel.preview.selectedVariantLabel}</strong>
        </p>
      ) : null}
      {readModel.preview.previewUrl ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={readModel.preview.previewUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
              {primaryPreviewLabel}
            </a>
            {showExperimentalTransformedPreview && readModel.preview.transformedPreviewUrl ? (
              <a href={readModel.preview.transformedPreviewUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                Open GNR8 Transformed Preview (experimental)
              </a>
            ) : null}
            {readModel.preview.debugPreviewUrl ? (
              <a href={readModel.preview.debugPreviewUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                Open Debug Preview
              </a>
            ) : null}
            {readModel.preview.liveUrl ? (
              <a href={readModel.preview.liveUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
                Open Public/Published Preview
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
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            {readModel.preview.readiness === 'debug_only_artifact_available'
              ? 'Transformed preview is not ready yet. Use debug preview for structural/operator inspection.'
              : readModel.preview.readiness === 'import_captured_not_transformed'
                ? 'Import was captured, but transformed preview output is not available yet.'
                : 'No preview artifact is available for this site yet.'}
          </p>
          {readModel.preview.debugPreviewUrl ? (
            <a href={readModel.preview.debugPreviewUrl} target='_blank' rel='noreferrer' style={quickActionStyle()}>
              Open Debug Preview
            </a>
          ) : null}
          {readModel.preview.diagnostics.length > 0 ? (
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: 12 }}>
              Diagnostics: {readModel.preview.diagnostics.join(' · ')}
            </p>
          ) : null}
          {readModel.preview.previewRuntimeSummary?.previewDiagnostics?.length ? (
            <p style={{ margin: 0, color: '#334155', fontSize: 12 }}>
              Runtime diagnostics: {readModel.preview.previewRuntimeSummary.previewDiagnostics.join(' · ')}
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}

function renderSettingsContent(input: {
  readModel: Awaited<ReturnType<typeof getSiteWorkspaceReadModelForPage>>
  canDeleteSite: boolean
  canPublish: boolean
  clientId: string
  siteId: string
  agencyId: string
  adminView: boolean
}): ReactNode {
  const readModel = input.readModel
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
      <SiteDomainSettingsPanel
        agencyId={input.agencyId}
        clientId={input.clientId}
        siteId={input.siteId}
        siteVersionId={readModel.pipeline.latestRuntimeSiteVersionId}
        initialDomain={readModel.settings.domain}
        initialDomainBinding={readModel.settings.domainBinding}
        canPublish={input.canPublish}
      />
      <SiteDeletePanel
        clientId={input.clientId}
        siteId={input.siteId}
        agencyId={input.agencyId}
        adminView={input.adminView}
        siteName={readModel.settings.name || readModel.site.label || input.siteId}
        canDeleteSite={input.canDeleteSite}
      />
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
  const canDeleteSite = canPerformAction(currentUserAgency.role, 'delete_site')

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
        {props.activeTab === 'content' ? (
          <ContentBindingsPanel agencyId={currentUserAgency.agency_id} clientId={clientId} siteId={siteId} />
        ) : null}

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
        {props.activeTab === 'settings'
          ? renderSettingsContent({
              readModel,
              canDeleteSite,
              canPublish,
              clientId,
              siteId,
              agencyId: currentUserAgency.agency_id,
              adminView,
            })
          : null}
      </div>
    </SiteContextLayout>
  )
}
