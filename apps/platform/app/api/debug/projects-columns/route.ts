import { NextResponse } from 'next/server'

export async function GET() {
  // Debug endpoint disabled (enforcement: routes must not touch DB).
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}