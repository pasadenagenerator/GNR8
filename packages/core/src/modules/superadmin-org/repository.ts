export type SuperadminOrgRow = {
  id: string
  name: string
  created_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

export type SuperadminProjectRow = {
  id: string
  org_id: string
  name: string
  slug: string
  created_at: string | null
  deleted_at: string | null
}

/** NEW: list row */
export type SuperadminOrgListRow = {
  id: string
  name: string
  created_at: string | null
  projects_count: string // comes from SQL: count(...)::text
}

/** NEW: created org row */
export type SuperadminCreatedOrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

export interface SuperadminOrgRepository {
  getOrgById(input: { orgId: string }): Promise<SuperadminOrgRow | null>

  listProjectsByOrgId(input: {
    orgId: string
    filter: 'active' | 'deleted'
  }): Promise<SuperadminProjectRow[]>

  /** NEW */
  listOrgs(input: { limit: number }): Promise<SuperadminOrgListRow[]>

  /** NEW */
  createOrg(input: { name: string; slug: string | null }): Promise<SuperadminCreatedOrgRow>
}