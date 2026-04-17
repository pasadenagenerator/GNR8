export const URL_SINGLE_PAGE_IMPORT_VERSION = '1.6.0' as const

export type RenderedDomQuality = {
  quality: 'strong' | 'weak' | 'unusable'
  bodyTextLength: number
  meaningfulNodeCount: number
  sectionCandidateCount: number
  hasHeading: boolean
  reason: string
}
