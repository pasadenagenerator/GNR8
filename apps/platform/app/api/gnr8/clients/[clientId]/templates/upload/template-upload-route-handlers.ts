import { NextResponse } from 'next/server'

import { runTemplateZipIntake } from '@/gnr8/template-intake/core/template-intake-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

type Params = {
  clientId: string
}

type TemplateUploadRouteDeps = {
  requireScope: typeof requireClientTemplateScope
  runTemplateZipIntake: typeof runTemplateZipIntake
  parseTemplateRepositoryError: typeof parseTemplateRepositoryError
  parseThrownScopeError: typeof parseThrownScopeError
}

const DEFAULT_DEPS: TemplateUploadRouteDeps = {
  requireScope: requireClientTemplateScope,
  runTemplateZipIntake,
  parseTemplateRepositoryError,
  parseThrownScopeError,
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
          clientIdParam,
        })

        const formData = await request.formData()
        const fileValue = formData.get('file')
        if (!(fileValue instanceof File)) {
          return NextResponse.json({ ok: false, error: 'ZIP file is required.' }, { status: 400 })
        }

        const bytes = new Uint8Array(await fileValue.arrayBuffer())
        const intake = await resolved.runTemplateZipIntake({
          actorUserId: scope.userId,
          clientId: scope.clientId,
          organizationId: scope.organizationId,
          agencyId: scope.agencyId,
          uploadedZip: {
            fileName: fileValue.name,
            bytes,
          },
        })

        if (!intake.ok) {
          return NextResponse.json(
            {
              ok: false,
              id: intake.templateId,
              templateId: intake.templateId,
              status: intake.status,
              health: intake.importHealth,
              importHealth: intake.importHealth,
              error: intake.errorMessage,
              diagnosticsSummary: intake.diagnosticsSummary,
            },
            { status: 400 },
          )
        }

        return NextResponse.json(
          {
            ok: true,
            id: intake.template.id,
            templateId: intake.template.id,
            sourceType: intake.template.sourceType,
            status: intake.template.status,
            health: intake.template.importHealth,
            name: intake.template.name,
            tags: intake.template.tags,
            importHealth: intake.template.importHealth,
            entryHtmlFileName: intake.template.entryHtmlFileName,
            templateType: intake.template.templateType,
            preview: {
              available: intake.template.previewAvailable,
              isFallback: intake.template.previewIsFallback,
              source: intake.template.previewSource,
              imagePath: intake.template.previewImagePath,
              entryHtmlFileName: intake.template.entryHtmlFileName,
              templateType: intake.template.templateType,
            },
            diagnosticsSummary: intake.template.diagnosticsSummary,
          },
          { status: 200 },
        )
      } catch (error) {
        const storageError = resolved.parseTemplateRepositoryError(error)
        if (storageError) {
          return NextResponse.json(
            { ok: false, code: storageError.code, error: storageError.message },
            { status: storageError.status },
          )
        }

        const mapped = resolved.parseThrownScopeError(error)
        return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
      }
    },
  }
}
