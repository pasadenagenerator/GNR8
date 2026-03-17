import { AuthorizationService } from '../authorization';
import { EntitlementService } from '../entitlement/service';
import type { MembershipRepository, ProjectRepository } from './repository';
import type { CreateProjectInput, DeleteProjectInput, ListProjectsInput, Project, RestoreProjectInput } from './types';
export declare class ProjectService {
    private readonly projectRepository;
    private readonly membershipRepository;
    private readonly authorizationService;
    private readonly entitlementService;
    constructor(projectRepository: ProjectRepository, membershipRepository: MembershipRepository, authorizationService: AuthorizationService, entitlementService: EntitlementService);
    private cleanRequired;
    private getRoleOrThrow;
    /**
     * Unlimited check.
     * Opomba: entitlementService.has vključuje tudi trial fallback.
     * Ker trenutno trial ne vključuje 'project.unlimited', je to OK.
     */
    private isUnlimited;
    listProjects(input: ListProjectsInput): Promise<Project[]>;
    listActiveProjects(input: ListProjectsInput): Promise<Project[]>;
    listDeletedProjects(input: ListProjectsInput): Promise<Project[]>;
    createProject(input: CreateProjectInput): Promise<Project>;
    deleteProject(input: DeleteProjectInput): Promise<Project>;
    restoreProject(input: RestoreProjectInput): Promise<Project>;
}
//# sourceMappingURL=service.d.ts.map