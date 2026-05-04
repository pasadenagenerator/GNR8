'use client'

import { useEffect, useMemo, useState } from 'react'

type Slot = { slotKey: string; slotType: string; sourceText: string | null; sourceAssetPath?: string | null; sourceSelector?: string | null; confidence?: number }
type Override = { slotKey: string; valueJson: any }
type Grouped = {
  hero: Slot[]
  sections: Array<{
    index: number
    type: string
    titleSlot: Slot | null
    introSlot: Slot | null
    bodySlot: Slot | null
    ctas: Array<{ labelSlot: Slot | null; hrefSlot: Slot | null }>
    items: Array<{ index: number; titleSlot: Slot | null; descriptionSlot: Slot | null; imageSlot: Slot | null }>
    gallery: Array<{ index: number; imageSlot: Slot | null; altSlot: Slot | null }>
    contact: { emailSlot: Slot | null; phoneSlot: Slot | null; addressSlot: Slot | null; formTitleSlot: Slot | null }
  }>
  footer: Slot[]
}

export default function ContentBindingsPanel(props: { agencyId: string; clientId: string; siteId: string }) {
  const [grouped, setGrouped] = useState<Grouped>({ hero: [], sections: [], footer: [] })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [published, setPublished] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const endpoint = useMemo(() => `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content?agencyId=${encodeURIComponent(props.agencyId)}`,[props])

  useEffect(() => {
    let done = false
    fetch(endpoint).then((r) => r.json()).then((payload) => {
      if (done || !payload?.ok) return
      setGrouped(payload.grouped ?? { hero: [], sections: [], footer: [] })
      const draftMap: Record<string, string> = {}
      const draftOverrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
      for (const ov of draftOverrides) draftMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
      const pubMap: Record<string, string> = {}
      const pubOverrides: Override[] = Array.isArray(payload.publishedOverrides) ? payload.publishedOverrides : []
      for (const ov of pubOverrides) pubMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
      setDrafts(draftMap)
      setPublished(pubMap)
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

  function Field({ slot, label }: { slot: Slot | null; label: string }) {
    if (!slot) return null
    const editable = Boolean(slot.sourceSelector)
    const original = slot.sourceText ?? slot.sourceAssetPath ?? 'n/a'
    const lowConfidence = (slot.confidence ?? 1) < 0.6
    return (
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 12, color: '#334155' }}>
          <strong>{label}</strong> · original: {original}
          {lowConfidence ? <span style={{ marginLeft: 8, color: '#b45309' }}>Low confidence</span> : null}
        </div>
        <input value={drafts[slot.slotKey] ?? ''} onChange={(e) => setDrafts((p) => ({ ...p, [slot.slotKey]: e.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 }} disabled={!editable} />
        <div style={{ fontSize: 12, color: '#64748b' }}>Published: {published[slot.slotKey] ?? 'n/a'}</div>
        {!editable ? <div style={{ fontSize: 12, color: '#64748b' }}>Detected, but not safely editable yet.</div> : null}
        <button type='button' disabled={busy || !editable} onClick={() => saveDraft(slot)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>Save Draft</button>
      </div>
    )
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
      <h4 style={{ margin: 0, fontSize: 14 }}>Hero</h4>
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.title') ?? null} label='title' />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.subtitle') ?? null} label='subtitle' />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.label') ?? null} label='CTA label' />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.href') ?? null} label='CTA URL' />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.image') ?? null} label='image URL/path' />

      <h4 style={{ margin: 0, fontSize: 14 }}>Sections</h4>
      {grouped.sections.map((section) => (
        <div key={section.index} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Section {section.index + 1}: {section.type}</div>
          <Field slot={section.titleSlot} label='heading' />
          <Field slot={section.introSlot ?? section.bodySlot} label='intro/body' />
          <Field slot={section.ctas[0]?.labelSlot ?? null} label='CTA label' />
          <Field slot={section.ctas[0]?.hrefSlot ?? null} label='CTA href' />
          {section.items.map((item) => (
            <div key={item.index} style={{ display: 'grid', gap: 8, borderLeft: '2px solid #e2e8f0', paddingLeft: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Item {item.index + 1}</div>
              <Field slot={item.titleSlot} label='item title' />
              <Field slot={item.descriptionSlot} label='item description' />
              <Field slot={item.imageSlot} label='item image' />
            </div>
          ))}
          {section.gallery.map((entry) => (
            <div key={entry.index} style={{ display: 'grid', gap: 8, borderLeft: '2px solid #e2e8f0', paddingLeft: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Gallery {entry.index + 1}</div>
              <Field slot={entry.imageSlot} label='gallery image' />
              <Field slot={entry.altSlot} label='gallery alt' />
            </div>
          ))}
          <Field slot={section.contact.emailSlot} label='email' />
          <Field slot={section.contact.phoneSlot} label='phone' />
          <Field slot={section.contact.addressSlot} label='address' />
        </div>
      ))}

      <button type='button' disabled={busy} onClick={publish} style={{ width: 'fit-content', padding: '8px 12px', borderRadius: 8, border: '1px solid #0f172a', background: '#0f172a', color: '#fff', fontWeight: 600 }}>Publish Content</button>
    </section>
  )
}
