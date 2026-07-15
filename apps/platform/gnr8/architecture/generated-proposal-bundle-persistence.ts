import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

export const GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND = "generated_proposal_bundle" as const;
export const GENERATED_PROPOSAL_BUNDLE_RUNTIME_VERSION = "P0-DURABLE-GENERATED-PROPOSAL-PREVIEW" as const;

export type GeneratedProposalBundleIteration = 1 | 2;

export type GeneratedProposalBundleAssetRole =
  | "entry_html"
  | "css"
  | "js"
  | "image"
  | "font"
  | "icon"
  | "manifest"
  | "metadata"
  | "other";

export type GeneratedProposalBundleAsset = {
  relativePath: string;
  contentType: string;
  role: GeneratedProposalBundleAssetRole;
  byteSize: number;
  sha256: string;
  contentBase64: string;
};

export type GeneratedProposalBundleLineage = {
  siteVersionId: string;
  dryRunId: string;
  iteration: GeneratedProposalBundleIteration;
  generatedWebsiteProposalId: string;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
  sourceStorageReference: string;
  importedAt: string;
};

export type GeneratedProposalBundlePreviewMetadata = {
  entryFile: "source/index.html";
  previewBoundary: "superadmin_read_only_no_store";
  reconstructsFromPersistedBundleOnly: true;
};

export type GeneratedProposalBundleArtifactRecord = {
  kind: typeof GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND;
  artifactKind: typeof GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  siteVersionId: string;
  dryRunId: string;
  iteration: GeneratedProposalBundleIteration;
  generatedWebsiteProposalId: string;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
  immutable: true;
  entryFile: "source/index.html";
  assetCount: number;
  byteSize: number;
  bundleSha256: string;
  contentTypes: Record<string, string>;
  relativePathMap: Record<string, string>;
  lineage: GeneratedProposalBundleLineage;
  preview: GeneratedProposalBundlePreviewMetadata;
  manifest: Record<string, unknown> | null;
  assets: GeneratedProposalBundleAsset[];
  runtimeVersion: typeof GENERATED_PROPOSAL_BUNDLE_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  validation: GeneratedProposalBundleValidationResult;
  diagnostics: string[];
};

export type GeneratedProposalBundleArtifactReference = Omit<GeneratedProposalBundleArtifactRecord, "assets">;

export type GeneratedProposalBundleProvenanceSummary = RuntimeImportProvenanceSummary & {
  generatedProposalBundleArtifacts?: GeneratedProposalBundleArtifactRecord[];
  latestGeneratedProposalBundleArtifact?: GeneratedProposalBundleArtifactRecord | null;
};

export type GeneratedProposalBundleValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GeneratedProposalBundlePersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GeneratedProposalBundlePersistenceValidationError extends Error {
  readonly validation: GeneratedProposalBundleValidationResult;

  constructor(validation: GeneratedProposalBundleValidationResult) {
    super("Generated Proposal Bundle artifact is invalid and was not persisted.");
    this.name = "GeneratedProposalBundlePersistenceValidationError";
    this.validation = validation;
  }
}

export class GeneratedProposalBundleResolutionError extends Error {
  readonly code: "PATH_TRAVERSAL_REJECTED" | "ASSET_NOT_FOUND";
  readonly status: 400 | 404;

  constructor(input: { code: GeneratedProposalBundleResolutionError["code"]; status: GeneratedProposalBundleResolutionError["status"]; message: string }) {
    super(input.message);
    this.name = "GeneratedProposalBundleResolutionError";
    this.code = input.code;
    this.status = input.status;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRelativePath(value: string): string | null {
  const normalized = path.posix.normalize(String(value ?? "").replaceAll("\\", "/"));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) return null;
  return normalized;
}

export function normalizeGeneratedProposalPreviewAssetPath(assetPathSegments: readonly string[] | undefined): string | null {
  const rawSegments = assetPathSegments && assetPathSegments.length > 0
    ? assetPathSegments
    : ["source", "index.html"];
  const decodedSegments: string[] = [];

  for (const rawSegment of rawSegments) {
    let segment = rawSegment;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      path.isAbsolute(segment)
    ) return null;
    decodedSegments.push(segment);
  }

