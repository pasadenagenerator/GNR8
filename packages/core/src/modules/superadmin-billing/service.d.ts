import type { SuperadminBillingRepository } from './repository';
import type { GetSuperadminBillingInput, SuperadminBillingOutput } from './types';
export declare class SuperadminBillingService {
    private readonly repo;
    constructor(repo: SuperadminBillingRepository);
    getBillingSnapshot(input: GetSuperadminBillingInput): Promise<SuperadminBillingOutput>;
}
//# sourceMappingURL=service.d.ts.map