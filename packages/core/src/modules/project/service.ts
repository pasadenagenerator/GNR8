import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { MembershipRepository, ProjectRepository } from './repository'
import type { CreateProjectInput, Project } from './types'

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async createProject(input: CreateProjectInput): Promise<Project> {
    const actorUserId = input.actorUserId.trim()
    const orgId = input.orgId.trim()
    const name = input.name.trim()
    const slug = input.slug.trim().toLowerCase()

    if (!actorUserId) {
      throw new DomainError('actorUserId is required')
    }

    if (!orgId) {
      throw new DomainError('orgId is required')
    }

    if (!name) {
      throw new DomainError('Project name is required')
    }

    if (!slug) {
      throw new DomainError('Project slug is required')
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new DomainError(
        'Project slug must contain only lowercase letters, numbers, and hyphens',
      )
    }

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.membershipRepository.getActorRoleInOrg({
        tx,
        actorUserId,
        orgId,
      })

      if (!role) {
        throw new NotFoundError('Actor membership not found for organization')
      }

      // Role-based permission
      this.authorizationService.assert(role, 'project.create')

      // Plan-based entitlement: mora imeti pravico ustvarjat projekte
      await this.entitlementService.assert(orgId, 'project.create')

      // LIMIT LOGIKA:
      // Če org nima 'project.unlimited', dovolimo samo 1 aktiven projekt.
      // Namesto entitlementService.has() uporabljamo assert() + try/catch,
      // ker has() trenutno ni del runtime EntitlementService.
      let isUnlimited = false
      try {
        await this.entitlementService.assert(orgId, 'project.unlimited')
        isUnlimited = true
      } catch (e) {
        // Če je DomainError, pomeni "nima entitlementa" -> ni unlimited.
        // Če je kaj drugega, je sistemska napaka in jo želimo videt.
        if (e instanceof DomainError) {
          isUnlimited = false
        } else {
          throw e
        }
      }

      if (!isUnlimited) {
        const activeCount = await tx.countActiveProjects({ orgId })
        if (activeCount >= 1) {
          throw new DomainError(
            'Project limit reached for your plan. Upgrade to Pro for unlimited projects.',
          )
        }
      }

      return tx.createProject({
        orgId,
        name,
        slug,
      })
    })
  }
}