  const normalized = normalizeRelativePath(decodedSegments.join("/"));
  if (!normalized || !normalized.startsWith("source/")) return null;
  return normalized;
}

function contentTypeFor(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".ico") return "image/x-icon";
  if (extension === ".woff") return "font/woff";
  if (extension === ".woff2") return "font/woff2";
  if (extension === ".ttf") return "font/ttf";
  if (extension === ".otf") return "font/otf";
  if (extension === ".json" || relativePath.endsWith("manifest.webmanifest")) return "application/json; charset=utf-8";
  if (extension === ".txt" || extension === ".md") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function roleFor(relativePath: string): GeneratedProposalBundleAssetRole {
  const extension = path.extname(relativePath).toLowerCase();
  if (relativePath === "source/index.html") return "entry_html";
  if (extension === ".css") return "css";
  if (extension === ".js") return "js";
  if ([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) return "image";
  if (extension === ".ico") return "icon";
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(extension)) return "font";
  if (extension === ".json" || relativePath.endsWith("manifest.webmanifest")) return "manifest";
  if ([".md", ".txt"].includes(extension)) return "metadata";
  return "other";
}

function assetBody(asset: GeneratedProposalBundleAsset): Buffer {
  return Buffer.from(asset.contentBase64, "base64");
}

function validateAsset(asset: GeneratedProposalBundleAsset, errors: string[], warnings: string[]): void {
  const relativePath = normalizeRelativePath(asset.relativePath);
  if (!relativePath || relativePath !== asset.relativePath) {
    errors.push(`asset.relativePath is invalid: ${asset.relativePath}`);
    return;
  }
  if (!asset.contentType) errors.push(`asset ${asset.relativePath} must include contentType`);
  if (!asset.sha256) errors.push(`asset ${asset.relativePath} must include sha256`);
  const body = assetBody(asset);
  if (body.byteLength !== asset.byteSize) errors.push(`asset ${asset.relativePath} byteSize does not match content`);
  const actualHash = sha256Hex(body);
  if (actualHash !== asset.sha256) errors.push(`asset ${asset.relativePath} sha256 does not match content`);
  if (asset.role === "other") warnings.push(`asset ${asset.relativePath} has generic role`);
}

