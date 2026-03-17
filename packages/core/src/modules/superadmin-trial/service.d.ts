import type { SuperadminTrialRepository } from './repository';
import type { UpdateOrgTrialInput, UpdateOrgTrialOutput } from './types';
export declare class SuperadminTrialService {
    private readonly repo;
    constructor(repo: SuperadminTrialRepository);
    updateOrgTrial(input: UpdateOrgTrialInput): Promise<UpdateOrgTrialOutput>;
}
//# sourceMappingURL=service.d.ts.map