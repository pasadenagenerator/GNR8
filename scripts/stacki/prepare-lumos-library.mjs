/** Add the pinned Lumos library to an imported site, without replacing its pages.
 * Uses native Stacki project settings; never modifies editor source or executes providers.
 * Run only against an offline checkout, with no concurrent editor writes.
 */
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const LUMOS_PIN = Object.freeze({ version: '1.0.4',
  commit: '43e4d5290fd7fa5165e2118689e680971624f0cb',
  repository: 'https://github.com/lumosframework/lumos-for-astro',
  sourceSha256: '0b04748b4cf579c0c18134371f5c1ed7ee318550c33f87419a9b804765f18bc0' });
const json = v => JSON.stringify(v, null, 2) + '\n';
const digest = v => createHash('sha256').update(v).digest('hex');
const exists = p => lstat(p).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
async function checked(root, relative) {
  let p = root;
  for (const part of relative.split('/')) {
    p = join(p, part);
    if ((await exists(p))?.isSymbolicLink()) throw Error('Lumos paths must not contain symlinks');
  }
  return p;
}
async function readJson(root, file, fallback) {
  const path = await checked(root, file);
  if (!await exists(path)) return fallback;
  return JSON.parse(await readFile(path, 'utf8'));
}
export async function prepareLumosLibrary({ project, upstream }) {
  project = resolve(project); upstream = resolve(upstream);
  for (const root of [project, upstream]) {
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink()) throw Error('Expected a real project directory');
  }
  const paths = [];
  async function walk(relative) {
    for (const entry of await readdir(await checked(upstream, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Lumos source symlink refused');
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(path); else paths.push(path);
    }
  }
  await walk('src'); await walk('.stacki'); paths.push('LICENSE', 'package.json');
  const hash = createHash('sha256'), sources = new Map();
  for (const path of paths.sort()) {
    const bytes = await readFile(await checked(upstream, path));
    hash.update(path + '\0').update(bytes).update('\0'); sources.set(path, bytes);
  }
  if (hash.digest('hex') !== LUMOS_PIN.sourceSha256) throw Error('Lumos source digest mismatch');
  const files = new Map();
  for (const [path, bytes] of sources) {
    if (!path.startsWith('src/') || path.startsWith('src/pages/')) continue;
    const target = path.replace(/^src\//, 'src/lumos/');
    let body = bytes;
    if (/\.(astro|ts|css)$/.test(path)) {
      let text = bytes.toString('utf8').replace(/(["'])@\/([^"']+)\1/g, (_, quote, imported) => {
        let relative = posix.relative(posix.dirname(path), 'src/' + imported);
        if (!relative.startsWith('.')) relative = './' + relative;
        return quote + relative + quote;
      });
      // Inserted components bring their required design tokens and utility styles.
      // Existing pages do not import these files and retain their appearance.
      if (path.startsWith('src/components/') && path.endsWith('.astro')) {
        let css = posix.relative(posix.dirname(path), 'src/styles/global.css');
        if (!css.startsWith('.')) css = './' + css;
        if (!text.startsWith('---')) throw Error('Unexpected Lumos component frontmatter');
        text = text.replace(/^---\r?\n/, `---\nimport "${css}";\n`);
      }
      body = Buffer.from(text);
    }
    files.set(target, body);
  }
  files.set('src/lumos/LICENSE', sources.get('LICENSE'));
  const folders = await readJson(project, '.stacki/folders.json', { version: 1, folders: {} });
  if (folders.version !== 1 || !folders.folders) throw Error('Unsupported native folder settings');
  for (const [kind, defaults, addition] of [
    ['components', ['src/components'], 'src/lumos/components'],
    ['layouts', ['src/layouts'], 'src/lumos/layouts'],
    ['styles', ['src', 'public', 'styles'], 'src/lumos/styles'],
    ['variables', ['src', 'public', 'styles'], 'src/lumos/styles'],
  ]) {
    const current = folders.folders[kind] ?? defaults;
    if (!Array.isArray(current)) throw Error('Invalid native folder settings');
    if (!current.some(p => addition === p || addition.startsWith(p + '/')))
      folders.folders[kind] = [...current, addition];
  }
  files.set('.stacki/folders.json', Buffer.from(json(folders)));
  const defaults = await readJson(project, '.stacki/components.json', { version: 1, components: {} });
  const lumosDefaults = JSON.parse(sources.get('.stacki/components.json').toString().replaceAll('src/', 'src/lumos/'));
  if (defaults.version !== 1 || !defaults.components) throw Error('Unsupported native insertion settings');
  for (const [key, value] of Object.entries(lumosDefaults.components)) {
    // Keep any defaults an editor already chose for this component.
    if (!Object.hasOwn(defaults.components, key)) defaults.components[key] = value;
  }
  files.set('.stacki/components.json', Buffer.from(json(defaults)));
  const styles = await readJson(project, '.stacki/styles.json', { version: 1, keep: [], lockedStylesheets: [] });
  if (styles.version !== 1 || !Array.isArray(styles.lockedStylesheets)) throw Error('Unsupported native style settings');
  const lumosStyles = JSON.parse(sources.get('.stacki/styles.json').toString().replaceAll('src/', 'src/lumos/'));
  styles.lockedStylesheets = [...new Set([...styles.lockedStylesheets, ...lumosStyles.lockedStylesheets])];
  files.set('.stacki/styles.json', Buffer.from(json(styles)));
  const receipt = { format: 'gnr8-lumos-library:v1', upstream: LUMOS_PIN,
    files: [...files].filter(([p]) => p.startsWith('src/')).map(([path, bytes]) => ({ path, sha256: digest(bytes) })) };
  files.set('.gnr8/lumos-library.json', Buffer.from(json(receipt)));
  // Validate the entire planned write first. Never overwrite edited library files.
  for (const [relative, bytes] of files) {
    const target = await checked(project, relative);
    if ((relative.startsWith('src/') || relative.startsWith('.gnr8/')) && await exists(target) &&
        !bytes.equals(await readFile(target))) throw Error(`Existing Lumos file differs: ${relative}`);
  }
  for (const [relative, bytes] of files) {
    const target = await checked(project, relative);
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
  }
  return { version: LUMOS_PIN.version, components: [...files.keys()].filter(p => p.endsWith('.astro') && p.includes('/components/')).length,
    prerequisites: 'Astro >=7.4.7, Node >=22.23.4; set Astro site to the approved origin and configure native Astro font --font-inter from src/lumos/assets/fonts/inter-regular.woff2 before using BaseLayout.', hosted: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [project, upstream, ...extra] = process.argv.slice(2);
  if (!project || !upstream || extra.length) throw Error('Usage: node prepare-lumos-library.mjs PROJECT VERIFIED_LUMOS_CHECKOUT');
  console.log(json(await prepareLumosLibrary({ project, upstream })));
}
