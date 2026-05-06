import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { NextResponse } from 'next/server'

import {
  deleteClientTemplateById,
  getClientTemplateById,
  markClientTemplateProcessingAttemptStarted,
  updateClientTemplateMetadata,
} from '@/gnr8/template-intake/core/template-intake-query-service'
import { deleteTemplateSourceZip } from '@/gnr8/template-intake/storage/template-source-zip-storage'
import {
  mapTemplateToDetailCard,
  normalizeTemplateMetadataPatchPayload,
} from '@/gnr8/template-intake/core/template-management-contract'
import { triggerTemplateProcessingJob } from '@/gnr8/template-intake/routes/template-processing-trigger'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

type Params = {
  clientId: string
  templateId: string
}

type TemplateCleanupResult = {
  status: 'performed' | 'not_performed' | 'failed'
  path: string | null
  reason: string | null
  error: string | null
}

type TemplateDetailRouteDeps = {
  requireScope: typeof requireClientTemplateScope
  getTemplateById: typeof getClientTemplateById
  updateTemplateMetadata: typeof updateClientTemplateMetadata
  deleteTemplateById: typeof deleteClientTemplateById
  markTemplateProcessingAttemptStarted: typeof markClientTemplateProcessingAttemptStarted
  triggerTemplateProcessing: typeof triggerTemplateProcessingJob
  parseStorageError: typeof parseTemplateRepositoryError
  parseScopeError: typeof parseThrownScopeError
  cleanupTemplateArtifacts: typeof cleanupTemplateArtifacts
}

const DEFAULT_DEPS: TemplateDetailRouteDeps = {
  requireScope: requireClientTemplateScope,
  getTemplateById: getClientTemplateById,
  updateTemplateMetadata: updateClientTemplateMetadata,
  deleteTemplateById: deleteClientTemplateById,
  markTemplateProcessingAttemptStarted: markClientTemplateProcessingAttemptStarted,
  triggerTemplateProcessing: triggerTemplateProcessingJob,
  parseStorageError: parseTemplateRepositoryError,
  parseScopeError: parseThrownScopeError,
  cleanupTemplateArtifacts,
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toNotFoundResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: 'TEMPLATE_NOT_FOUND',
      error: 'Template was not found for the current client scope.',
    },
    { status: 404 },
  )
}

function toInvalidPayloadResponse(error: string) {
  return NextResponse.json(
    {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error,
    },
    { status: 400 },
  )
}

async function mapThrownErrorToResponse(error: unknown, deps: TemplateDetailRouteDeps) {
  const storageError = deps.parseStorageError(error)
  if (storageError) {
    return NextResponse.json(
      { ok: false, code: storageError.code, error: storageError.message },
      { status: storageError.status },
    )
  }

  const mapped = deps.parseScopeError(error)
  if (mapped.status === 401 || mapped.status === 403) {
    return NextResponse.json(
      {
        ok: false,
        code: 'TEMPLATE_UNAUTHORIZED',
        error: mapped.message,
      },
      { status: mapped.status },
    )
  }

  return NextResponse.json(
    {
      ok: false,
      code: 'TEMPLATE_SCOPE_ERROR',
      error: mapped.message,
    },
    { status: mapped.status },
  )
}

