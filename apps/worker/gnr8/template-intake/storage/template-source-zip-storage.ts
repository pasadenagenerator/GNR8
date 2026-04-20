import 'server-only'

import path from 'node:path'

import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

const TEMPLATE_SOURCE_ZIP_BUCKET_ENV_VAR = 'GNR8_TEMPLATE_SOURCE_ZIP_BUCKET' as const
const DEFAULT_TEMPLATE_SOURCE_ZIP_BUCKET = 'gnr8-template-source-zips' as const

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function sanitizePathSegment(value: string): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'value'
}

function normalizeZipFilename(fileName: string): string {
  const baseName = path.posix.basename(fileName.replaceAll('\\', '/'))
  const normalized = sanitizePathSegment(baseName)
  if (normalized.toLowerCase().endsWith('.zip')) return normalized
  return `${normalized}.zip`
}

function isBucketMissingError(message: string): boolean {
  const normalized = normalizeText(message).toLowerCase()
  return normalized.includes('not found') || normalized.includes('does not exist')
}

function isBucketExistsError(message: string): boolean {
  const normalized = normalizeText(message).toLowerCase()
  return normalized.includes('already exists') || normalized.includes('duplicate')
}

let ensureBucketPromise: Promise<void> | null = null

export function resolveTemplateSourceZipBucket(): string {
  const configured = normalizeText(process.env[TEMPLATE_SOURCE_ZIP_BUCKET_ENV_VAR])
  return configured || DEFAULT_TEMPLATE_SOURCE_ZIP_BUCKET
}

async function ensureTemplateSourceZipBucket() {
  if (ensureBucketPromise) {
    await ensureBucketPromise
    return
  }

  ensureBucketPromise = (async () => {
    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for template ZIP uploads.')
    }

    const bucket = resolveTemplateSourceZipBucket()
    const bucketResult = await supabase.storage.getBucket(bucket)
    if (bucketResult.error) {
      if (!isBucketMissingError(bucketResult.error.message)) {
        throw new Error(bucketResult.error.message)
      }

      const createResult = await supabase.storage.createBucket(bucket, {
        public: false,
        allowedMimeTypes: ['application/zip', 'application/x-zip-compressed'],
      })
      if (createResult.error && !isBucketExistsError(createResult.error.message)) {
        throw new Error(createResult.error.message)
      }
      return
    }

    if (bucketResult.data && bucketResult.data.public) {
      const updateResult = await supabase.storage.updateBucket(bucket, {
        public: false,
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

export async function persistTemplateSourceZip(input: {
  clientId: string
  templateId: string
  sourceFilename: string
  bytes: Uint8Array
}): Promise<{ bucket: string; key: string }> {
  await ensureTemplateSourceZipBucket()
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for template ZIP uploads.')
  }

  const bucket = resolveTemplateSourceZipBucket()
  const key = `client/${sanitizePathSegment(input.clientId)}/template/${sanitizePathSegment(input.templateId)}/${Date.now()}-${normalizeZipFilename(input.sourceFilename)}`
  const uploadResult = await supabase.storage.from(bucket).upload(key, input.bytes, {
    upsert: true,
    contentType: 'application/zip',
    cacheControl: '31536000',
  })

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message)
  }

  return { bucket, key }
}

export async function loadTemplateSourceZip(input: {
  bucket: string
  key: string
}): Promise<Uint8Array> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for template ZIP processing.')
  }

  const downloadResult = await supabase.storage.from(input.bucket).download(input.key)
  if (downloadResult.error) {
    throw new Error(downloadResult.error.message)
  }

  const buffer = await downloadResult.data.arrayBuffer()
  return new Uint8Array(buffer)
}

export async function deleteTemplateSourceZip(input: {
  bucket: string
  key: string
}): Promise<void> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return

  const removeResult = await supabase.storage.from(input.bucket).remove([input.key])
  if (removeResult.error) {
    console.warn('[template-intake] TEMPLATE_SOURCE_ZIP_DELETE_FAILED', {
      bucket: input.bucket,
      key: input.key,
      message: removeResult.error.message,
    })
  }
}
