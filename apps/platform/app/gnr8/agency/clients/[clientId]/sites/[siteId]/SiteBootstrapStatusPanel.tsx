'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { pollTemplateSiteStatus } from '@/app/gnr8/_components/client-dashboard/template-site-status-polling'
import type { TemplateSiteBootstrapStatusResult } from '@/gnr8/site/site-create-contract'

type Props = {
  clientId: string
  siteId: string
  initialStatus: TemplateSiteBootstrapStatusResult
}

export default function SiteBootstrapStatusPanel(props: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<TemplateSiteBootstrapStatusResult>(props.initialStatus)
  const [isPolling, setIsPolling] = useState(false)

  const endpoint = useMemo(
    () => `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/bootstrap-status`,
    [props.clientId, props.siteId],
  )

  async function refreshOnce() {
    try {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as TemplateSiteBootstrapStatusResult | null
      if (payload?.ok) setStatus(payload)
    } finally {
      router.refresh()
    }
  }

  async function startLivePolling() {
    setIsPolling(true)
    await pollTemplateSiteStatus({
      endpoint,
      intervalMs: 1500,
      timeoutMs: 60_000,
      onPollStarted: () => {
        setStatus((prev) => ({ ...prev, diagnostics: [...new Set([...prev.diagnostics, 'TEMPLATE_SITE_STATUS_POLL_STARTED'])] }))
      },
      onPollCompleted: (result) => {
        setStatus({
          ...result,
          diagnostics: [...new Set([...result.diagnostics, 'TEMPLATE_SITE_STATUS_POLL_COMPLETED'])],
        })
      },
      onPollTimeout: () => {
        setStatus((prev) => ({
          ...prev,
          status: 'failed',
          reasonCode: prev.reasonCode ?? 'TEMPLATE_SITE_STATUS_POLL_TIMEOUT',
          diagnostics: [...new Set([...prev.diagnostics, 'TEMPLATE_SITE_STATUS_POLL_TIMEOUT'])],
        }))
      },
      onPollFailed: () => {
        setStatus((prev) => ({
          ...prev,
          diagnostics: [...new Set([...prev.diagnostics, 'TEMPLATE_SITE_STATUS_FAILED'])],
        }))
      },
    })
    setIsPolling(false)
    router.refresh()
  }

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
      <div>Status: {status.status}</div>
      <div>Preview ready: {status.previewReady ? 'yes' : 'no'}</div>
      <div>Preview URL: {status.previewUrl ?? 'not ready'}</div>
      <div>Raw template artifact found: {status.rawTemplateArtifactFound ? 'yes' : 'no'}</div>
      <div>Entry HTML found: {status.entryHtmlFound ? 'yes' : 'no'}</div>
      <div>Raw artifact file map count: {status.fileMapCount}</div>
      <div>Content slot count: {status.slotCount}</div>
      <div>Publish readiness: {status.publishReady ? 'ready' : 'not ready'}</div>
      {status.reasonCode ? <div>Reason code: {status.reasonCode}</div> : null}
      <div>Diagnostics: {status.diagnostics.length > 0 ? status.diagnostics.join(' · ') : 'none'}</div>
      {status.status === 'bootstrap_running' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='button'
            onClick={() => {
              void refreshOnce()
            }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 12, fontWeight: 600 }}
          >
            Refresh Status
          </button>
          <button
            type='button'
            onClick={() => {
              void startLivePolling()
            }}
            disabled={isPolling}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #0f172a', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 600 }}
          >
            {isPolling ? 'Polling…' : 'Start Live Refresh'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
