import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { createAstroImportProject } from './astro-import-project'

const id = '11111111-1111-4111-8111-111111111111'
const site = 'site_test'
const prefix = `/api/gnr8/runtime/preview-assets/${site}/${id}/`
const capture = (path: string, body: string) => {
  const bytes = Buffer.from(body)
  return { path, bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
}

test('makes one editable Astro project from retained capture with local assets and blog', () => {
  const result = createAstroImportProject({
    runtimeSiteId: site, siteVersionId: id, sourceUrl: 'https://example.com/',
    sourceFiles: [
      { path: 'package.json', contents: '{"dependencies":{"astro":"^7.0.0"}}' },
      { path: 'astro.config.mjs', contents: 'export default {}' },
      { path: 'brand/kit.json', contents: '{"logos":[{"localPath":"assets/logo.webp"}]}' },
      { path: 'src/pages/index.astro', contents: `<html><head><link href="/one/a.css"></head><body><img src="${prefix}assets/a.webp"><img src="${prefix}assets/b.webp"><a href="/uploads/missing.pdf">Download</a></body></html>` },
      { path: 'src/pages/[...slug].astro', contents: '<html><body>Blog</body></html>' },
      { path: 'src/content/blog/post.json', contents: '{"route":"/b/post","mainHtml":"Post"}' },
      { path: 'public/one/a.css', contents: `.hero{background:url('../assets/a.webp')}` },
      { path: 'public/two/b.css', contents: `.hero{background:url('${prefix}assets/a.webp')}` },
    ],
    captureFiles: [capture('assets/a.webp', 'image'), capture('assets/b.webp', 'image'), capture('assets/logo.webp', 'logo')],
  })
  const files = new Map(result.files.map(file => [file.path, file.body.toString('utf8')]))
  assert.equal(result.routeCount, 2)
  assert.equal(result.assetCount, 3)
  assert.deepEqual(result.externalFallbacks, ['uploads/missing.pdf'])
  assert.equal([...files.keys()].filter(path => path.startsWith('public/styles/captured/')).length, 1)
  assert.equal([...files.keys()].filter(path => path.startsWith('public/assets/')).length, 2)
  assert.match(files.get('brand/kit.json')!, /assets\/logo.webp/)
  assert.match(files.get('src/pages/index.astro')!, /https:\/\/example.com\/uploads\/missing.pdf/)
  assert.doesNotMatch(files.get('src/pages/index.astro')!, /\/api\/gnr8\/runtime/)
  assert.doesNotMatch(files.get('src/pages/index.astro')!, /assets\/b.webp/)
})
