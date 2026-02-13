import { DomainError } from '@gnr8/core'
import type { BillingTx, EntitlementKey, EntitlementRepository } from '@gnr8/core'
import { PostgresBillingTx } from './postgres-billing-transaction'

export class PostgresEntitlementRepository implements EntitlementRepository {
  private asPostgresTx(tx: BillingTx): PostgresBillingTx {
    if (!(tx instanceof PostgresBillingTx)) {
      throw new DomainError('Unsupported billing transaction implementation')
    }
    return tx
  }

  async replaceActiveEntitlements(
    tx: BillingTx,
    input: {
      orgId: string
      entitlementKeys: EntitlementKey[]
      stripeSubscriptionId: string
    },
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)
    await pgTx.client.query(
      `update public.entitlements
       set active = false,
           deleted_at = now()
       where org_id = $1
         and active = true`,
      [input.orgId],
    )

    if (input.entitlementKeys.length === 0) {
      return
    }

    for (const key of input.entitlementKeys) {
      await pgTx.client.query(
        `insert into public.entitlements (
           org_id,
           key,
           granted_by_subscription_id,
           active,
           deleted_at
         )
         values ($1, $2, $3, true, null)`,
        [input.orgId, key, input.stripeSubscriptionId],
      )
    }
  }

  async deactivateEntitlements(
    tx: BillingTx,
    input: { orgId: string; stripeSubscriptionId?: string },
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)

    if (input.stripeSubscriptionId) {
      await pgTx.client.query(
        `update public.entitlements
         set active = false,
             deleted_at = now()
         where org_id = $1
           and granted_by_subscription_id = $2
           and active = true`,
        [input.orgId, input.stripeSubscriptionId],
      )
      return
    }

    await pgTx.client.query(
      `update public.entitlements
       set active = false,
           deleted_at = now()
       where org_id = $1
         and active = true`,
      [input.orgId],
    )
  }
}
