import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWorkingDomain, suggestWorkingDomain } from './working-domain';

test('working domain is visible from the source URL and can be overridden with one safe host', () => {
  assert.equal(suggestWorkingDomain('https://www.drekec-pekec.com/'), 'drekec-pekec.app.pasadenagenerator.com');
  assert.equal(suggestWorkingDomain('https://www.ladjazaba.si/'), 'ladjazaba.app.pasadenagenerator.com');
  assert.equal(normalizeWorkingDomain('LADJA-ZABA.APP.PASADENAGENERATOR.COM'), 'ladja-zaba.app.pasadenagenerator.com');
  assert.equal(normalizeWorkingDomain('other.example.com'), null);
  assert.equal(normalizeWorkingDomain('*.app.pasadenagenerator.com'), null);
});
