import { DomainError, type StripeWebhookEvent } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getBillingService } from '@/src/di/core'

function isStripeCustomerDeleted(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer {
  return (customer as Stripe.DeletedCustomer).deleted === true
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !stripeWebhookSecret) {
      return NextResponse.json(
        { error: 'Stripe webhook is not configured' },
        { status: 500 },
      )
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 },
      )
    }

    const stripe = new Stripe(stripeSecretKey)

    // ✅ Raw body as bytes (most reliable for signature verification)
    const rawBody = Buffer.from(await request.arrayBuffer())

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    ) as Stripe.Event

    /**
     * Fallback: če subscription metadata nima org_id (npr. subscription ustvarjen v Stripe Dashboardu),
     * poskusi prebrati org_id iz Stripe Customer metadata.
     *
     * Opcijsko: zapiši org_id nazaj na subscription.metadata,
     * da bodo vsi naslednji eventi imeli org_id direktno na subscription objektu.
     */
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription

      const hasOrgId =
        typeof sub?.metadata?.org_id === 'string' && sub.metadata.org_id.trim() !== ''

      if (!hasOrgId && typeof sub.customer === 'string') {
        const customer = await stripe.customers.retrieve(sub.customer)

        if (!isStripeCustomerDeleted(customer)) {
          const orgIdFromCustomer =
            typeof customer.metadata?.org_id === 'string'
              ? customer.metadata.org_id.trim()
              : ''

          if (orgIdFromCustomer) {
            // Mutiramo event payload, da BillingService dobi org_id
            sub.metadata = { ...(sub.metadata ?? {}), org_id: orgIdFromCustomer }

            // Opcijsko: persistiraj na Stripe subscription, da je vedno prisoten
            // (to bo sprožilo še customer.subscription.updated event, kar je OK)
            try {
              await stripe.subscriptions.update(sub.id, {
                metadata: { ...(sub.metadata ?? {}), org_id: orgIdFromCustomer },
              })
            } catch {
              // ne failamo webhooka zaradi “nice-to-have” metapodatkov
            }
          }
        }
      }
    }

    const billingService = getBillingService()
    await billingService.handleStripeWebhook(event as unknown as StripeWebhookEvent)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: unknown) {
    // Stripe signature error
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}