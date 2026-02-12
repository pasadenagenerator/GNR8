import { AuthorizationError, DomainError } from '../../service-contract'
import type {
  AuthorizationContext,
  AuthorizationDecision,
  Permission,
} from './types'

export interface AuthorizationPolicyRepository {
  listActorPermissions(context: AuthorizationContext): Promise<Permission[]>
}

export class AuthorizationService {
  constructor(private readonly policyRepository: AuthorizationPolicyRepository) {}

  async can(
    permission: Permission,
    context: AuthorizationContext,
  ): Promise<AuthorizationDecision> {
    if (!context.actor.userId) {
      throw new DomainError('actor userId is required')
    }

    // Placeholder behavior: permission resolution will be backed by membership/entitlements later.
    const permissions = await this.policyRepository.listActorPermissions(context)
    const allowed = permissions.includes(permission)

    return allowed
      ? { allowed: true }
      : { allowed: false, reason: `Missing permission: ${permission}` }
  }

  async assert(
    permission: Permission,
    context: AuthorizationContext,
  ): Promise<void> {
    const decision = await this.can(permission, context)
    if (!decision.allowed) {
      throw new AuthorizationError(
        decision.reason ?? `Permission denied: ${permission}`,
      )
    }
  }
}
