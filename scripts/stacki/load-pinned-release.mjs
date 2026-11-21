/** Bounded, hash-verified retrieval of the one native Studio release.
 * Transport is injectable for offline tests; no request runs on import. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STACKI_RELEASE_PIN } from './prepare-native-studio.mjs';

const maxBytes = 32_000_000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw Error('Pinned Stacki release unavailable'); };
async function verified(path) {
  try { const bytes = await readFile(path); return bytes.length <= maxBytes && sha(bytes) === STACKI_RELEASE_PIN.sha256; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
export async function loadPinnedRelease({ directory, transport = fetch }) {
  if (!directory || typeof directory !== 'string') fail();
  await mkdir(directory, { recursive: true });
  const path = join(directory, `stacki-studio-${STACKI_RELEASE_PIN.version}-${STACKI_RELEASE_PIN.sha256}.json`);
  if (await verified(path)) return path;
  // GitHub release assets redirect to its signed asset host. Check each hop
  // ourselves so neither a redirect nor a transport can change the trust boundary.
  const signal = AbortSignal.timeout(60_000);
  let url = STACKI_RELEASE_PIN.url;
  let response;
  for (let redirects = 0; ; redirects++) {
    response = await transport(url, { redirect: 'manual', signal });
    if (response.url && response.url !== url) fail();
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    await response.body?.cancel();
    if (redirects >= 3 || !response.headers.get('location')) fail();
    const next = new URL(response.headers.get('location'), url);
    if (next.protocol !== 'https:' || next.username || next.password || next.port || next.hash ||
        next.hostname !== 'release-assets.githubusercontent.com') fail();
    url = next.href;
  }
  if (!response.ok || !response.body) fail();
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || value.length === 0) fail();
      total += value.length;
      if (total > maxBytes) fail();
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = Buffer.concat(chunks);
  if (sha(bytes) !== STACKI_RELEASE_PIN.sha256) fail();
  const temp = join(directory, `.stacki-release-${randomUUID()}`);
  try {
    await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 });
    // Concurrent matching retrievals may race; both have the same digest.
    if (!await verified(path)) await rename(temp, path);
  } finally { await rm(temp, { force: true }); }
  if (!await verified(path)) fail();
  return path;
}
