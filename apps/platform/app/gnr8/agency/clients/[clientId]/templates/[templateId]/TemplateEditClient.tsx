'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import {
  formatTagsForInput,
  isRetryableTemplateFailure,
  parseTagsInputForForm,
  parseTemplateDetailPayload,
  resolveTemplateDetailUiState,
  templateFailureReasonMessage,
} from '@/app/gnr8/_components/client-dashboard/template-detail-contract'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function statusLabel(status: string): string {
  if (status === 'ready') return 'Ready'
  if (status === 'processing') return 'Processing'
  if (status === 'uploaded') return 'Uploaded'
  return 'Failed'
}

function healthLabel(health: string): string {
  if (health === 'clean') return 'Clean'
  if (health === 'degraded') return 'Degraded'
  return 'Failed'
}

function templateTypeLabel(templateType: 'single_page' | 'multi_page' | 'unknown'): string {
  if (templateType === 'single_page') return 'Single Page'
  if (templateType === 'multi_page') return 'Multi Page'
  return 'Unknown'
}

function sourceTypeLabel(sourceType: 'zip_html'): string {
  if (sourceType === 'zip_html') return 'ZIP HTML'
  return sourceType
}

export default function TemplateEditClient(props: {
  clientId: string
  templateId: string
  backHref: string
}) {
  const router = useRouter()

  const [httpStatus, setHttpStatus] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [template, setTemplate] = useState<ReturnType<typeof parseTemplateDetailPayload>>(null)

  const [nameInput, setNameInput] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)

  async function loadTemplate() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates/${encodeURIComponent(props.templateId)}`, {
        method: 'GET',
      })
      setHttpStatus(response.status)

      const payload = (await response.json().catch(() => null)) as unknown
      const parsed = parseTemplateDetailPayload(payload)
      if (!parsed) {
        const fallbackError =
          payload && typeof payload === 'object' && !Array.isArray(payload)
            ? normalizeText((payload as { error?: unknown }).error) || `Template detail failed (HTTP ${response.status}).`
            : `Template detail failed (HTTP ${response.status}).`

        setTemplate(null)
        setError(fallbackError)
        return
      }

      setTemplate(parsed)
      setNameInput(parsed.name)
      setTagsInput(formatTagsForInput(parsed.tags))
      setError(null)
    } catch (fetchError) {
      setTemplate(null)
      setHttpStatus(null)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load template.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplate()
  }, [props.clientId, props.templateId])

  const uiState = resolveTemplateDetailUiState({
    isLoading,
    httpStatus,
    hasTemplate: Boolean(template),
    error,
  })

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveSuccessMessage(null)
    setSaveErrorMessage(null)
    setDeleteErrorMessage(null)

    const name = normalizeText(nameInput)
    if (!name) {
      setSaveErrorMessage('Template name is required.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates/${encodeURIComponent(props.templateId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name,
          tags: parseTagsInputForForm(tagsInput),
        }),
      })

      const payload = (await response.json().catch(() => null)) as unknown
      const parsed = parseTemplateDetailPayload(payload)
      if (!parsed) {
        const message =
          payload && typeof payload === 'object' && !Array.isArray(payload)
            ? normalizeText((payload as { error?: unknown }).error) || `Template update failed (HTTP ${response.status}).`
            : `Template update failed (HTTP ${response.status}).`
        setSaveErrorMessage(message)
        return
      }

      setTemplate(parsed)
      setNameInput(parsed.name)
      setTagsInput(formatTagsForInput(parsed.tags))
      setSaveSuccessMessage('Template changes saved.')
    } catch (saveError) {
      setSaveErrorMessage(saveError instanceof Error ? saveError.message : 'Template update failed.')
    } finally {
      setIsSaving(false)
    }
  }

  async function onDeleteConfirmed() {
    setDeleteErrorMessage(null)
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates/${encodeURIComponent(props.templateId)}`, {
        method: 'DELETE',
      })

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!payload || payload.ok !== true) {
        setDeleteErrorMessage(payload?.error ?? `Template delete failed (HTTP ${response.status}).`)
        return
      }

      router.push(props.backHref)
      router.refresh()
    } catch (deleteError) {
      setDeleteErrorMessage(deleteError instanceof Error ? deleteError.message : 'Template delete failed.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function onRetryProcessing() {
    setRetryMessage(null)
    setIsRetrying(true)
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates/${encodeURIComponent(props.templateId)}`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!payload || payload.ok !== true) {
        setRetryMessage(payload?.error ?? `Retry failed (HTTP ${response.status}).`)
        return
      }
      setRetryMessage('Retry queued. Processing will resume shortly.')
      await loadTemplate()
    } catch (error) {
      setRetryMessage(error instanceof Error ? error.message : 'Retry failed.')
    } finally {
      setIsRetrying(false)
    }
  }

  const createdAtLabel = useMemo(() => {
    if (!template?.createdAt) return 'Unavailable'
    const parsed = new Date(template.createdAt)
    if (Number.isNaN(parsed.getTime())) return template.createdAt
    return parsed.toLocaleString()
  }, [template?.createdAt])

  if (uiState === 'loading') {
    return <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>Loading template...</p>
  }

  if (uiState === 'unauthorized') {
    return (
      <section style={{ border: '1px solid #fecaca', background: '#fff5f5', borderRadius: 12, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#7f1d1d' }}>You are not authorized to access this template.</p>
      </section>
    )
  }

  if (uiState === 'not_found') {
    return (
      <section style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 12, padding: 14, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>Template not found in this client scope.</p>
        <Link href={props.backHref} style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          Back to client dashboard
        </Link>
      </section>
    )
  }

  if (!template || uiState === 'error') {
    return (
      <section style={{ border: '1px solid #fecaca', background: '#fff5f5', borderRadius: 12, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#7f1d1d' }}>{error ?? 'Failed to load template details.'}</p>
      </section>
    )
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 14 }}>
      <header style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Edit Template</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Update template metadata and remove template records safely.
        </p>
        {template.status === 'failed' ? (
          <p style={{ margin: 0, fontSize: 12, color: '#991b1b' }}>
            {templateFailureReasonMessage(template.reasonCode)} ({template.reasonCode ?? 'TEMPLATE_UNKNOWN_FAILURE'})
          </p>
        ) : null}
      </header>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <div
          style={{
            minHeight: 170,
            borderBottom: '1px solid #e2e8f0',
            background: template.preview.available ? '#f8fafc' : '#f1f5f9',
            display: 'grid',
            placeItems: 'center',
            padding: 10,
          }}
        >
          {template.preview.available && template.preview.imagePath ? (
            <img
              src={template.preview.imagePath}
              alt={`${template.name} preview`}
              style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6 }}
            />
          ) : (
            <span style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>No preview available</span>
          )}
        </div>

        <dl
          style={{
            margin: 0,
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Status</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{statusLabel(template.status)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Import Health</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{healthLabel(template.importHealth)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Source Type</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{sourceTypeLabel(template.sourceType)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Entry HTML</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.entryHtmlFileName ?? 'Unavailable'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Template Type</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{templateTypeLabel(template.templateType)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Created</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{createdAtLabel}</dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Source Filename</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.sourceFilename}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Raw Artifact</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.rawArtifactAvailable ? 'Available' : 'Missing'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>File Count</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.importManifestFileCount ?? 'Unknown'}</dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Semantic Import Summary</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.semanticImportSummary}</dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Content Slot Readiness Preview</dt>
            <dd style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{template.contentSlotReadinessPreview}</dd>
          </div>
        </dl>
      </div>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Import Manifest Summary</h3>
        <div style={{ fontSize: 12, color: '#334155' }}>Entry HTML Path: {template.importManifestSummary?.entryHtmlPath ?? 'Unavailable'}</div>
        <div style={{ fontSize: 12, color: '#334155' }}>Import Status: {template.importManifestSummary?.status ?? 'Unavailable'}</div>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Diagnostics Summary</h3>
        <div style={{ fontSize: 12, color: '#334155' }}>
          {template.diagnosticsSummary?.issues?.slice(0, 5).map((issue) => `${issue.severity}:${issue.code}`).join(' · ') || 'No diagnostics recorded.'}
        </div>
        <details style={{ fontSize: 12, color: '#334155' }}>
          <summary style={{ cursor: 'pointer' }}>View diagnostics</summary>
          <div style={{ marginTop: 6 }}>
            {template.diagnosticsSummary?.issues?.slice(0, 10).map((issue) => `${issue.severity}:${issue.code}:${issue.message}`).join(' · ') ||
              'No diagnostics recorded.'}
          </div>
        </details>
      </section>

      <form onSubmit={onSave} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Template Name</span>
          <input
            value={nameInput}
            onChange={(event) => setNameInput(event.currentTarget.value)}
            placeholder='Template name'
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 13,
              color: '#0f172a',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Tags</span>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.currentTarget.value)}
            placeholder='marketing, agency, landing-page'
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 13,
              color: '#0f172a',
            }}
          />
          <span style={{ fontSize: 11, color: '#64748b' }}>Comma-separated. Tags are normalized and deduplicated when saved.</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='submit'
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: isSaving ? 'wait' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type='button'
            onClick={() => setShowDeleteConfirm((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fff5f5',
              color: '#991b1b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete Template
          </button>
          <button
            type='button'
            disabled={isRetrying || template.status !== 'failed' || !template.rawArtifactAvailable || !isRetryableTemplateFailure(template.reasonCode)}
            onClick={onRetryProcessing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 700,
              cursor: isRetrying ? 'wait' : 'pointer',
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry Processing'}
          </button>
          <Link
            href={props.backHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Back
          </Link>
        </div>
        {retryMessage ? <div style={{ fontSize: 12, color: '#334155' }}>{retryMessage}</div> : null}
      </form>

      {saveSuccessMessage ? (
        <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 8, padding: 10, fontSize: 13 }}>
          {saveSuccessMessage}
        </div>
      ) : null}

      {saveErrorMessage ? (
        <div style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}>
          {saveErrorMessage}
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13 }}>Confirm delete for template &quot;{template.name}&quot;? This action cannot be undone.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type='button'
              onClick={onDeleteConfirmed}
              disabled={isDeleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #991b1b',
                background: '#991b1b',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: isDeleting ? 'wait' : 'pointer',
              }}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              type='button'
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {deleteErrorMessage ? (
        <div style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}>
          {deleteErrorMessage}
        </div>
      ) : null}
    </section>
  )
}
