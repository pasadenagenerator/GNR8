import { randomUUID } from "node:crypto";

import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import postcss from "postcss";

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
  computeAstroInternalPreviewCandidateContentSha256,
  isAstroInternalPreviewCandidate,
  serializeAstroInternalPreviewCandidateContentEnvelope,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";

export const ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION =
  "gnr8-astro-persisted-preview-candidate:v2" as const;
export const ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND =
  "astro_internal_preview_candidate_record" as const;
export const ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID = "astro-static-site" as const;
export const ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES = 2 * 1024 * 1024;
export const ASTRO_PRODUCTION_CANDIDATE_STORAGE = "supabase_postgres" as const;
export const ASTRO_PRODUCTION_CANDIDATE_LIFETIME =
  "retained_until_explicit_authorized_deletion" as const;

const IDENTITY_MAX_CHARACTERS = 512;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CANDIDATE_ID_PATTERN = /^astro_candidate_[0-9a-f]{12}[1-8][0-9a-f]{3}[89ab][0-9a-f]{15}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

export type AstroProductionCandidateOwnership = {
  runtimeSiteId: string;
  siteVersionId: string;
  ownershipSiteId: string;
  organizationId: string;
  agencyId: string;
};

export type AstroProductionCandidateIdentity = AstroProductionCandidateOwnership & {
  candidateId: string;
};

export type AstroProductionCandidateLifecycle = {
  storage: typeof ASTRO_PRODUCTION_CANDIDATE_STORAGE;
  lifetime: typeof ASTRO_PRODUCTION_CANDIDATE_LIFETIME;
  durableRegistration: true;
};

export type AstroProductionCandidate = Omit<AstroInternalPreviewCandidate, "manifest"> & {
  manifest: Omit<AstroInternalPreviewCandidate["manifest"], "lifecycle"> & {
    lifecycle: AstroProductionCandidateLifecycle;
  };
};

export type AstroProductionCandidateRegistration = {
  storedAt: string;
  registeredByActorId: string;
  producerKind: string;
  producerVersion: string;
  producerRef: string;
  idempotencyKey: string;
  correlationId: string;
};

export type AstroProductionCandidateRegistrationContext = Omit<
  AstroProductionCandidateRegistration,
  "storedAt"
>;

export type AstroProductionCandidateRecord = {
  schemaVersion: typeof ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION;
  recordKind: typeof ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND;
  identity: AstroProductionCandidateIdentity;
  registration: AstroProductionCandidateRegistration;
  candidate: AstroProductionCandidate;
  storageSha256: string;
};

export type AstroProductionCandidateRegistrationIntent = {
  schemaVersion: typeof ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION;
  recordKind: typeof ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND;
  identity: AstroProductionCandidateIdentity;
  registration: AstroProductionCandidateRegistrationContext;
  candidate: AstroProductionCandidate;
};

export type AstroProductionCandidateValidationErrorCode =
  | "identity_invalid"
  | "unsupported_version"
  | "corrupt"
  | "ownership_mismatch"
  | "record_too_large";

export class AstroProductionCandidateValidationError extends Error {
  readonly code: AstroProductionCandidateValidationErrorCode;

  constructor(code: AstroProductionCandidateValidationErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroProductionCandidateValidationError";
    this.code = code;
  }
}

export function createAstroProductionCandidateId(uuid: string = randomUUID()): string {
  const normalized = uuid.toLowerCase();
  if (!UUID_PATTERN.test(normalized) || normalized !== uuid) {
    throw new AstroProductionCandidateValidationError(
      "identity_invalid",
      "Candidate UUID must use the canonical lowercase hyphenated form.",
    );
  }
  return `astro_candidate_${normalized.replaceAll("-", "")}`;
}

