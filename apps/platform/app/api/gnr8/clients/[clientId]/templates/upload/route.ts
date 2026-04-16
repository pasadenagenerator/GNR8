import { createTemplateUploadRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/templates/upload/template-upload-route-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createTemplateUploadRouteHandlers()

export const POST = handlers.POST
