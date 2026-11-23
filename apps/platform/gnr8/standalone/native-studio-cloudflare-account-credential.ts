import 'server-only';

type Environment = Readonly<Record<string, string | undefined>>;
type Role = 'R2_MANAGER' | 'WORKER_CREATOR' | 'WORKER_READER' |
  'TOKEN_MANAGER' | 'ACCESS_MANAGER' | 'DEPLOYER' | 'STUDIO_INSTALLER';

/** A role-specific token takes precedence; the account token is an explicit
 * one-time setup option for a centrally approved provisioner. */
export function configuredNativeStudioCloudflareCredential(
  env: Environment, role: Role,
): string {
  return env[`GNR8_NATIVE_STUDIO_CLOUDFLARE_${role}`] ||
    env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_TOKEN || '';
}
