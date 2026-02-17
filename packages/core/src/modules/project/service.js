import { DomainError, NotFoundError } from '../../service-contract';
const STARTER_PROJECT_LIMIT = 1;
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
            // STARTER limit guard (če nima "project.unlimited")
            const hasUnlimited = await this.hasUnlimitedProjects(orgId);
            if (!hasUnlimited) {
                const count = await tx.countProjectsByOrgId({ orgId });
                if (count >= STARTER_PROJECT_LIMIT) {
                    throw new DomainError(`Project limit reached for current plan (max ${STARTER_PROJECT_LIMIT}). Upgrade to Pro for unlimited projects.`);
                }
            }
            return tx.createProject({
                orgId,
                name,
                slug,
            });
        });
    }
    async hasUnlimitedProjects(orgId) {
        try {
            await this.entitlementService.assert(orgId, 'project.unlimited');
            return true;
        }
        catch (e) {
            // EntitlementService.assert vrže DomainError, ko entitlement manjka → to je expected
            return false;
        }
    }
}