export function isAstroProductionCandidateId(value: unknown): value is string {
  return typeof value === "string" && CANDIDATE_ID_PATTERN.test(value);
}

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function createAstroProductionCandidateRecord(input: {
  candidate: AstroInternalPreviewCandidate;
  ownership: AstroProductionCandidateOwnership;
  registration: AstroProductionCandidateRegistrationContext;
  storedAt: string;
}): AstroProductionCandidateRecord {
  if (!isAstroInternalPreviewCandidate(input.candidate)) {
    throw new AstroProductionCandidateValidationError(
      "corrupt",
      "Source candidate failed the established proof-candidate validation contract.",
    );
  }
  if (
    input.candidate.manifest.lifecycle.storage !== "caller_owned_in_memory" ||
    input.candidate.manifest.lifecycle.lifetime !== "proof_invocation_only"
  ) {
    throw new AstroProductionCandidateValidationError(
      "unsupported_version",
      "Production registration requires a freshly bridged in-memory candidate, not a persisted proof candidate.",
    );
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
  const candidate: AstroProductionCandidate = {
    ...structuredClone(input.candidate),
    manifest: {
      ...structuredClone(input.candidate.manifest),
      lifecycle: {
        storage: ASTRO_PRODUCTION_CANDIDATE_STORAGE,
        lifetime: ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
        durableRegistration: true,
      },
    },
  };
  const registration = validateRegistration({ ...input.registration, storedAt: input.storedAt });
  const unsignedRecord: Omit<AstroProductionCandidateRecord, "storageSha256"> = {
    schemaVersion: ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
    recordKind: ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
    identity,
    registration,
    candidate,
  };
  const record: AstroProductionCandidateRecord = {
    ...unsignedRecord,
    storageSha256: computeAstroProductionCandidateStorageSha256(unsignedRecord),
  };
  return validateAstroProductionCandidateRecord(record);
}

export function registrationIntentFromRecord(
  record: AstroProductionCandidateRecord,
): AstroProductionCandidateRegistrationIntent {
  return {
    schemaVersion: record.schemaVersion,
    recordKind: record.recordKind,
    identity: structuredClone(record.identity),
    registration: {
      registeredByActorId: record.registration.registeredByActorId,
      producerKind: record.registration.producerKind,
      producerVersion: record.registration.producerVersion,
      producerRef: record.registration.producerRef,
      idempotencyKey: record.registration.idempotencyKey,
      correlationId: record.registration.correlationId,
    },
    candidate: structuredClone(record.candidate),
  };
}

export function computeAstroProductionCandidateRegistrationIntentSha256(
  intent: AstroProductionCandidateRegistrationIntent,
): string {
  return sha256Hex(Buffer.from(stableStringify(intent), "utf8"));
}

export function computeAstroProductionCandidateStorageSha256(
  record: Omit<AstroProductionCandidateRecord, "storageSha256">,
): string {
  return sha256Hex(Buffer.from(stableStringify(record), "utf8"));
}

export function serializeAstroProductionCandidateRecord(record: AstroProductionCandidateRecord): string {
  return stableStringify(validateAstroProductionCandidateRecord(record));
}

export function serializeAstroProductionCandidateUnsignedRecord(record: AstroProductionCandidateRecord): string {
  const validated = validateAstroProductionCandidateRecord(record);
  const { storageSha256: _storageSha256, ...unsignedRecord } = validated;
  return stableStringify(unsignedRecord);
}

export function serializeAstroProductionCandidateRegistrationIntent(
  record: AstroProductionCandidateRecord,
): string {
  return stableStringify(registrationIntentFromRecord(validateAstroProductionCandidateRecord(record)));
}

export function serializeAstroProductionCandidateContentEnvelope(
  record: AstroProductionCandidateRecord,
): string {
  return serializeAstroInternalPreviewCandidateContentEnvelope(
    validateAstroProductionCandidateRecord(record).candidate,
  );
}

export function measureAstroProductionCandidateRecordBytes(record: AstroProductionCandidateRecord): number {
  return Buffer.byteLength(serializeAstroProductionCandidateRecord(record), "utf8");
}

export function deserializeAstroProductionCandidateRecord(
  serialized: string | Uint8Array,
): AstroProductionCandidateRecord {
  let value: unknown;
  try {
    const text = typeof serialized === "string"
      ? serialized
      : new TextDecoder("utf-8", { fatal: true }).decode(serialized);
    value = JSON.parse(text);
  } catch (error) {
    throw new AstroProductionCandidateValidationError("corrupt", "Production candidate record is not valid JSON.", {
      cause: error,
    });
  }
  return validateAstroProductionCandidateRecord(value);
}

export function validateAstroProductionCandidateRecord(
  value: unknown,
  options: { maxBytes?: number } = {},
): AstroProductionCandidateRecord {
  if (!isRecord(value)) {
    throw corrupt("Production candidate record must be an object.");
  }
  if (typeof value.schemaVersion === "string" && value.schemaVersion !== ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION) {
    throw unsupported("Production candidate schema version is unsupported.");
  }
  if (typeof value.recordKind === "string" && value.recordKind !== ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND) {
    throw unsupported("Production candidate record kind is unsupported.");
  }
  if (!hasExactKeys(value, ["schemaVersion", "recordKind", "identity", "registration", "candidate", "storageSha256"])) {
    throw corrupt("Production candidate record shape is invalid.");
  }
  if (
    value.schemaVersion !== ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION ||
    value.recordKind !== ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND
  ) {
    throw corrupt("Production candidate record discriminator is invalid.");
  }
  assertSupportedCandidateVersions(value.candidate);
  const identity = validateAstroProductionCandidateIdentity(value.identity, "corrupt");
  const registration = validateRegistration(value.registration, "corrupt");
  const candidate = validateAstroProductionCandidate(value.candidate);
  if (
    candidate.id !== identity.candidateId ||
    candidate.siteId !== identity.runtimeSiteId ||
    candidate.siteVersionId !== identity.siteVersionId ||
    candidate.manifest.ownership.siteId !== identity.runtimeSiteId ||
    candidate.manifest.ownership.siteVersionId !== identity.siteVersionId
  ) {
    throw new AstroProductionCandidateValidationError(
      "ownership_mismatch",
      "Production candidate identity and embedded runtime ownership are inconsistent.",
    );
  }
  if (!isSha256(value.storageSha256)) {
    throw corrupt("Production candidate storage hash is invalid.");
  }
  const unsignedRecord: Omit<AstroProductionCandidateRecord, "storageSha256"> = {
    schemaVersion: value.schemaVersion,
    recordKind: value.recordKind,
    identity,
    registration,
    candidate,
  };
  if (computeAstroProductionCandidateStorageSha256(unsignedRecord) !== value.storageSha256) {
    throw corrupt("Production candidate storage-integrity hash does not match.");
  }
  const record: AstroProductionCandidateRecord = {
    ...unsignedRecord,
    storageSha256: value.storageSha256,
  };
  const maxBytes = options.maxBytes ?? ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new AstroProductionCandidateValidationError("record_too_large", "Configured record-size bound is invalid.");
  }
  const bytes = Buffer.byteLength(stableStringify(record), "utf8");
  if (bytes === 0 || bytes > maxBytes) {
    throw new AstroProductionCandidateValidationError(
      "record_too_large",
      `Production candidate record exceeds the ${maxBytes}-byte limit.`,
    );
  }
  return structuredClone(record);
}

