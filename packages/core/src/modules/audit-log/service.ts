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

function toOptionalTrimmedString(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim()
  return s ? s : null
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

    // 1) Membership + role (read-only)
    const role: Role | null = await this.auditLogRepository.getActorRoleInOrg({
      actorUserId,
      orgId,
    })
    if (!role) throw new NotFoundError('Actor membership not found for organization')

    // 2) AuthZ (permission) + Entitlement gate (paid OR trial)
    this.authorizationService.assert(role, 'organization.read')
    await this.entitlementService.assert(orgId, 'organization.read')

    // 3) Query (normalize filters)
    const limit = clampInt(input.limit, 1, 200, 50)

    return this.auditLogRepository.listOrgActivity({
      orgId,
      action: toOptionalTrimmedString(input.action),
      entityType: toOptionalTrimmedString(input.entityType),
      entityId: toOptionalTrimmedString(input.entityId),
      cursor: toOptionalTrimmedString(input.cursor),
      limit,
    })
  }
}