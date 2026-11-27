import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'

import {
  captureAssetsForAdditionalHtmlPages,
  UrlImportAssetContinuationRequired,
  type UrlSinglePageImportSnapshot,
} from '@/gnr8/validation/runtime/url-single-page-import'
import { resolveUrlImportSnapshotRootDirAbs } from '@/gnr8/validation/runtime/url-import-snapshot-root'
import { UrlImportSeedCheckpoint } from './url-import-seed-checkpoint'

test('missing checkpoint is recognized through the real Supabase Storage download wrapper', async () => {
  const client = createClient('https://storage.example.test', 'service-role-test-key', {
    global: { fetch: async (input, init) => {
      const url = String(input)
      if (url.endsWith('/storage/v1/bucket/private-bucket'))
        return Response.json({ name: 'private-bucket', public: false })
      if (init?.method === 'POST' && url.endsWith('/storage/v1/object/list/private-bucket'))
        return Response.json([])
      if (init?.method === 'GET' && url.includes('/storage/v1/object/private-bucket/'))
        return Response.json({ statusCode: 'NoSuchKey', error: 'not_found', message: 'Object not found' },
          { status: 400 })
      throw new Error(`Unexpected storage request: ${init?.method} ${url}`)
    } },
  })
  const checkpoint = new UrlImportSeedCheckpoint(client, 'private-bucket', {
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    importAttemptId: '44444444-4444-4444-8444-444444444444',
  })
  assert.equal(await checkpoint.load('https://example.com/'), null)
})

test('transient storage rate limit is retried before declaring a checkpoint missing', async () => {
  let downloads = 0
  const storage = {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      list: async () => ({ data: [], error: null }),
      download: async () => {
        downloads += 1
        return { data: null, error: downloads < 3
          ? { originalError: { status: 429 } }
          : { statusCode: 'NoSuchKey' } }
      },
    }),
  }
  const checkpoint = new UrlImportSeedCheckpoint({ storage } as never, 'private-bucket', {
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    importAttemptId: '44444444-4444-4444-8444-444444444444',
  })
  assert.equal(await checkpoint.load('https://example.com/'), null)
  assert.equal(downloads, 3)
})

