import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { githubImportReady } from './site-import-github-readiness'

const scope={agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'}

test('new import intake verifies its exact private site repository before capture',async t=>{
  const previous={enabled:process.env.GNR8_STACKI_GITHUB_ENABLED,sites:process.env.GNR8_STACKI_GITHUB_SITE_IDS,
    targets:process.env.GNR8_STACKI_GITHUB_TARGETS,token:process.env.GNR8_STACKI_GITHUB_TOKEN,
    bindings:process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED}
  t.after(()=>{if(previous.enabled===undefined)delete process.env.GNR8_STACKI_GITHUB_ENABLED
    else process.env.GNR8_STACKI_GITHUB_ENABLED=previous.enabled
    if(previous.sites===undefined)delete process.env.GNR8_STACKI_GITHUB_SITE_IDS
    else process.env.GNR8_STACKI_GITHUB_SITE_IDS=previous.sites
    if(previous.targets===undefined)delete process.env.GNR8_STACKI_GITHUB_TARGETS
    else process.env.GNR8_STACKI_GITHUB_TARGETS=previous.targets
    if(previous.token===undefined)delete process.env.GNR8_STACKI_GITHUB_TOKEN
    else process.env.GNR8_STACKI_GITHUB_TOKEN=previous.token
    if(previous.bindings===undefined)delete process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED
    else process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED=previous.bindings})
  process.env.GNR8_STACKI_GITHUB_ENABLED='1'
  process.env.GNR8_STACKI_GITHUB_SITE_IDS=JSON.stringify([scope.siteId])
  process.env.GNR8_STACKI_GITHUB_TOKEN='local-test-token'
  let requests=0
  const repository={private:true,id:34,owner:{id:12,login:'owner'},name:'site-repo',
    description:`GNR8 standalone site ${scope.siteId}`,permissions:{push:true}}
  const transport=(async(url: string | URL | Request)=>{
    requests++
    assert.equal(String(url),'https://api.github.com/repos/owner/site-repo')
    return new Response(JSON.stringify(repository),{status:200})
  }) as typeof fetch
  assert.equal(await githubImportReady(scope,false,transport),false)
  assert.equal(await githubImportReady({...scope,siteId:'44444444-4444-4444-8444-444444444444'},true,transport),false)
  assert.equal(await githubImportReady(scope,true,transport),false)
  assert.equal(requests,0)
  process.env.GNR8_STACKI_GITHUB_TARGETS=JSON.stringify({[scope.siteId]:{
    owner:'owner',ownerId:12,repository:'site-repo',repositoryId:34}})
  assert.equal(await githubImportReady(scope,true,transport),true)
  assert.equal(requests,1)
  const missing=(async()=>new Response(null,{status:404})) as typeof fetch
  assert.equal(await githubImportReady(scope,true,missing),false)
  const wrongOwner=(async()=>new Response(JSON.stringify({...repository,owner:{id:99,login:'other'}}),
    {status:200})) as typeof fetch
  assert.equal(await githubImportReady(scope,true,wrongOwner),false)
  process.env.GNR8_STACKI_GITHUB_TARGETS=JSON.stringify({[scope.siteId]:{
    owner:'owner',ownerId:12,repository:'site-repo',repositoryId:0}})
  assert.equal(await githubImportReady(scope,true,transport),false)
  process.env.GNR8_STACKI_GITHUB_TARGETS='null'
  assert.equal(await githubImportReady(scope,true,transport),false)
  process.env.GNR8_STACKI_GITHUB_SITE_IDS='[]'
  process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED='1'
  const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{
    github_owner:'owner',github_owner_id:12,github_owner_kind:'Organization',repository:'site-repo',repository_id:34,
    binding_state:'bound'},error:null}}}
  const client={from(){return query}} as unknown as SupabaseClient
  assert.equal(await githubImportReady(scope,true,transport,client),true)
})