export function validateGeneratedProposalBundle(
  artifact: GeneratedProposalBundleArtifactRecord,
): GeneratedProposalBundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (artifact.kind !== GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND) errors.push("kind must be generated_proposal_bundle");
  if (artifact.artifactKind !== GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND) errors.push("artifactKind must be generated_proposal_bundle");
  if (artifact.artifactVersion !== 1) errors.push("artifactVersion must be 1");
  if (artifact.immutable !== true) errors.push("immutable must be true");
  if (artifact.entryFile !== "source/index.html") errors.push("entryFile must be source/index.html");
  if (artifact.preview.reconstructsFromPersistedBundleOnly !== true) {
    errors.push("preview must reconstruct from persisted bundle only");
  }
  if (artifact.siteVersionId !== artifact.lineage.siteVersionId) errors.push("siteVersionId must match lineage.siteVersionId");
  if (artifact.dryRunId !== artifact.lineage.dryRunId) errors.push("dryRunId must match lineage.dryRunId");
  if (artifact.iteration !== artifact.lineage.iteration) errors.push("iteration must match lineage.iteration");
  if (artifact.generatedWebsiteProposalId !== artifact.lineage.generatedWebsiteProposalId) {
    errors.push("generatedWebsiteProposalId must match lineage.generatedWebsiteProposalId");
  }
  if (artifact.generatedWebsiteProposalArtifactId !== artifact.lineage.generatedWebsiteProposalArtifactId) {
    errors.push("generatedWebsiteProposalArtifactId must match lineage.generatedWebsiteProposalArtifactId");
  }
  if (artifact.outputBundleId !== artifact.lineage.outputBundleId) errors.push("outputBundleId must match lineage.outputBundleId");
  if (!Array.isArray(artifact.assets) || artifact.assets.length === 0) errors.push("assets must be a non-empty array");

  const seen = new Set<string>();
  let totalBytes = 0;
  const contentTypes: Record<string, string> = {};
  const relativePathMap: Record<string, string> = {};
  for (const asset of artifact.assets) {
    validateAsset(asset, errors, warnings);
    if (seen.has(asset.relativePath)) errors.push(`asset path is duplicated: ${asset.relativePath}`);
    seen.add(asset.relativePath);
    totalBytes += asset.byteSize;
    contentTypes[asset.relativePath] = asset.contentType;
    relativePathMap[asset.relativePath] = asset.sha256;
  }
  if (!seen.has("source/index.html")) errors.push("assets must include source/index.html");
  if (!artifact.assets.some((asset) => asset.role === "css")) warnings.push("bundle contains no CSS asset");
  if (!artifact.assets.some((asset) => asset.role === "js")) warnings.push("bundle contains no JS asset");
  if (!artifact.assets.some((asset) => asset.role === "image" || asset.role === "icon")) warnings.push("bundle contains no image or icon asset");
  if (!artifact.assets.some((asset) => asset.role === "font")) warnings.push("bundle contains no font asset");
  if (!artifact.assets.some((asset) => asset.role === "manifest")) warnings.push("bundle contains no manifest asset");

  const bundleSha256 = sha256Hex(stableStringify(artifact.assets.map((asset) => ({
    relativePath: asset.relativePath,
    contentType: asset.contentType,
    role: asset.role,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
  }))));
  if (artifact.assetCount !== artifact.assets.length) errors.push("assetCount must match assets length");
  if (artifact.byteSize !== totalBytes) errors.push("byteSize must match asset byte total");
  if (artifact.bundleSha256 !== bundleSha256) errors.push("bundleSha256 must match asset inventory");
  if (stableStringify(artifact.contentTypes) !== stableStringify(contentTypes)) errors.push("contentTypes must match assets");
  if (stableStringify(artifact.relativePathMap) !== stableStringify(relativePathMap)) errors.push("relativePathMap must match assets");

  return { valid: errors.length === 0, errors, warnings };
}

function createArtifactId(input: {
  siteVersionId: string;
  iteration: GeneratedProposalBundleIteration;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
  bundleSha256: string;
}): string {
  return `generated_proposal_bundle_${sha256Hex(stableStringify(input)).slice(0, 32)}`;
}

function bundleFingerprint(artifact: GeneratedProposalBundleArtifactRecord): string {
  return sha256Hex(stableStringify({
    siteVersionId: artifact.siteVersionId,
    dryRunId: artifact.dryRunId,
    iteration: artifact.iteration,
    generatedWebsiteProposalArtifactId: artifact.generatedWebsiteProposalArtifactId,
    outputBundleId: artifact.outputBundleId,
    bundleSha256: artifact.bundleSha256,
    relativePathMap: artifact.relativePathMap,
    runtimeVersion: artifact.runtimeVersion,
  }));
}

function isValidArtifact(value: unknown): value is GeneratedProposalBundleArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GeneratedProposalBundleArtifactRecord>;
  if (record.kind !== GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (record.immutable !== true) return false;
  if (!Array.isArray(record.assets)) return false;
  return validateGeneratedProposalBundle(record as GeneratedProposalBundleArtifactRecord).valid;
}

function readArtifacts(summary: RuntimeImportProvenanceSummary | null | undefined): GeneratedProposalBundleArtifactRecord[] {
  const provenance = summary as GeneratedProposalBundleProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generatedProposalBundleArtifacts)
    ? provenance.generatedProposalBundleArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as GeneratedProposalBundleProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generatedProposalBundleArtifacts)
    ? provenance.generatedProposalBundleArtifacts
    : [];
}

