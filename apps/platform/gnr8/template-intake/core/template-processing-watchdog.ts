import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import {
  TEMPLATE_PROCESSING_MAX_ATTEMPTS,
  TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES,
} from '@gnr8/runtime-contracts'
import { triggerTemplateProcessingJob } from '@/gnr8/template-intake/routes/template-processing-trigger'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toUnixMs(value: unknown): number {
  const time = Number(new Date(String(value ?? '')).getTime())
  return Number.isFinite(time) && time > 0 ? time : 0
}

export async function reenqueueStuckTemplateProcessing(input: {
  clientId: string
  templates: TemplateRecord[]
  nowMs?: number
  staleAfterMinutes?: number
  maxAttempts?: number
  maxReenqueuePerRun?: number
  triggerTemplateProcessingJob?: typeof triggerTemplateProcessingJob
}): Promise<{
  reenqueueCount: number
  candidateCount: number
  skippedByAttemptLimitCount: number
  skippedByRunLimitCount: number
}> {
  const nowMs = Number(input.nowMs ?? Date.now()) || Date.now()
  const staleAfterMinutes = Math.max(1, Number(input.staleAfterMinutes ?? TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES) || TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES)
  const maxAttempts = Math.max(1, Number(input.maxAttempts ?? TEMPLATE_PROCESSING_MAX_ATTEMPTS) || TEMPLATE_PROCESSING_MAX_ATTEMPTS)
  const maxReenqueuePerRun = Math.max(1, Number(input.maxReenqueuePerRun ?? TEMPLATE_PROCESSING_MAX_ATTEMPTS) || TEMPLATE_PROCESSING_MAX_ATTEMPTS)
  const staleBeforeMs = nowMs - staleAfterMinutes * 60_000
  const trigger = input.triggerTemplateProcessingJob ?? triggerTemplateProcessingJob

  const candidates = input.templates.filter((template) => {
    if (template.status !== 'processing') return false
    if (normalizeText(template.processingCompletedAt)) return false
    const startedAtMs = toUnixMs(template.processingStartedAt)
    if (startedAtMs <= 0) return true
    return startedAtMs < staleBeforeMs
  })

  let skippedByAttemptLimitCount = 0
  let skippedByRunLimitCount = 0
  let reenqueueCount = 0
  for (const template of candidates) {
    const attempts = Number(template.processingAttempts ?? 0) || 0
    if (attempts >= maxAttempts) {
      skippedByAttemptLimitCount += 1
      continue
    }
    if (reenqueueCount >= maxReenqueuePerRun) {
      skippedByRunLimitCount += 1
      continue
    }

    const sourceZipStorageBucket = normalizeText(template.sourceZipStorageBucket)
    const sourceZipStorageKey = normalizeText(template.sourceZipStorageKey)
    if (!sourceZipStorageBucket || !sourceZipStorageKey) continue

    console.info('[template-intake] TEMPLATE_PROCESSING_WATCHDOG_REENQUEUE', {
      clientId: input.clientId,
      templateId: template.id,
      processingAttempts: attempts,
      maxAttempts,
      staleAfterMinutes,
      eventReason: 'stale-processing-template',
    })

    const triggered = await trigger({
      clientId: input.clientId,
      templateId: template.id,
      sourceZipStorageBucket,
      sourceZipStorageKey,
    })
    if (triggered) reenqueueCount += 1
  }

  return {
    reenqueueCount,
    candidateCount: candidates.length,
    skippedByAttemptLimitCount,
    skippedByRunLimitCount,
  }
}
