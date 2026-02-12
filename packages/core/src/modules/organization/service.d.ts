import type { OrganizationRepository } from './repository';
import type { CreateOrganizationInput, CreateOrganizationResult } from './types';
export declare class OrganizationService {
    private readonly repository;
    constructor(repository: OrganizationRepository);
    createOrganization(input: CreateOrganizationInput): Promise<CreateOrganizationResult>;
}
//# sourceMappingURL=service.d.ts.map