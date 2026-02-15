export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

export type PlanKey = 'starter' | 'pro' | 'agency'

export type BillingSubscription = {
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

export type StripeWebhookEvent = {
  id: string
  type: BillingEventType | string
  data: {
    object: StripeSubscriptionObject
  }
}

export type BillingEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'