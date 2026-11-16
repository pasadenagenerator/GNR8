export type StableImportSnapshotFixture = {
  fixtureId: string;
  sourceSiteVersionId: string;
  sourceImportId: string;
  pageCount: number;
  sectionCount: number;
  assetCount: number;
  detectedTitle: string;
  detectedHomepagePath: string;
  providerStateSummary: string;
};

export const STABLE_IMPORT_SNAPSHOT_FIXTURE: StableImportSnapshotFixture = {
  fixtureId: "stable-imported-validation-site-v1",
  sourceSiteVersionId: "site_version_imported_url_stable_validation_v1",
  sourceImportId: "import_imported_url_stable_validation_v1",
  pageCount: 18,
  sectionCount: 74,
  assetCount: 133,
  detectedTitle: "GNR8 Validation Site",
  detectedHomepagePath: "index.html",
  providerStateSummary: "preview/runtime-only",
};
