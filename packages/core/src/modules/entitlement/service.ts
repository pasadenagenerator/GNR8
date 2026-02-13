import { DomainError } from '../../service-contract'
import type { BillingTx } from '../billing/repository'
import type { EntitlementRepository } from './repository'
import type { SyncSubscriptionInput } from './types'
import { PLAN_ENTITLEMENTS } from './plan-map'

export class EntitlementService {
  constructor(private readonly entitlementRepository: EntitlementRepository) {}

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