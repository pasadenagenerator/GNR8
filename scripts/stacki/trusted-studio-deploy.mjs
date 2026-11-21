/** Run only in a dedicated deploy job with the verified checkout mounted
 * read-only. The build job must have ended before this process receives keys.
 * Importing this module never contacts Cloudflare.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const TAG = /^gnr8-first-[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];

export async function runTrustedStudioDeploy(input, invoke = exec) {
  const { file, args, cwd, token, secrets } = input ?? {};
  if (typeof file !== 'string' || !isAbsolute(file) ||
      typeof cwd !== 'string' || !isAbsolute(cwd) ||
      !Array.isArray(args) || args.length !== 5 ||
      args[0] !== 'deploy' || args[1] !== '--config' ||
      args[2] !== 'cloudflare/wrangler.jsonc' || args[3] !== '--tag' ||
      typeof args[4] !== 'string' || !TAG.test(args[4]) ||
      typeof token !== 'string' || !TOKEN.test(token) ||
      !secrets || typeof secrets !== 'object' || Array.isArray(secrets) ||
      Object.keys(secrets).sort().join() !== NAMES.join() ||
      !NAMES.every(name => typeof secrets[name] === 'string' && secrets[name].length >= 16))
    throw Error('native_studio_trusted_deploy_input_invalid');
  const studio = await realpath(cwd);
  if (basename(studio) !== 'studio')
    throw Error('native_studio_trusted_deploy_input_invalid');
  const checkout = resolve(studio, '..');
  const executable = await realpath(file);
  if (executable === checkout || executable.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_trusted_deploy_executable_invalid');
  const privateHome = await mkdtemp(join(tmpdir(), 'gnr8-studio-deploy-'));
  try {
    const secretFile = join(privateHome, 'secrets.json');
    await writeFile(secretFile, JSON.stringify(secrets), { flag: 'wx', mode: 0o600 });
    try {
      await invoke(executable, [...args, '--secrets-file', secretFile], {
        cwd, shell: false, windowsHide: true, timeout: 15 * 60_000,
        maxBuffer: 2 * 1024 * 1024,
        env: { PATH: process.env.PATH ?? '', HOME: privateHome, TMPDIR: tmpdir(),
          CI: '1', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: token },
      });
    } catch { throw Error('native_studio_trusted_deploy_failed'); }
  } finally {
    await rm(privateHome, { recursive: true, force: true });
  }
}
