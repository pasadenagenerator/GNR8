import { RESOURCE_RECORD_VERSION, RESOURCE_CONVERSION_VERSION, validateReviewedDescriptors, validateReviewedExport, exportHtmlByPath, type AstroExportResource, type AstroExportResourceRef } from "./astro-export-resources";
import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
  computeAstroInternalPreviewCandidateContentSha256,
  isAstroInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import { isGeneratedOutputRoutePath } from "./generated-output-route-path";
import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";
import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type {GeneratedGitRef} from "../site/generated-artifact-git-cache";
import {
  ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
  ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
  ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES,
  ASTRO_PRODUCTION_CANDIDATE_STORAGE,
  AstroProductionCandidateValidationError,
  isAstroProductionCandidate,
  validateAstroProductionCandidateIdentity,
  validateAstroProductionCandidateRecord,
  validateSelfContainedAstroProductionPayload,
  type AstroProductionCandidateIdentity,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRegistration,
  type AstroProductionCandidateRegistrationContext,
} from "./astro-production-candidate-record";

export const ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION =
  "gnr8-astro-persisted-preview-candidate:v3" as const;
export const ASTRO_OBJECT_CANDIDATE_RECORD_KIND =
  "astro_internal_preview_candidate_object_record" as const;
export const ASTRO_OBJECT_CANDIDATE_STORAGE = "supabase_storage" as const;
export const ASTRO_OBJECT_CANDIDATE_MEDIA_TYPE = "text/html; charset=utf-8" as const;
export const ASTRO_OBJECT_CANDIDATE_STYLES_MEDIA_TYPE = "text/css; charset=utf-8" as const;

const TEXT_MAX_CHARACTERS = 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ISO_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export type AstroCandidateRouteObjectRef = {
  routePath: string;
  bucket: string;
  key: string;
  sha256: string;
  sizeBytes: number;
  mediaType: typeof ASTRO_OBJECT_CANDIDATE_MEDIA_TYPE;
};

export type AstroCandidateStylesObjectRef = {
  kind: "compiled_token_styles";
  bucket: string;
  key: string;
  sha256: string;
  sizeBytes: number;
  mediaType: typeof ASTRO_OBJECT_CANDIDATE_STYLES_MEDIA_TYPE;
};

export type AstroCandidateStoredObjectRef = AstroCandidateRouteObjectRef | AstroCandidateStylesObjectRef | AstroExportResourceRef;

export type AstroObjectBackedCandidatePayload = Omit<
  AstroInternalPreviewCandidate,
  "htmlByPath" | "manifest" | "compiledTokenStyles" | "exportedFiles"
> & {
  resourcePayloads?: AstroExportResourceRef[];
  routePayloads: Record<string, AstroCandidateRouteObjectRef> & { "/": AstroCandidateRouteObjectRef };
  compiledTokenStyles: string | AstroCandidateStylesObjectRef;
  manifest: Omit<AstroInternalPreviewCandidate["manifest"], "lifecycle"> & {
    lifecycle: {
      storage: typeof ASTRO_OBJECT_CANDIDATE_STORAGE;
      lifetime: typeof ASTRO_PRODUCTION_CANDIDATE_LIFETIME;
      durableRegistration: true;
    };
  };
};

export type AstroObjectBackedCandidateRecord = {
  schemaVersion: typeof ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION | typeof RESOURCE_RECORD_VERSION;
  recordKind: typeof ASTRO_OBJECT_CANDIDATE_RECORD_KIND;
  identity: AstroProductionCandidateIdentity;
  registration: AstroProductionCandidateRegistration;
  candidate: AstroObjectBackedCandidatePayload;
  generatedGitArchive?: GeneratedGitRef;
  storageSha256: string;
};

export type AstroObjectBackedResolvedCandidate = Omit<
  AstroObjectBackedCandidatePayload,
  "routePayloads" | "compiledTokenStyles" | "resourcePayloads"
> & {
  exportedFiles?: AstroExportResource[];
  htmlByPath: Record<string, string> & { "/": string };
  compiledTokenStyles: string;
};

export type AstroObjectBackedResolvedRecord = Omit<AstroObjectBackedCandidateRecord, "candidate"> & {
  candidate: AstroObjectBackedResolvedCandidate;
  objectManifest: Record<string, AstroCandidateRouteObjectRef> & { "/": AstroCandidateRouteObjectRef };
  stylesObjectRef: AstroCandidateStylesObjectRef | null;
  resourceObjectRefs?: AstroExportResourceRef[];
};

export type AstroPersistedCandidateRecord =
  | import("./astro-production-candidate-record").AstroProductionCandidateRecord
  | AstroObjectBackedCandidateRecord;

