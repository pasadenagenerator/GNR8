import type { PoolClient } from 'pg'

type ExistingSiteRow = { site_id:string; org_id:string; agency_id:string }

/** Read-only counterpart of import ownership resolution, used before capture. */
export async function lookupImportOwnershipSiteId(client:Pick<PoolClient,'query'>,input:{
  runtimeSiteId:string; clientId:string; agencyId:string; domainHost:string|null
}):Promise<string|null>{
  const bound=await client.query<ExistingSiteRow>(`
    select s.id::text as site_id, s.org_id::text as org_id, s.agency_id::text as agency_id
    from public.gnr8_runtime_site_versions sv
    join public.sites s on s.id = sv.ownership_site_id
    where sv.site_id = $1::text
    order by sv.version_no desc, sv.updated_at desc, sv.created_at desc, sv.id::text desc
    limit 1
  `,[input.runtimeSiteId])
  const row=bound.rows[0]
  if(row){
    if(row.org_id!==input.clientId||row.agency_id!==input.agencyId)
      throw new Error('Import scope mismatch: runtime site is already linked to a different client context.')
    return row.site_id
  }
  if(!input.domainHost)return null
  const domain=await client.query<ExistingSiteRow>(`
    select s.id::text as site_id, s.org_id::text as org_id, s.agency_id::text as agency_id
    from public.sites s
    where s.org_id = $1::uuid and s.agency_id = $2::uuid
      and lower(coalesce(s.domain, '')) = lower($3::text)
    order by s.updated_at desc, s.id::text desc
    limit 1
  `,[input.clientId,input.agencyId,input.domainHost])
  return domain.rows[0]?.site_id??null
}
