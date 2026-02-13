import { DomainError, type StripeWebhookEvent } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getBillingService } from '../../../../src/di/core'

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

    const stripe = new Stripe(stripeSecretKey)

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 },
      )
    }

    const payload = await request.text()

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret,
    )

    const billingService = getBillingService()
    await billingService.handleStripeWebhook(
      event as unknown as StripeWebhookEvent,
    )

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}