import { ConflictError, DomainError } from '@gnr8/core'
import type {
  SuperadminCreatedOrgRow,
  SuperadminOrgListRow,
  SuperadminOrgRepository,
  SuperadminOrgRow,
  SuperadminProjectRow,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505',
  )
}

export class PostgresSuperadminOrgRepository implements SuperadminOrgRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async listOrgs(input: { limit: number }): Promise<SuperadminOrgListRow[]> {
    const limit = Math.max(1, Math.min(500, Math.trunc(Number(input.limit ?? 500))))

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminOrgListRow>(
        `
        select
          o.id::text as id,
          o.name::text as name,
          o.created_at::text as created_at,
          count(p.id)::text as projects_count
        from public.organizations o
        left join public.projects p
          on p.org_id = o.id
         and p.deleted_at is null
        group by o.id, o.name, o.created_at
        order by o.created_at desc
        limit $1
        `,
        [limit],
      )

      return res.rows
    } finally {
      client.release()
    }
  }

  async createOrg(input: { name: string; slug: string | null }): Promise<SuperadminCreatedOrgRow> {
    const name = String(input.name ?? '').trim()
    const slug =
      input.slug == null ? null : String(input.slug).trim().toLowerCase()

    if (!name) {
      throw new DomainError('name is required')
    }

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminCreatedOrgRow>(
        `
        insert into public.organizations (id, name, slug)
        values (gen_random_uuid(), $1, $2)
        returning
          id::text as id,
          name::text as name,
          slug::text as slug,
          created_at::text as created_at,
          updated_at::text as updated_at,
          trial_started_at::text as trial_started_at,
          trial_ends_at::text as trial_ends_at
        `,
        [name, slug],
      )

      const row = res.rows[0]
      if (!row) throw new Error('Failed to create org')
      return row
    } catch (e) {
      if (isUniqueViolation(e)) {
        // najverjetneje unique constraint na organizations.slug
        throw new ConflictError('Organization slug already exists')
      }
      throw e
    } finally {
      client.release()
    }
  }

  async getOrgById(input: { orgId: string }): Promise<SuperadminOrgRow | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<SuperadminOrgRow>(
        `
        select
          id::text as id,
          name::text as name,
          created_at::text as created_at,
          trial_started_at::text as trial_started_at,
          trial_ends_at::text as trial_ends_at
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

  async listProjectsByOrgId(input: {
    orgId: string
    filter: 'active' | 'deleted'
  }): Promise<SuperadminProjectRow[]> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return []

    const client = await this.pool.connect()
    try {
      const isDeleted = input.filter === 'deleted'
      const whereDeleted = isDeleted ? 'deleted_at is not null' : 'deleted_at is null'
      const orderBy = isDeleted ? 'deleted_at desc' : 'created_at desc'

      const res = await client.query<SuperadminProjectRow>(
        `
        select
          id::text as id,
          org_id::text as org_id,
          name::text as name,
          slug::text as slug,
          created_at::text as created_at,
          deleted_at::text as deleted_at
        from public.projects
        where org_id = $1
          and ${whereDeleted}
        order by ${orderBy}
        `,
        [orgId],
      )

      return res.rows
    } finally {
      client.release()
    }
  }
}