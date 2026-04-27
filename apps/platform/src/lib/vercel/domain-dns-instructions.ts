import type { VercelDomainStatus } from '@/src/lib/vercel/vercel-domain-client'

export type DomainType = 'apex_domain' | 'subdomain' | 'wildcard_domain' | 'unknown'
export type DomainDnsRecordType = 'a' | 'cname' | 'txt'
export type DomainDnsRecordPurpose = 'verification' | 'routing'
export type DomainDnsInstructionSource = 'vercel' | 'inferred'

export type DomainDnsInstruction = {
  type: DomainDnsRecordType
  host: string
  value: string
  purpose: DomainDnsRecordPurpose
  source: DomainDnsInstructionSource
}

export type DomainDnsComputation = {
  normalizedDomain: string
  domainType: DomainType
  unsupportedWildcard: boolean
  verificationInstruction: DomainDnsInstruction | null
  routingInstruction: DomainDnsInstruction | null
  instructions: DomainDnsInstruction[]
  primaryInstruction: DomainDnsInstruction | null
  diagnostics: string[]
}

const HOST_RE = /^(?:[a-z0-9*](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeDomainForDns(value: unknown): string {
  const raw = normalizeText(value).toLowerCase()
  if (!raw) return ''
  const withoutProtocol = raw.replace(/^https?:\/\//, '')
  const authority = withoutProtocol.split('/')[0] ?? ''
  const host = (authority.split(':')[0] ?? '').replace(/\.+$/, '').trim()
  if (!host) return ''

  if (host.startsWith('*.')) {
    const tail = host.slice(2)
    if (!tail || !HOST_RE.test(tail)) return ''
    return `*.${tail}`
  }

  if (!HOST_RE.test(host)) return ''
  return host
}

export function classifyDomainType(domain: string): DomainType {
  const normalized = normalizeDomainForDns(domain)
  if (!normalized) return 'unknown'
  if (normalized.startsWith('*.')) return 'wildcard_domain'
  const labels = normalized.split('.').filter(Boolean)
  if (labels.length < 2) return 'unknown'
  if (labels.length === 2) return 'apex_domain'
  return 'subdomain'
}

function inferRootDomain(normalizedDomain: string): string {
  const plain = normalizedDomain.startsWith('*.') ? normalizedDomain.slice(2) : normalizedDomain
  const labels = plain.split('.').filter(Boolean)
  if (labels.length <= 2) return plain
  return labels.slice(-2).join('.')
}

function toRelativeHost(recordDomain: string, rootDomain: string): string {
  const normalizedRecord = normalizeDomainForDns(recordDomain)
  const normalizedRoot = normalizeDomainForDns(rootDomain)
  if (!normalizedRecord || !normalizedRoot) return normalizedRecord || '@'
  if (normalizedRecord === normalizedRoot) return '@'
  if (normalizedRecord.endsWith(`.${normalizedRoot}`)) {
    const candidate = normalizedRecord.slice(0, -(normalizedRoot.length + 1)).trim()
    return candidate || '@'
  }
  return normalizedRecord
}

function inferRoutingInstruction(input: {
  normalizedDomain: string
  domainType: DomainType
}): DomainDnsInstruction | null {
  if (input.domainType === 'subdomain') {
    const rootDomain = inferRootDomain(input.normalizedDomain)
    const host = toRelativeHost(input.normalizedDomain, rootDomain)
    return {
      type: 'cname',
      host,
      value: 'cname.vercel-dns.com',
      purpose: 'routing',
      source: 'inferred',
    }
  }

  if (input.domainType === 'apex_domain') {
    return {
      type: 'a',
      host: '@',
      value: '76.76.21.21',
      purpose: 'routing',
      source: 'inferred',
    }
  }

  return null
}

function toInstruction(input: {
  record: { type: DomainDnsRecordType; host: string; value: string }
  purpose: DomainDnsRecordPurpose
  source: DomainDnsInstructionSource
}): DomainDnsInstruction {
  return {
    type: input.record.type,
    host: normalizeText(input.record.host) || '@',
    value: normalizeText(input.record.value),
    purpose: input.purpose,
    source: input.source,
  }
}

function dedupeInstructions(records: DomainDnsInstruction[]): DomainDnsInstruction[] {
  const seen = new Set<string>()
  const out: DomainDnsInstruction[] = []
  for (const record of records) {
    const key = `${record.type}:${record.host}:${record.value}:${record.purpose}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(record)
  }
  return out
}

export function computeDomainDnsInstructions(input: {
  domain: string
  vercelStatus?: Pick<VercelDomainStatus, 'verification' | 'routing'> | null
}): DomainDnsComputation {
  const normalizedDomain = normalizeDomainForDns(input.domain)
  const domainType = classifyDomainType(normalizedDomain)
  const diagnostics: string[] = ['DOMAIN_TYPE_CLASSIFIED']

  if (domainType === 'wildcard_domain') {
    diagnostics.push('DNS_WILDCARD_UNSUPPORTED')
    return {
      normalizedDomain,
      domainType,
      unsupportedWildcard: true,
      verificationInstruction: null,
      routingInstruction: null,
      instructions: [],
      primaryInstruction: null,
      diagnostics,
    }
  }

  const verification = input.vercelStatus?.verification
    ? toInstruction({
        record: {
          type: input.vercelStatus.verification.type,
          host: input.vercelStatus.verification.host,
          value: input.vercelStatus.verification.value,
        },
        purpose: 'verification',
        source: 'vercel',
      })
    : null

  const routingFromVercel = input.vercelStatus?.routing
    ? toInstruction({
        record: {
          type: input.vercelStatus.routing.type,
          host: input.vercelStatus.routing.host,
          value: input.vercelStatus.routing.value,
        },
        purpose: 'routing',
        source: 'vercel',
      })
    : null

  const inferredRouting = routingFromVercel ? null : inferRoutingInstruction({ normalizedDomain, domainType })
  const routing = routingFromVercel ?? inferredRouting

  if (verification || routingFromVercel) diagnostics.push('DNS_INSTRUCTIONS_FROM_VERCEL')
  if (inferredRouting) diagnostics.push('DNS_INSTRUCTIONS_INFERRED')

  const instructions: DomainDnsInstruction[] = []
  if (verification) {
    instructions.push(verification)
    diagnostics.push('DNS_VERIFICATION_RECORD_REQUIRED')
    if (verification.type === 'txt' && routing) {
      instructions.push(routing)
      diagnostics.push('DNS_ROUTING_RECORD_REQUIRED')
    }
  } else if (routing) {
    instructions.push(routing)
    diagnostics.push('DNS_ROUTING_RECORD_REQUIRED')
  }

  const deduped = dedupeInstructions(instructions)
  if (deduped.length > 0) diagnostics.push('DNS_INSTRUCTIONS_COMPUTED')

  return {
    normalizedDomain,
    domainType,
    unsupportedWildcard: false,
    verificationInstruction: verification,
    routingInstruction: routing,
    instructions: deduped,
    primaryInstruction: deduped[0] ?? null,
    diagnostics,
  }
}
