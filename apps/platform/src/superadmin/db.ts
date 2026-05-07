import 'server-only'
import { Pool } from 'pg'

let pool: Pool | null = null

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
  if (pool) return pool

  const connectionString = validateDatabaseUrlOrThrow(process.env.DATABASE_URL)

  pool = new Pool({
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

  return pool
}
