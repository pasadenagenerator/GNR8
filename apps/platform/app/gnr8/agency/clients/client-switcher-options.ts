import 'server-only'

import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

type ClientRow = {
  id: string | null
  name: string | null
}

export type ClientSwitcherOption = {
  clientId: string
  label: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function listSwitchableAgencyClientsForPage(input: { agencyId: string }): Promise<ClientSwitcherOption[]> {
  const agencyId = normalizeText(input.agencyId)
  if (!agencyId) return []

  const supabase = await getSupabaseServerClientReadOnly()
  const result = await supabase
    .from('organizations')
    .select('id,name')
    .eq('agency_id', agencyId)
    .eq('organization_type', 'client')
    .order('name', { ascending: true })

  if (result.error) return []

  const rows = Array.isArray(result.data) ? (result.data as ClientRow[]) : []
  const options = rows
    .map((row) => {
      const clientId = normalizeText(row.id)
      if (!clientId) return null
      return {
        clientId,
        label: normalizeText(row.name) || clientId,
      }
    })
    .filter((option): option is ClientSwitcherOption => option != null)

  const byClientId = new Map<string, ClientSwitcherOption>()
  for (const option of options) {
    if (!byClientId.has(option.clientId)) {
      byClientId.set(option.clientId, option)
    }
  }
  return Array.from(byClientId.values())
}
