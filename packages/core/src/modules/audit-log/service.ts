import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService, type Role } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { AuditLogRepository } from './repository'
import type { ListOrgActivityInput, ListOrgActivityOutput } from './types'

function clampInt(value: number | undefined, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

export class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async listOrgActivity(input: ListOrgActivityInput): Promise<ListOrgActivityOutput> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    // 1) Membership + role
    const role: Role | null = await this.auditLogRepository.getActorRoleInOrg({
      actorUserId,
      orgId,
    })
    if (!role) throw new NotFoundError('Actor membership not found for organization')

    // 2) AuthZ + Entitlement
    this.authorizationService.assert(role, 'organization.read')
    await this.entitlementService.assert(orgId, 'organization.read')

    // 3) Query
    const limit = clampInt(input.limit, 1, 200, 50)

    return this.auditLogRepository.listOrgActivity({
      orgId,
      action: input.action ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      cursor: input.cursor ?? null,
      limit,
    })
  }
}