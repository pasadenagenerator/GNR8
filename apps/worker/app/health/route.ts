import { NextResponse } from 'next/server'

import { getSuperadminPool } from '@/src/superadmin/db'

export const dynamic = 'force-dynamic'

const GNR8_STAGING_PROJECT_REF = 'dpkdxllcxnlytgjbnmvp'
const GNR8_PRODUCTION_PROJECT_REF = 'ujfbpzugdsdmroqvhfvn'
const PREVIEW_TARGETS = {
  staging: { projectRef: GNR8_STAGING_PROJECT_REF, poolerHost: 'aws-1-eu-central-2.pooler.supabase.com' },
  production: { projectRef: GNR8_PRODUCTION_PROJECT_REF, poolerHost: 'aws-1-eu-west-1.pooler.supabase.com' },
} as const

function jwtClaims(value: string | undefined): { ref?: unknown; role?: unknown } | null {
  try {
    const payload = String(value ?? '').split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return claims && typeof claims === 'object' && !Array.isArray(claims) ? claims : null
  } catch {
    return null
  }
}

export function resolveGnr8PreviewDatabaseTarget(env: NodeJS.ProcessEnv): string | null {
  try {
    const targetName = env.GNR8_PREVIEW_DATABASE_TARGET === 'production' ? 'production' : 'staging'
    const target = PREVIEW_TARGETS[targetName]
    const supabaseUrl = new URL(String(env.NEXT_PUBLIC_SUPABASE_URL ?? ''))
    const databaseUrl = new URL(String(env.DATABASE_URL ?? ''))
    const anon = jwtClaims(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const service = jwtClaims(env.SUPABASE_SERVICE_ROLE_KEY)
    const databaseLogin = decodeURIComponent(databaseUrl.username)
    const databaseTargetMatches =
      (databaseUrl.hostname === target.poolerHost && databaseLogin === `postgres.${target.projectRef}`) ||
      (databaseUrl.hostname === `db.${target.projectRef}.supabase.co` && databaseLogin === 'postgres')

    return (
      supabaseUrl.protocol === 'https:' &&
      supabaseUrl.hostname === `${target.projectRef}.supabase.co` &&
      supabaseUrl.port === '' &&
      databaseTargetMatches &&
      (databaseUrl.protocol === 'postgres:' || databaseUrl.protocol === 'postgresql:') &&
      (databaseUrl.port === '5432' || databaseUrl.port === '6543') &&
      databaseUrl.pathname === '/postgres' &&
      databaseUrl.search === '' &&
      databaseUrl.hash === '' &&
      Boolean(databaseUrl.password) &&
      anon?.ref === target.projectRef &&
      anon.role === 'anon' &&
      service?.ref === target.projectRef &&
      service.role === 'service_role'
    ) ? target.projectRef : null
  } catch {
    return null
  }
}

export function hasGnr8StagingPreviewConfiguration(env: NodeJS.ProcessEnv): boolean {
  return resolveGnr8PreviewDatabaseTarget({ ...env, GNR8_PREVIEW_DATABASE_TARGET: 'staging' }) === GNR8_STAGING_PROJECT_REF
}

const readyBody = {
  ok: true,
  service: 'gnr8-worker',
  status: 'ready',
} as const

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json(readyBody)
  }

  const projectRef = resolveGnr8PreviewDatabaseTarget(process.env)
  if (!projectRef) {
    return NextResponse.json({
      ...readyBody,
      ok: false,
      status: 'misconfigured',
      databaseTarget: {
        projectRef: null,
        verified: false,
      },
    }, { status: 503 })
  }

  try {
    const result = await getSuperadminPool().query<{
      database_name: string
      database_user: string
    }>('select current_database() as database_name, current_user as database_user')
    const identity = result.rows[0]
    const verified = identity?.database_name === 'postgres' && identity.database_user === 'postgres'
    return NextResponse.json({
      ...readyBody,
      ok: verified,
      status: verified ? 'ready' : 'misconfigured',
      databaseTarget: {
        projectRef: verified ? projectRef : null,
        verified,
      },
    }, { status: verified ? 200 : 503 })
  } catch {
    return NextResponse.json({
      ...readyBody,
      ok: false,
      status: 'unreachable',
      databaseTarget: {
        projectRef: null,
        verified: false,
      },
    }, { status: 503 })
  }
}
