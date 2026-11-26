import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import type { UrlSinglePageImportSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'
import { resolveUrlImportSnapshotRootDirAbs } from '@/gnr8/validation/runtime/url-import-snapshot-root'
import { UrlImportSeedCheckpoint } from './url-import-seed-checkpoint'

test('seed capture is restored from private storage for the same import identity', async () => {
  const objects = new Map<string, Buffer>()
  const storage = {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: async (key: string, body: Uint8Array) => {
        if (objects.has(key)) return { error: { statusCode: '409' } }
        objects.set(key, Buffer.from(body))
        return { error: null }
      },
      download: async (key: string) => {
        const body = objects.get(key)
        return body
          ? { data: new Blob([new Uint8Array(body)]), error: null }
          : { data: null, error: { statusCode: '404' } }
      },
    }),
  }
  const identity = {
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    importAttemptId: '44444444-4444-4444-8444-444444444444',
  }
  const checkpoint = new UrlImportSeedCheckpoint({ storage } as never, 'private-bucket', identity)
  const snapshotId = 'imported-url-site-1234567890abcdef'
  const stableRoot = path.join(resolveUrlImportSnapshotRootDirAbs(), snapshotId)
  const root = path.join(stableRoot, 'runs', 'checkpoint-test-run')
  const entryHtmlPathAbs = path.join(root, 'index.html')
  const imagePath = path.join(root, 'assets', 'logo.png')
  fs.mkdirSync(path.dirname(imagePath), { recursive: true })
  fs.writeFileSync(entryHtmlPathAbs, '<html><body><img src="/assets/logo.png"></body></html>')
  fs.writeFileSync(imagePath, new Uint8Array([1, 2, 3]))
  const snapshot = {
    kind: 'url_single_page_import_snapshot_v1', sourceUrl: 'https://example.com/',
    normalizedUrl: 'https://example.com/', snapshotId, snapshotRunId: 'checkpoint-test-run',
    snapshotStableRootDirAbs: stableRoot, snapshotRootDirAbs: root,
    entryHtmlPathAbs, assetsDirAbs: path.join(root, 'assets'),
    sourceSelection: { selectedSourceHtmlPathAbs: entryHtmlPathAbs },
    importIntake: { ok: true },
  } as UrlSinglePageImportSnapshot
  try {
    assert.equal(await checkpoint.load(snapshot.sourceUrl), null)
    await checkpoint.save(snapshot)
    fs.rmSync(root, { recursive: true, force: true })
    const restored = await checkpoint.load(snapshot.sourceUrl)
    assert.ok(restored?.snapshotRootDirAbs.startsWith(path.join(stableRoot, 'runs', 'resume-')))
    assert.notEqual(restored.snapshotRootDirAbs, root)
    assert.equal(restored.sourceSelection.selectedSourceHtmlPathAbs, restored.entryHtmlPathAbs)
    assert.deepEqual(fs.readFileSync(path.join(restored.snapshotRootDirAbs, 'assets', 'logo.png')), Buffer.from([1, 2, 3]))
    assert.match(fs.readFileSync(restored.entryHtmlPathAbs, 'utf8'), /logo\.png/)
    assert.equal(await checkpoint.load('https://different.example.com/').then(() => false).catch(() => true), true)
    const imageObject = [...objects].find(([key, body]) => key.includes('/files/') && body.equals(Buffer.from([1, 2, 3])))
    assert.ok(imageObject)
    objects.set(imageObject[0], Buffer.from([9, 9, 9]))
    await assert.rejects(checkpoint.load(snapshot.sourceUrl), /URL_IMPORT_SEED_CHECKPOINT_INVALID/)
  } finally {
    fs.rmSync(stableRoot, { recursive: true, force: true })
  }
})
