'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { addRecentItem } from '@/src/workspace/workspace-recents'

type SiteActionType = 'rerun_transformation' | 'generate_redesign' | 'publish_site'

type Props = {
  siteId: string
  agencyId: string
  clientId: string
  siteName: string
  activeTab: 'overview' | 'structure' | 'design' | 'preview' | 'content' | 'settings'
  canRunTransformation: boolean
  canPublish: boolean
  lastRunAt: string | null
  currentStatus: 'idle' | 'running' | 'completed' | 'failed'
  lastAction: {
    type: SiteActionType | null
    status: 'idle' | 'running' | 'completed' | 'failed'
    resultSummary: string | null
    diagnostics: string[]
    createdAt: string | null
    completedAt: string | null
  }
  variants: {
    selectedVariantId: string | null
    rows: Array<{
      id: string
      label: string
      strategy: string
      siteVersionId: string | null
      createdAt: string
    }>
  }
}

type SiteActionsResponse = {
  ok: boolean
  result?: {
    ok: boolean
    variant?: { id: string }
    action?: {
      resultSummary?: string
      diagnostics?: string[]
    }
  }
  error?: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function buttonStyle(input: { disabled: boolean; tone?: 'primary' | 'neutral' | 'danger' }) {
  const tone = input.tone ?? 'neutral'
  const isPrimary = tone === 'primary'
  const isDanger = tone === 'danger'
  return {
    padding: '7px 10px',
    borderRadius: 8,
    border: isDanger ? '1px solid #fca5a5' : isPrimary ? '1px solid #93c5fd' : '1px solid #cbd5e1',
    background: input.disabled ? '#f8fafc' : isDanger ? '#fff1f2' : isPrimary ? '#eff6ff' : '#fff',
    color: input.disabled ? '#94a3b8' : isDanger ? '#991b1b' : isPrimary ? '#1d4ed8' : '#0f172a',
    cursor: input.disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
  } as const
}

function actionTypeLabel(type: SiteActionType | null): string {
  if (type === 'rerun_transformation') return 'Re-run Transformation'
  if (type === 'generate_redesign') return 'Generate Redesign Variant'
  if (type === 'publish_site') return 'Publish Site'
  return 'None'
}

function actionShortLabel(type: SiteActionType): string {
  if (type === 'rerun_transformation') return 'Re-run'
  if (type === 'generate_redesign') return 'Redesign'
  return 'Publish'
}

function buildSiteRecentHref(input: {
  pathname: string
  searchParams: URLSearchParams
  agencyId: string
  variantId?: string | null
}): string {
  const params = new URLSearchParams(input.searchParams.toString())
  params.set('agency', input.agencyId)
  if (input.variantId) {
    params.set('variant', input.variantId)
  } else {
    params.delete('variant')
  }
  const query = params.toString()
  return query ? `${input.pathname}?${query}` : input.pathname
}

export default function SiteActionsPanel(props: Props) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()

  const [runningType, setRunningType] = useState<SiteActionType | null>(null)
  const [strategyInput, setStrategyInput] = useState('More visual')
  const [localMessage, setLocalMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const isRunning = props.currentStatus === 'running' || runningType != null

  const showRerun = props.activeTab === 'overview' || props.activeTab === 'preview'
  const showRedesign = props.activeTab === 'overview' || props.activeTab === 'design'
  const showPublish = props.activeTab === 'overview' || props.activeTab === 'preview'

  const canRunMigration = props.canRunTransformation && !isRunning
  const canPublish = props.canPublish && !isRunning

  const activeVariant = useMemo(
    () => props.variants.rows.find((variant) => variant.id === props.variants.selectedVariantId) ?? null,
    [props.variants.rows, props.variants.selectedVariantId],
  )

  async function executeAction(type: SiteActionType) {
    if (type === 'publish_site' && !canPublish) return
    if ((type === 'rerun_transformation' || type === 'generate_redesign') && !canRunMigration) return

    if (type === 'publish_site') {
      const confirmed = window.confirm('Publish this site variant? This is a simulated publish in V1.')
      if (!confirmed) return
    }

    setRunningType(type)
    setLocalError(null)
    setLocalMessage(null)

    try {
      const response = await fetch('/api/gnr8/site-actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteId: props.siteId,
          actionType: type,
          strategy: type === 'generate_redesign' ? strategyInput : undefined,
          variantId: type === 'publish_site' ? props.variants.selectedVariantId ?? undefined : undefined,
          agencyId: props.agencyId,
        }),
      })

      const json = (await response.json().catch(() => null)) as SiteActionsResponse | null
      if (!response.ok || !json?.ok || !json.result) {
        setLocalError(json?.error || `Action failed (HTTP ${response.status})`)
        return
      }

      if (!json.result.ok) {
        setLocalError(json.result.action?.resultSummary || 'Action failed')
        return
      }

      const variantId = json.result.variant?.id ?? null
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (variantId) params.set('variant', variantId)

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
      router.refresh()

      addRecentItem({
        type: 'action',
        label: `${props.siteName} / ${actionShortLabel(type)}`,
        href: buildSiteRecentHref({
          pathname,
          searchParams: params,
          agencyId: props.agencyId,
          variantId,
        }),
        agencyId: props.agencyId,
        clientId: props.clientId,
        timestamp: Date.now(),
      })

      setLocalMessage(json.result.action?.resultSummary || `${actionTypeLabel(type)} completed.`)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setRunningType(null)
    }
  }

  return (
    <section
      style={{
        border: '1px solid #dbe6f1',
        borderRadius: 12,
        background: '#fff',
        padding: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 2 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Site Actions</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          Status: <strong>{isRunning ? 'running' : props.lastAction.status}</strong>
          {props.lastRunAt ? ` · Last run: ${new Date(props.lastRunAt).toLocaleString()}` : ''}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          Last action: <strong>{actionTypeLabel(props.lastAction.type)}</strong>
          {props.lastAction.completedAt ? ` · ${new Date(props.lastAction.completedAt).toLocaleString()}` : ''}
        </p>
      </div>

      {showRedesign ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#334155' }}>
            Redesign strategy
            <select
              value={strategyInput}
              disabled={!canRunMigration}
              onChange={(event) => setStrategyInput(event.target.value)}
              style={{
                marginTop: 4,
                width: '100%',
                maxWidth: 280,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12,
              }}
            >
              <option value='More minimal'>More minimal</option>
              <option value='More visual'>More visual</option>
              <option value='More conversion-focused'>More conversion-focused</option>
            </select>
          </label>
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showRerun ? (
          <button
            type='button'
            disabled={!canRunMigration}
            style={buttonStyle({ disabled: !canRunMigration, tone: 'primary' })}
            onClick={() => executeAction('rerun_transformation')}
          >
            {runningType === 'rerun_transformation' ? 'Running...' : 'Re-run Transformation'}
          </button>
        ) : null}

        {showRedesign ? (
          <button
            type='button'
            disabled={!canRunMigration}
            style={buttonStyle({ disabled: !canRunMigration })}
            onClick={() => executeAction('generate_redesign')}
          >
            {runningType === 'generate_redesign' ? 'Generating...' : 'Generate Redesign Variant'}
          </button>
        ) : null}

        {showPublish ? (
          <button
            type='button'
            disabled={!canPublish}
            style={buttonStyle({ disabled: !canPublish, tone: 'danger' })}
            onClick={() => executeAction('publish_site')}
          >
            {runningType === 'publish_site' ? 'Publishing...' : 'Publish Site'}
          </button>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 12, color: '#334155' }}>
          Variant
          <select
            value={props.variants.selectedVariantId ?? ''}
            onChange={(event) => {
              const value = normalizeText(event.target.value) || null
              const params = new URLSearchParams(searchParams?.toString() ?? '')
              if (value) {
                params.set('variant', value)
              } else {
                params.delete('variant')
              }
              const query = params.toString()
              router.replace(query ? `${pathname}?${query}` : pathname)
              router.refresh()
            }}
            style={{
              marginTop: 4,
              width: '100%',
              maxWidth: 360,
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
            }}
          >
            <option value=''>Latest runtime</option>
            {props.variants.rows.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} · {new Date(variant.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        {activeVariant ? (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Active variant strategy: <strong>{activeVariant.strategy}</strong>
          </p>
        ) : null}
      </div>

      {props.lastAction.resultSummary ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: props.lastAction.status === 'failed' ? '#991b1b' : '#065f46' }}>
          {props.lastAction.resultSummary}
        </p>
      ) : null}
      {props.lastAction.diagnostics.length > 0 ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7f1d1d' }}>
          Diagnostics: {props.lastAction.diagnostics.join(' · ')}
        </p>
      ) : null}
      {localMessage ? <p style={{ margin: '6px 0 0', fontSize: 12, color: '#065f46' }}>{localMessage}</p> : null}
      {localError ? <p style={{ margin: '6px 0 0', fontSize: 12, color: '#991b1b' }}>{localError}</p> : null}
    </section>
  )
}
