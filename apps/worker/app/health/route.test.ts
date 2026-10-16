import assert from 'node:assert/strict'
import test from 'node:test'

import { hasGnr8StagingPreviewConfiguration } from './route'

function jwt(ref: string, role: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ref, role })}.signature`
}

function stagingEnvironment(): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://dpkdxllcxnlytgjbnmvp.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('dpkdxllcxnlytgjbnmvp', 'anon'),
    SUPABASE_SERVICE_ROLE_KEY: jwt('dpkdxllcxnlytgjbnmvp', 'service_role'),
    DATABASE_URL: 'postgresql://postgres.dpkdxllcxnlytgjbnmvp:password@aws-1-eu-central-2.pooler.supabase.com:5432/postgres',
  }
}

test('accepts the complete GNR8-STAGING Preview target', () => {
  assert.equal(hasGnr8StagingPreviewConfiguration(stagingEnvironment()), true)
})

test('rejects a database connection for another Supabase project', () => {
  assert.equal(hasGnr8StagingPreviewConfiguration({
    ...stagingEnvironment(),
    DATABASE_URL: 'postgresql://postgres.other:password@aws-1-eu-central-2.pooler.supabase.com:5432/postgres',
  }), false)
})

test('rejects mismatched Supabase JWT provenance', () => {
  assert.equal(hasGnr8StagingPreviewConfiguration({
    ...stagingEnvironment(),
    SUPABASE_SERVICE_ROLE_KEY: jwt('other', 'service_role'),
  }), false)
})
