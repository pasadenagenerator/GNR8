//packages/data/src/repositories/postgres-superadmin-billing-repository.ts

import type {
  SuperadminBillingRepository,
  SuperadminOrgBillingRow,
  SuperadminSubscriptionRow,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

function toTrimmedString(v: unknown): string {
  return String(v ?? '').trim()
}

// Minimal UUID guard (da se izognemo PG "invalid input syntax for type uuid")
function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
}

export class PostgresSuperadminBillingRepository implements SuperadminBillingRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async getOrgSnapshot(input: { orgId: string }): Promise<SuperadminOrgBillingRow | null> {
    const orgId = toTrimmedString(input.orgId)
    if (!orgId || !isUuid(orgId)) return null

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
        where id = $1::uuid
        limit 1
        `,
        [orgId],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async getLatestActiveSubscriptionSnapshot(
    input: { orgId: string },
  ): Promise<SuperadminSubscriptionRow | null> {
    const orgId = toTrimmedString(input.orgId)
    if (!orgId || !isUuid(orgId)) return null

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
        where org_id = $1::uuid
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