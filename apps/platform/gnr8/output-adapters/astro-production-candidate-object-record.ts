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
const COMPILED_STYLES_OBJECT_THRESHOLD_BYTES = 64 * 1024;
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

export type AstroCandidateStoredObjectRef = AstroCandidateRouteObjectRef | AstroCandidateStylesObjectRef;

export type AstroObjectBackedCandidatePayload = Omit<
  AstroInternalPreviewCandidate,
  "htmlByPath" | "manifest" | "compiledTokenStyles"
> & {
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
  schemaVersion: typeof ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION;
  recordKind: typeof ASTRO_OBJECT_CANDIDATE_RECORD_KIND;
  identity: AstroProductionCandidateIdentity;
  registration: AstroProductionCandidateRegistration;
  candidate: AstroObjectBackedCandidatePayload;
  storageSha256: string;
};

export type AstroObjectBackedResolvedCandidate = Omit<
  AstroObjectBackedCandidatePayload,
  "routePayloads" | "compiledTokenStyles"
> & {
  htmlByPath: Record<string, string> & { "/": string };
  compiledTokenStyles: string;
};

export type AstroObjectBackedResolvedRecord = Omit<AstroObjectBackedCandidateRecord, "candidate"> & {
  candidate: AstroObjectBackedResolvedCandidate;
  objectManifest: Record<string, AstroCandidateRouteObjectRef> & { "/": AstroCandidateRouteObjectRef };
  stylesObjectRef: AstroCandidateStylesObjectRef | null;
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
}): PreparedAstroObjectBackedCandidateRecord {
  if (!isAstroInternalPreviewCandidate(input.candidate)) {
    throw corrupt("Source candidate failed the established candidate validation contract.");
  }
  const routeEntries = Object.entries(input.candidate.htmlByPath)
    .sort(([left], [right]) => left.localeCompare(right));
  if (routeEntries.length < 2) {
    throw unsupported("Object-backed candidate storage is reserved for new multi-page candidates.");
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
    validateSelfContainedAstroProductionPayload({
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
  const stylesUpload = compiledStylesBytes.byteLength > COMPILED_STYLES_OBJECT_THRESHOLD_BYTES
    ? createStylesUpload({ identity, bucket, bytes: compiledStylesBytes })
    : null;
  const uploads: AstroCandidateObjectUpload[] = stylesUpload
    ? [...routeUploads, stylesUpload]
    : routeUploads;
  const registration = validateRegistration({ ...input.registration, storedAt: input.storedAt });
  const candidate: AstroObjectBackedCandidatePayload = {
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
    schemaVersion: ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
    recordKind: ASTRO_OBJECT_CANDIDATE_RECORD_KIND,
    identity,
    registration,
    candidate,
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
      objectPayloadUtf8Bytes: uploads.reduce((total, upload) => total + upload.ref.sizeBytes, 0),
    },
  };
}

export function validateAstroObjectBackedCandidateRecord(
  value: unknown,
  options: { maxBytes?: number } = {},
): AstroObjectBackedCandidateRecord {
  if (!isRecord(value)) throw corrupt("Object-backed candidate record must be an object.");
  if (typeof value.schemaVersion === "string" && value.schemaVersion !== ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION) {
    throw unsupported("Object-backed candidate schema version is unsupported.");
  }
  if (typeof value.recordKind === "string" && value.recordKind !== ASTRO_OBJECT_CANDIDATE_RECORD_KIND) {
    throw unsupported("Object-backed candidate record kind is unsupported.");
  }
  if (!hasExactKeys(value, ["schemaVersion", "recordKind", "identity", "registration", "candidate", "storageSha256"])) {
    throw corrupt("Object-backed candidate record shape is invalid.");
  }
  const identity = validateAstroProductionCandidateIdentity(value.identity, "corrupt");
  const registration = validateRegistration(value.registration, "corrupt");
  const candidate = validateObjectCandidatePayload(value.candidate);
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
    schemaVersion: ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
    recordKind: ASTRO_OBJECT_CANDIDATE_RECORD_KIND,
    identity,
    registration,
    candidate,
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
    validateSelfContainedAstroProductionPayload({ html, compiledTokenStyles });
  }
  const { routePayloads, compiledTokenStyles: persistedStyles, ...candidateMetadata } = record.candidate;
  const candidate: AstroObjectBackedResolvedCandidate = {
    ...candidateMetadata,
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
    storageSha256: record.storageSha256,
    objectManifest: structuredClone(record.candidate.routePayloads),
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
  return isRecord(value) && value.schemaVersion === ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION;
}

export function isAstroObjectBackedResolvedCandidate(value: unknown): value is AstroObjectBackedResolvedCandidate {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.manifest.lifecycle)) return false;
  if (
    value.manifest.lifecycle.storage !== ASTRO_OBJECT_CANDIDATE_STORAGE ||
    value.manifest.lifecycle.lifetime !== ASTRO_PRODUCTION_CANDIDATE_LIFETIME ||
    value.manifest.lifecycle.durableRegistration !== true
  ) return false;
  const translated = structuredClone(value);
  translated.manifest.lifecycle.storage = ASTRO_PRODUCTION_CANDIDATE_STORAGE;
  return isAstroProductionCandidate(translated);
}

