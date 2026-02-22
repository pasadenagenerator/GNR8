import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/auth/require-superadmin-user-id'

export async function GET(_req: NextRequest) {
  try {
    const userId = await requireSuperadminUserId()
    return NextResponse.json({ ok: true, userId }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    const status =
      message.startsWith('Forbidden') ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}