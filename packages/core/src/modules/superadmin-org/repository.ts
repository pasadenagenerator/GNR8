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

export interface SuperadminOrgRepository {
  getOrgById(input: { orgId: string }): Promise<SuperadminOrgRow | null>

  listProjectsByOrgId(input: {
    orgId: string
    deleted: boolean
  }): Promise<SuperadminProjectRow[]>
}