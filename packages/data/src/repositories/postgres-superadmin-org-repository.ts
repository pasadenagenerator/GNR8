import type {
  SuperadminOrgRepository,
  SuperadminOrgRow,
  SuperadminProjectRow,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

export class PostgresSuperadminOrgRepository implements SuperadminOrgRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async getOrgById(input: { orgId: string }): Promise<SuperadminOrgRow | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminOrgRow>(
        `select
           id::text as id,
           name::text as name,
           created_at::text as created_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
         from public.organizations
         where id = $1
         limit 1`,
        [orgId],
      )
      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async listProjectsByOrgId(input: {
    orgId: string
    filter: 'active' | 'deleted'
  }): Promise<SuperadminProjectRow[]> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return []

    const filter = input.filter

    // filter je union type => kontroliran SQL fragment
    const whereDeleted =
      filter === 'deleted' ? 'deleted_at is not null' : 'deleted_at is null'
    const orderBy = filter === 'deleted' ? 'deleted_at desc' : 'created_at desc'

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminProjectRow>(
        `select
           id::text as id,
           org_id::text as org_id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           deleted_at::text as deleted_at
         from public.projects
         where org_id = $1
           and ${whereDeleted}
         order by ${orderBy}`,
        [orgId],
      )

      return res.rows
    } finally {
      client.release()
    }
  }
}