function selectLatestBundle(input: {
  artifacts: GeneratedProposalBundleArtifactRecord[];
  siteVersionId: string;
  iteration: GeneratedProposalBundleIteration;
}): GeneratedProposalBundleArtifactRecord | null {
  return input.artifacts
    .filter((artifact) => artifact.siteVersionId === input.siteVersionId && artifact.iteration === input.iteration)
    .slice()
    .sort((left, right) => left.persistedAt.localeCompare(right.persistedAt) || left.artifactId.localeCompare(right.artifactId))
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

function toReference(artifact: GeneratedProposalBundleArtifactRecord): GeneratedProposalBundleArtifactReference {
  const { assets: _assets, ...reference } = artifact;
  return cloneJson(reference);
}

export function buildGeneratedProposalBundleArtifact(input: {
  siteVersionId: string;
  dryRunId: string;
  iteration: GeneratedProposalBundleIteration;
  generatedWebsiteProposalId: string;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
  sourceStorageReference: string;
  importedAt: string;
  assets: GeneratedProposalBundleAsset[];
  manifest?: Record<string, unknown> | null;
  persistedAt?: string;
}): GeneratedProposalBundleArtifactRecord {
  const assets = input.assets
    .map((asset) => cloneJson(asset))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const contentTypes = Object.fromEntries(assets.map((asset) => [asset.relativePath, asset.contentType]));
  const relativePathMap = Object.fromEntries(assets.map((asset) => [asset.relativePath, asset.sha256]));
  const byteSize = assets.reduce((total, asset) => total + asset.byteSize, 0);
  const bundleSha256 = sha256Hex(stableStringify(assets.map((asset) => ({
    relativePath: asset.relativePath,
    contentType: asset.contentType,
    role: asset.role,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
  }))));
  const persistedAt = input.persistedAt ?? input.importedAt;
  const artifact: GeneratedProposalBundleArtifactRecord = {
    kind: GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND,
    artifactKind: GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      siteVersionId: input.siteVersionId,
      iteration: input.iteration,
      generatedWebsiteProposalArtifactId: input.generatedWebsiteProposalArtifactId,
      outputBundleId: input.outputBundleId,
      bundleSha256,
    }),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    iteration: input.iteration,
    generatedWebsiteProposalId: input.generatedWebsiteProposalId,
    generatedWebsiteProposalArtifactId: input.generatedWebsiteProposalArtifactId,
    outputBundleId: input.outputBundleId,
    bundleLabel: input.bundleLabel,
    immutable: true,
    entryFile: "source/index.html",
    assetCount: assets.length,
    byteSize,
    bundleSha256,
    contentTypes,
    relativePathMap,
    lineage: {
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
      iteration: input.iteration,
      generatedWebsiteProposalId: input.generatedWebsiteProposalId,
      generatedWebsiteProposalArtifactId: input.generatedWebsiteProposalArtifactId,
      outputBundleId: input.outputBundleId,
      sourceStorageReference: input.sourceStorageReference,
      importedAt: input.importedAt,
    },
    preview: {
      entryFile: "source/index.html",
      previewBoundary: "superadmin_read_only_no_store",
      reconstructsFromPersistedBundleOnly: true,
    },
    manifest: input.manifest ?? null,
    assets,
    runtimeVersion: GENERATED_PROPOSAL_BUNDLE_RUNTIME_VERSION,
    createdAt: input.importedAt,
    persistedAt,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["GENERATED_PROPOSAL_BUNDLE_IMMUTABLE", "PREVIEW_RECONSTRUCTS_FROM_PERSISTED_BUNDLE_ONLY"],
  };
  artifact.validation = validateGeneratedProposalBundle(artifact);
  return artifact;
}

async function collectFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, absolutePath));
    else if (entry.isFile()) files.push(path.relative(root, absolutePath).replaceAll(path.sep, "/"));
  }
  return files;
}

