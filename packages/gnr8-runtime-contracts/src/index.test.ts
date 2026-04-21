import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_MAX_ATTEMPTS,
  TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES,
  validateTemplateProcessingEventName,
} from './index'

test('template processing runtime contract constants remain stable', () => {
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, 'template/processing.requested')
  assert.equal(TEMPLATE_PROCESSING_MAX_ATTEMPTS, 3)
  assert.equal(TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES, 10)
})

test('template processing event validation catches mismatches deterministically', () => {
  const logs: Array<{ message: string; context: Record<string, unknown> }> = []
  const logger = (message: string, context: Record<string, unknown>) => {
    logs.push({ message, context })
  }

  const valid = validateTemplateProcessingEventName({
    source: 'runtime-contracts:test',
    eventName: TEMPLATE_PROCESSING_REQUESTED_EVENT,
    logger,
  })
  const invalid = validateTemplateProcessingEventName({
    source: 'runtime-contracts:test',
    eventName: 'template.processing.requested',
    logger,
  })

  assert.equal(valid, true)
  assert.equal(invalid, false)
  assert.equal(logs.length, 1)
  assert.equal(logs[0]?.message, 'TEMPLATE_PROCESSING_EVENT_NAME_MISMATCH')
  assert.deepEqual(logs[0]?.context, {
    source: 'runtime-contracts:test',
    expectedEventName: CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
    eventName: 'template.processing.requested',
  })
})

test('contracts package remains pure and framework-free', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'packages/gnr8-runtime-contracts/src/index.ts'), 'utf8')
  assert.equal(/from ['\"]next\//.test(source), false)
  assert.equal(/from ['\"]react/.test(source), false)
  assert.equal(/function\s+\w+\s*\(/.test(source), false)
})
