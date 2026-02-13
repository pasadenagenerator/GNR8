import type { BillingTx } from '../billing/repository'
import type { EntitlementKey } from './types'

export interface EntitlementRepository {
  replaceActiveEntitlements(
    tx: BillingTx,
    input: {
      orgId: string
      entitlementKeys: EntitlementKey[]
      stripeSubscriptionId: string
    },
  ): Promise<void>
  deactivateEntitlements(
    tx: BillingTx,
    input: { orgId: string; stripeSubscriptionId?: string },
  ): Promise<void>
}
