export type SuperadminOrg = {
  id: string
  name: string
  createdAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
}

export type SuperadminProject = {
  id: string
  orgId: string
  name: string
  slug: string
  createdAt: string | null
  deletedAt: string | null
}

export type GetSuperadminOrgInput = {
  orgId: string
}

export type SuperadminOrgDetails = {
  org: SuperadminOrg
  projects: SuperadminProject[]
  deletedProjects: SuperadminProject[]
}

/** NEW: list orgs */
export type SuperadminOrgListItem = {
  id: string
  name: string
  createdAt: string | null
  projectsCount: number
}

export type ListSuperadminOrgsInput = {
  limit?: number
}

export type ListSuperadminOrgsOutput = {
  orgs: SuperadminOrgListItem[]
}

/** NEW: create org */
export type CreateSuperadminOrgInput = {
  name: string
  slug?: string | null
}

export type CreateSuperadminOrgOutput = {
  org: {
    id: string
    name: string
    slug: string | null
    createdAt: string | null
    updatedAt: string | null
    trialStartedAt: string | null
    trialEndsAt: string | null
  }
}