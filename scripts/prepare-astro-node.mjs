// Release packaging only: acquire fixed public distributions and verify the
// extracted bytes before packaging. Never execute downloaded code here.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, chmod, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const sha256 = '0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b';
if (process.argv[2] === '--download') {
  const temporary = await mkdtemp(resolve(tmpdir(), 'gnr8-astro-toolchain-'));
  try {
    for (const [name, url, maximum] of [
      ['node.tar.xz', 'https://nodejs.org/dist/v26.13.0/node-v26.13.0-linux-x64.tar.xz', 100 * 1024 * 1024],
      ['libatomic.deb', 'https://deb.debian.org/debian/pool/main/g/gcc-12/libatomic1_12.2.0-14+deb12u1_amd64.deb', 1024 * 1024],
    ]) {
      const response = await fetch(url, { signal: AbortSignal.timeout(120000), redirect: 'error' });
      if (!response.ok) throw new Error(`ASTRO_TOOLCHAIN_DOWNLOAD_FAILED:${name}:${response.status}`);
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maximum) throw new Error('ASTRO_TOOLCHAIN_DOWNLOAD_TOO_LARGE');
        chunks.push(chunk);
      }
      await writeFile(resolve(temporary, name), Buffer.concat(chunks));
    }
    const binary = execFileSync('tar', ['-xJOf', resolve(temporary, 'node.tar.xz'), 'node-v26.13.0-linux-x64/bin/node'], { maxBuffer: 200 * 1024 * 1024 });
    const data = execFileSync('ar', ['p', resolve(temporary, 'libatomic.deb'), 'data.tar.xz'], { maxBuffer: 1024 * 1024 });
    const library = execFileSync('tar', ['-xJOf', '-', './usr/lib/x86_64-linux-gnu/libatomic.so.1.2.0'], { input: data, maxBuffer: 1024 * 1024 });
    await writeFile(resolve(temporary, 'node'), binary);
    await writeFile(resolve(temporary, 'libatomic.so.1'), library);
    // Reuse the exact integrity/license packaging path below in a fresh process.
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), resolve(temporary, 'node'), resolve(temporary, 'libatomic.so.1')], { stdio: 'inherit' });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  process.exit(0);
}
if (!process.argv[2] || !process.argv[3]) throw new Error('Pass --download or the verified Linux x64 Node26.13.0 binary and libatomic.so.1 paths.');
const bytes = await readFile(resolve(process.argv[2]));
if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('ASTRO_EXECUTOR_INTEGRITY_INVALID');
const library = await readFile(resolve(process.argv[3]));
const librarySha256 = '107ab9f7661a1c47cddfb5cd1def99ec537a50a9a537fbe38cdde1b34b8ba280';
if (createHash('sha256').update(library).digest('hex') !== librarySha256) throw new Error('ASTRO_EXECUTOR_LIBRARY_INTEGRITY_INVALID');
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/worker/toolchains/node-26.13.0-linux-x64/bin/node');
await mkdir(dirname(target), { recursive: true });
await writeFile(target, bytes); await chmod(target, 0o755);
const license = await readFile(new URL('./licenses/node-26.13.0-LICENSE.txt', import.meta.url));
await writeFile(resolve(dirname(target), '../LICENSE.txt'), license);
const libDirectory = resolve(dirname(target), '../lib');
await mkdir(libDirectory, { recursive: true });
await writeFile(resolve(libDirectory, 'libatomic.so.1'), library, { mode: 0o644 });
for (const name of ['libatomic-COPYRIGHT.txt', 'libatomic-GPL-3.txt'])
  await writeFile(resolve(dirname(target), '../' + name), await readFile(new URL('./licenses/' + name, import.meta.url)));
console.log(JSON.stringify({ version: '26.13.0', platform: 'linux', arch: 'x64', sha256, bytes: bytes.length, librarySha256, libraryBytes: library.length }));
