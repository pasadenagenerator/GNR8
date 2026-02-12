import { AuthorizationService } from '../authorization';
import type { MembershipRepository, ProjectRepository } from './repository';
import type { CreateProjectInput, Project } from './types';
export declare class ProjectService {
    private readonly projectRepository;
    private readonly membershipRepository;
    private readonly authorizationService;
    constructor(projectRepository: ProjectRepository, membershipRepository: MembershipRepository, authorizationService: AuthorizationService);
    createProject(input: CreateProjectInput): Promise<Project>;
}
//# sourceMappingURL=service.d.ts.map