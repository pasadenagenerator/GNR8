import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import type { ContentSlot } from '@/gnr8/runtime/content-binding'
import { listContentOverrides, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const normalizeText = (v: unknown) => String(v ?? '').trim()
const normalizeUuid = (v: unknown) => {
  const n = normalizeText(v)
  return n && UUID_RE.test(n) ? n : null
}

async function resolveRuntimeScope(input: {
  clientId: string
  siteId: string
  agencyId: string
  requestedSiteVersionId?: string | null
}): Promise<{ runtimeSiteId: string; siteVersionId: string; activeSiteVersionId: string } | null> {
  const pool = getSuperadminPool()
  const latestRes = await pool.query<any>(
    `
    select sv.site_id::text as runtime_site_id, sv.id::text as site_version_id
    from public.sites s
    join public.organizations o on o.id = s.org_id
    join public.gnr8_runtime_site_versions sv on sv.ownership_site_id = s.id
    where s.id = $1::uuid and s.org_id = $2::uuid and s.agency_id = $3::uuid and o.organization_type = 'client'
    order by sv.version_no desc
    limit 1
    `,
    [input.siteId, input.clientId, input.agencyId],
  )
  const latest = latestRes.rows[0]
  if (!latest) return null

  const activeSiteVersionId = String(latest.site_version_id)
  if (!input.requestedSiteVersionId) {
    return { runtimeSiteId: String(latest.runtime_site_id), siteVersionId: activeSiteVersionId, activeSiteVersionId }
  }

  const scopedRes = await pool.query<any>(
    `
    select sv.site_id::text as runtime_site_id, sv.id::text as site_version_id
    from public.sites s
    join public.organizations o on o.id = s.org_id
    join public.gnr8_runtime_site_versions sv on sv.ownership_site_id = s.id
    where s.id = $1::uuid and s.org_id = $2::uuid and s.agency_id = $3::uuid and o.organization_type = 'client' and sv.id = $4::uuid
    limit 1
    `,
    [input.siteId, input.clientId, input.agencyId, input.requestedSiteVersionId],
  )
  const scoped = scopedRes.rows[0]
  if (!scoped) return null
  return { runtimeSiteId: String(scoped.runtime_site_id), siteVersionId: String(scoped.site_version_id), activeSiteVersionId }
}

function toIndexFromKey(prefix: string, slotKey: string): number | null {
  const m = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.(\\d+)`).exec(slotKey)
  if (!m) return null
  const n = Number(m[1])
  return Number.isInteger(n) ? n : null
}

export type GroupedContentSlots = {
  hero: ContentSlot[]
  sections: Array<{
    index: number
    type: string
    titleSlot: ContentSlot | null
    introSlot: ContentSlot | null
    bodySlot: ContentSlot | null
    ctas: Array<{ labelSlot: ContentSlot | null; hrefSlot: ContentSlot | null }>
    items: Array<{ index: number; titleSlot: ContentSlot | null; descriptionSlot: ContentSlot | null; imageSlot: ContentSlot | null }>
    gallery: Array<{ index: number; imageSlot: ContentSlot | null; altSlot: ContentSlot | null }>
    contact: { emailSlot: ContentSlot | null; phoneSlot: ContentSlot | null; addressSlot: ContentSlot | null; formTitleSlot: ContentSlot | null }
  }>
  footer: ContentSlot[]
}

export function groupSlots(slots: ContentSlot[]): GroupedContentSlots {
  const hero = slots.filter((slot) => slot.slotKey.startsWith('hero.'))
  const footer = slots.filter((slot) => slot.slotKey.startsWith('footer.'))
  const sectionSlots = slots.filter((slot) => slot.slotKey.startsWith('sections.'))
  const sectionMap = new Map<number, ContentSlot[]>()
  for (const slot of sectionSlots) {
    const index = toIndexFromKey('sections', slot.slotKey)
    if (index == null) continue
    const prev = sectionMap.get(index) ?? []
    prev.push(slot)
    sectionMap.set(index, prev)
  }

  const sections = [...sectionMap.entries()].sort((a, b) => a[0] - b[0]).map(([index, list]) => {
    const find = (suffix: string) => list.find((slot) => slot.slotKey === `sections.${index}.${suffix}`) ?? null
    const itemMap = new Map<number, ContentSlot[]>()
    const galleryMap = new Map<number, ContentSlot[]>()
    for (const slot of list) {
      const itemIdx = toIndexFromKey(`sections.${index}.items`, slot.slotKey)
      if (itemIdx != null) {
        itemMap.set(itemIdx, [...(itemMap.get(itemIdx) ?? []), slot])
      }
      const galleryIdx = toIndexFromKey(`sections.${index}.gallery`, slot.slotKey)
      if (galleryIdx != null) {
        galleryMap.set(galleryIdx, [...(galleryMap.get(galleryIdx) ?? []), slot])
      }
    }

    const items = [...itemMap.entries()].sort((a, b) => a[0] - b[0]).map(([itemIndex, itemSlots]) => ({
      index: itemIndex,
      titleSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.title')) ?? null,
      descriptionSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.description')) ?? null,
      imageSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.image')) ?? null,
    }))

    const gallery = [...galleryMap.entries()].sort((a, b) => a[0] - b[0]).map(([imageIndex, imageSlots]) => ({
      index: imageIndex,
      imageSlot: imageSlots.find((slot) => slot.slotKey.endsWith('.image')) ?? null,
      altSlot: imageSlots.find((slot) => slot.slotKey.endsWith('.alt')) ?? null,
    }))

    return {
      index,
      type: find('type')?.sourceText ?? 'unknown',
      titleSlot: find('heading'),
      introSlot: find('intro'),
      bodySlot: find('body'),
      ctas: [{ labelSlot: find('cta.label'), hrefSlot: find('cta.href') }],
      items,
      gallery,
      contact: {
        emailSlot: find('contact.email'),
        phoneSlot: find('contact.phone'),
        addressSlot: find('contact.address'),
        formTitleSlot: find('contact.formTitle'),
      },
    }
  })

  return { hero, sections, footer }
}

export function groupedContentLooksEmpty(grouped: GroupedContentSlots): boolean {
  return grouped.hero.length === 0 && grouped.sections.length === 0 && grouped.footer.length === 0
}

export async function GET(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return NextResponse.json({ ok: false, error: 'Invalid clientId/siteId' }, { status: 400 })

    const url = new URL(req.url)
    const agencyId = normalizeUuid(url.searchParams.get('agencyId'))
    if (!agencyId) return NextResponse.json({ ok: false, error: 'agencyId is required' }, { status: 400 })
    await requireAgencyActionContext({ action: 'view_dashboard', requestedAgencyId: agencyId })

    const requestedSiteVersionId = normalizeUuid(url.searchParams.get('siteVersionId'))
    console.info('[gnr8.content-api] CONTENT_GET_STARTED', { clientId, siteId, agencyId, requestedSiteVersionId })
    const scope = await resolveRuntimeScope({ clientId, siteId, agencyId, requestedSiteVersionId })
    if (!scope) return NextResponse.json({ ok: false, error: 'Site scope not found' }, { status: 404 })
    console.info('[gnr8.content-api] CONTENT_GET_SITE_VERSION_RESOLVED', {
      clientId,
      siteId,
      requestedSiteVersionId,
      resolvedSiteVersionId: scope.siteVersionId,
      activeSiteVersionId: scope.activeSiteVersionId,
    })

    const slots = await listContentSlots(scope.siteVersionId)
    const draftOverrides = await listContentOverrides({ siteVersionId: scope.siteVersionId, status: 'draft' })
    const publishedOverrides = await listContentOverrides({ siteVersionId: scope.siteVersionId, status: 'published' })
    console.info('[gnr8.content-api] CONTENT_GET_SLOTS_LOADED', {
      siteId: scope.runtimeSiteId,
      siteVersionId: scope.siteVersionId,
      slotCount: slots.length,
      draftOverrideCount: draftOverrides.length,
      publishedOverrideCount: publishedOverrides.length,
    })
    const pool = getSuperadminPool()
    const historyCountRes = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from public.gnr8_content_override_history
      where site_id = $1::text and site_version_id = $2::uuid
      `,
      [scope.runtimeSiteId, scope.siteVersionId],
    )
    const historyCount = Number(historyCountRes.rows[0]?.count ?? '0')
    const grouped = groupSlots(slots)
    const diagnostics: string[] = ['CONTENT_GET_STARTED', 'CONTENT_GET_SITE_VERSION_RESOLVED', 'CONTENT_GET_SLOTS_LOADED']
    if (slots.length === 0) {
      diagnostics.push('CONTENT_GET_SLOTS_EMPTY')
      console.warn('[gnr8.content-api] CONTENT_GET_SLOTS_EMPTY', {
        siteId: scope.runtimeSiteId,
        siteVersionId: scope.siteVersionId,
      })
    }
    diagnostics.push('CONTENT_GET_GROUPING_COMPLETED')
    console.info('[gnr8.content-api] CONTENT_GET_GROUPING_COMPLETED', {
      siteId: scope.runtimeSiteId,
      siteVersionId: scope.siteVersionId,
      heroCount: grouped.hero.length,
      sectionCount: grouped.sections.length,
      footerCount: grouped.footer.length,
    })
    if (!grouped.sections.length) diagnostics.push('CONTENT_SECTION_SLOTS_MISSING')
    if (groupedContentLooksEmpty(grouped) && slots.length > 0) diagnostics.push('CONTENT_GROUPING_EMPTY_WITH_FLAT_SLOTS_PRESENT')
    return NextResponse.json({
      ok: true,
      siteVersionId: scope.siteVersionId,
      activeSiteVersionId: scope.activeSiteVersionId,
      slotCount: slots.length,
      draftOverrideCount: draftOverrides.length,
      publishedOverrideCount: publishedOverrides.length,
      historyCount,
      slots,
      grouped,
      draftOverrides,
      publishedOverrides,
      diagnostics,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
