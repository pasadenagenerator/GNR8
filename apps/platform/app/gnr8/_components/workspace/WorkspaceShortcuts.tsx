import Link from 'next/link'
import type { CSSProperties } from 'react'

export type WorkspaceShortcut = {
  id: string
  label: string
  href: string
  description?: string
  icon?: string
  external?: boolean
}

type Props = {
  title: string
  helperText?: string
  shortcuts: WorkspaceShortcut[]
}

function sectionStyle(): CSSProperties {
  return {
    marginTop: 12,
    border: '1px solid #dbe6f1',
    borderRadius: 10,
    background: '#fff',
    padding: 10,
  }
}

function shortcutStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 2,
    border: '1px solid #dbe6f1',
    borderRadius: 8,
    background: '#f8fafc',
    padding: '8px 10px',
    textDecoration: 'none',
    color: '#0f172a',
  }
}

function ShortcutItem(props: { shortcut: WorkspaceShortcut }) {
  const content = (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
        {props.shortcut.icon ? (
          <span aria-hidden='true' style={{ fontSize: 12 }}>
            {props.shortcut.icon}
          </span>
        ) : null}
        <span>{props.shortcut.label}</span>
      </span>
      {props.shortcut.description ? <span style={{ fontSize: 11, color: '#64748b' }}>{props.shortcut.description}</span> : null}
    </>
  )

  if (props.shortcut.external) {
    return (
      <a href={props.shortcut.href} target='_blank' rel='noreferrer' style={shortcutStyle()}>
        {content}
      </a>
    )
  }

  return (
    <Link href={props.shortcut.href} style={shortcutStyle()}>
      {content}
    </Link>
  )
}

export default function WorkspaceShortcuts(props: Props) {
  if (props.shortcuts.length === 0) return null

  return (
    <section style={sectionStyle()} aria-label={props.title}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{props.title}</h2>
        {props.helperText ? <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{props.helperText}</p> : null}
      </div>

      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
          gap: 8,
        }}
      >
        {props.shortcuts.map((shortcut) => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </section>
  )
}
