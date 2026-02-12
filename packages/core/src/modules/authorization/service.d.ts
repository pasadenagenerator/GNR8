import type { Permission, Role } from './types';
export declare class AuthorizationService {
    hasPermission(role: Role, permission: Permission): boolean;
    assert(role: Role, permission: Permission): void;
}
//# sourceMappingURL=service.d.ts.map