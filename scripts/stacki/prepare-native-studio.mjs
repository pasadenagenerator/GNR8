/** Offline integration boundary. No fetch, subprocess, install, secrets or deploy.
 * Run only on a retained/exported project, never on a running Studio checkout.
 */
import { createHash, randomUUID } from 'node:crypto';
import { link, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STACKI_RELEASE_PIN } from './release-pin.mjs';
import { serializeNativeAccessRoles, validateNativeAccessRoles } from './native-access-roles.mjs';

export { STACKI_RELEASE_PIN };
const pin = STACKI_RELEASE_PIN;
const json = value => JSON.stringify(value, null, 2) + '\n';
const sha = value => createHash('sha256').update(value).digest('hex');
const cloudflareWorkerEntry = `// GNR8 Cloudflare adapter. Stacki's original Worker and auth provider remain untouched.
// Workers reject fetch({ redirect: 'error' }); 'manual' also refuses to follow a
// redirect, and Stacki's bounded fetch rejects the returned non-2xx response.
import worker from '../src/cloudflare/worker';
export { PreviewContainer } from '../src/cloudflare/worker';

const cloudflareFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  cloudflareFetch(input, init?.redirect === 'error'
    ? { ...init, redirect: 'manual' }
    : init)) as typeof fetch;

export default worker;
`;
const fail = message => { throw new Error(message); };
const stat = path => lstat(path).catch(error => { if (error.code === 'ENOENT') return null; throw error; });

function binding(input) {
  const keys = ['siteId', 'repository', 'repositoryId', 'branch', 'studioOrigin', 'accountId', 'appId', 'installationId', 'clientId'];
  if (!input || Object.keys(input).sort().join() !== [...keys].sort().join() || keys.some(key => typeof input[key] !== 'string')) fail('Invalid site binding; use only the documented non-secret fields');
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input.siteId) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(input.repository) ||
      !['repositoryId', 'appId', 'installationId'].every(key => /^[1-9][0-9]*$/.test(input[key])) ||
      !/^[a-f0-9]{32}$/.test(input.accountId) || !/^[A-Za-z0-9._-]+$/.test(input.clientId) ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(input.branch) || input.branch.includes('..') ||
      input.branch.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'))) fail('Invalid site identity');
  const origin = new URL(input.studioOrigin);
  if (origin.origin !== input.studioOrigin || origin.protocol !== 'https:' || origin.port ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(origin.hostname)) fail('Expected an HTTPS site origin');
  return Object.fromEntries(keys.map(key => [key, input[key]]));
}

function accessBinding(input) {
  if (input === undefined) return null;
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join() !== 'admins,aud,provider,teamDomain,version' ||
      input.version !== 2 || input.provider !== 'access' ||
      typeof input.aud !== 'string' || !/^[a-f0-9]{64}$/.test(input.aud) ||
      typeof input.teamDomain !== 'string' ||
      !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(input.teamDomain))
    fail('Invalid verified Access binding');
  let roles;
  try { roles = serializeNativeAccessRoles(input.admins); }
  catch { fail('Invalid verified Access binding'); }
  const admins = validateNativeAccessRoles(roles);
  return { version: 2, provider: 'access', aud: input.aud,
    teamDomain: input.teamDomain, admins, roles };
}

