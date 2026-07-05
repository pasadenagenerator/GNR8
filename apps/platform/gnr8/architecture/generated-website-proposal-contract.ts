/**
 * Phase MVP-1K-1 Generated Website Proposal import contract.
 *
 * Generated Website Proposal is quarantined implementation proposal material
 * imported from manual Codex output metadata. It is not trusted, not business
 * truth, not compliance, not Business Approval, not publishing, not provider
 * execution, and not a mutation of upstream canonical artifacts.
 */

import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";
import {
  validateProviderGenerationPayload,
  type ProviderGenerationPayload,
  type ProviderGenerationPayloadStatus,
} from "./provider-generation-payload-contract";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
  type WebsiteGenerationPackageStatus,
} from "./website-generation-package-contract";

export const GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION = "MVP-1K-1" as const;

export const GENERATED_WEBSITE_PROPOSAL_STATUSES = [
  "received",
  "quarantined",
  "invalid",
  "blocked",
  "superseded",
  "compliance_ready",
] as const;
export type GeneratedWebsiteProposalStatus = (typeof GENERATED_WEBSITE_PROPOSAL_STATUSES)[number];

export type GeneratedWebsiteProposalLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceProviderGenerationPayloadId: string;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceProviderGenerationPayloadStatus: ProviderGenerationPayloadStatus;
  sourceProviderGenerationPayloadContractVersion: string;
  sourceProviderType: "codex";
  sourcePayloadKind: "codex_task";
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  sourceWebsiteGenerationPackageStatus: WebsiteGenerationPackageStatus;
  sourceWebsiteGenerationPackageContractVersion: string;
  sourceWebsiteDesignBriefId: string;
  sourceBusinessAlignmentId: string;
  sourceDigitalBusinessTwinId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
  outputBundleId: string;
  operatorAttestationId: string;
  importedAt: string;
};

export type GeneratedWebsiteProposalSource = {
  sourceProviderGenerationPayloadId: string;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  providerType: "codex";
  payloadKind: "codex_task";
  executionProviderName: string;
  executedAt: string;
  operatorReference: string;
  sourcePayloadReference: string;
  copiedPayloadIntegrity: "attested";
  acceptedStaleReason?: string;
  diagnostics: string[];
};

export type GeneratedWebsiteProposalOutputBundle = {
  outputBundleId: string;
  bundleKind: "manual_codex_output_bundle";
  classification: "implementation_proposal_only";
  storageReference: string;
  contentReference?: string;
  contentHash?: string;
  submittedAt: string;
  submittedBy: string;
  fileCount?: number;
  byteSize?: number;
  entrypoints: string[];
  containsPublishingArtifact: false;
  containsDeploymentArtifact: false;
  containsDnsMutationArtifact: false;
  containsRuntimeMutationArtifact: false;
  containsComplianceReport: false;
  containsBusinessApproval: false;
  diagnostics: string[];
};

export type GeneratedWebsiteProposalOperatorAttestation = {
  attestationId: string;
  operatorId: string;
  attestedAt: string;
  sourceProviderGenerationPayloadId: string;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  outputBundleId: string;
  implementationProposalOnly: true;
  outputNotExecutedByGnr8: true;
  noGnr8ProviderCall: true;
  noGnr8AiExecution: true;
  noPublishing: true;
  noDeployment: true;
  noDnsMutation: true;
  noProductionMutation: true;
  noRuntimeMutation: true;
  noComplianceExecution: true;
  noBusinessApproval: true;
  noCanonicalTruthUpdate: true;
  generatedOutputReferencedOnly: true;
  statement: string;
  diagnostics: string[];
};

export type GeneratedWebsiteProposalSafety = {
  classification: "implementation_proposal_only";
  quarantineStatus: "quarantined";
  trusted: false;
  executableByGnr8: false;
  gnr8ProviderExecutionAllowed: false;
  gnr8AiExecutionAllowed: false;
  publishingAllowed: false;
  deploymentAllowed: false;
  dnsMutationAllowed: false;
  productionMutationAllowed: false;
  runtimeMutationAllowed: false;
  complianceExecutionAllowed: false;
  businessApprovalAllowed: false;
  canonicalTruthUpdateAllowed: false;
  checks: string[];
  diagnostics: string[];
};