test('seed capture is restored from private storage for the same import identity', async () => {
  const objects = new Map<string, Buffer>()
  let rejectExisting = false
  let downloads = 0
  let assetLists = 0
  const storage = {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: async (key: string, body: Uint8Array) => {
        if (objects.has(key)) return { error: { statusCode: '409' } }
        objects.set(key, Buffer.from(body))
        return { error: null }
      },
      download: async (key: string) => {
        downloads += 1
        const body = objects.get(key)
        return body && !rejectExisting
          ? { data: new Blob([new Uint8Array(body)]), error: null }
          : { data: null, error: { name: 'StorageUnknownError', message: '{}',
            originalError: { status: 400 } } }
      },
      list: async (folder: string, options: { search?: string; offset?: number; limit?: number }) => {
        if (folder.endsWith('/assets') && !options.search) assetLists += 1
        return { data: [...new Set([...objects.keys()].filter((key) => key.startsWith(`${folder}/`))
          .map((key) => key.slice(folder.length + 1).split('/')[0]))]
          .map((name) => ({ name }))
          .filter((entry) => !options.search || entry.name === options.search)
          .slice(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 100)), error: null }
      },
    }),
  }
  const identity = {
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    importAttemptId: '44444444-4444-4444-8444-444444444444',
  }
  let checkpoint = new UrlImportSeedCheckpoint({ storage } as never, 'private-bucket', identity)
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
    const downloadsBeforeMissingAsset = downloads
    assert.equal(await checkpoint.loadAsset('https://example.com/missing.png'), null)
    assert.equal(await checkpoint.loadAsset('https://example.com/another-missing.png'), null)
    assert.equal(downloads, downloadsBeforeMissingAsset)
    assert.equal(assetLists, 1)
    await assert.rejects(checkpoint.loadAsset('not-a-url'), /URL_IMPORT_SEED_CHECKPOINT_INVALID/)
    rejectExisting = true
    await assert.rejects(checkpoint.load(snapshot.sourceUrl), /URL_IMPORT_SEED_CHECKPOINT_INVALID/)
    rejectExisting = false
    for (const [key, body] of [...objects]) {
      if (!key.includes('/capture-v1/')) continue
      objects.delete(key)
      objects.set(key.replace('/capture-v1/', `/${'a'.repeat(40)}/`), body)
    }
    const legacyManifestKey = [...objects.keys()].find((key) => key.endsWith('/manifest.json'))!
    const conflictingManifestKey = legacyManifestKey.replace(`/${'a'.repeat(40)}/`, `/${'b'.repeat(40)}/`)
    objects.set(conflictingManifestKey, Buffer.from('different capture'))
    await assert.rejects(new UrlImportSeedCheckpoint({ storage } as never, 'private-bucket', identity)
      .load(snapshot.sourceUrl), /URL_IMPORT_CHECKPOINT_CONFLICT/)
    objects.delete(conflictingManifestKey)
    checkpoint = new UrlImportSeedCheckpoint({ storage } as never, 'private-bucket', identity)
    fs.rmSync(root, { recursive: true, force: true })
    const restored = await checkpoint.load(snapshot.sourceUrl)
    assert.ok(restored?.snapshotRootDirAbs.startsWith(path.join(stableRoot, 'runs', 'resume-')))
    assert.notEqual(restored.snapshotRootDirAbs, root)
    assert.equal(restored.sourceSelection.selectedSourceHtmlPathAbs, restored.entryHtmlPathAbs)
    assert.deepEqual(fs.readFileSync(path.join(restored.snapshotRootDirAbs, 'assets', 'logo.png')), Buffer.from([1, 2, 3]))
    assert.match(fs.readFileSync(restored.entryHtmlPathAbs, 'utf8'), /logo\.png/)
    const pageUrl = 'https://example.com/about'
    await checkpoint.saveHtmlPage(pageUrl, {
      finalUrl: pageUrl, status: 200, redirected: false,
      contentType: 'text/html', bytes: Buffer.from('<main>About</main>'),
    })
    assert.deepEqual(await checkpoint.loadHtmlPage(pageUrl), {
      finalUrl: pageUrl, status: 200, redirected: false,
      contentType: 'text/html', bytes: Buffer.from('<main>About</main>'),
    })
    const deletedUrl = 'https://example.com/deleted'
    await checkpoint.saveHtmlPage(deletedUrl, { finalUrl: deletedUrl, status: 404,
      redirected: false, contentType: 'text/html', bytes: Buffer.alloc(0) })
    assert.equal((await checkpoint.loadHtmlPage(deletedUrl))?.status, 404)
    await assert.rejects(checkpoint.saveHtmlPage(pageUrl, {
      finalUrl: pageUrl, status: 200, redirected: false,
      contentType: 'text/html', bytes: Buffer.from('<main>Changed</main>'),
    }), /URL_IMPORT_CHECKPOINT_CONFLICT/)
    const assetUrl = 'https://example.com/logo.png'
    await checkpoint.saveAsset(assetUrl, { finalUrl: assetUrl, status: 200,
      redirected: false, contentType: 'image/png', bytes: Buffer.from([1, 2, 3]) })
    const downloadsBeforePresenceCheck = downloads
    assert.equal(await checkpoint.hasAsset(assetUrl), true)
    assert.equal(await checkpoint.hasAsset('https://example.com/not-there.png'), false)
    assert.equal(downloads, downloadsBeforePresenceCheck)
    assert.deepEqual((await checkpoint.loadAsset(assetUrl))?.bytes, Buffer.from([1, 2, 3]))
    let sourceRequests = 0
    const childHtml = Array.from({ length: 17 }, (_, index) =>
      `<img src="https://example.com/child-${index}.png">`).join('')
    const childInput = {
      snapshotRootDirAbs: restored.snapshotRootDirAbs,
      pages: [{ pageUrl: 'https://example.com/child',
        bodyPath: path.join(restored.snapshotRootDirAbs, 'child.html'), html: childHtml }],
      assetCheckpoint: checkpoint,
      fetchImpl: async () => {
        sourceRequests += 1
        return new Response('x', { headers: { 'content-type': 'image/png' } })
      },
    }
    await assert.rejects(captureAssetsForAdditionalHtmlPages(childInput), UrlImportAssetContinuationRequired)
    assert.equal(sourceRequests, 16)
    assert.equal((await captureAssetsForAdditionalHtmlPages(childInput)).summary.fetchedAssetCount, 17)
    assert.equal(sourceRequests, 17)
    assert.equal(await checkpoint.load('https://different.example.com/').then(() => false).catch(() => true), true)
    const imageObject = [...objects].find(([key, body]) => key.includes('/files/') && body.equals(Buffer.from([1, 2, 3])))
    assert.ok(imageObject)
    objects.set(imageObject[0], Buffer.from([9, 9, 9]))
    await assert.rejects(checkpoint.load(snapshot.sourceUrl), /URL_IMPORT_SEED_CHECKPOINT_INVALID/)
  } finally {
    fs.rmSync(stableRoot, { recursive: true, force: true })
  }
})
