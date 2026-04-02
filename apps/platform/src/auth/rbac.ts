export type AgencyMembershipRole = 'owner' | 'admin' | 'member'
export type AgencyRole = AgencyMembershipRole | 'superadmin'

export type AgencyAction =
  | 'view_dashboard'
  | 'view_members'
  | 'view_client_users'
  | 'create_client'
  | 'edit_client_settings'
  | 'invite_user'
  | 'invite_client_user'
  | 'edit_member_role'
  | 'edit_client_user'
  | 'remove_member'
  | 'remove_client_user'
  | 'edit_agency_settings'
  | 'edit_agency_slug'
  | 'edit_owner_profile'
  | 'change_password'
  | 'delete_agency'
  | 'run_migration'
  | 'approve_migration'
  | 'publish'
  | 'assign_client'
  | 'bulk_actions'

export type AgencyActorMode = 'membership' | 'admin_view'

export type AgencyMembershipLike = {
  agency_id: string
  role: unknown
}

export type AgencyUserLike = {
  isSuperadmin?: boolean
  memberships?: AgencyMembershipLike[] | null
}

const ROLE_RANK: Record<AgencyMembershipRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
}

const ACTION_MATRIX: Record<AgencyRole, Record<AgencyAction, boolean>> = {
  superadmin: {
    view_dashboard: true,
    view_members: true,
    view_client_users: true,
    create_client: true,
    edit_client_settings: true,
    invite_user: true,
    invite_client_user: true,
    edit_member_role: true,
    edit_client_user: true,
    remove_member: true,
    remove_client_user: true,
    edit_agency_settings: true,
    edit_agency_slug: true,
    edit_owner_profile: true,
    change_password: true,
    delete_agency: true,
    run_migration: true,
    approve_migration: true,
    publish: true,
    assign_client: true,
    bulk_actions: true,
  },
  owner: {
    view_dashboard: true,
    view_members: true,
    view_client_users: true,
    create_client: true,
    edit_client_settings: true,
    invite_user: true,
    invite_client_user: true,
    edit_member_role: true,
    edit_client_user: true,
    remove_member: true,
    remove_client_user: true,
    edit_agency_settings: true,
    edit_agency_slug: true,
    edit_owner_profile: true,
    change_password: true,
    delete_agency: true,
    run_migration: true,
    approve_migration: true,
    publish: true,
    assign_client: true,
    bulk_actions: true,
  },
  admin: {
    view_dashboard: true,
    view_members: true,
    view_client_users: true,
    create_client: true,
    edit_client_settings: true,
    invite_user: false,
    invite_client_user: true,
    edit_member_role: false,
    edit_client_user: true,
    remove_member: false,
    remove_client_user: true,
    edit_agency_settings: true,
    edit_agency_slug: false,
    edit_owner_profile: false,
    change_password: true,
    delete_agency: false,
    run_migration: true,
    approve_migration: true,
    publish: true,
    assign_client: true,
    bulk_actions: true,
  },
  member: {
    view_dashboard: true,
    view_members: true,
    view_client_users: false,
    create_client: false,
    edit_client_settings: false,
    invite_user: false,
    invite_client_user: false,
    edit_member_role: false,
    edit_client_user: false,
    remove_member: false,
    remove_client_user: false,
    edit_agency_settings: false,
    edit_agency_slug: false,
    edit_owner_profile: false,
    change_password: true,
    delete_agency: false,
    run_migration: false,
    approve_migration: false,
    publish: false,
    assign_client: false,
    bulk_actions: false,
  },
}

function normalizeRole(value: unknown): AgencyMembershipRole | null {
  const role = String(value ?? '').trim().toLowerCase()
  if (role === 'owner' || role === 'admin' || role === 'member') return role
  return null
}

function normalizeAgencyId(value: unknown): string {
  return String(value ?? '').trim()
}

export function resolveMembershipRole(roles: ReadonlyArray<unknown>): AgencyMembershipRole | null {
  let resolved: AgencyMembershipRole | null = null

  for (const candidate of roles) {
    const normalized = normalizeRole(candidate)
    if (!normalized) continue
    if (!resolved || ROLE_RANK[normalized] > ROLE_RANK[resolved]) {
      resolved = normalized
    }
  }

  return resolved
}

export function getUserRoleForAgency(user: AgencyUserLike | null | undefined, agencyId: string): AgencyRole | null {
  if (user?.isSuperadmin === true) return 'superadmin'

  const normalizedAgencyId = normalizeAgencyId(agencyId)
  if (!normalizedAgencyId) return null

  const memberships = Array.isArray(user?.memberships) ? user.memberships : []
  const scopedRoles = memberships
    .filter((membership) => normalizeAgencyId(membership.agency_id) === normalizedAgencyId)
    .map((membership) => membership.role)

  return resolveMembershipRole(scopedRoles)
}

export function canPerformAction(role: AgencyRole | null | undefined, action: AgencyAction): boolean {
  if (!role) return false
  const roleMatrix = ACTION_MATRIX[role]
  if (!roleMatrix) return false
  return roleMatrix[action] === true
}
