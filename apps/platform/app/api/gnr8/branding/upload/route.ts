import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

type TargetType = 'agency' | 'client'

type RemoveBody = {
  agencyId?: unknown
  targetType?: unknown
  clientId?: unknown
}

type OrganizationBrandRow = {
  id: string | null
  agency_id: string | null
}

const BRANDING_BUCKET = 'branding'
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'] as const
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg'] as const

let ensureBucketPromise: Promise<void> | null = null

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeTargetType(value: unknown): TargetType | null {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'agency' || normalized === 'client') return normalized
  return null
}

function isAllowedMimeType(value: string): boolean {
  return ALLOWED_MIME_TYPES.includes(value as (typeof ALLOWED_MIME_TYPES)[number])
}

function extractExtension(fileName: string): string {
  const normalized = normalizeText(fileName).toLowerCase()
  const parts = normalized.split('.')
  return parts.length > 1 ? normalizeText(parts[parts.length - 1]) : ''
}

function resolveUploadContentType(file: File): string | null {
  const normalizedType = normalizeText(file.type).toLowerCase()
  if (isAllowedMimeType(normalizedType)) return normalizedType

  const extension = extractExtension(file.name)
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'svg') return 'image/svg+xml'
  return null
}

function isBucketMissingError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('not found') || normalized.includes('does not exist')
}

function isBucketExistsError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('already exists') || normalized.includes('duplicate')
}

async function ensureBrandingBucket() {
  if (ensureBucketPromise) {
    await ensureBucketPromise
    return
  }

  ensureBucketPromise = (async () => {
    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for logo uploads.')
    }

    const bucketResult = await supabase.storage.getBucket(BRANDING_BUCKET)
    if (bucketResult.error) {
      if (!isBucketMissingError(bucketResult.error.message)) {
        throw new Error(bucketResult.error.message)
      }

      const createResult = await supabase.storage.createBucket(BRANDING_BUCKET, {
        public: true,
        fileSizeLimit: String(MAX_LOGO_BYTES),
        allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      })

      if (createResult.error && !isBucketExistsError(createResult.error.message)) {
        throw new Error(createResult.error.message)
      }

      return
    }

    if (bucketResult.data && bucketResult.data.public === false) {
      const updateResult = await supabase.storage.updateBucket(BRANDING_BUCKET, {
        public: true,
        fileSizeLimit: String(MAX_LOGO_BYTES),
        allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      })
      if (updateResult.error) {
        throw new Error(updateResult.error.message)
      }
    }
  })().catch((error) => {
    ensureBucketPromise = null
    throw error
  })

  await ensureBucketPromise
}

async function resolveScopedOrganization(input: {
  targetType: TargetType
  agencyId: string
  clientId?: string
}): Promise<OrganizationBrandRow> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for logo uploads.')
  }

  if (input.targetType === 'agency') {
    const agencyOrgResult = await supabase
      .from('organizations')
      .select('id,agency_id')
      .eq('agency_id', input.agencyId)
      .eq('organization_type', 'agency')
      .limit(1)
      .maybeSingle()

    if (agencyOrgResult.error) {
      throw new Error(agencyOrgResult.error.message)
    }
    if (!agencyOrgResult.data?.id) {
      throw new Error('Agency organization scope is invalid for branding update.')
    }

    return agencyOrgResult.data as OrganizationBrandRow
  }

  const clientId = normalizeText(input.clientId)
  if (!clientId) {
    throw new Error('Client scope is required for client logo upload.')
  }

  const clientOrgResult = await supabase
    .from('organizations')
    .select('id,agency_id')
    .eq('id', clientId)
    .eq('agency_id', input.agencyId)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (clientOrgResult.error) {
    throw new Error(clientOrgResult.error.message)
  }
  if (!clientOrgResult.data?.id) {
    throw new Error('Client scope is invalid for this agency context.')
  }

  return clientOrgResult.data as OrganizationBrandRow
}

function mapStoragePath(input: { targetType: TargetType; agencyId: string; clientId?: string }): string {
  if (input.targetType === 'agency') {
    return `agency/${input.agencyId}/logo`
  }

  const clientId = normalizeText(input.clientId)
  return `client/${clientId}/logo`
}

