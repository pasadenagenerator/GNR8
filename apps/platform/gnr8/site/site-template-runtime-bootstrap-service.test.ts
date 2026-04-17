import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  bootstrapRuntimeFromTemplateSite,
  parseTemplateSiteRuntimeBootstrapError,
  type TemplateSiteRuntimeBootstrapErrorCode,
} from '@/gnr8/site/site-template-runtime-bootstrap-service'
import type { ScopedImportPipelineOutcome } from '@/gnr8/site/scoped-import-pipeline'

function createTemplateRoot(input: { snapshotId: string; entryHtmlPath: string; html: string; assetsDir?: string }): {
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
} {
  const base = path.resolve(os.tmpdir(), 'gnr8', 'template-intake', input.snapshotId, 'extracted')
  fs.mkdirSync(base, { recursive: true })
  const entryAbs = path.resolve(base, input.entryHtmlPath)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, input.html, 'utf8')
  if (input.assetsDir) fs.mkdirSync(path.resolve(base, input.assetsDir), { recursive: true })
  return {
    snapshotRootDirAbs: base,
    entryHtmlPathAbs: entryAbs,
  }
}

function createPipelineOutcome(seed?: Partial<ScopedImportPipelineOutcome>): ScopedImportPipelineOutcome {
  return {
    mode: 'pipeline',
    siteId: seed?.siteId ?? 'runtime-site-1',
    siteVersionId: seed?.siteVersionId ?? '00000000-0000-4000-8000-000000000771',
    versionNo: seed?.versionNo ?? 1,
    artifactId: seed?.artifactId ?? '00000000-0000-4000-8000-000000000772',
    pipelineResult:
      (seed as any)?.pipelineResult ??
      ({
        status: 'success',
        stages: [],
        diagnostics: [],
      } as any),
    preparedSite:
      (seed as any)?.preparedSite ??
      ({
        documents: [
          {
            path: 'index.html',
            isEntry: true,
            semantic: {
              sections: [
                { sectionId: 'sec-hero' },
                { sectionId: 'sec-cta' },
              ],
            },
            domOutline: {
              bodyChildElements: [],
            },
          },
        ],
      } as any),
    layoutModel: null,
    renderOutput: null,
    previewDocument: null,
    reporting:
      (seed as any)?.reporting ??
      ({
        executionStatus: 'success',
        consolidationApplied: true,
        renderedCaptureUsed: false,
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        fidelityDegraded: true,
        renderedCaptureStatus: 'failed',
        renderedDomQuality: 'strong',
        screenshotCount: 0,
        computedStyleSampleCount: 0,
        importDiagnosticCodes: ['RAW_HTML_FALLBACK_USED'],
        styleSourceMode: 'fallback_heuristics',
        stylePrimaryAccent: null,
        styleBackgroundTone: 'light',
        styleTypography: 'serif/sans',
        styleSpacingDensity: 'medium/comfortable',
        styleCta: 'button/medium',
        styleDiagnostics: [],
        importFidelityScore: null,
        artifactGenerated: true,
        writePath: {
          createdVersionId: '00000000-0000-4000-8000-000000000771',
          provenancePayloadBeforeWrite: null,
          provenanceWriteAttempted: true,
          provenanceWriteSucceeded: true,
          provenanceWriteAffectedRows: 1,
          artifactCreateAttempted: true,
          artifactCreatedId: '00000000-0000-4000-8000-000000000772',
          artifactBindAttempted: true,
          artifactBindSucceeded: true,
          artifactBindAffectedRows: 1,
          verifiedVersionIdAfterWrite: '00000000-0000-4000-8000-000000000771',
          verificationRead: {
            versionId: '00000000-0000-4000-8000-000000000771',
            artifactId: '00000000-0000-4000-8000-000000000772',
            hasImportProvenanceSummary: true,
          },
        },
      } as any),
  }
}

test('bootstrapRuntimeFromTemplateSite creates deterministic initial runtime/preview seed from template truth', async () => {
  const snapshotId = `template-zip-${Date.now()}-success`
  createTemplateRoot({
    snapshotId,
    entryHtmlPath: 'index.html',
    html: '<!doctype html><html><body><section><h1>Beauty Clinic</h1></section><section><p>Services</p></section></body></html>',
    assetsDir: 'assets',
  })

  let ownershipLinked: { siteId: string; siteVersionId: string } | null = null
  let pipelineInvocations = 0
  const result = await bootstrapRuntimeFromTemplateSite({
    site: {
      siteId: '00000000-0000-4000-8000-000000000777',
      clientId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
      templateId: '00000000-0000-4000-8000-000000000901',
      name: 'Beauty Clinic',
      domain: 'beautyclinic.example.com',
      status: 'draft',
      createdAt: '2026-04-17T10:00:00.000Z',
      updatedAt: '2026-04-17T10:00:00.000Z',
    },
    template: {
      id: '00000000-0000-4000-8000-000000000901',
      importSnapshotId: snapshotId,
      entryHtmlPath: 'index.html',
      entryHtmlFileName: 'index.html',
      importManifestSummary: { assetsDirPath: 'assets' } as any,
    },
    deps: {
      runScopedImportPipeline: async () => {
        pipelineInvocations += 1
        return createPipelineOutcome()
      },
      writeOwnershipLink: async (input) => {
        ownershipLinked = input
      },
      now: () => new Date('2026-04-17T12:00:00.000Z'),
    },
  })

  assert.equal(pipelineInvocations, 1)
  assert.deepEqual(ownershipLinked, {
    siteId: '00000000-0000-4000-8000-000000000777',
    siteVersionId: '00000000-0000-4000-8000-000000000771',
  })
  assert.equal(result.siteVersionId, '00000000-0000-4000-8000-000000000771')
  assert.equal(result.previewSeeded, true)
  assert.equal(result.sectionCount > 0, true)
})

test('bootstrapRuntimeFromTemplateSite fails truthfully when template artifact evidence is missing', async () => {
  let pipelineCalled = false

  try {
    await bootstrapRuntimeFromTemplateSite({
      site: {
        siteId: '00000000-0000-4000-8000-000000000778',
        clientId: '00000000-0000-4000-8000-000000000201',
        agencyId: '00000000-0000-4000-8000-000000000301',
        templateId: '00000000-0000-4000-8000-000000000902',
        name: 'Missing Evidence',
        domain: 'missing.example.com',
        status: 'draft',
        createdAt: '2026-04-17T10:00:00.000Z',
        updatedAt: '2026-04-17T10:00:00.000Z',
      },
      template: {
        id: '00000000-0000-4000-8000-000000000902',
        importSnapshotId: null,
        entryHtmlPath: 'missing/index.html',
        entryHtmlFileName: 'index.html',
        importManifestSummary: null,
      },
      deps: {
        runScopedImportPipeline: async () => {
          pipelineCalled = true
          return createPipelineOutcome()
        },
        writeOwnershipLink: async () => undefined,
      },
    })
    assert.fail('bootstrapRuntimeFromTemplateSite should fail when template source evidence is missing')
  } catch (error) {
    const parsed = parseTemplateSiteRuntimeBootstrapError(error)
    assert.equal(parsed?.code, 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING' satisfies TemplateSiteRuntimeBootstrapErrorCode)
  }
  assert.equal(pipelineCalled, false)
})

test('parseTemplateSiteRuntimeBootstrapError returns null for non-bootstrap errors', () => {
  const parsed = parseTemplateSiteRuntimeBootstrapError(new Error('not mapped'))
  assert.equal(parsed, null)
})
