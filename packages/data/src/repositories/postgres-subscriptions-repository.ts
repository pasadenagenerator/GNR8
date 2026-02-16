import type { BillingSubscription } from '@gnr8/core'
import type { PostgresBillingTx } from './postgres-billing-transaction'

export class PostgresSubscriptionsRepository {
  async upsertSubscription(
    tx: PostgresBillingTx,
    subscription: Omit<BillingSubscription, 'id'>,
  ): Promise<BillingSubscription> {
    const result = await tx.client.query(
      `
      insert into public.subscriptions (
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        current_period_end,
        plan_key,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (stripe_subscription_id) do update
      set
        org_id = excluded.org_id,
        stripe_customer_id = excluded.stripe_customer_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        plan_key = excluded.plan_key,
        updated_at = now()
      returning
        id,
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        current_period_end,
        plan_key
      `,
      [
        subscription.orgId,
        subscription.stripeCustomerId,
        subscription.stripeSubscriptionId,
        subscription.status,
        subscription.currentPeriodEnd,
        subscription.planKey,
      ],
    )

    const row = result.rows[0]
    return {
      id: row.id,
      orgId: row.org_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      status: row.status,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
      planKey: row.plan_key,
    }
  }

  async findSubscriptionByStripeSubscriptionId(
    tx: PostgresBillingTx,
    stripeSubscriptionId: string,
  ): Promise<BillingSubscription | null> {
    const result = await tx.client.query(
      `
      select
        id,
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        current_period_end,
        plan_key
      from public.subscriptions
      where stripe_subscription_id = $1
        and deleted_at is null
      limit 1
      `,
      [stripeSubscriptionId],
    )

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.id,
      orgId: row.org_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      status: row.status,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
      planKey: row.plan_key,
    }
  }
}