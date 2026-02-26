import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService, type Role } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { MembershipRepository, ProjectRepository, ProjectTransaction } from './repository'
import type {
  CreateProjectInput,
  DeleteProjectInput,
  ListProjectsInput,
  Project,
  RestoreProjectInput,
} from './types'

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
  ) {}

  private cleanRequired(value: unknown, name: string): string {
    const s = String(value ?? '').trim()
    if (!s) throw new DomainError(`${name} is required`)
    return s
  }

  private async getRoleOrThrow(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role> {
    const role = await this.membershipRepository.getActorRoleInOrg(input)
    if (!role) throw new NotFoundError('Actor membership not found for organization')
    return role
  }

  /**
   * Unlimited check.
   * Opomba: entitlementService.has vključuje tudi trial fallback.
   * Ker trenutno trial ne vključuje 'project.unlimited', je to OK.
   */
  private async isUnlimited(orgId: string): Promise<boolean> {
    return this.entitlementService.has(orgId, 'project.unlimited')
  }

  async listProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = this.cleanRequired(input.actorUserId, 'actorUserId')
    const orgId = this.cleanRequired(input.orgId, 'orgId')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.getRoleOrThrow({ tx, actorUserId, orgId })

      this.authorizationService.assert(role, 'organization.read')
      await this.entitlementService.assert(orgId, 'organization.read')

      return tx.listProjectsByOrgId({ orgId })
    })
  }

  async listActiveProjects(input: ListProjectsInput): Promise<Project[]> {
    return this.listProjects(input)
  }

  async listDeletedProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = this.cleanRequired(input.actorUserId, 'actorUserId')
    const orgId = this.cleanRequired(input.orgId, 'orgId')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.getRoleOrThrow({ tx, actorUserId, orgId })

      this.authorizationService.assert(role, 'organization.read')
      await this.entitlementService.assert(orgId, 'organization.read')

      return tx.listDeletedProjectsByOrgId({ orgId })
    })
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const actorUserId = this.cleanRequired(input.actorUserId, 'actorUserId')
    const orgId = this.cleanRequired(input.orgId, 'orgId')

    const name = this.cleanRequired(input.name, 'Project name')
    const slug = this.cleanRequired(input.slug, 'Project slug').toLowerCase()

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new DomainError(
        'Project slug must contain only lowercase letters, numbers, and hyphens',
      )
    }

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.getRoleOrThrow({ tx, actorUserId, orgId })

      this.authorizationService.assert(role, 'project.create')
      await this.entitlementService.assert(orgId, 'project.create')

      const unlimited = await this.isUnlimited(orgId)
      if (!unlimited) {
        const activeCount = await tx.countActiveProjects({ orgId })
        if (activeCount >= 1) {
          throw new DomainError(
            'Project limit reached for your plan. Upgrade to Pro for unlimited projects.',
          )
        }
      }

      const project = await tx.createProject({ orgId, name, slug })

      await tx.writeAuditLog({
        orgId,
        actorUserId,
        action: 'project.create',
        entityType: 'project',
        entityId: project.id,
        metadata: { name: project.name, slug: project.slug },
      })

      return project
    })
  }

  async deleteProject(input: DeleteProjectInput): Promise<Project> {
    const actorUserId = this.cleanRequired(input.actorUserId, 'actorUserId')
    const orgId = this.cleanRequired(input.orgId, 'orgId')
    const projectId = this.cleanRequired(input.projectId, 'projectId')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.getRoleOrThrow({ tx, actorUserId, orgId })

      this.authorizationService.assert(role, 'organization.manage')

      // Entitlement gate:
      // namenoma 'project.create', da trial uporabniki lahko tudi brišejo/restore-ajo projekte
      // (ker trial omogoča "osnovno uporabo platforme").
      await this.entitlementService.assert(orgId, 'project.create')

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing || existing.deletedAt) throw new NotFoundError('Project not found')

      await tx.softDeleteProject({ orgId, projectId })

      await tx.writeAuditLog({
        orgId,
        actorUserId,
        action: 'project.delete',
        entityType: 'project',
        entityId: projectId,
        metadata: {
          name: existing.name,
          slug: existing.slug,
          previousDeletedAt: existing.deletedAt,
        },
      })

      return { ...existing, deletedAt: new Date().toISOString() }
    })
  }

  async restoreProject(input: RestoreProjectInput): Promise<Project> {
    const actorUserId = this.cleanRequired(input.actorUserId, 'actorUserId')
    const orgId = this.cleanRequired(input.orgId, 'orgId')
    const projectId = this.cleanRequired(input.projectId, 'projectId')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.getRoleOrThrow({ tx, actorUserId, orgId })

      this.authorizationService.assert(role, 'organization.manage')

      // Enako kot delete: trial naj omogoča osnovno upravljanje z lastnimi projekti.
      await this.entitlementService.assert(orgId, 'project.create')

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing) throw new NotFoundError('Project not found')
      if (!existing.deletedAt) return existing

      const unlimited = await this.isUnlimited(orgId)
      if (!unlimited) {
        const activeCount = await tx.countActiveProjects({ orgId })
        if (activeCount >= 1) {
          throw new DomainError(
            'Project limit reached for your plan. Delete an active project or upgrade to Pro.',
          )
        }
      }

      await tx.restoreProject({ orgId, projectId })

      await tx.writeAuditLog({
        orgId,
        actorUserId,
        action: 'project.restore',
        entityType: 'project',
        entityId: projectId,
        metadata: {
          name: existing.name,
          slug: existing.slug,
          previousDeletedAt: existing.deletedAt,
        },
      })

      return { ...existing, deletedAt: null }
    })
  }
}