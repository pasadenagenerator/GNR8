import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { githubArchiveRequired, resolvedGitHubStackiStore, resolvedGitHubTarget } from './stacki-github-config'
import { GitHubStackiStore } from './stacki-github-store'

const scope={agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',
  siteId:'33333333-3333-4333-8333-333333333333',
  siteVersionId:'44444444-4444-4444-8444-444444444444'}

test('durable site binding selects GitHub storage without pilot site list',async t=>{
  const names=['GNR8_STACKI_GITHUB_ENABLED','GNR8_STACKI_GITHUB_SITE_IDS',
    'GNR8_STACKI_GITHUB_BINDINGS_ENABLED','GNR8_STACKI_GITHUB_TOKEN',
    'GNR8_STACKI_LAZY_ASSETS_ENABLED','GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED'] as const
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  t.after(()=>{for(const name of names){const value=old[name];
    if(value===undefined)delete process.env[name];else process.env[name]=value}})
  process.env.GNR8_STACKI_GITHUB_ENABLED='1'
  process.env.GNR8_STACKI_GITHUB_SITE_IDS='[]'
  process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED='1'
  process.env.GNR8_STACKI_GITHUB_TOKEN='local-test-token'
  process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED='1'
  delete process.env.GNR8_STACKI_LAZY_ASSETS_ENABLED
  const filters:Record<string,string>={}
  const query={select(){return this},eq(name:string,value:string){filters[name]=value;return this},
    async maybeSingle(){return {data:filters.site_id===scope.siteId?{
      github_owner:'owner',github_owner_id:12,github_owner_kind:'Organization',repository:'site-repo',repository_id:34,
      binding_state:'bound'}:null,error:null}}}
  const client={from(name:string){assert.equal(name,'gnr8_site_github_repository_bindings');return query}} as unknown as SupabaseClient
  assert.deepEqual(await resolvedGitHubTarget(scope,client),{owner:'owner',ownerId:12,
    repository:'site-repo',repositoryId:34,token:'local-test-token'})
  assert.deepEqual(filters,{agency_id:scope.agencyId,client_id:scope.clientId,site_id:scope.siteId})
  assert(await resolvedGitHubStackiStore(scope,client) instanceof GitHubStackiStore)
  assert.equal(await githubArchiveRequired(scope,client),true)
  assert.equal(await resolvedGitHubTarget({...scope,siteId:'55555555-5555-4555-8555-555555555555'},client),null)
  process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED='0'
  assert.equal(await resolvedGitHubTarget(scope,client),null)
  assert.equal(await githubArchiveRequired(scope,client),false)
})