export function configuration(input, accessInput) {
  const site = binding(input);
  const access = accessBinding(accessInput);
  const name = `gnr8-${site.siteId}`;
  const domain = new URL(site.studioOrigin).hostname;
  const zoneId = process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID;
  const zone = zoneId && /^[a-f0-9]{32}$/.test(zoneId)
    ? { zone_id: zoneId }
    : { zone_name: domain.split('.').slice(-2).join('.') };
  const previewOrigin = `https://preview.${domain}`;
  const common = { compatibility_date: '2026-10-16', workers_dev: false, preview_urls: false, observability: { enabled: false } };
  const files = new Map([
    ['studio/cloudflare/wrangler.jsonc', json({
      $schema: '../node_modules/wrangler/config-schema.json', ...common,
      account_id: site.accountId, name: `${name}-studio`,
      main: access ? './gnr8-worker-entry.ts' : '../src/cloudflare/worker.ts',
      compatibility_flags: ['nodejs_compat'],
      routes: [{ pattern: new URL(previewOrigin).hostname, custom_domain: true },
        ...(access ? [{ pattern: `${domain}/studio`, ...zone },
          { pattern: `${domain}/studio/*`, ...zone }] : [])], limits: { cpu_ms: 50 },
      assets: { directory: '../dist', binding: 'ASSETS', run_worker_first: true },
      containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile', max_instances: 1, instance_type: 'standard-2' }],
      durable_objects: { bindings: [{ name: 'PREVIEW', class_name: 'PreviewContainer' }] },
      migrations: [{ tag: 'v1', new_sqlite_classes: ['PreviewContainer'] }],
      r2_buckets: [{ binding: 'DRAFTS', bucket_name: `${name}-drafts` }],
      vars: { STUDIO_ORIGIN: site.studioOrigin, PREVIEW_ORIGIN: previewOrigin,
        GITHUB_REPOSITORY: site.repository, GITHUB_BRANCH: site.branch, GITHUB_APP_ID: site.appId,
        GITHUB_INSTALLATION_ID: site.installationId, GITHUB_CLIENT_ID: site.clientId,
        AI_BASE_URL: 'https://api.openai.com/v1', AI_MODEL: 'gpt-5.4-mini-2026-03-17',
        SITE_DEPLOYMENT_URL: `${site.studioOrigin}/__studio-deployment`,
        ...(access ? { AUTH_PROVIDER: 'access', ACCESS_TEAM_DOMAIN: access.teamDomain,
          ACCESS_AUD: access.aud, AUTH_BOOTSTRAP_ADMIN: access.admins[0],
          EDITOR_ACCESS: 'roles', EDITOR_GITHUB_IDS: '' } :
          { EDITOR_ACCESS: 'repository', EDITOR_GITHUB_IDS: '' }) },
    })],
    ...(access ? [['studio/cloudflare/gnr8-worker-entry.ts', cloudflareWorkerEntry]] : []),
    ['wrangler.json', json({ ...common, account_id: site.accountId,
      name: `${name}-site`, main: './studio/src/cloudflare/site.ts',
      routes: [{ pattern: new URL(site.studioOrigin).hostname, custom_domain: true }],
      assets: { directory: './dist', binding: 'ASSETS', run_worker_first: ['/studio', '/studio/*', '/__studio-deployment'] },
      services: [{ binding: 'STUDIO', service: `${name}-studio` }], vars: { SITE_VERSION: { tag: '' } },
    })],
    ['.stacki/publish.json', json({ version: 1, defaultTarget: 'all',
      githubAccount: site.repository.split('/')[0],
      hosting: { provider: 'cloudflare-workers', accountId: site.accountId, project: `${name}-site` },
      buildScript: 'build', beforePublish: [], afterPublish: [],
      publishedSite: { hosting: { provider: 'cloudflare-workers', accountId: site.accountId, project: `${name}-site` }, url: site.studioOrigin, source: 'manual' },
    })],
    ...(access ? [['.stacki/roles.json', access.roles]] : []),
  ]);
  return access ? { site, access: { version: 2, provider: 'access', aud: access.aud,
    teamDomain: access.teamDomain, admins: access.admins }, files } : { site, files };
}

