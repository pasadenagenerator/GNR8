import assert from 'node:assert/strict'
import test from 'node:test'

import { createSiteCreateRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/site-create-route-handlers'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplate(seed: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: seed.id ?? '00000000-0000-4000-8000-000000000901',
    clientId: seed.clientId ?? '00000000-0000-4000-8000-000000000201',
    organizationId: seed.organizationId ?? '00000000-0000-4000-8000-000000000201',
    agencyId: seed.agencyId ?? '00000000-0000-4000-8000-000000000301',
    createdByUserId: seed.createdByUserId ?? '00000000-0000-4000-8000-000000000101',
    name: seed.name ?? 'Template One',
    slug: seed.slug ?? 'template-one',
    sourceType: 'zip_html',
    status: seed.status ?? 'ready',
    importHealth: seed.importHealth ?? 'clean',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'html_snapshot',
    tags: seed.tags ?? [],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    entryHtmlPath: seed.entryHtmlPath ?? 'index.html',
    entryHtmlFileName: seed.entryHtmlFileName ?? 'index.html',
    templateType: seed.templateType ?? 'single_page',
    importSnapshotId: seed.importSnapshotId ?? null,
    templateManifestSummary: seed.templateManifestSummary ?? null,
    diagnosticsSummary: seed.diagnosticsSummary ?? null,
    importManifestSummary: seed.importManifestSummary ?? null,
    version: seed.version ?? 1,
    visibility: 'private',
    createdAt: seed.createdAt ?? '2026-04-16T10:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-04-16T10:00:00.000Z',
  }
}

function getParams() {
  return Promise.resolve({ clientId: '00000000-0000-4000-8000-000000000201' })
}

function createDeps(overrides?: {
  getTemplateById?: (input: { clientId: string; templateId: string }) => Promise<TemplateRecord | null>
  createSiteFromTemplate?: (input: {
    clientId: string
    agencyId: string
    templateId: string
    name: string
    domain: string
  }) => Promise<{
    siteId: string
    clientId: string
    agencyId: string
    templateId: string
    name: string
    domain: string
    status: string
    createdAt: string
    updatedAt: string
  }>
}) {
  return {
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    getTemplateById: overrides?.getTemplateById ?? (async () => createTemplate()),
    createSiteFromTemplate:
      overrides?.createSiteFromTemplate ??
      (async ({ clientId, agencyId, templateId, name, domain }) => ({
        siteId: '00000000-0000-4000-8000-000000000777',
        clientId,
        agencyId,
        templateId,
        name,
        domain,
        status: 'draft',
        createdAt: '2026-04-16T12:00:00.000Z',
        updatedAt: '2026-04-16T12:00:00.000Z',
      })),
    parseTemplateStorageError: () => null,
    parseSiteCreateError: () => null,
    parseScopeError: (error: unknown) => ({ status: 500, message: error instanceof Error ? error.message : 'failed' }),
  }
}

test('POST /sites creates site from template successfully', async () => {
  const handlers = createSiteCreateRouteHandlers(createDeps())
  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: '  New Website  ',
        domain: 'HTTPS://EXAMPLE.COM/',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as {
    ok: boolean
    site?: { siteId: string; templateId: string; name: string; domain: string }
    redirectTo?: string
  }

  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(body.site?.siteId, '00000000-0000-4000-8000-000000000777')
  assert.equal(body.site?.templateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.site?.name, 'New Website')
  assert.equal(body.site?.domain, 'example.com')
  assert.equal(
    body.redirectTo,
    '/gnr8/agency/clients/00000000-0000-4000-8000-000000000201/sites/00000000-0000-4000-8000-000000000777/overview?agency=00000000-0000-4000-8000-000000000301',
  )
})

test('POST /sites validates missing templateId, name, and domain', async () => {
  const handlers = createSiteCreateRouteHandlers(createDeps())

  const missingTemplate = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Site', domain: 'example.com' }),
    }),
    { params: getParams() },
  )
  const missingTemplateBody = (await missingTemplate.json()) as { ok: boolean; code?: string; error?: string }
  assert.equal(missingTemplate.status, 400)
  assert.equal(missingTemplateBody.ok, false)
  assert.equal(missingTemplateBody.code, 'SITE_INVALID_PAYLOAD')
  assert.equal(missingTemplateBody.error, 'templateId is required.')

  const missingName = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const missingNameBody = (await missingName.json()) as { ok: boolean; code?: string; error?: string }
  assert.equal(missingName.status, 400)
  assert.equal(missingNameBody.error, 'name is required.')

  const missingDomain = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: 'Site',
      }),
    }),
    { params: getParams() },
  )
  const missingDomainBody = (await missingDomain.json()) as { ok: boolean; code?: string; error?: string }
  assert.equal(missingDomain.status, 400)
  assert.equal(missingDomainBody.error, 'domain is required.')
})

test('POST /sites enforces template scope ownership and rejects cross-client template usage', async () => {
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      getTemplateById: async () => null,
    }),
  )
  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000999',
        name: 'Site',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; code?: string }
  assert.equal(response.status, 404)
  assert.equal(body.ok, false)
  assert.equal(body.code, 'TEMPLATE_NOT_FOUND')
})

test('POST /sites passes template linkage into persistence layer', async () => {
  let persistedTemplateId: string | null = null
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      createSiteFromTemplate: async (input) => {
        persistedTemplateId = input.templateId
        return {
          siteId: '00000000-0000-4000-8000-000000000778',
          clientId: input.clientId,
          agencyId: input.agencyId,
          templateId: input.templateId,
          name: input.name,
          domain: input.domain,
          status: 'draft',
          createdAt: '2026-04-16T12:00:00.000Z',
          updatedAt: '2026-04-16T12:00:00.000Z',
        }
      },
    }),
  )
  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: 'Site',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; site?: { templateId: string } }
  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(persistedTemplateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.site?.templateId, '00000000-0000-4000-8000-000000000901')
})
