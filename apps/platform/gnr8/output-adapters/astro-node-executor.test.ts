import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile, access, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executorEnvironment, resolveAstroNodeExecutor, resolveAstroNodeLibrary, runPinnedCommand } from './astro-node-executor';
import { runAstroBuildExportProof } from './astro-static-site-build-export-proof';
import { readAstroStaticSiteSourceSnapshot } from './astro-static-site-workspace-preparation';

const digest = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');
test('real pinned npm ci and Astro build use separate empty configs and preserve locked source', {
  skip: !process.env.GNR8_TEST_NPM_CLI,
}, async () => {
  const binary = process.env.GNR8_TEST_PINNED_NODE!;
  assert(binary);
  const npm = process.env.GNR8_TEST_NPM_CLI!;
  const root = await realpath(await mkdtemp(join(tmpdir(), 'gnr8-npm-ci-')));
  const keys = ['GNR8_ASTRO_NODE_PATH', 'GNR8_ASTRO_NODE_SHA256', 'GNR8_NPM_CLI_PATH', 'GNR8_TEST_SECRET_SENTINEL'] as const;
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.GNR8_ASTRO_NODE_PATH = binary;
    process.env.GNR8_ASTRO_NODE_SHA256 = await digest(binary);
    process.env.GNR8_NPM_CLI_PATH = npm;
    process.env.GNR8_TEST_SECRET_SENTINEL = 'must-not-reach-build';
    const env = await executorEnvironment(root, binary);
    // Preserve the original failure as a regression control, with the real npm CLI.
    await assert.rejects(runPinnedCommand(binary, [npm, 'config', 'get', 'registry'], {
      cwd: root, timeoutMs: 10_000,
      env: { ...env, npm_config_userconfig: '/dev/null', npm_config_globalconfig: '/dev/null' },
    }), /COMMAND_FAILED/);
    assert.match((await runPinnedCommand(binary, [npm, 'config', 'get', 'registry'], {
      cwd: root, env, timeoutMs: 10_000,
    })).stdout, /https:\/\/registry.npmjs.org/);
    await mkdir(join(root, 'src/pages'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'gnr8-npm-proof', version: '1.0.0', private: true,
      type: 'module', engines: { node: '26.13.0' }, dependencies: { astro: '7.4.4' },
      scripts: { build: 'node verify-env.mjs && astro build' } }));
    await writeFile(join(root, 'verify-env.mjs'), `import assert from 'node:assert/strict';\nassert.equal(process.versions.node,'26.13.0');\nfor (const key of ['GNR8_TEST_SECRET_SENTINEL','DATABASE_URL','VERCEL_OIDC_TOKEN','NODE_OPTIONS']) assert.equal(process.env[key],undefined);\n`);
    await mkdir(join(root, 'public'));
    await writeFile(join(root, 'public/theme.css'), ':root{--gnr8-astro-accent:#0f766e;}body{color:var(--gnr8-astro-accent)}');
    await writeFile(join(root, 'src/pages/index.astro'), '<html><head><title>Npm locked proof</title><link rel="stylesheet" href="/theme.css" /></head><body><h1>Preserved content</h1></body></html>');
    await runPinnedCommand(binary, [npm, 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: root, env, timeoutMs: 120_000,
    });
    // No pre-installed dependency can mask a broken ci invocation.
    await assert.rejects(access(join(root, 'node_modules')));
    const sourceSnapshot = await readAstroStaticSiteSourceSnapshot({ workspacePath: root,
      sourcePaths: ['package.json', 'package-lock.json', 'verify-env.mjs', 'public/theme.css', 'src/pages/index.astro'] });
    const evidence = await runAstroBuildExportProof({ packageManager: 'npm',
      verification: { expectedContent: ['Preserved content'], expectedThemeToken: '--gnr8-astro-accent: #0f766e;' },
      dependencies: { prepareWorkspace: async () => ({ workspacePath: root, baselineCommit: 'local-npm-lock', baselineKind: 'local', sourceSnapshot }) as never },
    });
    assert.equal(evidence.build.completed, true);
    assert.equal(evidence.versions.node, 'v26.13.0');
    assert.equal(evidence.versions.astro, '7.4.4');
    assert.equal(evidence.sourceComparison.unchanged, true);
    assert.equal(evidence.cleanup.completed, true);
    await assert.rejects(access(root));
    if (process.env.GNR8_NPM_PROOF_EVIDENCE) await writeFile(process.env.GNR8_NPM_PROOF_EVIDENCE, JSON.stringify(evidence, null, 2));
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
    await rm(root, { recursive: true, force: true });
  }
});

