import type { AuthorizationContext, AuthorizationDecision, Permission } from './types';
export interface AuthorizationPolicyRepository {
    listActorPermissions(context: AuthorizationContext): Promise<Permission[]>;
}
export declare class AuthorizationService {
    private readonly policyRepository;
    constructor(policyRepository: AuthorizationPolicyRepository);
    can(permission: Permission, context: AuthorizationContext): Promise<AuthorizationDecision>;
    assert(permission: Permission, context: AuthorizationContext): Promise<void>;
}
//# sourceMappingURL=service.d.ts.map