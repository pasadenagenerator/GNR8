import { ConflictError } from '@gnr8/core'
import type { Project, ProjectRepository, ProjectTransaction } from '@gnr8/core'
import type { Pool, PoolClient, QueryResult } from 'pg'
import { getPool } from '../db/pool'
import { randomUUID } from 'crypto'

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

function isUniqueViolation(
  error: unknown,
): error is { code: string; constraint?: string } {
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
      // projects.id je TEXT + NOT NULL brez default-a, zato ga generiramo v Node-u
      const id = randomUUID()

      const result: QueryResult<DbRow> = await this.client.query(
        `insert into public.projects (id, org_id, name, slug)
         values ($1, $2, $3, $4)
         returning id, org_id, name, slug, created_at, deleted_at`,
        [id, input.orgId, input.name, input.slug],
      )

      return mapProject(result.rows[0])
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Project slug already exists in organization')
      }
      throw error
    }
  }

  async countActiveProjects(input: { orgId: string }): Promise<number> {
    const result: QueryResult<{ cnt: string }> = await this.client.query(
      `select count(*)::text as cnt
       from public.projects
       where org_id = $1
         and deleted_at is null`,
      [input.orgId],
    )

    return Number(result.rows[0]?.cnt ?? 0)
  }

  async findProjectById(input: {
    orgId: string
    projectId: string
  }): Promise<Project | null> {
    const result: QueryResult<DbRow> = await this.client.query(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1
         and id = $2
       limit 1`,
      [input.orgId, input.projectId],
    )

    const row = result.rows[0]
    return row ? mapProject(row) : null
  }

  async softDeleteProject(input: {
    orgId: string
    projectId: string
  }): Promise<void> {
    await this.client.query(
      `update public.projects
       set deleted_at = now()
       where org_id = $1
         and id = $2
         and deleted_at is null`,
      [input.orgId, input.projectId],
    )
  }

  async listProjectsByOrgId(input: { orgId: string }): Promise<Project[]> {
    const result: QueryResult<DbRow> = await this.client.query(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1
         and deleted_at is null
       order by created_at desc`,
      [input.orgId],
    )

    return result.rows.map(mapProject)
  }
}

export class PostgresProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async withTransaction<T>(
    fn: (tx: ProjectTransaction) => Promise<T>,
  ): Promise<T> {
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
}