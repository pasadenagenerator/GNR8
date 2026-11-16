import assert from 'node:assert/strict'
import test from 'node:test'
import { configuredImportGitHubOwner } from './site-import-github-provisioning-config'

test('new-site provisioning requires every explicit server setting',t=>{
  const names=['GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED','GNR8_STACKI_GITHUB_BINDINGS_ENABLED',
    'GNR8_SITE_GITHUB_PROVISION_ENABLED','GNR8_SITE_GITHUB_ORG','GNR8_SITE_GITHUB_ORG_ID',
    'GNR8_SITE_GITHUB_OWNER','GNR8_SITE_GITHUB_OWNER_ID','GNR8_SITE_GITHUB_OWNER_KIND',
    'GNR8_SITE_GITHUB_PROVISION_TOKEN','GNR8_STACKI_GITHUB_TOKEN'] as const
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  t.after(()=>{for(const name of names){const value=old[name]
    if(value===undefined)delete process.env[name];else process.env[name]=value}})
  for(const name of names)delete process.env[name]
  assert.equal(configuredImportGitHubOwner(),null)
  Object.assign(process.env,{GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED:'1',
    GNR8_STACKI_GITHUB_BINDINGS_ENABLED:'1',GNR8_SITE_GITHUB_PROVISION_ENABLED:'1',
    GNR8_SITE_GITHUB_ORG:'gnr8-sites',GNR8_SITE_GITHUB_ORG_ID:'12',
    GNR8_SITE_GITHUB_PROVISION_TOKEN:'local-provision-token',
    GNR8_STACKI_GITHUB_TOKEN:'local-content-token'})
  assert.deepEqual(configuredImportGitHubOwner(),{owner:'gnr8-sites',ownerId:12,ownerKind:'Organization',
    provisionToken:'local-provision-token',contentToken:'local-content-token'})
  Object.assign(process.env,{GNR8_SITE_GITHUB_OWNER:'pasadenagenerator',
    GNR8_SITE_GITHUB_OWNER_ID:'34',GNR8_SITE_GITHUB_OWNER_KIND:'User'})
  assert.deepEqual(configuredImportGitHubOwner(),{owner:'pasadenagenerator',ownerId:34,
    ownerKind:'User',provisionToken:'local-provision-token',contentToken:'local-content-token'})
  delete process.env.GNR8_SITE_GITHUB_OWNER
  delete process.env.GNR8_SITE_GITHUB_OWNER_ID
  delete process.env.GNR8_SITE_GITHUB_OWNER_KIND
  process.env.GNR8_SITE_GITHUB_ORG_ID='0'
  assert.throws(configuredImportGitHubOwner,/not_configured/)
  process.env.GNR8_SITE_GITHUB_PROVISION_ENABLED='0'
  assert.equal(configuredImportGitHubOwner(),null)
})
