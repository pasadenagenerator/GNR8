import type { BillingSubscription } from './types'

export type BillingTx = {
  _tag: 'billing_tx'
}

export interface BillingRepository {
  withTransaction<T>(fn: (tx: BillingTx) => Promise<T>): Promise<T>
  markStripeEventProcessed(
    tx: BillingTx,
    input: { stripeEventId: string; eventType: string },
  ): Promise<boolean>
  upsertSubscription(
    tx: BillingTx,
    subscription: BillingSubscription,
  ): Promise<BillingSubscription>
  findSubscriptionByStripeSubscriptionId(
    tx: BillingTx,
    stripeSubscriptionId: string,
  ): Promise<BillingSubscription | null>
  markSubscriptionCanceled(
    tx: BillingTx,
    stripeSubscriptionId: string,
  ): Promise<void>
}
