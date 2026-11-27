/** Bundle the verified native Studio source with its build-generated auth slot.
 * The source checkout is restored before the command completes, so its
 * immutable manifest remains authoritative. No committed Stacki file changes.
 */
export function nativeStudioWorkerPreflightCommand(
  wrangler = '/usr/local/bin/wrangler',
  cwd = '/vercel/sandbox/gnr8-image-source/studio',
) {
  if (!wrangler.startsWith('/') || !cwd.startsWith('/') ||
      wrangler.includes('\0') || cwd.includes('\0'))
    throw Error('native_studio_worker_preflight_input_invalid');
  const script = String.raw`
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const slot = 'src/cloudflare/builtInProviderSlot.ts';
const config = JSON.parse(await readFile('cloudflare/wrangler.jsonc', 'utf8'));
const provider = config?.vars?.AUTH_PROVIDER ?? 'github';
if (provider !== 'access' && provider !== 'github')
  throw Error('native_studio_worker_auth_provider_unverified');
const original = await readFile(slot, 'utf8');
const github = "\n\nexport const builtInProviderSlot: BuiltInSlot = { id: 'github', create: undefined };\n";
const access = "\nimport { createAccessProvider } from '../features/auth/providers/access';\n\nexport const builtInProviderSlot: BuiltInSlot = { id: 'access', create: createAccessProvider };\n";
if (!original.endsWith(github) ||
    original.indexOf(github) !== original.lastIndexOf(github))
  throw Error('native_studio_worker_auth_slot_unverified');
try {
  if (provider === 'access')
    await writeFile(slot, original.slice(0, -github.length) + access);
  const child = spawn(${JSON.stringify(wrangler)}, [
    'deploy', '--dry-run', '--outdir', '/vercel/sandbox/gnr8-worker-bundle',
    '--metafile', '/vercel/sandbox/gnr8-worker-bundle-meta.json',
    '--config', 'cloudflare/wrangler.jsonc',
  ], { stdio: 'inherit', env: process.env });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (value, signal) => resolve(signal ? 1 : value ?? 1));
  });
  if (code !== 0) process.exitCode = code;
} finally {
  if (provider === 'access') await writeFile(slot, original);
}
`;
  return { cmd: 'node', args: ['--input-type=module', '-e', script],
    cwd,
    env: { CI: '1', DOCKER_HOST: 'unix:///var/run/docker.sock',
      WRANGLER_SEND_METRICS: 'false' }, timeoutMs: 15 * 60_000 };
}