export type AstroResolvedCandidateRecord =
  | import("./astro-production-candidate-record").AstroProductionCandidateRecord
  | AstroObjectBackedResolvedRecord;

export type AstroCandidateObjectUpload = {
  ref: AstroCandidateStoredObjectRef;
  bytes: Uint8Array;
};

export type AstroObjectBackedCandidateMeasurements = {
  registryRecordUtf8Bytes: number;
  resolvedCandidateUtf8Bytes: number;
  objectPayloadUtf8Bytes: number;
};

export type PreparedAstroObjectBackedCandidateRecord = {
  record: AstroObjectBackedCandidateRecord;
  uploads: AstroCandidateObjectUpload[];
  measurements: AstroObjectBackedCandidateMeasurements;
};

export function prepareAstroObjectBackedCandidateRecord(input: {
  candidate: AstroInternalPreviewCandidate;
  ownership: AstroProductionCandidateOwnership;
  registration: AstroProductionCandidateRegistrationContext;
  storedAt: string;
  bucket: string;
  generatedGitArchive?: GeneratedGitRef;
}): PreparedAstroObjectBackedCandidateRecord {
  if (!isAstroInternalPreviewCandidate(input.candidate)) {
    throw corrupt("Source candidate failed the established candidate validation contract.");
  }
  const routeEntries = Object.entries(input.candidate.htmlByPath)
    .sort(([left], [right]) => left.localeCompare(right));
  if (routeEntries.length < 1) {
    throw unsupported("Object-backed candidate storage requires a root route.");
  }
  const identity = validateAstroProductionCandidateIdentity({
    candidateId: input.candidate.id,
    ...input.ownership,
  });
  if (
    input.candidate.siteId !== identity.runtimeSiteId ||
    input.candidate.siteVersionId !== identity.siteVersionId
  ) {
    throw new AstroProductionCandidateValidationError(
      "ownership_mismatch",
      "Candidate runtime ownership does not match the supplied authoritative scope.",
    );
  }
  const bucket = boundedText(input.bucket, "candidate object bucket");
  const routeUploads = routeEntries.map(([routePath, html]) => {
    if (!input.candidate.exportedFiles) validateSelfContainedAstroProductionPayload({
      html,
      compiledTokenStyles: input.candidate.compiledTokenStyles,
    });
    const bytes = Buffer.from(html, "utf8");
    const sha256 = sha256Hex(bytes);
    const key = objectKeyFor({ identity, routePath, sha256 });
    return {
      ref: {
        routePath,
        bucket,
        key,
        sha256,
        sizeBytes: bytes.byteLength,
        mediaType: ASTRO_OBJECT_CANDIDATE_MEDIA_TYPE,
      },
      bytes,
    };
  });
  const routePayloads = Object.fromEntries(routeUploads.map((upload) => [upload.ref.routePath, upload.ref]));
  const compiledStylesBytes = Buffer.from(input.candidate.compiledTokenStyles, "utf8");
  const stylesUpload = compiledStylesBytes.byteLength > 0
    ? createStylesUpload({ identity, bucket, bytes: compiledStylesBytes })
    : null;
  const uploads: AstroCandidateObjectUpload[] = stylesUpload
    ? [...routeUploads, stylesUpload]
    : routeUploads;
  const resourceUploads: AstroCandidateObjectUpload[] = (input.candidate.exportedFiles ?? []).map(({base64,...file})=>({
    ref:{...file,kind:'export_resource',bucket,key:resourceObjectKey(identity,file.path,file.sha256)},bytes:Buffer.from(base64,'base64'),
  }));
  uploads.push(...resourceUploads);
  const registration = validateRegistration({ ...input.registration, storedAt: input.storedAt });
  const candidate: AstroObjectBackedCandidatePayload = {
    ...(input.candidate.exportedFiles ? { resourcePayloads: resourceUploads.map(u=>u.ref as AstroExportResourceRef) } : {}),
    kind: input.candidate.kind,
    id: input.candidate.id,
    siteId: input.candidate.siteId,
    siteVersionId: input.candidate.siteVersionId,
    rendererCompatibilityVersion: input.candidate.rendererCompatibilityVersion,
    routePayloads: routePayloads as AstroObjectBackedCandidatePayload["routePayloads"],
    compiledTokenStyles: stylesUpload?.ref ?? input.candidate.compiledTokenStyles,
    assetFingerprintMap: structuredClone(input.candidate.assetFingerprintMap),
    manifest: {
      ...structuredClone(input.candidate.manifest),
      lifecycle: {
        storage: ASTRO_OBJECT_CANDIDATE_STORAGE,
        lifetime: ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
        durableRegistration: true,
      },
    },
    contentSha256: input.candidate.contentSha256,
    createdAt: input.candidate.createdAt,
  };
  const unsigned = {
    schemaVersion: input.candidate.exportedFiles ? RESOURCE_RECORD_VERSION : ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
    recordKind: ASTRO_OBJECT_CANDIDATE_RECORD_KIND,
    identity,
    registration,
    candidate,
    ...(input.generatedGitArchive ? {generatedGitArchive:input.generatedGitArchive} : {}),
  } satisfies Omit<AstroObjectBackedCandidateRecord, "storageSha256">;
  const record: AstroObjectBackedCandidateRecord = {
    ...unsigned,
    storageSha256: computeAstroObjectBackedCandidateStorageSha256(unsigned),
  };
  const validated = validateAstroObjectBackedCandidateRecord(record);
  return {
    record: validated,
    uploads,
    measurements: {
      registryRecordUtf8Bytes: measureAstroObjectBackedCandidateRecordBytes(validated),
      resolvedCandidateUtf8Bytes: Buffer.byteLength(stableStringify(input.candidate), "utf8"),
      // The deployed v3 RPC contract records route-object bytes by summing
      // candidate.routePayloads. Additional immutable objects remain fully
      // sized and hashed by their own registry refs.
      objectPayloadUtf8Bytes: (input.candidate.exportedFiles ? uploads : routeUploads).reduce((total, upload) => total + upload.ref.sizeBytes, 0),
    },
  };
}

