// Release packaging only: copy the independently pinned official Linux binary.
// No downloads, customer source or credentials. Run before the Worker build.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, chmod } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const sha256 = '0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b';
if (!process.argv[2] || !process.argv[3]) throw new Error('Pass the verified Linux x64 Node26.13.0 binary and libatomic.so.1 paths.');
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
