import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SiteGitHubRepositoryBinding } from './site-github-repository-binding'
import { SiteGitHubRepositoryProvisioner } from './site-github-repository-provisioner'
import { githubArchiveRequired, resolvedGitHubStackiStore, resolvedGitHubTarget } from './stacki-github-config'
import { githubImportReady } from '../site/site-import-github-readiness'
import { GitHubStackiStore } from './stacki-github-store'
import { connectionTarget,type ConnectionSettings } from '../standalone/publication-connection'
import { PublicationConnectionProvider } from '../standalone/publication-connection-provider'

const scope={agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',
  siteId:'33333333-3333-4333-8333-333333333333'}
const target={owner:'owner',ownerId:12,repository:'site-repo',repositoryId:34,token:'local-test-token'}
type MockRow={github_owner:string;github_owner_id:number;github_owner_kind:'User'|'Organization';repository:string;
  repository_id:number|null;binding_state:string}
const row:MockRow={github_owner:target.owner,github_owner_id:target.ownerId,
  github_owner_kind:'Organization',
  repository:target.repository,repository_id:target.repositoryId,binding_state:'bound'}

function storage(){
  let stored:MockRow|null=null
  const filters:Record<string,string>={}
  const writes:Record<string,unknown>[]=[]
  const query={select(){return this},eq(key:string,value:string){filters[key]=value;return this},
    async maybeSingle(){return {data:stored,error:null}}}
  const client={from(name:string){
    assert.equal(name,'gnr8_site_github_repository_bindings')
    return {...query,async insert(value:Record<string,unknown>){writes.push(value);stored={
      github_owner:String(value.github_owner),github_owner_id:Number(value.github_owner_id),
      github_owner_kind:value.github_owner_kind as 'User'|'Organization',
      repository:String(value.repository),repository_id:value.repository_id===null?null:Number(value.repository_id),
      binding_state:String(value.binding_state)}
      return {error:null}
    },update(value:Record<string,unknown>){
      let expectedState:string|undefined
      const apply=()=>{
        if(stored&&(!expectedState||stored.binding_state===expectedState))
          stored={...stored,binding_state:String(value.binding_state),
            repository_id:value.repository_id===undefined?stored.repository_id:Number(value.repository_id)}
      }
      return {eq(key:string,expected:string){if(key==='binding_state')expectedState=expected;return this},
        in(){return this},select(){return this},async maybeSingle(){apply();return {data:stored,error:null}},
        then(resolve:(value:{error:null})=>void){apply();resolve({error:null})}}
    }}
  }} as unknown as SupabaseClient
  return {client,filters,writes,getStored:()=>stored,setStored:(value:MockRow)=>{stored=value}}
}

const verified:typeof fetch=async(url)=>{
  assert.equal(String(url),'https://api.github.com/repos/owner/site-repo')
  return Response.json({private:true,id:34,owner:{id:12,login:'owner'},name:'site-repo',
    description:`GNR8 standalone site ${scope.siteId}`,permissions:{push:true}})
}

test('verified site repository is stored as scoped metadata without credentials',async()=>{
  const store=storage(),bindings=new SiteGitHubRepositoryBinding(store.client,verified)
  const bound=await bindings.bindVerified(scope,target)
  assert.deepEqual(bound,{owner:'owner',ownerId:12,repository:'site-repo',repositoryId:34})
  assert.deepEqual(store.filters,{agency_id:scope.agencyId,client_id:scope.clientId,site_id:scope.siteId})
  assert.equal(store.writes.length,1)
  assert(!JSON.stringify(store.writes).includes(target.token))
  assert.deepEqual(await bindings.bindVerified(scope,target),bound)
  assert.equal(store.writes.length,1)
})

test('unverified or conflicting repository never changes an existing binding',async()=>{
  const store=storage(),wrong:typeof fetch=async()=>Response.json({private:false,id:34,
    owner:{id:12,login:'owner'},name:'site-repo',description:`GNR8 standalone site ${scope.siteId}`,
    permissions:{push:true}})
  await assert.rejects(new SiteGitHubRepositoryBinding(store.client,wrong).bindVerified(scope,target))
  assert.equal(store.writes.length,0)
  store.setStored({...row,repository_id:99})
  await assert.rejects(new SiteGitHubRepositoryBinding(store.client,verified).bindVerified(scope,target),
    /site_github_binding_conflict/)
  assert.equal(store.writes.length,0)
})

test('reservation survives retry and only the verified repository completes it',async()=>{
  const store=storage(),bindings=new SiteGitHubRepositoryBinding(store.client,verified)
  const reservation={owner:target.owner,ownerId:target.ownerId,repository:target.repository}
  assert.deepEqual(await bindings.reserve(scope,reservation),reservation)
  assert.deepEqual(await bindings.reserve(scope,reservation),reservation)
  assert.equal(store.writes.length,1)
  await assert.rejects(bindings.read(scope),/pending/)
  await assert.rejects(bindings.reserve(scope,{...reservation,repository:'another-repo'}),/conflict/)
  assert.equal(await bindings.startCreation(scope,reservation),true)
  assert.equal(await bindings.startCreation(scope,reservation),false)
  await assert.rejects(bindings.read(scope),/pending/)
  assert.deepEqual(await bindings.bindVerified(scope,target),{...reservation,repositoryId:34})
  assert.deepEqual(await bindings.read(scope),{...reservation,repositoryId:34})
})

