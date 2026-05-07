import 'server-only'
import { Pool } from 'pg'

let pool: Pool | null = null

type RedactedConnSummary = {
  protocol: string | null
  usernamePresent: boolean
  hostname: string | null
  port: string | null
  database: string | null
}

function summarizeConnectionString(connectionString: string): RedactedConnSummary {
  try {
    const parsed = new URL(connectionString)
    return {
      protocol: parsed.protocol || null,
      usernamePresent: parsed.username.length > 0,
      hostname: parsed.hostname || null,
      port: parsed.port || null,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, "") || null : null,
    }
  } catch {
    return {
      protocol: null,
      usernamePresent: false,
      hostname: null,
      port: null,
      database: null,
    }
  }
}

export function getSuperadminPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const databaseUrlSummary = summarizeConnectionString(connectionString)
  const fallbackEnvSummary = {
    POSTGRES_URL: process.env.POSTGRES_URL ? summarizeConnectionString(process.env.POSTGRES_URL) : null,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? summarizeConnectionString(process.env.POSTGRES_PRISMA_URL) : null,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? summarizeConnectionString(process.env.POSTGRES_URL_NON_POOLING) : null,
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL ? summarizeConnectionString(process.env.SUPABASE_DB_URL) : null,
  }

  console.error("[runtime-db-debug] constructing superadmin pool", {
    sourceEnvVar: "DATABASE_URL",
    databaseUrlSummary,
    fallbackEnvSummary,
    pgEnv: {
      PGHOST: process.env.PGHOST ?? null,
      PGPORT: process.env.PGPORT ?? null,
      PGDATABASE: process.env.PGDATABASE ?? null,
      PGUSER: process.env.PGUSER ? "present" : "absent",
    },
  })

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
