import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNativeStudioGitHubTokenCompatible } from './native-studio-upstream-github-compatibility';

test('unchanged Stacki 1.4.8 accepts at most 500 token characters', () => {
  assert.doesNotThrow(() => assertNativeStudioGitHubTokenCompatible(
    'ghs_' + 'a'.repeat(496)));
  assert.throws(() => assertNativeStudioGitHubTokenCompatible(
    'ghs_' + 'a'.repeat(497)), /upstream_github_token_incompatible/);
});
