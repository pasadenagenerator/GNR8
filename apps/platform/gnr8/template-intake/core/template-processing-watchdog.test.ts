import assert from 'node:assert/strict'
import test from 'node:test'

import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import { reenqueueStuckTemplateProcessing } from '@/gnr8/template-intake/core/template-processing-watchdog'

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

test('watchdog identifies stale processing templates and re-enqueues them', async () => {
  const now = new Date('2026-04-20T10:00:00.000Z').getTime()
  const stale = new Date('2026-04-20T09:40:00.000Z').toISOString()
  const fresh = new Date('2026-04-20T09:57:00.000Z').toISOString()

  let calls = 0
  const result = await reenqueueStuckTemplateProcessing({
    clientId: '00000000-0000-4000-8000-000000000201',
    templates: [
      createTemplate({ id: 'stale-1', status: 'processing', processingStartedAt: stale }),
      createTemplate({ id: 'fresh-1', status: 'processing', processingStartedAt: fresh }),
      createTemplate({ id: 'ready-1', status: 'ready', processingStartedAt: stale }),
    ],
    nowMs: now,
    staleAfterMinutes: 10,
    triggerTemplateProcessingJob: async () => {
      calls += 1
      return true
    },
  })

  assert.equal(result.candidateCount, 1)
  assert.equal(result.reenqueueCount, 1)
  assert.equal(result.skippedByAttemptLimitCount, 0)
  assert.equal(result.skippedByRunLimitCount, 0)
  assert.equal(calls, 1)
})

test('watchdog applies attempt and per-run limits to avoid uncontrolled re-enqueue loops', async () => {
  const now = new Date('2026-04-20T10:00:00.000Z').getTime()
  const stale = new Date('2026-04-20T09:40:00.000Z').toISOString()

  let calls = 0
  const result = await reenqueueStuckTemplateProcessing({
    clientId: '00000000-0000-4000-8000-000000000201',
    templates: [
      createTemplate({ id: 'limit-attempts', status: 'processing', processingStartedAt: stale, processingAttempts: 3 }),
      createTemplate({ id: 'run-1', status: 'processing', processingStartedAt: stale, processingAttempts: 0 }),
      createTemplate({ id: 'run-2', status: 'processing', processingStartedAt: stale, processingAttempts: 0 }),
    ],
    nowMs: now,
    staleAfterMinutes: 10,
    maxAttempts: 3,
    maxReenqueuePerRun: 1,
    triggerTemplateProcessingJob: async () => {
      calls += 1
      return true
    },
  })

  assert.equal(result.candidateCount, 3)
  assert.equal(result.reenqueueCount, 1)
  assert.equal(result.skippedByAttemptLimitCount, 1)
  assert.equal(result.skippedByRunLimitCount, 1)
  assert.equal(calls, 1)
})
