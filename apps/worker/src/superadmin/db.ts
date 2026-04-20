import 'server-only'
import { Pool } from 'pg'

let pool: Pool | null = null

export function getSuperadminPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

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