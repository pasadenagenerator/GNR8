import assert from 'node:assert/strict'
import test from 'node:test'

import { runSiteTemplateBootstrapJob } from '@/gnr8/site/inngest/site-template-bootstrap-job'

const SITE = {
  siteId: '00000000-0000-4000-8000-000000000777',
  clientId: '00000000-0000-4000-8000-000000000201',
  agencyId: '00000000-0000-4000-8000-000000000301',
  templateId: '00000000-0000-4000-8000-000000000901',
  name: 'Site One',
  domain: 'example.com',
  status: 'draft',
  createdAt: '2026-04-16T10:00:00.000Z',
  updatedAt: '2026-04-16T10:01:00.000Z',
}

const TEMPLATE = {
  id: '00000000-0000-4000-8000-000000000901',
  status: 'ready',
  sourceFilename: 'template.zip',
  sourceZipStorageBucket: 'bucket',
  sourceZipStorageKey: 'key',
  importSnapshotId: 'snapshot-1',
  durableSnapshotRootDirAbs: '/tmp/gnr8',
  entryHtmlPath: 'index.html',
  entryHtmlFileName: 'index.html',
  importManifestSummary: { assetsDirPath: 'assets' },
}

test('worker site bootstrap success path persists completion', async () => {
  let started = false
  let completed = false
  let failed = false
  let renderEmitCount = 0

  await runSiteTemplateBootstrapJob({
    eventData: {
      siteId: SITE.siteId,
      clientId: SITE.clientId,
      agencyId: SITE.agencyId,
      templateId: SITE.templateId,
    },
    deps: {
      getSiteBootstrapRecordById: async () => SITE,
      getTemplateByIdForClient: async () => TEMPLATE as any,
      markSiteBootstrapStarted: async () => {
        started = true
      },
      bootstrapRuntimeFromTemplateSite: async () => ({
        siteVersionId: '00000000-0000-4000-8000-000000000981',
        siteVersionNo: 1,
        runtimeSiteId: '00000000-0000-4000-8000-000000000982',
        artifactId: '00000000-0000-4000-8000-000000000983',
        previewSeeded: true,
        sectionCount: 6,
        slotCount: 4,
        previewReady: true,
        previewUrl: '/api/gnr8/runtime/versions/00000000-0000-4000-8000-000000000981/preview?mode=raw_template_preview&path=/',
        warningCode: null,
      }),
      markSiteBootstrapCompleted: async () => {
        completed = true
      },
      queueSiteRenderJob: async () => ({
        shouldEmit: true,
        status: 'queued',
      }),
      emitSiteRenderRequestedEvent: async () => {
        renderEmitCount += 1
      },
      markSiteBootstrapFailed: async () => {
        failed = true
      },
    },
  })

  assert.equal(started, true)
  assert.equal(completed, true)
  assert.equal(failed, false)
  assert.equal(renderEmitCount, 1)
})

test('worker site bootstrap failure path persists failure and rethrows', async () => {
  let failed = false
  let renderEmitCount = 0

  await assert.rejects(
    runSiteTemplateBootstrapJob({
      eventData: {
        siteId: SITE.siteId,
        clientId: SITE.clientId,
        agencyId: SITE.agencyId,
        templateId: SITE.templateId,
      },
      deps: {
        getSiteBootstrapRecordById: async () => SITE,
        getTemplateByIdForClient: async () => TEMPLATE as any,
        markSiteBootstrapStarted: async () => undefined,
        bootstrapRuntimeFromTemplateSite: async () => {
          throw new Error('boom')
        },
        markSiteBootstrapCompleted: async () => undefined,
        queueSiteRenderJob: async () => ({
          shouldEmit: true,
          status: 'queued',
        }),
        emitSiteRenderRequestedEvent: async () => {
          renderEmitCount += 1
        },
        markSiteBootstrapFailed: async () => {
          failed = true
        },
      },
    }),
  )

  assert.equal(failed, true)
  assert.equal(renderEmitCount, 0)
})

test('worker site bootstrap success does not emit duplicate render event when guardrail blocks trigger', async () => {
  let renderEmitCount = 0

  await runSiteTemplateBootstrapJob({
    eventData: {
      siteId: SITE.siteId,
      clientId: SITE.clientId,
      agencyId: SITE.agencyId,
      templateId: SITE.templateId,
    },
    deps: {
      getSiteBootstrapRecordById: async () => SITE,
      getTemplateByIdForClient: async () => TEMPLATE as any,
      markSiteBootstrapStarted: async () => undefined,
      bootstrapRuntimeFromTemplateSite: async () => ({
        siteVersionId: '00000000-0000-4000-8000-000000000981',
        siteVersionNo: 1,
        runtimeSiteId: '00000000-0000-4000-8000-000000000982',
        artifactId: '00000000-0000-4000-8000-000000000983',
        previewSeeded: true,
        sectionCount: 6,
        slotCount: 0,
        previewReady: true,
        previewUrl: '/api/gnr8/runtime/versions/00000000-0000-4000-8000-000000000981/preview?mode=raw_template_preview&path=/',
        warningCode: 'CONTENT_SLOTS_EMPTY',
      }),
      markSiteBootstrapCompleted: async () => undefined,
      queueSiteRenderJob: async () => ({
        shouldEmit: false,
        status: 'completed',
      }),
      emitSiteRenderRequestedEvent: async () => {
        renderEmitCount += 1
      },
      markSiteBootstrapFailed: async () => undefined,
    },
  })

  assert.equal(renderEmitCount, 0)
})