export type GeneratedWebsiteProposalValidationReadiness = {
  readiness: "not_ready" | "ready" | "blocked";
  readyForCompliance: boolean;
  checks: {
    checkId: string;
    status: "passed" | "failed" | "blocked";
    statement: string;
  }[];
  blockers: string[];
  diagnostics: string[];
};

export type GeneratedWebsiteProposalArtifact = {
  generatedWebsiteProposalId: string;
  status: GeneratedWebsiteProposalStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceProviderGenerationPayloadId: string;
  sourceWebsiteGenerationPackageId: string;
  createdAt: string;
  contractVersion: typeof GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION;
  lineage: GeneratedWebsiteProposalLineage;
  source: GeneratedWebsiteProposalSource;
  outputBundle: GeneratedWebsiteProposalOutputBundle;
  providerNotes: string[];
  implementationAssumptions: string[];
  knownLimitations: string[];
  operatorAttestation: GeneratedWebsiteProposalOperatorAttestation;
  safety: GeneratedWebsiteProposalSafety;
  validationReadiness: GeneratedWebsiteProposalValidationReadiness;
  limitations: string[];
  diagnostics: string[];
};

export type GeneratedWebsiteProposalValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type GeneratedWebsiteProposalValidationInput = {
  artifact: unknown;
  sourceProviderGenerationPayload?: ProviderGenerationPayload;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
};

