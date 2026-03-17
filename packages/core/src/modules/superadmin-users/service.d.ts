import type { SuperadminUsersRepository } from './repository';
import type { ListSuperadminOrgUsersInput, ListSuperadminOrgUsersOutput } from './types';
export declare class SuperadminUsersService {
    private readonly repo;
    constructor(repo: SuperadminUsersRepository);
    listOrgUsers(input: ListSuperadminOrgUsersInput): Promise<ListSuperadminOrgUsersOutput>;
}
//# sourceMappingURL=service.d.ts.map