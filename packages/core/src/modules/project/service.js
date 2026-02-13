import { DomainError, NotFoundError } from '../../service-contract';
export class ProjectService {
    projectRepository;
    membershipRepository;
    authorizationService;
    entitlementService;
    constructor(projectRepository, membershipRepository, authorizationService, entitlementService) {
        this.projectRepository = projectRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.entitlementService = entitlementService;
    }
    async createProject(input) {
        const actorUserId = input.actorUserId.trim();
        const orgId = input.orgId.trim();
        const name = input.name.trim();
        const slug = input.slug.trim().toLowerCase();
        if (!actorUserId) {
            throw new DomainError('actorUserId is required');
        }
        if (!orgId) {
            throw new DomainError('orgId is required');
        }
        if (!name) {
            throw new DomainError('Project name is required');
        }
        if (!slug) {
            throw new DomainError('Project slug is required');
        }
        if (!/^[a-z0-9-]+$/.test(slug)) {
            throw new DomainError('Project slug must contain only lowercase letters, numbers, and hyphens');
        }
        return this.projectRepository.withTransaction(async (tx) => {
            const role = await this.membershipRepository.getActorRoleInOrg({
                tx,
                actorUserId,
                orgId,
            });
            if (!role) {
                throw new NotFoundError('Actor membership not found for organization');
            }
            // Role-based permission
            this.authorizationService.assert(role, 'project.create');
            // Billing / plan-based entitlement (READ-ONLY, brez tx)
            await this.entitlementService.assert(orgId, 'project.create');
            return tx.createProject({
                orgId,
                name,
                slug,
            });
        });
    }
}
