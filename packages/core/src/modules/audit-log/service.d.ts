import { AuthorizationService } from '../authorization';
import { EntitlementService } from '../entitlement/service';
import type { AuditLogRepository } from './repository';
import type { ListOrgActivityInput, ListOrgActivityOutput } from './types';
export declare class AuditLogService {
    private readonly auditLogRepository;
    private readonly authorizationService;
    private readonly entitlementService;
    constructor(auditLogRepository: AuditLogRepository, authorizationService: AuthorizationService, entitlementService: EntitlementService);
    listOrgActivity(input: ListOrgActivityInput): Promise<ListOrgActivityOutput>;
}
//# sourceMappingURL=service.d.ts.map