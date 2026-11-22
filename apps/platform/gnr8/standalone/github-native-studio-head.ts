import 'server-only';

const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
// GitHub's stateless installation tokens can be JWT-sized, not 40 characters.
export const isGitHubInstallationToken = (value: string) =>
  /^ghs_[A-Za-z0-9._-]{20,4092}$/.test(value);
const COMMIT = /^[a-f0-9]{40,64}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Read-only check for an exact private repository. A missing branch is valid
 * before the first source push; a missing repository is not. */
export async function inspectGitHubNativeStudioBranch(site: {
  repository: string; repositoryId: string; branch: string;
}, credential: string, transport: typeof fetch = fetch,
requireFirstPushBase = false) {
  if (!site || !REPOSITORY.test(site.repository) ||
      !/^[1-9][0-9]*$/.test(site.repositoryId) ||
      !Number.isSafeInteger(Number(site.repositoryId)) ||
      !BRANCH.test(site.branch) || site.branch.includes('..') ||
      site.branch.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.')) ||
      !isGitHubInstallationToken(credential))
    throw Error('native_studio_github_head_input_invalid');
  const [owner, repo] = site.repository.split('/');
  const root = `https://api.github.com/repos/${encodeURIComponent(owner!)}/${encodeURIComponent(repo!)}`;
  async function read(path: string, allowMissing = false): Promise<Record<string, unknown> | null> {
    const response = await transport(`${root}${path}`, { method: 'GET',
      redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`,
        accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28' } });
    if (response.headers.get('x-oauth-scopes')?.split(',')
      .map(value => value.trim()).includes('repo'))
      throw Error('native_studio_github_head_credential_too_broad');
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_github_head_unavailable');
    let value: unknown;
    try { value = await response.json(); }
    catch { throw Error('native_studio_github_head_invalid'); }
    if (!object(value)) throw Error('native_studio_github_head_invalid');
    return value;
  }
  const repository = await read('');
  if (!repository || repository.private !== true || repository.id !== Number(site.repositoryId) ||
      typeof repository.full_name !== 'string' ||
      repository.full_name.toLowerCase() !== site.repository.toLowerCase())
    throw Error('native_studio_github_head_repository_conflict');
  const ref = `heads/${site.branch}`;
  const branch = await read(`/git/ref/${ref.split('/').map(encodeURIComponent).join('/')}`, true);
  if (!branch) {
    if (!requireFirstPushBase)
      return { repositoryId: site.repositoryId, branch: site.branch, commit: null };
    const defaultBranch = repository.default_branch;
    if (typeof defaultBranch !== 'string' || !BRANCH.test(defaultBranch) ||
        defaultBranch === site.branch || defaultBranch.includes('..') ||
        defaultBranch.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.')))
      throw Error('native_studio_github_head_base_conflict');
    const baseRef = `heads/${defaultBranch}`;
    const base = await read(`/git/ref/${baseRef.split('/').map(encodeURIComponent).join('/')}`);
    if (!base || base.ref !== `refs/${baseRef}` || !object(base.object) ||
        base.object.type !== 'commit' || !COMMIT.test(base.object.sha as string))
      throw Error('native_studio_github_head_base_conflict');
    return { repositoryId: site.repositoryId, branch: site.branch, commit: null,
      baseCommit: base.object.sha as string };
  }
  if (branch.ref !== `refs/${ref}` || !object(branch.object) ||
      branch.object.type !== 'commit' || !COMMIT.test(branch.object.sha as string))
    throw Error('native_studio_github_head_branch_conflict');
  return { repositoryId: site.repositoryId, branch: site.branch,
    commit: branch.object.sha as string };
}

/** First-open requires the exact branch to exist. */
export async function inspectGitHubNativeStudioHead(site: {
  repository: string; repositoryId: string; branch: string;
}, credential: string, transport: typeof fetch = fetch) {
  const result = await inspectGitHubNativeStudioBranch(site, credential, transport);
  if (!result.commit) throw Error('native_studio_github_head_unavailable');
  return { repositoryId: result.repositoryId, branch: result.branch, commit: result.commit };
}
