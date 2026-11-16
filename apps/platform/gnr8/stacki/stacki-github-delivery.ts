import { validStackiDeliveryPath } from './stacki-delivery-path';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseStackiRecord, parseStackiScope, STACKI_CHECKPOINT_MAX_BYTES, StackiDraftError,
  type StackiDraftRecord, type StackiDraftScope } from './stacki-draft-contract';
import { retainedAssetName, type StackiRuntimeAsset } from './stacki-retained-assets';

export type StackiGitAssetRef = { name: string; sha256: string; bytes: number; blob: string };
export type StackiAssetDelivery = { commit: string; redirects: Record<string, string> };
type Entry = StackiGitAssetRef & { path: string; mediaType: string; remote: boolean };
type Package = { format: 'stacki-github-delivery:v1'; commit: string; record: StackiDraftRecord;
  entries: Entry[]; local: Array<{name:string;base64:string}> };
const MAX_PACKAGE = STACKI_CHECKPOINT_MAX_BYTES + 12 * 1024 * 1024;
const hash = (body: Uint8Array | string) => createHash('sha256').update(body).digest('hex');
const binaryTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif',
  'image/x-icon', 'image/vnd.microsoft.icon', 'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
  'application/font-woff', 'application/vnd.ms-fontobject']);
function fail(): never { throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE'); }

/** Parse only the generated JSON literal, never execute editable Astro config.
 * CSS, SVG and other potentially linked content keep their original same-origin
 * URL. Only leaf images/fonts are delivered directly from the private cache. */
export function stackiDeliveryEntries(record: StackiDraftRecord, refs: StackiGitAssetRef[]): Entry[] {
  if (!refs.length) return [];
  const config = record.files.find(file => file.path === 'astro.config.mjs');
  const source = config ? Buffer.from(config.base64, 'base64').toString() : '';
  const matches = [...source.matchAll(/^const retained = (\{[^\n]*\});$/gm)];
  if (matches.length !== 1) fail();
  let routes: Record<string, {name:string;mediaType:string}>;
  try { routes = JSON.parse(matches[0][1]); } catch { fail(); }
  const byName = new Map<string, {path:string;mediaType:string}>();
  for (const [path, value] of Object.entries(routes)) {
    if (!validStackiDeliveryPath(path) ||
        !value || value.name !== retainedAssetName(path) || byName.has(value.name) ||
        typeof value.mediaType !== 'string' || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:; charset=utf-8)?$/i.test(value.mediaType)) fail();
    byName.set(value.name, {path, mediaType:value.mediaType});
  }
  if (byName.size !== refs.length || refs.length > 2000) fail();
  let total = 0;
  const names = new Set<string>();
  return refs.map(ref => {
    const route = byName.get(ref.name);
    if (!route || names.has(ref.name) || !/^[a-f0-9]{64}$/.test(ref.sha256) ||
        !/^[a-f0-9]{40}$/.test(ref.blob) || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 ||
        ref.bytes > 12 * 1024 * 1024) fail();
    names.add(ref.name); total += ref.bytes;
    if (total > 128 * 1024 * 1024) fail();
    return {...ref, ...route, remote:binaryTypes.has(route.mediaType.toLowerCase())};
  });
}

/** Immutable, disposable serving derivative. Git's verified manifest is always
 * required to restore it; this class cannot advance a checkpoint or a Git head.
 * Private bucket only, scoped keys, write-once uploads with exact readback. */
