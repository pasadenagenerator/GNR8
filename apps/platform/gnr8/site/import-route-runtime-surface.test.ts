import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const CWD = path.resolve(process.cwd())
const PLATFORM_ROOT = CWD.endsWith(path.join('apps', 'platform')) ? CWD : path.resolve(CWD, 'apps/platform')

function readFileFromWorkspace(relativePath: string): string {
  return fs.readFileSync(path.resolve(PLATFORM_ROOT, relativePath), 'utf8')
}

test('scoped import API route is pinned to nodejs runtime surface', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts')
  assert.match(routeSource, /export const runtime = ['"]nodejs['"]/)
  assert.doesNotMatch(routeSource, /export const runtime = ['"]edge['"]/)
  assert.match(routeSource, /insert into public\.sites \(id, org_id, agency_id, name, status, domain, is_template\)/)
  assert.ok(routeSource.indexOf('SiteGitHubRepositoryProvisioner(binding).ensure(') <
    routeSource.indexOf('importPublicSinglePageUrlToSnapshot({'))
  assert.match(routeSource, /preallocateSiteVersionIdentity\(/)
  assert.match(routeSource, /importPublicSinglePageUrlToSnapshot\(\{[\s\S]*siteId:\s*preallocatedIdentity\.siteId,[\s\S]*siteVersionId:\s*preallocatedIdentity\.siteVersionId,/)
  assert.match(routeSource, /RUNTIME_IMPORT_IDENTITY_PREALLOCATED/)
  assert.match(routeSource, /RUNTIME_IMPORT_IDENTITY_REUSED/)
  assert.match(routeSource, /RUNTIME_IMPORT_IDENTITY_PREALLOCATION_FAILED/)
})

test('scoped import API route does not publish or activate imported runtime versions', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts')
  assert.doesNotMatch(routeSource, /publishSiteVersion|activateSiteVersion|setActiveSiteVersion|\/publish|\/approve/)
  assert.doesNotMatch(routeSource, /state:\s*['"]PUBLISHED['"]|state\s*=\s*['"]PUBLISHED['"]/)
})

test('Studio resource reservation is queued only after the scoped import and domain persist', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts')
  const persisted = routeSource.indexOf('await saveWorkingDomain({workingDomain,ownershipSiteId')
  const guarded = routeSource.indexOf("process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED === '1'")
  const queued = routeSource.indexOf("name: 'gnr8/native-studio.resources.reserve.requested'")
  assert.ok(persisted >= 0 && persisted < guarded && guarded < queued)
  assert.match(routeSource, /data: \{ scope: \{ agencyId: actionContext\.agencyId, clientId,[\s\S]*siteId: ownershipSiteId \}, actor: actionContext\.userId \}/)
})

test('runtime migrate URL API route is pinned to nodejs runtime surface', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/runtime/migrate/url/route.ts')
  assert.match(routeSource, /export const runtime = ['"]nodejs['"]/)
  assert.doesNotMatch(routeSource, /export const runtime = ['"]edge['"]/)
})
