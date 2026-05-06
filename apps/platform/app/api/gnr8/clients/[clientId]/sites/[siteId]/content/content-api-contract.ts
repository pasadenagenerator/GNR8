import { NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ContentRouteStatus = 'draft' | 'published'

export function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  return normalized && UUID_RE.test(normalized) ? normalized : null
}

export function isContentStatus(value: unknown): value is ContentRouteStatus {
  return value === 'draft' || value === 'published'
}

export function validationErrorResponse(input: {
  diagnostics?: string[]
  error: string
  details?: Record<string, unknown>
  status?: number
}) {
  return NextResponse.json(
    {
      ok: false,
      reasonCode: 'VALIDATION_ERROR',
      error: input.error,
      diagnostics: [...(input.diagnostics ?? []), 'VALIDATION_ERROR'],
      debug: input.details ?? {},
    },
    { status: input.status ?? 400 },
  )
}

export function successResponse<T extends Record<string, unknown>>(input: {
  body?: T
  diagnostics?: string[]
  status?: number
}) {
  return NextResponse.json(
    {
      ok: true,
      diagnostics: input.diagnostics ?? [],
      ...(input.body ?? {}),
    },
    { status: input.status ?? 200 },
  )
}

export function failureResponse(input: {
  reasonCode: string
  error: string
  diagnostics?: string[]
  debug?: Record<string, unknown>
  status?: number
}) {
  return NextResponse.json(
    {
      ok: false,
      reasonCode: input.reasonCode,
      error: input.error,
      diagnostics: input.diagnostics ?? [],
      ...(input.debug ? { debug: input.debug } : {}),
    },
    { status: input.status ?? 500 },
  )
}
