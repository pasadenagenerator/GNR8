import assert from 'node:assert/strict'
import test from 'node:test'

import { hasMultiPageImportOperatorSignal } from '@/gnr8/site/site-multipage-operator-signal'

test('Multi-Page Import block appears when evidence exists', () => {
  assert.equal(hasMultiPageImportOperatorSignal({ discoveredRoutes: 1 }), true)
  assert.equal(hasMultiPageImportOperatorSignal({ fetchedPages: 1 }), true)
  assert.equal(hasMultiPageImportOperatorSignal({ assembledPages: 1 }), true)
  assert.equal(hasMultiPageImportOperatorSignal({ routeCount: 1 }), true)
})

test('Multi-Page Import block stays hidden without evidence', () => {
  assert.equal(hasMultiPageImportOperatorSignal({}), false)
  assert.equal(hasMultiPageImportOperatorSignal({ discoveredRoutes: 0, fetchedPages: 0, assembledPages: 0, routeCount: 0 }), false)
})
