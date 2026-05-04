'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { detectFieldDraftState, draftStateLabel, friendlySlotLabel, inputKindForSlot, sectionTitle, shouldUseFlatSlotFallback, type Slot } from '@/gnr8/site/content-bindings-panel-helpers'

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

const EMPTY_GROUPED: Grouped = { hero: [], sections: [], footer: [] }

const Field = memo(function Field(props: {
  slot: Slot | null
  busy: boolean
  value: string
  publishedValue: string
  onChange: (slotKey: string, nextValue: string) => void
  onSave: (slot: Slot) => void
}) {
  const { slot, busy, value, publishedValue, onChange, onSave } = props
  if (!slot) return null
  const editable = Boolean(slot.sourceSelector)
  const original = slot.sourceText ?? slot.sourceAssetPath ?? 'n/a'
  const lowConfidence = (slot.confidence ?? 1) < 0.6
  const state = detectFieldDraftState({ slotKey: slot.slotKey, draftValue: value, publishedValue })
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
          value={value}
          onChange={(e) => onChange(slot.slotKey, e.target.value)}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13, minHeight: 84 }}
          disabled={!editable}
        />
      ) : (
        <input
          type={inputKind}
          value={value}
          onChange={(e) => onChange(slot.slotKey, e.target.value)}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 }}
          disabled={!editable}
        />
      )}
      <div style={{ fontSize: 12, color: '#64748b' }}>Original: {original}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Published: {publishedValue || 'n/a'}</div>
      {!editable ? <div style={{ fontSize: 12, color: '#64748b' }}>Detected, but not safely editable yet.</div> : null}
      <button type='button' disabled={busy || !editable} onClick={() => onSave(slot)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
        Save Draft
      </button>
    </div>
  )
})

