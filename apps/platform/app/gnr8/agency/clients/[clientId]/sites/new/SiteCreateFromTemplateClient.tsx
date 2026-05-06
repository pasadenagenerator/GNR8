'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { resolveSiteCreateUiView } from '@/app/gnr8/_components/client-dashboard/site-create-contract'
import { pollTemplateSiteStatus } from '@/app/gnr8/_components/client-dashboard/template-site-status-polling'
import type { TemplateListApiCard } from '@/app/gnr8/_components/client-dashboard/template-library-contract'
import {
  parseCreateSiteFromTemplatePayload,
  type CreateSiteFromTemplateResult,
  type TemplateSiteBootstrapStatusResult,
} from '@/gnr8/site/site-create-contract'
import { agencyClientDashboardHref } from '@/gnr8/site/site-importer-routing'

type TemplateListResponse = {
  ok: boolean
  error?: string
  templates?: TemplateListApiCard[]
}

type CreateSiteResponse = CreateSiteFromTemplateResult

type Props = {
  clientId: string
  clientName: string
  agencyId: string
  adminView?: boolean
}

function normalizeTemplateTypeLabel(templateType: 'single_page' | 'multi_page' | 'unknown'): string {
  if (templateType === 'single_page') return 'Single Page'
  if (templateType === 'multi_page') return 'Multi Page'
  return 'Unknown'
}

function normalizeTemplateStatusLabel(status: 'uploaded' | 'processing' | 'ready' | 'failed'): string {
  if (status === 'uploaded') return 'Uploaded'
  if (status === 'processing') return 'Processing'
  if (status === 'ready') return 'Ready'
  return 'Failed'
}

function normalizeHealthLabel(health: 'clean' | 'degraded' | 'failed'): string {
  if (health === 'clean') return 'Clean'
  if (health === 'degraded') return 'Degraded'
  return 'Failed'
}

