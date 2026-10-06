import 'server-only'

import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

export async function getSupabasePageReadClient(input?: { serverOwned?: boolean }) {
  if (input?.serverOwned) {
    const serviceRoleClient = getSupabaseServiceRoleClient()
    if (!serviceRoleClient) {
      throw new Error('Server-owned page read client is unavailable.')
    }
    return serviceRoleClient
  }

  return getSupabaseServerClientReadOnly()
}
