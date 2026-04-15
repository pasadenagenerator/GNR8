import { NextResponse } from 'next/server'

import { runTemplateZipIntake } from '@/gnr8/template-intake/core/template-intake-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = {
  clientId: string
}

export async function POST(request: Request, ctx: { params: Promise<Params> }) {
  try {
    const { clientId: clientIdParam } = await ctx.params
    const scope = await requireClientTemplateScope({
      clientIdParam,
    })

    const formData = await request.formData()
    const fileValue = formData.get('file')
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ ok: false, error: 'ZIP file is required.' }, { status: 400 })
    }

    const bytes = new Uint8Array(await fileValue.arrayBuffer())
    const intake = await runTemplateZipIntake({
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
          templateId: intake.templateId,
          status: intake.status,
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
        templateId: intake.template.id,
        status: intake.template.status,
        name: intake.template.name,
        tags: intake.template.tags,
        importHealth: intake.template.importHealth,
        preview: {
          available: intake.template.previewAvailable,
          isFallback: intake.template.previewIsFallback,
          source: intake.template.previewSource,
          imagePath: intake.template.previewImagePath,
        },
        diagnosticsSummary: intake.template.diagnosticsSummary,
      },
      { status: 200 },
    )
  } catch (error) {
    const storageError = parseTemplateRepositoryError(error)
    if (storageError) {
      return NextResponse.json(
        { ok: false, code: storageError.code, error: storageError.message },
        { status: storageError.status },
      )
    }

    const mapped = parseThrownScopeError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
