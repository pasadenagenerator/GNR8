export type SuperadminOrgSnapshot = {
  id: string
  name: string
  slug: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type SuperadminSubscriptionSnapshot = {
  id: string
  orgId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string | null
  planKey: string | null
  currentPeriodEnd: string | null
  createdAt: string | null
  updatedAt: string | null
} | null

export type GetSuperadminBillingInput = {
  orgId: string
}

export type SuperadminBillingOutput = {
  org: SuperadminOrgSnapshot
  subscription: SuperadminSubscriptionSnapshot
}