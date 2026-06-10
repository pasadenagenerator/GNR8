import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { rawTemplatePreviewTraceHeaders } from '@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-trace-headers'

const ROUTE_FILE = new URL('../versions/[siteVersionId]/preview/route.ts', import.meta.url)

test('preview route trace headers expose raw-template preview evidence', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'raw_template_preview',
    previewRuntimeSummary: {
      rawTemplatePreviewEvidence: {
        selectedRoutePath: '/',
        selectedRawFilePath: 'pages/root/index.html',
        rewrittenLinkCount: 3,
        rewrittenAssetCount: 2,
        disabledScriptCount: 4,
        dbReadCount: 3,
        dbClientAcquisitionCount: 1,
        rawPreviewDbClientAcquisitionCount: 1,
        rawPreviewDbClientReleaseCount: 1,
        rawPreviewDbReadCount: 3,
        rawPreviewDbClientLeakSuspected: false,
        rawPreviewAssetRewriteEvidence: {
          assetReferencesInspected: 9,
          assetReferencesRewritten: 6,
          assetReferencesMissing: 1,
          imageReferencesMissing: 2,
          stylesheetsInspected: 3,
          fontFamilyDongleDetected: true,
        },
        rawPreviewAssetGraphEvidence: {
          stylesheetRefsFound: [{ originalReference: 'assets/site.css' }],
          stylesheetRefsRewritten: [{ originalReference: 'assets/site.css' }],
          stylesheetRefsMissing: [{ originalReference: 'assets/missing.css' }],
          imageRefsMissing: [{ originalReference: '/uploads/missing.png' }, { originalReference: '/uploads/other.png' }],
          dongleEvidence: { detected: true },
        },
        rawPreviewScriptPolicyEvidence: {
          totalScriptsFound: 7,
          scriptsPreserved: 5,
          scriptsBlocked: 2,
          scriptsRewrittenToControlledPreviewAssetUrls: 3,
          scriptsExternalPreserved: 2,
        },
        rawPreviewDuplicateGuardEvidence: {
          duplicateRootBlockDetected: true,
          duplicateRootBlockRemovedCount: 2,
          fingerprints: ['root-home:abc12345'],
          listingContainerDetected: true,
          guardReason: ['duplicate_root_home_fingerprint', 'root_block_before_listing_container'],
          runtimeDuplicateGuardInjected: true,
          runtimeDuplicateGuardMode: 'mutation_observer_root_home_duplicate_guard',
          runtimeDuplicateGuardFingerprintCount: 3,
          runtimeDuplicateGuardRemovedCountInitial: 2,
          runtimeDuplicateGuardScriptByteLength: 4096,
        },
        rawPreviewEmbedEvidence: {
          mapEmbedDetected: true,
          mapEmbedPreserved: true,
          blockedMapRefs: [],
          externalMapProviders: ['google_maps', 'openstreetmap'],
        },
        runtimeDuplicateGuardInjected: true,
        runtimeDuplicateGuardMode: 'mutation_observer_root_home_duplicate_guard',
        runtimeDuplicateGuardFingerprintCount: 3,
        runtimeDuplicateGuardRemovedCountInitial: 2,
        runtimeDuplicateGuardScriptByteLength: 4096,
      },
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '/')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], 'pages/root/index.html')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '3')
  assert.equal(headers['x-gnr8-preview-rewritten-assets-count'], '2')
  assert.equal(headers['x-gnr8-preview-disabled-scripts-count'], '4')
  assert.equal(headers['x-gnr8-preview-db-read-count'], '3')
  assert.equal(headers['x-gnr8-preview-db-client-acquisition-count'], '1')
  assert.equal(headers['x-gnr8-raw-db-client-acquisitions'], '1')
  assert.equal(headers['x-gnr8-raw-db-client-releases'], '1')
  assert.equal(headers['x-gnr8-raw-db-reads'], '3')
  assert.equal(headers['x-gnr8-raw-db-leak-suspected'], 'false')
  assert.equal(headers['x-gnr8-raw-assets-inspected'], '9')
  assert.equal(headers['x-gnr8-raw-assets-rewritten'], '6')
  assert.equal(headers['x-gnr8-raw-assets-missing'], '1')
  assert.equal(headers['x-gnr8-raw-font-dongle-detected'], 'true')
  assert.equal(headers['x-gnr8-raw-disabled-scripts-count'], '4')
  assert.equal(headers['x-gnr8-raw-scripts-found'], '7')
  assert.equal(headers['x-gnr8-raw-scripts-preserved'], '5')
  assert.equal(headers['x-gnr8-raw-scripts-blocked'], '2')
  assert.equal(headers['x-gnr8-raw-scripts-local-rewritten'], '3')
  assert.equal(headers['x-gnr8-raw-scripts-external-preserved'], '2')
  assert.equal(headers['x-gnr8-raw-stylesheets-found'], '1')
  assert.equal(headers['x-gnr8-raw-stylesheets-rewritten'], '1')
  assert.equal(headers['x-gnr8-raw-stylesheets-missing'], '1')
  assert.equal(headers['x-gnr8-raw-images-missing'], '2')
  assert.equal(headers['x-gnr8-raw-dongle-detected'], 'true')
  assert.equal(headers['x-gnr8-raw-duplicate-root-detected'], 'true')
  assert.equal(headers['x-gnr8-raw-duplicate-root-removed'], '2')
  assert.equal(headers['x-gnr8-raw-listing-container-detected'], 'true')
  assert.equal(headers['x-gnr8-raw-duplicate-guard-reason'], 'duplicate_root_home_fingerprint,root_block_before_listing_container')
  assert.equal(headers['x-gnr8-raw-runtime-duplicate-guard'], 'mutation_observer_root_home_duplicate_guard')
  assert.equal(headers['x-gnr8-raw-runtime-duplicate-fingerprints'], '3')
  assert.equal(headers['x-gnr8-raw-map-embed-detected'], 'true')
  assert.equal(headers['x-gnr8-raw-map-embed-preserved'], 'true')
  assert.equal(headers['x-gnr8-raw-map-providers'], 'google_maps,openstreetmap')
  assert.equal(headers['x-gnr8-raw-map-blocked-refs'], '0')
})

