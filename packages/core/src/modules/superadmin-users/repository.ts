import type { SuperadminOrgUser } from './types'

export interface SuperadminUsersRepository {
  /**
   * Explicit existence check (kept separate from listing).
   */
  orgExists(input: { orgId: string }): Promise<boolean>

  /**
   * Returns an array (possibly empty). Never returns null.
   */
  listOrgUsers(input: { orgId: string }): Promise<SuperadminOrgUser[]>
}