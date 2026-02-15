import { DomainError, type StripeWebhookEvent } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getBillingService } from '@/src/di/core'

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
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
    }

    const stripe = new Stripe(stripeSecretKey)

    // ✅ Raw body as bytes (most reliable for signature verification)
    const rawBody = Buffer.from(await request.arrayBuffer())

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    )

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