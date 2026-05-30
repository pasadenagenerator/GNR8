export type TwinStatus = "building" | "ready" | "stale" | "failed";

export type TwinIdentity = {
  twinId: string;
  siteId: string;
  siteVersionId: string;
  workspaceId: string;
  environmentScope: string;
  status: TwinStatus;
  createdAt: string;
  updatedAt: string;
};

export type TwinStateBucket = {
  bucket: "content" | "design" | "experience" | "governance" | "operational";
  summary: string;
  sourceModelCount: number;
};

export type TwinSnapshot = {
  contentState: TwinStateBucket;
  designState: TwinStateBucket;
  experienceState: TwinStateBucket;
  governanceState: TwinStateBucket;
  operationalState: TwinStateBucket;
};

export type TwinMetadata = {
  sourceImportId: string | null;
  sourceSiteVersionId: string;
  sourceModels: string[];
  generatedAt: string;
  generatedBy: string;
  diagnostics: string[];
};

export type WebsiteDigitalTwin = {
  identity: TwinIdentity;
  status: TwinStatus;
  snapshot: TwinSnapshot;
  metadata: TwinMetadata;
  diagnostics: string[];
};

export type TwinViewerPayload = {
  identity: TwinIdentity;
  status: TwinStatus;
  snapshot: TwinSnapshot;
  metadata: TwinMetadata;
  diagnostics: string[];
};
