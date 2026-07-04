/**
 * Phase MVP-1H Codex task ProviderGenerationPayload deterministic builder.
 *
 * Builds an exportable Codex task payload from one persisted Website
 * Generation Package. This module performs no provider calls, prompt sends,
 * AI execution, website generation, persistence, compliance, publishing, UI,
 * API, schema, worker, DNS, deployment, or production mutation behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
  validateProviderGenerationPayload,
  type CodexTaskEnvelope,
  type ProviderAdapterIdentity,
  type ProviderGenerationPayload,
  type ProviderGenerationPayloadStatus,
  type ProviderGenerationPayloadSafetyClassification,
} from "./provider-generation-payload-contract";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
} from "./website-generation-package-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_VERSION = "MVP-1H" as const;

export type CodexTaskProviderPayloadBuilderInput = {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
  createdAt?: string;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function uniqueEvidenceRefs(refs: DigitalBusinessTwinEvidenceRef[]): DigitalBusinessTwinEvidenceRef[] {
  const byKey = new Map<string, DigitalBusinessTwinEvidenceRef>();
  for (const ref of refs) {
    byKey.set(stableStringify(ref), ref);
  }
  return [...byKey.values()].sort((left, right) =>
    left.refId.localeCompare(right.refId) ||
    left.sourceKind.localeCompare(right.sourceKind) ||
    (left.routePath ?? "").localeCompare(right.routePath ?? "") ||
    (left.description ?? "").localeCompare(right.description ?? ""));
}

function providerGenerationPayloadId(input: {
  wgp: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
}): string {
  return `provider-generation-payload:${sha256Hex(stableStringify({
    providerType: "codex",
    payloadKind: "codex_task",
    sourceWebsiteGenerationPackageId: input.wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    contractVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function sourceStatus(input: {
  wgp: WebsiteGenerationPackageArtifact;
  sourceValid: boolean;
}): ProviderGenerationPayloadStatus {
  if (!input.sourceValid || input.wgp.status === "invalid") return "invalid";
  if (input.wgp.status === "stale") return "stale";
  if (input.wgp.status === "blocked") return "blocked";
  if (input.wgp.status === "valid") return "valid";
  return "draft";
}

function adapterIdentity(): ProviderAdapterIdentity {
  return {
    adapterId: "provider-adapter:codex-task:mvp-1h",
    adapterName: "Codex Task Provider Payload Builder",
    adapterVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
    adapterContractVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
    providerType: "codex",
    payloadKind: "codex_task",
    sourceArtifactKind: "website_generation_package",
    serializationMode: "deterministic_export",
    diagnostics: [
      "CODEX_TASK_ADAPTER_EXPORT_ONLY",
      "CODEX_TASK_ADAPTER_NO_PROVIDER_CALL",
      "CODEX_TASK_ADAPTER_NO_AI_EXECUTION",
    ],
  };
}

function forbiddenActions(): string[] {
  return [
    "Do not call Codex or any provider.",
    "Do not send prompts or execute external AI.",
    "Do not generate a final website, generated HTML, generated React, generated components, generated blocks, or generated content.",
    "Do not persist generated output or provider results.",
    "Do not run compliance or create Business Approval artifacts.",
    "Do not perform publishing.",
    "Do not perform deployment.",
    "Do not perform DNS changes.",
    "Do not perform production mutations.",
    "Do not create runtime mutations, workers, API routes, UI surfaces, or schema changes.",
    "Do not reinterpret business meaning, invent missing knowledge, weaken constraints, or hide limitations.",
  ];
}

function stopConditions(): string[] {
  return [
    "Stop before any provider call.",
    "Stop before any prompt is sent.",
    "Stop before any external AI execution.",
    "Stop before generating website code, rendered pages, provider results, or generated output.",
    "Stop before compliance execution, Business Approval, publishing, deployment, DNS, or production mutations.",
    "Stop if the Website Generation Package meaning cannot be preserved without reinterpretation.",
    "Stop if required source lineage, constraints, validation expectations, confidence, limitations, or diagnostics are missing.",
  ];
}

function codexTaskEnvelope(input: {
  wgp: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
}): CodexTaskEnvelope {
  const wgp = input.wgp;
  return {
    objective: "Create an implementation proposal only for a future website implementation from the serialized Website Generation Package. Do not implement, generate, execute, publish, deploy, mutate production, call providers, send prompts, or create generated website output.",
    sourcePackageSummary: {
      websiteGenerationPackageId: wgp.websiteGenerationPackageId,
      websiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      status: wgp.status,
      businessContext: wgp.businessContext.statement,
      objectiveStatements: wgp.generationObjectives.map((objective) => objective.statement),
      audienceStatements: wgp.audience.map((audience) => audience.audienceStatement),
      messageStatements: wgp.messages.map((message) => message.statement),
      limitationCount: wgp.limitations.length,
      diagnosticCount: wgp.diagnostics.length,
    },
    requiredWebsiteOutcomes: {
      generationObjectives: cloneJson(wgp.generationObjectives),
      audience: cloneJson(wgp.audience),
      messages: cloneJson(wgp.messages),
    },
    navigationPageSectionRequirements: {
      navigationContract: cloneJson(wgp.navigationContract),
      pageContracts: cloneJson(wgp.pageContracts),
      sectionContracts: cloneJson(wgp.sectionContracts),
    },
    contentRequirements: cloneJson(wgp.contentRequirements),
    constraints: cloneJson(wgp.constraints),
    validationExpectations: cloneJson(wgp.validationContract.expectations),
    forbiddenActions: forbiddenActions(),
    expectedOutputShape: {
      outputKind: "implementation_proposal_only",
      requiredSections: [
        "Proposal summary",
        "WGP preservation mapping",
        "Navigation, page, and section implementation approach",
        "Content coverage approach",
        "Constraint preservation approach",
        "Validation expectation mapping",
        "Limitations and confidence preservation notes",
        "Lineage references used",
        "Non-execution confirmation",
      ],
      prohibitedSections: [
        "Generated website code",
        "Generated HTML",
        "Generated React",
        "Generated components",
        "Deployment instructions",
        "Publishing instructions",
        "DNS instructions",
        "Provider result",
        "Compliance result",
        "Business Approval",
      ],
    },
    stopConditions: stopConditions(),
  };
}

function safetyClassification(): ProviderGenerationPayloadSafetyClassification {
  return {
    classification: "export_only_no_execution",
    providerExecutionAllowed: false,
    aiExecutionAllowed: false,
    generatedWebsiteAllowed: false,
    publishingAllowed: false,
    deploymentAllowed: false,
    dnsMutationAllowed: false,
    productionMutationAllowed: false,
    complianceExecutionAllowed: false,
    notes: [
      "Payload is safe to inspect and export as a future task envelope only.",
      "Payload does not authorize provider execution, generated output, deployment, DNS, production mutation, compliance, approval, or publishing.",
    ],
  };
}

export function buildCodexTaskProviderPayload(
  input: CodexTaskProviderPayloadBuilderInput,
): ProviderGenerationPayload {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const wgp = input.websiteGenerationPackage;
  const sourceValidation = validateWebsiteGenerationPackage(wgp);
  const status = sourceStatus({ wgp, sourceValid: sourceValidation.valid });
  const adapter = adapterIdentity();
  const payload: ProviderGenerationPayload = {
    providerGenerationPayloadId: providerGenerationPayloadId({
      wgp,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    }),
    status,
    providerType: "codex",
    payloadKind: "codex_task",
    sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    siteVersionId: wgp.siteVersionId,
    dryRunId: wgp.dryRunId,
    createdAt,
    contractVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
    lineage: {
      siteVersionId: wgp.siteVersionId,
      dryRunId: wgp.dryRunId,
      sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      sourceWebsiteGenerationPackageStatus: wgp.status,
      sourceWebsiteGenerationPackageContractVersion: wgp.contractVersion,
      sourceWebsiteDesignBriefId: wgp.sourceWebsiteDesignBriefId,
      sourceDigitalBusinessTwinId: wgp.lineage.sourceDigitalBusinessTwinId,
      sourceBusinessAlignmentId: wgp.lineage.sourceBusinessAlignmentId,
      evidenceRefs: uniqueEvidenceRefs(wgp.lineage.evidenceRefs),
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: input.sourceWebsiteGenerationPackageArtifactId,
          sourceKind: "website_generation_package",
          description: "Persisted Website Generation Package serialized into Codex task ProviderGenerationPayload MVP-1H.",
        },
        {
          refId: wgp.websiteGenerationPackageId,
          sourceKind: "website_generation_package",
          description: "Source Website Generation Package semantic identifier.",
        },
        ...wgp.lineage.upstreamArtifactRefs,
      ]),
      adapterIdentity: adapter,
    },
    serializedWebsiteGenerationPackage: cloneJson(wgp),
    codexTaskEnvelope: codexTaskEnvelope({
      wgp,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    }),
    preservedConstraints: cloneJson(wgp.constraints),
    validationExpectations: cloneJson(wgp.validationContract.expectations),
    confidence: cloneJson(wgp.confidence),
    limitations: uniqueSorted([
      ...wgp.limitations,
      ...(wgp.status !== "valid" ? [`SOURCE_WGP_STATUS_NOT_VALID:${wgp.status}`] : []),
      ...sourceValidation.errors.map((error) => `SOURCE_WGP_INVALID: ${error}`),
    ]),
    diagnostics: uniqueSorted([
      `CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_VERSION:${CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_VERSION}`,
      `PROVIDER_GENERATION_PAYLOAD_STATUS:${status}`,
      "PROVIDER_GENERATION_PAYLOAD_IS_EXPORT_ONLY",
      "PROVIDER_GENERATION_PAYLOAD_CONTAINS_NO_PROVIDER_RESULT",
      "PROVIDER_GENERATION_PAYLOAD_CONTAINS_NO_GENERATED_WEBSITE",
      "PROVIDER_GENERATION_PAYLOAD_PRESERVES_WGP_CONSTRAINTS",
      "PROVIDER_GENERATION_PAYLOAD_PRESERVES_WGP_VALIDATION_EXPECTATIONS",
    ]),
    safetyClassification: safetyClassification(),
  };

  const validation = validateProviderGenerationPayload({
    payload,
    sourceWebsiteGenerationPackage: wgp,
  });
  if (!validation.valid) {
    return {
      ...payload,
      status: "invalid",
      limitations: uniqueSorted([
        ...payload.limitations,
        ...validation.errors.map((error) => `PROVIDER_GENERATION_PAYLOAD_CONTRACT_VALIDATION_FAILED: ${error}`),
      ]),
      diagnostics: uniqueSorted([
        ...payload.diagnostics,
        "PROVIDER_GENERATION_PAYLOAD_ARTIFACT_INVALID",
      ]),
    };
  }

  return {
    ...cloneJson(payload),
    diagnostics: uniqueSorted([
      ...payload.diagnostics,
      "PROVIDER_GENERATION_PAYLOAD_ARTIFACT_VALID",
    ]),
  };
}
