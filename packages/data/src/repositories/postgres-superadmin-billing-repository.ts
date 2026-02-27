import type {
  SuperadminBillingRepository,
  SuperadminOrgBillingRow,
  SuperadminSubscriptionRow,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

export class PostgresSuperadminBillingRepository implements SuperadminBillingRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async getOrgSnapshot(input: { orgId: string }): Promise<SuperadminOrgBillingRow | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminOrgBillingRow>(
        `
        select
          id::text as id,
          name::text as name,
          slug::text as slug,
          created_at::text as created_at,
          updated_at::text as updated_at
        from public.organizations
        where id = $1
        limit 1
        `,
        [orgId],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async getLatestActiveSubscriptionSnapshot(input: {
    orgId: string
  }): Promise<SuperadminSubscriptionRow | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminSubscriptionRow>(
        `
        select
          id::text as id,
          org_id::text as org_id,
          stripe_customer_id,
          stripe_subscription_id,
          status,
          plan_key,
          current_period_end::text as current_period_end,
          created_at::text as created_at,
          updated_at::text as updated_at,
          deleted_at::text as deleted_at
        from public.subscriptions
        where org_id = $1
          and deleted_at is null
        order by coalesce(updated_at, created_at) desc nulls last
        limit 1
        `,
        [orgId],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }
}