import { NextResponse } from 'next/server'

import {
  bootstrapRuntimeFromTemplateSite,
  parseTemplateSiteRuntimeBootstrapError,
} from '@/gnr8/site/site-template-runtime-bootstrap-service'
import type { ImportManifest } from '@/gnr8/import/import-manifest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SitePayload = {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
  name: string
  domain: string
  status: string
  createdAt: string
  updatedAt: string
}

type TemplatePayload = {
  id: string
  sourceFilename: string
  sourceZipStorageBucket: string | null
  sourceZipStorageKey: string | null
  importSnapshotId: string | null
  durableSnapshotRootDirAbs: string | null
  entryHtmlPath: string | null
  entryHtmlFileName: string | null
  importManifestSummary: ImportManifest | null
}

function isSitePayload(value: unknown): value is SitePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.siteId === 'string' &&
    typeof record.clientId === 'string' &&
    typeof record.agencyId === 'string' &&
    typeof record.templateId === 'string' &&
    typeof record.name === 'string' &&
    typeof record.domain === 'string' &&
    typeof record.status === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  )
}

function isTemplatePayload(value: unknown): value is TemplatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.sourceFilename === 'string' &&
    ('sourceZipStorageBucket' in record) &&
    ('sourceZipStorageKey' in record) &&
    ('importSnapshotId' in record) &&
    ('durableSnapshotRootDirAbs' in record) &&
    ('entryHtmlPath' in record) &&
    ('entryHtmlFileName' in record) &&
    ('importManifestSummary' in record)
  )
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        site?: unknown
        template?: unknown
      }
    | null

  if (!isSitePayload(payload?.site) || !isTemplatePayload(payload?.template)) {
    return NextResponse.json(
      {
        ok: false,
        code: 'TEMPLATE_SITE_BOOTSTRAP_INVALID_PAYLOAD',
        error: 'Invalid bootstrap payload.',
      },
      { status: 400 },
    )
  }

  try {
    const result = await bootstrapRuntimeFromTemplateSite({
      site: payload.site,
      template: payload.template,
    })
    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    )
  } catch (error) {
    const mapped = parseTemplateSiteRuntimeBootstrapError(error)
    if (mapped) {
      return NextResponse.json(
        {
          ok: false,
          code: mapped.code,
          error: mapped.message,
          siteId: mapped.siteId,
          templateId: mapped.templateId,
        },
        { status: mapped.status },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        code: 'TEMPLATE_SITE_BOOTSTRAP_FAILED',
        error: error instanceof Error ? error.message : 'Template runtime bootstrap failed.',
      },
      { status: 500 },
    )
  }
}
