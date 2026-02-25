export type OrgStatsRow = {
  org_id: string
  org_name: string
  org_slug: string | null
  org_created_at: string | null
  org_updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null

  users_cnt: string
  projects_active_cnt: string
  projects_deleted_cnt: string

  sub_plan_key: string | null
  sub_status: string | null
  sub_current_period_end: string | null
  sub_stripe_customer_id: string | null
  sub_stripe_subscription_id: string | null
}

export interface OrgStatsRepository {
  /**
   * Fetch org + counts + latest subscription snapshot in one go (read-only).
   * Returns null if org not found.
   */
  getOrgStatsRow(input: { orgId: string }): Promise<OrgStatsRow | null>
}