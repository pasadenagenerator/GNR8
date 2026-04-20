import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
  isTemplateRuntimeStatus,
  parseTemplateProcessingRequestedPayload,
} from './index'

test('event contract payload parsing is stable', () => {
  const parsed = parseTemplateProcessingRequestedPayload({
    templateId: 't-1',
    clientId: 'c-1',
    sourceZipStorageBucket: 'bucket',
    sourceZipStorageKey: 'key',
  })

  assert.deepEqual(parsed, {
    templateId: 't-1',
    clientId: 'c-1',
    sourceZipStorageBucket: 'bucket',
    sourceZipStorageKey: 'key',
  })
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, 'template/processing.requested')
})

test('status contract stays bounded to runtime states', () => {
  assert.equal(isTemplateRuntimeStatus('processing'), true)
  assert.equal(isTemplateRuntimeStatus('ready'), true)
  assert.equal(isTemplateRuntimeStatus('invalid'), false)
})

test('contracts package remains pure and framework-free', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'packages/gnr8-runtime-contracts/src/index.ts'), 'utf8')
  assert.equal(/from ['\"]next\//.test(source), false)
  assert.equal(/from ['\"]react/.test(source), false)
})
