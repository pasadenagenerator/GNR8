export type SiteActionType = 'rerun_transformation' | 'generate_redesign' | 'publish_site'

export type SiteActionStatus = 'idle' | 'running' | 'completed' | 'failed'

export type SiteAction = {
  id: string
  siteId: string
  type: SiteActionType
  status: SiteActionStatus
  createdAt: string
  completedAt?: string
  resultSummary?: string
  diagnostics?: string[]
  strategy?: string | null
  variantId?: string | null
}

export type SiteVariant = {
  id: string
  siteId: string
  label: string
  strategy: string
  createdAt: string
  siteVersionId?: string | null
}

export type SitePublishMetadata = {
  id: string
  siteId: string
  siteVersionId: string
  publishedAt: string
  publishedBy: string
  resultSummary: string
}

export type SiteActionResult = {
  ok: boolean
  action: SiteAction
  siteVersionId?: string
  variant?: SiteVariant
  publish?: SitePublishMetadata
}

export type SiteActionRequest =
  | {
      siteId: string
      agencyId: string
      type: 'rerun_transformation'
      actor: string
    }
  | {
      siteId: string
      agencyId: string
      type: 'generate_redesign'
      actor: string
      strategy?: string
    }
  | {
      siteId: string
      agencyId: string
      type: 'publish_site'
      actor: string
      variantId?: string
    }
