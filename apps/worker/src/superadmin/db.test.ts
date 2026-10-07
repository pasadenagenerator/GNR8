import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSuperadminPoolConfig,
  SUPERADMIN_DB_CONNECTION_TIMEOUT_MS,
} from './db'

test('keeps the worker database connection attempt bounded while allowing a cold Preview pooler start', () => {
  const connectionString = 'postgresql://postgres.example:secret@pooler.example.test:5432/postgres'
  const config = createSuperadminPoolConfig(connectionString)

  assert.equal(config.connectionString, connectionString)
  assert.equal(config.connectionTimeoutMillis, 15_000)
  assert.equal(config.connectionTimeoutMillis, SUPERADMIN_DB_CONNECTION_TIMEOUT_MS)
  assert.equal(config.max, 5)
  assert.equal(config.idleTimeoutMillis, 30_000)
})
