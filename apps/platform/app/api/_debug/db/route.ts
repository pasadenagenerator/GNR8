import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { ok: false, error: 'Missing DATABASE_URL in environment.' },
        { status: 500 },
      )
    }

    const pool = new Pool({ connectionString: databaseUrl })
    const client = await pool.connect()

    try {
      const meta = await client.query(`
        select
          current_database() as db,
          current_user as "user",
          inet_server_addr()::text as server_addr,
          inet_server_port() as server_port,
          version() as version;
      `)

      const cols = await client.query(
        `
        select column_name, data_type
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'projects'
        order by ordinal_position;
        `,
      )

      return NextResponse.json({
        ok: true,
        meta: meta.rows[0],
        projectsColumns: cols.rows,
      })
    } finally {
      client.release()
      await pool.end()
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}