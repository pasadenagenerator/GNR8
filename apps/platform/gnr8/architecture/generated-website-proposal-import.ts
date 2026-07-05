/**
 * Phase MVP-1K-1 Generated Website Proposal manual-output import builder.
 *
 * This module imports metadata for manually generated Codex output as
 * quarantined proposal material only. It performs no provider call, AI
 * execution, generated code execution, publishing, deployment, DNS mutation,
 * production mutation, runtime mutation, compliance execution, approval, UI,
 * API, schema, or persistence behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION,
  validateGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalArtifact,
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
  type GeneratedWebsiteProposalSafety,
  type GeneratedWebsiteProposalSource,
  type GeneratedWebsiteProposalValidationReadiness,
  type GeneratedWebsiteProposalValidationResult,
} from "./generated-website-proposal-contract";
import {
  validateProviderGenerationPayload,
  type ProviderGenerationPayload,
} from "./provider-generation-payload-contract";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
} from "./website-generation-package-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION = "MVP-1K-1" as const;

export type GeneratedWebsiteProposalImportInput = {
  sourceProviderGenerationPayload: ProviderGenerationPayload;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceWebsiteGenerationPackage: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
  source: Omit<
    GeneratedWebsiteProposalSource,
    | "sourceProviderGenerationPayloadId"
    | "sourceProviderGenerationPayloadArtifactId"
    | "sourceWebsiteGenerationPackageId"
    | "sourceWebsiteGenerationPackageArtifactId"
    | "providerType"
    | "payloadKind"
  >;
  outputBundle: GeneratedWebsiteProposalOutputBundle;
  operatorAttestation: GeneratedWebsiteProposalOperatorAttestation;
  providerNotes?: string[];
  implementationAssumptions?: string[];
  knownLimitations?: string[];
  createdAt?: string;
};

export class GeneratedWebsiteProposalImportValidationError extends Error {
  readonly validation: GeneratedWebsiteProposalValidationResult;

  constructor(validation: GeneratedWebsiteProposalValidationResult) {
    super("Generated Website Proposal import input is invalid.");
    this.name = "GeneratedWebsiteProposalImportValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function uniqueEvidenceRefs(refs: DigitalBusinessTwinEvidenceRef[]): DigitalBusinessTwinEvidenceRef[] {
  const byKey = new Map<string, DigitalBusinessTwinEvidenceRef>();
  for (const ref of refs) byKey.set(stableStringify(ref), ref);
  return [...byKey.values()].sort((left, right) =>
    left.refId.localeCompare(right.refId) ||
    left.sourceKind.localeCompare(right.sourceKind) ||
    (left.routePath ?? "").localeCompare(right.routePath ?? "") ||
    (left.description ?? "").localeCompare(right.description ?? ""));
}

function proposalId(input: {
  sourceProviderGenerationPayload: ProviderGenerationPayload;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  outputBundle: GeneratedWebsiteProposalOutputBundle;
  operatorAttestation: GeneratedWebsiteProposalOperatorAttestation;
}): string {
  return `generated-website-proposal:${sha256Hex(stableStringify({
    sourceProviderGenerationPayloadId: input.sourceProviderGenerationPayload.providerGenerationPayloadId,
    sourceProviderGenerationPayloadArtifactId: input.sourceProviderGenerationPayloadArtifactId,
    sourceWebsiteGenerationPackageId: input.sourceProviderGenerationPayload.sourceWebsiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    outputBundleId: input.outputBundle.outputBundleId,
    outputBundleStorageReference: input.outputBundle.storageReference,
    outputBundleContentHash: input.outputBundle.contentHash ?? null,
    operatorAttestationId: input.operatorAttestation.attestationId,
    contractVersion: GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function validateImportSources(input: GeneratedWebsiteProposalImportInput): GeneratedWebsiteProposalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.outputBundle) {
    errors.push("outputBundle metadata is required");
  }
  if (!input.operatorAttestation) {
    errors.push("operator attestation is required");
  }
  if (!input.outputBundle || !input.operatorAttestation) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }
  const payloadValidation = validateProviderGenerationPayload({
    payload: input.sourceProviderGenerationPayload,
    sourceWebsiteGenerationPackage: input.sourceWebsiteGenerationPackage,
  });
  errors.push(...payloadValidation.errors.map((error) => `sourceProviderGenerationPayload.${error}`));
  warnings.push(...payloadValidation.warnings.map((warning) => `sourceProviderGenerationPayload.${warning}`));
  const wgpValidation = validateWebsiteGenerationPackage(input.sourceWebsiteGenerationPackage);
  errors.push(...wgpValidation.errors.map((error) => `sourceWebsiteGenerationPackage.${error}`));
  warnings.push(...wgpValidation.warnings.map((warning) => `sourceWebsiteGenerationPackage.${warning}`));

  const payload = input.sourceProviderGenerationPayload;
  const wgp = input.sourceWebsiteGenerationPackage;
  if (payload.sourceWebsiteGenerationPackageId !== wgp.websiteGenerationPackageId) {
    errors.push("source ProviderGenerationPayload must reference the source Website Generation Package");
  }
  if (payload.sourceWebsiteGenerationPackageArtifactId !== input.sourceWebsiteGenerationPackageArtifactId) {
    errors.push("source ProviderGenerationPayload WGP artifact ID must match sourceWebsiteGenerationPackageArtifactId");
  }
  if (payload.siteVersionId !== wgp.siteVersionId) {
    errors.push("source ProviderGenerationPayload siteVersionId must match source WGP siteVersionId");
  }
  if (payload.dryRunId !== wgp.dryRunId) {
    errors.push("source ProviderGenerationPayload dryRunId must match source WGP dryRunId");
  }
  if (payload.lineage.sourceWebsiteGenerationPackageId !== wgp.websiteGenerationPackageId) {
    errors.push("source ProviderGenerationPayload lineage must reference source WGP ID");
  }
  if (payload.lineage.sourceWebsiteGenerationPackageArtifactId !== input.sourceWebsiteGenerationPackageArtifactId) {
    errors.push("source ProviderGenerationPayload lineage must reference source WGP artifact ID");
  }
  if (input.operatorAttestation.sourceProviderGenerationPayloadId !== payload.providerGenerationPayloadId) {
    errors.push("operatorAttestation.sourceProviderGenerationPayloadId must match source ProviderGenerationPayload");
  }
  if (input.operatorAttestation.sourceProviderGenerationPayloadArtifactId !== input.sourceProviderGenerationPayloadArtifactId) {
    errors.push("operatorAttestation.sourceProviderGenerationPayloadArtifactId must match source artifact ID");
  }
  if (input.operatorAttestation.sourceWebsiteGenerationPackageId !== wgp.websiteGenerationPackageId) {
    errors.push("operatorAttestation.sourceWebsiteGenerationPackageId must match source WGP");
  }
  if (input.operatorAttestation.sourceWebsiteGenerationPackageArtifactId !== input.sourceWebsiteGenerationPackageArtifactId) {
    errors.push("operatorAttestation.sourceWebsiteGenerationPackageArtifactId must match source WGP artifact ID");
  }
  if (input.operatorAttestation.outputBundleId !== input.outputBundle.outputBundleId) {
    errors.push("operatorAttestation.outputBundleId must match outputBundle.outputBundleId");
  }
  if (input.outputBundle.classification !== "implementation_proposal_only") {
    errors.push("output bundle must be classified as implementation proposal only");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function source(input: GeneratedWebsiteProposalImportInput): GeneratedWebsiteProposalSource {
  const payload = input.sourceProviderGenerationPayload;
  return {
    ...cloneJson(input.source),
    sourceProviderGenerationPayloadId: payload.providerGenerationPayloadId,
    sourceProviderGenerationPayloadArtifactId: input.sourceProviderGenerationPayloadArtifactId,
    sourceWebsiteGenerationPackageId: payload.sourceWebsiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    providerType: "codex",
    payloadKind: "codex_task",
    diagnostics: uniqueSorted([
      ...input.source.diagnostics,
      "GENERATED_WEBSITE_PROPOSAL_SOURCE_METADATA_PRESENT",
      "GENERATED_WEBSITE_PROPOSAL_SOURCE_PAYLOAD_REFERENCE_ATTESTED",
    ]),
  };
}

function safety(): GeneratedWebsiteProposalSafety {
  return {
    classification: "implementation_proposal_only",
    quarantineStatus: "quarantined",
    trusted: false,
    executableByGnr8: false,
    gnr8ProviderExecutionAllowed: false,
    gnr8AiExecutionAllowed: false,
    publishingAllowed: false,
    deploymentAllowed: false,
    dnsMutationAllowed: false,
    productionMutationAllowed: false,
    runtimeMutationAllowed: false,
    complianceExecutionAllowed: false,
    businessApprovalAllowed: false,
    canonicalTruthUpdateAllowed: false,
    checks: [
      "SOURCE_PROVIDER_GENERATION_PAYLOAD_EXISTS",
      "SOURCE_WEBSITE_GENERATION_PACKAGE_EXISTS",
      "SOURCE_LINEAGE_MATCHES",
      "OPERATOR_ATTESTATION_PRESENT",
      "OUTPUT_BUNDLE_METADATA_PRESENT",
      "NO_PUBLISH_DEPLOY_DNS_RUNTIME_MUTATION_ARTIFACTS",
      "NO_PROVIDER_EXECUTION_SIDE_EFFECTS_CLAIMED_AS_GNR8_EXECUTION",
      "OUTPUT_CLASSIFIED_AS_IMPLEMENTATION_PROPOSAL_ONLY",
    ],
    diagnostics: [
      "GENERATED_WEBSITE_PROPOSAL_IS_QUARANTINED",
      "GENERATED_WEBSITE_PROPOSAL_IS_NOT_TRUSTED",
      "GENERATED_WEBSITE_PROPOSAL_CANNOT_UPDATE_CANONICAL_BUSINESS_ARTIFACTS",
    ],
  };
}

function validationReadiness(): GeneratedWebsiteProposalValidationReadiness {
  return {
    readiness: "ready",
    readyForCompliance: true,
    checks: [
      {
        checkId: "source_lineage_matches",
        status: "passed",
        statement: "Source ProviderGenerationPayload and Website Generation Package lineage match.",
      },
      {
        checkId: "output_bundle_metadata_present",
        status: "passed",
        statement: "Operator-provided output bundle metadata is present.",
      },
      {
        checkId: "operator_attestation_present",
        status: "passed",
        statement: "Operator attestation is present and proposal-only.",
      },
      {
        checkId: "quarantine_safety_passed",
        status: "passed",
        statement: "Quarantine safety flags prohibit publishing, deployment, DNS, runtime mutation, compliance, approval, and canonical truth updates.",
      },
      {
        checkId: "forbidden_fields_absent",
        status: "passed",
        statement: "Forbidden canonical artifact and mutation fields are absent.",
      },
    ],
    blockers: [],
    diagnostics: [
      "GENERATED_WEBSITE_PROPOSAL_READY_FOR_FUTURE_COMPLIANCE_INPUT",
      "GENERATED_WEBSITE_PROPOSAL_VALIDATION_READINESS_IS_NOT_COMPLIANCE",
    ],
  };
}

export function buildGeneratedWebsiteProposalFromManualOutput(
  input: GeneratedWebsiteProposalImportInput,
): GeneratedWebsiteProposalArtifact {
  const sourceValidation = validateImportSources(input);
  if (!sourceValidation.valid) throw new GeneratedWebsiteProposalImportValidationError(sourceValidation);

  const payload = input.sourceProviderGenerationPayload;
  const wgp = input.sourceWebsiteGenerationPackage;
  const createdAt = input.createdAt ?? input.outputBundle.submittedAt;
  const artifact: GeneratedWebsiteProposalArtifact = {
    generatedWebsiteProposalId: proposalId({
      sourceProviderGenerationPayload: payload,
      sourceProviderGenerationPayloadArtifactId: input.sourceProviderGenerationPayloadArtifactId,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      outputBundle: input.outputBundle,
      operatorAttestation: input.operatorAttestation,
    }),
    status: "quarantined",
    siteVersionId: payload.siteVersionId,
    dryRunId: payload.dryRunId,
    sourceProviderGenerationPayloadId: payload.providerGenerationPayloadId,
    sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
    createdAt,
    contractVersion: GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION,
    lineage: {
      siteVersionId: payload.siteVersionId,
      dryRunId: payload.dryRunId,
      sourceProviderGenerationPayloadId: payload.providerGenerationPayloadId,
      sourceProviderGenerationPayloadArtifactId: input.sourceProviderGenerationPayloadArtifactId,
      sourceProviderGenerationPayloadStatus: payload.status,
      sourceProviderGenerationPayloadContractVersion: payload.contractVersion,
      sourceProviderType: "codex",
      sourcePayloadKind: "codex_task",
      sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      sourceWebsiteGenerationPackageStatus: wgp.status,
      sourceWebsiteGenerationPackageContractVersion: wgp.contractVersion,
      sourceWebsiteDesignBriefId: wgp.sourceWebsiteDesignBriefId,
      sourceBusinessAlignmentId: wgp.lineage.sourceBusinessAlignmentId,
      sourceDigitalBusinessTwinId: wgp.lineage.sourceDigitalBusinessTwinId,
      evidenceRefs: uniqueEvidenceRefs([
        ...payload.lineage.evidenceRefs,
        ...wgp.lineage.evidenceRefs,
      ]),
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: input.sourceProviderGenerationPayloadArtifactId,
          sourceKind: "provider_generation_payload",
          description: "Source ProviderGenerationPayload artifact for quarantined Generated Website Proposal import.",
        },
        {
          refId: input.sourceWebsiteGenerationPackageArtifactId,
          sourceKind: "website_generation_package",
          description: "Source Website Generation Package artifact for quarantined Generated Website Proposal import.",
        },
        {
          refId: input.outputBundle.outputBundleId,
          sourceKind: "manual_codex_output_bundle",
          description: "Operator-provided generated output bundle metadata.",
        },
        ...payload.lineage.upstreamArtifactRefs,
      ]),
      outputBundleId: input.outputBundle.outputBundleId,
      operatorAttestationId: input.operatorAttestation.attestationId,
      importedAt: createdAt,
    },
    source: source(input),
    outputBundle: cloneJson(input.outputBundle),
    providerNotes: cloneJson(input.providerNotes ?? []),
    implementationAssumptions: cloneJson(input.implementationAssumptions ?? []),
    knownLimitations: cloneJson(input.knownLimitations ?? []),
    operatorAttestation: cloneJson(input.operatorAttestation),
    safety: safety(),
    validationReadiness: validationReadiness(),
    limitations: uniqueSorted([
      ...payload.limitations,
      ...wgp.limitations,
      ...(input.knownLimitations ?? []),
      "GENERATED_WEBSITE_PROPOSAL_IS_IMPLEMENTATION_PROPOSAL_ONLY",
      "GENERATED_WEBSITE_PROPOSAL_REMAINS_QUARANTINED_UNTIL_FUTURE_GOVERNANCE",
      "GENERATED_OUTPUT_CONTENT_IS_REFERENCED_ONLY_NOT_EXECUTED",
    ]),
    diagnostics: uniqueSorted([
      `GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION:${GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION}`,
      "GENERATED_WEBSITE_PROPOSAL_IMPORTED_FROM_MANUAL_OUTPUT_METADATA",
      "GENERATED_WEBSITE_PROPOSAL_NO_PROVIDER_CALL",
      "GENERATED_WEBSITE_PROPOSAL_NO_AI_EXECUTION",
      "GENERATED_WEBSITE_PROPOSAL_NO_CODE_EXECUTION",
      "GENERATED_WEBSITE_PROPOSAL_NO_PUBLISHING",
      "GENERATED_WEBSITE_PROPOSAL_NO_MUTATION",
    ]),
  };

  const validation = validateGeneratedWebsiteProposal({
    artifact,
    sourceProviderGenerationPayload: payload,
    sourceWebsiteGenerationPackage: wgp,
  });
  if (!validation.valid) throw new GeneratedWebsiteProposalImportValidationError(validation);
  return cloneJson(artifact);
}
