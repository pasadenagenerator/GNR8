import { DomainError, NotFoundError } from '../../service-contract'
import type { SuperadminTrialRepository } from './repository'
import type {
  SuperadminTrialBody,
  UpdateOrgTrialInput,
  UpdateOrgTrialOutput,
} from './types'

function parseIsoOrNull(value: unknown, field: string): string | null {
  if (value === null) return null
  if (value === undefined) return null
  const s = String(value)
  const ms = new Date(s).getTime()
  if (Number.isNaN(ms)) {
    throw new DomainError(`${field} must be a valid ISO date string or null`)
  }
  return s
}

function parsePositiveDays(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new DomainError('days must be a positive number')
  }
  return Math.trunc(n)
}

export class SuperadminTrialService {
  constructor(private readonly repo: SuperadminTrialRepository) {}

  async updateOrgTrial(input: UpdateOrgTrialInput): Promise<UpdateOrgTrialOutput> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    const body: SuperadminTrialBody = (input.body ?? {}) as any

    // Variant A: direct set (trialEndsAt present)
    if (body && typeof body === 'object' && 'trialEndsAt' in body) {
      const trialEndsAt = parseIsoOrNull((body as any).trialEndsAt, 'trialEndsAt')
      const trialStartedAt = 'trialStartedAt' in body
        ? parseIsoOrNull((body as any).trialStartedAt, 'trialStartedAt')
        : null

      const row = await this.repo.setTrialWindow({ orgId, trialEndsAt, trialStartedAt })
      if (!row) throw new NotFoundError('Org not found')

      return { org: mapOrg(row) }
    }

    // Variant B: action
    const action = (body as any)?.action ?? null
    if (action !== 'start' && action !== 'extend' && action !== 'end') {
      throw new DomainError('Missing action (start|extend|end) or trialEndsAt')
    }

    if (action === 'end') {
      const row = await this.repo.endTrial({ orgId })
      if (!row) throw new NotFoundError('Org not found')
      return { org: mapOrg(row) }
    }

    const days = parsePositiveDays((body as any)?.days, 14)

    const row =
      action === 'start'
        ? await this.repo.startTrial({ orgId, days })
        : await this.repo.extendTrial({ orgId, days })

    if (!row) throw new NotFoundError('Org not found')
    return { org: mapOrg(row) }
  }
}

function mapOrg(row: {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}) {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: row.slug ? String(row.slug) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    trialStartedAt: row.trial_started_at ? String(row.trial_started_at) : null,
    trialEndsAt: row.trial_ends_at ? String(row.trial_ends_at) : null,
  }
}