async function safePath(root, relative) {
  let current = root;
  for (const part of relative.split('/')) {
    current = join(current, part);
    if ((await stat(current))?.isSymbolicLink()) fail(`Symlink refused: ${relative}`);
  }
  return current;
}
async function sameOrMissing(root, path, expected) {
  const absolute = await safePath(root, path);
  if (!await stat(absolute)) return false;
  if ((await readFile(absolute, 'utf8')) !== expected) fail(`Existing file differs: ${path}`);
  return true;
}
async function writeMissing(root, path, content) {
  if (await sameOrMissing(root, path, content)) return;
  const absolute = await safePath(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  const temporary = join(dirname(absolute), `.gnr8-write-${randomUUID()}`);
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    try { await link(temporary, absolute); }
    catch (error) { if (error.code !== 'EEXIST') throw error; await sameOrMissing(root, path, content); }
  } finally { await rm(temporary, { force: true }); }
}

export async function prepareNativeStudio({ project, releaseFile, site: input, access: accessInput }) {
  project = resolve(project);
  if (!(await stat(project))?.isDirectory() || (await stat(project)).isSymbolicLink()) fail('Project must be a real directory');
  const { site, access, files } = configuration(input, accessInput);
  // Accept only the one retained release, never execute code from a release file.
  if ((await lstat(releaseFile)).size > 32_000_000) fail('Release too large');
  const bytes = await readFile(releaseFile);
  if (sha(bytes) !== pin.sha256) fail('Stacki release digest mismatch');
  const release = JSON.parse(bytes);
  if (release.version !== pin.version || release.format !== 1 || !Array.isArray(release.files)) fail('Stacki release mismatch');
  const native = new Map();
  for (const file of release.files) {
    if (!/^[\w.-]+(?:\/[\w.-]+)*$/.test(file.path) || file.path.split('/').some(part => part === '..' || part === '.' || part === '.git') || native.has(file.path)) fail('Invalid native release path');
    native.set(file.path, file.content);
  }
  const pkg = JSON.parse(await readFile(await safePath(project, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(await safePath(project, 'package-lock.json'), 'utf8'));
  if (!pkg.dependencies?.astro || !pkg.scripts?.build || lock.packages?.['']?.dependencies?.astro !== pkg.dependencies.astro) fail('A locked Astro project with a build command is required');
  // Native static gateway has no server API implementation. Do not advertise
  // readiness for a Vercel contact export or silently lose its behavior.
  if (await stat(join(project, 'api')) || await stat(join(project, 'functions'))) fail('Server routes need a separate hosting integration');
  const receipt = '.gnr8/native-studio.json';
  const expected = access
    ? json({ format: 'gnr8-native-studio:v2', release: pin, site, access })
    : json({ format: 'gnr8-native-studio:v1', release: pin, site });
  const managed = await sameOrMissing(project, receipt, expected);
  const studio = await safePath(project, 'studio');
  if (await stat(studio)) {
    if (!managed) fail('Existing Studio is unmanaged; migrate it separately');
    // A resumed preparation may fill missing files but never replace an edit.
    for (const [path, content] of native) await sameOrMissing(project, `studio/${path}`, content);
  }
  for (const [path, content] of files) await sameOrMissing(project, path, content);
  // Persist identity before any source write. A retry cannot switch site/repo.
  await writeMissing(project, receipt, expected);
  if (!await stat(studio)) {
    const staging = await safePath(project, '.gnr8/native-studio-staging');
    if (await stat(staging)) await rm(staging, { recursive: true });
    await mkdir(staging);
    for (const [path, content] of native) await writeMissing(staging, path, content);
    await rename(staging, studio);
  } else {
    for (const [path, content] of native) await writeMissing(project, `studio/${path}`, content);
  }
  for (const [path, content] of files) await writeMissing(project, path, content);
  return { status: 'prepared-offline', version: pin.version, studioUrl: `${site.studioOrigin}/studio`,
    repository: site.repository, hosted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [project, releaseFile, siteFile, ...extra] = process.argv.slice(2);
  if (!project || !releaseFile || !siteFile || extra.length) fail('Usage: node scripts/stacki/prepare-native-studio.mjs PROJECT RELEASE_JSON SITE_JSON');
  console.log(json(await prepareNativeStudio({ project, releaseFile, site: JSON.parse(await readFile(siteFile, 'utf8')) })));
}