export function isAstroObjectBackedResolvedRecord(
  value: AstroResolvedCandidateRecord,
): value is AstroObjectBackedResolvedRecord {
  return value.schemaVersion === ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION &&
    isAstroObjectBackedResolvedCandidate(value.candidate) &&
    isRecord(value.objectManifest);
}

export function validateAstroResolvedCandidateRecord(value: unknown): AstroResolvedCandidateRecord {
  if (isRecord(value) && value.schemaVersion === ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION) {
    if (!hasExactKeys(value, [
      "schemaVersion", "recordKind", "identity", "registration", "candidate", "storageSha256", "objectManifest",
      "stylesObjectRef",
    ]) || !isRecord(value.candidate) || !isRecord(value.objectManifest)) {
      throw corrupt("Resolved object-backed candidate record shape is invalid.");
    }
    const { htmlByPath, compiledTokenStyles, ...candidateMetadata } = value.candidate;
    const persisted = validateAstroObjectBackedCandidateRecord({
      schemaVersion: value.schemaVersion,
      recordKind: value.recordKind,
      identity: value.identity,
      registration: value.registration,
      candidate: {
        ...candidateMetadata,
        routePayloads: value.objectManifest,
        compiledTokenStyles: value.stylesObjectRef ?? compiledTokenStyles,
      },
      storageSha256: value.storageSha256,
    });
    if (!isRecord(htmlByPath)) throw corrupt("Resolved candidate routes are invalid.");
    return resolveAstroObjectBackedCandidateRecord({
      record: persisted,
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
  const { htmlByPath: _htmlByPath, compiledTokenStyles, ...candidateMetadata } = resolved.candidate;
  return validateAstroObjectBackedCandidateRecord({
    schemaVersion: resolved.schemaVersion,
    recordKind: resolved.recordKind,
    identity: resolved.identity,
    registration: resolved.registration,
    candidate: {
      ...candidateMetadata,
      routePayloads: resolved.objectManifest,
      compiledTokenStyles: resolved.stylesObjectRef ?? compiledTokenStyles,
    },
    storageSha256: resolved.storageSha256,
  });
}

function validateObjectCandidatePayload(value: unknown): AstroObjectBackedCandidatePayload {
  if (!hasExactKeys(value, [
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
    value.manifest.conversionVersion !== ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION ||
    value.manifest.adapterId !== ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID ||
    value.manifest.provenance.exportManifestVersion !== ASTRO_STATIC_EXPORT_MANIFEST_VERSION ||
    value.rendererCompatibilityVersion !== RENDERER_COMPATIBILITY_VERSION ||
    value.manifest.assetHandling.mode !== ASTRO_INTERNAL_PREVIEW_ASSET_MODE ||
    value.manifest.assetHandling.externalAssetStorageRequired !== false ||
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
  if (entries.length < 2 || !value["/"]) throw corrupt("Object-backed candidate must contain at least two routes including root.");
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
