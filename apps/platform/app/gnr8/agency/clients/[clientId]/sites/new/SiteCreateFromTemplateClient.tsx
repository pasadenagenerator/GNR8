'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { resolveSiteCreateUiView } from '@/app/gnr8/_components/client-dashboard/site-create-contract'
import type { TemplateListApiCard } from '@/app/gnr8/_components/client-dashboard/template-library-contract'
import { parseCreateSiteFromTemplatePayload } from '@/gnr8/site/site-create-contract'
import { agencyClientDashboardHref } from '@/gnr8/site/site-importer-routing'

type TemplateListResponse = {
  ok: boolean
  error?: string
  templates?: TemplateListApiCard[]
}

type CreateSiteResponse =
  | {
      ok: true
      redirectTo: string
      site: {
        siteId: string
      }
    }
  | {
      ok: false
      error?: string
    }

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
    })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.value),
      })
      const payload = (await response.json().catch(() => null)) as CreateSiteResponse | null
      if (!payload || payload.ok !== true || !response.ok || !payload.redirectTo) {
        setError(payload && payload.ok === false ? payload.error ?? `Create failed (HTTP ${response.status})` : `Create failed (HTTP ${response.status})`)
        return
      }
      startTransition(() => {
        router.push(payload.redirectTo)
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Create website failed.')
    }
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
      <header style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Add New Website</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Select one template, enter website name and domain, and create a scoped website for {props.clientName}.
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
              <span style={{ fontSize: 12, color: '#334155' }}>Domain</span>
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

          {error ? (
            <div
              role='alert'
              style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type='submit'
              disabled={isPending || uiView !== 'ready' || !selectedTemplateId}
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
              {isPending ? 'Creating...' : 'Create Website'}
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
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  )
}
