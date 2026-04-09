import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const CWD = path.resolve(process.cwd())
const PLATFORM_ROOT = CWD.endsWith(path.join('apps', 'platform')) ? CWD : path.resolve(CWD, 'apps/platform')

function readFileFromWorkspace(relativePath: string): string {
  return fs.readFileSync(path.resolve(PLATFORM_ROOT, relativePath), 'utf8')
}

test('scoped import API route is pinned to nodejs runtime surface', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts')
  assert.match(routeSource, /export const runtime = ['"]nodejs['"]/)
  assert.doesNotMatch(routeSource, /export const runtime = ['"]edge['"]/)
})

test('runtime migrate URL API route is pinned to nodejs runtime surface', () => {
  const routeSource = readFileFromWorkspace('app/api/gnr8/runtime/migrate/url/route.ts')
  assert.match(routeSource, /export const runtime = ['"]nodejs['"]/)
  assert.doesNotMatch(routeSource, /export const runtime = ['"]edge['"]/)
})
