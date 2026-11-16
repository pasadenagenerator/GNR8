import { parseSiteAstroGenerationPayload } from './site-astro-generation-payload'
export { parseSiteAstroGenerationPayload } from './site-astro-generation-payload'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { NonRetriableError } from 'inngest'
import { ASTRO_NODE_LINUX_SHA256 } from '../../../../platform/gnr8/output-adapters/astro-node-executor'

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

export function assertAstroExecutorNode(version = process.versions.node) {
  if (!/^26\.\d+\.\d+$/.test(version)) throw new NonRetriableError(`Astro build executor requires Node 26.x; received ${version}`)
}

const runDefaultGeneration: RunGeneration = async (payload) => {
  assertAstroExecutorNode()
  const pnpmCliPath = resolveBundledPnpmCliPath()
  if (!pnpmCliPath) throw new Error('Bundled pnpm CLI is unavailable in the worker runtime.')
  process.env.GNR8_PNPM_CLI_PATH = pnpmCliPath
  const nodePath = [join(process.cwd(), 'toolchains/node-26.13.0-linux-x64/bin/node'),
    join(process.cwd(), 'apps/worker/toolchains/node-26.13.0-linux-x64/bin/node')].find(existsSync)
  if (!nodePath) throw new NonRetriableError('Pinned Astro Node executable is missing from the Worker package.')
  process.env.GNR8_ASTRO_NODE_PATH = nodePath
  process.env.GNR8_ASTRO_NODE_SHA256 = ASTRO_NODE_LINUX_SHA256
  const mod = await import('@/gnr8/output-adapters/source-backed-astro-generation-service')
  return mod.runSourceBackedAstroGeneration(payload)
}

export function resolveBundledPnpmCliPath(runtimeRoot = process.cwd()): string | null {
  return [
    join(runtimeRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    join(runtimeRoot, 'apps', 'worker', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  ].find((candidate) => existsSync(candidate)) ?? null
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
  if (typeof candidate.code === 'string' && candidate.code.startsWith('STACKI_CANDIDATE_')) return true
  return typeof candidate.message === 'string' && (
    candidate.message.startsWith('stacki_candidate_blocked:') ||
    candidate.message.startsWith('stacki_candidate_source_not_supported:') ||
    candidate.message === 'stacki_candidate_source_stale' ||
    candidate.message === 'stacki_candidate_ownership_mismatch' ||
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
