export type Actor = {
    userId: string;
    orgId?: string;
    role?: 'owner' | 'admin' | 'member';
};
export declare class DomainError extends Error {
    constructor(message: string);
}
export declare class AuthorizationError extends DomainError {
}
export declare class NotFoundError extends DomainError {
}
export declare class ConflictError extends DomainError {
}
/**
 * Explicit entitlement gate error.
 * Routes can map this cleanly to 403 without string matching.
 */
export declare class MissingEntitlementError extends DomainError {
    constructor(entitlementKey: string);
}
//# sourceMappingURL=service-contract.d.ts.map