import type { SuperadminOrgRepository } from './repository';
import type { CreateSuperadminOrgInput, CreateSuperadminOrgOutput, GetSuperadminOrgInput, ListSuperadminOrgsInput, ListSuperadminOrgsOutput, SuperadminOrgDetails } from './types';
export declare class SuperadminOrgService {
    private readonly repo;
    constructor(repo: SuperadminOrgRepository);
    listOrgs(input: ListSuperadminOrgsInput): Promise<ListSuperadminOrgsOutput>;
    createOrg(input: CreateSuperadminOrgInput): Promise<CreateSuperadminOrgOutput>;
    getOrgDetails(input: GetSuperadminOrgInput): Promise<SuperadminOrgDetails>;
}
//# sourceMappingURL=service.d.ts.map