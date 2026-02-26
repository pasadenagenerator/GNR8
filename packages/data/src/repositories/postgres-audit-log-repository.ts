import type { AuditLogEvent, AuditLogRepository, Role } from '@gnr8/core'
import type { Pool, QueryResultRow } from 'pg'
import { getPool } from '../db/pool'

type RoleRow = QueryResultRow & { role: Role }

type AuditLogRow = QueryResultRow & {
  id: string
  org_id: string
  actor_user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: unknown
  created_at: string
}

export class PostgresAuditLogRepository implements AuditLogRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async getActorRoleInOrg(input: {
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const orgId = String(input.orgId ?? '').trim()
    const actorUserId = String(input.actorUserId ?? '').trim()
    if (!orgId || !actorUserId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<RoleRow>(
        `select role
         from public.memberships
         where org_id = $1
           and user_id = $2
         limit 1`,
        [orgId, actorUserId],
      )
      return res.rows[0]?.role ?? null
    } finally {
      client.release()
    }
  }

  async listOrgActivity(input: {
    orgId: string
    action: string | null
    entityType: string | null
    entityId: string | null
    cursor: string | null
    limit: number
  }): Promise<{ events: AuditLogEvent[]; nextCursor: string | null }> {
    const orgId = String(input.orgId ?? '').trim()
    
    // repo predpostavlja validiran orgId (service enforce-a)

    const action = input.action ? String(input.action).trim() : null
    const entityType = input.entityType ? String(input.entityType).trim() : null
    const entityId = input.entityId ? String(input.entityId).trim() : null
    const cursor = input.cursor ? String(input.cursor).trim() : null

    const limit = Math.max(1, Math.min(200, Math.trunc(Number(input.limit ?? 50))))
    const limitPlusOne = limit + 1

    const where: string[] = ['org_id = $1']
    const params: unknown[] = [orgId]
    let p = 2

    if (action) {
      where.push(`action = $${p++}`)
      params.push(action)
    }
    if (entityType) {
      where.push(`entity_type = $${p++}`)
      params.push(entityType)
    }
    if (entityId) {
      where.push(`entity_id = $${p++}`)
      params.push(entityId)
    }
    if (cursor) {
      // cursor = ISO timestamp (created_at) zadnjega eventa prejšnje strani
      where.push(`created_at < $${p++}::timestamptz`)
      params.push(cursor)
    }

    // LIMIT naj bo parametriziran (bolj "clean")
    const limitParamIndex = p++
    params.push(limitPlusOne)

    const sql = `
      select
        id::text as id,
        org_id::text as org_id,
        actor_user_id::text as actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at::text as created_at
      from public.audit_logs
      where ${where.join(' and ')}
      order by created_at desc
      limit $${limitParamIndex}
    `

    const client = await this.pool.connect()
    try {
      const res = await client.query<AuditLogRow>(sql, params)

      const rows = res.rows
      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows

      const events: AuditLogEvent[] = page.map((r) => ({
        id: String(r.id),
        orgId: String(r.org_id),
        actorUserId: String(r.actor_user_id),
        action: String(r.action),
        entityType: String(r.entity_type),
        entityId: String(r.entity_id),
        metadata: r.metadata ?? {},
        createdAt: String(r.created_at),
      }))

      const nextCursor = hasMore ? events[events.length - 1]?.createdAt ?? null : null
      return { events, nextCursor }
    } finally {
      client.release()
    }
  }
}