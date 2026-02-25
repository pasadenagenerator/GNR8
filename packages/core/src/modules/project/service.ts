import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { MembershipRepository, ProjectRepository } from './repository'
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

  private async isUnlimited(orgId: string): Promise<boolean> {
    // entitlementService.has vključuje tudi trial fallback (če bi kdaj dodali unlimited v trial,
    // kar trenutno NE želimo), zato je to najbolj “čist” check.
    return this.entitlementService.has(orgId, 'project.unlimited')
  }

  async listProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.membershipRepository.getActorRoleInOrg({
        tx,
        actorUserId,
        orgId,
      })
      if (!role) {
        throw new NotFoundError('Actor membership not found for organization')
      }

      this.authorizationService.assert(role, 'organization.read')
      await this.entitlementService.assert(orgId, 'organization.read')

      return tx.listProjectsByOrgId({ orgId })
    })
  }

  async listActiveProjects(input: ListProjectsInput): Promise<Project[]> {
    return this.listProjects(input)
  }

  async listDeletedProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.membershipRepository.getActorRoleInOrg({
        tx,
        actorUserId,
        orgId,
      })
      if (!role) {
        throw new NotFoundError('Actor membership not found for organization')
      }

      this.authorizationService.assert(role, 'organization.read')
      await this.entitlementService.assert(orgId, 'organization.read')

      return tx.listDeletedProjectsByOrgId({ orgId })
    })
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()
    const name = String(input.name ?? '').trim()
    const slug = String(input.slug ?? '').trim().toLowerCase()

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

      // audit log
      await tx.writeAuditLog({
        orgId,
        actorUserId,
        action: 'project.create',
        entityType: 'project',
        entityId: project.id,
        metadata: {
          name: project.name,
          slug: project.slug,
        },
      })

      return project
    })
  }

  async deleteProject(input: DeleteProjectInput): Promise<Project> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()
    const projectId = String(input.projectId ?? '').trim()

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

      this.authorizationService.assert(role, 'organization.manage')
      await this.entitlementService.assert(orgId, 'project.create')

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing || existing.deletedAt) {
        throw new NotFoundError('Project not found')
      }

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
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()
    const projectId = String(input.projectId ?? '').trim()

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

      this.authorizationService.assert(role, 'organization.manage')
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