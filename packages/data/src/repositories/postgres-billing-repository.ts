import { DomainError } from '@gnr8/core'
import type {
  BillingRepository,
  BillingSubscription,
  BillingTx,
} from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'
import { PostgresBillingTx } from './postgres-billing-transaction'
import { PostgresStripeEventsRepository } from './postgres-stripe-events-repository'
import { PostgresSubscriptionsRepository } from './postgres-subscriptions-repository'

export class PostgresBillingRepository implements BillingRepository {
  private readonly subscriptionsRepository =
    new PostgresSubscriptionsRepository()
  private readonly stripeEventsRepository =
    new PostgresStripeEventsRepository()

  constructor(private readonly pool: Pool = getPool()) {}

  private asPostgresTx(tx: BillingTx): PostgresBillingTx {
    if (!(tx instanceof PostgresBillingTx)) {
      throw new DomainError('Unsupported billing transaction implementation')
    }
    return tx
  }

  async withTransaction<T>(fn: (tx: PostgresBillingTx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const tx = new PostgresBillingTx(client)
      const result = await fn(tx)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  markStripeEventProcessed(
    tx: BillingTx,
    input: { stripeEventId: string; eventType: string },
  ): Promise<boolean> {
    return this.stripeEventsRepository.markStripeEventProcessed(
      this.asPostgresTx(tx),
      input,
    )
  }

  upsertSubscription(
    tx: BillingTx,
    subscription: BillingSubscription,
  ): Promise<BillingSubscription> {
    return this.subscriptionsRepository.upsertSubscription(
      this.asPostgresTx(tx),
      subscription,
    )
  }

  findSubscriptionByStripeSubscriptionId(
    tx: BillingTx,
    stripeSubscriptionId: string,
  ): Promise<BillingSubscription | null> {
    return this.subscriptionsRepository.findSubscriptionByStripeSubscriptionId(
      this.asPostgresTx(tx),
      stripeSubscriptionId,
    )
  }

  // DODANO — required by BillingService
  async markSubscriptionCanceled(
    tx: BillingTx,
    stripeSubscriptionId: string,
  ): Promise<void> {
    const pgTx = this.asPostgresTx(tx)

    await pgTx.client.query(
      `update public.subscriptions
       set status = 'canceled',
           updated_at = now()
       where stripe_subscription_id = $1`,
      [stripeSubscriptionId],
    )
  }
}