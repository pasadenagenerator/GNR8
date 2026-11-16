const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const script = readFileSync(join(__dirname, 'check-node-version.js'), 'utf8');
function check(version, profile) {
 let exitCode = 0;
 vm.runInNewContext(script, { console: { error() {} }, process: {
  version, env: profile === undefined ? {} : { GNR8_NODE_PROFILE: profile }, exit(code) { exitCode = code; },
 } });
 return exitCode;
}
test('default installation stays on Node 22', () => {
 assert.equal(check('v22.23.4'), 0); assert.equal(check('v26.13.0'), 1);
});
test('only explicit Astro Worker profile permits Node 26', () => {
 assert.equal(check('v26.13.0', 'astro-worker'), 0);
 assert.equal(check('v26.14.1', 'astro-worker'), 0);
 assert.equal(check('v22.23.4', 'astro-worker'), 1);
 assert.equal(check('v27.0.0', 'astro-worker'), 1);
});
test('unknown installation profile fails closed', () => {
 assert.equal(check('v26.13.0', 'anything'), 1);
});
