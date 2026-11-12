import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredGitHubTarget, stackiGithubSelected } from './stacki-github-config';

const scope = { agencyId: '00000000-0000-4000-8000-000000000001',
  clientId: 'd58656b4-414b-4aa7-b472-961464f105d2',
  siteId: 'dbdd5b9f-6ae1-4736-917b-20adf94838c6',
  siteVersionId: '22482f8e-e8a9-4fa5-8dc5-acae27d58378' };
const owner = 'pasadenagenerator';
const ownerId = 201065362;
const existing = { '9ff5613e-1625-43f1-844e-c5c91a813d4f': {
  owner, ownerId, repository: 'gnr8-chs', repositoryId: 1450563254 } };

function configure(token: string) {
  process.env.GNR8_STACKI_GITHUB_ENABLED = '1';
  process.env.GNR8_STACKI_GITHUB_TOKEN = token;
  process.env.GNR8_STACKI_GITHUB_TARGETS = JSON.stringify(existing);
}
function repo(name: string, siteId = scope.siteId) {
  return { private: true, name, id: 1453825419,
    owner: { login: owner, id: ownerId }, permissions: { push: true },
    description: `GNR8 standalone site ${siteId}` };
}

test('resolves an imported site from its immutable repository reference without a site env entry', async () => {
  configure('existing-reference');
  assert.equal(stackiGithubSelected(scope), true);
  let calls = 0;
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(url), 'https://api.github.com/repos/pasadenagenerator/gnr8-viroidoc');
    assert.equal(init?.method, undefined);
    return Response.json(repo('gnr8-viroidoc'));
  }) as typeof fetch;
  const target = await configuredGitHubTarget(scope, 'pasadenagenerator/gnr8-viroidoc', transport);
  assert.deepEqual(target, { owner, ownerId, repository: 'gnr8-viroidoc', repositoryId: 1453825419,
    token: 'existing-reference' });
  assert.equal(calls, 1);
});

test('provisions one private repository for a future site and verifies its binding', async () => {
  configure('new-site');
  const name = `gnr8-${scope.siteId}`;
  const urls: string[] = [];
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    urls.push(String(url));
    if (urls.length === 1) return new Response(null, { status: 404 });
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), { name, private: true,
      description: `GNR8 standalone site ${scope.siteId}`, auto_init: true });
    return Response.json(repo(name), { status: 201 });
  }) as typeof fetch;
  const target = await configuredGitHubTarget(scope, undefined, transport);
  assert.equal(target.repository, name);
  assert.deepEqual(urls, [`https://api.github.com/repos/${owner}/${name}`, 'https://api.github.com/user/repos']);
});

test('rejects a repository bound to another site', async () => {
  configure('wrong-site');
  const transport = (async () => Response.json(repo('gnr8-viroidoc', '9ff5613e-1625-43f1-844e-c5c91a813d4f'))) as typeof fetch;
  await assert.rejects(() => configuredGitHubTarget(scope, `${owner}/gnr8-viroidoc`, transport),
    /STACKI_GITHUB_TARGET_MISMATCH/);
});

test('reports missing repository creation permission without accepting a public fallback', async () => {
  configure('creation-denied');
  let calls = 0;
  const transport = (async () => ++calls === 1 ? new Response(null, { status: 404 }) :
    new Response(null, { status: 403 })) as typeof fetch;
  await assert.rejects(() => configuredGitHubTarget(scope, undefined, transport),
    /STACKI_GITHUB_REPOSITORY_CREATION_PERMISSION_REQUIRED/);
});
