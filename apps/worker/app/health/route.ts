import { NextResponse } from 'next/server'

import { getSuperadminPool } from '@/src/superadmin/db'

export const dynamic = 'force-dynamic'

const GNR8_STAGING_PROJECT_REF = 'dpkdxllcxnlytgjbnmvp'
const GNR8_STAGING_SUPABASE_HOST = `${GNR8_STAGING_PROJECT_REF}.supabase.co`
const GNR8_STAGING_POOLER_HOST = 'aws-1-eu-central-2.pooler.supabase.com'
const GNR8_STAGING_DIRECT_HOST = `db.${GNR8_STAGING_PROJECT_REF}.supabase.co`

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

export function hasGnr8StagingPreviewConfiguration(env: NodeJS.ProcessEnv): boolean {
  try {
    const supabaseUrl = new URL(String(env.NEXT_PUBLIC_SUPABASE_URL ?? ''))
    const databaseUrl = new URL(String(env.DATABASE_URL ?? ''))
    const anon = jwtClaims(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const service = jwtClaims(env.SUPABASE_SERVICE_ROLE_KEY)
    const databaseLogin = decodeURIComponent(databaseUrl.username)
    const databaseTargetMatches =
      (databaseUrl.hostname === GNR8_STAGING_POOLER_HOST && databaseLogin === `postgres.${GNR8_STAGING_PROJECT_REF}`) ||
      (databaseUrl.hostname === GNR8_STAGING_DIRECT_HOST && databaseLogin === 'postgres')

    return (
      supabaseUrl.protocol === 'https:' &&
      supabaseUrl.hostname === GNR8_STAGING_SUPABASE_HOST &&
      supabaseUrl.port === '' &&
      databaseTargetMatches &&
      (databaseUrl.protocol === 'postgres:' || databaseUrl.protocol === 'postgresql:') &&
      databaseUrl.port === '5432' &&
      databaseUrl.pathname === '/postgres' &&
      databaseUrl.search === '' &&
      databaseUrl.hash === '' &&
      Boolean(databaseUrl.password) &&
      anon?.ref === GNR8_STAGING_PROJECT_REF &&
      anon.role === 'anon' &&
      service?.ref === GNR8_STAGING_PROJECT_REF &&
      service.role === 'service_role'
    )
  } catch {
    return false
  }
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

  if (!hasGnr8StagingPreviewConfiguration(process.env)) {
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
        projectRef: verified ? GNR8_STAGING_PROJECT_REF : null,
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
