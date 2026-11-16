import 'server-only'
import { randomBytes } from 'node:crypto'
import { SiteGitHubRepositoryBinding, type SiteGitHubScope,
  type SiteGitHubReservation, type SiteGitHubRepository, type SiteGitHubOwnerKind } from './site-github-repository-binding'

type Owner={owner:string;ownerId:number;ownerKind?:SiteGitHubOwnerKind;
  provisionToken:string;contentToken:string}

/** Random name is reserved durably before the first GitHub mutation. */
export function newSiteRepositoryName(siteId:string,suffix=randomBytes(8).toString('hex')){
  if(!/^[a-f0-9-]{36}$/.test(siteId)||!/^[a-f0-9]{16}$/.test(suffix))
    throw Error('site_github_repository_name_invalid')
  return `gnr8-site-${siteId.replaceAll('-','')}-${suffix}`
}

export class SiteGitHubRepositoryProvisioner {
  constructor(private binding:SiteGitHubRepositoryBinding,private transport:typeof fetch=fetch){}

  private async request(token:string,path:string,method='GET',body?:unknown,missing=false){
    const response=await this.transport(`https://api.github.com${path}`,{
      method,redirect:'error',signal:AbortSignal.timeout(30_000),
      headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28','content-type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    })
    if(response.headers.get('x-oauth-scopes')?.split(',').map(x=>x.trim()).includes('repo'))
      throw Error('site_github_credential_too_broad')
    if(missing&&response.status===404)return null
    if(!response.ok)throw Error('site_github_provider_unavailable')
    return await response.json() as Record<string,any>
  }

  async ensure(scope:SiteGitHubScope,owner:Owner):Promise<SiteGitHubRepository>{
    const ownerKind=owner.ownerKind??'Organization'
    if(!/^[A-Za-z0-9-]{1,39}$/.test(owner.owner)||
      !['User','Organization'].includes(ownerKind)||
      !Number.isSafeInteger(owner.ownerId)||owner.ownerId<1||
      !owner.provisionToken||!owner.contentToken)
      throw Error('site_github_provisioning_not_configured')
    let state=await this.binding.provisioningState(scope)
    if(!state){
      const reservation:SiteGitHubReservation={owner:owner.owner,ownerKind,
        ownerId:owner.ownerId,repository:newSiteRepositoryName(scope.siteId)}
      try{await this.binding.reserve(scope,reservation)}
      catch(error){
        if(!(error instanceof Error)||error.message!=='site_github_binding_conflict')throw error
      }
      state=await this.binding.provisioningState(scope)
    }
    if(!state||state.owner!==owner.owner||state.ownerId!==owner.ownerId||
      state.ownerKind!==ownerKind)
      throw Error('site_github_binding_conflict')
    const reservation={owner:state.owner,ownerId:state.ownerId,ownerKind,
      repository:state.repository}
    if(state.state==='bound')return this.binding.bindVerified(scope,{...reservation,
      repositoryId:state.repositoryId!,token:owner.contentToken})

    const account=await this.request(owner.provisionToken,
      ownerKind==='User'?'/user':`/orgs/${owner.owner}`)
    if(account?.id!==owner.ownerId||account.login?.toLowerCase()!==owner.owner.toLowerCase()||
      (account.type&&account.type!==ownerKind))
      throw Error('site_github_owner_mismatch')
    const path=`/repos/${owner.owner}/${reservation.repository}`
    let repository=await this.request(owner.contentToken,path,'GET',undefined,true)
    if(state.state==='reserved'){
      if(repository)throw Error('site_github_repository_name_occupied')
      if(await this.binding.startCreation(scope,reservation)){
        try{
          await this.request(owner.provisionToken,
            ownerKind==='User'?'/user/repos':`/orgs/${owner.owner}/repos`,'POST',{
            name:reservation.repository,private:true,auto_init:true,
            has_issues:false,has_projects:false,has_wiki:false,
            description:`GNR8 standalone site ${scope.siteId}`,
          })
        }catch{/* Reconcile the exact reserved repository after an ambiguous response. */}
        repository=await this.request(owner.contentToken,path,'GET',undefined,true)
      }else repository=await this.request(owner.contentToken,path,'GET',undefined,true)
    }
    if(!repository)throw Error('site_github_creation_unconfirmed')
    if(repository.private!==true||!Number.isSafeInteger(repository.id)||repository.id<1||
      repository.owner?.id!==owner.ownerId||
      repository.owner?.login?.toLowerCase()!==owner.owner.toLowerCase()||
      repository.name!==reservation.repository||
      repository.description!==`GNR8 standalone site ${scope.siteId}`||
      repository.permissions?.push!==true)
      throw Error('site_github_repository_mismatch')
    return this.binding.bindVerified(scope,{...reservation,repositoryId:repository.id,
      token:owner.contentToken})
  }
}