export default function SiteCreateFromTemplateClient(props: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateListApiCard[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [isPending, startTransition] = useTransition()
  const [businessName, setBusinessName] = useState('')
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'bootstrap_running' | 'preview_ready' | 'failed'>('idle')
  const [lastResult, setLastResult] = useState<CreateSiteFromTemplateResult | null>(null)
  const [statusResult, setStatusResult] = useState<TemplateSiteBootstrapStatusResult | null>(null)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const dashboardHref = useMemo(
    () =>
      agencyClientDashboardHref({
        clientId: props.clientId,
        agencyId: props.agencyId,
        adminView: props.adminView,
      }),
    [props.adminView, props.agencyId, props.clientId],
  )

  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      setIsLoadingTemplates(true)
      setError(null)
      try {
        const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates`, { method: 'GET' })
        const payload = (await response.json().catch(() => null)) as TemplateListResponse | null
        if (!payload || payload.ok !== true || !Array.isArray(payload.templates)) {
          if (!cancelled) {
            setError(payload?.error ?? `Template list failed (HTTP ${response.status})`)
            setTemplates([])
          }
          return
        }
        if (!cancelled) {
          setTemplates(payload.templates)
          if (payload.templates.length > 0) {
            const firstReady = payload.templates.find((template) => template.status === 'ready')
            setSelectedTemplateId(firstReady?.id ?? '')
          }
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load templates.')
          setTemplates([])
        }
      } finally {
        if (!cancelled) setIsLoadingTemplates(false)
      }
    }

    void loadTemplates()
    return () => {
      cancelled = true
    }
  }, [props.clientId])

  const uiView = resolveSiteCreateUiView({
    isLoadingTemplates,
    error,
    templatesCount: templates.length,
  })

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const parsed = parseCreateSiteFromTemplatePayload({
      templateId: selectedTemplateId,
      name,
      domain,
      businessName,
      primaryCtaLabel,
      contactEmail,
      contactPhone,
    })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    try {
      setCreateStatus('creating')
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.value),
      })
      const payload = (await response.json().catch(() => null)) as CreateSiteResponse | null
      if (!payload) {
        setCreateStatus('failed')
        setError(`Create failed (HTTP ${response.status})`)
        return
      }

      setLastResult(payload)

      if (!payload.ok || !response.ok || !payload.nextUrl || !payload.siteId) {
        setCreateStatus('failed')
        setError(payload.diagnostics?.[0] ?? payload.reasonCode ?? `Create failed (HTTP ${response.status})`)
        return
      }

      setNextUrl(payload.nextUrl)
      setCreateStatus(payload.status === 'preview_ready' ? 'preview_ready' : 'bootstrap_running')
      setIsPolling(true)
      void pollTemplateSiteStatus({
        endpoint: `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(payload.siteId)}/bootstrap-status`,
        intervalMs: 1500,
        timeoutMs: 60_000,
        onPollStarted: () => {
          setLastResult((prev) =>
            prev
              ? {
                  ...prev,
                  diagnostics: [...new Set([...(prev.diagnostics ?? []), 'TEMPLATE_SITE_STATUS_POLL_STARTED'])],
                }
              : prev,
          )
        },
        onPollCompleted: (result) => {
          setStatusResult(result)
          setCreateStatus(result.status)
          setLastResult((prev) =>
            prev
              ? {
                  ...prev,
                  diagnostics: [...new Set([...(prev.diagnostics ?? []), ...result.diagnostics, 'TEMPLATE_SITE_STATUS_POLL_COMPLETED'])],
                  reasonCode: result.reasonCode ?? prev.reasonCode,
                }
              : prev,
          )
        },
        onPollTimeout: () => {
          setCreateStatus('failed')
          setLastResult((prev) =>
            prev
              ? {
                  ...prev,
                  diagnostics: [...new Set([...(prev.diagnostics ?? []), 'TEMPLATE_SITE_STATUS_POLL_TIMEOUT'])],
                  reasonCode: prev.reasonCode ?? 'TEMPLATE_SITE_STATUS_POLL_TIMEOUT',
                }
              : prev,
          )
          setError('Bootstrap status polling timed out. You can open Site Workspace and continue from there.')
          setIsPolling(false)
        },
        onPollFailed: () => {
          setLastResult((prev) =>
            prev
              ? {
                  ...prev,
                  diagnostics: [...new Set([...(prev.diagnostics ?? []), 'TEMPLATE_SITE_STATUS_FAILED'])],
                }
              : prev,
          )
        },
      }).finally(() => {
        setIsPolling(false)
      })
    } catch (submitError) {
      setCreateStatus('failed')
      setError(submitError instanceof Error ? submitError.message : 'Create website failed.')
    }
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
      <header style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Add New Website</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Select one template, enter website + domain details, and create a scoped website for {props.clientName}.
        </p>
      </header>

      {uiView === 'loading_templates' ? (
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Loading templates...</p>
      ) : uiView === 'no_templates' ? (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: 10, padding: 14, background: '#f8fafc', display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>Upload a template before creating a website.</p>
          <Link
            href={dashboardHref}
            style={{
              width: 'fit-content',
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
            Back to Client Dashboard
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <section style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Template</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {templates.map((template) => {
                const isSelected = selectedTemplateId === template.id
                const isReady = template.status === 'ready'
                return (
                  <label
                    key={template.id}
                    style={{
                      border: isSelected ? '1px solid #0f172a' : '1px solid #dbe6f1',
                      background: isSelected ? '#f8fafc' : '#fff',
                      borderRadius: 10,
                      padding: 10,
                      display: 'grid',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <input
                        type='radio'
                        name='selectedTemplate'
                        value={template.id}
                        checked={isSelected}
                        onChange={() => setSelectedTemplateId(template.id)}
                        disabled={!isReady}
                        style={{ marginTop: 3 }}
                      />
                      <div style={{ display: 'grid', gap: 3 }}>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>{template.name}</strong>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          Type: {normalizeTemplateTypeLabel(template.templateType)} · Status: {normalizeTemplateStatusLabel(template.status)} · Health:{' '}
                          {normalizeHealthLabel(template.importHealth)}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Preview: {template.preview.available ? 'Available' : 'Unavailable'} ({template.preview.source})
                        </div>
                        {!isReady ? (
                          <div style={{ fontSize: 12, color: '#9a3412' }}>
                            This template is not ready yet and cannot be used for site creation.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
            {!selectedTemplateId ? (
              <p style={{ margin: 0, fontSize: 12, color: '#9a3412' }}>
                No template is ready yet. Wait for processing to finish before creating a website.
              </p>
            ) : null}
          </section>

          <section style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Website Details</h3>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Client</span>
              <input
                type='text'
                value={props.clientName}
                readOnly
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#64748b', background: '#f8fafc' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Website Name</span>
              <input
                type='text'
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder='My Website'
                required
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Domain / Subdomain</span>
              <input
                type='text'
                value={domain}
                onChange={(event) => setDomain(event.currentTarget.value)}
                placeholder='example.com'
                required
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>
          </section>

          <section style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Initial Metadata (Optional)</h3>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Business Name</span>
              <input
                type='text'
                value={businessName}
                onChange={(event) => setBusinessName(event.currentTarget.value)}
                placeholder='Acme Studio'
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Primary CTA Label</span>
              <input
                type='text'
                value={primaryCtaLabel}
                onChange={(event) => setPrimaryCtaLabel(event.currentTarget.value)}
                placeholder='Book a Call'
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Contact Email</span>
              <input
                type='email'
                value={contactEmail}
                onChange={(event) => setContactEmail(event.currentTarget.value)}
                placeholder='hello@example.com'
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#334155' }}>Contact Phone</span>
              <input
                type='text'
                value={contactPhone}
                onChange={(event) => setContactPhone(event.currentTarget.value)}
                placeholder='+1 555 123 4567'
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
              />
            </label>
          </section>

          {createStatus !== 'idle' ? (
            <div style={{ border: '1px solid #dbe6f1', background: '#f8fafc', color: '#0f172a', borderRadius: 8, padding: 10, fontSize: 13 }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Create Status</strong>
              <div>
                {createStatus === 'creating'
                  ? 'creating'
                  : createStatus === 'bootstrap_running'
                    ? 'bootstrap running'
                    : createStatus === 'preview_ready'
                      ? 'preview ready'
                      : 'failed'}
              </div>
              {statusResult?.previewUrl ? <div>Preview URL: {statusResult.previewUrl}</div> : null}
              {statusResult?.publishReady != null ? <div>Publish readiness: {statusResult.publishReady ? 'ready' : 'not ready'}</div> : null}
              {lastResult?.reasonCode ? <div>Reason: {lastResult.reasonCode}</div> : null}
              {lastResult?.diagnostics?.length ? <div>Diagnostics: {lastResult.diagnostics.join(' · ')}</div> : null}
            </div>
          ) : null}

          {error ? (
            <div
              role='alert'
              style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
            >
              {error}
              {createStatus === 'failed' ? (
                <button
                  type='button'
                  onClick={() => {
                    setError(null)
                    setCreateStatus('idle')
                    setStatusResult(null)
                    setNextUrl(null)
                  }}
                  style={{ marginLeft: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#7f1d1d' }}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type='submit'
              disabled={isPending || isPolling || uiView !== 'ready' || !selectedTemplateId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.8 : 1,
              }}
            >
              {isPending || createStatus === 'creating' ? 'Creating...' : 'Create Website'}
            </button>
            {createStatus === 'preview_ready' && nextUrl ? (
              <button
                type='button'
                onClick={() => {
                  startTransition(() => {
                    router.push(nextUrl)
                  })
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #0f172a',
                  background: '#fff',
                  color: '#0f172a',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Open Site Workspace
              </button>
            ) : null}

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
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  )
}
