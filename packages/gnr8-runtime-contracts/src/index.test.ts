import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_MAX_ATTEMPTS,
  TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES,
} from './index'

test('template processing runtime contract constants remain stable', () => {
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, 'template/processing.requested')
  assert.equal(TEMPLATE_PROCESSING_MAX_ATTEMPTS, 3)
  assert.equal(TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES, 10)
})

test('contracts package remains pure and framework-free', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'packages/gnr8-runtime-contracts/src/index.ts'), 'utf8')
  assert.equal(/from ['\"]next\//.test(source), false)
  assert.equal(/from ['\"]react/.test(source), false)
  assert.equal(/function\s+\w+\s*\(/.test(source), false)
})
