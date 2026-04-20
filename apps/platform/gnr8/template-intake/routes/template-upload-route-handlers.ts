import {
  createProcessingTemplateFromZipUpload,
  validateTemplateZipUploadInput,
} from '@/gnr8/template-intake/core/template-upload-light-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'
import { triggerTemplateProcessingJob } from '@/gnr8/template-intake/routes/template-processing-trigger'
import { parseThrownScopeError, requireClientTemplateScopeForUpload } from '@/gnr8/template-intake/routes/template-upload-scope'

type Params = {
  clientId: string
}

type TemplateUploadRouteDeps = {
  requireScope: typeof requireClientTemplateScopeForUpload
  createProcessingTemplateFromZipUpload: typeof createProcessingTemplateFromZipUpload
  validateTemplateZipUploadInput: typeof validateTemplateZipUploadInput
  triggerTemplateProcessingJob: typeof triggerTemplateProcessingJob
  parseTemplateRepositoryError: typeof parseTemplateRepositoryError
  parseThrownScopeError: typeof parseThrownScopeError
}

const DEFAULT_DEPS: TemplateUploadRouteDeps = {
  requireScope: requireClientTemplateScopeForUpload,
  createProcessingTemplateFromZipUpload,
  validateTemplateZipUploadInput,
  triggerTemplateProcessingJob,
  parseTemplateRepositoryError,
  parseThrownScopeError,
}

function logTemplateUploadRouteEvent(input: {
  event: 'TEMPLATE_UPLOAD_REQUEST_RECEIVED' | 'TEMPLATE_UPLOAD_RESPONSE_SENT'
  templateId: string | null
  status: 'uploaded' | 'processing' | 'ready' | 'failed' | null
  importHealth: 'clean' | 'degraded' | 'failed' | null
  previewSource: 'rendered_capture' | 'html_snapshot' | 'fallback' | null
  previewAvailable: boolean | null
  uploadResponseOk: boolean
}) {
  console.info(`[template-upload] ${input.event}`, {
    templateId: input.templateId,
    status: input.status,
    importHealth: input.importHealth,
    previewSource: input.previewSource,
    previewAvailable: input.previewAvailable,
    uploadResponseOk: input.uploadResponseOk,
  })
}

export function createTemplateUploadRouteHandlers(deps: Partial<TemplateUploadRouteDeps> = {}) {
  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  }

  return {
    async POST(request: Request, ctx: { params: Promise<Params> }) {
      try {
        const { clientId: clientIdParam } = await ctx.params
        const scope = await resolved.requireScope({
          request,
          clientIdParam,
        })

        const formData = await request.formData()
        const fileValue = formData.get('file')
        if (!(fileValue instanceof File)) {
          logTemplateUploadRouteEvent({
            event: 'TEMPLATE_UPLOAD_RESPONSE_SENT',
            templateId: null,
            status: null,
            importHealth: null,
            previewSource: null,
            previewAvailable: null,
            uploadResponseOk: false,
          })
          return Response.json({ ok: false, error: 'ZIP file is required.' }, { status: 400 })
        }

        logTemplateUploadRouteEvent({
          event: 'TEMPLATE_UPLOAD_REQUEST_RECEIVED',
          templateId: null,
          status: null,
          importHealth: null,
          previewSource: null,
          previewAvailable: null,
          uploadResponseOk: false,
        })

        const bytes = new Uint8Array(await fileValue.arrayBuffer())
        const validation = resolved.validateTemplateZipUploadInput({
          fileName: fileValue.name,
          contentType: fileValue.type,
          bytes,
        })
        if (!validation.ok) {
          logTemplateUploadRouteEvent({
            event: 'TEMPLATE_UPLOAD_RESPONSE_SENT',
            templateId: null,
            status: null,
            importHealth: null,
            previewSource: null,
            previewAvailable: null,
            uploadResponseOk: false,
          })
          return Response.json(
            {
              ok: false,
              error: validation.error,
            },
            { status: validation.status },
          )
        }

        const template = await resolved.createProcessingTemplateFromZipUpload({
          actorUserId: scope.userId,
          clientId: scope.clientId,
          organizationId: scope.organizationId,
          agencyId: scope.agencyId,
          fileName: fileValue.name,
          bytes,
        })

        if (template.status === 'processing') {
          resolved.triggerTemplateProcessingJob({
            request,
            clientId: scope.clientId,
            templateId: template.id,
          })
        }

        const uploadOk = template.status !== 'failed'
        logTemplateUploadRouteEvent({
          event: 'TEMPLATE_UPLOAD_RESPONSE_SENT',
          templateId: template.id,
          status: template.status,
          importHealth: template.importHealth,
          previewSource: template.previewSource,
          previewAvailable: template.previewAvailable,
          uploadResponseOk: uploadOk,
        })

        if (!uploadOk) {
          return Response.json(
            {
              ok: false,
              id: template.id,
              templateId: template.id,
              sourceType: template.sourceType,
              status: template.status,
              health: template.importHealth,
              importHealth: template.importHealth,
              error: 'Template upload was saved but processing could not start.',
              diagnosticsSummary: template.diagnosticsSummary,
            },
            { status: 500 },
          )
        }

        return Response.json(
          {
            ok: true,
            id: template.id,
            templateId: template.id,
            sourceType: template.sourceType,
            status: template.status,
            health: template.importHealth,
            name: template.name,
            tags: template.tags,
            importHealth: template.importHealth,
            entryHtmlFileName: template.entryHtmlFileName,
            templateType: template.templateType,
            preview: {
              available: template.previewAvailable,
              isFallback: template.previewIsFallback,
              source: template.previewSource,
              imagePath: template.previewImagePath,
              entryHtmlFileName: template.entryHtmlFileName,
              templateType: template.templateType,
            },
            diagnosticsSummary: template.diagnosticsSummary,
          },
          { status: 200 },
        )
      } catch (error) {
        const storageError = resolved.parseTemplateRepositoryError(error)
        if (storageError) {
          logTemplateUploadRouteEvent({
            event: 'TEMPLATE_UPLOAD_RESPONSE_SENT',
            templateId: null,
            status: null,
            importHealth: null,
            previewSource: null,
            previewAvailable: null,
            uploadResponseOk: false,
          })
          return Response.json(
            { ok: false, code: storageError.code, error: storageError.message },
            { status: storageError.status },
          )
        }

        const mapped = resolved.parseThrownScopeError(error)
        logTemplateUploadRouteEvent({
          event: 'TEMPLATE_UPLOAD_RESPONSE_SENT',
          templateId: null,
          status: null,
          importHealth: null,
          previewSource: null,
          previewAvailable: null,
          uploadResponseOk: false,
        })
        return Response.json({ ok: false, error: mapped.message }, { status: mapped.status })
      }
    },
  }
}
