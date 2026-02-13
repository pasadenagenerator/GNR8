import type { BillingSubscription } from '@gnr8/core'
import type { QueryResult } from 'pg'
import { PostgresBillingTx } from './postgres-billing-transaction'

type DbSubscriptionRow = {
  org_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  plan_key: string
  status: BillingSubscription['status']
  current_period_end: string | null
}

function mapSubscription(row: DbSubscriptionRow): BillingSubscription {
  return {
    orgId: row.org_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    planKey: row.plan_key,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
  }
}

export class PostgresSubscriptionsRepository {
  async upsertSubscription(
    tx: PostgresBillingTx,
    subscription: BillingSubscription,
  ): Promise<BillingSubscription> {
    const result: QueryResult<DbSubscriptionRow> = await tx.client.query(
      `insert into public.subscriptions (
         org_id,
         stripe_customer_id,
         stripe_subscription_id,
         plan_key,
         status,
         current_period_end,
         deleted_at
       )
       values ($1, $2, $3, $4, $5, $6, null)
       on conflict (stripe_subscription_id)
       do update set
         org_id = excluded.org_id,
         stripe_customer_id = excluded.stripe_customer_id,
         plan_key = excluded.plan_key,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         deleted_at = null
       returning
         org_id,
         stripe_customer_id,
         stripe_subscription_id,
         plan_key,
         status,
         current_period_end`,
      [
        subscription.orgId,
        subscription.stripeCustomerId,
        subscription.stripeSubscriptionId,
        subscription.planKey,
        subscription.status,
        subscription.currentPeriodEnd,
      ],
    )

    return mapSubscription(result.rows[0])
  }

  async findSubscriptionByStripeSubscriptionId(
    tx: PostgresBillingTx,
    stripeSubscriptionId: string,
  ): Promise<BillingSubscription | null> {
    const result: QueryResult<DbSubscriptionRow> = await tx.client.query(
      `select
         org_id,
         stripe_customer_id,
         stripe_subscription_id,
         plan_key,
         status,
         current_period_end
       from public.subscriptions
       where stripe_subscription_id = $1
       limit 1`,
      [stripeSubscriptionId],
    )

    if (result.rowCount === 0) {
      return null
    }

    return mapSubscription(result.rows[0])
  }
}
