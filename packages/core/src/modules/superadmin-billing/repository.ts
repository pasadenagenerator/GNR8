// packages/core/src/modules/superadmin-billing/repository.ts

export type SuperadminOrgBillingRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
}

export type SuperadminSubscriptionRow = {
  id: string
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string | null
  plan_key: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface SuperadminBillingRepository {
  getOrgSnapshot(input: { orgId: string }): Promise<SuperadminOrgBillingRow | null>

  /**
   * Latest non-deleted subscription row (if any).
   * NOTE: "Active" here means "not deleted" (deleted_at is null),
   * not "status === active".
   */
  getLatestActiveSubscriptionSnapshot(input: { orgId: string }): Promise<SuperadminSubscriptionRow | null>
}