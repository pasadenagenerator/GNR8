import assert from 'node:assert/strict'
import test from 'node:test'

import { getSuperadminPool } from '@/src/superadmin/db'

test('getSuperadminPool reuses singleton pool instance', () => {
  const previous = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/gnr8_test'
  try {
    const first = getSuperadminPool()
    const second = getSuperadminPool()
    assert.equal(first, second)
  } finally {
    process.env.DATABASE_URL = previous
  }
})
