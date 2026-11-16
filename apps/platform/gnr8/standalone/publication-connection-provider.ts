import 'server-only';
import {checkIndependentContact} from './publication-contact-check';
import {verifyPublicationTls} from './publication-domain';
import {assertConnectionRepository,type ConnectionSettings,type ConnectionTokens} from './publication-connection';
import {fingerprint} from './publication-contract';
import type {PublicationStore} from './publication-store';
import type {PublicationScope as PublicOutputScope} from './publication-contract';
import type {SiteGitHubRepositoryWithOwnerKind} from '../stacki/site-github-repository-binding';

/** Setup and diagnostics are read-only. No account/service provisioning here. */
export class PublicationConnectionProvider {
 constructor(private tokens:ConnectionTokens,private transport:typeof fetch=fetch,private tls=verifyPublicationTls){}
 private async get(service:'github'|'vercel',path:string,missing=false):Promise<any>{
  const r=await this.transport((service==='github'?'https://api.github.com':'https://api.vercel.com')+path,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:`Bearer ${this.tokens[service]}`,accept:'application/json',...(service==='github'?{'X-GitHub-Api-Version':'2022-11-28'}:{})}});
  if(missing&&r.status===404)return null;
  if(!r.ok)throw Error(`standalone_${service}_connection_failed`);
  return r.json();
 }
 async accounts(){
  const user=await this.get('github','/user');
  const organizations=await this.get('github','/user/memberships/orgs?state=active&per_page=100');
  const teams=await this.get('vercel','/v2/teams?limit=100');
  if(!Number.isSafeInteger(user.id)||!Array.isArray(organizations)||!Array.isArray(teams.teams))throw Error('standalone_accounts_unavailable');
  return {github:[{login:user.login,id:user.id,kind:'User'},...organizations.filter(o=>o.role==='admin'&&o.state==='active').map(o=>({login:o.organization.login,id:o.organization.id,kind:'Organization'}))],vercel:teams.teams.filter((t:any)=>t.membership?.role==='OWNER'&&t.membership?.confirmed===true).map((t:any)=>({id:t.id,name:t.name,slug:t.slug})),limited:organizations.length===100||Boolean(teams.pagination?.next)};
 }
 async verify(settings:ConnectionSettings,scope:PublicOutputScope,store:PublicationStore,
  binding:SiteGitHubRepositoryWithOwnerKind|null=null){
  assertConnectionRepository(settings,binding);
  const owner=await this.get('github','/users/'+settings.githubOwner);
  if(owner.id!==settings.githubOwnerId||owner.type!==settings.githubOwnerKind||owner.login.toLowerCase()!==settings.githubOwner.toLowerCase())throw Error('standalone_repository_owner_mismatch');
  if(owner.type==='User'){const actor=await this.get('github','/user');if(actor.id!==owner.id)throw Error('standalone_repository_owner_mismatch');}
  else {const membership=await this.get('github','/user/memberships/orgs/'+settings.githubOwner);if(membership.state!=='active'||membership.role!=='admin')throw Error('standalone_repository_owner_mismatch');}
  const team=await this.get('vercel','/v2/teams/'+settings.vercelTeamId);
  if(team.id!==settings.vercelTeamId||team.membership?.role!=='OWNER'||team.membership?.confirmed!==true)throw Error('standalone_team_owner_required');
  const key='resources/'+fingerprint({siteId:scope.siteId,githubOwnerId:settings.githubOwnerId,repository:settings.repository,vercelTeamId:settings.vercelTeamId,project:settings.project});
  const repo=await this.get('github',`/repos/${settings.githubOwner}/${settings.repository}`,true);
  if(binding&&!repo)throw Error('standalone_provisioned_repository_missing');
  if(repo){const receipt=binding?null:await store.read<{id:number}>(key+'-github-receipt.json');
   if((binding?binding.repositoryId!==repo.id:!receipt||receipt.id!==repo.id)||
    repo.private!==true||repo.owner?.id!==settings.githubOwnerId||
    repo.owner?.login?.toLowerCase()!==settings.githubOwner.toLowerCase()||
    repo.name!==settings.repository||repo.permissions?.push!==true||
    repo.description!==`GNR8 standalone site ${scope.siteId}`)
    throw Error('standalone_repository_name_occupied');}
  const project=await this.get('vercel',`/v9/projects/${settings.project}?teamId=${settings.vercelTeamId}`,true);
  if(project){const receipt=await store.read<{id:string}>(key+'-vercel-receipt.json');if(!receipt||receipt.id!==project.id||project.accountId!==settings.vercelTeamId)throw Error('standalone_project_name_occupied_or_unconfirmed');}
  const alias=await this.get('vercel',`/v4/aliases/${settings.host}?teamId=${settings.vercelTeamId}`,true);
  if(alias&&alias.projectId!==project?.id&&settings.domainMode==='new')throw Error('standalone_existing_domain_transfer_required');
  return {ownerVerified:true,teamVerified:true,repository:repo?'bound':'available',project:project?'bound':'available'};
 }
 async contact(settings:ConnectionSettings){
  if(!settings.contact)throw Error('standalone_contact_policy_required');
  const project=await this.get('vercel',`/v9/projects/${settings.project}?teamId=${settings.vercelTeamId}`);
  if(project.accountId!==settings.vercelTeamId)throw Error('standalone_project_ownership_mismatch');
  const result=await this.get('vercel',`/v10/projects/${project.id}/env?teamId=${settings.vercelTeamId}&decrypt=true`);
  const env:Record<string,string>={};
  for(const item of result.envs??[])if(item.target?.includes('production')&&item.key.startsWith('CONTACT_')){if(env[item.key]!==undefined)throw Error('standalone_environment_not_ready');env[item.key]=item.value;}
  return checkIndependentContact(env,settings.host,this.transport);
 }
 async domain(settings:ConnectionSettings){
  const suffix='?teamId='+settings.vercelTeamId;
  const project=await this.get('vercel','/v9/projects/'+settings.project+suffix,true);
  if(!project)return {state:'project_required',host:settings.host,ready:false};
  if(project.accountId!==settings.vercelTeamId)throw Error('standalone_project_ownership_mismatch');
  const domain=await this.get('vercel',`/v9/projects/${project.id}/domains/${settings.host}${suffix}`,true);
  const config=await this.get('vercel',`/v6/domains/${settings.host}/config${suffix}`);
  const alias=await this.get('vercel',`/v4/aliases/${settings.host}${suffix}`,true);
  // An exact host can shadow a wildcard. Show that fact explicitly; never move
  // the wildcard or guess ownership from a deployment's aggregate alias list.
  const wildcard='*.'+settings.host.split('.').slice(1).join('.');
  const parent=await this.get('vercel',`/v4/aliases/${encodeURIComponent(wildcard)}${suffix}`,true);
  const production=Boolean(domain&&domain.gitBranch==null&&domain.customEnvironmentId==null&&domain.redirect==null);
  const tlsReady=domain?.verified===true&&config.misconfigured===false&&production?await this.tls(settings.host):false;
  return {state:!domain?(alias?'transfer_required':'binding_required'):domain.verified!==true?'ownership_required':config.misconfigured!==false?'dns_required':!production?'production_binding_required':!tlsReady?'tls_required':'configured',host:settings.host,projectId:project.id,productionDeploymentId:project.targets?.production?.id??null,aliasDeploymentId:alias?.deploymentId??alias?.deployment?.id??null,previousProjectId:alias?.projectId??null,wildcardProjectId:parent?.projectId??null,verified:domain?.verified===true,dnsConfigured:config.misconfigured===false,production,tlsReady,ready:domain?.verified===true&&config.misconfigured===false&&production&&tlsReady,
   verification:(domain?.verification??[]).map((v:any)=>({type:v.type,domain:v.domain,value:v.value})),recommendedCNAME:config.recommendedCNAME??[],recommendedIPv4:config.recommendedIPv4??[],tls:'Preverite veljaven HTTPS certifikat za točen host v Vercel Domains pred objavo.'};
 }
}