test('configured executor validates bytes and actual version; environment excludes credentials', async () => {
  const binary = process.env.GNR8_TEST_PINNED_NODE;
  assert(binary, 'Set GNR8_TEST_PINNED_NODE to a verified local Node26.13.0 binary');
  const root = await mkdtemp(join(tmpdir(), 'gnr8-executor-'));
  const previous = { path: process.env.GNR8_ASTRO_NODE_PATH, sha: process.env.GNR8_ASTRO_NODE_SHA256 };
  try {
    process.env.GNR8_ASTRO_NODE_PATH = binary; process.env.GNR8_ASTRO_NODE_SHA256 = await digest(binary);
    const selected = await resolveAstroNodeExecutor(root);
    assert.equal(selected!.version, '26.13.0');
    const env = await executorEnvironment(root, selected!.path, selected!.libraryPath);
    assert.notEqual(env.npm_config_userconfig, env.npm_config_globalconfig);
    assert.equal(await readFile(env.npm_config_userconfig!, 'utf8'), '');
    assert.equal(await readFile(env.npm_config_globalconfig!, 'utf8'), '');
    assert.equal(env.NODE_OPTIONS, undefined); assert.equal(env.DATABASE_URL, undefined); assert.equal(env.VERCEL_OIDC_TOKEN, undefined);
    const result = await runPinnedCommand(selected!.path, ['-e', 'console.log(JSON.stringify({version:process.versions.node,env:process.env}))'], { cwd: root, env, timeoutMs: 5000 });
    assert.equal(JSON.parse(result.stdout).version, '26.13.0');
    assert.equal(JSON.parse(result.stdout).env.HOME, root);
    process.env.GNR8_ASTRO_NODE_SHA256 = '0'.repeat(64);
    await assert.rejects(resolveAstroNodeExecutor(root), /INTEGRITY/);
    process.env.GNR8_ASTRO_NODE_PATH = join(root, 'missing');
    await assert.rejects(resolveAstroNodeExecutor(root), /ENOENT/);
    const bad = join(root, 'bad-node'); await writeFile(bad, 'not an executable');
    process.env.GNR8_ASTRO_NODE_PATH = bad; process.env.GNR8_ASTRO_NODE_SHA256 = await digest(bad);
    await assert.rejects(resolveAstroNodeExecutor(root), /INSIDE_SOURCE/);
    if (process.versions.node !== '26.13.0') {
      process.env.GNR8_ASTRO_NODE_PATH = process.execPath; process.env.GNR8_ASTRO_NODE_SHA256 = await digest(process.execPath);
      await assert.rejects(resolveAstroNodeExecutor(root), /VERSION_INVALID/);
    }
  } finally {
    if (previous.path === undefined) delete process.env.GNR8_ASTRO_NODE_PATH; else process.env.GNR8_ASTRO_NODE_PATH = previous.path;
    if (previous.sha === undefined) delete process.env.GNR8_ASTRO_NODE_SHA256; else process.env.GNR8_ASTRO_NODE_SHA256 = previous.sha;
    await rm(root, { recursive: true });
  }
});

