import {githubCommitAuthor} from './github-commit-author';
import type { StackiGitHubDelivery } from './stacki-github-delivery';
import { createHash } from 'node:crypto';
import { createStackiRecord, parseStackiRecord, StackiDraftError,
  type StackiDraftFile, type StackiDraftRecord, type StackiDraftSave, type StackiDraftScope } from './stacki-draft-contract';
import type { StackiRuntimeAsset } from './stacki-retained-assets';
import { pushStandaloneGit } from '../standalone/publication-git';

type FileRef = { path: string; sha256: string; bytes: number; blob: string };
type AssetRef = { name: string; sha256: string; bytes: number; blob: string };
type Manifest = { format: 'gnr8-stacki-git:v1'; scope: StackiDraftScope; revision: number; bootstrap: boolean;
  actorUserId: string; sha256: string; files: FileRef[]; assets: AssetRef[] };
type TreeEntry = { path: string; mode: string; type: string; sha: string };
type Json = Record<string, any>;
const sha256 = (body: Buffer) => createHash('sha256').update(body).digest('hex');
const sha1 = /^[a-f0-9]{40}$/;
const metadataPath = '.gnr8-stacki.json';
const assetPrefix = 'gnr8-retained/';
async function batches<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = [];
  for (let i = 0; i < items.length; i += 16) output.push(...await Promise.all(items.slice(i, i + 16).map(run)));
  return output;
}

/** One private, site-owned GitHub branch is the sole durable editor source.
 * Every checkpoint file, Yjs state file and retained preview asset is a Git blob.
 * The caller must authorize the complete GNR8 scope before every public call.
 */
