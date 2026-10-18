import { createHash } from 'node:crypto'
import { isContactEmail } from '@gnr8/runtime-contracts'
import { CONTACT_LIMITS, type ContactField, type ContactSchema } from './contact-form'

export type PublishedContact = ContactSchema & { siteId: string; siteVersionId: string; pagePath: string; recipient: string }
export type ContactPayload = Partial<Record<ContactField,string>>
export type ContactOutcome = 'notification_accepted' | 'notification_failed' | 'notification_unknown'
/** Must be backed by durable, atomic storage; process memory does not satisfy
 * this interface. A pending/unknown claim is never automatically resent. */
export type ContactDelivery = {
  verifiedSender: string
  claim(input: PublishedContact & { key: string; payloadHash: string; payload: ContactPayload }): Promise<
    {status:'claimed'; submissionId:string} | {status:'duplicate'; outcome:ContactOutcome|'pending'} | {status:'rate_limited'|'conflict'}>
  finish(submissionId: string, outcome: ContactOutcome): Promise<void>
  send(input: {from:string; to:string; replyTo:string; subject:string; text:string; idempotencyKey:string}): Promise<'accepted'|'failed'>
}
export type ContactDependencies = {
  resolve(host: string, path: string): Promise<PublishedContact | null>
  delivery: ContactDelivery | null
}
const MAX_BYTES = 24_000
const messages = {
  invalid: 'Preverite vnesene podatke.', unavailable: 'Pošiljanje trenutno ni omogočeno. Uporabite kontaktne podatke na strani.',
  forbidden: 'Pošiljanje iz predogleda ali neznanega spletnega mesta ni dovoljeno.',
  failed: 'Pošiljanje ni potrjeno. Uporabite kontaktne podatke na strani.',
  accepted: 'Sporočilo je shranjeno in sprejeto v pošiljanje. Prejem v nabiralnik ni potrjen.',
}
function respond(req: Request, status: number, result: string, message: string): Response {
  const headers = {'cache-control':'no-store', 'x-content-type-options':'nosniff'}
  if (req.headers.get('accept')?.includes('application/json')) return Response.json({status:result,message},{status,headers})
  return new Response(`<!doctype html><html lang="sl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kontakt</title><body><main><h1>Kontakt</h1><p role="status">${message}</p><p>Za vrnitev na obrazec uporabite gumb Nazaj v brskalniku.</p></main></body></html>`,{status,headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"}})
}
async function boundedBody(req: Request): Promise<string> {
  if (Number(req.headers.get('content-length')) > MAX_BYTES) throw new Error('size')
  const reader = req.body?.getReader(); if (!reader) throw new Error('empty')
  const chunks: Uint8Array[] = []; let size = 0
  try { for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BYTES) throw new Error('size'); chunks.push(value) } }
  catch (error) { await reader.cancel(); throw error }
  return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))
}
export function createContactPost(deps: ContactDependencies) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url), path = url.searchParams.get('path')
    // Never use a body site ID, recipient, X-Forwarded-Host, or review URL.
    if (!path || !/^\/(?:[\w-]+\/?)*$/.test(path) || req.headers.get('origin') !== url.origin ||
      (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')) return respond(req,403,'forbidden',messages.forbidden)
    if (req.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return respond(req,400,'invalid',messages.invalid)
    let form: URLSearchParams
    try { const raw = await boundedBody(req); decodeURIComponent(raw.replace(/\+/g,' ')); form = new URLSearchParams(raw) } catch { return respond(req,400,'invalid',messages.invalid) }
    let site: PublishedContact | null
    try { site = await deps.resolve(url.host,path) } catch { return respond(req,503,'unavailable',messages.unavailable) }
    if (!site || site.pagePath !== path || !isContactEmail(site.recipient)) return respond(req,403,'forbidden',messages.forbidden)
    const allowed = new Set<string>([...site.fields,'website','requestId'])
    if ([...form.keys()].some(key => !allowed.has(key) || form.getAll(key).length !== 1) || form.get('website')) return respond(req,400,'invalid',messages.invalid)
    const payload: ContactPayload = {}
    for (const field of site.fields) {
      const value = form.get(field) ?? ''
      if (value.length > CONTACT_LIMITS[field] || (site.required.includes(field) && !value.trim()) ||
        (field !== 'message' && /[\r\n\x00-\x1f\x7f]/.test(value)) || (field === 'message' && /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) ||
        (field === 'email' && !isContactEmail(value))) return respond(req,400,'invalid',messages.invalid)
      payload[field] = value
    }
    const requestedKey = form.get('requestId') ?? ''
    if (requestedKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedKey)) return respond(req,400,'invalid',messages.invalid)
    const delivery = deps.delivery
    if (!delivery || !isContactEmail(delivery.verifiedSender)) return respond(req,503,'unavailable',messages.unavailable)
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    // Native no-JS retry deduplication: identical content for this site version.
    const key = createHash('sha256').update(JSON.stringify([site.siteId,site.siteVersionId,path,requestedKey || `native:${hash}`])).digest('hex')
    try {
      const claim = await delivery.claim({...site,key,payloadHash:hash,payload})
      if (claim.status === 'rate_limited') return respond(req,429,'rate_limited',messages.failed)
      if (claim.status === 'conflict') return respond(req,409,'conflict',messages.failed)
      if (claim.status === 'duplicate') return claim.outcome === 'notification_accepted' ? respond(req,200,claim.outcome,messages.accepted) : respond(req,409,claim.outcome,messages.failed)
      let outcome: ContactOutcome = 'notification_unknown'
      try { outcome = await delivery.send({from:delivery.verifiedSender,to:site.recipient,replyTo:payload.email!,subject:'Website contact request',text:site.fields.map(field => `${field}: ${payload[field] ?? ''}`).join('\n\n'),idempotencyKey:key}) === 'accepted' ? 'notification_accepted' : 'notification_failed' }
      catch { /* Do not expose provider errors, secrets or content. Never retry an uncertain send. */ }
      await delivery.finish(claim.submissionId,outcome)
      return outcome === 'notification_accepted' ? respond(req,200,outcome,messages.accepted) : respond(req,502,outcome,messages.failed)
    } catch { return respond(req,503,'unavailable',messages.unavailable) }
  }
}
