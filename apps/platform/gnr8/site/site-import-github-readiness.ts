import { randomUUID } from 'node:crypto'
import { resolvedGitHubTarget } from '../stacki/stacki-github-config'
import { GitHubStackiStore } from '../stacki/stacki-github-store'
import type { SupabaseClient } from '@supabase/supabase-js'

type OwnershipScope={agencyId:string;clientId:string;siteId:string}

/** New imports must verify their exact GitHub repository before intake creates state. */
export async function githubImportReady(scope:OwnershipScope,
  archiveEnabled=process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED==='1',
  transport:typeof fetch=fetch,clientOverride?:SupabaseClient):Promise<boolean>{
  if (!archiveEnabled) return false
  try {
    const target=await resolvedGitHubTarget({...scope,siteVersionId:''},clientOverride)
    if(!target)return false
    await new GitHubStackiStore({...scope,siteVersionId:randomUUID()},target,transport).verifyTarget()
    return true
  } catch {
    return false
  }
}
