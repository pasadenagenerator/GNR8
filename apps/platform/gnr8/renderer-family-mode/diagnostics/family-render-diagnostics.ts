import type { FamilyRenderDiagnostics } from '@/gnr8/renderer-family-mode/types/family-render-types'

export function createFamilyRenderDiagnostic(input: {
  code: FamilyRenderDiagnostics['code']
  detail: string
  severity?: FamilyRenderDiagnostics['severity']
  familyId?: string | null
  pageId?: string | null
  metadata?: Record<string, unknown>
}): FamilyRenderDiagnostics {
  return {
    code: input.code,
    detail: input.detail,
    severity: input.severity ?? 'info',
    ...(input.familyId !== undefined ? { familyId: input.familyId } : {}),
    ...(input.pageId !== undefined ? { pageId: input.pageId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

export function sortFamilyRenderDiagnostics(input: FamilyRenderDiagnostics[]): FamilyRenderDiagnostics[] {
  return [...input]
    .filter((entry) => String(entry.code).trim().length > 0)
    .sort((left, right) => {
      const codeDelta = String(left.code).localeCompare(String(right.code))
      if (codeDelta !== 0) return codeDelta
      const severityDelta = String(left.severity).localeCompare(String(right.severity))
      if (severityDelta !== 0) return severityDelta
      const familyDelta = String(left.familyId ?? '').localeCompare(String(right.familyId ?? ''))
      if (familyDelta !== 0) return familyDelta
      const pageDelta = String(left.pageId ?? '').localeCompare(String(right.pageId ?? ''))
      if (pageDelta !== 0) return pageDelta
      const detailDelta = String(left.detail).localeCompare(String(right.detail))
      if (detailDelta !== 0) return detailDelta
      return JSON.stringify(left.metadata ?? {}).localeCompare(JSON.stringify(right.metadata ?? {}))
    })
}

export function dedupeAndSortFamilyRenderDiagnostics(input: FamilyRenderDiagnostics[]): FamilyRenderDiagnostics[] {
  const seen = new Set<string>()
  const deduped: FamilyRenderDiagnostics[] = []
  for (const entry of sortFamilyRenderDiagnostics(input)) {
    const key = `${entry.code}|${entry.severity}|${entry.familyId ?? ''}|${entry.pageId ?? ''}|${entry.detail}|${JSON.stringify(entry.metadata ?? {})}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(entry)
  }
  return deduped
}

export function diagnosticsCodes(input: FamilyRenderDiagnostics[]): string[] {
  return [...new Set(input.map((entry) => String(entry.code).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
