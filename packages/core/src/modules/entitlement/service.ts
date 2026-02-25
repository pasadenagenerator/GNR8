import { DomainError } from '../../service-contract'
import type { BillingTx } from '../billing/repository'
import type { EntitlementRepository } from './repository'
import type { EntitlementKey, SyncSubscriptionInput } from './types'
import { PLAN_ENTITLEMENTS } from './plan-map'

type TrialWindow = {
  trialStartedAt: string | null
  trialEndsAt: string | null
}

export type OrgAccessState = {
  orgId: string
  trial: {
    startedAt: string | null
    endsAt: string | null
    isActive: boolean
    isExpired: boolean
  }
}

export class EntitlementService {
  constructor(private readonly entitlementRepository: EntitlementRepository) {}

  /**
   * Trial fallback entitlements (če ni aktivne subscription / paid entitlements).
   * Namen: omogoči osnovno uporabo platforme med trialom.
   *
   * Opomba: limit (npr. max 1 projekt) že enforce-a ProjectService.
   */
  private readonly TRIAL_ENTITLEMENTS: ReadonlySet<EntitlementKey> = new Set([
    'organization.read',
    'project.create',
    // keep minimal; po potrebi dodamo kasneje
  ])

  /**
   * Uporabno za UI (/admin stats, banner, disable akcij).
   */
  async getOrgAccessState(orgId: string): Promise<OrgAccessState> {
    const cleanOrgId = String(orgId ?? '').trim()
    if (!cleanOrgId) throw new DomainError('orgId is required')

    const window = await this.entitlementRepository.getOrgTrialWindow({
      orgId: cleanOrgId,
    })

    const trial = this.computeTrial(window)

    return {
      orgId: cleanOrgId,
      trial: {
        startedAt: window?.trialStartedAt ?? null,
        endsAt: window?.trialEndsAt ?? null,
        isActive: trial.isActive,
        isExpired: trial.isExpired,
      },
    }
  }

  // HARD GATE (READ-only)
  async assert(orgId: string, entitlementKey: EntitlementKey): Promise<void> {
    const cleanOrgId = String(orgId ?? '').trim()
    if (!cleanOrgId) throw new DomainError('orgId is required')

    // 1) Paid entitlements (canonical)
    const hasPaid = await this.entitlementRepository.hasActiveEntitlement({
      orgId: cleanOrgId,
      entitlementKey,
    })
    if (hasPaid) return

    // 2) Trial fallback (če ni paid)
    const window = await this.entitlementRepository.getOrgTrialWindow({
      orgId: cleanOrgId,
    })
    const trial = this.computeTrial(window)

    if (trial.isActive && this.TRIAL_ENTITLEMENTS.has(entitlementKey)) {
      return
    }

    // Če trial obstaja, ampak je potekel, vrnemo bolj jasen error.
    // To je pomembno za “enforcement” UX (UI lahko pokaže banner, CTA, itd.).
    if (trial.isExpired) {
      throw new DomainError('Trial expired. Please upgrade to continue.')
    }

    throw new DomainError(`Missing required entitlement: ${entitlementKey}`)
  }

  /**
   * READ-only helper (boolean), za “soft checks” (npr. limits).
   */
  async has(orgId: string, entitlementKey: EntitlementKey): Promise<boolean> {
    const cleanOrgId = String(orgId ?? '').trim()
    if (!cleanOrgId) return false

    const hasPaid = await this.entitlementRepository.hasActiveEntitlement({
      orgId: cleanOrgId,
      entitlementKey,
    })
    if (hasPaid) return true

    const window = await this.entitlementRepository.getOrgTrialWindow({
      orgId: cleanOrgId,
    })
    const trial = this.computeTrial(window)

    if (!trial.isActive) return false
    return this.TRIAL_ENTITLEMENTS.has(entitlementKey)
  }

  /**
   * Sync iz plana -> entitlements (tx)
   */
  async syncFromPlan(
    orgId: string,
    subscription: SyncSubscriptionInput,
    tx: BillingTx,
  ): Promise<void> {
    const cleanOrgId = String(orgId ?? '').trim()
    if (!cleanOrgId) throw new DomainError('orgId is required')

    const planKey = subscription.planKey.trim().toLowerCase()
    if (!planKey) {
      throw new DomainError('subscription plan is required for entitlement sync')
    }

    const mapped = PLAN_ENTITLEMENTS[planKey]
    if (!mapped) {
      throw new DomainError(`Unsupported plan for entitlements: ${planKey}`)
    }

    await this.entitlementRepository.replaceActiveEntitlements(tx, {
      orgId: cleanOrgId,
      entitlementKeys: mapped,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    })
  }

  async deactivateForSubscription(
    orgId: string,
    stripeSubscriptionId: string,
    tx: BillingTx,
  ): Promise<void> {
    const cleanOrgId = String(orgId ?? '').trim()
    if (!cleanOrgId) throw new DomainError('orgId is required')

    await this.entitlementRepository.deactivateEntitlements(tx, {
      orgId: cleanOrgId,
      stripeSubscriptionId,
    })
  }

  /**
   * Trial helper:
   * - Trial je aktiven samo, če imamo trial_started_at in trial_ends_at
   * - in je "now" znotraj [start, end]
   */
  private computeTrial(window: TrialWindow | null): { isActive: boolean; isExpired: boolean } {
    if (!window) return { isActive: false, isExpired: false }

    const startedAt = window.trialStartedAt ?? null
    const endsAt = window.trialEndsAt ?? null
    if (!startedAt || !endsAt) return { isActive: false, isExpired: false }

    const startMs = new Date(String(startedAt)).getTime()
    const endMs = new Date(String(endsAt)).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { isActive: false, isExpired: false }
    }

    const now = Date.now()
    const isActive = now >= startMs && now <= endMs
    const isExpired = now > endMs
    return { isActive, isExpired }
  }
}