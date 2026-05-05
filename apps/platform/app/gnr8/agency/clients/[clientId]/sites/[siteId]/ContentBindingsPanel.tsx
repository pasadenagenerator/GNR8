'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { detectFieldDraftState, draftStateLabel, friendlySlotLabel, inputKindForSlot, sectionTitle, shouldUseFlatSlotFallback, type Slot } from '@/gnr8/site/content-bindings-panel-helpers'
import { getOverrideDisplayValue, getSlotOriginalDisplayValue } from '@/gnr8/site/content-override-display-value'

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
  originalValue: string
  draftValue: string | undefined
  publishedValue: string
  isDirty: boolean
  stateBadge: 'No changes' | 'Modified' | 'Same as published' | 'Same as draft'
  saveMessage: string | null
  onChange: (slotKey: string, nextValue: string) => void
  onSave: (slot: Slot) => void
}) {
  const { slot, busy, value, originalValue, draftValue, publishedValue, isDirty, stateBadge, saveMessage, onChange, onSave } = props
  if (!slot) return null
  const editable = Boolean(slot.sourceSelector)
  const lowConfidence = (slot.confidence ?? 1) < 0.6
  const state = detectFieldDraftState({ slotKey: slot.slotKey, draftValue, publishedValue })
  const stateText = draftStateLabel(state)
  const inputKind = inputKindForSlot(slot)

  return (
    <div style={{ display: 'grid', gap: 6, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <strong>{friendlySlotLabel(slot.slotKey)}</strong>
        <span style={{ color: '#64748b' }}>{stateText}</span>
        <span style={{ color: isDirty ? '#166534' : '#475569', border: `1px solid ${isDirty ? '#86efac' : '#cbd5e1'}`, borderRadius: 999, padding: '1px 7px', background: isDirty ? '#f0fdf4' : '#f8fafc' }}>{stateBadge}</span>
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
      {!isDirty ? <div style={{ fontSize: 12, color: '#64748b' }}>No changes to save</div> : null}
      {saveMessage ? <div style={{ fontSize: 12, color: '#854d0e' }}>{saveMessage}</div> : null}
      <div style={{ fontSize: 12, color: '#64748b' }}>Original: {originalValue || 'n/a'}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Published: {publishedValue || 'n/a'}</div>
      {!editable ? <div style={{ fontSize: 12, color: '#64748b' }}>Detected, but not safely editable yet.</div> : null}
      <button type='button' disabled={busy || !editable || !isDirty} onClick={() => onSave(slot)} style={{ width: 'fit-content', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
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
  const [publishedOverrides, setPublishedOverrides] = useState<Record<string, string>>({})
  const [draftValuesAtLoad, setDraftValuesAtLoad] = useState<Record<string, string>>({})
  const [publishedValuesAtLoad, setPublishedValuesAtLoad] = useState<Record<string, string>>({})
  const [originalValuesAtLoad, setOriginalValuesAtLoad] = useState<Record<string, string>>({})
  const [saveFeedbackBySlot, setSaveFeedbackBySlot] = useState<Record<string, string>>({})
  const [slotCount, setSlotCount] = useState(0)
  const [draftOverrideCount, setDraftOverrideCount] = useState(0)
  const [publishedOverrideCount, setPublishedOverrideCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'no_drafts' | 'error'>('idle')
  const [saveAllStatus, setSaveAllStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([])
  const [loadError, setLoadError] = useState<{ error: string; reasonCode?: string; diagnostics?: string[]; debug?: any } | null>(null)

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
    return editableVisibleSlots.filter((slot) => {
      const slotKey = slot.slotKey
      const currentValue = drafts[slotKey] ?? ''
      const baselineValue = draftValuesAtLoad[slotKey] ?? publishedValuesAtLoad[slotKey] ?? originalValuesAtLoad[slotKey] ?? ''
      return currentValue !== baselineValue
    })
  }, [draftValuesAtLoad, drafts, editableVisibleSlots, originalValuesAtLoad, publishedValuesAtLoad])

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

  const fetchContentPayload = useCallback(async (): Promise<any | null> => {
    return (await fetch(endpoint).then((r) => r.json()).catch(() => null)) as any
  }, [endpoint])

  const applyContentPayload = useCallback(async (payload: any): Promise<void> => {
    setLoadError(null)
    if (!payload?.ok) {
      setLoadError({
        error: typeof payload?.error === 'string' ? payload.error : 'Failed to load content.',
        reasonCode: typeof payload?.reasonCode === 'string' ? payload.reasonCode : undefined,
        diagnostics: Array.isArray(payload?.diagnostics) ? payload.diagnostics : undefined,
        debug: payload?.debug,
      })
      return
    }
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
    const slotList: Array<Slot & { draftValue?: string | null; publishedValue?: string | null }> = Array.isArray(payload.slots) ? payload.slots : []
    const draftMap: Record<string, string> = {}
    const publishBaselineMap: Record<string, string> = {}
    const publishedOverridesMap: Record<string, string> = {}
    const draftAtLoadMap: Record<string, string> = {}
    const publishedAtLoadMap: Record<string, string> = {}
    const originalAtLoadMap: Record<string, string> = {}
    const initialEditorSourceCounts = { draft: 0, published: 0, original: 0 }
    const draftOverrides: Override[] = Array.isArray(payload.draftOverrides) ? payload.draftOverrides : []
    const pubOverrides: Override[] = Array.isArray(payload.publishedOverrides) ? payload.publishedOverrides : []
    const draftOverridesBySlot = new Map(draftOverrides.map((override) => [override.slotKey, override]))
    const publishedOverridesBySlot = new Map(pubOverrides.map((override) => [override.slotKey, override]))
    for (const slot of slotList) {
      const originalValue = getSlotOriginalDisplayValue(slot)
      const draftValue = slot.draftValue ?? getOverrideDisplayValue(draftOverridesBySlot.get(slot.slotKey), slot.slotType)
      const publishedValue = slot.publishedValue ?? getOverrideDisplayValue(publishedOverridesBySlot.get(slot.slotKey), slot.slotType)
      const effectiveEditorValue = draftValue ?? publishedValue ?? originalValue

      draftMap[slot.slotKey] = effectiveEditorValue
      publishBaselineMap[slot.slotKey] = publishedValue ?? originalValue
      publishedOverridesMap[slot.slotKey] = publishedValue ?? ''
      if (draftValue !== null && draftValue !== undefined) draftAtLoadMap[slot.slotKey] = draftValue
      if (publishedValue !== null && publishedValue !== undefined) publishedAtLoadMap[slot.slotKey] = publishedValue
      originalAtLoadMap[slot.slotKey] = originalValue

      if (draftValue !== null && draftValue !== undefined) {
        initialEditorSourceCounts.draft += 1
      } else if (publishedValue !== null && publishedValue !== undefined) {
        initialEditorSourceCounts.published += 1
      } else {
        initialEditorSourceCounts.original += 1
      }
    }
    setDrafts(draftMap)
    setPublished(publishBaselineMap)
    setPublishedOverrides(publishedOverridesMap)
    setDraftValuesAtLoad(draftAtLoadMap)
    setPublishedValuesAtLoad(publishedAtLoadMap)
    setOriginalValuesAtLoad(originalAtLoadMap)
    setSaveFeedbackBySlot({})
    console.info('[gnr8.content-editor] CONTENT_EDITOR_STATE_INITIALIZED_FROM_DRAFT', {
      siteId: props.siteId,
      siteVersionId: resolvedSiteVersionId,
      slotCount: initialEditorSourceCounts.draft,
    })
    console.info('[gnr8.content-editor] CONTENT_EDITOR_STATE_INITIALIZED_FROM_PUBLISHED', {
      siteId: props.siteId,
      siteVersionId: resolvedSiteVersionId,
      slotCount: initialEditorSourceCounts.published,
    })
    console.info('[gnr8.content-editor] CONTENT_EDITOR_STATE_INITIALIZED_FROM_ORIGINAL', {
      siteId: props.siteId,
      siteVersionId: resolvedSiteVersionId,
      slotCount: initialEditorSourceCounts.original,
    })
    if (resolvedSiteVersionId) await fetchHistory(resolvedSiteVersionId)
  }, [fetchHistory, props.siteId])

  const loadContent = useCallback(async (): Promise<void> => {
    const payload = await fetchContentPayload()
    await applyContentPayload(payload)
  }, [applyContentPayload, fetchContentPayload])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  const handleDraftChange = useCallback((slotKey: string, nextValue: string) => {
    const baselineValue = draftValuesAtLoad[slotKey] ?? publishedValuesAtLoad[slotKey] ?? originalValuesAtLoad[slotKey] ?? ''
    const isDirty = nextValue !== baselineValue
    console.info(`[gnr8.content-editor] ${isDirty ? 'CONTENT_EDITOR_DIRTY_TRUE' : 'CONTENT_EDITOR_DIRTY_FALSE'}`, { siteId: props.siteId, siteVersionId, slotKey, baselineValue, nextValue })
    setSaveFeedbackBySlot((prev) => {
      if (!prev[slotKey]) return prev
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    setDrafts((p) => ({ ...p, [slotKey]: nextValue }))
  }, [draftValuesAtLoad, originalValuesAtLoad, props.siteId, publishedValuesAtLoad, siteVersionId])

  const shouldRenderFlatFallback = shouldUseFlatSlotFallback({
    groupedHeroCount: grouped.hero.length,
    groupedSectionCount: grouped.sections.length,
    slotCount: slots.length,
  })

  async function saveDraft(slot: Slot): Promise<void> {
    if (!siteVersionId) return
    const slotKey = slot.slotKey
    const currentInputValue = drafts[slotKey] ?? ''
    const newValue = currentInputValue
    const baselineValue = draftValuesAtLoad[slotKey] ?? publishedValuesAtLoad[slotKey] ?? originalValuesAtLoad[slotKey] ?? ''
    const draftAtLoad = draftValuesAtLoad[slotKey]
    const publishedAtLoad = publishedValuesAtLoad[slotKey]
    const originalValue = originalValuesAtLoad[slotKey] ?? ''
    const isDirty = newValue !== baselineValue
    console.info('[gnr8.content-editor] CONTENT_EDITOR_SAVE_VALUE_TRACE', {
      slotKey,
      originalValue,
      draftAtLoad: draftAtLoad ?? null,
      publishedAtLoad: publishedAtLoad ?? null,
      currentInputValue,
      valueBeingSent: currentInputValue,
      siteVersionId,
    })
    console.info(`[gnr8.content-editor] ${isDirty ? 'CONTENT_EDITOR_DIRTY_TRUE' : 'CONTENT_EDITOR_DIRTY_FALSE'}`, { siteId: props.siteId, siteVersionId, slotKey, baselineValue, newValue })
    if (!isDirty) {
      console.info('[gnr8.content-editor] CONTENT_EDITOR_NO_CHANGE', { siteId: props.siteId, siteVersionId, slotKey, reason: 'save_skipped_not_dirty' })
      setSaveFeedbackBySlot((prev) => ({ ...prev, [slotKey]: 'No changes detected' }))
      return
    }
    setBusy(true)
    try {
      const apiUrl = `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides`
      const oldValue = published[slot.slotKey] ?? ''
      const payloadBody = { agencyId: props.agencyId, siteVersionId, slotKey: slot.slotKey, value: currentInputValue, status: 'draft' }
      console.info('[gnr8.content-editor] CONTENT_EDITOR_DRAFT_SAVE_PAYLOAD', {
        slotKey: slot.slotKey,
        siteVersionId,
        oldValue,
        newValue,
        requestBody: payloadBody,
      })
      console.info('[gnr8.content-editor] CONTENT_EDITOR_DRAFT_SAVE_REQUESTED', { siteId: props.siteId, siteVersionId, slotKey: slot.slotKey, slotKeyCount: 1, targetApiUrl: apiUrl, payload: payloadBody })
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadBody),
      })
      const payload = (await response.json().catch(() => null)) as any
      console.info('[gnr8.content-editor] CONTENT_EDITOR_DRAFT_SAVE_RESPONSE', { siteId: props.siteId, siteVersionId, slotKey: slot.slotKey, status: response.status, responseJson: payload })
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'draft_save_failed')
      if ((payload?.persistedRowCount ?? 0) === 0) {
        console.info('[gnr8.content-editor] CONTENT_EDITOR_NO_CHANGE', { siteId: props.siteId, siteVersionId, slotKey, reason: 'persisted_row_count_zero' })
        setSaveFeedbackBySlot((prev) => ({ ...prev, [slotKey]: 'No changes detected' }))
      } else {
        setSaveFeedbackBySlot((prev) => {
          if (!prev[slotKey]) return prev
          const next = { ...prev }
          delete next[slotKey]
          return next
        })
      }
      console.info('[gnr8.content-editor] CONTENT_DRAFT_SAVE_COMPLETED', { siteId: props.siteId, siteVersionId, slotKeyCount: 1, persistedRowCount: payload?.persistedRowCount ?? 0 })
      await fetchHistory(siteVersionId)
      const refreshedPayload = await fetchContentPayload()
      const refreshedSlots = Array.isArray(refreshedPayload?.slots) ? refreshedPayload.slots : []
      const readbackSlot = refreshedSlots.find((entry: any) => entry?.slotKey === slotKey)
      const readbackDraftValue = typeof readbackSlot?.draftValue === 'string'
        ? readbackSlot.draftValue
        : readbackSlot?.draftValue == null
          ? null
          : String(readbackSlot.draftValue)
      if (readbackDraftValue !== currentInputValue) {
        console.warn('[gnr8.content-editor] CONTENT_EDITOR_SAVE_READBACK_MISMATCH', {
          slotKey,
          siteVersionId,
          currentInputValue,
          readbackDraftValue,
        })
      }
      await applyContentPayload(refreshedPayload)
    } finally {
      setBusy(false)
    }
  }

  async function saveAllDrafts(): Promise<void> {
    if (modifiedEditableSlots.length === 0 || !siteVersionId) return
    setBusy(true)
    setSaveAllStatus('idle')
    try {
      const apiUrl = `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/overrides/batch`
      const payloadBody = {
        agencyId: props.agencyId,
        siteVersionId,
        overrides: modifiedEditableSlots.map((slot) => ({
          slotKey: slot.slotKey,
          value: drafts[slot.slotKey] ?? '',
          status: 'draft',
        })),
      }
      console.info('[gnr8.content-editor] CONTENT_EDITOR_BATCH_SAVE_REQUESTED', { siteId: props.siteId, siteVersionId, slotKeyCount: modifiedEditableSlots.length, targetApiUrl: apiUrl, payload: payloadBody })
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadBody),
      })
      const payload = (await response.json().catch(() => null)) as any
      console.info('[gnr8.content-editor] CONTENT_EDITOR_BATCH_SAVE_RESPONSE', { siteId: props.siteId, siteVersionId, slotKeyCount: modifiedEditableSlots.length, status: response.status, responseJson: payload })
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'batch_save_failed')
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
      const apiUrl = `/api/gnr8/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/content/publish`
      const payloadBody = { agencyId: props.agencyId, siteVersionId }
      console.info('[gnr8.content-editor] CONTENT_EDITOR_PUBLISH_REQUESTED', { siteId: props.siteId, siteVersionId, slotKeyCount: Object.keys(drafts).length, targetApiUrl: apiUrl, payload: payloadBody })
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadBody),
      })
      const payload = (await response.json().catch(() => null)) as any
      console.info('[gnr8.content-editor] CONTENT_EDITOR_PUBLISH_RESPONSE', { siteId: props.siteId, siteVersionId, status: response.status, responseJson: payload })
      if (!response.ok || !payload?.ok) throw new Error(payload?.code ?? 'publish_failed')
      setPublished({ ...drafts })
      setPublishedOverrides({ ...drafts })
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
  const fieldState = useCallback((slotKey: string): { isDirty: boolean; stateBadge: 'No changes' | 'Modified' | 'Same as published' | 'Same as draft' } => {
    const currentValue = drafts[slotKey] ?? ''
    const draftAtLoad = draftValuesAtLoad[slotKey]
    const publishedAtLoad = publishedValuesAtLoad[slotKey]
    const originalAtLoad = originalValuesAtLoad[slotKey] ?? ''
    const baselineValue = draftAtLoad ?? publishedAtLoad ?? originalAtLoad
    const isDirty = currentValue !== baselineValue
    if (isDirty) return { isDirty: true, stateBadge: 'Modified' }
    if (draftAtLoad !== undefined && currentValue === draftAtLoad) return { isDirty: false, stateBadge: 'Same as draft' }
    if (publishedAtLoad !== undefined && currentValue === publishedAtLoad) return { isDirty: false, stateBadge: 'Same as published' }
    return { isDirty: false, stateBadge: 'No changes' }
  }, [draftValuesAtLoad, drafts, originalValuesAtLoad, publishedValuesAtLoad])

  const renderField = useCallback((slot: Slot | null, key?: string) => {
    if (!slot) return null
    const state = fieldState(slot.slotKey)
    return (
      <Field
        key={key ?? slot.slotKey}
        slot={slot}
        busy={busy}
        value={drafts[slot.slotKey] ?? ''}
        originalValue={originalValuesAtLoad[slot.slotKey] ?? ''}
        draftValue={draftValuesAtLoad[slot.slotKey]}
        publishedValue={publishedOverrides[slot.slotKey] ?? ''}
        isDirty={state.isDirty}
        stateBadge={state.stateBadge}
        saveMessage={saveFeedbackBySlot[slot.slotKey] ?? null}
        onChange={handleDraftChange}
        onSave={saveDraft}
      />
    )
  }, [busy, draftValuesAtLoad, drafts, fieldState, handleDraftChange, originalValuesAtLoad, publishedOverrides, saveFeedbackBySlot])

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Content</h3>
      <div style={{ fontSize: 12, color: '#334155', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
        <div><strong>Debug:</strong> siteVersionId={siteVersionId || 'n/a'} activeSiteVersionId={activeSiteVersionId || 'n/a'}</div>
        <div>slotCount={slotCount} draftOverrideCount={draftOverrideCount} publishedOverrideCount={publishedOverrideCount}</div>
      </div>
      {loadError ? (
        <div style={{ fontSize: 12, color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: 8, background: '#fef2f2', display: 'grid', gap: 4 }}>
          <div><strong>Content API error:</strong> {loadError.error}</div>
          <div>reasonCode={loadError.reasonCode ?? 'n/a'}</div>
          <div>diagnostics={(loadError.diagnostics ?? []).join(', ') || 'n/a'}</div>
          <div style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>debug={loadError.debug ? JSON.stringify(loadError.debug) : 'n/a'}</div>
        </div>
      ) : null}
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
          {slots.map((slot) => renderField(slot))}
        </>
      ) : (
        <>
          <h4 style={{ margin: 0, fontSize: 14 }}>Hero</h4>
          {renderField(grouped.hero.find((s) => s.slotKey === 'hero.title') ?? null, 'hero.title')}
          {renderField(grouped.hero.find((s) => s.slotKey === 'hero.subtitle') ?? null, 'hero.subtitle')}
          {renderField(grouped.hero.find((s) => s.slotKey === 'hero.cta.label') ?? null, 'hero.cta.label')}
          {renderField(grouped.hero.find((s) => s.slotKey === 'hero.cta.href') ?? null, 'hero.cta.href')}
          {renderField(grouped.hero.find((s) => s.slotKey === 'hero.image') ?? null, 'hero.image')}

          <h4 style={{ margin: 0, fontSize: 14 }}>Sections</h4>
          {grouped.sections.map((section) => (
        <div key={section.titleSlot?.slotKey ?? `section-${section.index}`} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{sectionTitle({ index: section.index, type: section.type })}</div>
          {renderField(section.titleSlot)}
          {renderField(section.introSlot)}
          {renderField(section.bodySlot)}
          {renderField(section.ctas[0]?.labelSlot ?? null)}
          {renderField(section.ctas[0]?.hrefSlot ?? null)}
          {section.items.map((item) => (
            <div key={item.titleSlot?.slotKey ?? item.descriptionSlot?.slotKey ?? item.imageSlot?.slotKey ?? `item-${section.index}-${item.index}`} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{section.type === 'services' ? `Service ${item.index + 1}` : `Item ${item.index + 1}`}</div>
              {renderField(item.titleSlot)}
              {renderField(item.descriptionSlot)}
              {renderField(item.imageSlot)}
            </div>
          ))}
          {section.gallery.map((entry) => (
            <div key={entry.imageSlot?.slotKey ?? entry.altSlot?.slotKey ?? `gallery-${section.index}-${entry.index}`} style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Gallery image {entry.index + 1}</div>
              {renderField(entry.imageSlot)}
              {renderField(entry.altSlot)}
            </div>
          ))}
          {(section.contact.emailSlot || section.contact.phoneSlot || section.contact.addressSlot) ? (
            <div style={{ display: 'grid', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Contact details</div>
              {renderField(section.contact.emailSlot)}
              {renderField(section.contact.phoneSlot)}
              {renderField(section.contact.addressSlot)}
            </div>
          ) : null}
        </div>
          ))}

          {grouped.footer.length > 0 ? (
            <>
              <h4 style={{ margin: 0, fontSize: 14 }}>Footer</h4>
              {grouped.footer.map((slot) => (
                renderField(slot)
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
