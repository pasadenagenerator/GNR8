import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  validateWebsiteVersionThumbnailArtifact,
} from "./website-version-thumbnail-builder";
import {
  WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND,
  type WebsiteVersionThumbnailArtifact,
  type WebsiteVersionThumbnailValidationResult,
} from "./website-version-thumbnail-contract";

export type WebsiteVersionThumbnailProvenanceSummary = RuntimeImportProvenanceSummary & {
  websiteVersionThumbnailArtifacts?: WebsiteVersionThumbnailArtifact[];
  latestWebsiteVersionThumbnailArtifact?: WebsiteVersionThumbnailArtifact | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type WebsiteVersionThumbnailPersistenceOptions = RuntimeStoreDbOptions & {
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class WebsiteVersionThumbnailPersistenceValidationError extends Error {
  readonly validation: WebsiteVersionThumbnailValidationResult;

  constructor(validation: WebsiteVersionThumbnailValidationResult) {
    super("Website Version Thumbnail artifact is invalid and was not persisted.");
    this.name = "WebsiteVersionThumbnailPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidArtifact(value: unknown): value is WebsiteVersionThumbnailArtifact {
  if (!isRecord(value)) return false;
  const artifact = value as Partial<WebsiteVersionThumbnailArtifact>;
  if (artifact.kind !== WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND) return false;
  if (artifact.artifactKind !== WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND) return false;
  return validateWebsiteVersionThumbnailArtifact(value).valid;
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as WebsiteVersionThumbnailProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.websiteVersionThumbnailArtifacts)
    ? provenance.websiteVersionThumbnailArtifacts
    : [];
}

function readArtifacts(summary: RuntimeImportProvenanceSummary | null | undefined): WebsiteVersionThumbnailArtifact[] {
  return readStoredArtifactValues(summary).filter(isValidArtifact);
}

function currentReady(artifact: WebsiteVersionThumbnailArtifact): boolean {
  return artifact.availability.status === "ready" && artifact.availability.safeServing === true;
}

function sortArtifacts(artifacts: WebsiteVersionThumbnailArtifact[]): WebsiteVersionThumbnailArtifact[] {
  return artifacts.slice().sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.artifactId.localeCompare(right.artifactId));
}

function selectLatestOriginal(artifacts: WebsiteVersionThumbnailArtifact[], siteVersionId: string): WebsiteVersionThumbnailArtifact | null {
  return sortArtifacts(artifacts)
    .filter((artifact) => artifact.siteVersionId === siteVersionId && artifact.versionKind === "original_source" && currentReady(artifact))
    .at(-1) ?? null;
}

function selectLatestGenerated(artifacts: WebsiteVersionThumbnailArtifact[], siteVersionId: string, iteration: number): WebsiteVersionThumbnailArtifact | null {
  return sortArtifacts(artifacts)
    .filter((artifact) => artifact.siteVersionId === siteVersionId && artifact.versionKind === "generated_iteration" && artifact.iterationNumber === iteration && currentReady(artifact))
    .at(-1) ?? null;
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions): Promise<PersistenceSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultSetSiteVersionImportProvenanceSummary(
  input: { siteVersionId: string; importProvenanceSummary: RuntimeImportProvenanceSummary },
  options: RuntimeStoreDbOptions,
): Promise<{ affectedRows: number }> {
  const { setSiteVersionImportProvenanceSummary } = await import("../runtime/runtime-store");
  return setSiteVersionImportProvenanceSummary(input, options);
}

export function getWebsiteVersionThumbnailArtifacts(summary: RuntimeImportProvenanceSummary | null | undefined): WebsiteVersionThumbnailArtifact[] {
  return readArtifacts(summary).map(cloneJson);
}

export async function persistWebsiteVersionThumbnail(input: {
  siteVersionId: string;
  artifact: WebsiteVersionThumbnailArtifact;
  options?: WebsiteVersionThumbnailPersistenceOptions;
}): Promise<WebsiteVersionThumbnailArtifact> {
  const validation = validateWebsiteVersionThumbnailArtifact(input.artifact);
  if (!validation.valid) throw new WebsiteVersionThumbnailPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) throw new Error(`Runtime site version not found for Website Version Thumbnail persistence: ${input.siteVersionId}`);

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const existing = readArtifacts(existingSummary).find((artifact) => artifact.artifactId === input.artifact.artifactId);
  if (existing) return cloneJson(existing);

  const artifactRecord = cloneJson(input.artifact);
  const nextSummary: WebsiteVersionThumbnailProvenanceSummary = {
    ...existingSummary,
    websiteVersionThumbnailArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as WebsiteVersionThumbnailArtifact[],
    latestWebsiteVersionThumbnailArtifact: artifactRecord,
  };

  const write = options.setSiteVersionImportProvenanceSummary
    ? await options.setSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      })
    : await defaultSetSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      }, options);
  if (write.affectedRows <= 0) throw new Error(`Website Version Thumbnail persistence affected 0 rows for site version ${input.siteVersionId}`);
  return cloneJson(artifactRecord);
}

export async function loadWebsiteVersionThumbnailById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: WebsiteVersionThumbnailPersistenceOptions;
}): Promise<WebsiteVersionThumbnailArtifact | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}

export async function loadOriginalWebsiteVersionThumbnail(input: {
  siteVersionId: string;
  options?: WebsiteVersionThumbnailPersistenceOptions;
}): Promise<WebsiteVersionThumbnailArtifact | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = selectLatestOriginal(readArtifacts(siteVersion.importProvenanceSummary), input.siteVersionId);
  return artifact ? cloneJson(artifact) : null;
}

export async function loadGeneratedWebsiteVersionThumbnail(input: {
  siteVersionId: string;
  iteration: number;
  options?: WebsiteVersionThumbnailPersistenceOptions;
}): Promise<WebsiteVersionThumbnailArtifact | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = selectLatestGenerated(readArtifacts(siteVersion.importProvenanceSummary), input.siteVersionId, input.iteration);
  return artifact ? cloneJson(artifact) : null;
}

export function thumbnailBody(artifact: WebsiteVersionThumbnailArtifact): Buffer {
  return Buffer.from(artifact.image.contentBase64, "base64");
}
