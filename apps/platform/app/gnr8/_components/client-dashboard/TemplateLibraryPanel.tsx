'use client'

import { useEffect, useMemo, useState } from 'react'

type TemplateListResponse = {
  ok: boolean
  error?: string
  templates?: Array<{
    id: string
    name: string
    slug: string
    sourceType: 'zip_html'
    status: 'uploaded' | 'processing' | 'ready' | 'failed'
    importHealth: 'clean' | 'degraded' | 'failed'
    tags: string[]
    sourceFilename: string
    preview: {
      available: boolean
      isFallback: boolean
      source: 'rendered_capture' | 'fallback'
      imagePath: string | null
    }
    createdAt: string
  }>
}

type UploadResponse =
  | {
      ok: true
      templateId: string
      status: 'uploaded' | 'processing' | 'ready' | 'failed'
      name: string
      tags: string[]
      importHealth: 'clean' | 'degraded' | 'failed'
      preview: {
        available: boolean
        isFallback: boolean
        source: 'rendered_capture' | 'fallback'
        imagePath: string | null
      }
    }
  | {
      ok: false
      error?: string
    }

function normalizeStatusLabel(status: string): string {
  if (status === 'ready') return 'Ready'
  if (status === 'processing') return 'Processing'
  if (status === 'uploaded') return 'Uploaded'
  return 'Failed'
}

function normalizeHealthLabel(health: string): string {
  if (health === 'clean') return 'Clean'
  if (health === 'degraded') return 'Degraded'
  return 'Failed'
}

function badgeColor(value: string): { background: string; border: string; color: string } {
  if (value === 'Ready' || value === 'Clean') {
    return { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' }
  }
  if (value === 'Processing' || value === 'Uploaded') {
    return { background: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' }
  }
  if (value === 'Degraded') {
    return { background: '#fff7ed', border: '#fed7aa', color: '#9a3412' }
  }
  return { background: '#fff1f2', border: '#fecdd3', color: '#9f1239' }
}

function StatusBadge(props: { label: string; value: string }) {
  const colors = badgeColor(props.value)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {props.label}: {props.value}
    </span>
  )
}

export default function TemplateLibraryPanel(props: { clientId: string }) {
  const [templates, setTemplates] = useState<TemplateListResponse['templates']>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  async function loadTemplates() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates`, { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as TemplateListResponse | null
      if (!payload || payload.ok !== true || !Array.isArray(payload.templates)) {
        setError(payload?.error ?? `Template list failed (HTTP ${response.status})`)
        setTemplates([])
        return
      }

      const sorted = [...payload.templates].sort((a, b) => {
        const tsA = Number(new Date(a.createdAt).getTime()) || 0
        const tsB = Number(new Date(b.createdAt).getTime()) || 0
        if (tsA !== tsB) return tsB - tsA
        return b.id.localeCompare(a.id)
      })

      setTemplates(sorted)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load templates.')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  const hasTemplates = (templates?.length ?? 0) > 0

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUploadError(null)
    setSuccessMessage(null)

    if (!file) {
      setUploadError('Select a ZIP file first.')
      return
    }

    const formData = new FormData()
    formData.set('file', file)

    setIsUploading(true)
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/templates/upload`, {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as UploadResponse | null

      if (!payload || payload.ok !== true) {
        setUploadError(payload && 'error' in payload ? payload.error ?? `Upload failed (HTTP ${response.status})` : `Upload failed (HTTP ${response.status})`)
        return
      }

      setSuccessMessage(`Template \"${payload.name}\" uploaded with status ${normalizeStatusLabel(payload.status)}.`)
      setFile(null)
      const input = document.getElementById('template-zip-input') as HTMLInputElement | null
      if (input) input.value = ''
      await loadTemplates()
    } catch (submitError) {
      setUploadError(submitError instanceof Error ? submitError.message : 'Upload failed due to an unexpected error.')
    } finally {
      setIsUploading(false)
    }
  }

  const templateCards = useMemo(() => templates ?? [], [templates])

  return (
    <section
      style={{
        marginTop: 14,
        border: '1px solid #dbe6f1',
        borderRadius: 12,
        background: '#fff',
        padding: 12,
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Templates</h3>
          <label
            htmlFor='template-zip-input'
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
              cursor: 'pointer',
            }}
          >
            Add New Template
          </label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Upload ZIP HTML templates. Cards show truthful status, import health, tags, and preview fallback state.
        </p>
      </header>

      <form onSubmit={onUpload} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        <input
          id='template-zip-input'
          type='file'
          accept='.zip,application/zip'
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          style={{ fontSize: 12, color: '#334155' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='submit'
            disabled={isUploading}
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
              opacity: isUploading ? 0.75 : 1,
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload ZIP'}
          </button>
          {file ? <span style={{ fontSize: 12, color: '#334155' }}>Selected: {file.name}</span> : null}
        </div>

        {uploadError ? (
          <div
            role='alert'
            style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {uploadError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role='status'
            style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {successMessage}
          </div>
        ) : null}
      </form>

      {error ? (
        <div
          role='alert'
          style={{ marginTop: 12, border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p style={{ marginTop: 12, marginBottom: 0, color: '#475569', fontSize: 13 }}>Loading templates...</p>
      ) : hasTemplates ? (
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {templateCards.map((template) => (
            <article key={template.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div
                style={{
                  minHeight: 120,
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
                    style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 6 }}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>No preview available</span>
                )}
              </div>

              <div style={{ padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gap: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{template.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{template.sourceFilename}</div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <StatusBadge label='Status' value={normalizeStatusLabel(template.status)} />
                  <StatusBadge label='Health' value={normalizeHealthLabel(template.importHealth)} />
                  <StatusBadge label='Source' value='ZIP HTML' />
                </div>

                {template.tags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {template.tags.map((tag) => (
                      <span
                        key={`${template.id}-${tag}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: 11,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>No tags</div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            border: '1px dashed #cbd5e1',
            borderRadius: 10,
            padding: 14,
            background: '#f8fafc',
            fontSize: 13,
            color: '#475569',
          }}
        >
          No templates uploaded yet.
        </div>
      )}
    </section>
  )
}
