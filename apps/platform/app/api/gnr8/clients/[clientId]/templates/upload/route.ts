import { createTemplateUploadRouteHandlers } from '@/gnr8/template-intake/routes/template-upload-route-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createTemplateUploadRouteHandlers()

export const POST = handlers.POST
