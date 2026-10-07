import 'server-only'
import { Pool, type PoolConfig } from 'pg'

let pool: Pool | null = null

export const SUPERADMIN_DB_CONNECTION_TIMEOUT_MS = 15_000

export function createSuperadminPoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,

    // Supabase običajno zahteva TLS
    ssl: {
      rejectUnauthorized: false,
    },

    // Vercel serverless optimizacija. Preview pooler lahko ob hladnem zagonu
    // potrebuje več kot pet sekund, zato mora biti rok daljši od privzetega
    // kratkega okna, vendar še vedno omejen.
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: SUPERADMIN_DB_CONNECTION_TIMEOUT_MS,
  }
}

export function getSuperadminPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  pool = new Pool(createSuperadminPoolConfig(connectionString))

  return pool
}
