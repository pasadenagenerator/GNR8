import 'server-only'

import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'
import type { ContactDelivery, ContactOutcome, PublishedContact } from './contact-submission'
import { publishedContactFromResolution } from './published-contact'

// This sender's domain was verified and tracking left disabled in Resend.
// Requiring explicit production configuration keeps previews and local runs inert.
const SENDER_EMAIL = 'forms@notify.pasadenagenerator.com'
const SENDER = `GNR8 <${SENDER_EMAIL}>`
const STORAGE_VERSION = 'gnr8-native-contact-delivery:v1'

function configured(): boolean {
  return process.env.VERCEL_ENV === 'production' &&
    process.env.GNR8_CONTACT_FROM === SENDER && Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function contactDeliveryReadiness(): Promise<{configured: boolean; storageReady: boolean; ready: boolean}> {
  const configReady = configured()
  try {
    const db = getSupabaseServiceRoleClient()
    if (!db) return {configured: configReady, storageReady: false, ready: false}
    const {data,error} = await db.rpc('gnr8_contact_delivery_readiness').abortSignal(AbortSignal.timeout(5_000))
    const storageReady = !error && data === STORAGE_VERSION
    return {configured: configReady, storageReady, ready: configReady && storageReady}
  } catch { return {configured: configReady, storageReady: false, ready: false} }
}

/** Read-only, service-role RPC: no connection pool or implicit schema creation. */
export async function resolvePublishedContact(host: string, path: string): Promise<PublishedContact | null> {
  const db = getSupabaseServiceRoleClient()
  if (!db) return null
  const {data,error} = await db.rpc('gnr8_resolve_published_contact', {p_host:host, p_path:path})
    .abortSignal(AbortSignal.timeout(5_000))
  if (error) throw new Error('contact_resolution_unavailable')
  return data?.outcome === 'artifact_hit' ? publishedContactFromResolution(data,path) : null
}

/** One instance per request. Only a durable first claim may reach send(). */
export function createProductionContactDelivery(host: string): ContactDelivery | null {
  if (!configured()) return null
  const db = getSupabaseServiceRoleClient()
  if (!db) return null
  let providerMessageId: string | null = null
  return {
    verifiedSender: SENDER_EMAIL,
    async claim(input) {
      const {data,error} = await db.rpc('gnr8_claim_contact_submission', {
        p_host:host, p_site_id:input.siteId, p_site_version_id:input.siteVersionId,
        p_artifact_id:input.artifactId, p_artifact_sha256:input.artifactSha256,
        p_path:input.pagePath, p_recipient:input.recipient, p_key:input.key,
        p_payload_hash:input.payloadHash, p_fields:input.payload,
        p_acceptance:input.acceptanceEvidence ?? null,
      }).abortSignal(AbortSignal.timeout(8_000))
      // A timed-out reservation may have committed. Never send or retry it here.
      if (error) throw new Error('contact_claim_unavailable')
      if (data?.status === 'claimed' && typeof data.submissionId === 'string') return {status:'claimed',submissionId:data.submissionId}
      if (data?.status === 'duplicate' && ['pending','notification_accepted','notification_failed','notification_unknown'].includes(data.outcome)) {
        return {status:'duplicate',outcome:data.outcome as ContactOutcome | 'pending'}
      }
      if (data?.status === 'rate_limited') return {status:'rate_limited'}
      if (data?.status === 'conflict') return {status:'conflict'}
      throw new Error('contact_claim_invalid')
    },
    async send(input) {
      if (input.from !== SENDER_EMAIL) throw new Error('contact_sender_invalid')
      const response = await fetch('https://api.resend.com/emails', {
        method:'POST', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(10_000),
        headers:{'authorization':`Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'content-type':'application/json', 'idempotency-key':input.idempotencyKey},
        // Plain text, no tracking pixels, tracking URLs, HTML or attachments.
        body:JSON.stringify({from:SENDER,to:[input.to],reply_to:input.replyTo,subject:input.subject,text:input.text}),
      })
      // 5xx, timeouts and idempotency concurrency responses are ambiguous.
      // Even definite rejection is retained; this adapter never retries a send.
      if ([400,401,403,404,413,422,429].includes(response.status)) return 'failed'
      if (!response.ok) throw new Error('contact_notification_unknown')
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id)) {
        throw new Error('contact_notification_unknown')
      }
      providerMessageId = data.id
      return 'accepted'
    },
    async finish(submissionId, outcome) {
      const {data,error} = await db.rpc('gnr8_finish_contact_submission', {
        p_submission_id:submissionId,p_outcome:outcome,p_provider_message_id:providerMessageId,
      }).abortSignal(AbortSignal.timeout(5_000))
      if (error || data !== true) throw new Error('contact_finish_unavailable')
    },
  }
}
