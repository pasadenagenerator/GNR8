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
   * IMPORTANT:
   * Entitlements naj bodo vezani na INTERNAL subscription id (subscriptions.id),
   * ne na Stripe "sub_..." id. (Stripe id je text, internal je uuid/text uuid-like)
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

    // ⬇️ ključna sprememba: uporabljamo INTERNAL subscription id
    const subscriptionId = (subscription as any).id?.trim?.() // če SyncSubscriptionInput še nima id
    if (!subscriptionId) {
      throw new DomainError(
        'subscription.id is required for entitlement sync (internal subscription id)',
      )
    }

    await this.entitlementRepository.replaceActiveEntitlements(tx, {
      orgId,
      entitlementKeys: mapped,
      subscriptionId,
    })
  }

  /**
   * Deaktivacija naj tudi cilja INTERNAL subscription id.
   */
  async deactivateForSubscription(
    orgId: string,
    subscriptionId: string,
    tx: BillingTx,
  ): Promise<void> {
    if (!subscriptionId?.trim()) {
      throw new DomainError('subscriptionId is required for entitlement deactivation')
    }

    await this.entitlementRepository.deactivateEntitlements(tx, {
      orgId,
      subscriptionId,
    })
  }
}