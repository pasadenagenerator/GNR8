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

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')
    if (!name) throw new DomainError('Project name is required')
    if (!slug) throw new DomainError('Project slug is required')

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

      // Billing / plan-based entitlement (READ-ONLY, brez tx)
      await this.entitlementService.assert(orgId, 'project.create')

      // LIMIT LOGIKA:
      // Pro/Agency (oz. kdorkoli z entitlement "project.unlimited") → brez limita
      const hasUnlimited = await this.entitlementService.has(
        orgId,
        'project.unlimited',
      )

      // Starter → max 1 aktiven projekt
      if (!hasUnlimited) {
        const activeCount = await tx.countActiveProjects({ orgId })
        if (activeCount >= 1) {
          throw new DomainError(
            'Project limit reached for current plan (max 1 project). Upgrade to Pro for unlimited projects.',
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