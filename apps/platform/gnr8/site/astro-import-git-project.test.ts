import assert from 'node:assert/strict'
import test from 'node:test'

import { writeAstroImportGitProject } from './astro-import-git-project'

test('writes the Astro project to one immutable site branch without provider execution', async () => {
  let pushed: { ref?: string; files?: Array<{ path: string; body: Buffer }> } = {}
  const result = await writeAstroImportGitProject({
    siteVersionId: '11111111-1111-4111-8111-111111111111', runtimeSiteId: 'site_1',
    sourceImportCommit: 'a'.repeat(40),
    files: [{ path: 'package.json', body: Buffer.from('{"private":true}') },
      { path: 'src/pages/index.astro', body: Buffer.from('<h1>Site</h1>') }],
    target: { owner: 'example', ownerId: 123, repository: 'gnr8-example', repositoryId: 456, token: 'test' },
  }, {
    repository: async branch => {
      assert.equal(branch, 'astro/11111111-1111-4111-8111-111111111111')
      return { defaultBranch: 'main', parent: 'b'.repeat(40) }
    },
    push: async input => { pushed = { ref: input.ref, files: input.files }; return { commit: 'c'.repeat(40), tree: 'd'.repeat(40) } },
  })
  assert.equal(result.branch, 'astro/11111111-1111-4111-8111-111111111111')
  assert.equal(pushed.ref, `heads/${result.branch}`)
  assert.deepEqual(pushed.files?.map(file => file.path), ['package.json', 'src/pages/index.astro', '.gnr8-astro-import-manifest.json', 'vercel.json'])
  assert.match(pushed.files?.at(-1)?.body.toString() ?? '', /deploymentEnabled.*false/)
})