test('preview route trace headers fall back to top-level raw-template evidence', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'raw_template_preview',
    rawTemplatePreviewEvidence: {
      selectedRoutePath: '/project',
      selectedRawFilePath: 'pages/project/index.html',
      rewrittenLinkCount: 1,
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '/project')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], 'pages/project/index.html')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '1')
})

test('preview route trace headers do not expose raw-template evidence for transformed mode', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'transformed',
    rawTemplatePreviewEvidence: {
      selectedRoutePath: '/project',
      selectedRawFilePath: 'pages/project/index.html',
      rewrittenLinkCount: 1,
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], '')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '0')
  assert.equal(headers['x-gnr8-preview-disabled-scripts-count'], '0')
  assert.equal(headers['x-gnr8-raw-assets-inspected'], '0')
  assert.equal(headers['x-gnr8-raw-font-dongle-detected'], 'false')
  assert.equal(headers['x-gnr8-raw-scripts-found'], '0')
  assert.equal(headers['x-gnr8-raw-scripts-preserved'], '0')
  assert.equal(headers['x-gnr8-raw-scripts-blocked'], '0')
  assert.equal(headers['x-gnr8-raw-scripts-local-rewritten'], '0')
  assert.equal(headers['x-gnr8-raw-scripts-external-preserved'], '0')
  assert.equal(headers['x-gnr8-raw-stylesheets-found'], '0')
  assert.equal(headers['x-gnr8-raw-dongle-detected'], 'false')
  assert.equal(headers['x-gnr8-raw-runtime-duplicate-guard'], 'false')
  assert.equal(headers['x-gnr8-raw-runtime-duplicate-fingerprints'], '0')
})

test('preview route HTML response uses raw-template trace header helper', async () => {
  const source = await readFile(ROUTE_FILE, 'utf8')

  assert.equal(source.includes('rawTemplatePreviewTraceHeaders'), true)
  assert.equal(source.includes('...rawTraceHeaders'), true)
})
