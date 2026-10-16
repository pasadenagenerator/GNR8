import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { NonRetriableError } from 'inngest'

import {
  type SiteAstroGenerationRequestedPayload,
  SITE_ASTRO_GENERATION_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'

import { inngest } from '@/gnr8/inngest/client'

type GenerationResult = {
  generationSiteVersionId: string
  candidateId: string
  artifactId: string
  artifactBundleSha256: string
  routePaths: string[]
  variantId: string
  candidateSizes: {
    registryRecordUtf8Bytes: number
    resolvedCandidateUtf8Bytes: number
    objectPayloadUtf8Bytes: number
  }
}

type RunGeneration = (payload: SiteAstroGenerationRequestedPayload) => Promise<GenerationResult>

const runDefaultGeneration: RunGeneration = async (payload) => {
  const pnpmCliPath = resolveBundledPnpmCliPath()
  if (!pnpmCliPath) throw new Error('Bundled pnpm CLI is unavailable in the worker runtime.')
  process.env.GNR8_PNPM_CLI_PATH = pnpmCliPath
  const mod = await import('@/gnr8/output-adapters/source-backed-astro-generation-service')
  return mod.runSourceBackedAstroGeneration(payload)
}

export function resolveBundledPnpmCliPath(runtimeRoot = process.cwd()): string | null {
  return [
    join(runtimeRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    join(runtimeRoot, 'apps', 'worker', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  ].find((candidate) => existsSync(candidate)) ?? null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function parseSiteAstroGenerationPayload(value: unknown): SiteAstroGenerationRequestedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const actionId = normalizeText(record.actionId)
  const requestedAt = normalizeText(record.requestedAt)
  const ownershipSiteId = normalizeText(record.ownershipSiteId)
  const runtimeSiteId = normalizeText(record.runtimeSiteId)
  const sourceSiteVersionId = normalizeText(record.sourceSiteVersionId)
  const sourceArtifactId = normalizeText(record.sourceArtifactId)
  const actor = normalizeText(record.actor)
  const strategy = normalizeText(record.strategy)
  const requestedAdapterId = normalizeText(record.requestedAdapterId)
  const reduction = record.acceptedFunctionalReductions && typeof record.acceptedFunctionalReductions === 'object' && !Array.isArray(record.acceptedFunctionalReductions)
    ? record.acceptedFunctionalReductions as Record<string, unknown>
    : null
  if (!actionId || !requestedAt || !Number.isFinite(Date.parse(requestedAt)) || !ownershipSiteId || !runtimeSiteId || !sourceSiteVersionId || !sourceArtifactId || !actor) return null
  if (requestedAdapterId && requestedAdapterId !== 'astro-static-site' && requestedAdapterId !== 'html-static-artifact') return null
  const acceptedFunctionalReductions = reduction
    ? {
        kind: normalizeText(reduction.kind),
        contactEmail: normalizeText(reduction.contactEmail).toLowerCase(),
        commentLinks: normalizeText(reduction.commentLinks),
        sourceWidgetRemovals: Array.isArray(reduction.sourceWidgetRemovals)
          ? reduction.sourceWidgetRemovals.map(normalizeText)
          : [],
      }
    : null
  const allowedWidgetRemovals = new Set(['cookie-consent', 'form-captcha', 'back-to-top'])
  if (
    acceptedFunctionalReductions &&
    (
      acceptedFunctionalReductions.kind !== 'legacy-forms-to-disclosed-links-v1' ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(acceptedFunctionalReductions.contactEmail) ||
      acceptedFunctionalReductions.commentLinks !== 'source-article' ||
      acceptedFunctionalReductions.sourceWidgetRemovals.some((item) => !allowedWidgetRemovals.has(item)) ||
      new Set(acceptedFunctionalReductions.sourceWidgetRemovals).size !== acceptedFunctionalReductions.sourceWidgetRemovals.length
    )
  ) return null
  return {
    actionId,
    requestedAt: new Date(requestedAt).toISOString(),
    ownershipSiteId,
    runtimeSiteId,
    sourceSiteVersionId,
    sourceArtifactId,
    actor,
    strategy,
    ...(requestedAdapterId ? { requestedAdapterId } : {}),
    ...(acceptedFunctionalReductions ? {
      acceptedFunctionalReductions: {
        kind: 'legacy-forms-to-disclosed-links-v1' as const,
        contactEmail: acceptedFunctionalReductions.contactEmail,
        commentLinks: 'source-article' as const,
        ...(acceptedFunctionalReductions.sourceWidgetRemovals.length > 0
          ? { sourceWidgetRemovals: acceptedFunctionalReductions.sourceWidgetRemovals as Array<'cookie-consent' | 'form-captcha' | 'back-to-top'> }
          : {}),
      },
    } : {}),
  } as SiteAstroGenerationRequestedPayload
}

export const SITE_ASTRO_GENERATION_JOB_ID = 'site-astro-generation-job'
export const SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT = SITE_ASTRO_GENERATION_REQUESTED_EVENT

export async function runSiteAstroGenerationJob(input: {
  eventData: unknown
  runGeneration?: RunGeneration
}) {
  const payload = parseSiteAstroGenerationPayload(input.eventData)
  if (!payload) throw new Error('Invalid site Astro generation event payload.')
  try {
    return await (input.runGeneration ?? runDefaultGeneration)(payload)
  } catch (error) {
    if (isDeterministicGenerationFailure(error)) {
      throw new NonRetriableError(error instanceof Error ? error.message : 'Deterministic Astro generation failure.', {
        cause: error,
      })
    }
    throw error
  }
}

function isDeterministicGenerationFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; retryable?: unknown; message?: unknown }
  if (candidate.retryable === false) return true
  if (candidate.code === 'unsupported_capability' || candidate.code === 'record_too_large') return true
  return typeof candidate.message === 'string' && (
    candidate.message.startsWith('unsupported_capability:') ||
    candidate.message === 'astro_generation_source_artifact_missing' ||
    candidate.message === 'astro_generation_source_capture_lineage_missing' ||
    candidate.message === 'astro_generation_source_capture_integrity_mismatch' ||
    candidate.message === 'astro_generation_source_lineage_mismatch' ||
    candidate.message.startsWith('astro_derived_capture_dependency_fetch_failed:') ||
    candidate.message.startsWith('astro_derived_capture_stylesheet_missing:')
  )
}

export const siteAstroGenerationJob = inngest.createFunction(
  { id: SITE_ASTRO_GENERATION_JOB_ID, retries: 2 },
  { event: SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT },
  async ({ event }) => runSiteAstroGenerationJob({ eventData: event.data }),
)
