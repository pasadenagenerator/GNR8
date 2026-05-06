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
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? 'template-source-zips',
    sourceZipStorageKey: seed.sourceZipStorageKey ?? 'client/x/template/y/template.zip',
    entryHtmlPath: seed.entryHtmlPath ?? 'index.html',
    entryHtmlFileName: seed.entryHtmlFileName ?? 'index.html',
    templateType: seed.templateType ?? 'single_page',
    importSnapshotId: seed.importSnapshotId ?? null,
    durableSnapshotRootDirAbs: seed.durableSnapshotRootDirAbs ?? null,
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
  triggerTemplateSiteBootstrap?: (input: {
    site: {
      siteId: string
      clientId: string
      agencyId: string
      templateId: string
      name: string
      domain: string
      status: string
      createdAt: string
      updatedAt: string
    }
    template: TemplateRecord
  }) => Promise<boolean>
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
    triggerTemplateSiteBootstrap: overrides?.triggerTemplateSiteBootstrap ?? (async () => true),
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
    siteId?: string
    siteVersionId?: string | null
    templateId?: string
    status?: string
    nextUrl?: string
  }

  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(body.siteId, '00000000-0000-4000-8000-000000000777')
  assert.equal(body.templateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.siteVersionId, null)
  assert.equal(body.status, 'bootstrap_running')
  assert.equal(
    body.nextUrl,
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
  const missingTemplateBody = (await missingTemplate.json()) as { ok: boolean; reasonCode?: string; diagnostics?: string[] }
  assert.equal(missingTemplate.status, 400)
  assert.equal(missingTemplateBody.ok, false)
  assert.equal(missingTemplateBody.reasonCode, 'SITE_INVALID_PAYLOAD')
  assert.equal(missingTemplateBody.diagnostics?.[0], 'templateId is required.')

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
  const missingNameBody = (await missingName.json()) as { ok: boolean; diagnostics?: string[] }
  assert.equal(missingName.status, 400)
  assert.equal(missingNameBody.diagnostics?.[0], 'name is required.')

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
  const missingDomainBody = (await missingDomain.json()) as { ok: boolean; diagnostics?: string[] }
  assert.equal(missingDomain.status, 400)
  assert.equal(missingDomainBody.diagnostics?.[0], 'domain is required.')
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
  const body = (await response.json()) as { ok: boolean; reasonCode?: string }
  assert.equal(response.status, 404)
  assert.equal(body.ok, false)
  assert.equal(body.reasonCode, 'TEMPLATE_NOT_FOUND')
})

test('POST /sites rejects template while processing', async () => {
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      getTemplateById: async () =>
        createTemplate({
          status: 'processing',
          importHealth: 'degraded',
        }),
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
  const body = (await response.json()) as { ok: boolean; reasonCode?: string; diagnostics?: string[] }
  assert.equal(response.status, 409)
  assert.equal(body.ok, false)
  assert.equal(body.reasonCode, 'TEMPLATE_NOT_READY')
  assert.equal(body.diagnostics?.[0], 'Template is still processing and cannot be used for site creation yet.')
})

test('POST /sites rejects ready template without bootstrap source truth', async () => {
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      getTemplateById: async () =>
        createTemplate({
          status: 'ready',
          entryHtmlPath: 'index.html',
          durableSnapshotRootDirAbs: null,
          importSnapshotId: null,
          sourceZipStorageBucket: '',
          sourceZipStorageKey: '',
        }),
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
  const body = (await response.json()) as { ok: boolean; reasonCode?: string; diagnostics?: string[] }
  assert.equal(response.status, 409)
  assert.equal(body.ok, false)
  assert.equal(body.reasonCode, 'TEMPLATE_READY_WITHOUT_BOOTSTRAP_SOURCE')
  assert.equal(body.diagnostics?.[0], 'Template is marked ready but does not contain bootstrap source truth.')
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
  const body = (await response.json()) as { ok: boolean; templateId?: string }
  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(persistedTemplateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.templateId, '00000000-0000-4000-8000-000000000901')
})

test('POST /sites triggers worker-owned template bootstrap before returning success', async () => {
  let bootstrapCalled = false
  let bootstrappedSiteId: string | null = null
  let bootstrappedTemplateId: string | null = null
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      triggerTemplateSiteBootstrap: async ({ site, template }) => {
        bootstrapCalled = true
        bootstrappedSiteId = site.siteId
        bootstrappedTemplateId = template.id
        return true
      },
    }),
  )

  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: 'Bootstrapped Site',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; siteId?: string }

  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(bootstrapCalled, true)
  assert.equal(bootstrappedSiteId, '00000000-0000-4000-8000-000000000777')
  assert.equal(bootstrappedTemplateId, '00000000-0000-4000-8000-000000000901')
})

test('POST /sites reports trigger degradation without failing created site response', async () => {
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      triggerTemplateSiteBootstrap: async () => false,
    }),
  )

  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: 'Bootstrapped Site',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as {
    ok: boolean
    status?: string
    reasonCode?: string | null
    diagnostics?: string[]
  }

  assert.equal(response.status, 202)
  assert.equal(body.ok, false)
  assert.equal(body.status, 'failed')
  assert.equal(body.reasonCode, 'TEMPLATE_SITE_BOOTSTRAP_TRIGGER_FAILED')
  assert.equal(body.diagnostics?.includes('TEMPLATE_SITE_CREATE_FAILED'), true)
})

test('POST /sites fails deterministically when bootstrap agency scope is invalid', async () => {
  const handlers = createSiteCreateRouteHandlers(
    createDeps({
      triggerTemplateSiteBootstrap: async () => {
        const error = new Error('Agency scope is invalid for site bootstrap.')
        const typedError = error as Error & { code?: string }
        typedError.code = 'INVALID_AGENCY_ID_FOR_BOOTSTRAP'
        throw error
      },
    }),
  )

  const response = await handlers.POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        templateId: '00000000-0000-4000-8000-000000000901',
        name: 'Bootstrapped Site',
        domain: 'example.com',
      }),
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; reasonCode?: string; diagnostics?: string[] }

  assert.equal(response.status, 409)
  assert.equal(body.ok, false)
  assert.equal(body.reasonCode, 'INVALID_AGENCY_ID_FOR_BOOTSTRAP')
  assert.equal(body.diagnostics?.[0], 'Agency scope is invalid for site bootstrap.')
})
