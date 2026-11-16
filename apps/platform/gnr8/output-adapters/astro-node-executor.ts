import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, lstat, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, relative, sep } from 'node:path';

export const ASTRO_NODE_VERSION = '26.13.0';
export const ASTRO_NODE_LINUX_SHA256 = '0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b';
export const ASTRO_LIBATOMIC_SHA256 = '107ab9f7661a1c47cddfb5cd1def99ec537a50a9a537fbe38cdde1b34b8ba280';
export type AstroNodeExecutor = { path: string; version: string; sha256: string; libraryPath?: string };
type Options = { cwd: string; timeoutMs: number; signal?: AbortSignal; env?: NodeJS.ProcessEnv };

/** Host configuration only. Never resolve executable paths from imported source. */
export async function resolveAstroNodeExecutor(workspace: string, signal?: AbortSignal): Promise<AstroNodeExecutor | null> {
  const binary = process.env.GNR8_ASTRO_NODE_PATH;
  const sha256 = process.env.GNR8_ASTRO_NODE_SHA256;
  if (!binary && !sha256) return null;
  if (!binary || !isAbsolute(binary) || !sha256 || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('ASTRO_EXECUTOR_CONFIGURATION_INVALID');
  signal?.throwIfAborted();
  const path = await realpath(binary);
  const inside = relative(await realpath(workspace), path);
  if (inside === '' || (!inside.startsWith(`..${sep}`) && inside !== '..' && !isAbsolute(inside))) throw new Error('ASTRO_EXECUTOR_INSIDE_SOURCE');
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > 200 * 1024 * 1024) throw new Error('ASTRO_EXECUTOR_FILE_INVALID');
  await access(path, constants.X_OK);
  if (createHash('sha256').update(await readFile(path)).digest('hex') !== sha256) throw new Error('ASTRO_EXECUTOR_INTEGRITY_INVALID');
  const libraryPath = process.platform === 'linux' ? await resolveAstroNodeLibrary(workspace, path) : undefined;
  const result = await runPinnedCommand(path, ['--input-type=module', '-e', 'console.log(process.versions.node)'], {
    cwd: workspace, signal, timeoutMs: 5000, env: await executorEnvironment(workspace, path, libraryPath),
  });
  if (result.stdout.trim() !== ASTRO_NODE_VERSION) throw new Error('ASTRO_EXECUTOR_VERSION_INVALID');
  return { path, sha256, version: ASTRO_NODE_VERSION, ...(libraryPath ? { libraryPath } : {}) };
}

/** Only the reviewed adjacent library is allowed; never inherit host loader paths. */
export async function resolveAstroNodeLibrary(workspace: string, binary: string): Promise<string> {
  const library = await realpath(join(dirname(binary), '../lib/libatomic.so.1'));
  const inside = relative(await realpath(workspace), library);
  if (inside === '' || (!inside.startsWith(`..${sep}`) && inside !== '..' && !isAbsolute(inside)))
    throw new Error('ASTRO_EXECUTOR_LIBRARY_INSIDE_SOURCE');
  const directory = dirname(library);
  const stat = await lstat(library);
  if (!stat.isFile() || stat.size > 1024 * 1024 ||
      JSON.stringify((await readdir(directory)).sort()) !== '["libatomic.so.1"]' ||
      createHash('sha256').update(await readFile(library)).digest('hex') !== ASTRO_LIBATOMIC_SHA256)
    throw new Error('ASTRO_EXECUTOR_LIBRARY_INTEGRITY_INVALID');
  return directory;
}

export async function executorEnvironment(workspace: string, binary: string, libraryPath?: string): Promise<NodeJS.ProcessEnv> {
  if (libraryPath && libraryPath !== await resolveAstroNodeLibrary(workspace, binary))
    throw new Error('ASTRO_EXECUTOR_LIBRARY_PATH_INVALID');
  // npm rejects loading one path as both user and global config. Create owned,
  // distinct empty files; the existing workspace finally block owns cleanup.
  const config = await mkdtemp(join(workspace, '.gnr8-npm-config-'));
  const userconfig = join(config, 'user.npmrc');
  const globalconfig = join(config, 'global.npmrc');
  await writeFile(userconfig, '', { flag: 'wx', mode: 0o600 });
  await writeFile(globalconfig, '', { flag: 'wx', mode: 0o600 });
  return { HOME: workspace, USERPROFILE: workspace, TMPDIR: workspace, TMP: workspace, TEMP: workspace,
    ...(libraryPath ? { LD_LIBRARY_PATH: libraryPath } : {}),
    PATH: [dirname(binary), '/usr/bin', '/bin'].join(delimiter),
    NODE_ENV: 'production', CI: '1', ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1', FORCE_COLOR: '0',
    npm_config_userconfig: userconfig, npm_config_globalconfig: globalconfig, npm_config_update_notifier: 'false' };
}

/** Bound output and terminate the process group on timeout/cancel, including npm's children. */
export function runPinnedCommand(binary: string, args: string[], options: Options): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new Error('ASTRO_EXECUTOR_ABORTED')); return; }
    const child = spawn(binary, args, { cwd: options.cwd, env: options.env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let size = 0, failure: Error | undefined;
    const stop = (message: string) => {
      failure ??= new Error(message);
      try { if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { /* Process already exited. */ }
    };
    const abort = () => stop('ASTRO_EXECUTOR_ABORTED');
    const timer = setTimeout(() => stop('ASTRO_EXECUTOR_TIMEOUT'), options.timeoutMs);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const collect = (chunks: Buffer[], data: Buffer) => { size += data.length; if (size > 2 * 1024 * 1024) stop('ASTRO_EXECUTOR_OUTPUT_LIMIT'); else chunks.push(data); };
    child.stdout.on('data', data => collect(stdout, data));
    child.stderr.on('data', data => collect(stderr, data));
    child.on('error', () => { failure ??= new Error('ASTRO_EXECUTOR_START_FAILED'); });
    child.on('close', code => {
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
      // A script must not leave detached descendants alive after its command completes.
      try { if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); } catch { /* Group already gone. */ }
      if (failure || code !== 0) reject(failure ?? new Error(`ASTRO_EXECUTOR_COMMAND_FAILED:${code}`));
      else resolve({ stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() });
    });
  });
}
