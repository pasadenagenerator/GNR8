import { DomainError } from '@gnr8/core'
import type {
  BillingTx,
  EntitlementKey,
  EntitlementRepository,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'
import { PostgresBillingTx } from './postgres-billing-transaction'

export class PostgresEntitlementRepository implements EntitlementRepository {
  constructor(private readonly pool: Pool = getPool()) {}

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
         values ($1, $2, $3, true, null)
         on conflict (org_id, key)
         do update set
           active = true,
           deleted_at = null,
           updated_at = now()`,
        [input.orgId, key, input.stripeSubscriptionId],
      )
    }
  }

  async deactivateEntitlements(
    tx: BillingTx,
    input: { orgId: string; stripeSubscriptionId?: string },
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)

    // NOTE: entitlement rows are not strictly linked to stripe_subscription_id yet
    // so we deactivate all active entitlements for the org
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

  // READ-ONLY entitlement guard (NO tx)
  async hasActiveEntitlement(input: {
    orgId: string
    entitlementKey: EntitlementKey
  }): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
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
    } finally {
      client.release()
    }
  }
}