export function validateAstroProductionCandidateIdentity(
  value: unknown,
  errorCode: "identity_invalid" | "corrupt" = "identity_invalid",
): AstroProductionCandidateIdentity {
  if (!hasExactKeys(value, [
    "candidateId",
    "runtimeSiteId",
    "siteVersionId",
    "ownershipSiteId",
    "organizationId",
    "agencyId",
  ])) {
    throw new AstroProductionCandidateValidationError(errorCode, "Production candidate identity is invalid.");
  }
  if (!isAstroProductionCandidateId(value.candidateId)) {
    throw new AstroProductionCandidateValidationError(errorCode, "Production candidate ID is invalid.");
  }
  const runtimeSiteId = validateBoundedIdentity(value.runtimeSiteId, "runtime site ID", errorCode);
  for (const [label, item] of [
    ["site-version ID", value.siteVersionId],
    ["ownership-site ID", value.ownershipSiteId],
    ["organization ID", value.organizationId],
    ["agency ID", value.agencyId],
  ] as const) {
    if (!isCanonicalUuid(item)) {
      throw new AstroProductionCandidateValidationError(errorCode, `Production candidate ${label} is invalid.`);
    }
  }
  return {
    candidateId: value.candidateId,
    runtimeSiteId,
    siteVersionId: value.siteVersionId as string,
    ownershipSiteId: value.ownershipSiteId as string,
    organizationId: value.organizationId as string,
    agencyId: value.agencyId as string,
  };
}

