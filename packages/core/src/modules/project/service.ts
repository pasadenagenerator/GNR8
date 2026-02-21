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

  // ACTIVE projects
  async listProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = input.actorUserId.trim()
    const orgId = input.orgId.trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.membershipRepository.getActorRoleInOrg({
        tx,
        actorUserId,
        orgId,
      })
      if (!role) throw new NotFoundError('Actor membership not found for organization')

      this.authorizationService.assert(role, 'organization.read')
      // zadržimo simple: če user lahko dela s projekti, mu pustimo brati org projekte
      await this.entitlementService.assert(orgId, 'project.create')

      return tx.listProjectsByOrgId({ orgId })
    })
  }

  // DELETED projects (admin UX)
  async listDeletedProjects(input: ListProjectsInput): Promise<Project[]> {
    const actorUserId = input.actorUserId.trim()
    const orgId = input.orgId.trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    return this.projectRepository.withTransaction(async (tx) => {
      const role = await this.membershipRepository.getActorRoleInOrg({
        tx,
        actorUserId,
        orgId,
      })
      if (!role) throw new NotFoundError('Actor membership not found for organization')

      this.authorizationService.assert(role, 'organization.read')
      await this.entitlementService.assert(orgId, 'project.create')

      return tx.listDeletedProjectsByOrgId({ orgId })
    })
  }

  // backwards-compatible alias
  async listActiveProjects(input: ListProjectsInput): Promise<Project[]> {
    return this.listProjects(input)
  }

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
      if (!role) throw new NotFoundError('Actor membership not found for organization')

      this.authorizationService.assert(role, 'project.create')
      await this.entitlementService.assert(orgId, 'project.create')

      // Unlimited check brez .has()
      let isUnlimited = false
      try {
        await this.entitlementService.assert(orgId, 'project.unlimited')
        isUnlimited = true
      } catch (e) {
        if (e instanceof DomainError) isUnlimited = false
        else throw e
      }

      if (!isUnlimited) {
        const activeCount = await tx.countActiveProjects({ orgId })
        if (activeCount >= 1) {
          throw new DomainError(
            'Project limit reached for your plan. Upgrade to Pro for unlimited projects.',
          )
        }
      }

      return tx.createProject({ orgId, name, slug })
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
      if (!role) throw new NotFoundError('Actor membership not found for organization')

      this.authorizationService.assert(role, 'organization.manage')
      // Ne zahtevaj organization.manage entitlement, ker ga (še) nimaš na planih.
      await this.entitlementService.assert(orgId, 'project.create')

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing || existing.deletedAt) throw new NotFoundError('Project not found')

      await tx.softDeleteProject({ orgId, projectId })
      return { ...existing, deletedAt: new Date().toISOString() }
    })
  }

  async restoreProject(input: RestoreProjectInput): Promise<Project> {
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
      if (!role) throw new NotFoundError('Actor membership not found for organization')

      this.authorizationService.assert(role, 'organization.manage')
      await this.entitlementService.assert(orgId, 'project.create')

      const existing = await tx.findProjectById({ orgId, projectId })
      if (!existing) throw new NotFoundError('Project not found')
      if (!existing.deletedAt) return existing // idempotent

      await tx.restoreProject({ orgId, projectId })
      return { ...existing, deletedAt: null }
    })
  }
}