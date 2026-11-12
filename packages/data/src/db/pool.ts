import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (pool) {
    return pool
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 1_000,
    connectionTimeoutMillis: 5_000,
  })
  return pool
}
