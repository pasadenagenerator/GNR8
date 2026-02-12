import { AuthorizationError } from '../../service-contract'
import type { Permission, Role } from './types'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'organization.read',
    'organization.manage',
    'membership.manage',
    'project.create',
    'billing.manage',
  ],
  admin: [
    'organization.read',
    'membership.manage',
    'project.create',
  ],
  member: ['organization.read'],
}

export class AuthorizationService {
  hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission)
  }

  assert(role: Role, permission: Permission): void {
    if (!this.hasPermission(role, permission)) {
      throw new AuthorizationError(`Permission denied: ${permission}`)
    }
  }
}
