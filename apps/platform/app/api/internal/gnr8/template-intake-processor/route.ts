import { NextResponse } from 'next/server'

import { processTemplateZipIntakeJob } from '@/gnr8/template-intake/core/template-processing-job-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function workerAuthorized(req: Request): boolean {
  const expected = normalizeText(process.env.GNR8_TEMPLATE_PROCESSOR_SHARED_TOKEN)
  if (!expected) return true
  const provided = normalizeText(req.headers.get('x-gnr8-template-processor-token'))
  return provided.length > 0 && provided === expected
}

function parsePayload(value: unknown): { clientId: string; templateId: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const clientId = normalizeText(record.clientId)
  const templateId = normalizeText(record.templateId)
  if (!clientId || !templateId) return null
  return { clientId, templateId }
}

export async function POST(req: Request) {
  if (!workerAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'UNAUTHORIZED_TEMPLATE_PROCESSOR_REQUEST',
          message: 'Template processor authorization failed.',
        },
      },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => null)
  const payload = parsePayload(body)
  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_TEMPLATE_PROCESSOR_PAYLOAD',
          message: 'Payload must include clientId and templateId.',
        },
      },
      { status: 400 },
    )
  }

  const result = await processTemplateZipIntakeJob(payload)
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        templateId: payload.templateId,
        status: result.template?.status ?? null,
        importHealth: result.template?.importHealth ?? null,
        error: result.error,
      },
      { status: 200 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      templateId: result.template.id,
      status: result.template.status,
      importHealth: result.template.importHealth,
    },
    { status: 200 },
  )
}
