import { AuthorizationError } from '../../service-contract';
const ROLE_PERMISSIONS = {
    owner: [
        'organization.read',
        'organization.manage',
        'membership.manage',
        'project.create',
        'billing.manage',
    ],
    admin: [
        'organization.read',
        'organization.manage', // ← zdaj ima admin tudi org.manage
        'membership.manage',
        'project.create',
    ],
    member: ['organization.read'],
};
export class AuthorizationService {
    hasPermission(role, permission) {
        return ROLE_PERMISSIONS[role].includes(permission);
    }
    assert(role, permission) {
        if (!this.hasPermission(role, permission)) {
            throw new AuthorizationError(`Permission denied: ${permission}`);
        }
    }
}