export function validateAstroObjectBackedCandidateRecord(
  value: unknown,
  options: { maxBytes?: number } = {},
): AstroObjectBackedCandidateRecord {
  if (!isRecord(value)) throw corrupt("Object-backed candidate record must be an object.");
  if (typeof value.schemaVersion === "string" && !isObjectSchema(value.schemaVersion)) {
    throw unsupported("Object-backed candidate schema version is unsupported.");
  }
  if (typeof value.recordKind === "string" && value.recordKind !== ASTRO_OBJECT_CANDIDATE_RECORD_KIND) {
    throw unsupported("Object-backed candidate record kind is unsupported.");
  }
  if (!hasExactKeys(value, ["schemaVersion", "recordKind", "identity", "registration", "candidate", "storageSha256",
    ...(value.generatedGitArchive ? ["generatedGitArchive"] : [])])) {
    throw corrupt("Object-backed candidate record shape is invalid.");
  }
  const identity = validateAstroProductionCandidateIdentity(value.identity, "corrupt");
  const registration = validateRegistration(value.registration, "corrupt");
  const candidate = validateObjectCandidatePayload(value.candidate);
  if ((value.schemaVersion === RESOURCE_RECORD_VERSION) !== Boolean(candidate.resourcePayloads)) throw corrupt('Resource contract version mismatch');
  if (value.generatedGitArchive) {
    if (!isCandidateGitRef(value.generatedGitArchive,identity,candidate)) throw corrupt('Candidate Git reference is invalid');
  }
  if(candidate.resourcePayloads) for(const ref of candidate.resourcePayloads) {
    if(ref.key!==resourceObjectKey(identity,ref.path,ref.sha256)) throw corrupt('Resource object ownership mismatch');
  }
  if (
    candidate.id !== identity.candidateId ||
    candidate.siteId !== identity.runtimeSiteId ||
    candidate.siteVersionId !== identity.siteVersionId ||
    candidate.manifest.ownership.siteId !== identity.runtimeSiteId ||
    candidate.manifest.ownership.siteVersionId !== identity.siteVersionId
  ) {
    throw new AstroProductionCandidateValidationError(
      "ownership_mismatch",
      "Object-backed candidate identity and embedded ownership are inconsistent.",
    );
  }
  if (!isSha256(value.storageSha256)) throw corrupt("Object-backed candidate storage hash is invalid.");
  const unsigned = {
    schemaVersion: value.schemaVersion as AstroObjectBackedCandidateRecord["schemaVersion"],
    recordKind: ASTRO_OBJECT_CANDIDATE_RECORD_KIND,
    identity,
    registration,
    candidate,
    ...(value.generatedGitArchive ? {generatedGitArchive:value.generatedGitArchive as GeneratedGitRef} : {}),
  } satisfies Omit<AstroObjectBackedCandidateRecord, "storageSha256">;
  if (computeAstroObjectBackedCandidateStorageSha256(unsigned) !== value.storageSha256) {
    throw corrupt("Object-backed candidate storage-integrity hash does not match.");
  }
  const record = { ...unsigned, storageSha256: value.storageSha256 };
  const maxBytes = options.maxBytes ?? ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES;
  const measuredBytes = Buffer.byteLength(stableStringify(record), "utf8");
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || measuredBytes === 0 || measuredBytes > maxBytes) {
    throw new AstroProductionCandidateValidationError(
      "record_too_large",
      `Object-backed candidate registry record exceeds the ${maxBytes}-byte limit.`,
      { measuredBytes, limitBytes: maxBytes },
    );
  }
  return structuredClone(record);
}

