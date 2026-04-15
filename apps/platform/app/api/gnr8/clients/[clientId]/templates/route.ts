import { NextResponse } from 'next/server'

import { listClientTemplates } from '@/gnr8/template-intake/core/template-intake-service'
import {
  mapTemplateToListCard,
  sortTemplateCardsDeterministically,
} from '@/gnr8/template-intake/core/template-list-contract'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = {
  clientId: string
}

export async function GET(_request: Request, ctx: { params: Promise<Params> }) {
  try {
    const { clientId: clientIdParam } = await ctx.params
    const scope = await requireClientTemplateScope({
      clientIdParam,
    })

    const templates = await listClientTemplates({
      clientId: scope.clientId,
      limit: 250,
    })
    const cards = sortTemplateCardsDeterministically(templates.map((template) => mapTemplateToListCard(template)))

    return NextResponse.json(
      {
        ok: true,
        clientId: scope.clientId,
        templates: cards,
      },
      { status: 200 },
    )
  } catch (error) {
    const mapped = parseThrownScopeError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
