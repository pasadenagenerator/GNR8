export const SCOPED_SITE_IMPORT_CANONICAL_PATH = 'scoped_snapshot_import_v1' as const

export const NON_CANONICAL_SCOPED_IMPORT_PATHS = [
  '/api/gnr8/import/url-and-save',
  '/api/gnr8/import/html-and-save',
  '/api/gnr8/runtime/migrate/url',
] as const

export type ScopedSiteImportPathClassification = 'canonical_scoped' | 'legacy_non_canonical'