export const GENERATED_WEBSITE_PROPOSAL_FORBIDDEN_FIELDS = [
  "businessDiscovery",
  "digitalBusinessTwin",
  "businessUnderstandingReport",
  "businessAlignment",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerGenerationPayload",
  "complianceReport",
  "businessApproval",
  "publishingArtifact",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "runtimeMutation",
  "autoPublish",
  "providerResultTrusted",
  "canonicalTruthUpdate",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTraversable(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if (!isTraversable(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (GENERATED_WEBSITE_PROPOSAL_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Generated Website Proposal artifacts`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateRequiredObject(value: unknown, path: string, errors: string[]): Record<string, unknown> | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  return value;
}

function validateStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const values: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") errors.push(`${path}[${index}] must be a string`);
    else values.push(item);
  }
  return values;
}

function validateEvidenceRefs(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`;
    if (!isObject(ref)) {
      errors.push(`${refPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(ref.refId)) errors.push(`${refPath}.refId is required`);
    if (!isNonEmptyString(ref.sourceKind)) errors.push(`${refPath}.sourceKind is required`);
  }
}

function validateLineage(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  const lineage = validateRequiredObject(value, "lineage", errors);
  if (!lineage) return;
  for (const key of [
    "siteVersionId",
    "dryRunId",
    "sourceProviderGenerationPayloadId",
    "sourceProviderGenerationPayloadArtifactId",
    "sourceProviderGenerationPayloadStatus",
    "sourceProviderGenerationPayloadContractVersion",
    "sourceWebsiteGenerationPackageId",
    "sourceWebsiteGenerationPackageArtifactId",
    "sourceWebsiteGenerationPackageStatus",
    "sourceWebsiteGenerationPackageContractVersion",
    "sourceWebsiteDesignBriefId",
    "sourceBusinessAlignmentId",
    "sourceDigitalBusinessTwinId",
    "outputBundleId",
    "operatorAttestationId",
  ]) {
    if (!isNonEmptyString(lineage[key])) errors.push(`lineage.${key} is required`);
  }
  if (lineage.sourceProviderType !== "codex") errors.push("lineage.sourceProviderType must be codex");
  if (lineage.sourcePayloadKind !== "codex_task") errors.push("lineage.sourcePayloadKind must be codex_task");
  if (!isTimestamp(lineage.importedAt)) errors.push("lineage.importedAt must be a valid timestamp");
  if (lineage.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (lineage.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (lineage.sourceProviderGenerationPayloadId !== artifact.sourceProviderGenerationPayloadId) {
    errors.push("lineage.sourceProviderGenerationPayloadId must match sourceProviderGenerationPayloadId");
  }
  if (lineage.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  validateEvidenceRefs(lineage.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(lineage.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateSource(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  const source = validateRequiredObject(value, "source", errors);
  if (!source) return;
  for (const key of [
    "sourceProviderGenerationPayloadId",
    "sourceProviderGenerationPayloadArtifactId",
    "sourceWebsiteGenerationPackageId",
    "sourceWebsiteGenerationPackageArtifactId",
    "executionProviderName",
    "executedAt",
    "operatorReference",
    "sourcePayloadReference",
  ]) {
    if (!isNonEmptyString(source[key])) errors.push(`source.${key} is required`);
  }
  if (source.providerType !== "codex") errors.push("source.providerType must be codex");
  if (source.payloadKind !== "codex_task") errors.push("source.payloadKind must be codex_task");
  if (source.copiedPayloadIntegrity !== "attested") {
    errors.push("source.copiedPayloadIntegrity must be attested");
  }
  if (!isTimestamp(source.executedAt)) errors.push("source.executedAt must be a valid timestamp");
  if (source.sourceProviderGenerationPayloadId !== artifact.sourceProviderGenerationPayloadId) {
    errors.push("source.sourceProviderGenerationPayloadId must match sourceProviderGenerationPayloadId");
  }
  if (source.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("source.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  validateStringArray(source.diagnostics, "source.diagnostics", errors);
}

function validateOutputBundle(value: unknown, errors: string[]): void {
  const bundle = validateRequiredObject(value, "outputBundle", errors);
  if (!bundle) return;
  for (const key of ["outputBundleId", "storageReference", "submittedAt", "submittedBy"]) {
    if (!isNonEmptyString(bundle[key])) errors.push(`outputBundle.${key} is required`);
  }
  if (bundle.bundleKind !== "manual_codex_output_bundle") {
    errors.push("outputBundle.bundleKind must be manual_codex_output_bundle");
  }
  if (bundle.classification !== "implementation_proposal_only") {
    errors.push("outputBundle.classification must be implementation_proposal_only");
  }
  if (!isTimestamp(bundle.submittedAt)) errors.push("outputBundle.submittedAt must be a valid timestamp");
  if (bundle.fileCount !== undefined && (typeof bundle.fileCount !== "number" || bundle.fileCount < 0)) {
    errors.push("outputBundle.fileCount must be a non-negative number");
  }
  if (bundle.byteSize !== undefined && (typeof bundle.byteSize !== "number" || bundle.byteSize < 0)) {
    errors.push("outputBundle.byteSize must be a non-negative number");
  }
  validateStringArray(bundle.entrypoints, "outputBundle.entrypoints", errors);
  validateStringArray(bundle.diagnostics, "outputBundle.diagnostics", errors);
  for (const key of [
    "containsPublishingArtifact",
    "containsDeploymentArtifact",
    "containsDnsMutationArtifact",
    "containsRuntimeMutationArtifact",
    "containsComplianceReport",
    "containsBusinessApproval",
  ]) {
    if (bundle[key] !== false) errors.push(`outputBundle.${key} must be false`);
  }
}

function validateOperatorAttestation(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  const attestation = validateRequiredObject(value, "operatorAttestation", errors);
  if (!attestation) return;
  for (const key of [
    "attestationId",
    "operatorId",
    "attestedAt",
    "sourceProviderGenerationPayloadId",
    "sourceProviderGenerationPayloadArtifactId",
    "sourceWebsiteGenerationPackageId",
    "sourceWebsiteGenerationPackageArtifactId",
    "outputBundleId",
    "statement",
  ]) {
    if (!isNonEmptyString(attestation[key])) errors.push(`operatorAttestation.${key} is required`);
  }
  if (!isTimestamp(attestation.attestedAt)) errors.push("operatorAttestation.attestedAt must be a valid timestamp");
  if (attestation.sourceProviderGenerationPayloadId !== artifact.sourceProviderGenerationPayloadId) {
    errors.push("operatorAttestation.sourceProviderGenerationPayloadId must match sourceProviderGenerationPayloadId");
  }
  if (attestation.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("operatorAttestation.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  for (const key of [
    "implementationProposalOnly",
    "outputNotExecutedByGnr8",
    "noGnr8ProviderCall",
    "noGnr8AiExecution",
    "noPublishing",
    "noDeployment",
    "noDnsMutation",
    "noProductionMutation",
    "noRuntimeMutation",
    "noComplianceExecution",
    "noBusinessApproval",
    "noCanonicalTruthUpdate",
    "generatedOutputReferencedOnly",
  ]) {
    if (attestation[key] !== true) errors.push(`operatorAttestation.${key} must be true`);
  }
  validateStringArray(attestation.diagnostics, "operatorAttestation.diagnostics", errors);
}

function validateSafety(value: unknown, errors: string[]): void {
  const safety = validateRequiredObject(value, "safety", errors);
  if (!safety) return;
  if (safety.classification !== "implementation_proposal_only") {
    errors.push("safety.classification must be implementation_proposal_only");
  }
  if (safety.quarantineStatus !== "quarantined") errors.push("safety.quarantineStatus must be quarantined");
  for (const key of [
    "trusted",
    "executableByGnr8",
    "gnr8ProviderExecutionAllowed",
    "gnr8AiExecutionAllowed",
    "publishingAllowed",
    "deploymentAllowed",
    "dnsMutationAllowed",
    "productionMutationAllowed",
    "runtimeMutationAllowed",
    "complianceExecutionAllowed",
    "businessApprovalAllowed",
    "canonicalTruthUpdateAllowed",
  ]) {
    if (safety[key] !== false) errors.push(`safety.${key} must be false`);
  }
  validateStringArray(safety.checks, "safety.checks", errors);
  validateStringArray(safety.diagnostics, "safety.diagnostics", errors);
}

function validateReadiness(
  value: unknown,
  status: unknown,
  errors: string[],
): void {
  const readiness = validateRequiredObject(value, "validationReadiness", errors);
  if (!readiness) return;
  if (
    readiness.readiness !== "not_ready" &&
    readiness.readiness !== "ready" &&
    readiness.readiness !== "blocked"
  ) {
    errors.push("validationReadiness.readiness is not allowed");
  }
  if (typeof readiness.readyForCompliance !== "boolean") {
    errors.push("validationReadiness.readyForCompliance must be boolean");
  }
  if (!Array.isArray(readiness.checks)) {
    errors.push("validationReadiness.checks must be an array");
  } else {
    for (const [index, check] of readiness.checks.entries()) {
      const path = `validationReadiness.checks[${index}]`;
      if (!isObject(check)) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (!isNonEmptyString(check.checkId)) errors.push(`${path}.checkId is required`);
      if (!isNonEmptyString(check.statement)) errors.push(`${path}.statement is required`);
      if (check.status !== "passed" && check.status !== "failed" && check.status !== "blocked") {
        errors.push(`${path}.status is not allowed`);
      }
    }
  }
  const blockers = validateStringArray(readiness.blockers, "validationReadiness.blockers", errors);
  validateStringArray(readiness.diagnostics, "validationReadiness.diagnostics", errors);
  if (status === "compliance_ready") {
    if (readiness.readiness !== "ready") {
      errors.push("validationReadiness.readiness must be ready when status is compliance_ready");
    }
    if (readiness.readyForCompliance !== true) {
      errors.push("validationReadiness.readyForCompliance must be true when status is compliance_ready");
    }
    if (blockers.length > 0) {
      errors.push("validationReadiness.blockers must be empty when status is compliance_ready");
    }
  }
}

function validateSourceArtifacts(input: {
  artifact: Record<string, unknown>;
  sourceProviderGenerationPayload?: ProviderGenerationPayload;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
  errors: string[];
  warnings: string[];
}): void {
  const { artifact, errors, warnings } = input;
  if (input.sourceProviderGenerationPayload) {
    const payloadValidation = validateProviderGenerationPayload({
      payload: input.sourceProviderGenerationPayload,
      sourceWebsiteGenerationPackage: input.sourceWebsiteGenerationPackage,
    });
    errors.push(...payloadValidation.errors.map((error) => `sourceProviderGenerationPayload.${error}`));
    warnings.push(...payloadValidation.warnings.map((warning) => `sourceProviderGenerationPayload.${warning}`));
    const sourcePayload = input.sourceProviderGenerationPayload;
    if (sourcePayload.providerGenerationPayloadId !== artifact.sourceProviderGenerationPayloadId) {
      errors.push("sourceProviderGenerationPayload.providerGenerationPayloadId must match sourceProviderGenerationPayloadId");
    }
    if (sourcePayload.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
      errors.push("sourceProviderGenerationPayload.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
    }
    if (sourcePayload.siteVersionId !== artifact.siteVersionId) {
      errors.push("sourceProviderGenerationPayload.siteVersionId must match siteVersionId");
    }
    if (sourcePayload.dryRunId !== artifact.dryRunId) {
      errors.push("sourceProviderGenerationPayload.dryRunId must match dryRunId");
    }
  }
  if (input.sourceWebsiteGenerationPackage) {
    const wgpValidation = validateWebsiteGenerationPackage(input.sourceWebsiteGenerationPackage);
    errors.push(...wgpValidation.errors.map((error) => `sourceWebsiteGenerationPackage.${error}`));
    warnings.push(...wgpValidation.warnings.map((warning) => `sourceWebsiteGenerationPackage.${warning}`));
    const sourceWgp = input.sourceWebsiteGenerationPackage;
    if (sourceWgp.websiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
      errors.push("sourceWebsiteGenerationPackage.websiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
    }
    if (sourceWgp.siteVersionId !== artifact.siteVersionId) {
      errors.push("sourceWebsiteGenerationPackage.siteVersionId must match siteVersionId");
    }
    if (sourceWgp.dryRunId !== artifact.dryRunId) {
      errors.push("sourceWebsiteGenerationPackage.dryRunId must match dryRunId");
    }
  }
}

export function validateGeneratedWebsiteProposal(
  validationInput: GeneratedWebsiteProposalValidationInput | GeneratedWebsiteProposalArtifact,
): GeneratedWebsiteProposalValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as GeneratedWebsiteProposalValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Generated Website Proposal must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.generatedWebsiteProposalId)) errors.push("generatedWebsiteProposalId is required");
  if (!GENERATED_WEBSITE_PROPOSAL_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Generated Website Proposal status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceProviderGenerationPayloadId)) {
    errors.push("sourceProviderGenerationPayloadId is required");
  }
  if (!isNonEmptyString(artifact.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION}`);
  }

  validateLineage(artifact.lineage, artifact, errors);
  validateSource(artifact.source, artifact, errors);
  validateOutputBundle(artifact.outputBundle, errors);
  validateStringArray(artifact.providerNotes, "providerNotes", errors);
  validateStringArray(artifact.implementationAssumptions, "implementationAssumptions", errors);
  validateStringArray(artifact.knownLimitations, "knownLimitations", errors);
  validateOperatorAttestation(artifact.operatorAttestation, artifact, errors);
  validateSafety(artifact.safety, errors);
  validateReadiness(artifact.validationReadiness, artifact.status, errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceArtifacts({
    artifact,
    sourceProviderGenerationPayload: input.sourceProviderGenerationPayload,
    sourceWebsiteGenerationPackage: input.sourceWebsiteGenerationPackage,
    errors,
    warnings,
  });

  if (
    isObject(artifact.lineage) &&
    isObject(artifact.outputBundle) &&
    artifact.lineage.outputBundleId !== artifact.outputBundle.outputBundleId
  ) {
    errors.push("lineage.outputBundleId must match outputBundle.outputBundleId");
  }
  if (
    isObject(artifact.lineage) &&
    isObject(artifact.operatorAttestation) &&
    artifact.lineage.operatorAttestationId !== artifact.operatorAttestation.attestationId
  ) {
    errors.push("lineage.operatorAttestationId must match operatorAttestation.attestationId");
  }
  if (
    isObject(artifact.outputBundle) &&
    isObject(artifact.operatorAttestation) &&
    artifact.outputBundle.outputBundleId !== artifact.operatorAttestation.outputBundleId
  ) {
    errors.push("operatorAttestation.outputBundleId must match outputBundle.outputBundleId");
  }
  if (
    isObject(artifact.source) &&
    isObject(artifact.lineage) &&
    artifact.source.sourceProviderGenerationPayloadArtifactId !== artifact.lineage.sourceProviderGenerationPayloadArtifactId
  ) {
    errors.push("source.sourceProviderGenerationPayloadArtifactId must match lineage.sourceProviderGenerationPayloadArtifactId");
  }
  if (
    isObject(artifact.source) &&
    isObject(artifact.lineage) &&
    artifact.source.sourceWebsiteGenerationPackageArtifactId !== artifact.lineage.sourceWebsiteGenerationPackageArtifactId
  ) {
    errors.push("source.sourceWebsiteGenerationPackageArtifactId must match lineage.sourceWebsiteGenerationPackageArtifactId");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
