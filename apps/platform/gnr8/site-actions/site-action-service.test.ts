import assert from 'node:assert/strict'
import test from 'node:test'

import { __siteActionTestUtils } from '@/gnr8/site-actions/site-action-service'

test('rerun and redesign actions map to run_migration permission', () => {
  assert.equal(__siteActionTestUtils.requiredAgencyActionForSiteAction('rerun_transformation'), 'run_migration')
  assert.equal(__siteActionTestUtils.requiredAgencyActionForSiteAction('generate_redesign'), 'run_migration')
})

test('publish action maps to publish permission', () => {
  assert.equal(__siteActionTestUtils.requiredAgencyActionForSiteAction('publish_site'), 'publish')
})

test('redesign strategy resolves deterministic known mappings', () => {
  const visual = __siteActionTestUtils.resolveRedesignStrategy('More visual')
  assert.equal(visual.layoutStrategy, 'visual_gallery')
  assert.equal(visual.fallbackApplied, false)

  const conversion = __siteActionTestUtils.resolveRedesignStrategy('conversion focused')
  assert.equal(conversion.layoutStrategy, 'cta_focused')
  assert.equal(conversion.fallbackApplied, false)
})

test('invalid redesign strategy falls back deterministically', () => {
  const resolved = __siteActionTestUtils.resolveRedesignStrategy('ultra experimental kinetic')
  assert.equal(resolved.layoutStrategy, 'corporate_balanced')
  assert.equal(resolved.fallbackApplied, true)
})

test('Astro generation resolves the current validated raw-capture lineage instead of route-count lookalikes', () => {
  assert.deepEqual(
    __siteActionTestUtils.resolveCurrentCaptureLineageRef({
      currentMultiPagePreviewValidation: {
        sourceIdentity: {
          siteVersionId: '0f032ddf-967c-4dd7-89f7-ee67c7c0336d',
          rawArtifactId: 'b5d83d99-ee0d-43b5-bc74-2486c8216d78',
          snapshotRunId: 'client-site-import-1791888642617-25056d3c',
        },
      },
      historicalValidation: {
        sourceIdentity: {
          siteVersionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          rawArtifactId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        },
      },
    }),
    {
      siteVersionId: '0f032ddf-967c-4dd7-89f7-ee67c7c0336d',
      rawArtifactId: 'b5d83d99-ee0d-43b5-bc74-2486c8216d78',
    },
  )
  assert.equal(__siteActionTestUtils.resolveCurrentCaptureLineageRef({ routeCount: 36 }), null)
})

test('RBAC enforcement denies member and allows admin for site actions', () => {
  assert.equal(__siteActionTestUtils.isRoleAuthorizedForSiteAction('member', 'rerun_transformation'), false)
  assert.equal(__siteActionTestUtils.isRoleAuthorizedForSiteAction('member', 'publish_site'), false)

  assert.equal(__siteActionTestUtils.isRoleAuthorizedForSiteAction('admin', 'rerun_transformation'), true)
  assert.equal(__siteActionTestUtils.isRoleAuthorizedForSiteAction('admin', 'publish_site'), true)
})