export function resolveAstroObjectBackedCandidateRecord(input: {
  record: AstroObjectBackedCandidateRecord;
  htmlByPath: Record<string, string>;
  compiledTokenStyles?: string;
  exportedFiles?: AstroExportResource[];
}): AstroObjectBackedResolvedRecord {
  const record = validateAstroObjectBackedCandidateRecord(input.record);
  const expectedRoutes = Object.keys(record.candidate.routePayloads).sort();
  const actualRoutes = Object.keys(input.htmlByPath).sort();
  if (stableStringify(expectedRoutes) !== stableStringify(actualRoutes) || !input.htmlByPath["/"]) {
    throw corrupt("Resolved candidate route set does not match the immutable object manifest.");
  }
  const compiledTokenStyles = typeof record.candidate.compiledTokenStyles === "string"
    ? record.candidate.compiledTokenStyles
    : input.compiledTokenStyles;
  if (typeof compiledTokenStyles !== "string") {
    throw corrupt("Resolved object-backed candidate shared stylesheet is missing.");
  }
  if (typeof record.candidate.compiledTokenStyles !== "string") {
    const bytes = Buffer.from(compiledTokenStyles, "utf8");
    if (
      bytes.byteLength !== record.candidate.compiledTokenStyles.sizeBytes ||
      sha256Hex(bytes) !== record.candidate.compiledTokenStyles.sha256
    ) throw corrupt("Resolved object-backed candidate shared stylesheet failed immutable size or hash verification.");
  }
  for (const routePath of expectedRoutes) {
    const html = input.htmlByPath[routePath];
    const ref = record.candidate.routePayloads[routePath];
    if (typeof html !== "string" || !ref) throw corrupt("Resolved candidate route payload is missing.");
    const bytes = Buffer.from(html, "utf8");
    if (bytes.byteLength !== ref.sizeBytes || sha256Hex(bytes) !== ref.sha256) {
      throw corrupt("Resolved candidate route payload failed immutable size or hash verification.");
    }
    if (!record.candidate.resourcePayloads) validateSelfContainedAstroProductionPayload({ html, compiledTokenStyles });
  }
  if(record.candidate.resourcePayloads) {
    if(!input.exportedFiles) throw corrupt('Missing export resources');
    validateReviewedExport(input.exportedFiles,record.candidate.manifest.provenance.sourceSnapshotSha256);
    if(stableStringify(exportHtmlByPath(input.exportedFiles))!==stableStringify(input.htmlByPath)) throw corrupt('Route export mismatch');
  } else if(input.exportedFiles) throw corrupt('Unexpected resources');
  const { routePayloads, resourcePayloads, compiledTokenStyles: persistedStyles, ...candidateMetadata } = record.candidate;
  const candidate: AstroObjectBackedResolvedCandidate = {
    ...candidateMetadata,
    ...(input.exportedFiles ? { exportedFiles: structuredClone(input.exportedFiles) } : {}),
    htmlByPath: structuredClone(input.htmlByPath) as AstroObjectBackedResolvedCandidate["htmlByPath"],
    compiledTokenStyles,
  };
  if (computeAstroInternalPreviewCandidateContentSha256(candidate) !== candidate.contentSha256) {
    throw corrupt("Resolved object-backed candidate content-integrity hash does not match.");
  }
  return {
    schemaVersion: record.schemaVersion,
    recordKind: record.recordKind,
    identity: structuredClone(record.identity),
    registration: structuredClone(record.registration),
    candidate,
    ...(record.generatedGitArchive ? {generatedGitArchive:structuredClone(record.generatedGitArchive)} : {}),
    storageSha256: record.storageSha256,
    objectManifest: structuredClone(record.candidate.routePayloads),
    ...(resourcePayloads ? {resourceObjectRefs:structuredClone(resourcePayloads)} : {}),
    stylesObjectRef: typeof persistedStyles === "string" ? null : structuredClone(persistedStyles),
  };
}

export function registrationIntentFromAstroObjectBackedRecord(record: AstroObjectBackedCandidateRecord) {
  const validated = validateAstroObjectBackedCandidateRecord(record);
  return {
    schemaVersion: validated.schemaVersion,
    recordKind: validated.recordKind,
    identity: validated.identity,
    registration: {
      registeredByActorId: validated.registration.registeredByActorId,
      producerKind: validated.registration.producerKind,
      producerVersion: validated.registration.producerVersion,
      producerRef: validated.registration.producerRef,
      idempotencyKey: validated.registration.idempotencyKey,
      correlationId: validated.registration.correlationId,
    },
    candidate: validated.candidate,
    ...(validated.generatedGitArchive ? {generatedGitArchive:validated.generatedGitArchive} : {}),
  };
}

