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
  orgId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  planKey: string
  status: SubscriptionStatus
  currentPeriodEnd: string | null
}

export type StripeSubscriptionObject = {
  id: string
  customer: string
  status: string
  current_period_end?: number | null
  metadata?: Record<string, string>
  items?: {
    data?: Array<{
      price?: {
        lookup_key?: string | null
        id?: string
      }
    }>
  }
}

export type StripeWebhookEvent = {
  id: string
  type: string
  data: {
    object: StripeSubscriptionObject
  }
}

export type BillingEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
