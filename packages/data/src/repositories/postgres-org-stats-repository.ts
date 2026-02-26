import type { OrgStatsRepository, OrgStatsRow, Role } from '@gnr8/core'
import type { Pool, QueryResultRow } from 'pg'
import { getPool } from '../db/pool'

type RoleRow = QueryResultRow & { role: Role }

export class PostgresOrgStatsRepository implements OrgStatsRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async getActorRoleInOrg(input: {
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()
    if (!actorUserId || !orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<RoleRow>(
        `
        select role
        from public.memberships
        where org_id = $1
          and user_id = $2
        limit 1
        `,
        [orgId, actorUserId],
      )

      return res.rows[0]?.role ?? null
    } finally {
      client.release()
    }
  }

  async getOrgStatsRow(input: { orgId: string }): Promise<OrgStatsRow | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<OrgStatsRow>(
        `
        select
          o.id::text as org_id,
          o.name::text as org_name,
          o.slug::text as org_slug,
          o.created_at::text as org_created_at,
          o.updated_at::text as org_updated_at,
          o.trial_started_at::text as trial_started_at,
          o.trial_ends_at::text as trial_ends_at,

          (select count(*)::text from public.memberships m where m.org_id = o.id) as users_cnt,
          (select count(*)::text from public.projects p where p.org_id = o.id and p.deleted_at is null) as projects_active_cnt,
          (select count(*)::text from public.projects p where p.org_id = o.id and p.deleted_at is not null) as projects_deleted_cnt,

          s.plan_key::text as sub_plan_key,
          s.status::text as sub_status,
          s.current_period_end::text as sub_current_period_end,
          s.stripe_customer_id::text as sub_stripe_customer_id,
          s.stripe_subscription_id::text as sub_stripe_subscription_id
        from public.organizations o
        left join lateral (
          select
            plan_key,
            status,
            current_period_end,
            stripe_customer_id,
            stripe_subscription_id
          from public.subscriptions
          where org_id = o.id
            and deleted_at is null
          order by created_at desc
          limit 1
        ) s on true
        where o.id = $1
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