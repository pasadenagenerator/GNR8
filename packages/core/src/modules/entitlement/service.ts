import { DomainError } from '../../service-contract'
import type { BillingTx } from '../billing/repository'
import type { EntitlementRepository } from './repository'
import type { EntitlementKey, SyncSubscriptionInput } from './types'
import { PLAN_ENTITLEMENTS } from './plan-map'

export class EntitlementService {
  constructor(private readonly entitlementRepository: EntitlementRepository) {}

  // HARD GATE za paid features (ProjectService, future guards)
  // READ-ONLY → brez BillingTx
  async assert(orgId: string, entitlementKey: EntitlementKey): Promise<void> {
    const has = await this.entitlementRepository.hasActiveEntitlement({
      orgId,
      entitlementKey,
    })

    if (!has) {
      throw new DomainError(`Missing required entitlement: ${entitlementKey}`)
    }
  }

  /**
   * IMPORTANT (Option B - recommended):
   * Entitlements vežemo na Stripe subscription id (sub_...),
   * ker je to stabilen lifecycle key v webhook eventih.
   */
  async syncFromPlan(
    orgId: string,
    subscription: SyncSubscriptionInput,
    tx: BillingTx,
  ): Promise<void> {
    const planKey = subscription.planKey.trim().toLowerCase()
    if (!planKey) {
      throw new DomainError('subscription plan is required for entitlement sync')
    }

    const mapped = PLAN_ENTITLEMENTS[planKey]
    if (!mapped) {
      throw new DomainError(`Unsupported plan for entitlements: ${planKey}`)
    }

    const stripeSubscriptionId = subscription.stripeSubscriptionId?.trim()
    if (!stripeSubscriptionId) {
      throw new DomainError(
        'subscription.stripeSubscriptionId is required for entitlement sync',
      )
    }

    await this.entitlementRepository.replaceActiveEntitlements(tx, {
      orgId,
      entitlementKeys: mapped,
      stripeSubscriptionId,
    })
  }

  /**
   * Deaktivacija cilja Stripe subscription id (sub_...).
   */
  async deactivateForSubscription(
    orgId: string,
    stripeSubscriptionId: string,
    tx: BillingTx,
  ): Promise<void> {
    const id = stripeSubscriptionId?.trim()
    if (!id) {
      throw new DomainError(
        'stripeSubscriptionId is required for entitlement deactivation',
      )
    }

    await this.entitlementRepository.deactivateEntitlements(tx, {
      orgId,
      stripeSubscriptionId: id,
    })
  }
}