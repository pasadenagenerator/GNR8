import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND,
  WEBSITE_VERSION_THUMBNAIL_CAPTURE_CONFIG_VERSION,
  WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION,
  type WebsiteVersionThumbnailArtifact,
  type WebsiteVersionThumbnailCaptureMethod,
  type WebsiteVersionThumbnailImage,
  type WebsiteVersionThumbnailMediaType,
  type WebsiteVersionThumbnailSource,
  type WebsiteVersionThumbnailValidationResult,
  type WebsiteVersionThumbnailViewport,
} from "./website-version-thumbnail-contract";

const SUPPORTED_MEDIA_TYPES: readonly WebsiteVersionThumbnailMediaType[] = ["image/png", "image/webp", "image/jpeg"];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function imageBytes(image: WebsiteVersionThumbnailImage): Buffer {
  return Buffer.from(image.contentBase64, "base64");
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function deterministicArtifactId(input: {
  source: WebsiteVersionThumbnailSource;
  captureMethod: WebsiteVersionThumbnailCaptureMethod;
  viewport: WebsiteVersionThumbnailViewport;
  imageHash: string;
}): string {
  const identity = {
    contractVersion: WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION,
    captureConfigVersion: WEBSITE_VERSION_THUMBNAIL_CAPTURE_CONFIG_VERSION,
    captureMethod: input.captureMethod,
    siteVersionId: input.source.siteVersionId,
    versionKind: input.source.versionKind,
    iterationNumber: input.source.iterationNumber,
    sourceArtifactId: input.source.sourceArtifactId,
    sourceArtifactKind: input.source.sourceArtifactKind,
    generatedProposalBundleId: input.source.generatedProposalBundleId,
    generatedProposalBundleSha256: input.source.generatedProposalBundleSha256,
    sourceScreenshotArtifactId: input.source.sourceScreenshotArtifactId,
    sourceScreenshotContentHash: input.source.sourceScreenshotContentHash,
    viewport: input.viewport,
    imageHash: input.imageHash,
  };
  return `${WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND}_${sha256Hex(stableStringify(identity)).slice(0, 32)}`;
}

export function buildWebsiteVersionThumbnailArtifact(input: {
  source: WebsiteVersionThumbnailSource;
  captureMethod: WebsiteVersionThumbnailCaptureMethod;
  captureTimestamp: string;
  viewport: WebsiteVersionThumbnailViewport;
  image: Omit<WebsiteVersionThumbnailImage, "byteLength" | "contentHash"> & {
    byteLength?: number;
    contentHash?: string;
  };
  limitations?: string[];
  diagnostics?: string[];
}): WebsiteVersionThumbnailArtifact {
  const body = Buffer.from(input.image.contentBase64, "base64");
  const byteLength = input.image.byteLength ?? body.byteLength;
  const contentHash = input.image.contentHash ?? sha256Hex(body);
  const image: WebsiteVersionThumbnailImage = {
    mediaType: input.image.mediaType,
    width: input.image.width,
    height: input.image.height,
    byteLength,
    contentHash,
    contentBase64: input.image.contentBase64,
  };
  const artifactId = deterministicArtifactId({
    source: input.source,
    captureMethod: input.captureMethod,
    viewport: input.viewport,
    imageHash: contentHash,
  });
  const identityHash = sha256Hex(stableStringify({
    artifactId,
    source: input.source,
    captureMethod: input.captureMethod,
    captureConfigVersion: WEBSITE_VERSION_THUMBNAIL_CAPTURE_CONFIG_VERSION,
    viewport: input.viewport,
    image: { mediaType: image.mediaType, width: image.width, height: image.height, byteLength, contentHash },
  }));

  return {
    kind: WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND,
    artifactKind: WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND,
    artifactId,
    contractVersion: WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION,
    siteVersionId: input.source.siteVersionId,
    sourceSiteId: input.source.sourceSiteId,
    dryRunId: input.source.dryRunId,
    versionKind: input.source.versionKind,
    iterationNumber: input.source.iterationNumber,
    sourceArtifactId: input.source.sourceArtifactId,
    sourceArtifactKind: input.source.sourceArtifactKind,
    generatedProposalBundleId: input.source.generatedProposalBundleId,
    sourceScreenshotArtifactId: input.source.sourceScreenshotArtifactId,
    captureMethod: input.captureMethod,
    captureTimestamp: input.captureTimestamp,
    viewport: cloneJson(input.viewport),
    imageWidth: image.width,
    imageHeight: image.height,
    mediaType: image.mediaType,
    byteLength,
    contentHash,
    image,
    integrity: {
      algorithm: "sha256",
      contentHash,
      identityHash,
      byteLength,
    },
    safetyClassification: "superadmin_private_presentation_derivative",
    immutable: true,
    availability: {
      status: "ready",
      safeServing: true,
      reason: null,
    },
    limitations: input.limitations ?? [],
    diagnostics: input.diagnostics ?? [],
    lineage: {
      ...cloneJson(input.source),
      captureMethod: input.captureMethod,
      captureConfigVersion: WEBSITE_VERSION_THUMBNAIL_CAPTURE_CONFIG_VERSION,
      contractVersion: WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION,
    },
    createdAt: input.captureTimestamp,
  };
}

export function validateWebsiteVersionThumbnailArtifact(value: unknown): WebsiteVersionThumbnailValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const artifact = value as Partial<WebsiteVersionThumbnailArtifact>;
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["artifact must be an object"], warnings };
  if (artifact.kind !== WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND) errors.push("kind must be website_version_thumbnail");
  if (artifact.artifactKind !== WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND) errors.push("artifactKind must be website_version_thumbnail");
  if (artifact.contractVersion !== WEBSITE_VERSION_THUMBNAIL_CONTRACT_VERSION) errors.push("contractVersion must be WVT-1");
  if (!hasText(artifact.artifactId)) errors.push("artifactId is required");
  if (!hasText(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (artifact.immutable !== true) errors.push("immutable must be true");
  if (artifact.safetyClassification !== "superadmin_private_presentation_derivative") errors.push("safetyClassification must remain private presentation derivative");
  if (artifact.versionKind !== "original_source" && artifact.versionKind !== "generated_iteration") errors.push("versionKind is invalid");
  if (artifact.versionKind === "original_source" && artifact.iterationNumber !== null) errors.push("original_source iterationNumber must be null");
  if (artifact.versionKind === "generated_iteration" && typeof artifact.iterationNumber !== "number") errors.push("generated_iteration iterationNumber is required");
  if (artifact.captureMethod !== "reused_evidence_capture_screenshot" && artifact.captureMethod !== "rendered_durable_generated_preview") errors.push("captureMethod is invalid");
  if (!SUPPORTED_MEDIA_TYPES.includes(artifact.mediaType as WebsiteVersionThumbnailMediaType)) errors.push("mediaType is unsupported");
  if (!Number.isInteger(artifact.imageWidth) || Number(artifact.imageWidth) <= 0) errors.push("imageWidth must be positive");
  if (!Number.isInteger(artifact.imageHeight) || Number(artifact.imageHeight) <= 0) errors.push("imageHeight must be positive");
  if (!Number.isInteger(artifact.byteLength) || Number(artifact.byteLength) <= 0) errors.push("byteLength must be positive");
  if (!hasText(artifact.contentHash)) errors.push("contentHash is required");
  if (!artifact.image?.contentBase64) errors.push("image.contentBase64 is required");
  if (artifact.image) {
    const body = imageBytes(artifact.image as WebsiteVersionThumbnailImage);
    if (body.byteLength !== artifact.byteLength) errors.push("byteLength must match image bytes");
    if (sha256Hex(body) !== artifact.contentHash) errors.push("contentHash must match image bytes");
    if (artifact.image.width !== artifact.imageWidth) errors.push("image.width must match imageWidth");
    if (artifact.image.height !== artifact.imageHeight) errors.push("image.height must match imageHeight");
    if (artifact.image.mediaType !== artifact.mediaType) errors.push("image.mediaType must match mediaType");
  }
  if (artifact.integrity?.algorithm !== "sha256") errors.push("integrity.algorithm must be sha256");
  if (artifact.integrity?.contentHash !== artifact.contentHash) errors.push("integrity.contentHash must match contentHash");
  if (artifact.integrity?.byteLength !== artifact.byteLength) errors.push("integrity.byteLength must match byteLength");
  if (artifact.availability?.status === "ready" && artifact.availability.safeServing !== true) errors.push("ready thumbnails must be safely servable");
  if (artifact.lineage?.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (artifact.lineage?.versionKind !== artifact.versionKind) errors.push("lineage.versionKind must match versionKind");
  if (artifact.lineage?.captureMethod !== artifact.captureMethod) errors.push("lineage.captureMethod must match captureMethod");
  if (artifact.versionKind === "generated_iteration" && !artifact.generatedProposalBundleId) errors.push("generated thumbnail must include generatedProposalBundleId");
  if (artifact.versionKind === "original_source" && !artifact.sourceScreenshotArtifactId) errors.push("original thumbnail must include sourceScreenshotArtifactId");
  if (artifact.sourceArtifactKind === "imported_source_photo" || artifact.sourceArtifactKind === "representative_source_asset") {
    errors.push("thumbnail source cannot be a representative source photograph");
  }
  if (artifact.diagnostics?.some((item) => /approved|published|deployment/i.test(String(item)))) {
    warnings.push("diagnostics should not imply approval, publishing, or deployment truth");
  }
  return { valid: errors.length === 0, errors, warnings };
}