export async function cleanupTemplateArtifacts(input: {
  importSnapshotId: string | null
  sourceZipStorageBucket: string | null
  sourceZipStorageKey: string | null
}): Promise<TemplateCleanupResult> {
  const importSnapshotId = normalizeText(input.importSnapshotId)
  if (!importSnapshotId) {
    return {
      status: 'not_performed',
      path: null,
      reason: 'missing_snapshot_id',
      error: null,
    }
  }

  if (!/^template-zip-[a-z0-9]{16}$/i.test(importSnapshotId)) {
    return {
      status: 'not_performed',
      path: null,
      reason: 'snapshot_not_template_zip',
      error: null,
    }
  }

  const artifactPath = path.resolve(os.tmpdir(), 'gnr8', 'template-intake', importSnapshotId)
  try {
    await fs.rm(artifactPath, { recursive: true, force: true })
    const sourceZipStorageBucket = normalizeText(input.sourceZipStorageBucket)
    const sourceZipStorageKey = normalizeText(input.sourceZipStorageKey)
    if (sourceZipStorageBucket && sourceZipStorageKey) {
      await deleteTemplateSourceZip({
        bucket: sourceZipStorageBucket,
        key: sourceZipStorageKey,
      })
    }
    return {
      status: 'performed',
      path: artifactPath,
      reason: null,
      error: null,
    }
  } catch (error) {
    return {
      status: 'failed',
      path: artifactPath,
      reason: 'artifact_cleanup_failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function createTemplateDetailRouteHandlers(deps: TemplateDetailRouteDeps = DEFAULT_DEPS) {
  return {
    GET: async (_request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam, templateId } = await ctx.params
        const scope = await deps.requireScope({
          clientIdParam,
        })

        const template = await deps.getTemplateById({
          clientId: scope.clientId,
          templateId,
        })

        if (!template) return toNotFoundResponse()

        return NextResponse.json(
          {
            ok: true,
            template: mapTemplateToDetailCard(template),
          },
          { status: 200 },
        )
      } catch (error) {
        return mapThrownErrorToResponse(error, deps)
      }
    },

    PATCH: async (request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam, templateId } = await ctx.params
        const scope = await deps.requireScope({
          clientIdParam,
        })

        const payload = await request.json().catch(() => null)
        const normalized = normalizeTemplateMetadataPatchPayload(payload)
        if (!normalized.ok) {
          return toInvalidPayloadResponse(normalized.error)
        }

        const updatedTemplate = await deps.updateTemplateMetadata({
          clientId: scope.clientId,
          templateId,
          name: normalized.value.name,
          tags: normalized.value.tags,
        })

        if (!updatedTemplate) return toNotFoundResponse()

        return NextResponse.json(
          {
            ok: true,
            template: mapTemplateToDetailCard(updatedTemplate),
          },
          { status: 200 },
        )
      } catch (error) {
        return mapThrownErrorToResponse(error, deps)
      }
    },

    DELETE: async (_request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam, templateId } = await ctx.params
        const scope = await deps.requireScope({
          clientIdParam,
        })

        const deletedTemplate = await deps.deleteTemplateById({
          clientId: scope.clientId,
          templateId,
        })

        if (!deletedTemplate) return toNotFoundResponse()

        const cleanup = await deps.cleanupTemplateArtifacts({
          importSnapshotId: deletedTemplate.importSnapshotId,
          sourceZipStorageBucket: deletedTemplate.sourceZipStorageBucket,
          sourceZipStorageKey: deletedTemplate.sourceZipStorageKey,
        })

        if (cleanup.status !== 'performed') {
          console.info('[template-delete] artifact cleanup not fully performed', {
            clientId: scope.clientId,
            templateId,
            cleanup,
          })
        }

        return NextResponse.json(
          {
            ok: true,
            templateId: deletedTemplate.id,
            cleanup,
          },
          { status: 200 },
        )
      } catch (error) {
        return mapThrownErrorToResponse(error, deps)
      }
    },

    POST: async (_request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam, templateId } = await ctx.params
        const scope = await deps.requireScope({
          clientIdParam,
        })
        const template = await deps.getTemplateById({ clientId: scope.clientId, templateId })
        if (!template) return toNotFoundResponse()
        if (template.status !== 'failed') {
          return NextResponse.json({ ok: false, code: 'TEMPLATE_RETRY_NOT_ALLOWED', error: 'Retry is allowed only for failed templates.' }, { status: 409 })
        }
        const bucket = normalizeText(template.sourceZipStorageBucket)
        const key = normalizeText(template.sourceZipStorageKey)
        if (!bucket || !key) {
          return NextResponse.json(
            { ok: false, code: 'TEMPLATE_RETRY_NOT_ALLOWED', error: 'Retry requires original template ZIP source.' },
            { status: 409 },
          )
        }
        const updated = await deps.markTemplateProcessingAttemptStarted({ clientId: scope.clientId, templateId })
        if (!updated) return toNotFoundResponse()
        const triggered = await deps.triggerTemplateProcessing({
          clientId: scope.clientId,
          templateId,
          sourceZipStorageBucket: bucket,
          sourceZipStorageKey: key,
        })
        if (!triggered) {
          return NextResponse.json(
            { ok: false, code: 'TEMPLATE_RETRY_TRIGGER_FAILED', error: 'Retry was staged but processing enqueue failed.' },
            { status: 202 },
          )
        }
        return NextResponse.json({ ok: true, template: mapTemplateToDetailCard(updated) }, { status: 200 })
      } catch (error) {
        return mapThrownErrorToResponse(error, deps)
      }
    },
  }
}
