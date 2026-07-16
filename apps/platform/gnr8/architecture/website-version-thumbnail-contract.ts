export const WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND = "website_version_thumbnail" as const;
export const WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION = "WVT-1" as const;
export const WEBSITE_VERSION_THUMBNAIL_CAPTURE_CONFIG_VERSION = "wvt-1-fixed-opening-viewport" as const;

export type WebsiteVersionThumbnailVersionKind = "original_source" | "generated_iteration";
export type WebsiteVersionThumbnailCaptureMethod =
  | "reused_evidence_capture_screenshot"
  | "rendered_durable_generated_preview";
export type WebsiteVersionThumbnailAvailabilityStatus = "ready" | "unavailable" | "blocked" | "invalid" | "stale";
export type WebsiteVersionThumbnailMediaType = "image/png" | "image/webp" | "image/jpeg";

export type WebsiteVersionThumbnailViewport = {
  width: number;
  height: number;
  deviceScaleFactor: 1;
  fullPage: boolean;
};

export const WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT: WebsiteVersionThumbnailViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  fullPage: false,
};

export type WebsiteVersionThumbnailSource = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  versionKind: WebsiteVersionThumbnailVersionKind;
  iterationNumber: number | null;
  sourceArtifactId: string;
  sourceArtifactKind: string;
  generatedProposalBundleId: string | null;
  generatedProposalBundleSha256: string | null;
  sourceScreenshotArtifactId: string | null;
  sourceScreenshotContentHash: string | null;
};

export type WebsiteVersionThumbnailImage = {
  mediaType: WebsiteVersionThumbnailMediaType;
  width: number;
  height: number;
  byteLength: number;
  contentHash: string;
  contentBase64: string;
};

export type WebsiteVersionThumbnailIntegrity = {
  algorithm: "sha256";
  contentHash: string;
  identityHash: string;
  byteLength: number;
};

export type WebsiteVersionThumbnailAvailability = {
  status: WebsiteVersionThumbnailAvailabilityStatus;
  safeServing: boolean;
  reason: string | null;
};

export type WebsiteVersionThumbnailLineage = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  versionKind: WebsiteVersionThumbnailVersionKind;
  iterationNumber: number | null;
  sourceArtifactId: string;
  sourceArtifactKind: string;
  generatedProposalBundleId: string | null;
  generatedProposalBundleSha256: string | null;
  sourceScreenshotArtifactId: string | null;
  sourceScreenshotContentHash: string | null;
  captureMethod: WebsiteVersionThumbnailCaptureMethod;
  captureConfigVersion: string;
  contractVersion: typeof WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION;
};

export type WebsiteVersionThumbnailArtifact = {
  kind: typeof WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND;
  artifactKind: typeof WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND;
  artifactId: string;
  contractVersion: typeof WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION;
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  versionKind: WebsiteVersionThumbnailVersionKind;
  iterationNumber: number | null;
  sourceArtifactId: string;
  sourceArtifactKind: string;
  generatedProposalBundleId: string | null;
  sourceScreenshotArtifactId: string | null;
  captureMethod: WebsiteVersionThumbnailCaptureMethod;
  captureTimestamp: string;
  viewport: WebsiteVersionThumbnailViewport;
  imageWidth: number;
  imageHeight: number;
  mediaType: WebsiteVersionThumbnailMediaType;
  byteLength: number;
  contentHash: string;
  image: WebsiteVersionThumbnailImage;
  integrity: WebsiteVersionThumbnailIntegrity;
  safetyClassification: "superadmin_private_presentation_derivative";
  immutable: true;
  availability: WebsiteVersionThumbnailAvailability;
  limitations: string[];
  diagnostics: string[];
  lineage: WebsiteVersionThumbnailLineage;
  createdAt: string;
};

export type WebsiteVersionThumbnailValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
