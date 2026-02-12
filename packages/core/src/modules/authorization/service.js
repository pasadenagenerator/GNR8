import { AuthorizationError, DomainError } from '../../service-contract';
export class AuthorizationService {
    policyRepository;
    constructor(policyRepository) {
        this.policyRepository = policyRepository;
    }
    async can(permission, context) {
        if (!context.actor.userId) {
            throw new DomainError('actor userId is required');
        }
        // Placeholder behavior: permission resolution will be backed by membership/entitlements later.
        const permissions = await this.policyRepository.listActorPermissions(context);
        const allowed = permissions.includes(permission);
        return allowed
            ? { allowed: true }
            : { allowed: false, reason: `Missing permission: ${permission}` };
    }
    async assert(permission, context) {
        const decision = await this.can(permission, context);
        if (!decision.allowed) {
            throw new AuthorizationError(decision.reason ?? `Permission denied: ${permission}`);
        }
    }
}
