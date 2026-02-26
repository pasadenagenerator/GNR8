import type { Role } from '../authorization'
import type { AuditLogEvent } from './types'

export interface AuditLogRepository {
  /**
   * Read-only membership+role check.
   * Returns null if actor is not a member of org.
   */
  getActorRoleInOrg(input: { actorUserId: string; orgId: string }): Promise<Role | null>

  /**
   * List activity with optional filters + cursor pagination.
   * NOTE: Filters are nullable (not optional) so callers can normalize once (in service).
   */
  listOrgActivity(input: {
    orgId: string
    action: string | null
    entityType: string | null
    entityId: string | null
    cursor: string | null
    limit: number
  }): Promise<{ events: AuditLogEvent[]; nextCursor: string | null }>
}