export default function ContentBindingsPanel(props: { agencyId: string; clientId: string; siteId: string }) {
  const [grouped, setGrouped] = useState<Grouped>(EMPTY_GROUPED)
  const [siteVersionId, setSiteVersionId] = useState<string>('')
  const [activeSiteVersionId, setActiveSiteVersionId] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [published, setPublished] = useState<Record<string, string>>({})
  const [publishedAtLoad, setPublishedAtLoad] = useState<Record<string, string>>({})
  const [slotCount, setSlotCount] = useState(0)
  const [draftOverrideCount, setDraftOverrideCount] = useState(0)
  const [publishedOverrideCount, setPublishedOverrideCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'no_drafts' | 'error'>('idle')
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

  const fetchHistory = useCallback(async (requestedSiteVersionId: string): Promise<void> => {
    if (!requestedSiteVersionId) return
    console.info('[gnr8.content-editor] CONTENT_HISTORY_FETCH_STARTED', { siteId: props.siteId, siteVersionId: requestedSiteVersionId })
    const historyResponse = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/history?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(requestedSiteVersionId)}&limit=100`)
    const historyPayload = (await historyResponse.json().catch(() => null)) as any
    if (historyPayload?.ok && Array.isArray(historyPayload.rows)) {
      setHistoryRows(historyPayload.rows)
      console.info('[gnr8.content-editor] CONTENT_HISTORY_FETCH_COMPLETED', { siteId: props.siteId, siteVersionId: requestedSiteVersionId, rowCount: historyPayload.rows.length })
      if (historyPayload.rows.length === 0) console.info('[gnr8.content-editor] CONTENT_HISTORY_EMPTY', { siteId: props.siteId, siteVersionId: requestedSiteVersionId })
    }
  }, [props.agencyId, props.clientId, props.siteId])

  const loadContent = useCallback(async (): Promise<void> => {
    const payload = (await fetch(endpoint).then((r) => r.json()).catch(() => null)) as any
    if (!payload?.ok) return
    setGrouped(payload.grouped ?? EMPTY_GROUPED)
    const resolvedSiteVersionId = typeof payload.siteVersionId === 'string' ? payload.siteVersionId : ''
    const loadedActiveSiteVersionId = typeof payload.activeSiteVersionId === 'string' ? payload.activeSiteVersionId : ''
    setSiteVersionId(resolvedSiteVersionId)
    setActiveSiteVersionId(loadedActiveSiteVersionId)
    setSlots(Array.isArray(payload.slots) ? payload.slots : [])
    setSlotCount(typeof payload.slotCount === 'number' ? payload.slotCount : 0)
    setDraftOverrideCount(typeof payload.draftOverrideCount === 'number' ? payload.draftOverrideCount : 0)
    setPublishedOverrideCount(typeof payload.publishedOverrideCount === 'number' ? payload.publishedOverrideCount : 0)
    console.info('[gnr8.content-editor] CONTENT_EDITOR_VERSION_RESOLVED', {
      siteId: props.siteId,
      siteVersionId: resolvedSiteVersionId,
      activeSiteVersionId: loadedActiveSiteVersionId,
    })
    const draftMap: Record<string, string> = {}
    const draftOverrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
    for (const ov of draftOverrides) draftMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
    const pubMap: Record<string, string> = {}
    const pubOverrides: Override[] = Array.isArray(payload.publishedOverrides) ? payload.publishedOverrides : []
    for (const ov of pubOverrides) pubMap[ov.slotKey] = typeof ov.valueJson?.value === 'string' ? ov.valueJson.value : ''
    setDrafts(draftMap)
    setPublished(pubMap)
    setPublishedAtLoad(pubMap)
    if (resolvedSiteVersionId) await fetchHistory(resolvedSiteVersionId)
  }, [endpoint, fetchHistory])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  const handleDraftChange = useCallback((slotKey: string, nextValue: string) => {
    setDrafts((p) => ({ ...p, [slotKey]: nextValue }))
  }, [])

  const shouldRenderFlatFallback = shouldUseFlatSlotFallback({
    groupedHeroCount: grouped.hero.length,
    groupedSectionCount: grouped.sections.length,
    slotCount: slots.length,
  })

  async function saveDraft(slot: Slot): Promise<void> {
    if (!siteVersionId) return
    setBusy(true)
    try {
      console.info('[gnr8.content-editor] CONTENT_EDITOR_DRAFT_SAVE_REQUESTED', { siteId: props.siteId, siteVersionId, slotKeyCount: 1 })
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, siteVersionId, slotKey: slot.slotKey, valueType: slot.slotType, valueJson: { value: drafts[slot.slotKey] ?? '' } }),
      })
      const payload = (await response.json().catch(() => null)) as any
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'draft_save_failed')
      console.info('[gnr8.content-editor] CONTENT_DRAFT_SAVE_COMPLETED', { siteId: props.siteId, siteVersionId, slotKeyCount: 1, persistedRowCount: payload?.persistedRowCount ?? 0 })
      await fetchHistory(siteVersionId)
      await loadContent()
    } finally {
      setBusy(false)
    }
  }

  async function saveAllDrafts(): Promise<void> {
    if (modifiedEditableSlots.length === 0 || !siteVersionId) return
    setBusy(true)
    setSaveAllStatus('idle')
    try {
      console.info('[gnr8.content-editor] CONTENT_EDITOR_BATCH_SAVE_REQUESTED', { siteId: props.siteId, siteVersionId, slotKeyCount: modifiedEditableSlots.length })
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
      const payload = (await response.json().catch(() => null)) as any
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'batch_save_failed')
      setPublishedAtLoad((prev) => {
        const next = { ...prev }
        for (const slot of modifiedEditableSlots) next[slot.slotKey] = drafts[slot.slotKey] ?? ''
        return next
      })
      setSaveAllStatus('success')
      await fetchHistory(siteVersionId)
      await loadContent()
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
      console.info('[gnr8.content-editor] CONTENT_EDITOR_PUBLISH_REQUESTED', { siteId: props.siteId, siteVersionId, slotKeyCount: Object.keys(drafts).length })
      const response = await fetch(`/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, siteVersionId }),
      })
      const payload = (await response.json().catch(() => null)) as any
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'publish_failed')
      setPublished({ ...drafts })
      setPublishedAtLoad({ ...drafts })
      setPublishStatus((payload?.publishedCount ?? 0) > 0 ? 'success' : 'no_drafts')
      console.info('[gnr8.content-editor] CONTENT_PUBLISH_COMPLETED', { siteId: props.siteId, siteVersionId, slotKeyCount: Object.keys(drafts).length })
      await fetchHistory(siteVersionId)
      await loadContent()
    } catch {
      setPublishStatus('error')
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
      await loadContent()
      await fetchHistory(siteVersionId)
    } finally {
      setBusy(false)
    }
  }

  function displayValue(valueJson: any): string {
    const value = valueJson?.value
    if (typeof value === 'string') return value
    return value == null ? 'empty' : JSON.stringify(value)
  }

  const hasDraftChangesToPublish = Object.keys(drafts).some((slotKey) => (drafts[slotKey] ?? '') !== (published[slotKey] ?? ''))

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
      <div style={{ fontSize: 12, color: '#334155', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
        <div><strong>Debug:</strong> siteVersionId={siteVersionId || 'n/a'} activeSiteVersionId={activeSiteVersionId || 'n/a'}</div>
        <div>slotCount={slotCount} draftOverrideCount={draftOverrideCount} publishedOverrideCount={publishedOverrideCount}</div>
      </div>
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
          {publishStatus === 'success' ? 'Content published' : publishStatus === 'no_drafts' ? 'No drafts to publish' : 'Publish content changes'}
        </button>
        {publishStatus === 'no_drafts' ? <div style={{ fontSize: 12, color: '#854d0e', alignSelf: 'center' }}>Publish completed with 0 promoted drafts.</div> : null}
        {publishStatus === 'error' ? <div style={{ fontSize: 12, color: '#b91c1c', alignSelf: 'center' }}>Publish failed. Please retry.</div> : null}
        {!hasDraftChangesToPublish ? <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>No draft changes to publish</div> : null}
      </div>

      {shouldRenderFlatFallback ? (
        <>
          <h4 style={{ margin: 0, fontSize: 14 }}>All content slots</h4>
          {slots.map((slot) => (
            <Field key={slot.slotKey} slot={slot} busy={busy} value={drafts[slot.slotKey] ?? ''} publishedValue={published[slot.slotKey] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          ))}
        </>
      ) : (
        <>
          <h4 style={{ margin: 0, fontSize: 14 }}>Hero</h4>
          <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.title') ?? null} busy={busy} value={drafts['hero.title'] ?? ''} publishedValue={published['hero.title'] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.subtitle') ?? null} busy={busy} value={drafts['hero.subtitle'] ?? ''} publishedValue={published['hero.subtitle'] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.label') ?? null} busy={busy} value={drafts['hero.cta.label'] ?? ''} publishedValue={published['hero.cta.label'] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.cta.href') ?? null} busy={busy} value={drafts['hero.cta.href'] ?? ''} publishedValue={published['hero.cta.href'] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={grouped.hero.find((s) => s.slotKey === 'hero.image') ?? null} busy={busy} value={drafts['hero.image'] ?? ''} publishedValue={published['hero.image'] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />

          <h4 style={{ margin: 0, fontSize: 14 }}>Sections</h4>
          {grouped.sections.map((section) => (
        <div key={section.titleSlot?.slotKey ?? `section-${section.index}`} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{sectionTitle({ index: section.index, type: section.type })}</div>
          <Field slot={section.titleSlot} busy={busy} value={drafts[section.titleSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.titleSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={section.introSlot} busy={busy} value={drafts[section.introSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.introSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={section.bodySlot} busy={busy} value={drafts[section.bodySlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.bodySlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={section.ctas[0]?.labelSlot ?? null} busy={busy} value={drafts[section.ctas[0]?.labelSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.ctas[0]?.labelSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          <Field slot={section.ctas[0]?.hrefSlot ?? null} busy={busy} value={drafts[section.ctas[0]?.hrefSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.ctas[0]?.hrefSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
          {section.items.map((item) => (
            <div key={item.titleSlot?.slotKey ?? item.descriptionSlot?.slotKey ?? item.imageSlot?.slotKey ?? `item-${section.index}-${item.index}`} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{section.type === 'services' ? `Service ${item.index + 1}` : `Item ${item.index + 1}`}</div>
              <Field slot={item.titleSlot} busy={busy} value={drafts[item.titleSlot?.slotKey ?? ''] ?? ''} publishedValue={published[item.titleSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              <Field slot={item.descriptionSlot} busy={busy} value={drafts[item.descriptionSlot?.slotKey ?? ''] ?? ''} publishedValue={published[item.descriptionSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              <Field slot={item.imageSlot} busy={busy} value={drafts[item.imageSlot?.slotKey ?? ''] ?? ''} publishedValue={published[item.imageSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
            </div>
          ))}
          {section.gallery.map((entry) => (
            <div key={entry.imageSlot?.slotKey ?? entry.altSlot?.slotKey ?? `gallery-${section.index}-${entry.index}`} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Gallery image {entry.index + 1}</div>
              <Field slot={entry.imageSlot} busy={busy} value={drafts[entry.imageSlot?.slotKey ?? ''] ?? ''} publishedValue={published[entry.imageSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              <Field slot={entry.altSlot} busy={busy} value={drafts[entry.altSlot?.slotKey ?? ''] ?? ''} publishedValue={published[entry.altSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
            </div>
          ))}
          {(section.contact.emailSlot || section.contact.phoneSlot || section.contact.addressSlot) ? (
            <div style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Contact details</div>
              <Field slot={section.contact.emailSlot} busy={busy} value={drafts[section.contact.emailSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.contact.emailSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              <Field slot={section.contact.phoneSlot} busy={busy} value={drafts[section.contact.phoneSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.contact.phoneSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              <Field slot={section.contact.addressSlot} busy={busy} value={drafts[section.contact.addressSlot?.slotKey ?? ''] ?? ''} publishedValue={published[section.contact.addressSlot?.slotKey ?? ''] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
            </div>
          ) : null}
        </div>
          ))}

          {grouped.footer.length > 0 ? (
            <>
              <h4 style={{ margin: 0, fontSize: 14 }}>Footer</h4>
              {grouped.footer.map((slot) => (
                <Field key={slot.slotKey} slot={slot} busy={busy} value={drafts[slot.slotKey] ?? ''} publishedValue={published[slot.slotKey] ?? ''} onChange={handleDraftChange} onSave={saveDraft} />
              ))}
            </>
          ) : null}
        </>
      )}

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
