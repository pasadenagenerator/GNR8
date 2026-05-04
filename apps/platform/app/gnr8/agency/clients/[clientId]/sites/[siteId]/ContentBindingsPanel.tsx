'use client'

import { useEffect, useMemo, useState } from 'react'

import { detectFieldDraftState, draftStateLabel, friendlySlotLabel, inputKindForSlot, sectionTitle, type Slot } from '@/gnr8/site/content-bindings-panel-helpers'

type Override = { slotKey: string; valueJson: any }
type HistoryRow = {
  id: string
  slotKey: string
  slotLabel: string
  action: 'draft_saved' | 'content_published' | 'rollback_applied'
  source: 'manual' | 'batch' | 'system' | 'ai'
  previousValueJson: any
  nextValueJson: any
  createdAt: string
}
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
  const [siteVersionId, setSiteVersionId] = useState<string>('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [published, setPublished] = useState<Record<string, string>>({})
  const [publishedAtLoad, setPublishedAtLoad] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success'>('idle')
  const [saveAllStatus, setSaveAllStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([])

  const endpoint = useMemo(() => `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content?agencyId=${encodeURIComponent(props.agencyId)}`, [props])

  const allSlots = useMemo(() => {
    const slots: Slot[] = [...grouped.hero, ...grouped.footer]
    for (const section of grouped.sections) {
      if (section.titleSlot) slots.push(section.titleSlot)
      if (section.introSlot) slots.push(section.introSlot)
      if (section.bodySlot) slots.push(section.bodySlot)
      for (const cta of section.ctas) {
        if (cta.labelSlot) slots.push(cta.labelSlot)
        if (cta.hrefSlot) slots.push(cta.hrefSlot)
      }
      for (const item of section.items) {
        if (item.titleSlot) slots.push(item.titleSlot)
        if (item.descriptionSlot) slots.push(item.descriptionSlot)
        if (item.imageSlot) slots.push(item.imageSlot)
      }
      for (const entry of section.gallery) {
        if (entry.imageSlot) slots.push(entry.imageSlot)
        if (entry.altSlot) slots.push(entry.altSlot)
      }
      if (section.contact.emailSlot) slots.push(section.contact.emailSlot)
      if (section.contact.phoneSlot) slots.push(section.contact.phoneSlot)
      if (section.contact.addressSlot) slots.push(section.contact.addressSlot)
    }
    return slots
  }, [grouped])

  const editableVisibleSlots = useMemo(() => allSlots.filter((slot) => Boolean(slot.sourceSelector)), [allSlots])

  const modifiedEditableSlots = useMemo(() => {
    return editableVisibleSlots.filter((slot) => (drafts[slot.slotKey] ?? '') !== (publishedAtLoad[slot.slotKey] ?? ''))
  }, [drafts, editableVisibleSlots, publishedAtLoad])

  useEffect(() => {
    let done = false
    fetch(endpoint)
      .then((r) => r.json())
      .then((payload) => {
        if (done || !payload?.ok) return
        setGrouped(payload.grouped ?? { hero: [], sections: [], footer: [] })
        setSiteVersionId(typeof payload.siteVersionId === 'string' ? payload.siteVersionId : '')
        const draftMap: Record<string, string> = {}
        const draftOverrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
        for (const ov of draftOverrides) draftMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
        const pubMap: Record<string, string> = {}
        const pubOverrides: Override[] = Array.isArray(payload.publishedOverrides) ? payload.publishedOverrides : []
        for (const ov of pubOverrides) pubMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
        setDrafts(draftMap)
        setPublished(pubMap)
        setPublishedAtLoad(pubMap)
        const loadedSiteVersionId = typeof payload.siteVersionId === 'string' ? payload.siteVersionId : ''
        if (loadedSiteVersionId) {
          fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(loadedSiteVersionId)}&limit=100`)
            .then((r) => r.json())
            .then((historyPayload) => {
              if (!done && historyPayload?.ok && Array.isArray(historyPayload.rows)) setHistoryRows(historyPayload.rows)
            })
            .catch(() => undefined)
        }
      })
      .catch(() => undefined)
    return () => {
      done = true
    }
  }, [endpoint])

  async function saveDraft(slot: Slot): Promise<void> {
    setBusy(true)
    try {
      await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, slotKey: slot.slotKey, valueType: slot.slotType, valueJson: { value: drafts[slot.slotKey] ?? '' } }),
      })
      if (siteVersionId) {
        const historyResponse = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(siteVersionId)}&limit=100`)
        const historyPayload = (await historyResponse.json().catch(() => null)) as any
        if (historyPayload?.ok && Array.isArray(historyPayload.rows)) setHistoryRows(historyPayload.rows)
      }
    } finally {
      setBusy(false)
    }
  }

  async function saveAllDrafts(): Promise<void> {
    if (modifiedEditableSlots.length === 0 || !siteVersionId) return
    setBusy(true)
    setSaveAllStatus('idle')
    try {
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides/batch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agencyId: props.agencyId,
          siteVersionId,
          overrides: modifiedEditableSlots.map((slot) => ({
            slotKey: slot.slotKey,
            value: drafts[slot.slotKey] ?? '',
            status: 'draft',
          })),
        }),
      })
      if (!response.ok) throw new Error('batch_save_failed')
      setPublishedAtLoad((prev) => {
        const next = { ...prev }
        for (const slot of modifiedEditableSlots) next[slot.slotKey] = drafts[slot.slotKey] ?? ''
        return next
      })
      setSaveAllStatus('success')
      const historyResponse = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(siteVersionId)}&limit=100`)
      const historyPayload = (await historyResponse.json().catch(() => null)) as any
      if (historyPayload?.ok && Array.isArray(historyPayload.rows)) setHistoryRows(historyPayload.rows)
    } catch {
      setSaveAllStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function publish(): Promise<void> {
    setBusy(true)
    setPublishStatus('idle')
    try {
      await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId }),
      })
      setPublished({ ...drafts })
      setPublishedAtLoad({ ...drafts })
      setPublishStatus('success')
      if (siteVersionId) {
        const historyResponse = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(siteVersionId)}&limit=100`)
        const historyPayload = (await historyResponse.json().catch(() => null)) as any
        if (historyPayload?.ok && Array.isArray(historyPayload.rows)) setHistoryRows(historyPayload.rows)
      }
    } finally {
      setBusy(false)
    }
  }

  async function rollback(row: HistoryRow): Promise<void> {
    if (!siteVersionId) return
    setBusy(true)
    try {
      await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/rollback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, siteVersionId, slotKey: row.slotKey, historyId: row.id, targetStatus: 'draft' }),
      })
      const contentResponse = await fetch(endpoint)
      const payload = (await contentResponse.json().catch(() => null)) as any
      if (payload?.ok) {
        const draftMap: Record<string, string> = {}
        const draftOverrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
        for (const ov of draftOverrides) draftMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
        const pubMap: Record<string, string> = {}
        const pubOverrides: Override[] = Array.isArray(payload.publishedOverrides) ? payload.publishedOverrides : []
        for (const ov of pubOverrides) pubMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
        setDrafts(draftMap)
        setPublished(pubMap)
        setPublishedAtLoad(pubMap)
      }
      const historyResponse = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(siteVersionId)}&limit=100`)
      const historyPayload = (await historyResponse.json().catch(() => null)) as any
      if (historyPayload?.ok && Array.isArray(historyPayload.rows)) setHistoryRows(historyPayload.rows)
    } finally {
      setBusy(false)
    }
  }

  function displayValue(valueJson: any): string {
    const value = valueJson?.value
    if (typeof value === 'string') return value
    return value == null ? 'empty' : JSON.stringify(value)
  }

  function Field({ slot }: { slot: Slot | null }) {
    if (!slot) return null
    const editable = Boolean(slot.sourceSelector)
    const original = slot.sourceText ?? slot.sourceAssetPath ?? 'n/a'
    const lowConfidence = (slot.confidence ?? 1) < 0.6
    const state = detectFieldDraftState({ slotKey: slot.slotKey, draftValue: drafts[slot.slotKey], publishedValue: published[slot.slotKey] })
    const stateText = draftStateLabel(state)
    const inputKind = inputKindForSlot(slot)

    return (
      <div style={{ display: 'grid', gap: 6, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff' }}>
        <div style={{ fontSize: 12, color: '#334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <strong>{friendlySlotLabel(slot.slotKey)}</strong>
          <span style={{ color: '#64748b' }}>{stateText}</span>
          {lowConfidence ? <span style={{ color: '#b45309', border: '1px solid #fcd34d', borderRadius: 999, padding: '1px 7px' }}>Low confidence</span> : null}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{slot.slotKey}</div>
        {inputKind === 'textarea' ? (
          <textarea
            value={drafts[slot.slotKey] ?? ''}
            onChange={(e) => setDrafts((p) => ({ ...p, [slot.slotKey]: e.target.value }))}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13, minHeight: 84 }}
            disabled={!editable}
          />
        ) : (
          <input
            type={inputKind}
            value={drafts[slot.slotKey] ?? ''}
            onChange={(e) => setDrafts((p) => ({ ...p, [slot.slotKey]: e.target.value }))}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 }}
            disabled={!editable}
          />
        )}
        <div style={{ fontSize: 12, color: '#64748b' }}>Original: {original}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Published: {published[slot.slotKey] ?? 'n/a'}</div>
        {!editable ? <div style={{ fontSize: 12, color: '#64748b' }}>Detected, but not safely editable yet.</div> : null}
        <button type='button' disabled={busy || !editable} onClick={() => saveDraft(slot)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          Save Draft
        </button>
      </div>
    )
  }

  const hasDraftChangesToPublish = Object.keys(drafts).some((slotKey) => (drafts[slotKey] ?? '') !== (published[slotKey] ?? ''))

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type='button'
          disabled={busy || modifiedEditableSlots.length === 0}
          onClick={saveAllDrafts}
          style={{ width: 'fit-content', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600 }}
        >
          Save all drafts
        </button>
        {saveAllStatus === 'success' ? <div style={{ fontSize: 12, color: '#166534', alignSelf: 'center' }}>All changes saved</div> : null}
        {saveAllStatus === 'error' ? <div style={{ fontSize: 12, color: '#b91c1c', alignSelf: 'center' }}>Save failed. Try per-field save.</div> : null}
        <button
          type='button'
          disabled={busy || !hasDraftChangesToPublish}
          onClick={publish}
          style={{ width: 'fit-content', padding: '8px 12px', borderRadius: 8, border: '1px solid #0f172a', background: hasDraftChangesToPublish ? '#0f172a' : '#cbd5e1', color: '#fff', fontWeight: 600 }}
        >
          {publishStatus === 'success' ? 'Content published' : 'Publish content changes'}
        </button>
        {!hasDraftChangesToPublish ? <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>No draft changes to publish</div> : null}
      </div>

      <h4 style={{ margin: 0, fontSize: 14 }}>Hero</h4>
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.title') ?? null} />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.subtitle') ?? null} />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.label') ?? null} />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.href') ?? null} />
      <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.image') ?? null} />

      <h4 style={{ margin: 0, fontSize: 14 }}>Sections</h4>
      {grouped.sections.map((section) => (
        <div key={section.index} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{sectionTitle({ index: section.index, type: section.type })}</div>
          <Field slot={section.titleSlot} />
          <Field slot={section.introSlot} />
          <Field slot={section.bodySlot} />
          <Field slot={section.ctas[0]?.labelSlot ?? null} />
          <Field slot={section.ctas[0]?.hrefSlot ?? null} />
          {section.items.map((item) => (
            <div key={item.index} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{section.type === 'services' ? `Service ${item.index + 1}` : `Item ${item.index + 1}`}</div>
              <Field slot={item.titleSlot} />
              <Field slot={item.descriptionSlot} />
              <Field slot={item.imageSlot} />
            </div>
          ))}
          {section.gallery.map((entry) => (
            <div key={entry.index} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Gallery image {entry.index + 1}</div>
              <Field slot={entry.imageSlot} />
              <Field slot={entry.altSlot} />
            </div>
          ))}
          {(section.contact.emailSlot || section.contact.phoneSlot || section.contact.addressSlot) ? (
            <div style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Contact details</div>
              <Field slot={section.contact.emailSlot} />
              <Field slot={section.contact.phoneSlot} />
              <Field slot={section.contact.addressSlot} />
            </div>
          ) : null}
        </div>
      ))}

      {grouped.footer.length > 0 ? (
        <>
          <h4 style={{ margin: 0, fontSize: 14 }}>Footer</h4>
          {grouped.footer.map((slot) => (
            <Field key={slot.slotKey} slot={slot} />
          ))}
        </>
      ) : null}

      <h4 style={{ margin: 0, fontSize: 14 }}>Recent changes</h4>
      {historyRows.length === 0 ? <div style={{ fontSize: 12, color: '#64748b' }}>No history yet.</div> : null}
      {historyRows.map((row) => (
        <div key={row.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 6, background: '#f8fafc' }}>
          <div style={{ fontSize: 12, color: '#334155' }}>
            <strong>{row.slotLabel}</strong> · {row.action} · {new Date(row.createdAt).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {displayValue(row.previousValueJson)} {'->'} {displayValue(row.nextValueJson)}
          </div>
          <button type='button' disabled={busy} onClick={() => rollback(row)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
            Rollback slot
          </button>
        </div>
      ))}
    </section>
  )
}