function normalizeLogoUrl(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (normalized.startsWith('/')) return normalized

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return normalized
    }
  } catch {
    return null
  }

  return null
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const requestedAgencyId = normalizeText(formData.get('agencyId'))
    const targetType = normalizeTargetType(formData.get('targetType'))
    const clientId = normalizeText(formData.get('clientId'))
    const fileValue = formData.get('file')

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }
    if (!targetType) {
      return NextResponse.json({ ok: false, error: 'Branding target type must be agency or client.' }, { status: 400 })
    }
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Logo file is required.' }, { status: 400 })
    }
    if (fileValue.size <= 0) {
      return NextResponse.json({ ok: false, error: 'Uploaded logo file is empty.' }, { status: 400 })
    }
    if (fileValue.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ ok: false, error: 'Logo file must be 2 MB or smaller.' }, { status: 400 })
    }

    const contentType = resolveUploadContentType(fileValue)
    if (!contentType) {
      return NextResponse.json(
        {
          ok: false,
          error: `Only ${ALLOWED_EXTENSIONS.join(', ')} logo files are allowed.`,
        },
        { status: 400 },
      )
    }

    const actionContext = await requireAgencyActionContext({
      action: targetType === 'agency' ? 'edit_agency_settings' : 'edit_client_settings',
      requestedAgencyId,
    })

    if (actionContext.role !== 'owner' && actionContext.role !== 'admin' && actionContext.role !== 'superadmin') {
      return NextResponse.json({ ok: false, error: 'Only owner/admin can manage branding logos.' }, { status: 403 })
    }

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for branding update.' }, { status: 403 })
    }

    if (targetType === 'client' && !clientId) {
      return NextResponse.json({ ok: false, error: 'Client scope is required for client branding.' }, { status: 400 })
    }

    await ensureBrandingBucket()

    const scopedOrganization = await resolveScopedOrganization({
      targetType,
      agencyId: actionContext.agencyId,
      clientId,
    })

    const storagePath = mapStoragePath({
      targetType,
      agencyId: actionContext.agencyId,
      clientId,
    })

    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for logo uploads.' },
        { status: 500 },
      )
    }

    const uploadResult = await supabase.storage.from(BRANDING_BUCKET).upload(storagePath, fileValue, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    })

    if (uploadResult.error) {
      return NextResponse.json({ ok: false, error: uploadResult.error.message }, { status: 400 })
    }

    const publicUrlResult = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(storagePath)
    const basePublicUrl = normalizeLogoUrl(publicUrlResult.data.publicUrl)
    if (!basePublicUrl) {
      return NextResponse.json({ ok: false, error: 'Failed to resolve uploaded logo URL.' }, { status: 500 })
    }
    const logoUrl = `${basePublicUrl}?v=${Date.now()}`

    const persistResult = await supabase
      .from('organizations')
      .update({
        brand_logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scopedOrganization.id)
      .eq('agency_id', actionContext.agencyId)
      .select('id,brand_logo_url')
      .limit(1)
      .maybeSingle()

    if (persistResult.error) {
      return NextResponse.json({ ok: false, error: persistResult.error.message }, { status: 400 })
    }
    if (!persistResult.data?.id) {
      return NextResponse.json({ ok: false, error: 'Branding scope is invalid for this update.' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      logoUrl: normalizeLogoUrl(persistResult.data.brand_logo_url),
      bucket: BRANDING_BUCKET,
      path: storagePath,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as RemoveBody

    const requestedAgencyId = normalizeText(body.agencyId)
    const targetType = normalizeTargetType(body.targetType)
    const clientId = normalizeText(body.clientId)

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }
    if (!targetType) {
      return NextResponse.json({ ok: false, error: 'Branding target type must be agency or client.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: targetType === 'agency' ? 'edit_agency_settings' : 'edit_client_settings',
      requestedAgencyId,
    })

    if (actionContext.role !== 'owner' && actionContext.role !== 'admin' && actionContext.role !== 'superadmin') {
      return NextResponse.json({ ok: false, error: 'Only owner/admin can manage branding logos.' }, { status: 403 })
    }

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for branding update.' }, { status: 403 })
    }

    if (targetType === 'client' && !clientId) {
      return NextResponse.json({ ok: false, error: 'Client scope is required for client branding.' }, { status: 400 })
    }

    const scopedOrganization = await resolveScopedOrganization({
      targetType,
      agencyId: actionContext.agencyId,
      clientId,
    })

    const storagePath = mapStoragePath({
      targetType,
      agencyId: actionContext.agencyId,
      clientId,
    })

    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for logo uploads.' },
        { status: 500 },
      )
    }

    await ensureBrandingBucket()
    await supabase.storage.from(BRANDING_BUCKET).remove([storagePath])

    const persistResult = await supabase
      .from('organizations')
      .update({
        brand_logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scopedOrganization.id)
      .eq('agency_id', actionContext.agencyId)
      .select('id,brand_logo_url')
      .limit(1)
      .maybeSingle()

    if (persistResult.error) {
      return NextResponse.json({ ok: false, error: persistResult.error.message }, { status: 400 })
    }
    if (!persistResult.data?.id) {
      return NextResponse.json({ ok: false, error: 'Branding scope is invalid for this update.' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      logoUrl: null,
      bucket: BRANDING_BUCKET,
      path: storagePath,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
