import type { BillingTx } from '../billing/repository'
import type {
  DeactivateEntitlementsInput,
  HasActiveEntitlementInput,
  ReplaceActiveEntitlementsInput,
} from './types'

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
}