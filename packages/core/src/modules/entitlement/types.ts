import type { BillingSubscription } from '../billing/types'

export type EntitlementKey =
  | 'organization.read'
  | 'organization.manage'
  | 'membership.manage'
  | 'project.create'
  | 'billing.manage'
  | 'projects.unlimited'
  | 'agency.mode'

export type PlanKey = 'starter' | 'pro' | 'agency'

export type SyncSubscriptionInput = Pick<
  BillingSubscription,
  'stripeSubscriptionId' | 'planKey' | 'status'
>
