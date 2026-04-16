const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeSiteName(value: unknown): string {
  return normalizeText(value)
}

export function normalizeDomain(value: unknown): string {
  const trimmed = normalizeText(value).toLowerCase()
  if (!trimmed) return ''

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '')
  return withoutProtocol.replace(/\/+$/, '')
}

export function isReasonableDomain(value: string): boolean {
  const normalized = normalizeDomain(value)
  if (!normalized) return false
  if (normalized.length > 253) return false
  if (normalized.includes('/') || normalized.includes(' ') || normalized.includes('://')) return false

  const labels = normalized.split('.')
  if (labels.some((label) => label.length === 0 || label.length > 63)) return false
  for (const label of labels) {
    if (!/^[a-z0-9-]+$/.test(label)) return false
    if (label.startsWith('-') || label.endsWith('-')) return false
  }
  return true
}

export type CreateSiteFromTemplateInput = {
  templateId: string
  name: string
  domain: string
}

export function parseCreateSiteFromTemplatePayload(
  payload: unknown,
): { ok: true; value: CreateSiteFromTemplateInput } | { ok: false; error: string } {
  if (!isPlainRecord(payload)) {
    return { ok: false, error: 'Request payload must be a JSON object.' }
  }

  const templateId = normalizeText(payload.templateId)
  const name = normalizeSiteName(payload.name)
  const domain = normalizeDomain(payload.domain)

  if (!templateId) return { ok: false, error: 'templateId is required.' }
  if (!UUID_RE.test(templateId)) return { ok: false, error: 'templateId must be a valid UUID.' }
  if (!name) return { ok: false, error: 'name is required.' }
  if (!domain) return { ok: false, error: 'domain is required.' }
  if (!isReasonableDomain(domain)) return { ok: false, error: 'domain must be a valid hostname.' }

  return {
    ok: true,
    value: {
      templateId,
      name,
      domain,
    },
  }
}
