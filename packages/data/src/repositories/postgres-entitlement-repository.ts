import { DomainError } from '@gnr8/core'
import type { BillingTx, EntitlementKey, EntitlementRepository } from '@gnr8/core'
import type { Pool, QueryResult } from 'pg'
import { getPool } from '../db/pool'
import { PostgresBillingTx } from './postgres-billing-transaction'

type HasEntRow = { ok: number }
type TrialRow = { trial_started_at: string | null; trial_ends_at: string | null }

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
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    await pgTx.client.query(
      `update public.entitlements
       set active = false,
           deleted_at = now()
       where org_id = $1
         and active = true
         and deleted_at is null`,
      [orgId],
    )

    if (input.entitlementKeys.length === 0) return

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
           updated_at = now(),
           subscription_id = excluded.subscription_id`,
        [orgId, key, input.stripeSubscriptionId],
      )
    }
  }

  async deactivateEntitlements(
    tx: BillingTx,
    input: { orgId: string; stripeSubscriptionId?: string },
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    // NOTE: trenutno deaktiviramo vse active entitlements za org
    await pgTx.client.query(
      `update public.entitlements
       set active = false,
           deleted_at = now()
       where org_id = $1
         and active = true
         and deleted_at is null`,
      [orgId],
    )
  }

  // READ-ONLY entitlement guard (NO tx)
  async hasActiveEntitlement(input: {
    orgId: string
    entitlementKey: EntitlementKey
  }): Promise<boolean> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return false

    const client = await this.pool.connect()
    try {
      const result: QueryResult<HasEntRow> = await client.query(
        `select 1 as ok
         from public.entitlements
         where org_id = $1
           and key = $2
           and active = true
           and deleted_at is null
         limit 1`,
        [orgId, input.entitlementKey],
      )

      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Trial window reader (NO tx)
   */
  async getOrgTrialWindow(input: {
    orgId: string
  }): Promise<{
    trialStartedAt: string | null
    trialEndsAt: string | null
  } | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res: QueryResult<TrialRow> = await client.query(
        `select
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
         from public.organizations
         where id = $1
         limit 1`,
        [orgId],
      )

      const row = res.rows[0]
      if (!row) return null

      return {
        trialStartedAt: row.trial_started_at ? String(row.trial_started_at) : null,
        trialEndsAt: row.trial_ends_at ? String(row.trial_ends_at) : null,
      }
    } finally {
      client.release()
    }
  }
}