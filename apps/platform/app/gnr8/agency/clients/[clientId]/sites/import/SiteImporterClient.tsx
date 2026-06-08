'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import {
  DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE,
  MULTI_PAGE_IMPORT_STATIC_SITE_GUARDRAIL,
  buildSiteImportRequestPayload,
  normalizeSiteImportMultiPageLimits,
  siteImportSuccessStatusText,
  type SiteImportMultiPageLimitState,
} from '@/gnr8/site/site-import-multipage-ui'
import { agencyClientDashboardHref } from '@/gnr8/site/site-importer-routing'

type Props = {
  clientId: string
  clientName: string
  agencyId: string
  adminView?: boolean
}

type ImportResponse =
  | {
      ok: true
      siteId: string
      siteVersionId: string
      redirectTo: string
      siteName?: string
      warning?: string | null
      multiPageDiscovery?: {
        enabled?: boolean
        rawArtifactAssembly?: {
          routeMap?: unknown[]
        } | null
      }
      pipeline?: {
        multiPageDiscovery?: {
          validation?: {
            status?: string | null
            warnings?: number | null
          } | null
        } | null
      }
    }
  | {
      ok: false
      error?: string
      reasonCode?: string
      intake?: {
        evidence?: {
          requestedUrl?: string
          finalUrl?: string | null
          httpStatus?: number | null
          contentType?: string | null
          htmlByteLength?: number
          assetCount?: number
        }
      }
    }

export default function SiteImporterClient(props: Props) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [multiPageImportEnabled, setMultiPageImportEnabled] = useState(false)
  const [multiPageLimits, setMultiPageLimits] = useState<SiteImportMultiPageLimitState>(DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE)
  const [error, setError] = useState<string | null>(null)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const dashboardHref = useMemo(
    () =>
      agencyClientDashboardHref({
        clientId: props.clientId,
        agencyId: props.agencyId,
        adminView: props.adminView,
      }),
    [props.adminView, props.agencyId, props.clientId],
  )

  const hostnamePlaceholder = useMemo(() => {
    try {
      const parsed = new URL(url.trim())
      return parsed.hostname || 'example.com'
    } catch {
      return 'example.com'
    }
  }, [url])

  const resolvedSiteNamePreview = useMemo(() => {
    const explicitName = siteName.trim()
    if (explicitName) return explicitName
    if (hostnamePlaceholder && hostnamePlaceholder !== 'example.com') return hostnamePlaceholder
    return 'Imported Site'
  }, [hostnamePlaceholder, siteName])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatusText(null)

    const normalizedUrl = url.trim()
    if (!normalizedUrl) {
      setError('Website URL is required.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(
        `/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/import`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            buildSiteImportRequestPayload({
              url: normalizedUrl,
              siteName,
              agencyId: props.agencyId,
              adminView: props.adminView ?? false,
              multiPageImportEnabled,
              multiPageLimits,
            }),
          ),
        },
      )
      const payload = (await response.json().catch(() => null)) as ImportResponse | null
      if (!payload) {
        setError(`Import failed (HTTP ${response.status})`)
        return
      }
      if (payload.ok !== true) {
        const evidence = payload.intake?.evidence
        const evidenceSummary = evidence
          ? ` requested=${evidence.requestedUrl ?? 'n/a'} final=${evidence.finalUrl ?? 'n/a'} status=${evidence.httpStatus ?? 'n/a'} contentType=${evidence.contentType ?? 'n/a'} htmlBytes=${evidence.htmlByteLength ?? 0} assets=${evidence.assetCount ?? 0}`
          : ''
        setError(`${payload.error ?? `Import failed (HTTP ${response.status})`}${payload.reasonCode ? ` [${payload.reasonCode}]` : ''}${evidenceSummary}`)
        return
      }
      if (!response.ok) {
        setError(`Import failed (HTTP ${response.status})`)
        return
      }

      setStatusText(
        siteImportSuccessStatusText({
          warning: payload.warning,
          multiPageValidationStatus: payload.pipeline?.multiPageDiscovery?.validation?.status,
          multiPageWarningCount: payload.pipeline?.multiPageDiscovery?.validation?.warnings,
        }),
      )
      startTransition(() => {
        router.push(payload.redirectTo)
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Import failed due to an unexpected error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateMultiPageLimit(key: keyof SiteImportMultiPageLimitState, value: string) {
    setMultiPageLimits((current) =>
      normalizeSiteImportMultiPageLimits({
        ...current,
        [key]: Number(value),
      }),
    )
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
      <header style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Import site for {props.clientName}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Paste a public website URL to import it directly into this client workspace.
        </p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>Website URL</span>
          <input
            type='url'
            required
            value={url}
            placeholder='https://example.com'
            onChange={(event) => setUrl(event.currentTarget.value)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 14,
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>Site name (optional)</span>
          <input
            type='text'
            value={siteName}
            placeholder={hostnamePlaceholder}
            onChange={(event) => setSiteName(event.currentTarget.value)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 14,
            }}
          />
        </label>

        <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
          Imported site name: <strong>{resolvedSiteNamePreview}</strong>
        </p>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'grid', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
            <input
              type='checkbox'
              checked={multiPageImportEnabled}
              onChange={(event) => setMultiPageImportEnabled(event.currentTarget.checked)}
            />
            Enable multi-page import
          </label>
          <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>{MULTI_PAGE_IMPORT_STATIC_SITE_GUARDRAIL}</p>
          {multiPageImportEnabled ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
              {[
                { key: 'maxRoutes' as const, label: 'Max routes', min: 1 },
                { key: 'maxDepth' as const, label: 'Max depth', min: 1 },
                { key: 'maxLinksPerPage' as const, label: 'Max links per page', min: 1 },
                { key: 'maxAcquiredPages' as const, label: 'Max acquired pages', min: 1 },
                { key: 'maxBytesPerPage' as const, label: 'Max bytes per page', min: 1024 },
                { key: 'requestTimeoutMs' as const, label: 'Request timeout (ms)', min: 250 },
              ].map((field) => (
                <label key={field.key} style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, color: '#334155' }}>{field.label}</span>
                  <input
                    type='number'
                    min={field.min}
                    value={multiPageLimits[field.key]}
                    onChange={(event) => updateMultiPageLimit(field.key, event.currentTarget.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 13,
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div
            role='alert'
            style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {error}
          </div>
        ) : null}

        {statusText ? (
          <div
            role='status'
            style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#14532d', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {statusText}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='submit'
            disabled={isSubmitting || isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#fff',
              cursor: isSubmitting || isPending ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              opacity: isSubmitting || isPending ? 0.8 : 1,
            }}
          >
            {isSubmitting || isPending ? 'Importing...' : 'Import Website'}
          </button>
          <Link
            href={dashboardHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Back to Client
          </Link>
        </div>
      </form>
    </section>
  )
}
