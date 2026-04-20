import {
  deleteTemplateByIdForClient,
  getTemplateByIdForClient,
  listTemplatesForClient,
  updateTemplateMetadataById,
} from '@/gnr8/template-intake/storage/template-repository'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

export { runTemplateZipIntake } from '@/gnr8/template-intake/core/template-upload-intake-service'
export type { TemplateRepository } from '@/gnr8/template-intake/core/template-upload-intake-service'
import type { TemplateRepository } from '@/gnr8/template-intake/core/template-upload-intake-service'

const DEFAULT_REPOSITORY: Pick<
  TemplateRepository,
  | 'listTemplatesForClient'
  | 'getTemplateByIdForClient'
  | 'updateTemplateMetadataById'
  | 'deleteTemplateByIdForClient'
> = {
  listTemplatesForClient,
  getTemplateByIdForClient,
  updateTemplateMetadataById,
  deleteTemplateByIdForClient,
}

export async function listClientTemplates(input: {
  clientId: string
  limit?: number
  repository?: Pick<TemplateRepository, 'listTemplatesForClient'>
}): Promise<TemplateRecord[]> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.listTemplatesForClient({
    clientId: input.clientId,
    limit: input.limit,
  })
}

export async function getClientTemplateById(input: {
  clientId: string
  templateId: string
  repository?: Pick<TemplateRepository, 'getTemplateByIdForClient'>
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.getTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}

export async function updateClientTemplateMetadata(input: {
  clientId: string
  templateId: string
  name: string
  tags: string[]
  repository?: Pick<TemplateRepository, 'updateTemplateMetadataById'>
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.updateTemplateMetadataById({
    clientId: input.clientId,
    templateId: input.templateId,
    name: input.name,
    tags: input.tags,
  })
}

export async function deleteClientTemplateById(input: {
  clientId: string
  templateId: string
  repository?: Pick<TemplateRepository, 'deleteTemplateByIdForClient'>
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.deleteTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}