export class GitHubStackiStore {
  private readonly repo: string;
  private readonly branch: string;
  constructor(private readonly scope: StackiDraftScope, target: {
    owner: string; ownerId: number; repository: string; repositoryId: number; token: string;
  }, private readonly transport: typeof fetch = fetch,
    private readonly pushGit: typeof pushStandaloneGit = pushStandaloneGit,
    private readonly deliveryCache?: StackiGitHubDelivery) {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(target.owner) ||
        !/^[a-z0-9][a-z0-9-]{0,62}$/.test(target.repository) ||
        !Number.isSafeInteger(target.ownerId) || !Number.isSafeInteger(target.repositoryId) ||
        !target.token || !/^[a-f0-9-]{36}$/.test(scope.siteVersionId))
      throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
    this.repo = `/repos/${target.owner}/${target.repository}`;
    this.branch = `stacki/${scope.siteVersionId}`;
    this.target = target;
  }
  private readonly target: { owner: string; ownerId: number; repository: string; repositoryId: number; token: string };

  private async request(path: string, method = 'GET', body?: unknown, missing = false): Promise<Json | null> {
    const response = await this.transport(`https://api.github.com${this.repo}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${this.target.token}`, accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    // A classic `repo` token can access every private repository of its owner.
    // This editor accepts only a fine-grained or installation credential.
    if (response.headers.get('x-oauth-scopes')?.split(',').map(x => x.trim()).includes('repo'))
      throw new StackiDraftError(503, 'STACKI_GITHUB_CREDENTIAL_TOO_BROAD');
    if (missing && response.status === 404) return null;
    if (!response.ok) {
      if (response.status !== 409 && response.status !== 422) {
        console.warn('[stacki-github] request failed', {
          operation: path === '' ? 'repository' : path.split('/')[2] ?? 'ref',
          method,
          status: response.status,
          rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
          retryAfter: response.headers.get('retry-after'),
        });
      }
      throw new StackiDraftError(response.status === 409 || response.status === 422 ? 409 : 503,
        response.status === 409 || response.status === 422 ? 'STACKI_DRAFT_CONFLICT' : 'STACKI_DRAFT_STORAGE_UNAVAILABLE');
    }
    return response.status === 204 ? {} : await response.json();
  }
  private async repository() {
    const repo = await this.request('');
    if (repo?.private !== true || repo.id !== this.target.repositoryId ||
        repo.owner?.id !== this.target.ownerId ||
        repo.owner?.login?.toLowerCase() !== this.target.owner.toLowerCase() ||
        repo.name !== this.target.repository || repo.permissions?.push !== true ||
        repo.description !== `GNR8 standalone site ${this.scope.siteId}`)
      throw new StackiDraftError(503, 'STACKI_GITHUB_TARGET_MISMATCH');
    return repo;
  }
  /** Import preflight: verifies the exact private, site-owned repository only. */
  async verifyTarget(): Promise<void> { await this.repository(); }
  /** Resolve immutable parent and an optional already-written import branch. */
  async rawImportRepository(siteVersionId: string): Promise<{defaultBranch:string;parent:string;existingCommit?:string}> {
    if (!/^[a-f0-9-]{36}$/.test(siteVersionId))
      throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
    return this.immutableRepository(`imports/${siteVersionId}`);
  }
  /** Resolve a predeclared immutable import or generated-artifact branch. */
  async immutableRepository(branch: string): Promise<{defaultBranch:string;parent:string;existingCommit?:string}> {
    if (!/^imports\/[a-f0-9-]{36}$/.test(branch) &&
        !/^artifacts\/[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(branch))
      throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
    const repo = await this.repository();
    const defaultBranch = repo?.default_branch;
    if (typeof defaultBranch !== 'string' || !/^[a-zA-Z0-9._/-]{1,100}$/.test(defaultBranch))
      throw new StackiDraftError(503, 'STACKI_GITHUB_TARGET_MISMATCH');
    const branchRef = await this.request(`/git/ref/heads/${branch}`, 'GET', undefined, true);
    const existingCommit = branchRef?.object?.sha;
    if (branchRef && !sha1.test(existingCommit))
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const parent = existingCommit
      ? (await this.request(`/git/commits/${existingCommit}`))?.parents?.[0]?.sha
      : (await this.request(`/git/ref/heads/${defaultBranch}`))?.object?.sha;
    if (!sha1.test(parent))
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    return {defaultBranch, parent, ...(existingCommit ? {existingCommit} : {})};
  }
  private async head(): Promise<string | null> {
    const ref = await this.request(`/git/ref/heads/${this.branch}`, 'GET', undefined, true);
    if (!ref) return null;
    if (!sha1.test(ref.object?.sha)) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    return ref.object.sha;
  }
  private blobId(body: Buffer): string {
    return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
  }
  private async blob(oid: string): Promise<Buffer> {
    if (!sha1.test(oid)) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const result = await this.request(`/git/blobs/${oid}`);
    if (result?.encoding !== 'base64' || typeof result.content !== 'string')
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const body = Buffer.from(result.content.replace(/\s/g, ''), 'base64');
    if (body.length !== result.size || this.blobId(body) !== oid)
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    return body;
  }
  private async read(commit: string, loadAssets = true, restore?: (manifest: Manifest) => Promise<StackiDraftRecord>): Promise<{ record: StackiDraftRecord; manifest: Manifest; parent: string | null; tree: string; assets: StackiRuntimeAsset[] }> {
    if (!sha1.test(commit)) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const node = await this.request(`/git/commits/${commit}`);
    if (!sha1.test(node?.tree?.sha) || !Array.isArray(node?.parents) || node.parents.length !== 1 ||
        !sha1.test(node.parents[0]?.sha))
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const tree = await this.request(`/git/trees/${node.tree.sha}?recursive=1`);
    if (tree?.truncated || !Array.isArray(tree?.tree)) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const entries = new Map<string, TreeEntry>(tree.tree.map((item: TreeEntry) => [item.path, item]));
    const meta = entries.get(metadataPath);
    if (meta?.type !== 'blob') throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    let manifest: Manifest;
    try { manifest = JSON.parse((await this.blob(meta.sha)).toString('utf8')); }
    catch { throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED'); }
    if (manifest.format !== 'gnr8-stacki-git:v1' ||
        JSON.stringify(manifest.scope) !== JSON.stringify(this.scope) ||
        !Number.isInteger(manifest.revision) || typeof manifest.bootstrap !== 'boolean' ||
        !Array.isArray(manifest.files) || !Array.isArray(manifest.assets))
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const cached = restore ? await restore(manifest) : null;
    const cachedFiles = new Map(cached?.files.map(file => [file.path, file.base64]));
    const expected = new Set([metadataPath]);
    const files = await batches(manifest.files, async file => {
      const item = entries.get(file.path);
      if (!file || !/^[a-f0-9]{64}$/.test(file.sha256) || !sha1.test(file.blob) ||
          item?.type !== 'blob' || item.sha !== file.blob || expected.has(file.path))
        throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      expected.add(file.path);
      const encoded = cachedFiles.get(file.path);
      if (cached && encoded === undefined) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      const body = encoded === undefined ? await this.blob(file.blob) : Buffer.from(encoded, 'base64');
      if (body.length !== file.bytes || sha256(body) !== file.sha256 || this.blobId(body) !== file.blob)
        throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      return { path: file.path, base64: body.toString('base64') };
    });
    const assets = await batches(manifest.assets, async asset => {
      const path = `${assetPrefix}${asset.name}`;
      const item = entries.get(path);
      if (!/^[a-f0-9]{64}$/.test(asset.name) || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
          !sha1.test(asset.blob) || item?.type !== 'blob' || item.sha !== asset.blob || expected.has(path))
        throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      expected.add(path);
      if (!loadAssets) return null;
      const body = await this.blob(asset.blob);
      if (body.length !== asset.bytes || sha256(body) !== asset.sha256)
        throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      return { name: asset.name, body };
    });
    if (cached && cachedFiles.size !== manifest.files.length) throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    if (tree.tree.some((item: TreeEntry) => item.type === 'blob' && !expected.has(item.path)))
      throw new StackiDraftError(503, 'STACKI_CHECKPOINT_INTEGRITY_FAILED');
    const record = parseStackiRecord({ format: 'gnr8-stacki-checkpoint:v1', scope: manifest.scope,
      revision: manifest.revision, actorUserId: manifest.actorUserId, files, sha256: manifest.sha256 },
      this.scope, manifest.revision);
    return { record, manifest, parent: node.parents[0].sha, tree: node.tree.sha,
      assets: assets.filter((asset): asset is StackiRuntimeAsset => asset !== null) };
  }
  async latest(): Promise<StackiDraftRecord | null> {
    await this.repository();
    const head = await this.head();
    return head ? (await this.read(head, false)).record : null;
  }
  /** One verified Git read supplies both the editor checkpoint and its assets. */
  async prepared(): Promise<{ record: StackiDraftRecord; assets: StackiRuntimeAsset[] } | null> {
    await this.repository();
    const head = await this.head();
    if (!head) return null;
    const { record, assets } = await this.read(head);
    return { record, assets };
  }
  /** The Open path never downloads Git asset blobs or rebuilds missing caches. */
  async preparedForOpen() {
    if (!this.deliveryCache) throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE');
    await this.repository();
    const head = await this.head();
    if (!head) throw new StackiDraftError(409, 'STACKI_ASSETS_NOT_PREPARED');
    let prepared: Awaited<ReturnType<StackiGitHubDelivery['open']>> | undefined;
    const found = await this.read(head, false, async manifest => {
      prepared = await this.deliveryCache!.open(this.scope, head, manifest.revision, manifest.sha256, manifest.assets);
      return prepared.record;
    });
    if (!prepared) throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE');
    return {record:found.record, assets:prepared.assets, delivery:prepared.delivery};
  }
  /** Explicit preparation/recovery for a pre-existing Git branch, never Open. */
  async prepareDelivery(confirm?: () => Promise<void>) {
    if (!this.deliveryCache) return;
    await this.repository();
    const head = await this.head();
    if (!head) throw new StackiDraftError(409, 'STACKI_ASSETS_NOT_PREPARED');
    const found = await this.read(head);
    await confirm?.();
    await this.deliveryCache.prepare(head, found.record, found.manifest.assets, found.assets);
    await confirm?.();
  }
  async isInitialized(): Promise<boolean> {
    await this.repository();
    return Boolean(await this.head());
  }
  async revision(_scope: StackiDraftScope, revision: number): Promise<StackiDraftRecord> {
    this.assertScope(_scope);
    await this.repository();
    let commit = await this.head();
    for (let i = 0; commit && i < 64; i++) {
      const found = await this.read(commit, false, this.deliveryCache ? async manifest => {
        try {
          return (await this.deliveryCache!.open(this.scope, commit!, manifest.revision,
            manifest.sha256, manifest.assets)).record;
        } catch (error) {
          // Older Git checkpoints predate the delivery cache. Git remains their
          // durable read authority; the normal file/blob checks still apply.
          if (!(error instanceof StackiDraftError) || error.code !== 'STACKI_GITHUB_DELIVERY_UNAVAILABLE') throw error;
          return (await this.read(commit!, false)).record;
        }
      } : undefined);
      if (found.record.revision === revision) return found.record;
      if (found.record.revision < revision || found.manifest.bootstrap) break;
      commit = found.parent;
    }
    throw new StackiDraftError(404, 'STACKI_DRAFT_NOT_FOUND');
  }
  async retainedAssets(): Promise<StackiRuntimeAsset[]> {
    await this.repository();
    const head = await this.head();
    if (!head) throw new StackiDraftError(404, 'STACKI_DRAFT_NOT_FOUND');
    return (await this.read(head)).assets;
  }
  async history(limit = 20): Promise<Array<{revision:number; sha256:string; commit:string}>> {
    await this.repository();
    const output: Array<{revision:number; sha256:string; commit:string}> = [];
    let commit = await this.head();
    for (let i = 0; commit && i < Math.min(limit, 20); i++) {
      const node = await this.request(`/git/commits/${commit}`);
      if (!sha1.test(node?.tree?.sha) || !Array.isArray(node?.parents) || node.parents.length !== 1 ||
          !sha1.test(node.parents[0]?.sha)) throw new StackiDraftError(503,'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      const tree = await this.request(`/git/trees/${node.tree.sha}?recursive=1`);
      const meta = tree?.tree?.find((entry:TreeEntry) => entry.path === metadataPath);
      if (tree?.truncated || meta?.type !== 'blob' || !sha1.test(meta.sha))
        throw new StackiDraftError(503,'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      let manifest: Manifest;
      try { manifest = JSON.parse((await this.blob(meta.sha)).toString('utf8')); }
      catch { throw new StackiDraftError(503,'STACKI_CHECKPOINT_INTEGRITY_FAILED'); }
      if (manifest.format !== 'gnr8-stacki-git:v1' ||
          JSON.stringify(manifest.scope) !== JSON.stringify(this.scope) ||
          !Number.isInteger(manifest.revision) || !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
          typeof manifest.bootstrap !== 'boolean')
        throw new StackiDraftError(503,'STACKI_CHECKPOINT_INTEGRITY_FAILED');
      output.push({revision:manifest.revision,sha256:manifest.sha256,commit});
      if (manifest.bootstrap) break;
      commit = node.parents[0].sha;
    }
    return output;
  }
  async save(_scope: StackiDraftScope, actor: string, save: StackiDraftSave,
    confirmAccess?: () => Promise<void>): Promise<StackiDraftRecord> {
    this.assertScope(_scope);
    return this.write(createStackiRecord(this.scope, actor, save), save.expectedRevision, undefined, confirmAccess);
  }
  /** Bootstrap an exact legacy checkpoint once; never rewrite or renumber it. */
  async migrate(record: StackiDraftRecord, assets: StackiRuntimeAsset[], confirmAccess?: () => Promise<void>) {
    const checked = parseStackiRecord(record, this.scope, record.revision);
    return this.write(checked, 0, assets, confirmAccess);
  }
  private async write(record: StackiDraftRecord, expectedRevision: number, bootstrapAssets?: StackiRuntimeAsset[],
    confirmAccess?: () => Promise<void>): Promise<StackiDraftRecord> {
    const repo = await this.repository();
    const head = await this.head();
    let parent = head;
    let prior: Manifest | null = null;
    let priorTree: string | null = null;
    if (head) {
      const current = await this.read(head, false);
      if (current.record.revision === record.revision && current.record.sha256 === record.sha256) {
        await confirmAccess?.();
        await this.deliveryCache?.prepare(head, current.record, current.manifest.assets, bootstrapAssets, current.parent ?? undefined);
        await confirmAccess?.();
        return current.record;
      }
      if (current.record.revision !== expectedRevision || bootstrapAssets) {
        let cursor = current;
        for (let i = 0; i < 64 && cursor.record.revision >= record.revision; i++) {
          if (cursor.record.revision === record.revision && cursor.record.sha256 === record.sha256)
            return cursor.record;
          if (cursor.manifest.bootstrap || !cursor.parent) break;
          cursor = await this.read(cursor.parent, false);
        }
        throw new StackiDraftError(409, 'STACKI_DRAFT_CONFLICT');
      }
      prior = current.manifest;
      priorTree = current.tree;
    } else {
      if (expectedRevision !== 0 || !bootstrapAssets)
        throw new StackiDraftError(409, 'STACKI_DRAFT_CONFLICT');
      const base = await this.request(`/git/ref/heads/${encodeURIComponent(repo!.default_branch)}`);
      if (!sha1.test(base?.object?.sha)) throw new StackiDraftError(503, 'STACKI_DRAFT_STORAGE_UNAVAILABLE');
      parent = base!.object.sha;
    }
    const projectBodies = record.files.map(file => ({ path: file.path, body: Buffer.from(file.base64, 'base64') }));
    const files = projectBodies.map(file => ({ path: file.path, sha256: sha256(file.body),
      bytes: file.body.length, blob: this.blobId(file.body) }));
    const assets: AssetRef[] = prior?.assets ? [...prior.assets] : [];
    let assetBodies: { name: string; body: Buffer }[] = [];
    if (bootstrapAssets) {
      const names = new Set<string>();
      let total = 0;
      for (const asset of bootstrapAssets) {
        total += asset.body.length;
        if (!/^[a-f0-9]{64}$/.test(asset.name) || names.has(asset.name) || asset.body.length > 12 * 1024 * 1024)
          throw new StackiDraftError(422, 'STACKI_RETAINED_ASSETS_INVALID');
        names.add(asset.name);
      }
      if (bootstrapAssets.length > 2000 || total > 128 * 1024 * 1024)
        throw new StackiDraftError(422, 'STACKI_RETAINED_ASSETS_INVALID');
      assetBodies = bootstrapAssets;
      assets.push(...bootstrapAssets.map(asset => ({ name: asset.name,
        sha256: sha256(asset.body), bytes: asset.body.length, blob: this.blobId(asset.body) })));
    }
    const manifest: Manifest = { format: 'gnr8-stacki-git:v1', scope: this.scope, bootstrap: !head,
      revision: record.revision, actorUserId: record.actorUserId, sha256: record.sha256, files, assets };
    if (!parent) throw new StackiDraftError(503, 'STACKI_DRAFT_SAVE_UNCONFIRMED');
    await confirmAccess?.();
    let commit: string | null = null;
    try {
      if (head && prior && priorTree) {
        const priorPaths = new Set(prior.files.map(file => file.path));
        const nextPaths = new Set(projectBodies.map(file => file.path));
        const priorFiles = new Map(prior.files.map(file => [file.path, file]));
        const entries: Array<{path:string; mode:string; type:string; sha:string|null}> = [];
        for (const file of projectBodies) {
          const priorFile = priorFiles.get(file.path);
          const oid = this.blobId(file.body);
          const created = priorFile?.blob === oid ? oid : (await this.request('/git/blobs', 'POST',
            { content: file.body.toString('base64'), encoding: 'base64' }))?.sha;
          if (created !== oid) throw new StackiDraftError(503, 'STACKI_DRAFT_SAVE_UNCONFIRMED');
          entries.push({path:file.path,mode:'100644',type:'blob',sha:oid});
        }
        for (const path of priorPaths) if (!nextPaths.has(path))
          entries.push({path,mode:'100644',type:'blob',sha:null});
        const metadata = Buffer.from(JSON.stringify(manifest));
        const metadataOid = this.blobId(metadata);
        const createdMeta = await this.request('/git/blobs','POST',
          {content:metadata.toString('base64'),encoding:'base64'});
        if (createdMeta?.sha !== metadataOid) throw new StackiDraftError(503,'STACKI_DRAFT_SAVE_UNCONFIRMED');
        entries.push({path:metadataPath,mode:'100644',type:'blob',sha:metadataOid});
        const tree = await this.request('/git/trees','POST',{base_tree:priorTree,tree:entries});
        if (!sha1.test(tree?.sha)) throw new StackiDraftError(503,'STACKI_DRAFT_SAVE_UNCONFIRMED');
        const author = githubCommitAuthor(this.target, 'GNR8 Stacki');
        const createdCommit = await this.request('/git/commits','POST',{
          message:`Stacki revision ${record.revision}`,tree:tree!.sha,parents:[head],author,committer:author});
        if (!sha1.test(createdCommit?.sha)) throw new StackiDraftError(503,'STACKI_DRAFT_SAVE_UNCONFIRMED');
        commit = createdCommit!.sha;
        await this.request(`/git/refs/heads/${this.branch}`,'PATCH',{sha:commit,force:false});
      } else {
        const pushed = await this.pushGit({ owner: this.target.owner, repository: this.target.repository,
          defaultBranch: repo!.default_branch, parent, ref: `heads/${this.branch}`,
          manifestSha256: record.sha256, token: this.target.token,
          author: githubCommitAuthor(this.target, 'GNR8 Stacki'),
          files: [ ...projectBodies, ...assetBodies.map(asset => ({ path: `${assetPrefix}${asset.name}`, body: asset.body })),
            { path: metadataPath, body: Buffer.from(JSON.stringify(manifest)) } ] }, this.transport);
        commit = pushed.commit;
      }
    } catch { /* A lost acknowledgement or racing writer is reconciled below. */ }
    const durable = await this.head();
    if (commit && durable !== commit) throw new StackiDraftError(409, 'STACKI_DRAFT_CONFLICT');
    if (!durable) throw new StackiDraftError(503, 'STACKI_DRAFT_SAVE_UNCONFIRMED');
    const verified = await this.read(durable, false);
    const confirmed = verified.record;
    if (confirmed.sha256 !== record.sha256) throw new StackiDraftError(409, 'STACKI_DRAFT_CONFLICT');
    await confirmAccess?.();
    await this.deliveryCache?.prepare(durable, confirmed, verified.manifest.assets, bootstrapAssets, head ?? undefined);
    await confirmAccess?.();
    return confirmed;
  }
  private assertScope(scope: StackiDraftScope) {
    if (JSON.stringify(scope) !== JSON.stringify(this.scope))
      throw new StackiDraftError(404, 'STACKI_DRAFT_NOT_FOUND');
  }
}
