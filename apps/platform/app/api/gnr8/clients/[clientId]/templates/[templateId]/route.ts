import { createTemplateDetailRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/templates/[templateId]/template-detail-route-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createTemplateDetailRouteHandlers()

export const GET = handlers.GET
export const PATCH = handlers.PATCH
export const DELETE = handlers.DELETE
