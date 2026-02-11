/*
SERVICE CONTRACT — PLATFORM LAW

Every domain module MUST expose a single Service.

Routes are forbidden from touching repositories directly.

Flow:

Route -> Service -> Repository -> DB

NEVER:

Route -> Repository
Service -> foreign repository
Repository -> Service
*/

export type Actor = {
  userId: string
  orgId?: string
  role?: 'owner' | 'admin' | 'member'
}

/*
All services MUST:

- accept Actor when authorization matters
- throw domain errors (NOT generic errors)
- be idempotent when possible
- prefer transactions for multi-write flows
*/

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class AuthorizationError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}