import {
  deleteTemplateByIdForClient,
  getTemplateByIdForClient,
  listTemplatesForClient,
  listTemplatesForClientWithDiagnostics,
  updateTemplateMetadataById,
} from '@/gnr8/template-intake/storage/template-repository'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import type { TemplateListReadDiagnostics } from '@/gnr8/template-intake/storage/template-repository'

export async function listClientTemplates(input: {
  clientId: string
  limit?: number
}): Promise<TemplateRecord[]> {
  return listTemplatesForClient({
    clientId: input.clientId,
    limit: input.limit,
  })
}

export async function listClientTemplatesWithReadDiagnostics(input: {
  clientId: string
  limit?: number
}): Promise<{ templates: TemplateRecord[]; diagnostics: TemplateListReadDiagnostics }> {
  return listTemplatesForClientWithDiagnostics({
    clientId: input.clientId,
    limit: input.limit,
  })
}

export async function getClientTemplateById(input: {
  clientId: string
  templateId: string
}): Promise<TemplateRecord | null> {
  return getTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}

export async function updateClientTemplateMetadata(input: {
  clientId: string
  templateId: string
  name: string
  tags: string[]
}): Promise<TemplateRecord | null> {
  return updateTemplateMetadataById({
    clientId: input.clientId,
    templateId: input.templateId,
    name: input.name,
    tags: input.tags,
  })
}

export async function deleteClientTemplateById(input: {
  clientId: string
  templateId: string
}): Promise<TemplateRecord | null> {
  return deleteTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}
