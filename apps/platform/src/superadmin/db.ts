import 'server-only'
import { Pool, type PoolClient } from 'pg'

type PoolDiagnosticsState = {
  checkoutCount: number
  releaseCount: number
  pendingAcquireCount: number
}

type GlobalPoolState = {
  pool: Pool | null
  diagnosticsBound: boolean
  diagnostics: PoolDiagnosticsState
}

declare global {
  // eslint-disable-next-line no-var
  var __gnr8SuperadminPoolState__: GlobalPoolState | undefined
}

function getGlobalPoolState(): GlobalPoolState {
  if (!globalThis.__gnr8SuperadminPoolState__) {
    globalThis.__gnr8SuperadminPoolState__ = {
      pool: null,
      diagnosticsBound: false,
      diagnostics: {
        checkoutCount: 0,
        releaseCount: 0,
        pendingAcquireCount: 0,
      },
    }
  }
  return globalThis.__gnr8SuperadminPoolState__
}

type RedactedConnSummary = {
  protocol: string | null
  hostname: string | null
  reasonCode: "MISSING" | "UNPARSABLE" | "EMPTY_HOSTNAME" | "HOSTNAME_WHITESPACE"
}

function validateDatabaseUrlOrThrow(connectionString: string | undefined): string {
  const sourceEnvVar = "DATABASE_URL"

  if (!connectionString) {
    const summary: RedactedConnSummary = {
      protocol: null,
      hostname: null,
      reasonCode: "MISSING",
    }
    throw new Error(`Invalid database configuration: ${JSON.stringify({ sourceEnvVar, ...summary })}`)
  }

  try {
    const parsed = new URL(connectionString)

    const protocol = parsed.protocol || null
    const hostname = parsed.hostname || null

    if (!hostname) {
      const summary: RedactedConnSummary = {
        protocol,
        hostname,
        reasonCode: "EMPTY_HOSTNAME",
      }
      throw new Error(`Invalid database configuration: ${JSON.stringify({ sourceEnvVar, ...summary })}`)
    }

    if (/\s/.test(hostname)) {
      const summary: RedactedConnSummary = {
        protocol,
        hostname,
        reasonCode: "HOSTNAME_WHITESPACE",
      }
      throw new Error(`Invalid database configuration: ${JSON.stringify({ sourceEnvVar, ...summary })}`)
    }

    return connectionString
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid database configuration:")) {
      throw error
    }

    const summary: RedactedConnSummary = {
      protocol: null,
      hostname: null,
      reasonCode: "UNPARSABLE",
    }
    throw new Error(`Invalid database configuration: ${JSON.stringify({ sourceEnvVar, ...summary })}`)
  }
}

export function getSuperadminPool(): Pool {
  const state = getGlobalPoolState()
  if (state.pool) return state.pool

  const connectionString = validateDatabaseUrlOrThrow(process.env.DATABASE_URL)

  state.pool = new Pool({
    connectionString,

    // Supabase običajno zahteva TLS
    ssl: {
      rejectUnauthorized: false,
    },

    // Vercel serverless optimizacija
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  if (!state.diagnosticsBound) {
    state.diagnosticsBound = true
    state.pool.on('acquire', () => {
      state.diagnostics.checkoutCount += 1
      state.diagnostics.pendingAcquireCount = Math.max(0, state.diagnostics.pendingAcquireCount - 1)
    })
    state.pool.on('release', () => {
      state.diagnostics.releaseCount += 1
    })
    state.pool.on('remove', () => {
      const inUse = Math.max(0, state.diagnostics.checkoutCount - state.diagnostics.releaseCount)
      if (inUse > 0) {
        console.warn('[gnr8.db.pool] SUPERADMIN_POOL_CLIENT_REMOVED_WHILE_TRACKING_IN_USE', {
          inUse,
          totalCount: state.pool?.totalCount ?? 0,
          idleCount: state.pool?.idleCount ?? 0,
          waitingCount: state.pool?.waitingCount ?? 0,
        })
      }
    })
  }

  return state.pool
}

export async function withSuperadminClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getSuperadminPool()
  const state = getGlobalPoolState()
  state.diagnostics.pendingAcquireCount += 1
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