export function validateAstroProductionCandidate(value: unknown): AstroProductionCandidate {
  assertSupportedCandidateVersions(value);
  if (!hasExactKeys(value, [
    "kind",
    "id",
    "siteId",
    "siteVersionId",
    "rendererCompatibilityVersion",
    "htmlByPath",
    "compiledTokenStyles",
    "assetFingerprintMap",
    "manifest",
    "contentSha256",
    "createdAt",
  ])) {
    throw corrupt("Production candidate payload shape is invalid.");
  }
  if (!hasExactKeys(value.manifest, [
    "sourceKind",
    "conversionVersion",
    "adapterId",
    "ownership",
    "provenance",
    "assetHandling",
    "lifecycle",
  ])) {
    throw corrupt("Production candidate manifest shape is invalid.");
  }
  if (!hasExactKeys(value.manifest.ownership, ["siteId", "siteVersionId"])) {
    throw corrupt("Production candidate manifest ownership shape is invalid.");
  }
  if (!hasExactKeys(value.manifest.provenance, [
    "sourceSnapshotSha256",
    "exportManifestVersion",
    "exportSha256",
    "convertedArtifactSha256",
  ])) {
    throw corrupt("Production candidate provenance shape is invalid.");
  }
  if (!hasExactKeys(value.manifest.assetHandling, [
    "mode",
    "inlinedStylesheetPaths",
    "externalAssetStorageRequired",
  ])) {
    throw corrupt("Production candidate asset-handling shape is invalid.");
  }
  if (!hasExactKeys(value.manifest.lifecycle, ["storage", "lifetime", "durableRegistration"])) {
    throw corrupt("Production candidate lifecycle shape is invalid.");
  }
  if (
    !isAstroProductionCandidateId(value.id) ||
    !isBoundedIdentity(value.siteId) ||
    !isCanonicalUuid(value.siteVersionId) ||
    !isHtmlByPath(value.htmlByPath) ||
    typeof value.compiledTokenStyles !== "string" ||
    !isSha256Record(value.assetFingerprintMap) ||
    !Array.isArray(value.manifest.assetHandling.inlinedStylesheetPaths) ||
    !value.manifest.assetHandling.inlinedStylesheetPaths.every(isBoundedIdentity) ||
    new Set(value.manifest.assetHandling.inlinedStylesheetPaths).size !== value.manifest.assetHandling.inlinedStylesheetPaths.length ||
    value.manifest.assetHandling.externalAssetStorageRequired !== false ||
    !isSha256(value.manifest.provenance.sourceSnapshotSha256) ||
    !isSha256(value.manifest.provenance.exportSha256) ||
    !isSha256(value.manifest.provenance.convertedArtifactSha256) ||
    !isSha256(value.contentSha256) ||
    !isIsoTimestamp(value.createdAt)
  ) {
    throw corrupt("Production candidate payload failed structural validation.");
  }
  const candidate = value as unknown as AstroProductionCandidate;
  if (
    candidate.manifest.ownership.siteId !== candidate.siteId ||
    candidate.manifest.ownership.siteVersionId !== candidate.siteVersionId ||
    candidate.manifest.provenance.convertedArtifactSha256 !== candidate.contentSha256
  ) {
    throw new AstroProductionCandidateValidationError(
      "ownership_mismatch",
      "Production candidate payload ownership or content identity is inconsistent.",
    );
  }
  assertSelfContainedProductionPayload(candidate);
  const expectedContentSha256 = computeAstroInternalPreviewCandidateContentSha256(
    candidate as unknown as AstroInternalPreviewCandidate,
  );
  if (expectedContentSha256 !== candidate.contentSha256) {
    throw corrupt("Production candidate content-integrity hash does not match.");
  }
  return structuredClone(candidate);
}

export function isAstroProductionCandidate(value: unknown): value is AstroProductionCandidate {
  try {
    validateAstroProductionCandidate(value);
    return true;
  } catch {
    return false;
  }
}