export function computeAstroObjectBackedRegistrationIntentSha256(record: AstroObjectBackedCandidateRecord): string {
  return sha256Hex(Buffer.from(stableStringify(registrationIntentFromAstroObjectBackedRecord(record)), "utf8"));
}

export function computeAstroObjectBackedCandidateStorageSha256(
  record: Omit<AstroObjectBackedCandidateRecord, "storageSha256">,
): string {
  return sha256Hex(Buffer.from(stableStringify(record), "utf8"));
}

export function serializeAstroObjectBackedCandidateRecord(record: AstroObjectBackedCandidateRecord): string {
  return stableStringify(validateAstroObjectBackedCandidateRecord(record));
}

export function serializeAstroObjectBackedUnsignedRecord(record: AstroObjectBackedCandidateRecord): string {
  const validated = validateAstroObjectBackedCandidateRecord(record);
  const { storageSha256: _storageSha256, ...unsigned } = validated;
  return stableStringify(unsigned);
}

export function serializeAstroObjectBackedRegistrationIntent(record: AstroObjectBackedCandidateRecord): string {
  return stableStringify(registrationIntentFromAstroObjectBackedRecord(record));
}

export function measureAstroObjectBackedCandidateRecordBytes(record: AstroObjectBackedCandidateRecord): number {
  return Buffer.byteLength(serializeAstroObjectBackedCandidateRecord(record), "utf8");
}

export function isAstroObjectBackedCandidateRecord(value: unknown): value is AstroObjectBackedCandidateRecord {
  return isRecord(value) && isObjectSchema(value.schemaVersion);
}

export function isAstroObjectBackedResolvedCandidate(value: unknown): value is AstroObjectBackedResolvedCandidate {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.manifest.lifecycle)) return false;
  if (
    value.manifest.lifecycle.storage !== ASTRO_OBJECT_CANDIDATE_STORAGE ||
    value.manifest.lifecycle.lifetime !== ASTRO_PRODUCTION_CANDIDATE_LIFETIME ||
    value.manifest.lifecycle.durableRegistration !== true
  ) return false;
  if(value.exportedFiles) {
    const translated=structuredClone(value);
    translated.manifest.lifecycle={storage:'caller_owned_in_memory',lifetime:'proof_invocation_only',durableRegistration:false};
    return isAstroInternalPreviewCandidate(translated);
  }
  const translated = structuredClone(value);
  translated.manifest.lifecycle.storage = ASTRO_PRODUCTION_CANDIDATE_STORAGE;
  return isAstroProductionCandidate(translated);
}

export function isAstroObjectBackedResolvedRecord(
  value: AstroResolvedCandidateRecord,
): value is AstroObjectBackedResolvedRecord {
  return isObjectSchema(value.schemaVersion) &&
    isAstroObjectBackedResolvedCandidate(value.candidate) &&
    "objectManifest" in value && isRecord(value.objectManifest);
}

export function validateAstroResolvedCandidateRecord(value: unknown): AstroResolvedCandidateRecord {
  if (isRecord(value) && isObjectSchema(value.schemaVersion)) {
    if (!hasExactKeys(value, [
      "schemaVersion", "recordKind", "identity", "registration", "candidate", "storageSha256", "objectManifest",
    "stylesObjectRef", ...(value.resourceObjectRefs ? ["resourceObjectRefs"] : []),
      ...(value.generatedGitArchive ? ["generatedGitArchive"] : []),
    ]) || !isRecord(value.candidate) || !isRecord(value.objectManifest)) {
      throw corrupt("Resolved object-backed candidate record shape is invalid.");
    }
    const { htmlByPath, exportedFiles, compiledTokenStyles, ...candidateMetadata } = value.candidate;
    const persisted = validateAstroObjectBackedCandidateRecord({
      schemaVersion: value.schemaVersion,
      recordKind: value.recordKind,
      identity: value.identity,
      registration: value.registration,
      candidate: {
        ...candidateMetadata,
        ...(value.resourceObjectRefs ? {resourcePayloads:value.resourceObjectRefs} : {}),
        routePayloads: value.objectManifest,
        compiledTokenStyles: value.stylesObjectRef ?? compiledTokenStyles,
      },
      ...(value.generatedGitArchive ? {generatedGitArchive:value.generatedGitArchive} : {}),
      storageSha256: value.storageSha256,
    });
    if (!isRecord(htmlByPath)) throw corrupt("Resolved candidate routes are invalid.");
    return resolveAstroObjectBackedCandidateRecord({
      record: persisted,
      exportedFiles,
      htmlByPath: htmlByPath as Record<string, string>,
      compiledTokenStyles,
    });
  }
  return validateAstroProductionCandidateRecord(value);
}

