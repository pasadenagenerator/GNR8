import { DomainError, NotFoundError } from '../../service-contract';
function clampInt(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}
function toOptionalTrimmedString(v) {
    const s = v == null ? '' : String(v).trim();
    return s ? s : null;
}
export class AuditLogService {
    auditLogRepository;
    authorizationService;
    entitlementService;
    constructor(auditLogRepository, authorizationService, entitlementService) {
        this.auditLogRepository = auditLogRepository;
        this.authorizationService = authorizationService;
        this.entitlementService = entitlementService;
    }
    async listOrgActivity(input) {
        const actorUserId = String(input.actorUserId ?? '').trim();
        const orgId = String(input.orgId ?? '').trim();
        if (!actorUserId)
            throw new DomainError('actorUserId is required');
        if (!orgId)
            throw new DomainError('orgId is required');
        // 1) Membership + role (read-only)
        const role = await this.auditLogRepository.getActorRoleInOrg({
            actorUserId,
            orgId,
        });
        if (!role)
            throw new NotFoundError('Actor membership not found for organization');
        // 2) AuthZ (permission) + Entitlement gate (paid OR trial)
        this.authorizationService.assert(role, 'organization.read');
        await this.entitlementService.assert(orgId, 'organization.read');
        // 3) Query (normalize filters)
        const limit = clampInt(input.limit, 1, 200, 50);
        return this.auditLogRepository.listOrgActivity({
            orgId,
            action: toOptionalTrimmedString(input.action),
            entityType: toOptionalTrimmedString(input.entityType),
            entityId: toOptionalTrimmedString(input.entityId),
            cursor: toOptionalTrimmedString(input.cursor),
            limit,
        });
    }
}
