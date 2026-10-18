import { createContactPost } from '@/gnr8/contact/contact-submission'
import { publishedContactFromResolution } from '@/gnr8/contact/published-contact'
import { resolveActiveArtifactForHostAndPathWithDiagnostics } from '@/gnr8/runtime/runtime-store'

export const runtime = 'nodejs'
export const POST = createContactPost({
  resolve: async (host,path) => publishedContactFromResolution(await resolveActiveArtifactForHostAndPathWithDiagnostics({host,path}),path),
  // Deliberate activation boundary: the existing store only inserts submissions;
  // no durable atomic deduplication/rate limiting or real sender exists yet.
  // No fallback to the legacy endpoint and no fake acceptance.
  delivery: null,
})
