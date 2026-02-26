import { ConflictError } from '@gnr8/core'
import type { Project, ProjectRepository, ProjectTransaction } from '@gnr8/core'
import type { Pool, PoolClient, QueryResultRow } from 'pg'
import { getPool } from '../db/pool'

type DbRow = QueryResultRow & Record<string, unknown>

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

/**
 * JSON.stringify lahko vrže (circular refs).
 * Audit log je del iste transakcije; če insert faila, bo rollback (atomarnost).
 * Stringify pa naj ne bo razlog za crash.
 */
function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {})
  } catch {
    return JSON.stringify({
      __stringifyError: true,
      type: typeof value,
    })
  }
}

class PostgresProjectTransaction implements ProjectTransaction {
  constructor(readonly client: PoolClient) {}

  async createProject(input: {
    orgId: string
    name: string
    slug: string
  }): Promise<Project> {
    try {
      const result = await this.client.query<DbRow>(
        `insert into public.projects (id, org_id, name, slug)
         values (gen_random_uuid()::text, $1, $2, $3)
         returning id, org_id, name, slug, created_at, deleted_at`,
        [input.orgId, input.name, input.slug],
      )

      const row = result.rows[0]
      return mapProject(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Project slug already exists in organization')
      }
      throw error
    }
  }

  async countActiveProjects(input: { orgId: string }): Promise<number> {
    const result = await this.client.query<{ cnt: string } & QueryResultRow>(
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
    const result = await this.client.query<DbRow>(
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

  async softDeleteProject(input: { orgId: string; projectId: string }): Promise<void> {
    await this.client.query(
      `update public.projects
       set deleted_at = now()
       where org_id = $1
         and id = $2
         and deleted_at is null`,
      [input.orgId, input.projectId],
    )
  }

  async restoreProject(input: { orgId: string; projectId: string }): Promise<void> {
    await this.client.query(
      `update public.projects
       set deleted_at = null
       where org_id = $1
         and id = $2
         and deleted_at is not null`,
      [input.orgId, input.projectId],
    )
  }

  async listProjectsByOrgId(input: { orgId: string }): Promise<Project[]> {
    const result = await this.client.query<DbRow>(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1
         and deleted_at is null
       order by created_at desc`,
      [input.orgId],
    )
    return result.rows.map(mapProject)
  }

  async listDeletedProjectsByOrgId(input: { orgId: string }): Promise<Project[]> {
    const result = await this.client.query<DbRow>(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1
         and deleted_at is not null
       order by deleted_at desc`,
      [input.orgId],
    )
    return result.rows.map(mapProject)
  }

  async writeAuditLog(input: {
    orgId: string
    actorUserId: string
    action: string
    entityType: string
    entityId: string
    metadata?: unknown
  }): Promise<void> {
    const metadataJson = safeJsonStringify(input.metadata)

    await this.client.query(
      `insert into public.audit_logs (
         id,
         org_id,
         actor_user_id,
         action,
         entity_type,
         entity_id,
         metadata
       )
       values (
         gen_random_uuid()::text,
         $1,
         $2,
         $3,
         $4,
         $5,
         $6::jsonb
       )`,
      [
        input.orgId,
        input.actorUserId,
        input.action,
        input.entityType,
        input.entityId,
        metadataJson,
      ],
    )
  }
}

export class PostgresProjectRepository implements ProjectRepository {
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
}