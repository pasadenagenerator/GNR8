import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GitHubStackiStore } from './stacki-github-store'

export type SiteGitHubScope={agencyId:string;clientId:string;siteId:string}
export type SiteGitHubOwnerKind='User'|'Organization'
export type SiteGitHubRepository={owner:string;ownerId:number;repository:string;repositoryId:number}
export type SiteGitHubRepositoryWithOwnerKind=SiteGitHubRepository & {ownerKind:SiteGitHubOwnerKind}
export type SiteGitHubTarget=SiteGitHubRepository & {token:string;ownerKind?:SiteGitHubOwnerKind}
export type SiteGitHubReservation=Omit<SiteGitHubRepository,'repositoryId'> & {ownerKind?:SiteGitHubOwnerKind}
export type SiteGitHubBindingState=SiteGitHubReservation & {ownerKind:SiteGitHubOwnerKind} &
  {state:'reserved'|'creating'|'bound';repositoryId:number|null}

function exactRepository(a:SiteGitHubRepository,b:SiteGitHubRepository){
  return a.owner===b.owner && a.ownerId===b.ownerId &&
    a.repository===b.repository && a.repositoryId===b.repositoryId
}

/** Site-owned, immutable repository identity. Credentials never enter this table. */
export class SiteGitHubRepositoryBinding {
  constructor(private client:SupabaseClient,private transport:typeof fetch=fetch){}

  private async readBinding(scope:SiteGitHubScope):Promise<SiteGitHubBindingState|null>{
    const result=await this.client.from('gnr8_site_github_repository_bindings')
      .select('github_owner,github_owner_id,github_owner_kind,repository,repository_id,binding_state')
      .eq('agency_id',scope.agencyId).eq('client_id',scope.clientId).eq('site_id',scope.siteId)
      .maybeSingle()
    if(result.error)throw Error('site_github_binding_unavailable')
    const row=result.data
    if(!row)return null
    const binding:SiteGitHubBindingState={owner:row.github_owner,ownerId:Number(row.github_owner_id),
      ownerKind:row.github_owner_kind,
      repository:row.repository,state:row.binding_state,repositoryId:row.repository_id===null?null:Number(row.repository_id)}
    if(!/^[A-Za-z0-9-]{1,39}$/.test(binding.owner)||
      !['User','Organization'].includes(binding.ownerKind)||
      !/^[a-z0-9][a-z0-9-]{0,62}$/.test(binding.repository)||
      !Number.isSafeInteger(binding.ownerId)||binding.ownerId<1||
      (['reserved','creating'].includes(binding.state)&&binding.repositoryId!==null)||
      (binding.state==='bound'&&(!Number.isSafeInteger(binding.repositoryId)||!binding.repositoryId||binding.repositoryId<1))||
      !['reserved','creating','bound'].includes(binding.state))
      throw Error('site_github_binding_invalid')
    return binding
  }

  async read(scope:SiteGitHubScope):Promise<SiteGitHubRepository|null>{
    const binding=await this.readBinding(scope)
    if(!binding)return null
    if(binding.state!=='bound')throw Error('site_github_binding_pending')
    return {owner:binding.owner,ownerId:binding.ownerId,
      repository:binding.repository,repositoryId:binding.repositoryId!}
  }

  async readForPublication(scope:SiteGitHubScope):Promise<SiteGitHubRepositoryWithOwnerKind|null>{
    const binding=await this.readBinding(scope)
    if(!binding)return null
    if(binding.state!=='bound')throw Error('site_github_binding_pending')
    return {owner:binding.owner,ownerId:binding.ownerId,ownerKind:binding.ownerKind,
      repository:binding.repository,repositoryId:binding.repositoryId!}
  }

  async provisioningState(scope:SiteGitHubScope):Promise<SiteGitHubBindingState|null>{
    return this.readBinding(scope)
  }

