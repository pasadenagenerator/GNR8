'use client'

import { useEffect, useMemo, useState } from 'react'

type Slot = { slotKey: string; slotType: string; sourceText: string | null }
type Override = { slotKey: string; valueJson: any }

export default function ContentBindingsPanel(props: { agencyId: string; clientId: string; siteId: string }) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const endpoint = useMemo(() => `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content?agencyId=${encodeURIComponent(props.agencyId)}`,[props])

  useEffect(() => {
    let done = false
    fetch(endpoint).then((r) => r.json()).then((payload) => {
      if (done || !payload?.ok) return
      const list: Slot[] = Array.isArray(payload.slots) ? payload.slots : []
      setSlots(list.filter((s) => s.slotKey === 'hero.title' || s.slotKey === 'hero.subtitle' || s.slotKey === 'hero.cta.label' || s.slotKey === 'hero.cta.href'))
      const draftMap: Record<string, string> = {}
      const overrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
      for (const ov of overrides) draftMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
      setDrafts(draftMap)
    }).catch(() => undefined)
    return () => { done = true }
  }, [endpoint])

  async function saveDraft(slot: Slot): Promise<void> {
    setBusy(true)
    try {
      await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, slotKey: slot.slotKey, valueType: slot.slotType, valueJson: { value: drafts[slot.slotKey] ?? '' } }),
      })
    } finally { setBusy(false) }
  }

  async function publish(): Promise<void> {
    setBusy(true)
    try {
      await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/publish`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId }),
      })
    } finally { setBusy(false) }
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
      {slots.map((slot) => (
        <div key={slot.slotKey} style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, color: '#334155' }}><strong>{slot.slotKey}</strong> · original: {slot.sourceText ?? 'n/a'}</div>
          <input value={drafts[slot.slotKey] ?? ''} onChange={(e) => setDrafts((p) => ({ ...p, [slot.slotKey]: e.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 }} />
          <button type='button' disabled={busy} onClick={() => saveDraft(slot)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>Save Draft</button>
        </div>
      ))}
      <button type='button' disabled={busy} onClick={publish} style={{ width: 'fit-content', padding: '8px 12px', borderRadius: 8, border: '1px solid #0f172a', background: '#0f172a', color: '#fff', fontWeight: 600 }}>Publish Content</button>
    </section>
  )
}
