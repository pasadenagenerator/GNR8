import { DomainError, NotFoundError } from '../../service-contract'
import type { SuperadminOrgRepository } from './repository'
import type {
  CreateSuperadminOrgInput,
  CreateSuperadminOrgOutput,
  GetSuperadminOrgInput,
  ListSuperadminOrgsInput,
  ListSuperadminOrgsOutput,
  SuperadminOrgDetails,
} from './types'

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export class SuperadminOrgService {
  constructor(private readonly repo: SuperadminOrgRepository) {}

  async listOrgs(input: ListSuperadminOrgsInput): Promise<ListSuperadminOrgsOutput> {
    const limit = clampInt(input?.limit, 1, 500, 500)

    const rows = await this.repo.listOrgs({ limit })
    const orgs = rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      createdAt: r.created_at ? String(r.created_at) : null,
      projectsCount: Number(r.projects_count ?? 0),
    }))

    return { orgs }
  }

  async createOrg(input: CreateSuperadminOrgInput): Promise<CreateSuperadminOrgOutput> {
    const name = String(input?.name ?? '').trim()
    const rawSlug = input?.slug == null ? '' : String(input.slug).trim().toLowerCase()

    if (!name) throw new DomainError('name is required')

    const slug = rawSlug || slugify(name)
    if (!slug) throw new DomainError('slug is required')

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new DomainError('slug must contain only lowercase letters, numbers, and hyphens')
    }

    // repo bo vrgel ConflictError (409) če je slug unique violation
    const created = await this.repo.createOrg({ name, slug })

    return {
      org: {
        id: String(created.id),
        name: String(created.name),
        slug: created.slug ? String(created.slug) : null,
        createdAt: created.created_at ? String(created.created_at) : null,
        updatedAt: created.updated_at ? String(created.updated_at) : null,
        trialStartedAt: created.trial_started_at ? String(created.trial_started_at) : null,
        trialEndsAt: created.trial_ends_at ? String(created.trial_ends_at) : null,
      },
    }
  }

  async getOrgDetails(input: GetSuperadminOrgInput): Promise<SuperadminOrgDetails> {
    const orgId = String(input?.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    const org = await this.repo.getOrgById({ orgId })
    if (!org) throw new NotFoundError('Org not found')

    const [active, deleted] = await Promise.all([
      this.repo.listProjectsByOrgId({ orgId, filter: 'active' }),
      this.repo.listProjectsByOrgId({ orgId, filter: 'deleted' }),
    ])

    return {
      org: {
        id: String(org.id),
        name: String(org.name),
        createdAt: org.created_at ? String(org.created_at) : null,
        trialStartedAt: org.trial_started_at ? String(org.trial_started_at) : null,
        trialEndsAt: org.trial_ends_at ? String(org.trial_ends_at) : null,
      },
      projects: active.map((r) => ({
        id: String(r.id),
        orgId: String(r.org_id),
        name: String(r.name),
        slug: String(r.slug),
        createdAt: r.created_at ? String(r.created_at) : null,
        deletedAt: r.deleted_at ? String(r.deleted_at) : null,
      })),
      deletedProjects: deleted.map((r) => ({
        id: String(r.id),
        orgId: String(r.org_id),
        name: String(r.name),
        slug: String(r.slug),
        createdAt: r.created_at ? String(r.created_at) : null,
        deletedAt: r.deleted_at ? String(r.deleted_at) : null,
      })),
    }
  }
}