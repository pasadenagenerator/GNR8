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