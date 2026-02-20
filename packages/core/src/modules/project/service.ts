import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { MembershipRepository, ProjectRepository } from './repository'
import type { CreateProjectInput, DeleteProjectInput, Project } from './types'

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

      // Plan-based entitlement: mora imeti pravico ustvarjat projekte
      await this.entitlementService.assert(orgId, 'project.create')

      // LIMIT LOGIKA:
      // Če org nima 'project.unlimited', dovolimo samo 1 aktiven projekt.
      // (Ne uporabljamo entitlementService.has(), ker je v runtime-u še ni.)
      let isUnlimited = false
      try {
        await this.entitlementService.assert(orgId, 'project.unlimited')
        isUnlimited = true
      } catch (e) {
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

  async deleteProject(input: DeleteProjectInput): Promise<Project> {
    const actorUserId = input.actorUserId.trim()
    const orgId = input.orgId.trim()
    const projectId = input.projectId.trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')
    if (!projectId) throw new DomainError('projectId is required')

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
      // (če želiš bolj granularno, kasneje dodamo 'project.delete')
      this.authorizationService.assert(role, 'organization.manage')

      // IMPORTANT:
      // Brisanje NE SME biti blokirano z billing entitlements,
      // ker mora Starter uporabnik (1 projekt) imeti možnost brisanja,
      // da se lahko vrne pod limit in ustvari novega.
      //
      // Zato tu namenoma ne kličemo:
      // await this.entitlementService.assert(orgId, 'organization.manage')
      //
      // Če želiš vseeno nek minimalen gating, lahko uporabiš:
      // await this.entitlementService.assert(orgId, 'organization.read')
      // ampak priporočam brez.

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing || existing.deletedAt) {
        throw new NotFoundError('Project not found')
      }

      await tx.softDeleteProject({ orgId, projectId })

      // vrnemo objekt (optimistic deletedAt)
      return {
        ...existing,
        deletedAt: new Date().toISOString(),
      }
    })
  }
}