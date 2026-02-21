import type { AuthorizationService } from '../authorization'
import type { EntitlementService } from '../entitlement/service'
import type { MembershipRepository, ProjectRepository } from './repository'
import type {
  CreateProjectInput,
  DeleteProjectInput,
  ListProjectsInput,
  Project,
} from './types'

export declare class ProjectService {
  private readonly projectRepository
  private readonly membershipRepository
  private readonly authorizationService
  private readonly entitlementService

  constructor(
    projectRepository: ProjectRepository,
    membershipRepository: MembershipRepository,
    authorizationService: AuthorizationService,
    entitlementService: EntitlementService,
  )

  listProjects(input: ListProjectsInput): Promise<Project[]>
  listActiveProjects(input: ListProjectsInput): Promise<Project[]>

  createProject(input: CreateProjectInput): Promise<Project>
  deleteProject(input: DeleteProjectInput): Promise<Project>
}