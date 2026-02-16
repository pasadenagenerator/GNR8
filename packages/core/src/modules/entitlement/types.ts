export type EntitlementKey =
  | 'organization.read'
  | 'organization.manage'
  | 'membership.manage'
  | 'project.create'
  | 'project.unlimited'
  | 'billing.manage'
  | 'agency.mode'

/**
 * Input iz BillingService → EntitlementService
 * uporablja se takoj po upsertu subscriptiona
 */
export type SyncSubscriptionInput = {
  /**
   * Stripe subscription id (sub_...)
   * → glavni vezni ključ za entitlements
   */
  stripeSubscriptionId: string

  /**
   * Internal plan key (starter | pro | agency)
   */
  planKey: string
}

export type ReplaceActiveEntitlementsInput = {
  orgId: string
  entitlementKeys: EntitlementKey[]

  /**
   * Stripe subscription id (sub_...)
   */
  stripeSubscriptionId: string
}

export type DeactivateEntitlementsInput = {
  orgId: string

  /**
   * Stripe subscription id (sub_...)
   */
  stripeSubscriptionId: string
}

export type HasActiveEntitlementInput = {
  orgId: string
  entitlementKey: EntitlementKey
}