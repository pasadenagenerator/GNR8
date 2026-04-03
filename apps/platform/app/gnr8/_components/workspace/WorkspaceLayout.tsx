import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

export type WorkspaceTab = {
  key: string
  label: string
  href: string
  active?: boolean
}

export type WorkspaceHeaderModel = {
  title: string
  subtitle?: string
  contextLabel?: string
  backHref?: string
  backLabel?: string
  meta?: ReactNode
  identityPlacement?: 'left' | 'right'
  titleFontSize?: number
  subtitleFontSize?: number
}

type WorkspaceHeaderProps = {
  model: WorkspaceHeaderModel
}

type WorkspaceTabsProps = {
  ariaLabel: string
  tabs: WorkspaceTab[]
}

type WorkspaceLayoutProps = {
  children: ReactNode
  header: WorkspaceHeaderModel
  tabs: WorkspaceTab[]
  tabsAriaLabel: string
  maxWidth?: number
  padding?: number
  afterTabs?: ReactNode
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 12px',
    borderRadius: 8,
    border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1e3a8a' : '#0f172a',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  }
}

function backLinkStyle(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    textDecoration: 'none',
    fontSize: 12,
  }
}

function identityBlockStyle(align: 'left' | 'right'): CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    justifyItems: align === 'right' ? 'end' : 'start',
    textAlign: align === 'right' ? 'right' : 'left',
  }
}

function renderIdentity(model: WorkspaceHeaderModel, align: 'left' | 'right') {
  return (
    <div style={identityBlockStyle(align)}>
      {model.contextLabel ? <div style={{ margin: 0, fontSize: 12, color: '#475569' }}>{model.contextLabel}</div> : null}
      <div style={{ margin: 0, fontSize: model.titleFontSize ?? 28, color: '#0f172a', fontWeight: 700 }}>{model.title}</div>
      {model.subtitle ? <div style={{ margin: 0, fontSize: model.subtitleFontSize ?? 12, color: '#64748b' }}>{model.subtitle}</div> : null}
    </div>
  )
}

export function WorkspaceHeader(props: WorkspaceHeaderProps) {
  const model = props.model
  const identityPlacement = model.identityPlacement ?? 'left'
  const identity = renderIdentity(model, identityPlacement)

  if (identityPlacement === 'right') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          {model.backHref && model.backLabel ? (
            <Link href={model.backHref} style={backLinkStyle()}>
              {model.backLabel}
            </Link>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
          {identity}
          {model.meta ? <div style={{ display: 'grid', gap: 4, justifyItems: 'end', fontSize: 12, color: '#334155' }}>{model.meta}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'grid', gap: 6 }}>
        {model.backHref && model.backLabel ? (
          <Link href={model.backHref} style={backLinkStyle()}>
            {model.backLabel}
          </Link>
        ) : null}
        {identity}
      </div>
      {model.meta ? <div style={{ display: 'grid', gap: 4, justifyItems: 'end', fontSize: 12, color: '#334155' }}>{model.meta}</div> : null}
    </div>
  )
}

export function WorkspaceTabs(props: WorkspaceTabsProps) {
  return (
    <nav style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label={props.ariaLabel}>
      {props.tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} aria-current={tab.active ? 'page' : undefined} style={tabStyle(Boolean(tab.active))}>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}

export default function WorkspaceLayout(props: WorkspaceLayoutProps) {
  return (
    <main
      style={{
        maxWidth: props.maxWidth ?? 1440,
        margin: '0 auto',
        padding: props.padding ?? 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <section
        style={{
          border: '1px solid #dbe6f1',
          borderRadius: 12,
          background: '#fff',
          padding: 14,
        }}
      >
        <WorkspaceHeader model={props.header} />
        <WorkspaceTabs ariaLabel={props.tabsAriaLabel} tabs={props.tabs} />
        {props.afterTabs}
      </section>

      <div style={{ marginTop: 14 }}>{props.children}</div>
    </main>
  )
}