test('executor rejects unverified loader libraries and never inherits loader injection', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'gnr8-library-')));
  const workspace = join(root, 'workspace'), toolchain = join(root, 'toolchain');
  const previous = process.env.LD_LIBRARY_PATH;
  try {
    await mkdir(workspace); await mkdir(join(toolchain, 'bin'), { recursive: true });
    await mkdir(join(toolchain, 'lib'));
    const binary = join(toolchain, 'bin/node');
    process.env.LD_LIBRARY_PATH = workspace;
    assert.equal((await executorEnvironment(workspace, process.execPath)).LD_LIBRARY_PATH, undefined);
    await writeFile(join(toolchain, 'lib/libatomic.so.1'), 'untrusted');
    await assert.rejects(resolveAstroNodeLibrary(workspace, binary), /LIBRARY_INTEGRITY_INVALID/);
    await rm(join(toolchain, 'lib/libatomic.so.1'));
    await writeFile(join(workspace, 'libatomic.so.1'), 'source-controlled');
    await symlink(join(workspace, 'libatomic.so.1'), join(toolchain, 'lib/libatomic.so.1'));
    await assert.rejects(resolveAstroNodeLibrary(workspace, binary), /LIBRARY_INSIDE_SOURCE/);
  } finally {
    if (previous === undefined) delete process.env.LD_LIBRARY_PATH; else process.env.LD_LIBRARY_PATH = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test('invalid executor fails before installation and existing pipeline cleans its workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-executor-cleanup-'));
  const previous = { path: process.env.GNR8_ASTRO_NODE_PATH, sha: process.env.GNR8_ASTRO_NODE_SHA256 };
  let commands = 0;
  try {
    process.env.GNR8_ASTRO_NODE_PATH = '/missing/gnr8-node'; process.env.GNR8_ASTRO_NODE_SHA256 = '0'.repeat(64);
    await assert.rejects(runAstroBuildExportProof({ dependencies: {
      prepareWorkspace: async () => ({ workspacePath: root, baselineCommit: 'local', baselineKind: 'local', sourceSnapshot: { aggregateSha256: '0'.repeat(64) } }) as never,
      readFile: async () => JSON.stringify({ engines: { node: '26.13.0' } }),
      runCommand: async () => { commands++; return { stdout: '', stderr: '' }; },
    } }));
    assert.equal(commands, 0); await assert.rejects(access(root));
  } finally {
    if (previous.path === undefined) delete process.env.GNR8_ASTRO_NODE_PATH; else process.env.GNR8_ASTRO_NODE_PATH = previous.path;
    if (previous.sha === undefined) delete process.env.GNR8_ASTRO_NODE_SHA256; else process.env.GNR8_ASTRO_NODE_SHA256 = previous.sha;
    await rm(root, { recursive: true, force: true });
  }
});

test('timeout and abort terminate the command group and bound output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-executor-stop-'));
  try {
    const options = { cwd: root, env: await executorEnvironment(root, process.execPath), timeoutMs: 200 };
    await assert.rejects(runPinnedCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], options), /TIMEOUT/);
    const controller = new AbortController();
    const pending = runPinnedCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ...options, timeoutMs: 5000, signal: controller.signal });
    controller.abort(); await assert.rejects(pending, /ABORTED/);
    await assert.rejects(runPinnedCommand(process.execPath, ['-e', 'process.stdout.write("x".repeat(3*1024*1024))'], { ...options, timeoutMs: 5000 }), /OUTPUT_LIMIT/);
  } finally { await rm(root, { recursive: true }); }
});

test('abort also kills a package-manager descendant', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-executor-tree-'));
  const marker = join(root, 'child.pid');
  const controller = new AbortController();
  const script = `const {spawn}=require('node:child_process');const {writeFileSync}=require('node:fs');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});writeFileSync(${JSON.stringify(marker)},String(c.pid));setInterval(()=>{},1000);`;
  const command = runPinnedCommand(process.execPath, ['-e', script], { cwd: root, env: await executorEnvironment(root, process.execPath), timeoutMs: 5000, signal: controller.signal });
  // Attach rejection handling before cancellation.
  const rejected = assert.rejects(command, /ABORTED/);
  try {
    let pid = 0;
    for (let n = 0; n < 100; n++) {
      try { pid = Number(await readFile(marker, 'utf8')); break; } catch { await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    assert(pid > 0, 'descendant started'); controller.abort(); await rejected;
    let alive = true;
    for (let n = 0; n < 100 && alive; n++) {
      try { process.kill(pid, 0); await new Promise(resolve => setTimeout(resolve, 20)); } catch { alive = false; }
    }
    assert.equal(alive, false, 'no orphan remains');
  } finally { controller.abort(); await rejected; await rm(root, { recursive: true, force: true }); }
});
