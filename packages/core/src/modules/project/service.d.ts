import { AuthorizationService } from '../authorization';
import { EntitlementService } from '../entitlement/service';
import type { MembershipRepository, ProjectRepository } from './repository';
import type { CreateProjectInput, Project } from './types';
export declare class ProjectService {
    private readonly projectRepository;
    private readonly membershipRepository;
    private readonly authorizationService;
    private readonly entitlementService;
    constructor(projectRepository: ProjectRepository, membershipRepository: MembershipRepository, authorizationService: AuthorizationService, entitlementService: EntitlementService);
    createProject(input: CreateProjectInput): Promise<Project>;
    private hasUnlimitedProjects;
}
//# sourceMappingURL=service.d.ts.map