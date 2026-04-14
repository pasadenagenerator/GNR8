export type {
  SiteTemplateFamilyExtraction,
  SiteTemplateFamilyExtractionInput,
  TemplateFamily,
  TemplateFamilyAssignment,
  TemplateFamilyConfidence,
  TemplateFamilyExtractionSummary,
  TemplateFamilyKind,
  TemplateFamilyRelationship,
  TemplateFamilySignature,
  RouteTemplateSignals,
} from './types/contracts'

export { extractSiteTemplateFamilies, summarizeTemplateFamilyExtraction, toLegacyPageRelationships, toLegacyRouteFamilies } from './core/extract-site-template-families'