  /** Reserve one exact name before attempting a provider mutation. */
  async reserve(scope:SiteGitHubScope,reservation:SiteGitHubReservation):Promise<SiteGitHubReservation>{
    const ownerKind=reservation.ownerKind??'Organization'
    if(!/^[A-Za-z0-9-]{1,39}$/.test(reservation.owner)||
      !['User','Organization'].includes(ownerKind)||
      !/^[a-z0-9][a-z0-9-]{0,62}$/.test(reservation.repository)||
      !Number.isSafeInteger(reservation.ownerId)||reservation.ownerId<1)
      throw Error('site_github_reservation_invalid')
    const existing=await this.readBinding(scope)
    if(existing){
      if(existing.owner!==reservation.owner||existing.ownerId!==reservation.ownerId||
        existing.ownerKind!==ownerKind||
        existing.repository!==reservation.repository)throw Error('site_github_binding_conflict')
      return reservation
    }
    const result=await this.client.from('gnr8_site_github_repository_bindings').insert({
      site_id:scope.siteId,agency_id:scope.agencyId,client_id:scope.clientId,
      github_owner:reservation.owner,github_owner_id:reservation.ownerId,github_owner_kind:ownerKind,
      repository:reservation.repository,binding_state:'reserved',repository_id:null,
    })
    if(result.error){
      if(result.error.code==='23505'){
        const raced=await this.readBinding(scope)
        if(raced&&raced.owner===reservation.owner&&raced.ownerId===reservation.ownerId&&
          raced.ownerKind===ownerKind&&
          raced.repository===reservation.repository)return reservation
        throw Error('site_github_binding_conflict')
      }
      throw Error('site_github_reservation_write_unconfirmed')
    }
    const saved=await this.readBinding(scope)
    if(!saved||saved.owner!==reservation.owner||saved.ownerId!==reservation.ownerId||
      saved.ownerKind!==ownerKind||
      saved.repository!==reservation.repository)throw Error('site_github_reservation_write_unconfirmed')
    return reservation
  }

  /** Only the caller that wins this transition may attempt repository creation. */
  async startCreation(scope:SiteGitHubScope,reservation:SiteGitHubReservation):Promise<boolean>{
    const existing=await this.readBinding(scope)
    if(!existing||existing.owner!==reservation.owner||existing.ownerId!==reservation.ownerId||
      existing.ownerKind!==(reservation.ownerKind??'Organization')||
      existing.repository!==reservation.repository)throw Error('site_github_binding_conflict')
    if(existing.state!=='reserved')return false
    const result=await this.client.from('gnr8_site_github_repository_bindings')
      .update({binding_state:'creating'})
      .eq('agency_id',scope.agencyId).eq('client_id',scope.clientId).eq('site_id',scope.siteId)
      .eq('binding_state','reserved').select('binding_state').maybeSingle()
    if(result.error)throw Error('site_github_creation_claim_unconfirmed')
    if(result.data?.binding_state==='creating')return true
    const raced=await this.readBinding(scope)
    if(raced?.state==='creating'||raced?.state==='bound')return false
    throw Error('site_github_creation_claim_unconfirmed')
  }

  /** Claim only after GitHub confirms the exact private site-owned repository. */
  async bindVerified(scope:SiteGitHubScope,target:SiteGitHubTarget):Promise<SiteGitHubRepository>{
    const {token,ownerKind:requestedOwnerKind,...repository}=target
    await new GitHubStackiStore({...scope,siteVersionId:randomUUID()},target,this.transport).verifyTarget()
    const existing=await this.readBinding(scope)
    const ownerKind=requestedOwnerKind??existing?.ownerKind??'Organization'
    if(existing){
      if(existing.ownerKind!==ownerKind)throw Error('site_github_binding_conflict')
      if(existing.state==='bound'){
        if(!exactRepository({...existing,repositoryId:existing.repositoryId!},repository))
          throw Error('site_github_binding_conflict')
        return repository
      }
      if(existing.owner!==repository.owner||existing.ownerId!==repository.ownerId||
        existing.repository!==repository.repository)throw Error('site_github_binding_conflict')
      const updated=await this.client.from('gnr8_site_github_repository_bindings')
        .update({binding_state:'bound',repository_id:repository.repositoryId})
        .eq('agency_id',scope.agencyId).eq('client_id',scope.clientId).eq('site_id',scope.siteId)
        .in('binding_state',['reserved','creating'])
      if(updated.error)throw Error('site_github_binding_write_unconfirmed')
    } else {
      const result=await this.client.from('gnr8_site_github_repository_bindings').insert({
        site_id:scope.siteId,agency_id:scope.agencyId,client_id:scope.clientId,
        github_owner:repository.owner,github_owner_id:repository.ownerId,github_owner_kind:ownerKind,
        repository:repository.repository,repository_id:repository.repositoryId,binding_state:'bound',
      })
      if(result.error&&result.error.code!=='23505')throw Error('site_github_binding_write_unconfirmed')
    }
    const saved=await this.readBinding(scope)
    if(!saved||saved.state!=='bound'||saved.ownerKind!==ownerKind||
      !exactRepository({...saved,repositoryId:saved.repositoryId!},repository))
      throw Error('site_github_binding_write_unconfirmed')
    return repository
  }
}
