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
    // opcijsko: Supabase pooler je pogosto TLS; če rabiš:
    // ssl: { rejectUnauthorized: false },
  })

  return pool
}