export async function buildGeneratedProposalBundleArtifactFromDirectory(input: {
  rootDirectory: string;
  siteVersionId: string;
  dryRunId: string;
  iteration: GeneratedProposalBundleIteration;
  generatedWebsiteProposalId: string;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
  sourceStorageReference: string;
  importedAt: string;
  persistedAt?: string;
}): Promise<GeneratedProposalBundleArtifactRecord> {
  const root = path.resolve(input.rootDirectory);
  const files = await collectFiles(root);
  const assets: GeneratedProposalBundleAsset[] = [];
  let manifest: Record<string, unknown> | null = null;
  for (const relativePath of files) {
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized) continue;
    const absolutePath = path.resolve(root, ...normalized.split("/"));
    const fileStat = await stat(absolutePath);
    const body = await readFile(absolutePath);
    if (normalized === "proposal-manifest.json") {
      try {
        manifest = JSON.parse(body.toString("utf8")) as Record<string, unknown>;
      } catch {
        manifest = null;
      }
    }
    assets.push({
      relativePath: normalized,
      contentType: contentTypeFor(normalized),
      role: roleFor(normalized),
      byteSize: fileStat.size,
      sha256: sha256Hex(body),
      contentBase64: body.toString("base64"),
    });
  }
  return buildGeneratedProposalBundleArtifact({ ...input, assets, manifest });
}

export async function persistGeneratedProposalBundle(input: {
  siteVersionId: string;
  artifact: GeneratedProposalBundleArtifactRecord;
  options?: GeneratedProposalBundlePersistenceOptions;
}): Promise<GeneratedProposalBundleArtifactReference> {
  const validation = validateGeneratedProposalBundle(input.artifact);
  if (!validation.valid) throw new GeneratedProposalBundlePersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generated Proposal Bundle persistence: ${input.siteVersionId}`);
  }

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latest = selectLatestBundle({
    artifacts: previousArtifacts,
    siteVersionId: input.siteVersionId,
    iteration: input.artifact.iteration,
  });
  if (latest && bundleFingerprint(latest) === bundleFingerprint(input.artifact)) {
    return toReference(latest);
  }

  const persistedAt = options.persistedAt ?? input.artifact.persistedAt;
  const artifactRecord: GeneratedProposalBundleArtifactRecord = {
    ...cloneJson(input.artifact),
    persistedAt,
    validation,
  };

  const nextSummary: GeneratedProposalBundleProvenanceSummary = {
    ...existingSummary,
    generatedProposalBundleArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GeneratedProposalBundleArtifactRecord[],
    latestGeneratedProposalBundleArtifact: artifactRecord,
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
  if (write.affectedRows <= 0) {
    throw new Error(`Generated Proposal Bundle persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toReference(artifactRecord);
}

export async function loadGeneratedProposalBundleByIteration(input: {
  siteVersionId: string;
  iteration: GeneratedProposalBundleIteration;
  options?: GeneratedProposalBundlePersistenceOptions;
}): Promise<GeneratedProposalBundleArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = selectLatestBundle({
    artifacts: readArtifacts(siteVersion.importProvenanceSummary),
    siteVersionId: input.siteVersionId,
    iteration: input.iteration,
  });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadGeneratedProposalBundleById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GeneratedProposalBundlePersistenceOptions;
}): Promise<GeneratedProposalBundleArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}

export function resolveGeneratedProposalBundleAsset(input: {
  artifact: GeneratedProposalBundleArtifactRecord;
  assetPathSegments?: readonly string[];
}): {
  relativePath: string;
  contentType: string;
  body: ArrayBuffer;
} {
  const relativePath = normalizeGeneratedProposalPreviewAssetPath(input.assetPathSegments);
  if (!relativePath) {
    throw new GeneratedProposalBundleResolutionError({
      code: "PATH_TRAVERSAL_REJECTED",
      status: 400,
      message: "Preview asset path was rejected.",
    });
  }
  const asset = input.artifact.assets.find((candidate) => candidate.relativePath === relativePath);
  if (!asset) {
    throw new GeneratedProposalBundleResolutionError({
      code: "ASSET_NOT_FOUND",
      status: 404,
      message: "Preview asset was not found.",
    });
  }
  const buffer = assetBody(asset);
  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return { relativePath, contentType: asset.contentType, body };
}
