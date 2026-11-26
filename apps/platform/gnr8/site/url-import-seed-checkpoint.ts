import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UrlSinglePageImportSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'
import { resolveUrlImportSnapshotRootDirAbs } from '@/gnr8/validation/runtime/url-import-snapshot-root'

type Storage = Pick<SupabaseClient, 'storage'>
type FileRecord = { path: string; sha256: string; bytes: number }
type Manifest = {
  kind: 'url_import_seed_checkpoint_v1'
  sourceUrl: string
  snapshotId: string
  snapshotRunId: string
  oldStableRoot: string
  files: FileRecord[]
}
export type CachedImportHtmlPage = {
  finalUrl: string
  status: number
  redirected: boolean
  contentType: string | null
  bytes: Buffer
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SHA256 = /^[a-f0-9]{64}$/
const MAX_FILES = 2_000
const MAX_FILE_BYTES = 32 * 1024 * 1024
const MAX_TOTAL_BYTES = 512 * 1024 * 1024

function fail(): never { throw new Error('URL_IMPORT_SEED_CHECKPOINT_INVALID') }
function hash(bytes: Uint8Array): string { return crypto.createHash('sha256').update(bytes).digest('hex') }
function safeRelativePath(value: string): boolean {
  return value.length > 0 && value.length < 512 && !value.includes('\\') &&
    !value.startsWith('/') && value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}
function isMissing(error: unknown): boolean {
  const storageError = error as { status?: unknown; statusCode?: unknown; message?: unknown } | null
  const status = String(storageError?.status ?? '')
  const code = String(storageError?.statusCode ?? '')
  const message = String(storageError?.message ?? '')
  return status === '404' || code === '404' || code === 'NoSuchKey' ||
    (status === '400' || code === '400') && /not found|NoSuchKey/i.test(message)
}

/** Immutable seed capture, scoped to one agency/client/version/attempt. */
export class UrlImportSeedCheckpoint {
  private readonly prefix: string
  private bucketPromise?: Promise<ReturnType<Storage['storage']['from']>>
  constructor(
    private readonly client: Storage,
    private readonly bucketName: string,
    identity: { agencyId: string; clientId: string; siteVersionId: string; importAttemptId: string },
  ) {
    if (!Object.values(identity).every((value) => UUID.test(value)) ||
      !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucketName)) fail()
    const deploymentRevision = /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? '')
      ? process.env.VERCEL_GIT_COMMIT_SHA : 'local'
    this.prefix = `url-import-seed/v1/${identity.agencyId}/${identity.clientId}/${identity.siteVersionId}/${identity.importAttemptId}/${deploymentRevision}`
  }

  private async bucket() {
    this.bucketPromise ??= (async () => {
      const result = await this.client.storage.getBucket(this.bucketName)
      if (result.error || result.data?.public !== false) fail()
      return this.client.storage.from(this.bucketName)
    })()
    return this.bucketPromise
  }

  private async read(key: string): Promise<Buffer | null> {
    const bucket = await this.bucket()
    const result = await bucket.download(key)
    if (result.error) {
      if (isMissing(result.error)) return null
      // Storage JS downloads blobs without parsing error JSON. Supabase can return
      // HTTP 400 for a missing object, wrapped as StorageUnknownError. Verify the
      // exact object name before treating that otherwise ambiguous error as absent.
      const originalError = (result.error as { originalError?: { status?: unknown } }).originalError
      if (originalError?.status === 400) {
        const slash = key.lastIndexOf('/')
        const name = key.slice(slash + 1)
        const listing = await bucket.list(key.slice(0, slash), { search: name, limit: 2 })
        if (listing.error || !listing.data) fail()
        if (!listing.data.some((entry) => entry.name === name)) return null
      }
      fail()
    }
    if (!result.data || result.data.size > MAX_FILE_BYTES) fail()
    return Buffer.from(await result.data.arrayBuffer())
  }

  private async writeImmutable(key: string, body: Buffer): Promise<void> {
    const bucket = await this.bucket()
    try {
      const result = await bucket.upload(key, body, {
        upsert: false, contentType: 'application/octet-stream', cacheControl: '0',
      })
      if (!result.error) return
    } catch { /* Resolve an uncertain write by exact readback. */ }
    const existing = await this.read(key)
    if (!existing) fail()
    if (!existing.equals(body)) throw new Error('URL_IMPORT_CHECKPOINT_CONFLICT')
  }

  private responseKey(kind: 'pages' | 'assets', url: string): string {
    if (!/^https?:\/\//.test(url) || url.length > 2048) fail()
    return `${this.prefix}/${kind}/${hash(Buffer.from(url))}`
  }

  private async saveResponse(kind: 'pages' | 'assets', url: string, page: CachedImportHtmlPage): Promise<void> {
    const allowedStatus = page.status >= 200 && page.status < 300 ||
      kind === 'pages' && (page.status === 404 || page.status === 410)
    if (!/^https?:\/\//.test(page.finalUrl) || page.finalUrl.length > 2048 ||
      !Number.isInteger(page.status) || !allowedStatus ||
      page.bytes.length > 16 * 1024 * 1024 || (page.contentType?.length ?? 0) > 256) fail()
    const header = Buffer.from(JSON.stringify({ kind: `url_import_${kind}_v1`, url,
      finalUrl: page.finalUrl, status: page.status, redirected: page.redirected,
      contentType: page.contentType, bytes: page.bytes.length, sha256: hash(page.bytes) }))
    if (header.length > 8_192) fail()
    const prefix = Buffer.alloc(4)
    prefix.writeUInt32BE(header.length)
    await this.writeImmutable(this.responseKey(kind, url), Buffer.concat([prefix, header, page.bytes]))
  }

  private async loadResponse(kind: 'pages' | 'assets', url: string): Promise<CachedImportHtmlPage | null> {
    const body = await this.read(this.responseKey(kind, url))
    if (!body) return null
    if (body.length < 4) fail()
    const headerLength = body.readUInt32BE(0)
    if (headerLength > 8_192 || 4 + headerLength > body.length) fail()
    let header: Record<string, unknown>
    try { header = JSON.parse(body.subarray(4, 4 + headerLength).toString('utf8')) } catch { fail() }
    const bytes = body.subarray(4 + headerLength)
    const status = header.status
    const allowedStatus = typeof status === 'number' && (status >= 200 && status < 300 ||
      kind === 'pages' && (status === 404 || status === 410))
    if (header.kind !== `url_import_${kind}_v1` || header.url !== url ||
      typeof header.finalUrl !== 'string' || !/^https?:\/\//.test(header.finalUrl) ||
      header.finalUrl.length > 2048 || !Number.isInteger(status) || !allowedStatus ||
      typeof header.redirected !== 'boolean' ||
      !(header.contentType === null || typeof header.contentType === 'string' && header.contentType.length <= 256) ||
      header.bytes !== bytes.length || header.sha256 !== hash(bytes)) fail()
    return { finalUrl: header.finalUrl, status: header.status as number,
      redirected: header.redirected, contentType: header.contentType, bytes } as CachedImportHtmlPage
  }

  saveHtmlPage(url: string, page: CachedImportHtmlPage): Promise<void> {
    return this.saveResponse('pages', url, page)
  }

  loadHtmlPage(url: string): Promise<CachedImportHtmlPage | null> {
    return this.loadResponse('pages', url)
  }

  saveAsset(url: string, asset: CachedImportHtmlPage): Promise<void> {
    return this.saveResponse('assets', url, asset)
  }

  loadAsset(url: string): Promise<CachedImportHtmlPage | null> {
    return this.loadResponse('assets', url)
  }

  async save(snapshot: UrlSinglePageImportSnapshot): Promise<void> {
    const root = path.resolve(snapshot.snapshotRootDirAbs)
    const stableRoot = path.resolve(snapshot.snapshotStableRootDirAbs)
    if (path.dirname(path.dirname(root)) !== stableRoot ||
      !/^imported-url-site-[a-f0-9]{16}$/.test(snapshot.snapshotId) ||
      !/^[a-zA-Z0-9._-]{1,160}$/.test(snapshot.snapshotRunId) ||
      root !== path.join(stableRoot, 'runs', snapshot.snapshotRunId)) fail()
    const files: FileRecord[] = []
    let totalBytes = 0
    const visit = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name)
        if (entry.isDirectory()) visit(absolute)
        else if (entry.isFile()) {
          const relative = path.relative(root, absolute).split(path.sep).join('/')
          if (!safeRelativePath(relative) || files.length >= MAX_FILES || relative === '__snapshot.json') fail()
          const size = fs.statSync(absolute).size
          totalBytes += size
          if (size > MAX_FILE_BYTES || totalBytes > MAX_TOTAL_BYTES) fail()
          const body = fs.readFileSync(absolute)
          if (body.length !== size) fail()
          files.push({ path: relative, sha256: hash(body), bytes: size })
        } else fail()
      }
    }
    visit(root)
    const snapshotBody = Buffer.from(JSON.stringify(snapshot))
    totalBytes += snapshotBody.length
    if (snapshotBody.length > MAX_FILE_BYTES || files.length >= MAX_FILES || totalBytes > MAX_TOTAL_BYTES) fail()
    files.push({ path: '__snapshot.json', sha256: hash(snapshotBody), bytes: snapshotBody.length })
    files.sort((left, right) => left.path.localeCompare(right.path))
    const manifest: Manifest = {
      kind: 'url_import_seed_checkpoint_v1', sourceUrl: snapshot.sourceUrl,
      snapshotId: snapshot.snapshotId, snapshotRunId: snapshot.snapshotRunId,
      oldStableRoot: stableRoot, files,
    }
    let cursor = 0
    await Promise.all(Array.from({ length: Math.min(4, files.length) }, async () => {
      while (cursor < files.length) {
        const file = files[cursor++]!
        const body = file.path === '__snapshot.json' ? snapshotBody : fs.readFileSync(path.join(root, file.path))
        if (body.length !== file.bytes || hash(body) !== file.sha256) fail()
        await this.writeImmutable(`${this.prefix}/files/${file.sha256}`, body)
      }
    }))
    await this.writeImmutable(`${this.prefix}/manifest.json`, Buffer.from(JSON.stringify(manifest)))
  }

  async load(sourceUrl: string): Promise<UrlSinglePageImportSnapshot | null> {
    const manifestBody = await this.read(`${this.prefix}/manifest.json`)
    if (!manifestBody) return null
    let manifest: Manifest
    try { manifest = JSON.parse(manifestBody.toString('utf8')) as Manifest } catch { fail() }
    if (manifest.kind !== 'url_import_seed_checkpoint_v1' || manifest.sourceUrl !== sourceUrl ||
      !/^imported-url-site-[a-f0-9]{16}$/.test(manifest.snapshotId) ||
      !/^[a-zA-Z0-9._-]{1,160}$/.test(manifest.snapshotRunId) ||
      !path.isAbsolute(manifest.oldStableRoot) || !Array.isArray(manifest.files) ||
      manifest.files.length > MAX_FILES) fail()
    let total = 0
    const names = new Set<string>()
    for (const file of manifest.files) {
      if (!safeRelativePath(file.path) || names.has(file.path) || !SHA256.test(file.sha256) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > MAX_FILE_BYTES) fail()
      names.add(file.path); total += file.bytes
    }
    if (!names.has('__snapshot.json') || total > MAX_TOTAL_BYTES) fail()
    const stableRoot = path.join(resolveUrlImportSnapshotRootDirAbs(), manifest.snapshotId)
    const oldRoot = path.join(manifest.oldStableRoot, 'runs', manifest.snapshotRunId)
    const restoredRunId = `resume-${crypto.randomBytes(12).toString('hex')}`
    const root = path.join(stableRoot, 'runs', restoredRunId)
    const bytesByPath = new Map<string, Buffer>()
    let cursor = 0
    await Promise.all(Array.from({ length: Math.min(4, manifest.files.length) }, async () => {
      while (cursor < manifest.files.length) {
        const file = manifest.files[cursor++]!
        const body = await this.read(`${this.prefix}/files/${file.sha256}`)
        if (!body || body.length !== file.bytes || hash(body) !== file.sha256) fail()
        bytesByPath.set(file.path, body)
      }
    }))
    let snapshot: UrlSinglePageImportSnapshot
    try {
      const parsed = JSON.parse(bytesByPath.get('__snapshot.json')!.toString('utf8'))
      const relocate = (value: unknown): unknown => {
        if (typeof value === 'string' && value === oldRoot) return root
        if (typeof value === 'string' && value.startsWith(`${oldRoot}${path.sep}`))
          return `${root}${value.slice(oldRoot.length)}`
        if (typeof value === 'string' && value.startsWith(`${manifest.oldStableRoot}${path.sep}`))
          return `${stableRoot}${value.slice(manifest.oldStableRoot.length)}`
        if (Array.isArray(value)) return value.map(relocate)
        if (value && typeof value === 'object')
          return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, relocate(entry)]))
        return value
      }
      snapshot = { ...(relocate(parsed) as UrlSinglePageImportSnapshot), snapshotRunId: restoredRunId }
    } catch { fail() }
    if (snapshot.kind !== 'url_single_page_import_snapshot_v1' ||
      snapshot.sourceUrl !== sourceUrl || snapshot.snapshotId !== manifest.snapshotId ||
      snapshot.snapshotRunId !== restoredRunId || snapshot.snapshotRootDirAbs !== root ||
      snapshot.snapshotStableRootDirAbs !== stableRoot) fail()
    const insideRoot = (value: string): boolean =>
      typeof value === 'string' && path.resolve(value).startsWith(`${root}${path.sep}`)
    if (!insideRoot(snapshot.entryHtmlPathAbs) || !insideRoot(snapshot.assetsDirAbs) ||
      !insideRoot(snapshot.sourceSelection?.selectedSourceHtmlPathAbs)) fail()
    const retainedPath = (absolute: string): string => path.relative(root, absolute).split(path.sep).join('/')
    if (!names.has(retainedPath(snapshot.entryHtmlPathAbs)) ||
      !names.has(retainedPath(snapshot.sourceSelection.selectedSourceHtmlPathAbs))) fail()
    fs.rmSync(root, { recursive: true, force: true })
    for (const file of manifest.files) {
      if (file.path === '__snapshot.json') continue
      const absolute = path.join(root, file.path)
      fs.mkdirSync(path.dirname(absolute), { recursive: true })
      fs.writeFileSync(absolute, bytesByPath.get(file.path)!)
    }
    return snapshot
  }
}
