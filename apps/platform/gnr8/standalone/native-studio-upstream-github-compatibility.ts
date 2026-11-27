import 'server-only';
import { isGitHubInstallationToken } from './github-native-studio-head';

// The retained, unchanged Stacki 1.4.8 GitHub parser limits token strings to 500.
const MAX_NATIVE_GITHUB_TOKEN_LENGTH = 500;

export function assertNativeStudioGitHubTokenCompatible(token: string): void {
  if (typeof token !== 'string' || !isGitHubInstallationToken(token) ||
      token.length > MAX_NATIVE_GITHUB_TOKEN_LENGTH)
    throw Error('native_studio_upstream_github_token_incompatible');
}