export function persistedAstroObjectBackedRecordFromResolved(
  value: AstroObjectBackedResolvedRecord,
): AstroObjectBackedCandidateRecord {
  const resolved = validateAstroResolvedCandidateRecord(value);
  if (!isAstroObjectBackedResolvedRecord(resolved)) {
    throw corrupt("Resolved candidate is not backed by immutable route objects.");
  }
  const { htmlByPath: _htmlByPath, exportedFiles: _exportedFiles, compiledTokenStyles, ...candidateMetadata } = resolved.candidate;
  return validateAstroObjectBackedCandidateRecord({
    schemaVersion: resolved.schemaVersion,
    recordKind: resolved.recordKind,
    identity: resolved.identity,
    registration: resolved.registration,
    candidate: {
      ...candidateMetadata,
      ...(resolved.resourceObjectRefs ? {resourcePayloads:resolved.resourceObjectRefs} : {}),
      routePayloads: resolved.objectManifest,
      compiledTokenStyles: resolved.stylesObjectRef ?? compiledTokenStyles,
    },
    ...(resolved.generatedGitArchive ? {generatedGitArchive:resolved.generatedGitArchive} : {}),
    storageSha256: resolved.storageSha256,
  });
}

function validateObjectCandidatePayload(value: unknown): AstroObjectBackedCandidatePayload {
  const resources=isRecord(value) && value.resourcePayloads;
  if(resources) {
    validateReviewedDescriptors(resources,value.manifest?.provenance?.sourceSnapshotSha256);
    for(const ref of resources) if(!hasExactKeys(ref,['path','mediaType','sizeBytes','sha256','kind','bucket','key']) || ref.kind!=='export_resource' || !isBoundedText(ref.bucket) || !isBoundedText(ref.key)) throw corrupt('Invalid resource ref');
  }
  if (!hasExactKeys(value, [
    ...(resources ? ["resourcePayloads"] : []),
    "kind", "id", "siteId", "siteVersionId", "rendererCompatibilityVersion", "routePayloads",
    "compiledTokenStyles", "assetFingerprintMap", "manifest", "contentSha256", "createdAt",
  ])) throw corrupt("Object-backed candidate payload shape is invalid.");
  if (!hasExactKeys(value.manifest, [
    "sourceKind", "conversionVersion", "adapterId", "ownership", "provenance", "assetHandling", "lifecycle",
  ])) throw corrupt("Object-backed candidate manifest shape is invalid.");
  if (!hasExactKeys(value.manifest.ownership, ["siteId", "siteVersionId"]) ||
      !hasExactKeys(value.manifest.provenance, ["sourceSnapshotSha256", "exportManifestVersion", "exportSha256", "convertedArtifactSha256"]) ||
      !hasExactKeys(value.manifest.assetHandling, ["mode", "inlinedStylesheetPaths", "externalAssetStorageRequired"]) ||
      !hasExactKeys(value.manifest.lifecycle, ["storage", "lifetime", "durableRegistration"])) {
    throw corrupt("Object-backed candidate manifest substructure is invalid.");
  }
  if (
    value.kind !== ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND ||
    value.manifest.sourceKind !== ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND ||
    value.manifest.conversionVersion !== (resources ? RESOURCE_CONVERSION_VERSION : ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION) ||
    value.manifest.adapterId !== ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID ||
    value.manifest.provenance.exportManifestVersion !== ASTRO_STATIC_EXPORT_MANIFEST_VERSION ||
    value.rendererCompatibilityVersion !== RENDERER_COMPATIBILITY_VERSION ||
    value.manifest.assetHandling.mode !== (resources ? "typed_export_resources" : ASTRO_INTERNAL_PREVIEW_ASSET_MODE) ||
    value.manifest.assetHandling.externalAssetStorageRequired !== Boolean(resources) ||
    value.manifest.lifecycle.storage !== ASTRO_OBJECT_CANDIDATE_STORAGE ||
    value.manifest.lifecycle.lifetime !== ASTRO_PRODUCTION_CANDIDATE_LIFETIME ||
    value.manifest.lifecycle.durableRegistration !== true ||
    !(typeof value.compiledTokenStyles === "string" || isStylesObjectRef(value.compiledTokenStyles)) ||
    !isSha256Record(value.assetFingerprintMap) ||
    !isSha256(value.contentSha256) ||
    value.manifest.provenance.convertedArtifactSha256 !== value.contentSha256 ||
    !isSha256(value.manifest.provenance.sourceSnapshotSha256) ||
    !isSha256(value.manifest.provenance.exportSha256) ||
    !Array.isArray(value.manifest.assetHandling.inlinedStylesheetPaths) ||
    !value.manifest.assetHandling.inlinedStylesheetPaths.every((item: unknown) => isBoundedText(item)) ||
    !isIsoTimestamp(value.createdAt)
  ) throw corrupt("Object-backed candidate payload failed structural validation.");
  const routePayloads = validateRoutePayloads(value.routePayloads);
  return structuredClone({ ...value, routePayloads } as unknown as AstroObjectBackedCandidatePayload);
}

