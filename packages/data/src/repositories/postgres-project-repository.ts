import { ConflictError, DomainError } from '@gnr8/core'
import type {
  Project,
  ProjectRepository,
  ProjectTransaction,
  Role,
} from '@gnr8/core'
import type { Pool, PoolClient, QueryResult } from 'pg'
import { getPool } from '../db/pool'

type DbRow = Record<string, unknown>

function mapProject(row: DbRow): Project {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    name: String(row.name),
    slug: String(row.slug),
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

class PostgresProjectTransaction implements ProjectTransaction {
  constructor(readonly client: PoolClient) {}

  async createProject(input: {
    orgId: string
    name: string
    slug: string
  }): Promise<Project> {
    try {
      const result: QueryResult<DbRow> = await this.client.query(
        `insert into public.projects (org_id, name, slug)
         values ($1, $2, $3)
         returning id, org_id, name, slug, created_at, deleted_at`,
        [input.orgId, input.name, input.slug],
      )

      return mapProject(result.rows[0])
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Project slug already exists in organization')
      }

      throw error
    }
  }
}

export class PostgresProjectRepository implements ProjectRepository
{
  constructor(private readonly pool: Pool = getPool()) {}

  async withTransaction<T>(fn: (tx: ProjectTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const tx = new PostgresProjectTransaction(client)
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

  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    if (!(input.tx instanceof PostgresProjectTransaction)) {
      throw new DomainError('Unsupported project transaction implementation')
    }

    const result: QueryResult<{ role: Role }> = await input.tx.client.query(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
         and deleted_at is null
       limit 1`,
      [input.orgId, input.actorUserId],
    )

    return result.rows[0]?.role ?? null
  }
}
