// PlanKey ima EN vir resnice → entitlement/types
import type { PlanKey } from '../entitlement/types'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

export type BillingSubscription = {
  /**
   * INTERNAL subscription id (public.subscriptions.id)
   * → vedno prisoten PO upsertu
   */
  id?: string // namenoma optional na nivoju tipa

  orgId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  planKey: PlanKey
  status: SubscriptionStatus
  currentPeriodEnd: string | null
}

export type StripeSubscriptionObject = {
  id: string
  customer: string
  status: SubscriptionStatus | string
  current_period_end?: number | null
  metadata?: Record<string, string | null> | null
  items?: {
    data?: Array<{
      price?: {
        lookup_key?: string | null
        id?: string
      } | null
    }>
  }
}

export type BillingEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'

export type StripeWebhookEvent = {
  id: string
  type: BillingEventType | string
  data: {
    object: StripeSubscriptionObject
  }
}