test('a new personal-account site provisions once and the same binding serves import, Stacki and publication',async t=>{
  const keys=['GNR8_STACKI_GITHUB_ENABLED','GNR8_STACKI_GITHUB_SITE_IDS',
    'GNR8_STACKI_GITHUB_BINDINGS_ENABLED','GNR8_STACKI_GITHUB_TOKEN',
    'GNR8_STACKI_LAZY_ASSETS_ENABLED','GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED'] as const
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  t.after(()=>{for(const key of keys)if(previous[key]===undefined)delete process.env[key]
    else process.env[key]=previous[key]})
  Object.assign(process.env,{GNR8_STACKI_GITHUB_ENABLED:'0',GNR8_STACKI_GITHUB_SITE_IDS:'[]',
    GNR8_STACKI_GITHUB_BINDINGS_ENABLED:'1',GNR8_STACKI_GITHUB_TOKEN:'local-content-token',
    GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED:'1'})
  delete process.env.GNR8_STACKI_LAZY_ASSETS_ENABLED
  const store=storage(),calls:string[]=[]
  let created=false,checkingProvisionerCredentials=true
  const transport:typeof fetch=async(url,options)=>{
    const path=new URL(String(url)).pathname,method=options?.method??'GET'
    calls.push(`${method} ${path}`)
    if(checkingProvisionerCredentials&&(path==='/user'||path==='/user/repos'))
      assert.equal(new Headers(options?.headers).get('authorization'),'Bearer local-provision-token')
    if(checkingProvisionerCredentials&&path===`/repos/pasadenagenerator/${store.getStored()?.repository}`)
      assert.equal(new Headers(options?.headers).get('authorization'),'Bearer local-content-token')
    if(path==='/user')return Response.json({id:12,login:'pasadenagenerator',type:'User'})
    if(path==='/users/pasadenagenerator')return Response.json({id:12,login:'pasadenagenerator',type:'User'})
    if(path==='/v2/teams/team_123')return Response.json({id:'team_123',membership:{role:'OWNER',confirmed:true}})
    if(path.startsWith('/v9/projects/')||path.startsWith('/v4/aliases/'))return new Response(null,{status:404})
    if(path==='/user/repos'&&method==='POST'){
      const body=JSON.parse(String(options?.body))
      assert.equal(body.name,store.getStored()?.repository)
      assert.equal(body.private,true)
      created=true
      return Response.json({id:34},{status:201})
    }
    if(path===`/repos/pasadenagenerator/${store.getStored()?.repository}`){
      if(!created)return new Response(null,{status:404})
      return Response.json({private:true,id:34,owner:{id:12,login:'pasadenagenerator'},
        name:store.getStored()?.repository,description:`GNR8 standalone site ${scope.siteId}`,
        permissions:{push:true}})
    }
    throw Error(`unexpected provider request: ${method} ${path}`)
  }
  const binding=new SiteGitHubRepositoryBinding(store.client,transport)
  const owner={owner:'pasadenagenerator',ownerId:12,ownerKind:'User' as const,
    provisionToken:'local-provision-token',
    contentToken:'local-content-token'}
  assert.equal(await githubImportReady(scope,true,transport,store.client),false)
  const provisioned=await new SiteGitHubRepositoryProvisioner(binding,transport).ensure(scope,owner)
  checkingProvisionerCredentials=false
  assert.match(provisioned.repository,/^gnr8-site-[a-f0-9]{32}-[a-f0-9]{16}$/)
  assert.equal(calls.filter(call=>call==='POST /user/repos').length,1)
  assert.equal(await githubImportReady(scope,true,transport,store.client),true)
  const selected=await resolvedGitHubTarget({...scope,siteVersionId:'44444444-4444-4444-8444-444444444444'},store.client)
  assert.deepEqual(selected,{...provisioned,token:owner.contentToken})
  assert.equal(await githubArchiveRequired({...scope,siteVersionId:'44444444-4444-4444-8444-444444444444'},store.client),true)
  assert(await resolvedGitHubStackiStore({...scope,siteVersionId:'44444444-4444-4444-8444-444444444444'},store.client)
    instanceof GitHubStackiStore)
  const publicationRepository=await binding.readForPublication(scope)
  assert.equal(publicationRepository?.ownerKind,'User')
  const settings:ConnectionSettings={githubOwner:provisioned.owner,githubOwnerId:provisioned.ownerId,
    githubOwnerKind:'User',repository:provisioned.repository,vercelTeamId:'team_123',
    project:'gnr8-test-site',host:'preview.example.test',hostPurpose:'working',domainMode:'new',contact:null}
  const connection={scope,revision:1,settings,tokens:{github:'local-publication-github',vercel:'local-vercel-key'}}
  const selection={artifactId:'artifact',artifactSha256:'c'.repeat(64),selection:{kind:'generated-source' as const,
    scope:{...scope,siteVersionId:'44444444-4444-4444-8444-444444444444'},sha256:'d'.repeat(64)}}
  assert.equal(connectionTarget(connection,selection,publicationRepository).provisionedRepositoryId,34)
  assert.equal((await new PublicationConnectionProvider(connection.tokens,transport)
    .verify(settings,scope,{read:async()=>null} as never,publicationRepository)).repository,'bound')
  checkingProvisionerCredentials=true
  await new SiteGitHubRepositoryProvisioner(binding,transport).ensure(scope,owner)
  assert.equal(calls.filter(call=>call==='POST /user/repos').length,1)
})
