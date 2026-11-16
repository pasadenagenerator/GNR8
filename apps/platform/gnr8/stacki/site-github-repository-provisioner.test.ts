import assert from 'node:assert/strict'
import test from 'node:test'
import { SiteGitHubRepositoryProvisioner, newSiteRepositoryName } from './site-github-repository-provisioner'
import type { SiteGitHubRepositoryBinding, SiteGitHubBindingState } from './site-github-repository-binding'

const scope={agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',
  siteId:'33333333-3333-4333-8333-333333333333'}
const organization={owner:'gnr8-sites',ownerId:12,
  provisionToken:'local-provision-token',contentToken:'local-content-token'}

function setup(initial:SiteGitHubBindingState|null=null,ambiguousPost=false){
  let state=initial,posts=0,created=false
  const calls:string[]=[]
  const binding={
    async provisioningState(){return state},
    async reserve(_scope:unknown,reservation:{owner:string;ownerId:number;ownerKind?:'User'|'Organization';repository:string}){
      if(state)throw Error('site_github_binding_conflict')
      state={...reservation,ownerKind:reservation.ownerKind??'Organization',state:'reserved',repositoryId:null};return reservation
    },
    async startCreation(){if(state?.state!=='reserved')return false
      state={...state,state:'creating'};return true},
    async bindVerified(_scope:unknown,target:{owner:string;ownerId:number;repository:string;
      repositoryId:number;token:string}){
      assert.equal(target.token,organization.contentToken)
      state={owner:target.owner,ownerId:target.ownerId,ownerKind:'Organization',repository:target.repository,
        repositoryId:target.repositoryId,state:'bound'}
      const {token,...repository}=target;return repository
    },
  } as unknown as SiteGitHubRepositoryBinding
  const transport:typeof fetch=async(url,options)=>{
    const path=new URL(String(url)).pathname,method=options?.method??'GET'
    calls.push(`${method} ${path}`)
    assert(!String(options?.body??'').includes(organization.contentToken))
    if(path==='/orgs/gnr8-sites')return Response.json({id:12,login:'gnr8-sites'})
    if(path==='/orgs/gnr8-sites/repos'&&method==='POST'){
      posts++
      const body=JSON.parse(String(options?.body))
      assert.equal(body.private,true)
      assert.equal(body.description,`GNR8 standalone site ${scope.siteId}`)
      assert.equal(body.name,state?.repository)
      created=true
      if(ambiguousPost)throw Error('response lost after creation')
      return Response.json({id:34},{status:201})
    }
    if(path.startsWith('/repos/gnr8-sites/')){
      if(!created)return new Response(null,{status:404})
      return Response.json({private:true,id:34,owner:{id:12,login:'gnr8-sites'},
        name:state?.repository,description:`GNR8 standalone site ${scope.siteId}`,
        permissions:{push:true}})
    }
    throw Error('unexpected request')
  }
  return {binding,transport,calls,getState:()=>state,getPosts:()=>posts,setCreated:()=>{created=true}}
}

test('a fresh site creates one private repository and binds its verified ID',async()=>{
  const fake=setup(),provisioner=new SiteGitHubRepositoryProvisioner(fake.binding,fake.transport)
  const result=await provisioner.ensure(scope,organization)
  assert.equal(result.repositoryId,34)
  assert.match(result.repository,/^gnr8-site-[a-f0-9]{32}-[a-f0-9]{16}$/)
  assert.equal(result.repository.length,59)
  assert.equal(fake.getPosts(),1)
  assert.equal(fake.getState()?.state,'bound')
  assert.equal((await provisioner.ensure(scope,organization)).repositoryId,34)
  assert.equal(fake.getPosts(),1)
})

test('a creating reservation reconciles its exact repository without another create',async()=>{
  const name=newSiteRepositoryName(scope.siteId,'a'.repeat(16))
  const fake=setup({owner:organization.owner,ownerId:organization.ownerId,
    ownerKind:'Organization',repository:name,repositoryId:null,state:'creating'})
  fake.setCreated()
  assert.equal((await new SiteGitHubRepositoryProvisioner(fake.binding,fake.transport)
    .ensure(scope,organization)).repositoryId,34)
  assert.equal(fake.getPosts(),0)
})

test('an ambiguous create response is reconciled from the reserved name',async()=>{
  const fake=setup(null,true)
  const result=await new SiteGitHubRepositoryProvisioner(fake.binding,fake.transport)
    .ensure(scope,organization)
  assert.equal(result.repositoryId,34)
  assert.equal(fake.getPosts(),1)
  assert.equal(fake.getState()?.state,'bound')
})

test('an occupied name before creation or an absent creating repository fails closed',async()=>{
  const name=newSiteRepositoryName(scope.siteId,'b'.repeat(16))
  const reserved=setup({owner:organization.owner,ownerId:organization.ownerId,
    ownerKind:'Organization',repository:name,repositoryId:null,state:'reserved'})
  reserved.setCreated()
  await assert.rejects(new SiteGitHubRepositoryProvisioner(reserved.binding,reserved.transport)
    .ensure(scope,organization),/name_occupied/)
  assert.equal(reserved.getPosts(),0)
  const creating=setup({owner:organization.owner,ownerId:organization.ownerId,
    ownerKind:'Organization',repository:name,repositoryId:null,state:'creating'})
  await assert.rejects(new SiteGitHubRepositoryProvisioner(creating.binding,creating.transport)
    .ensure(scope,organization),/creation_unconfirmed/)
  assert.equal(creating.getPosts(),0)
})
