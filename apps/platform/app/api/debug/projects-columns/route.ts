import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function GET() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is missing' },
      { status: 500 },
    )
  }

  const pool = new Pool({ connectionString })

  try {
    const result = await pool.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'projects'
      order by ordinal_position
    `)

    // samo za debugging: kateri host je v uporabi
    const databaseUrlHost =
      connectionString.split('@')[1]?.split('/')[0] ?? null

    return NextResponse.json({
      ok: true,
      databaseUrlHost,
      columns: result.rows,
    })
  } finally {
    // pri serverless je OK, da ga zapremo (debug endpoint)
    await pool.end()
  }
}