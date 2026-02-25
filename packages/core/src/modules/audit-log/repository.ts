import type { Role } from '../authorization'
import type { AuditLogEvent } from './types'

export interface AuditLogRepository {
  // read-only membership+role check
  getActorRoleInOrg(input: { actorUserId: string; orgId: string }): Promise<Role | null>

  // list activity with filters + cursor pagination
  listOrgActivity(input: {
    orgId: string
    action?: string | null
    entityType?: string | null
    entityId?: string | null
    cursor?: string | null
    limit: number
  }): Promise<{ events: AuditLogEvent[]; nextCursor: string | null }>
}