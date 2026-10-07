import assert from 'node:assert/strict'
import test from 'node:test'

import { createBoundedPageReadFetch } from './supabase-page-read-fetch'

test('retries one transient GET response and returns the successful response', async () => {
  const calls: string[] = []
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls.push(String(init?.method ?? 'GET'))
    return calls.length === 1
      ? new Response('gateway timeout', { status: 504 })
      : new Response('ok', { status: 200 })
  }
  const pageReadFetch = createBoundedPageReadFetch({ fetchImpl, timeoutMs: 50, attempts: 2 })

  const response = await pageReadFetch('https://example.test/rest/v1/sites', { method: 'GET' })

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'ok')
  assert.deepEqual(calls, ['GET', 'GET'])
})

test('retries a timed-out GET request within the configured bound', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1
    if (calls === 1) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      })
    }
    return new Response('ok', { status: 200 })
  }
  const pageReadFetch = createBoundedPageReadFetch({ fetchImpl, timeoutMs: 5, attempts: 2 })

  const response = await pageReadFetch('https://example.test/rest/v1/sites')

  assert.equal(response.status, 200)
  assert.equal(calls, 2)
})

test('does not retry a non-idempotent request', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async () => {
    calls += 1
    return new Response('gateway timeout', { status: 504 })
  }
  const pageReadFetch = createBoundedPageReadFetch({ fetchImpl, timeoutMs: 50, attempts: 2 })

  const response = await pageReadFetch('https://example.test/rest/v1/sites', { method: 'POST' })

  assert.equal(response.status, 504)
  assert.equal(calls, 1)
})

test('honors a caller abort without retrying', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })
  }
  const pageReadFetch = createBoundedPageReadFetch({ fetchImpl, timeoutMs: 100, attempts: 2 })
  const controller = new AbortController()
  const request = pageReadFetch('https://example.test/rest/v1/sites', { signal: controller.signal })
  controller.abort(new DOMException('caller stopped', 'AbortError'))

  await assert.rejects(request, /caller stopped/)
  assert.equal(calls, 1)
})

