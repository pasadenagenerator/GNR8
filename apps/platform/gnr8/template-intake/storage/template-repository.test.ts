import assert from 'node:assert/strict'
import test from 'node:test'

import { parseTemplateRepositoryError, TemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'

test('parseTemplateRepositoryError maps missing gnr8_templates relation to deterministic error', () => {
  const mapped = parseTemplateRepositoryError({
    code: '42P01',
    message: 'relation "public.gnr8_templates" does not exist',
  })

  assert.deepEqual(mapped, {
    status: 500,
    code: 'TEMPLATE_TABLE_NOT_FOUND',
    message: 'Template storage is not provisioned. Run DB migrations and retry.',
  })
})

test('parseTemplateRepositoryError maps explicit TemplateRepositoryError instances', () => {
  const mapped = parseTemplateRepositoryError(
    new TemplateRepositoryError('TEMPLATE_REPOSITORY_FAILURE', 'Template storage request failed.'),
  )

  assert.deepEqual(mapped, {
    status: 500,
    code: 'TEMPLATE_REPOSITORY_FAILURE',
    message: 'Template storage request failed.',
  })
})

