import type { BillingTx } from '../billing/repository'
import type {
  DeactivateEntitlementsInput,
  HasActiveEntitlementInput,
  ReplaceActiveEntitlementsInput,
} from './types'

export type OrgTrialWindow = {
  trialStartedAt: string | null
  trialEndsAt: string | null
}

export type GetOrgTrialWindowInput = {
  orgId: string
}

export interface EntitlementRepository {
  hasActiveEntitlement(input: HasActiveEntitlementInput): Promise<boolean>

  replaceActiveEntitlements(
    tx: BillingTx,
    input: ReplaceActiveEntitlementsInput,
  ): Promise<void>

  deactivateEntitlements(
    tx: BillingTx,
    input: DeactivateEntitlementsInput,
  ): Promise<void>

  /**
   * Trial window for org (read-only).
   * Used as fallback entitlements when no paid entitlements are active.
   */
  getOrgTrialWindow(input: GetOrgTrialWindowInput): Promise<OrgTrialWindow | null>
}