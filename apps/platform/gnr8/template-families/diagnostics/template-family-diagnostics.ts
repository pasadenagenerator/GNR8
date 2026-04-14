export type TemplateFamilyDiagnosticCode =
  | 'TEMPLATE_FAMILY_EXTRACTION_STARTED'
  | 'TEMPLATE_FAMILY_SIGNATURE_COMPUTED'
  | 'TEMPLATE_FAMILY_CREATED'
  | 'TEMPLATE_FAMILY_SINGLETON_CREATED'
  | 'TEMPLATE_FAMILY_MIXED_CREATED'
  | 'TEMPLATE_FAMILY_ROUTE_ASSIGNED'
  | 'TEMPLATE_FAMILY_ROUTE_UNASSIGNED'
  | 'TEMPLATE_FAMILY_KIND_CLASSIFIED'
  | 'TEMPLATE_FAMILY_RELATIONSHIP_INFERRED'
  | 'TEMPLATE_FAMILY_SHARED_REGION_USED'
  | 'TEMPLATE_FAMILY_ROUTE_PATTERN_ABSTRACTED'
  | 'TEMPLATE_FAMILY_CONFIDENCE_LOW'
  | 'TEMPLATE_FAMILY_EXTRACTION_DEGRADED'
  | 'TEMPLATE_FAMILY_EXTRACTION_COMPLETED'

function cleanPart(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function templateFamilyDiagnosticEntry(code: TemplateFamilyDiagnosticCode, detail?: string | null): string {
  const normalized = cleanPart(detail)
  return normalized ? `${code}:${normalized}` : code
}

export function sortTemplateFamilyDiagnostics(diagnostics: string[]): string[] {
  return [...new Set(diagnostics.map((entry) => cleanPart(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
