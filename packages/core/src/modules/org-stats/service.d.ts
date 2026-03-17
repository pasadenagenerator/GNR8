import { AuthorizationService } from '../authorization';
import { EntitlementService } from '../entitlement/service';
import type { OrgStatsRepository } from './repository';
import type { GetOrgStatsInput, OrgStats } from './types';
export declare class OrgStatsService {
    private readonly orgStatsRepository;
    private readonly authorizationService;
    private readonly entitlementService;
    constructor(orgStatsRepository: OrgStatsRepository, authorizationService: AuthorizationService, entitlementService: EntitlementService);
    getOrgStats(input: GetOrgStatsInput): Promise<OrgStats>;
}
//# sourceMappingURL=service.d.ts.map