export class StackiGitHubDelivery {
  constructor(private client: Pick<SupabaseClient, 'storage'>, private bucket: string) {}
  private prefix(scope: StackiDraftScope) {
    const s = parseStackiScope(scope);
    return `stacki-github-delivery/v1/${s.agencyId}/${s.clientId}/${s.siteId}/${s.siteVersionId}`;
  }
  private packageKey(scope: StackiDraftScope, commit: string) {
    if (!/^[a-f0-9]{40}$/.test(commit)) fail();
    return `${this.prefix(scope)}/commits/${commit}.json`;
  }
  private assetKey(scope: StackiDraftScope, entry: Entry) {
    return `${this.prefix(scope)}/assets/${entry.sha256}/${hash(entry.mediaType)}`;
  }
  private async storage() {
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucket)) fail();
    const result = await this.client.storage.getBucket(this.bucket);
    if (result.error || result.data?.public !== false) fail();
    return this.client.storage.from(this.bucket);
  }
  private async readPackage(scope: StackiDraftScope, commit: string): Promise<Package> {
    const result = await (await this.storage()).download(this.packageKey(scope, commit));
    if (result.error || !result.data || result.data.size > MAX_PACKAGE) fail();
    let value: Package;
    try { value = JSON.parse(await result.data.text()); } catch { fail(); }
    if (value.format !== 'stacki-github-delivery:v1' || value.commit !== commit ||
        !Array.isArray(value.entries) || !Array.isArray(value.local)) fail();
    value.record = parseStackiRecord(value.record, scope, value.record?.revision);
    const entries = stackiDeliveryEntries(value.record, value.entries);
    if (JSON.stringify(entries) !== JSON.stringify(value.entries)) fail();
    const local = entries.filter(entry => !entry.remote);
    if (local.length !== value.local.length) fail();
    value.local.forEach((file, i) => {
      if (!file || file.name !== local[i].name || typeof file.base64 !== 'string') fail();
      const body = Buffer.from(file.base64, 'base64');
      if (body.toString('base64') !== file.base64 || body.length !== local[i].bytes || hash(body) !== local[i].sha256) fail();
    });
    return value;
  }
  /** Must run only AFTER Git commit/tree and file hashes have been verified. */
  async prepare(commit: string, record: StackiDraftRecord, refs: StackiGitAssetRef[],
    assets?: StackiRuntimeAsset[], priorCommit?: string) {
    parseStackiRecord(record, record.scope, record.revision);
    const entries = stackiDeliveryEntries(record, refs);
    const bucket = await this.storage();
    let local: Package['local'];
    if (assets) {
      const byName = new Map(assets.map(asset => [asset.name, asset.body]));
      if (byName.size !== entries.length || assets.length !== entries.length) fail();
      local = [];
      // Bounded fan-out and all-settled: no unfinished writes after a failure.
      for (let offset = 0; offset < entries.length; offset += 8) {
        const results = await Promise.allSettled(entries.slice(offset, offset + 8).map(async entry => {
          const body = byName.get(entry.name);
          if (!body || body.length !== entry.bytes || hash(body) !== entry.sha256 ||
              createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex') !== entry.blob) fail();
          if (!entry.remote) return;
          await this.put(bucket, this.assetKey(record.scope, entry), body, entry.mediaType, '3600');
        }));
        for (const result of results) if (result.status === 'rejected') throw result.reason;
      }
      local = entries.filter(entry => !entry.remote).map(entry => ({name:entry.name,base64:byName.get(entry.name)!.toString('base64')}));
    } else if (priorCommit) {
      const prior = await this.readPackage(record.scope, priorCommit);
      // Save may change project source, never silently reassign asset MIME/path.
      if (JSON.stringify(prior.entries) !== JSON.stringify(entries)) fail();
      local = prior.local;
    } else if (!entries.length) local = [];
    else fail();
    const body = Buffer.from(JSON.stringify({format:'stacki-github-delivery:v1',commit,record,entries,local} satisfies Package));
    if (body.length > MAX_PACKAGE) fail();
    await this.put(bucket, this.packageKey(record.scope, commit), body, 'application/json');
  }
  private async put(bucket: Awaited<ReturnType<StackiGitHubDelivery['storage']>>, key: string, body: Buffer, mediaType: string, cacheControl = '0') {
    try { await bucket.upload(key, body, {upsert:false,contentType:mediaType,cacheControl}); }
    catch { /* reconcile an ambiguous write using exact readback */ }
    const result = await bucket.download(key);
    if (result.error || !result.data || result.data.size !== body.length ||
        result.data.type !== mediaType || !Buffer.from(await result.data.arrayBuffer()).equals(body)) fail();
  }
  async open(scope: StackiDraftScope, commit: string, revision: number, sha256: string, refs: StackiGitAssetRef[]) {
    const value = await this.readPackage(scope, commit);
    if (value.record.revision !== revision || value.record.sha256 !== sha256 ||
        JSON.stringify(value.entries) !== JSON.stringify(stackiDeliveryEntries(value.record, refs))) fail();
    return { record:value.record, assets:value.local.map(file => ({name:file.name,body:Buffer.from(file.base64,'base64')})),
      delivery: async (expiresAt: number): Promise<StackiAssetDelivery> => {
        const ttl = Math.floor((expiresAt - Date.now()) / 1000);
        if (ttl < 1 || ttl > 20 * 60) fail();
        const entries = value.entries.filter(entry => entry.remote);
        if (!entries.length) return {commit,redirects:{}};
        const bucket = await this.storage();
        const paths = entries.map(entry => this.assetKey(scope, entry));
        const unique = [...new Set(paths)];
        const result = await bucket.createSignedUrls(unique, ttl);
        if (result.error || !result.data || result.data.length !== unique.length) fail();
        const urls = new Map<string,string>();
        for (const item of result.data) {
          if (item.error || !item.path || !unique.includes(item.path) || urls.has(item.path) || !item.signedUrl) fail();
          const url = new URL(item.signedUrl);
          if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
              !url.pathname.endsWith(`/object/sign/${this.bucket}/${item.path}`) || !url.searchParams.get('token')) fail();
          urls.set(item.path,item.signedUrl);
        }
        return {commit,redirects:Object.fromEntries(entries.map((entry,i) => [entry.path,urls.get(paths[i])!]))};
      } };
  }
}
