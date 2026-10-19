import { createContactPost } from '@/gnr8/contact/contact-submission'
import { contactDeliveryReadiness, createProductionContactDelivery, resolvePublishedContact } from '@/gnr8/contact/contact-delivery'

export const runtime = 'nodejs'
export async function POST(request: Request): Promise<Response> {
  return createContactPost({
    resolve:resolvePublishedContact,
    delivery:createProductionContactDelivery(new URL(request.url).host),
  })(request)
}

// Configuration/schema status only; never contacts Resend or creates a submission.
export async function GET(): Promise<Response> {
  const status = await contactDeliveryReadiness()
  return Response.json(status,{status:status.ready ? 200 : 503,headers:{'cache-control':'no-store'}})
}
