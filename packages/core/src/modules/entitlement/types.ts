export type EntitlementKey =
  | 'organization.read'
  | 'organization.manage'
  | 'membership.manage'
  | 'project.create'
  | 'project.unlimited'
  | 'billing.manage'
  | 'agency.mode'

export type SyncSubscriptionInput = {
  /**
   * INTERNAL subscription id (public.subscriptions.id)
   * -> to je tvoj "uuid/text uuid-like", NE Stripe "sub_..."
   */
  id: string

  /**
   * Stripe subscription id (sub_...)
   * še vedno ga lahko hranimo na subscription objektu,
   * ampak entitlements naj se vežejo na internal id.
   */
  stripeSubscriptionId: string

  planKey: string
}

export type ReplaceActiveEntitlementsInput = {
  orgId: string
  entitlementKeys: EntitlementKey[]
  subscriptionId: string // internal subscription id
}

export type DeactivateEntitlementsInput = {
  orgId: string
  subscriptionId: string // internal subscription id
}

export type HasActiveEntitlementInput = {
  orgId: string
  entitlementKey: EntitlementKey
}