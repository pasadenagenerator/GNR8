import test from 'node:test'
import assert from 'node:assert/strict'

import { buildScopedImportRuntimeIdentity, newScopedImportOwnershipSiteId } from './site-import-runtime-identity'

test('the same source URL stays isolated across clients while a scoped legacy import keeps its identity', () => {
  const sourceUrl = 'https://www.chs.si/'
  const agencyId = '00000000-0000-4000-8000-000000000001'
  const clientId = '3d44ad6f-01e5-4884-a492-585de3b3af49'
  const fresh = buildScopedImportRuntimeIdentity({ sourceUrl, agencyId, clientId, reuseLegacyRuntimeSiteId: false })
  const repeat = buildScopedImportRuntimeIdentity({ sourceUrl, agencyId, clientId, reuseLegacyRuntimeSiteId: false })
  const otherClient = buildScopedImportRuntimeIdentity({
    sourceUrl,
    agencyId,
    clientId: 'e61d1982-068f-4d84-bb6f-c3fbfc93f39b',
    reuseLegacyRuntimeSiteId: false,
  })
  const legacy = buildScopedImportRuntimeIdentity({ sourceUrl, agencyId, clientId, reuseLegacyRuntimeSiteId: true })
  const complete = buildScopedImportRuntimeIdentity({ sourceUrl, agencyId, clientId,
    reuseLegacyRuntimeSiteId: false, captureRevision: 'github-complete-capture-v1' })
  const completeRetry = buildScopedImportRuntimeIdentity({ sourceUrl, agencyId, clientId,
    reuseLegacyRuntimeSiteId: false, captureRevision: 'github-complete-capture-v1' })

  assert.deepEqual(repeat, fresh)
  assert.notEqual(fresh.siteId, otherClient.siteId)
  assert.notEqual(fresh.siteId, legacy.siteId)
  assert.equal(complete.siteId, fresh.siteId)
  assert.notEqual(complete.siteVersionId, fresh.siteVersionId)
  assert.deepEqual(completeRetry, complete)
  assert.equal(legacy.siteId, 'site_57d9665a3a5867edf6ef')
  const ownership = newScopedImportOwnershipSiteId({sourceUrl, agencyId, clientId})
  assert.match(ownership, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
  assert.equal(ownership, newScopedImportOwnershipSiteId({sourceUrl, agencyId, clientId}))
  assert.notEqual(ownership, newScopedImportOwnershipSiteId({sourceUrl, agencyId, clientId: 'e61d1982-068f-4d84-bb6f-c3fbfc93f39b'}))
})
