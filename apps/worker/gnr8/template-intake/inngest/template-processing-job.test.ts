import assert from 'node:assert/strict'
import test from 'node:test'

import { runTemplateProcessingJob } from '@/gnr8/template-intake/inngest/template-processing-job'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplate(seed: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: seed.id ?? '00000000-0000-4000-8000-000000000901',
    clientId: seed.clientId ?? '00000000-0000-4000-8000-000000000201',
    organizationId: seed.organizationId ?? '00000000-0000-4000-8000-000000000201',
    agencyId: seed.agencyId ?? '00000000-0000-4000-8000-000000000301',
    createdByUserId: seed.createdByUserId ?? '00000000-0000-4000-8000-000000000101',
    name: seed.name ?? 'Template One',
    slug: seed.slug ?? 'template-one',
    sourceType: 'zip_html',
    status: seed.status ?? 'processing',
    importHealth: seed.importHealth ?? 'degraded',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'html_snapshot',
    tags: seed.tags ?? [],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? 'bucket',
    sourceZipStorageKey: seed.sourceZipStorageKey ?? 'key',
    entryHtmlPath: seed.entryHtmlPath ?? null,
    entryHtmlFileName: seed.entryHtmlFileName ?? null,
    templateType: seed.templateType ?? 'unknown',
    importSnapshotId: seed.importSnapshotId ?? null,
    durableSnapshotRootDirAbs: seed.durableSnapshotRootDirAbs ?? null,
    templateManifestSummary: seed.templateManifestSummary ?? null,
    diagnosticsSummary: seed.diagnosticsSummary ?? null,
    importManifestSummary: seed.importManifestSummary ?? null,
    processingStartedAt: seed.processingStartedAt ?? null,
    processingCompletedAt: seed.processingCompletedAt ?? null,
    processingError: seed.processingError ?? null,
    processingAttempts: seed.processingAttempts ?? 0,
    version: seed.version ?? 1,
    visibility: 'private',
    createdAt: seed.createdAt ?? '2026-04-16T10:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-04-16T10:01:00.000Z',
  }
}

test('worker success path runs processing after attempt start', async () => {
  let processCalled = false
  let finalFailureCalled = false

  await runTemplateProcessingJob({
    eventData: {
      templateId: '00000000-0000-4000-8000-000000000901',
      clientId: '00000000-0000-4000-8000-000000000201',
      sourceZipStorageBucket: 'bucket',
      sourceZipStorageKey: 'key',
    },
    deps: {
      getTemplateByIdForClient: async () => createTemplate(),
      updateTemplateSourceZipReference: async () => createTemplate(),
      markTemplateProcessingAttemptStarted: async () => createTemplate({ processingAttempts: 1 }),
      processTemplateZipIntakeJob: async () => {
        processCalled = true
        return { ok: true, template: createTemplate({ status: 'ready', importHealth: 'clean' }) }
      },
      markTemplateProcessingRetryableFailure: async () => createTemplate(),
      markTemplateProcessingFinalFailure: async () => {
        finalFailureCalled = true
        return createTemplate({ status: 'failed', importHealth: 'failed' })
      },
    },
  })

  assert.equal(processCalled, true)
  assert.equal(finalFailureCalled, false)
})

test('worker retry path marks retryable failure and throws', async () => {
  let retryFailureCalled = false
  let finalFailureCalled = false

  await assert.rejects(
    runTemplateProcessingJob({
      eventData: {
        templateId: '00000000-0000-4000-8000-000000000901',
        clientId: '00000000-0000-4000-8000-000000000201',
        sourceZipStorageBucket: 'bucket',
        sourceZipStorageKey: 'key',
      },
      deps: {
        getTemplateByIdForClient: async () => createTemplate(),
        updateTemplateSourceZipReference: async () => createTemplate(),
        markTemplateProcessingAttemptStarted: async () => createTemplate({ processingAttempts: 2 }),
        processTemplateZipIntakeJob: async () => ({ ok: false, template: createTemplate(), error: 'boom' }),
        markTemplateProcessingRetryableFailure: async () => {
          retryFailureCalled = true
          return createTemplate({ processingError: 'boom' })
        },
        markTemplateProcessingFinalFailure: async () => {
          finalFailureCalled = true
          return createTemplate({ status: 'failed', importHealth: 'failed' })
        },
      },
    }),
  )

  assert.equal(retryFailureCalled, true)
  assert.equal(finalFailureCalled, false)
})

test('worker final failure path marks template failed without throwing', async () => {
  let retryFailureCalled = false
  let finalFailureCalled = false

  await runTemplateProcessingJob({
    eventData: {
      templateId: '00000000-0000-4000-8000-000000000901',
      clientId: '00000000-0000-4000-8000-000000000201',
      sourceZipStorageBucket: 'bucket',
      sourceZipStorageKey: 'key',
    },
    deps: {
      getTemplateByIdForClient: async () => createTemplate(),
      updateTemplateSourceZipReference: async () => createTemplate(),
      markTemplateProcessingAttemptStarted: async () => createTemplate({ processingAttempts: 3 }),
      processTemplateZipIntakeJob: async () => ({ ok: false, template: createTemplate(), error: 'boom-final' }),
      markTemplateProcessingRetryableFailure: async () => {
        retryFailureCalled = true
        return createTemplate({ processingError: 'boom-final' })
      },
      markTemplateProcessingFinalFailure: async () => {
        finalFailureCalled = true
        return createTemplate({ status: 'failed', importHealth: 'failed' })
      },
    },
  })

  assert.equal(retryFailureCalled, false)
  assert.equal(finalFailureCalled, true)
})

