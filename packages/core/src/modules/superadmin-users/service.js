import { DomainError, NotFoundError } from '../../service-contract';
export class SuperadminUsersService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async listOrgUsers(input) {
        const orgId = String(input.orgId ?? '').trim();
        if (!orgId)
            throw new DomainError('orgId is required');
        // explicit existence check (domain responsibility)
        const exists = await this.repo.orgExists({ orgId });
        if (!exists) {
            throw new NotFoundError('Org not found');
        }
        const users = await this.repo.listOrgUsers({ orgId });
        return { users };
    }
}