function validateRoutePayloads(value: unknown): AstroObjectBackedCandidatePayload["routePayloads"] {
  if (!isRecord(value)) throw corrupt("Object-backed candidate route manifest is invalid.");
  const entries = Object.entries(value);
  if (entries.length < 1 || !value["/"]) throw corrupt("Object-backed candidate must contain a root route.");
  const keys = new Set<string>();
  const normalized: Record<string, AstroCandidateRouteObjectRef> = {};
  for (const [routePath, raw] of entries) {
    if (!isGeneratedOutputRoutePath(routePath) || !hasExactKeys(raw, ["routePath", "bucket", "key", "sha256", "sizeBytes", "mediaType"])) {
      throw corrupt("Object-backed candidate route reference is invalid.");
    }
    if (
      raw.routePath !== routePath || !isBoundedText(raw.bucket) || !isBoundedText(raw.key) ||
      !isSha256(raw.sha256) || !Number.isSafeInteger(raw.sizeBytes) || raw.sizeBytes <= 0 ||
      raw.mediaType !== ASTRO_OBJECT_CANDIDATE_MEDIA_TYPE || keys.has(raw.key)
    ) throw corrupt("Object-backed candidate route reference failed integrity validation.");
    keys.add(raw.key);
    normalized[routePath] = raw as unknown as AstroCandidateRouteObjectRef;
  }
  return normalized as AstroObjectBackedCandidatePayload["routePayloads"];
}

function isCandidateGitRef(value:unknown,identity:AstroProductionCandidateIdentity,
  candidate:AstroObjectBackedCandidatePayload):value is GeneratedGitRef {
  if(!isRecord(value)||!isRecord(value.scope)||!Array.isArray(value.routes)||
    value.scope.agencyId!==identity.agencyId||value.scope.clientId!==identity.organizationId||
    value.scope.siteId!==identity.ownershipSiteId||
    !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(String(value.repository))||
    !/^[a-f0-9]{40}$/.test(String(value.commit))||
    !/^[a-f0-9]{64}$/.test(String(value.manifestSha256))||
    value.manifestPath!==`generated/${identity.siteVersionId}/.gnr8-generated-manifest.json`||
    !isRecord(value.styles)||!isRecord(value.runtimeManifest)||
    value.styles.path!==`generated/${identity.siteVersionId}/compiled-token-styles.css`||
    value.runtimeManifest.path!==`generated/${identity.siteVersionId}/runtime-manifest.json`||
    !/^[a-f0-9]{64}$/.test(String(value.runtimeManifest.sha256))||
    !Number.isSafeInteger(value.runtimeManifest.bytes)||Number(value.runtimeManifest.bytes)<1)return false;
  const refs=Object.entries(candidate.routePayloads);
  if(value.routes.length!==refs.length)return false;
  const byRoute=new Map<string,Record<string,unknown>>();
  for(const item of value.routes){
    if(!isRecord(item)||typeof item.route!=='string'||byRoute.has(item.route))return false;
    byRoute.set(item.route,item);
  }
  for(const [route,ref] of refs){
    const git=byRoute.get(route);
    if(!git||git.path!==`generated/${identity.siteVersionId}/html/${sha256Hex(Buffer.from(route))}.html`||
      git.sha256!==ref.sha256||git.bytes!==ref.sizeBytes)return false;
  }
  const css=candidate.compiledTokenStyles;
  const cssSha=typeof css==='string'?sha256Hex(Buffer.from(css)):css.sha256;
  const cssBytes=typeof css==='string'?Buffer.byteLength(css):css.sizeBytes;
  if(value.styles.sha256!==cssSha||value.styles.bytes!==cssBytes)return false;
  if(!candidate.resourcePayloads)return !('resources' in value);
  if(!Array.isArray(value.resources)||value.resources.length!==candidate.resourcePayloads.length)return false;
  const byPath=new Map<string,Record<string,unknown>>();
  for(const item of value.resources){
    if(!isRecord(item)||typeof item.sourcePath!=='string'||byPath.has(item.sourcePath))return false;
    byPath.set(item.sourcePath,item);
  }
  for(const ref of candidate.resourcePayloads){
    const git=byPath.get(ref.path);
    if(!git||git.path!==`generated/${identity.siteVersionId}/resources/${Buffer.from(ref.path).toString('base64url')}-${ref.sha256}`||
      git.sha256!==ref.sha256||git.bytes!==ref.sizeBytes||git.mediaType!==ref.mediaType)return false;
  }
  return true;
}

