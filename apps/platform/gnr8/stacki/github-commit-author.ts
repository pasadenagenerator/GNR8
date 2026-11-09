/** GitHub attributes commits from the configured personal account using its
 * private no-reply address. The target is verified before any write. */
export function githubCommitAuthor(target: { owner: string; ownerId: number }, name: string) {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(target.owner) ||
      !Number.isSafeInteger(target.ownerId) || target.ownerId <= 0) {
    throw new Error('STACKI_GITHUB_TARGET_MISMATCH');
  }
  return { name, email: `${target.ownerId}+${target.owner}@users.noreply.github.com` };
}

/** Data branches are archives and editor checkpoints, not deployable sites. */
export const githubDataBranchVercelConfig = Buffer.from('\n' + JSON.stringify({git:{deploymentEnabled:false}}) + '\n');
