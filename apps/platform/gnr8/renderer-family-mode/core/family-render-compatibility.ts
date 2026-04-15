import type { FinalSiteModel } from '@/gnr8/merge-engine'
import type { FamilyPageInstance } from '@/gnr8/renderer-family-mode/types/family-render-types'

export function applyFamilyPageInstanceToFinalSiteModel(input: {
  finalSiteModel: FinalSiteModel
  pageInstance: FamilyPageInstance
}): FinalSiteModel {
  const pages = input.finalSiteModel.pages
    .map((page) => {
      if (page.id !== input.pageInstance.pageId) return page
      return {
        ...page,
        path: input.pageInstance.routePath,
        title: input.pageInstance.title,
        seo: input.pageInstance.seo,
        sections: input.pageInstance.sections,
        globalRegionIds: input.pageInstance.globalRegionIds,
        provenance: input.pageInstance.provenance,
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id))

  return {
    ...input.finalSiteModel,
    pages,
  }
}
