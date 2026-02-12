import { ConflictError } from '@gnr8/core'
import type {
  Membership,
  Organization,
  OrganizationCreationTx,
  OrganizationRepository,
} from '@gnr8/core'
import type { Pool, PoolClient, QueryResult } from 'pg'
import { getPool } from '../db/pool'

type DbRow = Record<string, unknown>

function mapOrganization(row: DbRow): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

function mapMembership(row: DbRow): Membership {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    userId: String(row.user_id),
    role: String(row.role) as Membership['role'],
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505',
  )
}

class PostgresOrganizationCreationTx implements OrganizationCreationTx {
  constructor(private readonly client: PoolClient) {}

  async profileExists(userId: string): Promise<boolean> {
    const result = await this.client.query(
      `select 1
       from public.profiles
       where id = $1
         and deleted_at is null
       limit 1`,
      [userId],
    )

    return (result.rowCount ?? 0) > 0
  }

  async createOrganization(input: {
    name: string
    slug: string
  }): Promise<Organization> {
    try {
      const result: QueryResult<DbRow> = await this.client.query(
        `insert into public.organizations (name, slug)
         values ($1, $2)
         returning id, name, slug, created_at, deleted_at`,
        [input.name, input.slug],
      )

      return mapOrganization(result.rows[0])
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Organization slug already exists')
      }

      throw error
    }
  }

  async createMembership(input: {
    orgId: string
    userId: string
    role: 'owner'
  }): Promise<Membership> {
    try {
      const result: QueryResult<DbRow> = await this.client.query(
        `insert into public.memberships (org_id, user_id, role)
         values ($1, $2, $3)
         returning id, org_id, user_id, role, created_at, deleted_at`,
        [input.orgId, input.userId, input.role],
      )

      return mapMembership(result.rows[0])
    } catch (error) {
      if (isUniqueViolation(error) && error.constraint === 'memberships_org_user_unique') {
        throw new ConflictError('User is already a member of this organization')
      }

      throw error
    }
  }

  async countActiveOwners(orgId: string): Promise<number> {
    const result = await this.client.query(
      `select count(*)::int as owner_count
       from public.memberships
       where org_id = $1
         and role = 'owner'
         and deleted_at is null`,
      [orgId],
    )

    return Number(result.rows[0]?.owner_count ?? 0)
  }
}

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async withTransaction<T>(fn: (tx: OrganizationCreationTx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const tx = new PostgresOrganizationCreationTx(client)
      const result = await fn(tx)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
