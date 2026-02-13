import { DomainError } from '../../service-contract'
import type { BillingTx } from '../billing/repository'
import type { EntitlementRepository } from './repository'
import type { EntitlementKey, SyncSubscriptionInput } from './types'
import { PLAN_ENTITLEMENTS } from './plan-map'

export class EntitlementService {
  constructor(private readonly entitlementRepository: EntitlementRepository) {}

  // ✅ HARD GATE za paid features (ProjectService, future guards)
  async assert(
    orgId: string,
    entitlementKey: EntitlementKey,
    tx: BillingTx,
  ): Promise<void> {
    const has = await this.entitlementRepository.hasActiveEntitlement(tx, {
      orgId,
      entitlementKey,
    })

    if (!has) {
      throw new DomainError(
        `Missing required entitlement: ${entitlementKey}`,
      )
    }
  }

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

    await this.entitlementRepository.replaceActiveEntitlements(tx, {
      orgId,
      entitlementKeys: mapped,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    })
  }

  async deactivateForSubscription(
    orgId: string,
    stripeSubscriptionId: string,
    tx: BillingTx,
  ): Promise<void> {
    await this.entitlementRepository.deactivateEntitlements(tx, {
      orgId,
      stripeSubscriptionId,
    })
  }
}