import type { SiteTreeDiagnostic, SiteTreeDiagnosticCode, SiteTreeDiagnosticSeverity } from '@/gnr8/site-tree/types/site-tree-types'

export function createSiteTreeDiagnostic(input: {
  code: SiteTreeDiagnosticCode | string
  message: string
  severity?: SiteTreeDiagnosticSeverity
  metadata?: Record<string, unknown>
}): SiteTreeDiagnostic {
  return {
    code: input.code,
    severity: input.severity ?? 'info',
    message: input.message,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

export function sortSiteTreeDiagnostics(diagnostics: SiteTreeDiagnostic[]): SiteTreeDiagnostic[] {
  return diagnostics.slice().sort((left, right) => {
    const codeDelta = String(left.code).localeCompare(String(right.code))
    if (codeDelta !== 0) return codeDelta
    const severityDelta = left.severity.localeCompare(right.severity)
    if (severityDelta !== 0) return severityDelta
    const messageDelta = left.message.localeCompare(right.message)
    if (messageDelta !== 0) return messageDelta
    const leftMeta = JSON.stringify(left.metadata ?? {})
    const rightMeta = JSON.stringify(right.metadata ?? {})
    return leftMeta.localeCompare(rightMeta)
  })
}
