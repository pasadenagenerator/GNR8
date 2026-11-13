import { createHash } from 'node:crypto'

import { pushStandaloneGit, readStandaloneGit } from '../standalone/publication-git'
import { githubCommitAuthor, githubDataBranchVercelConfig } from '../stacki/github-commit-author'
import type { AstroImportProjectFile } from './astro-import-project'

type Target = { owner: string; ownerId: number; repository: string; repositoryId: number; token: string }
type Repository = { defaultBranch: string; parent: string; existingCommit?: string }
const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex')

export async function writeAstroImportGitProject(input: {
  siteVersionId: string
  runtimeSiteId: string
  sourceImportCommit: string
  files: AstroImportProjectFile[]
  target: Target
}, deps: {
  repository: (branch: string) => Promise<Repository>
  push?: typeof pushStandaloneGit
  read?: typeof readStandaloneGit
}): Promise<{ branch: string; commit: string; fileCount: number; totalBytes: number; manifestSha256: string }> {
  if (!/^[a-f0-9-]{36}$/.test(input.siteVersionId) || !/^[a-f0-9]{40}$/.test(input.sourceImportCommit) ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(input.runtimeSiteId)) throw new Error('ASTRO_IMPORT_GIT_IDENTITY_INVALID')
  const branch = `astro/${input.siteVersionId}`
  const seen = new Set<string>()
  let totalBytes = 0
  const entries = input.files.map(file => {
    const key = file.path.normalize('NFC').toLowerCase()
    if (!file.path || file.path === '.gnr8-astro-import-manifest.json' || file.path === 'vercel.json' ||
        file.path.includes('\\') || file.path.split('/').some(part => !part || part === '.' || part === '..' || part === '.git') ||
        seen.has(key) || !Buffer.isBuffer(file.body)) throw new Error('ASTRO_IMPORT_GIT_FILE_INVALID')
    seen.add(key)
    totalBytes += file.body.length
    return { path: file.path, bytes: file.body.length, sha256: hash(file.body) }
  }).sort((a, b) => a.path.localeCompare(b.path))
  if (totalBytes > 128 * 1024 * 1024 || entries.length > 10_000) throw new Error('ASTRO_IMPORT_GIT_PROJECT_TOO_LARGE')
  const manifest = Buffer.from(JSON.stringify({ format: 'gnr8-astro-import-project:v1',
    siteVersionId: input.siteVersionId, runtimeSiteId: input.runtimeSiteId,
    sourceImportCommit: input.sourceImportCommit, files: entries }))
  const manifestSha256 = hash(manifest)
  const files = [...input.files, { path: '.gnr8-astro-import-manifest.json', body: manifest },
    { path: 'vercel.json', body: githubDataBranchVercelConfig }]
  const repository = await deps.repository(branch)
  if (repository.existingCommit) {
    const existing = await (deps.read ?? readStandaloneGit)({ owner: input.target.owner,
      repository: input.target.repository, branch, commit: repository.existingCommit, token: input.target.token })
    const saved = existing.files.get('.gnr8-astro-import-manifest.json')
    if (!saved || hash(saved) !== manifestSha256 || existing.files.size !== files.length ||
        files.some(file => !existing.files.get(file.path)?.equals(file.body))) throw new Error('ASTRO_IMPORT_GIT_BRANCH_CONFLICT')
    return { branch, commit: repository.existingCommit, fileCount: entries.length, totalBytes, manifestSha256 }
  }
  const pushed = await (deps.push ?? pushStandaloneGit)({ owner: input.target.owner,
    repository: input.target.repository, defaultBranch: repository.defaultBranch, parent: repository.parent,
    ref: `heads/${branch}`, manifestSha256, files, token: input.target.token,
    author: githubCommitAuthor(input.target, 'GNR8 Astro Import') })
  return { branch, commit: pushed.commit, fileCount: entries.length, totalBytes, manifestSha256 }
}