function assertSupportedCandidateVersions(value: unknown): void {
  if (!isRecord(value) || !isRecord(value.manifest)) return;
  const manifest = value.manifest;
  if (typeof value.kind === "string" && value.kind !== ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND) {
    throw unsupported("Production candidate payload kind is unsupported.");
  }
  if (typeof manifest.sourceKind === "string" && manifest.sourceKind !== ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND) {
    throw unsupported("Production candidate source kind is unsupported.");
  }
  if (typeof manifest.adapterId === "string" && manifest.adapterId !== ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID) {
    throw unsupported("Production candidate adapter is unsupported.");
  }
  if (
    typeof manifest.conversionVersion === "string" &&
    manifest.conversionVersion !== ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION
  ) {
    throw unsupported("Production candidate conversion version is unsupported.");
  }
  if (
    isRecord(manifest.provenance) &&
    typeof manifest.provenance.exportManifestVersion === "string" &&
    manifest.provenance.exportManifestVersion !== ASTRO_STATIC_EXPORT_MANIFEST_VERSION
  ) {
    throw unsupported("Production candidate export version is unsupported.");
  }
  if (
    typeof value.rendererCompatibilityVersion === "string" &&
    value.rendererCompatibilityVersion !== RENDERER_COMPATIBILITY_VERSION
  ) {
    throw unsupported("Production candidate renderer version is unsupported.");
  }
  if (isRecord(manifest.assetHandling) && typeof manifest.assetHandling.mode === "string" && manifest.assetHandling.mode !== ASTRO_INTERNAL_PREVIEW_ASSET_MODE) {
    throw unsupported("Production candidate asset-handling version is unsupported.");
  }
  if (isRecord(manifest.lifecycle)) {
    if (
      manifest.lifecycle.storage !== ASTRO_PRODUCTION_CANDIDATE_STORAGE ||
      manifest.lifecycle.lifetime !== ASTRO_PRODUCTION_CANDIDATE_LIFETIME ||
      manifest.lifecycle.durableRegistration !== true
    ) {
      throw unsupported("Production candidate lifecycle is unsupported.");
    }
  }
}

function assertSelfContainedProductionPayload(candidate: AstroProductionCandidate): void {
  for (const html of Object.values(candidate.htmlByPath)) {
    validateSelfContainedAstroProductionPayload({ html, compiledTokenStyles: candidate.compiledTokenStyles });
  }
}

export function validateSelfContainedAstroProductionPayload(input: {
  html: string;
  compiledTokenStyles: string;
}): void {
  const parseErrors: string[] = [];
  const document = parse(input.html, {
    onParseError: (error) => parseErrors.push(error.code),
  }) as DefaultTreeAdapterMap["document"];
  if (parseErrors.length > 0) {
    throw corrupt("Production candidate HTML requires unsupported parser recovery.");
  }
  const elements = allElements(document);
  if (elements.some((element) => element.tagName === "script")) {
    throw corrupt("Production candidate HTML cannot contain scripts.");
  }
  for (const element of elements) {
    assertNoUnsupportedResourceElement(element);
    if (element.tagName === "style") assertSelfContainedCss(textContent(element));
  }
  assertSelfContainedCss(input.compiledTokenStyles);
}

function assertNoUnsupportedResourceElement(element: HtmlElement): void {
  if (element.tagName === "form") {
    throw corrupt("Production candidate HTML cannot contain forms.");
  }
  if (["iframe", "frame", "object", "embed"].includes(element.tagName)) {
    throw corrupt("Production candidate HTML cannot contain embedded application resources.");
  }
  if (
    element.tagName === "meta" &&
    attribute(element, "http-equiv")?.trim().toLowerCase() === "refresh"
  ) {
    throw corrupt("Production candidate HTML cannot contain refresh navigation.");
  }
  for (const item of element.attrs) {
    if (item.name.toLowerCase().startsWith("on") || /^\s*javascript:/i.test(item.value)) {
      throw corrupt("Production candidate HTML cannot contain executable attributes.");
    }
    if (item.name.toLowerCase() === "style") assertSelfContainedCss(`a{${item.value}}`);
  }
  if (element.tagName === "link" && attribute(element, "href")) {
    throw corrupt("Production candidate HTML cannot contain linked resources.");
  }
  const resourceAttributes: Record<string, string[]> = {
    img: ["src", "srcset"],
    source: ["src", "srcset"],
    video: ["src", "poster"],
    audio: ["src"],
    object: ["data"],
    embed: ["src"],
    input: ["src"],
    iframe: ["src", "srcdoc"],
    frame: ["src"],
    track: ["src"],
    use: ["href", "xlink:href"],
  };
  for (const name of resourceAttributes[element.tagName] ?? []) {
    const value = attribute(element, name);
    if (value && !resourceAttributeIsOwnedOrExternal(value)) {
      throw corrupt("Production candidate HTML contains an unsupported asset reference.");
    }
  }
}

