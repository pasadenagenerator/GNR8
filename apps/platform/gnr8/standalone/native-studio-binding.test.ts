import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeStudioUrl, readNativeStudioBinding } from './native-studio-binding';
const siteId = '11111111-1111-4111-8111-111111111111';
const site = { siteId, repository: 'example/website', repositoryId: '123', branch: 'main',
  studioOrigin: 'https://working.example.com', accountId: 'a'.repeat(32), appId: '456', installationId: '789', clientId: 'Iv1.example' };
const encode = (value = site) => JSON.stringify({ [siteId]: value });
test('native launch uses only the exact configured site, independently of sandbox/pilot/source version', () => {
  assert.equal(nativeStudioUrl(siteId, encode()), 'https://working.example.com/studio');
  assert.equal(readNativeStudioBinding(siteId, encode()).repository, site.repository);
  assert.equal(nativeStudioUrl('22222222-2222-4222-8222-222222222222', encode()), null);
  for (const source of ['{}', 'null', 'bad json', encode({ ...site, siteId: 'wrong' }),
    encode({ ...site, studioOrigin: 'https://working.example.com/studio?next=evil' }),
    encode({ ...site, studioOrigin: 'javascript:alert(1)' })]) assert.equal(nativeStudioUrl(siteId, source), null);
});
