import { PostgresBillingTx } from './postgres-billing-transaction'

export class PostgresStripeEventsRepository {
  async markStripeEventProcessed(
    tx: PostgresBillingTx,
    input: { stripeEventId: string; eventType: string },
  ): Promise<boolean> {
    const result = await tx.client.query(
      `insert into public.stripe_events (stripe_event_id, type, processed_at)
       values ($1, $2, now())
       on conflict (stripe_event_id) do nothing
       returning stripe_event_id`,
      [input.stripeEventId, input.eventType],
    )

    return (result.rowCount ?? 0) > 0
  }
}