function assertSelfContainedCss(css: string): void {
  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch (error) {
    throw corrupt("Production candidate CSS is invalid.", error);
  }
  root.walkAtRules((rule) => {
    if (rule.name.toLowerCase() === "import") {
      throw corrupt("Production candidate CSS cannot contain @import.");
    }
    assertNoExternalCssUrl(rule.params);
  });
  root.walkDecls((declaration) => assertNoExternalCssUrl(declaration.value));
}

function assertNoExternalCssUrl(value: string): void {
  for (const match of value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const reference = match[2]?.trim() ?? "";
    if (!reference || reference.startsWith("#") || /^data:/i.test(reference) || isOwnedRuntimeAssetReference(reference)) continue;
    throw corrupt("Production candidate CSS contains an unsupported external asset reference.");
  }
}

function resourceAttributeIsOwnedOrExternal(value: string): boolean {
  const references = value.split(",").map((item) => item.trim().split(/\s+/, 1)[0] ?? "").filter(Boolean);
  return references.length > 0 && references.every((reference) =>
    /^data:/i.test(reference) || /^https?:\/\//i.test(reference) || isOwnedRuntimeAssetReference(reference),
  );
}

function isOwnedRuntimeAssetReference(value: string): boolean {
  return /^\/api\/gnr8\/runtime\/preview-assets\/[^/?#]+\/[^/?#]+\/.+/i.test(value.trim());
}

function isHtmlByPath(value: unknown): value is Record<string, string> & { "/": string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length > 0 && typeof (value as Record<string, unknown>)["/"] === "string" && entries.every(([path, html]) =>
    /^\/(?:[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*)?$/i.test(path) && typeof html === "string" && html.length > 0,
  );
}

function validateRegistration(
  value: unknown,
  errorCode: "identity_invalid" | "corrupt" = "identity_invalid",
): AstroProductionCandidateRegistration {
  if (!hasExactKeys(value, [
    "storedAt",
    "registeredByActorId",
    "producerKind",
    "producerVersion",
    "producerRef",
    "idempotencyKey",
    "correlationId",
  ])) {
    throw new AstroProductionCandidateValidationError(errorCode, "Production registration context is invalid.");
  }
  if (!isIsoTimestamp(value.storedAt)) {
    throw new AstroProductionCandidateValidationError(errorCode, "Production registration timestamp is invalid.");
  }
  return {
    storedAt: value.storedAt,
    registeredByActorId: validateBoundedIdentity(value.registeredByActorId, "registered actor", errorCode),
    producerKind: validateBoundedIdentity(value.producerKind, "producer kind", errorCode),
    producerVersion: validateBoundedIdentity(value.producerVersion, "producer version", errorCode),
    producerRef: validateBoundedIdentity(value.producerRef, "producer ref", errorCode),
    idempotencyKey: validateBoundedIdentity(value.idempotencyKey, "idempotency key", errorCode),
    correlationId: validateBoundedIdentity(value.correlationId, "correlation ID", errorCode),
  };
}

function validateBoundedIdentity(
  value: unknown,
  label: string,
  errorCode: "identity_invalid" | "corrupt",
): string {
  if (!isBoundedIdentity(value)) {
    throw new AstroProductionCandidateValidationError(errorCode, `Production candidate ${label} is invalid.`);
  }
  return value;
}

function isBoundedIdentity(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= IDENTITY_MAX_CHARACTERS &&
    value === value.trim() &&
    !value.includes("\0");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isSha256Record(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.entries(value).every(([key, hash]) => isBoundedIdentity(key) && isSha256(hash));
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function allElements(root: HtmlNode): HtmlElement[] {
  const out: HtmlElement[] = [];
  const walk = (node: HtmlNode): void => {
    if ("tagName" in node && Array.isArray((node as HtmlElement).attrs)) out.push(node as HtmlElement);
    const children = "childNodes" in node ? node.childNodes ?? [] : [];
    for (const child of children) walk(child);
  };
  walk(root);
  return out;
}

function attribute(element: HtmlElement, name: string): string | null {
  return element.attrs.find((item) => item.name === name)?.value ?? null;
}

function textContent(node: HtmlNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  const children = "childNodes" in node ? node.childNodes ?? [] : [];
  return children.map(textContent).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function unsupported(message: string): AstroProductionCandidateValidationError {
  return new AstroProductionCandidateValidationError("unsupported_version", message);
}

function corrupt(message: string, cause?: unknown): AstroProductionCandidateValidationError {
  return new AstroProductionCandidateValidationError("corrupt", message, cause === undefined ? undefined : { cause });
}
