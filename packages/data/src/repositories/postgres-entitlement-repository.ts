import { DomainError } from '@gnr8/core'
import type {
  BillingTx,
  EntitlementKey,
  EntitlementRepository,
} from '@gnr8/core'
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
         and active = true
         and deleted_at is null`,
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
           subscription_id,
           active,
           deleted_at
         )
         values ($1, $2, null, true, null)
         on conflict (org_id, key)
         do update set
           active = true,
           deleted_at = null,
           updated_at = now()`,
        [input.orgId, key],
      )
    }
  }

  async deactivateEntitlements(
    tx: BillingTx,
    input: { orgId: string; stripeSubscriptionId?: string },
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)

    if (input.stripeSubscriptionId) {
      // NOTE: we do not have subscription_id linked to stripe id in this table.
      // So for now, we deactivate all entitlements for the org on cancellation.
      await pgTx.client.query(
        `update public.entitlements
         set active = false,
             deleted_at = now()
         where org_id = $1
           and active = true
           and deleted_at is null`,
        [input.orgId],
      )
      return
    }

    await pgTx.client.query(
      `update public.entitlements
       set active = false,
           deleted_at = now()
       where org_id = $1
         and active = true
         and deleted_at is null`,
      [input.orgId],
    )
  }

  async hasActiveEntitlement(
    tx: BillingTx,
    input: { orgId: string; entitlementKey: EntitlementKey },
  ): Promise<boolean> {
    const pgTx = this.asPostgresTx(tx)

    const result = await pgTx.client.query(
      `select 1
       from public.entitlements
       where org_id = $1
         and key = $2
         and active = true
         and deleted_at is null
       limit 1`,
      [input.orgId, input.entitlementKey],
    )

    return (result.rowCount ?? 0) > 0
  }
}