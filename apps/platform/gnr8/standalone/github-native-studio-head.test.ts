import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectGitHubNativeStudioHead } from './github-native-studio-head';

const site = { repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki' };
const credential = 'ghs_' + 'a'.repeat(40);
const commit = 'b'.repeat(40);

function fixture() {
  const calls: string[] = [];
  const result: Record<string, unknown> = {
    '/repos/example/site': { id: 42, full_name: 'example/site', private: true },
    '/repos/example/site/git/ref/heads/codex/native-stacki': {
      ref: 'refs/heads/codex/native-stacki', object: { type: 'commit', sha: commit } },
  };
  const transport = (async (url: string, options: RequestInit) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${credential}`);
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://api.github.com');
    calls.push(parsed.pathname);
    const value = result[parsed.pathname];
    return value === undefined ? new Response(null, { status: 404 })
      : Response.json(value);
  }) as typeof fetch;
  return { calls, result, transport };
}

test('checks exact private repository ID and branch commit without writes', async () => {
  const f = fixture();
  assert.deepEqual(await inspectGitHubNativeStudioHead(site, credential, f.transport),
    { repositoryId: site.repositoryId, branch: site.branch, commit });
  assert.deepEqual(f.calls, ['/repos/example/site',
    '/repos/example/site/git/ref/heads/codex/native-stacki']);
});

test('accepts the longer stateless installation-token format', async () => {
  const f = fixture();
  const longToken = 'ghs_123456.' + 'a'.repeat(500) + '.' + 'b'.repeat(500);
  const transport = (async (url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${longToken}`);
    return f.transport(url, { ...options, headers: {
      ...Object.fromEntries(new Headers(options.headers)), authorization: `Bearer ${credential}` } });
  }) as typeof fetch;
  assert.equal((await inspectGitHubNativeStudioHead(site, longToken, transport)).commit, commit);
});

test('wrong repository, missing branch or non-commit ref fail closed', async () => {
  const f = fixture();
  (f.result['/repos/example/site'] as { id: number }).id = 43;
  await assert.rejects(inspectGitHubNativeStudioHead(site, credential, f.transport),
    /repository_conflict/);
  (f.result['/repos/example/site'] as { id: number }).id = 42;
  delete f.result['/repos/example/site/git/ref/heads/codex/native-stacki'];
  await assert.rejects(inspectGitHubNativeStudioHead(site, credential, f.transport),
    /unavailable/);
  f.result['/repos/example/site/git/ref/heads/codex/native-stacki'] = {
    ref: 'refs/heads/codex/native-stacki', object: { type: 'tag', sha: commit } };
  await assert.rejects(inspectGitHubNativeStudioHead(site, credential, f.transport),
    /branch_conflict/);
});

test('rejects a broad classic token or malformed target', async () => {
  const f = fixture();
  const transport = (async (url: string, options: RequestInit) => {
    const response = await f.transport(url, options);
    response.headers.set('x-oauth-scopes', 'repo');
    return response;
  }) as typeof fetch;
  await assert.rejects(inspectGitHubNativeStudioHead(site, credential, transport),
    /credential_too_broad/);
  await assert.rejects(inspectGitHubNativeStudioHead({ ...site,
    branch: '../other' }, credential, f.transport), /input_invalid/);
});
