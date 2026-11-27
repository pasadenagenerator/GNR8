import { createHash } from 'node:crypto';

type Scope = { agencyId: string; clientId: string; siteId: string };
type SourceFile = { path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer };
type Part = { shard: number; offset: number; bytes: number };
type Entry = { path: string; mediaType: string; bytes: number; sha256: string; parts: Part[] };
type Shard = { path: string; bytes: number; sha256: string; oid: string };
export type ShardedManifest = {
  format: 'gnr8-raw-import-git:sharded-v1'; scope: Scope; runtimeSiteId: string;
  siteVersionId: string; files: Entry[]; shards: Shard[];
};
type Target = { owner: string; repository: string; token: string };
type Reference = { scope: Scope; repository: string; commit: string; manifestPath: string; manifestSha256: string };
const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SHARD_BYTES = 16 * 1024 * 1024;
const sha256 = (body: Uint8Array) => createHash('sha256').update(body).digest('hex');
const blobOid = (body: Uint8Array) => createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
const invalid = (): never => { throw Error('RAW_IMPORT_GIT_ARCHIVE_INVALID'); };

class GitHubRawApi {
  private readonly base: string;
  constructor(private readonly target: Target, private readonly transport: typeof fetch = fetch) {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(target.owner) ||
        !/^[a-z0-9][a-z0-9-]{0,62}$/.test(target.repository) || !target.token) invalid();
    this.base = `https://api.github.com/repos/${target.owner}/${target.repository}`;
  }
  async request(path: string, method = 'GET', body?: unknown, missing = false): Promise<any> {
    const response = await this.transport(`${this.base}${path}`, {
      method, headers: { authorization: `Bearer ${this.target.token}`,
        accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
        'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: AbortSignal.timeout(60_000),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error('RAW_IMPORT_GIT_API_UNAVAILABLE');
    return response.json();
  }
  async blob(body: Buffer): Promise<string> {
    const oid = blobOid(body);
    const result = await this.request('/git/blobs', 'POST', { content: body.toString('base64'), encoding: 'base64' });
    if (result?.sha !== oid) invalid();
    return oid;
  }
  async readBlob(oid: string): Promise<Buffer> {
    if (!SHA1.test(oid)) invalid();
    const result = await this.request(`/git/blobs/${oid}`);
    if (result?.encoding !== 'base64' || typeof result.content !== 'string' ||
        !Number.isSafeInteger(result.size) || result.size < 0) invalid();
    const body = Buffer.from(result.content.replace(/\s/g, ''), 'base64');
    if (body.length !== result.size || blobOid(body) !== oid) invalid();
    return body;
  }
  async commitTree(commit: string): Promise<{ parent: string; blobs: Map<string, string> }> {
    if (!SHA1.test(commit)) invalid();
    const node = await this.request(`/git/commits/${commit}`);
    if (!SHA1.test(node?.tree?.sha) || !Array.isArray(node?.parents) ||
        node.parents.length !== 1 || !SHA1.test(node.parents[0]?.sha)) invalid();
    const tree = await this.request(`/git/trees/${node.tree.sha}?recursive=1`);
    if (tree?.truncated || !Array.isArray(tree?.tree)) invalid();
    const blobs = new Map<string, string>();
    for (const entry of tree.tree) {
      if (entry.type !== 'blob') continue;
      if (typeof entry.path !== 'string' || !SHA1.test(entry.sha) || blobs.has(entry.path)) invalid();
      blobs.set(entry.path, entry.sha);
    }
    return { parent: node.parents[0].sha, blobs };
  }
}

/** Packs validated source files without writing a second copy to the function's disk. */
export function packRawImportShards(input: {
  scope: Scope; runtimeSiteId: string; siteVersionId: string; files: SourceFile[];
}) {
  const prefix = `raw-import/${input.siteVersionId}/`;
  const ordered = [...input.files].sort((left, right) => left.path.localeCompare(right.path));
  const chunks: Buffer[] = [];
  const shardParts: Buffer[][] = [];
  const entries: Entry[] = [];
  let length = 0;
  const flush = () => {
    if (!length) return;
    shardParts.push([...chunks]);
    chunks.length = 0;
    length = 0;
  };
  for (const file of ordered) {
    const parts: Part[] = [];
    for (let cursor = 0; cursor < file.bytes.length;) {
      if (length === SHARD_BYTES) flush();
      const bytes = Math.min(SHARD_BYTES - length, file.bytes.length - cursor);
      parts.push({ shard: shardParts.length, offset: length, bytes });
      chunks.push(file.bytes.subarray(cursor, cursor + bytes));
      length += bytes;
      cursor += bytes;
    }
    entries.push({ path: file.path, mediaType: file.mediaType, bytes: file.sizeBytes,
      sha256: file.sha256, parts });
  }
  flush();
  const shardBytes = (index: number) => Buffer.concat(shardParts[index]!);
  const shards = shardParts.map((parts, index) => {
    const bytes = parts.reduce((sum, part) => sum + part.length, 0);
    const sha = createHash('sha256');
    const oid = createHash('sha1').update(`blob ${bytes}\0`);
    for (const part of parts) { sha.update(part); oid.update(part); }
    return { path: `${prefix}shards/${String(index).padStart(5, '0')}.bin`,
      bytes, sha256: sha.digest('hex'), oid: oid.digest('hex') };
  });
  const manifest: ShardedManifest = { format: 'gnr8-raw-import-git:sharded-v1',
    scope: input.scope, runtimeSiteId: input.runtimeSiteId, siteVersionId: input.siteVersionId,
    files: entries, shards };
  const manifestPath = `${prefix}.gnr8-import-manifest.json`;
  const manifestBody = Buffer.from(JSON.stringify(manifest));
  return { manifest, manifestBody, manifestPath, manifestSha256: sha256(manifestBody), shardBytes };
}

function validateManifest(manifest: ShardedManifest, ref: Reference, versionId: string): void {
  if (manifest.format !== 'gnr8-raw-import-git:sharded-v1' || manifest.siteVersionId !== versionId ||
      manifest.scope?.agencyId !== ref.scope.agencyId || manifest.scope?.clientId !== ref.scope.clientId ||
      manifest.scope?.siteId !== ref.scope.siteId || !Array.isArray(manifest.files) ||
      !Array.isArray(manifest.shards) || manifest.files.length < 1 || manifest.files.length > 10_000 ||
      manifest.shards.length < 1 || manifest.shards.length > 64) invalid();
  const prefix = `raw-import/${versionId}/shards/`;
  for (let index = 0; index < manifest.shards.length; index++) {
    const shard = manifest.shards[index]!;
    if (shard.path !== `${prefix}${String(index).padStart(5, '0')}.bin` ||
        !Number.isSafeInteger(shard.bytes) || shard.bytes < 1 || shard.bytes > SHARD_BYTES ||
        !SHA256.test(shard.sha256) || !SHA1.test(shard.oid)) invalid();
  }
  const paths = new Set<string>();
  for (const file of manifest.files) {
    if (typeof file.path !== 'string' || !file.path || file.path.length > 500 ||
        file.path.includes('\\') || file.path.split('/').some(part => !part || part === '.' || part === '..' ||
          part === '.git' || part.startsWith('.gnr8')) ||
        paths.has(file.path.normalize('NFC').toLowerCase()) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !SHA256.test(file.sha256) ||
        !/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:; charset=utf-8)?$/i.test(file.mediaType) ||
        !Array.isArray(file.parts)) invalid();
    paths.add(file.path.normalize('NFC').toLowerCase());
    let total = 0;
    for (const part of file.parts) {
      const shard = manifest.shards[part.shard];
      if (!Number.isSafeInteger(part.shard) || !shard ||
          !Number.isSafeInteger(part.offset) || !Number.isSafeInteger(part.bytes) ||
          part.offset < 0 || part.bytes < 1 || part.offset + part.bytes > shard.bytes) invalid();
      total += part.bytes;
    }
    if (total !== file.bytes) invalid();
  }
}

export async function writeShardedRawImportArchive(input: {
  scope: Scope; runtimeSiteId: string; siteVersionId: string; files: SourceFile[];
  target: Target; parent: string; existingCommit?: string;
}, transport: typeof fetch = fetch) {
  const packed = packRawImportShards(input);
  const api = new GitHubRawApi(input.target, transport);
  const branch = `imports/${input.siteVersionId}`;
  let commit = input.existingCommit;
  if (!commit) {
    for (let index = 0; index < packed.manifest.shards.length; index++) {
      if (await api.blob(packed.shardBytes(index)) !== packed.manifest.shards[index]!.oid) invalid();
    }
    const manifestOid = await api.blob(packed.manifestBody);
    const entries = [...packed.manifest.shards.map(shard => ({ path: shard.path,
      mode: '100644', type: 'blob', sha: shard.oid })),
      { path: packed.manifestPath, mode: '100644', type: 'blob', sha: manifestOid }];
    const tree = await api.request('/git/trees', 'POST', { tree: entries });
    if (!SHA1.test(tree?.sha)) invalid();
    const author = { name: 'GNR8 Import', email: 'import@gnr8.invalid' };
    const created = await api.request('/git/commits', 'POST', {
      message: `Raw import ${packed.manifestSha256}`, tree: tree.sha,
      parents: [input.parent], author, committer: author,
    });
    if (!SHA1.test(created?.sha)) invalid();
    commit = created.sha;
    try { await api.request('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit }); }
    catch { /* Exact ref read below reconciles a lost acknowledgement. */ }
    const ref = await api.request(`/git/ref/heads/${branch}`, 'GET', undefined, true);
    if (ref?.object?.sha !== commit) invalid();
  }
  if (!commit) invalid();
  const remote = await api.commitTree(commit!);
  if (remote.parent !== input.parent || remote.blobs.size !== packed.manifest.shards.length + 1 ||
      remote.blobs.get(packed.manifestPath) !== blobOid(packed.manifestBody)) invalid();
  const returnedManifest = await api.readBlob(remote.blobs.get(packed.manifestPath)!);
  if (!returnedManifest.equals(packed.manifestBody)) invalid();
  for (let index = 0; index < packed.manifest.shards.length; index++) {
    const shard = packed.manifest.shards[index]!;
    if (remote.blobs.get(shard.path) !== shard.oid ||
        !(await api.readBlob(shard.oid)).equals(packed.shardBytes(index))) invalid();
  }
  return { repository: `${input.target.owner}/${input.target.repository}`, commit: commit!,
    manifestPath: packed.manifestPath, manifestSha256: packed.manifestSha256,
    files: packed.manifest.files, archiveFormat: 'sharded-v1' as const };
}

export class ShardedRawImportReader {
  private loaded?: Promise<ShardedManifest>;
  private readonly shards = new Map<number, Promise<Buffer>>();
  private readonly api: GitHubRawApi;
  constructor(private readonly ref: Reference, private readonly versionId: string,
    target: Target, transport: typeof fetch = fetch) {
    this.api = new GitHubRawApi(target, transport);
  }
  private async manifest(): Promise<ShardedManifest> {
    this.loaded ??= (async () => {
      const remote = await this.api.commitTree(this.ref.commit);
      const oid = remote.blobs.get(this.ref.manifestPath);
      if (!oid || remote.blobs.size < 2) invalid();
      const body = await this.api.readBlob(oid!);
      if (sha256(body) !== this.ref.manifestSha256) invalid();
      const manifest = (() => {
        try { return JSON.parse(body.toString('utf8')) as ShardedManifest; }
        catch { return invalid(); }
      })();
      validateManifest(manifest, this.ref, this.versionId);
      if (remote.blobs.size !== manifest.shards.length + 1 ||
          manifest.shards.some(shard => remote.blobs.get(shard.path) !== shard.oid)) invalid();
      return manifest;
    })();
    return this.loaded;
  }
  async read(file: { sha256: string; sizeBytes: number }): Promise<Buffer> {
    const manifest = await this.manifest();
    const entry = manifest.files.find(item => item.sha256 === file.sha256 && item.bytes === file.sizeBytes);
    if (!entry) invalid();
    const parts: Buffer[] = [];
    for (const part of entry!.parts) {
      let pending = this.shards.get(part.shard);
      if (!pending) {
        const shard = manifest.shards[part.shard]!;
        pending = this.api.readBlob(shard.oid).then(bytes => {
          if (bytes.length !== shard.bytes || sha256(bytes) !== shard.sha256) invalid();
          return bytes;
        });
        this.shards.set(part.shard, pending);
      }
      parts.push((await pending).subarray(part.offset, part.offset + part.bytes));
    }
    const body = Buffer.concat(parts, entry!.bytes);
    if (body.length !== entry!.bytes || sha256(body) !== entry!.sha256) invalid();
    return body;
  }
}
