import type { BillingSubscription } from '@gnr8/core'
import { PostgresBillingTx } from './postgres-billing-transaction'

export class PostgresSubscriptionsRepository {
  async upsertSubscription(
    tx: PostgresBillingTx,
    subscription: BillingSubscription,
  ): Promise<BillingSubscription> {
    const result = await tx.client.query(
      `
      insert into public.subscriptions (
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_key,
        status,
        current_period_end
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (stripe_subscription_id)
      do update set
        org_id = excluded.org_id,
        stripe_customer_id = excluded.stripe_customer_id,
        plan_key = excluded.plan_key,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        updated_at = now(),
        deleted_at = null
      returning
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_key,
        status,
        current_period_end
      `,
      [
        subscription.orgId, // uuid (string)
        subscription.stripeCustomerId, // text
        subscription.stripeSubscriptionId, // text (sub_...)
        subscription.planKey, // text
        subscription.status, // text
        subscription.currentPeriodEnd, // timestamptz or null
      ],
    )

    const row = result.rows[0]
    return {
      orgId: row.org_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      planKey: row.plan_key,
      status: row.status,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    }
  }

  async findSubscriptionByStripeSubscriptionId(
    tx: PostgresBillingTx,
    stripeSubscriptionId: string,
  ): Promise<BillingSubscription | null> {
    const result = await tx.client.query(
      `
      select
        org_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_key,
        status,
        current_period_end
      from public.subscriptions
      where stripe_subscription_id = $1
        and deleted_at is null
      limit 1
      `,
      [stripeSubscriptionId],
    )

    if ((result.rowCount ?? 0) === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      orgId: row.org_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      planKey: row.plan_key,
      status: row.status,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    }
  }

  async markSubscriptionCanceled(
    tx: PostgresBillingTx,
    stripeSubscriptionId: string,
  ): Promise<void> {
    await tx.client.query(
      `
      update public.subscriptions
      set status = 'canceled',
          updated_at = now()
      where stripe_subscription_id = $1
      `,
      [stripeSubscriptionId],
    )
  }
}