function objectKeyFor(input: {
  identity: AstroProductionCandidateIdentity;
  routePath: string;
  sha256: string;
}): string {
  const routeToken = Buffer.from(input.routePath, "utf8").toString("base64url") || "root";
  return [
    "candidate-v3",
    input.identity.organizationId,
    input.identity.ownershipSiteId,
    input.identity.siteVersionId,
    input.identity.candidateId,
    "routes",
    `${routeToken}-${input.sha256}.html`,
  ].join("/");
}

function createStylesUpload(input: {
  identity: AstroProductionCandidateIdentity;
  bucket: string;
  bytes: Uint8Array;
}): AstroCandidateObjectUpload & { ref: AstroCandidateStylesObjectRef } {
  const sha256 = sha256Hex(input.bytes);
  return {
    ref: {
      kind: "compiled_token_styles",
      bucket: input.bucket,
      key: [
        "candidate-v3",
        input.identity.organizationId,
        input.identity.ownershipSiteId,
        input.identity.siteVersionId,
        input.identity.candidateId,
        "styles",
        `${sha256}.css`,
      ].join("/"),
      sha256,
      sizeBytes: input.bytes.byteLength,
      mediaType: ASTRO_OBJECT_CANDIDATE_STYLES_MEDIA_TYPE,
    },
    bytes: input.bytes,
  };
}

function isStylesObjectRef(value: unknown): value is AstroCandidateStylesObjectRef {
  return hasExactKeys(value, ["kind", "bucket", "key", "sha256", "sizeBytes", "mediaType"]) &&
    value.kind === "compiled_token_styles" &&
    isBoundedText(value.bucket) &&
    isBoundedText(value.key) &&
    isSha256(value.sha256) &&
    Number.isSafeInteger(value.sizeBytes) &&
    value.sizeBytes > 0 &&
    value.mediaType === ASTRO_OBJECT_CANDIDATE_STYLES_MEDIA_TYPE;
}

function validateRegistration(
  value: unknown,
  code: "identity_invalid" | "corrupt" = "identity_invalid",
): AstroProductionCandidateRegistration {
  if (!hasExactKeys(value, [
    "storedAt", "registeredByActorId", "producerKind", "producerVersion", "producerRef", "idempotencyKey", "correlationId",
  ]) || !isIsoTimestamp(value.storedAt)) {
    throw new AstroProductionCandidateValidationError(code, "Object-backed candidate registration is invalid.");
  }
  return {
    storedAt: value.storedAt,
    registeredByActorId: boundedText(value.registeredByActorId, "registered actor", code),
    producerKind: boundedText(value.producerKind, "producer kind", code),
    producerVersion: boundedText(value.producerVersion, "producer version", code),
    producerRef: boundedText(value.producerRef, "producer ref", code),
    idempotencyKey: boundedText(value.idempotencyKey, "idempotency key", code),
    correlationId: boundedText(value.correlationId, "correlation ID", code),
  };
}

function boundedText(
  value: unknown,
  label: string,
  code: "identity_invalid" | "corrupt" = "identity_invalid",
): string {
  if (!isBoundedText(value)) throw new AstroProductionCandidateValidationError(code, `Object-backed ${label} is invalid.`);
  return value;
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= TEXT_MAX_CHARACTERS && value.trim() === value && !value.includes("\0");
}
function isSha256(value: unknown): value is string { return typeof value === "string" && SHA256_PATTERN.test(value); }
function isSha256Record(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.entries(value).every(([key, hash]) => isBoundedText(key) && isSha256(hash));
}
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, any> {
  return isRecord(value) && stableStringify(Object.keys(value).sort()) === stableStringify([...expected].sort());
}
function unsupported(message: string) { return new AstroProductionCandidateValidationError("unsupported_version", message); }
function corrupt(message: string) { return new AstroProductionCandidateValidationError("corrupt", message); }

function isObjectSchema(version: unknown): version is AstroObjectBackedCandidateRecord['schemaVersion'] {
  return version===ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION || version===RESOURCE_RECORD_VERSION;
}
function resourceObjectKey(identity:AstroProductionCandidateIdentity,path:string,sha256:string):string {
  return ['candidate-v4',identity.organizationId,identity.ownershipSiteId,identity.siteVersionId,identity.candidateId,'resources',Buffer.from(path).toString('base64url')+'-'+sha256].join('/');
}
