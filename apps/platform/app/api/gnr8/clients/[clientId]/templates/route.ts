import { createTemplateListRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/templates/template-list-route-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createTemplateListRouteHandlers()

export const GET = handlers.GET
