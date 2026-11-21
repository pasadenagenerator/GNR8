/** Offline migration of verified Git-retained preview assets into static assets.
 * Reuses the authoritative GNR8 URL/name mapping; never recaptures or fetches assets.
 */
import { createHash } from 'node:crypto';
import { readFile, mkdir, lstat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stackiDeliveryEntries } from '../../apps/platform/gnr8/stacki/stacki-github-delivery.ts';
import { parseStackiRecord } from '../../apps/platform/gnr8/stacki/stacki-draft-contract.ts';
const sha = b => createHash('sha256').update(b).digest('hex');
const fail = () => { throw Error('Retained Git source or asset mismatch'); };
async function checked(root, path) {
  if (!path || path.split('/').some(p => !p || p === '.' || p === '..') || /[\\%\x00]/.test(path)) fail();
  let target = root;
  for (const part of path.split('/')) {
    target = join(target, part);
    const info = await lstat(target).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    if (info?.isSymbolicLink()) fail();
  }
  return target;
}
export async function materializeRetainedAssets({ project, siteId }) {
  project = resolve(project);
  const root = await lstat(project); if (!root.isDirectory() || root.isSymbolicLink()) fail();
  const manifest = JSON.parse(await readFile(await checked(project, '.gnr8-stacki.json'), 'utf8'));
  if (manifest.format !== 'gnr8-stacki-git:v1' || manifest.scope?.siteId !== siteId ||
      !Array.isArray(manifest.files) || !Array.isArray(manifest.assets)) fail();
  const files = [];
  for (const entry of manifest.files) {
    const body = await readFile(await checked(project, entry.path));
    if (sha(body) !== entry.sha256 || body.length !== entry.bytes ||
        createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex') !== entry.blob) fail();
    files.push({ path: entry.path, base64: body.toString('base64') });
  }
  const record = parseStackiRecord({ format: 'gnr8-stacki-checkpoint:v1', scope: manifest.scope,
    revision: manifest.revision, actorUserId: manifest.actorUserId, sha256: manifest.sha256, files }, manifest.scope, manifest.revision);
  const entries = stackiDeliveryEntries(record, manifest.assets);
  const writes = [];
  for (const entry of entries) {
    const body = await readFile(await checked(project, `gnr8-retained/${entry.name}`));
    if (body.length !== entry.bytes || sha(body) !== entry.sha256 ||
        createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex') !== entry.blob) fail();
    const path = await checked(project, `public${entry.path}`);
    const current = await readFile(path).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    if (current && !current.equals(body)) fail();
    writes.push({ path, body });
  }
  for (const {path, body} of writes) {
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, body);
  }
  return { siteId, verifiedSourceFiles: files.length, staticAssets: writes.length, hosted: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [project, siteId, ...extra] = process.argv.slice(2);
  if (!project || !siteId || extra.length) throw Error('Usage: node --import tsx materialize-retained-assets.mjs PROJECT SITE_ID');
  console.log(JSON.stringify(await materializeRetainedAssets({ project, siteId })));
}
