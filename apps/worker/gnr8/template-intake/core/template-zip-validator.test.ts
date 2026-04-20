import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { validateAndExtractTemplateZip } from '@/gnr8/template-intake/core/template-zip-validator'

function buildZipBytes(input: { fileName: string; files: Record<string, string> }): Uint8Array {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-template-zip-validator-'))
  try {
    for (const [relativePath, content] of Object.entries(input.files)) {
      const fileAbsPath = path.resolve(tmpRoot, relativePath)
      fs.mkdirSync(path.dirname(fileAbsPath), { recursive: true })
      fs.writeFileSync(fileAbsPath, content, 'utf8')
    }

    const zipAbsPath = path.resolve(tmpRoot, input.fileName)
    execFileSync('zip', ['-q', '-r', zipAbsPath, '.'], { cwd: tmpRoot })
    return new Uint8Array(fs.readFileSync(zipAbsPath))
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

function validateTemplateZip(input: { fileName: string; files: Record<string, string> }) {
  return validateAndExtractTemplateZip({
    fileName: input.fileName,
    bytes: buildZipBytes(input),
  })
}

test('passes for root/index.html', () => {
  const result = validateTemplateZip({
    fileName: 'root-index.zip',
    files: {
      'index.html': '<!doctype html><html><body>Index</body></html>',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'index.html')
  assert.equal(result.validation.entryHtmlSelection, 'root_index')
})

test('passes for root/landing.html single-html fallback', () => {
  const result = validateTemplateZip({
    fileName: 'root-landing.zip',
    files: {
      'landing.html': '<!doctype html><html><body>Landing</body></html>',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'landing.html')
  assert.equal(result.validation.entryHtmlSelection, 'single_file_fallback')
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_HTML_ENTRY_FALLBACK_SINGLE_FILE'), true)
})

test('passes for nested/template/index.html with root normalization', () => {
  const result = validateTemplateZip({
    fileName: 'nested-index.zip',
    files: {
      'template/index.html': '<!doctype html><html><body>Index</body></html>',
      'template/assets/styles.css': 'body{margin:0}',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'index.html')
  assert.equal(result.validation.entryHtmlSelection, 'root_index')
  assert.equal(path.basename(result.validation.extractionRootDirAbs), 'template')
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_ZIP_SINGLE_ROOT_FOLDER_DETECTED'), true)
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_ZIP_ROOT_NORMALIZED'), true)
})

test('passes for nested/template/landing.html with root normalization', () => {
  const result = validateTemplateZip({
    fileName: 'nested-landing.zip',
    files: {
      'template/landing.html': '<!doctype html><html><body>Landing</body></html>',
      'template/assets/app.js': 'console.log("ok")',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'landing.html')
  assert.equal(result.validation.entryHtmlSelection, 'single_file_fallback')
  assert.equal(path.basename(result.validation.extractionRootDirAbs), 'template')
})

test('passes for a single nested HTML file when no root-level HTML exists', () => {
  const result = validateTemplateZip({
    fileName: 'single-nested-html.zip',
    files: {
      'landing/index.html': '<!doctype html><html><body>Landing</body></html>',
      'assets/styles.css': 'body{margin:0}',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'landing/index.html')
  assert.equal(result.validation.entryHtmlSelection, 'single_file_fallback')
  assert.deepEqual(result.validation.htmlCandidates, ['landing/index.html'])
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_HTML_ENTRY_FALLBACK_SINGLE_FILE'), true)
})

test('passes for Beauty Clinic style nested single-entry HTML path with spaces', () => {
  const result = validateTemplateZip({
    fileName: 'beauty-clinic-template.zip',
    files: {
      'Beauty Clinic & Salon Landing Page/Beauty Clinic & Salon Landing Page.html': '<!doctype html><html><body>Beauty</body></html>',
      'Beauty Clinic & Salon Landing Page/assets/site.css': 'body{margin:0}',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok || !result.validation) return
  assert.equal(result.validation.entryHtmlPath, 'Beauty Clinic & Salon Landing Page.html')
  assert.equal(result.validation.entryHtmlSelection, 'single_file_fallback')
  assert.equal(result.validation.htmlCandidates.length, 1)
})

test('fails when multiple root-level HTML files are present', () => {
  const result = validateTemplateZip({
    fileName: 'ambiguous-html.zip',
    files: {
      'index.html': '<!doctype html><html><body>Home</body></html>',
      'about.html': '<!doctype html><html><body>About</body></html>',
    },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_HTML_ENTRY_AMBIGUOUS'), true)
  const ambiguous = result.diagnostics.find((issue) => issue.code === 'TEMPLATE_HTML_ENTRY_AMBIGUOUS')
  assert.equal(ambiguous?.details?.fileCount, 2)
  assert.deepEqual(ambiguous?.details?.fileNames, ['about.html', 'index.html'])
})

test('fails when no HTML files are present', () => {
  const result = validateTemplateZip({
    fileName: 'no-html.zip',
    files: {
      'assets/styles.css': 'body{margin:0}',
      'assets/app.js': 'console.log("ok")',
    },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.diagnostics.some((issue) => issue.code === 'TEMPLATE_HTML_ENTRY_NOT_FOUND'), true)
})
