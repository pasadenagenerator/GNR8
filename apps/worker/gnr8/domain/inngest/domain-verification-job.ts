import {
  type DomainActivatedPayload,
  type DomainVerificationCheckPayload,
  DOMAIN_ACTIVATED_EVENT,
  DOMAIN_VERIFICATION_CHECK_EVENT,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'
import {
  classifyDomainType,
  computeDomainDnsInstructions,
  type DomainDnsInstruction,
  type DomainDnsRecordPurpose,
  type DomainDnsRecordType,
  type DomainType,
} from '@/src/lib/vercel/domain-dns-instructions'
import { checkDomainStatus } from '@/src/lib/vercel/vercel-domain-client'
import { getSuperadminPool } from '@/src/superadmin/db'

export const DOMAIN_VERIFICATION_CHECK_JOB_ID = 'domain-verification-check-job'
export const DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT = DOMAIN_VERIFICATION_CHECK_EVENT
export const DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID = 'domain-verification-check-scheduler-job'
export const DOMAIN_VERIFICATION_CHECK_SCHEDULE_CRON = '*/3 * * * *'
export const DOMAIN_VERIFICATION_MAX_BINDINGS_PER_RUN = 50
export const DOMAIN_VERIFICATION_INTER_CALL_DELAY_MS = 150

export type RuntimeDomainHostBindingStatus = 'pending' | 'verifying' | 'active' | 'failed'
export type RuntimeDomainVerificationType = 'cname' | 'txt'
export type RuntimeDomainType = DomainType

export type RuntimeDomainHostBinding = {
  id: string
  siteId: string
  siteVersionId: string
  domain: string
  status: RuntimeDomainHostBindingStatus
  domainType: RuntimeDomainType | null
  verificationType: RuntimeDomainVerificationType | null
  verificationValue: string | null
  verificationHost: string | null
  dnsRecordType: DomainDnsRecordType | null
  dnsRecordHost: string | null
  dnsRecordValue: string | null
  dnsRecordPurpose: DomainDnsRecordPurpose | null
  dnsInstructions: DomainDnsInstruction[] | null
  lastCheckedAt: string | null
  vercelDomainId: string | null
}

function parseDnsInstructions(value: unknown): DomainDnsInstruction[] | null {
  if (!Array.isArray(value)) return null
  const out: DomainDnsInstruction[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    const type = String(record.type ?? '').trim().toLowerCase()
    const host = String(record.host ?? '').trim()
    const recordValue = String(record.value ?? '').trim()
    const purpose = String(record.purpose ?? '').trim().toLowerCase()
    const source = String(record.source ?? '').trim().toLowerCase()
    if (!(type === 'a' || type === 'cname' || type === 'txt')) continue
    if (!(purpose === 'verification' || purpose === 'routing')) continue
    if (!(source === 'vercel' || source === 'inferred')) continue
    if (!host || !recordValue) continue
    out.push({
      type,
      host,
      value: recordValue,
      purpose,
      source,
    })
  }
  return out.length > 0 ? out : null
}

async function listDomainHostBindingsForVerification(input: {
  statuses: RuntimeDomainHostBindingStatus[]
  limit: number
}): Promise<RuntimeDomainHostBinding[]> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<{
      id: string
      site_id: string
      site_version_id: string
      domain: string
      status: RuntimeDomainHostBindingStatus
      domain_type: RuntimeDomainType | null
      verification_type: RuntimeDomainVerificationType | null
      verification_value: string | null
      verification_host: string | null
      dns_record_type: DomainDnsRecordType | null
      dns_record_host: string | null
      dns_record_value: string | null
      dns_record_purpose: DomainDnsRecordPurpose | null
      dns_instructions_json: unknown
      last_checked_at: string | null
      vercel_domain_id: string | null
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id
      from public.gnr8_runtime_domain_host_bindings
      where status = any($1::text[])
      order by coalesce(last_checked_at, created_at) asc, updated_at asc
      limit $2::int
      `,
      [input.statuses, input.limit],
    )
    return result.rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
    }))
  } finally {
    client.release()
  }
}

async function updateDomainHostBindingById(input: {
  bindingId: string
  status: RuntimeDomainHostBindingStatus
  domainType?: RuntimeDomainType | null
  verificationType?: RuntimeDomainVerificationType | null
  verificationValue?: string | null
  verificationHost?: string | null
  dnsRecordType?: DomainDnsRecordType | null
  dnsRecordHost?: string | null
  dnsRecordValue?: string | null
  dnsRecordPurpose?: DomainDnsRecordPurpose | null
  dnsInstructions?: DomainDnsInstruction[] | null
  lastCheckedAt?: string | null
  vercelDomainId?: string | null
}): Promise<RuntimeDomainHostBinding | null> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<{
      id: string
      site_id: string
      site_version_id: string
      domain: string
      status: RuntimeDomainHostBindingStatus
      domain_type: RuntimeDomainType | null
      verification_type: RuntimeDomainVerificationType | null
      verification_value: string | null
      verification_host: string | null
      dns_record_type: DomainDnsRecordType | null
      dns_record_host: string | null
      dns_record_value: string | null
      dns_record_purpose: DomainDnsRecordPurpose | null
      dns_instructions_json: unknown
      last_checked_at: string | null
      vercel_domain_id: string | null
    }>(
      `
      update public.gnr8_runtime_domain_host_bindings
      set
        status = $2::text,
        domain_type = coalesce($3::text, domain_type),
        verification_type = coalesce($4::text, verification_type),
        verification_value = coalesce($5::text, verification_value),
        verification_host = coalesce($6::text, verification_host),
        dns_record_type = coalesce($7::text, dns_record_type),
        dns_record_host = coalesce($8::text, dns_record_host),
        dns_record_value = coalesce($9::text, dns_record_value),
        dns_record_purpose = coalesce($10::text, dns_record_purpose),
        dns_instructions_json = coalesce($11::jsonb, dns_instructions_json),
        last_checked_at = coalesce($12::timestamptz, last_checked_at),
        vercel_domain_id = coalesce($13::text, vercel_domain_id),
        updated_at = now()
      where id = $1::uuid
      returning
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id
      `,
      [
        input.bindingId,
        input.status,
        input.domainType ?? null,
        input.verificationType ?? null,
        input.verificationValue ?? null,
        input.verificationHost ?? null,
        input.dnsRecordType ?? null,
        input.dnsRecordHost ?? null,
        input.dnsRecordValue ?? null,
        input.dnsRecordPurpose ?? null,
        input.dnsInstructions ? JSON.stringify(input.dnsInstructions) : null,
        input.lastCheckedAt ?? null,
        input.vercelDomainId ?? null,
      ],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
    }
  } finally {
    client.release()
  }
}

type DomainVerificationCheckJobDeps = {
  listDomainHostBindingsForVerification: typeof listDomainHostBindingsForVerification
  checkDomainStatus: typeof checkDomainStatus
  updateDomainHostBindingById: typeof updateDomainHostBindingById
  send: (event: { name: string; data: DomainActivatedPayload | DomainVerificationCheckPayload }) => Promise<unknown>
  now: () => Date
  sleep: (ms: number) => Promise<void>
}

const DEFAULT_DEPS: DomainVerificationCheckJobDeps = {
  listDomainHostBindingsForVerification,
  checkDomainStatus,
  updateDomainHostBindingById,
  send: (event) => inngest.send(event),
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function parsePayload(value: unknown): DomainVerificationCheckPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const source = normalizeText(record.source)
  const requestedAt = normalizeText(record.requestedAt)
  return {
    source: source === 'schedule' || source === 'manual' || source === 'publish' ? source : undefined,
    requestedAt: requestedAt || undefined,
  }
}

function resolveNextStatus(input: {
  binding: RuntimeDomainHostBinding
  verified: boolean
  verificationPresent: boolean
  unsupportedWildcard: boolean
}): RuntimeDomainHostBindingStatus {
  if (input.unsupportedWildcard) return 'failed'
  if (input.verified) return 'active'
  if (input.verificationPresent) return 'verifying'
  return 'failed'
}

export type DomainVerificationCheckJobResult = {
  checkedCount: number
  activeCount: number
  verifyingCount: number
  failedCount: number
  activatedEventCount: number
}

export async function runDomainVerificationCheckJob(input: {
  eventData: unknown
  maxBindings?: number
  deps?: Partial<DomainVerificationCheckJobDeps>
}): Promise<DomainVerificationCheckJobResult> {
  const deps = {
    ...DEFAULT_DEPS,
    ...(input.deps ?? {}),
  }

  const payload = parsePayload(input.eventData)
  const startedAt = deps.now().toISOString()
  const maxBindings = Math.max(1, Math.min(50, Number(input.maxBindings ?? DOMAIN_VERIFICATION_MAX_BINDINGS_PER_RUN) || DOMAIN_VERIFICATION_MAX_BINDINGS_PER_RUN))
  const bindings = await deps.listDomainHostBindingsForVerification({
    statuses: ['pending', 'verifying'],
    limit: maxBindings,
  })

  console.info('[domain-verification-worker] DOMAIN_VERIFICATION_CHECK_STARTED', {
    startedAt,
    source: payload.source ?? 'schedule',
    requestedAt: payload.requestedAt ?? null,
    candidateCount: bindings.length,
    maxBindings,
  })

  let activeCount = 0
  let verifyingCount = 0
  let failedCount = 0
  let activatedEventCount = 0

  for (const [index, binding] of bindings.entries()) {
    if (index > 0) {
      await deps.sleep(DOMAIN_VERIFICATION_INTER_CALL_DELAY_MS)
    }

    try {
      const classified = classifyDomainType(binding.domain)
      console.info('[domain-verification-worker] DOMAIN_TYPE_CLASSIFIED', {
        bindingId: binding.id,
        domain: binding.domain,
        siteId: binding.siteId,
        siteVersionId: binding.siteVersionId,
        domainType: classified,
      })
      if (classified === 'wildcard_domain') {
        await deps.updateDomainHostBindingById({
          bindingId: binding.id,
          status: 'failed',
          domainType: classified,
          lastCheckedAt: deps.now().toISOString(),
        })
        failedCount += 1
        console.warn('[domain-verification-worker] DNS_WILDCARD_UNSUPPORTED', {
          bindingId: binding.id,
          domain: binding.domain,
          siteId: binding.siteId,
          siteVersionId: binding.siteVersionId,
        })
        continue
      }

      const vercelStatus = await deps.checkDomainStatus(binding.domain)
      const dnsComputation = computeDomainDnsInstructions({
        domain: binding.domain,
        vercelStatus,
      })
      for (const diagnostic of dnsComputation.diagnostics.filter((code) => code !== 'DOMAIN_TYPE_CLASSIFIED')) {
        console.info(`[domain-verification-worker] ${diagnostic}`, {
          bindingId: binding.id,
          domain: binding.domain,
          siteId: binding.siteId,
          siteVersionId: binding.siteVersionId,
        })
      }
      const nextStatus = resolveNextStatus({
        binding,
        verified: vercelStatus.verified,
        verificationPresent: Boolean(dnsComputation.verificationInstruction),
        unsupportedWildcard: dnsComputation.unsupportedWildcard,
      })
      const updated = await deps.updateDomainHostBindingById({
        bindingId: binding.id,
        status: nextStatus,
        domainType: dnsComputation.domainType,
        verificationType:
          dnsComputation.verificationInstruction?.type === 'cname' || dnsComputation.verificationInstruction?.type === 'txt'
            ? dnsComputation.verificationInstruction.type
            : binding.verificationType,
        verificationValue: dnsComputation.verificationInstruction?.value ?? binding.verificationValue,
        verificationHost: dnsComputation.verificationInstruction?.host ?? binding.verificationHost,
        dnsRecordType: dnsComputation.primaryInstruction?.type ?? binding.dnsRecordType,
        dnsRecordHost: dnsComputation.primaryInstruction?.host ?? binding.dnsRecordHost,
        dnsRecordValue: dnsComputation.primaryInstruction?.value ?? binding.dnsRecordValue,
        dnsRecordPurpose: dnsComputation.primaryInstruction?.purpose ?? binding.dnsRecordPurpose,
        dnsInstructions: dnsComputation.instructions.length > 0 ? dnsComputation.instructions : binding.dnsInstructions,
        vercelDomainId: vercelStatus.domainId ?? binding.vercelDomainId,
        lastCheckedAt: vercelStatus.lastCheckedAt,
      })

      if (nextStatus === 'active') {
        activeCount += 1
        console.info('[domain-verification-worker] DOMAIN_BECAME_ACTIVE', {
          bindingId: binding.id,
          domain: binding.domain,
          previousStatus: binding.status,
          siteId: binding.siteId,
          siteVersionId: updated?.siteVersionId ?? binding.siteVersionId,
          vercelDomainId: vercelStatus.domainId ?? binding.vercelDomainId ?? null,
        })

        if (binding.status !== 'active' && updated) {
          await deps.send({
            name: DOMAIN_ACTIVATED_EVENT,
            data: {
              bindingId: binding.id,
              siteId: binding.siteId,
              siteVersionId: updated.siteVersionId,
              domain: binding.domain,
              previousStatus: binding.status,
              activatedAt: vercelStatus.lastCheckedAt,
              vercelDomainId: vercelStatus.domainId ?? binding.vercelDomainId ?? null,
            },
          })
          activatedEventCount += 1
        }
      } else if (nextStatus === 'verifying') {
        verifyingCount += 1
        console.info('[domain-verification-worker] DOMAIN_STILL_VERIFYING', {
          bindingId: binding.id,
          domain: binding.domain,
          siteId: binding.siteId,
          siteVersionId: binding.siteVersionId,
          verificationType: dnsComputation.verificationInstruction?.type ?? null,
          verificationHost: dnsComputation.verificationInstruction?.host ?? null,
        })
      } else {
        failedCount += 1
        console.warn('[domain-verification-worker] DOMAIN_VERIFICATION_FAILED', {
          bindingId: binding.id,
          domain: binding.domain,
          siteId: binding.siteId,
          siteVersionId: binding.siteVersionId,
          reason: 'verification_missing',
        })
      }
    } catch (error) {
      failedCount += 1
      const failedAt = deps.now().toISOString()
      await deps.updateDomainHostBindingById({
        bindingId: binding.id,
        status: 'failed',
        lastCheckedAt: failedAt,
      }).catch(() => null)
      console.error('[domain-verification-worker] DOMAIN_VERIFICATION_FAILED', {
        bindingId: binding.id,
        domain: binding.domain,
        siteId: binding.siteId,
        siteVersionId: binding.siteVersionId,
        error: error instanceof Error ? error.message : 'domain_status_check_failed',
      })
    }
  }

  const completedAt = deps.now().toISOString()
  const result = {
    checkedCount: bindings.length,
    activeCount,
    verifyingCount,
    failedCount,
    activatedEventCount,
  }
  console.info('[domain-verification-worker] DOMAIN_VERIFICATION_CHECK_COMPLETED', {
    startedAt,
    completedAt,
    ...result,
  })
  return result
}

export const domainVerificationCheckSchedulerJob = inngest.createFunction(
  {
    id: DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID,
    retries: 0,
  },
  {
    cron: DOMAIN_VERIFICATION_CHECK_SCHEDULE_CRON,
  },
  async () => {
    const requestedAt = new Date().toISOString()
    await inngest.send({
      name: DOMAIN_VERIFICATION_CHECK_EVENT,
      data: {
        source: 'schedule',
        requestedAt,
      } satisfies DomainVerificationCheckPayload,
    })
  },
)

export const domainVerificationCheckJob = inngest.createFunction(
  {
    id: DOMAIN_VERIFICATION_CHECK_JOB_ID,
    retries: 1,
  },
  {
    event: DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT,
  },
  async ({ event }) => {
    return await runDomainVerificationCheckJob({
      eventData: event.data,
      maxBindings: DOMAIN_VERIFICATION_MAX_BINDINGS_PER_RUN,
    })
  },
)
