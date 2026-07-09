/**
 * Phase MVP-2.0-G Provider Generation Payload v2 deterministic builder.
 *
 * Builds the next-cycle provider payload foundation from one preserved Website
 * Generation Package plus one Generation Improvement Plan. This module does
 * not execute providers, execute AI, regenerate a website, mutate source
 * artifacts, run compliance, approve, publish, deploy, add UI/API/schema/
 * workers, change DNS, or perform runtime mutations.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { GenerationImprovementPlanArtifact } from "./generation-improvement-plan-contract";
import { validateGenerationImprovementPlan } from "./generation-improvement-plan-contract";
import {
  PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
  validateProviderGenerationPayload,
  type CodexTaskEnvelope,
  type ProviderAdapterIdentity,
  type ProviderGenerationPayload,
  type ProviderGenerationPayloadDeltaSummary,
  type ProviderGenerationPayloadImprovementGuidance,
  type ProviderGenerationPayloadRegenerationGuidance,
  type ProviderGenerationPayloadSafetyClassification,
  type ProviderGenerationPayloadStatus,
} from "./provider-generation-payload-contract";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
} from "./website-generation-package-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const PROVIDER_GENERATION_PAYLOAD_V2_RUNTIME_VERSION = "MVP-2.0-G" as const;

export type ProviderGenerationPayloadV2BuilderInput = {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
  generationImprovementPlan: GenerationImprovementPlanArtifact;
  sourceGenerationImprovementPlanArtifactId: string;
  createdAt?: string;
};

export type ProviderGenerationPayloadV2SafetyVerification = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export class ProviderGenerationPayloadV2SourceIntegrityError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super("ProviderGenerationPayload v2 source integrity check failed.");
    this.name = "ProviderGenerationPayloadV2SourceIntegrityError";
    this.errors = errors;
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
  plan: GenerationImprovementPlanArtifact;
  sourceGenerationImprovementPlanArtifactId: string;
}): string {
  return `provider-generation-payload:${sha256Hex(stableStringify({
    providerType: "codex",
    payloadKind: "codex_task",
    sourceWebsiteGenerationPackageId: input.wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    sourceGenerationImprovementPlanId: input.plan.generationImprovementPlanId,
    sourceGenerationImprovementPlanArtifactId: input.sourceGenerationImprovementPlanArtifactId,
    runtimeVersion: PROVIDER_GENERATION_PAYLOAD_V2_RUNTIME_VERSION,
    contractVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function adapterIdentity(): ProviderAdapterIdentity {
  return {
    adapterId: "provider-adapter:regeneration-payload:mvp-2-0-g",
    adapterName: "Provider Generation Payload V2 Builder",
    adapterVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
    adapterContractVersion: PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
    providerType: "codex",
    payloadKind: "codex_task",
    sourceArtifactKind: "website_generation_package",
    serializationMode: "deterministic_export",
    diagnostics: [
      "PROVIDER_GENERATION_PAYLOAD_V2_DETERMINISTIC_EXPORT",
      "PROVIDER_GENERATION_PAYLOAD_V2_NO_PROVIDER_CALL",
      "PROVIDER_GENERATION_PAYLOAD_V2_NO_AI_EXECUTION",
    ],
  };
}

function sourceStatus(input: {
  wgp: WebsiteGenerationPackageArtifact;
  plan: GenerationImprovementPlanArtifact;
  sourceValid: boolean;
  planValid: boolean;
}): ProviderGenerationPayloadStatus {
  if (!input.sourceValid || !input.planValid) return "invalid";
  if (input.wgp.status === "invalid" || input.plan.status === "invalid") return "invalid";
  if (input.wgp.status === "stale" || input.plan.status === "stale") return "stale";
  if (input.wgp.status === "blocked" || input.plan.status === "blocked") return "blocked";
  if (input.wgp.status === "draft" || input.plan.status === "draft") return "draft";
  if (input.plan.status === "ready" && (input.wgp.status === "valid" || input.wgp.status === "partial")) return "ready";
  return "draft";
}

function forbiddenActions(): string[] {
  return [
    "Do not call a provider.",
    "Do not send prompts or run AI.",
    "Do not create generated website output.",
    "Do not persist generated output or execution results.",
    "Do not alter the Website Generation Package.",
    "Do not alter the Generation Improvement Plan.",
    "Do not run compliance or create Business Approval artifacts.",
    "Do not perform publishing.",
    "Do not perform deployment.",
    "Do not perform DNS changes.",
    "Do not perform production mutations.",
    "Do not add runtime mutations, workers, API routes, UI surfaces, or schema changes.",
  ];
}

function stopConditions(): string[] {
  return [
    "Stop before any provider call.",
    "Stop before any prompt is sent.",
    "Stop before any AI execution.",
    "Stop before generated website output is created.",
    "Stop before compliance execution, Business Approval, publishing, deployment, DNS, or production mutations.",
    "Stop if source lineage cannot be proven.",
    "Stop if the preserved business meaning would be changed.",
  ];
}

function requiredSortedRefs(values: string[], fallback: string): string[] {
  const refs = [...new Set(values.filter((value) => value.length > 0))].sort();
  return refs.length > 0 ? refs : [fallback];
}

function businessLevelText(value: string): string {
  return value
    .replace(/html/gi, "page-structure")
    .replace(/react/gi, "interactive-experience")
    .replace(/css/gi, "visual-presentation")
    .replace(/\bframeworks?\b/gi, "technical approach")
    .replace(/component/gi, "section");
}

function guidanceFromPlan(
  plan: GenerationImprovementPlanArtifact,
): ProviderGenerationPayloadImprovementGuidance[] {
  return plan.actions.map((action) => ({
    originatingImprovementId: action.actionId,
    originatingDeviationIds: requiredSortedRefs(
      action.originatingDeviationIds,
      `source-plan-action-without-deviation:${action.actionId}`,
    ),
    originatingRequirementIds: requiredSortedRefs(
      action.originatingRequirementIds,
      `source-plan-action-without-requirement:${action.actionId}`,
    ),
    category: action.category,
    priority: action.priority,
    expectedOutcome: businessLevelText(action.expectedImprovementOutcome),
  })).sort((left, right) =>
    left.priority.localeCompare(right.priority) ||
    left.category.localeCompare(right.category) ||
    left.originatingImprovementId.localeCompare(right.originatingImprovementId));
}

function regenerationGuidance(input: {
  wgp: WebsiteGenerationPackageArtifact;
  plan: GenerationImprovementPlanArtifact;
}): ProviderGenerationPayloadRegenerationGuidance {
  const improve = guidanceFromPlan(input.plan);
  return {
    preserve: [
      "business context",
      "generation objectives",
      "audience requirements",
      "required messages",
      "navigation contracts",
      "page contracts",
      "section contracts",
      "content requirements",
      "validation expectations",
      "confidence",
      "limitations",
      "lineage",
    ],
    improve,
    do_not_change: [
      "Do not change the original business intent.",
      "Do not remove declared audiences.",
      "Do not remove declared messages.",
      "Do not weaken navigation, page, section, content, or validation requirements.",
      "Do not hide limitations or confidence.",
      "Do not change upstream lineage.",
    ],
    known_limitations: uniqueSorted([
      ...input.wgp.limitations.map(businessLevelText),
      ...input.plan.diagnostics.filter((diagnostic) => diagnostic.includes("LIMITATION")).map(businessLevelText),
      ...(input.plan.sourceReportIntegrity.limitationCount > 0
        ? [`SOURCE_REPORT_LIMITATION_COUNT:${input.plan.sourceReportIntegrity.limitationCount}`]
        : []),
    ]),
    critical_items: improve.filter((item) => item.priority === "critical"),
  };
}

function recommendedStrategy(plan: GenerationImprovementPlanArtifact): string {
  if (plan.summary.recommendedNextAction === "stop") return "Stop until blockers are resolved.";
  if (plan.summary.recommendedNextAction === "collect_more_information") {
    return "Collect missing business evidence before the next regeneration cycle.";
  }
  if (plan.summary.recommendedNextAction === "human_review") {
    return "Keep the preserved package available for human review before any next cycle.";
  }
  if (plan.summary.criticalCount > 0) return "Run a full business-level regeneration pass focused first on critical items.";
  if (plan.summary.highCount > 0) return "Run a targeted business-level regeneration pass focused on high-priority items.";
  return "Run a conservative business-level regeneration pass preserving all source package meaning.";
}

function deltaSummary(plan: GenerationImprovementPlanArtifact): ProviderGenerationPayloadDeltaSummary {
  return {
    totalImprovements: plan.summary.improvementCount,
    critical: plan.summary.criticalCount,
    high: plan.summary.highCount,
    medium: plan.summary.mediumCount,
    low: plan.summary.lowCount,
    affectedCategories: Object.entries(plan.summary.categorySummary)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([category]) => category)
      .sort(),
    recommendedRegenerationStrategy: recommendedStrategy(plan),
  };
}

function codexTaskEnvelope(input: {
  wgp: WebsiteGenerationPackageArtifact;
  sourceWebsiteGenerationPackageArtifactId: string;
  plan: GenerationImprovementPlanArtifact;
  sourceGenerationImprovementPlanArtifactId: string;
}): CodexTaskEnvelope {
  const wgp = input.wgp;
  return {
    objective: "Prepare business-level regeneration planning from the preserved Website Generation Package and Generation Improvement Plan only. Do not execute, generate output, alter canonical artifacts, publish, deploy, change DNS, or mutate runtime state.",
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
        "Preservation summary",
        "Regeneration guidance",
        "Improvement traceability",
        "Delta summary",
        "Safety confirmation",
      ],
      prohibitedSections: [
        "Generated output",
        "Code output",
        "Execution result",
        "Compliance result",
        "Business Approval",
        "Publishing instructions",
        "Deployment instructions",
        "DNS instructions",
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
      "Payload v2 is safe to inspect and persist as regeneration planning only.",
      "Payload v2 does not authorize execution, generated output, deployment, DNS, production mutation, compliance, approval, or publishing.",
    ],
  };
}

function integrityErrors(input: ProviderGenerationPayloadV2BuilderInput): string[] {
  const errors: string[] = [];
  const wgp = input.websiteGenerationPackage;
  const plan = input.generationImprovementPlan;
  if (input.sourceWebsiteGenerationPackageArtifactId.length === 0) {
    errors.push("sourceWebsiteGenerationPackageArtifactId is required");
  }
  if (input.sourceGenerationImprovementPlanArtifactId.length === 0) {
    errors.push("sourceGenerationImprovementPlanArtifactId is required");
  }
  if (wgp.siteVersionId !== plan.siteVersionId) errors.push("sources must have the same siteVersionId");
  if (wgp.dryRunId !== plan.dryRunId) errors.push("sources must have the same dryRunId");
  if (wgp.websiteGenerationPackageId !== plan.sourceWebsiteGenerationPackageId) {
    errors.push("Generation Improvement Plan must reference the source Website Generation Package");
  }
  if (plan.lineage.sourceWebsiteGenerationPackageId !== wgp.websiteGenerationPackageId) {
    errors.push("Generation Improvement Plan lineage must reference the source Website Generation Package");
  }
  if (wgp.lineage.siteVersionId !== wgp.siteVersionId) errors.push("WGP lineage siteVersionId must match source");
  if (wgp.lineage.dryRunId !== wgp.dryRunId) errors.push("WGP lineage dryRunId must match source");
  if (plan.lineage.siteVersionId !== plan.siteVersionId) errors.push("Improvement Plan lineage siteVersionId must match source");
  if (plan.lineage.dryRunId !== plan.dryRunId) errors.push("Improvement Plan lineage dryRunId must match source");
  return errors;
}

export function assertProviderGenerationPayloadV2SourceIntegrity(
  input: ProviderGenerationPayloadV2BuilderInput,
): void {
  const errors = integrityErrors(input);
  if (errors.length > 0) throw new ProviderGenerationPayloadV2SourceIntegrityError(errors);
}

export function verifyProviderGenerationPayloadV2Safety(
  payload: ProviderGenerationPayload,
): ProviderGenerationPayloadV2SafetyVerification {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contractValidation = validateProviderGenerationPayload(payload);
  errors.push(...contractValidation.errors);
  warnings.push(...contractValidation.warnings);

  const guidanceText = stableStringify({
    regenerationGuidance: payload.regenerationGuidance,
    deltaSummary: payload.deltaSummary,
  }).toLowerCase();
  for (const term of ["codex", "html", "react", "css", "framework", "component", "provider-specific"]) {
    if (guidanceText.includes(term)) {
      errors.push(`regeneration guidance must not contain ${term}`);
    }
  }
  for (const [key, expected] of Object.entries({
    providerExecutionAllowed: false,
    aiExecutionAllowed: false,
    generatedWebsiteAllowed: false,
    publishingAllowed: false,
    deploymentAllowed: false,
    dnsMutationAllowed: false,
    productionMutationAllowed: false,
    complianceExecutionAllowed: false,
  })) {
    if (payload.safetyClassification[key as keyof ProviderGenerationPayloadSafetyClassification] !== expected) {
      errors.push(`safetyClassification.${key} must be false`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function buildProviderGenerationPayloadV2(
  input: ProviderGenerationPayloadV2BuilderInput,
): ProviderGenerationPayload {
  assertProviderGenerationPayloadV2SourceIntegrity(input);

  const createdAt = input.createdAt ?? new Date().toISOString();
  const wgp = input.websiteGenerationPackage;
  const plan = input.generationImprovementPlan;
  const sourceValidation = validateWebsiteGenerationPackage(wgp);
  const planValidation = validateGenerationImprovementPlan(plan);
  const status = sourceStatus({
    wgp,
    plan,
    sourceValid: sourceValidation.valid,
    planValid: planValidation.valid,
  });
  const adapter = adapterIdentity();
  const guidance = regenerationGuidance({ wgp, plan });
  const summary = deltaSummary(plan);
  const payload: ProviderGenerationPayload = {
    providerGenerationPayloadId: providerGenerationPayloadId({
      wgp,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      plan,
      sourceGenerationImprovementPlanArtifactId: input.sourceGenerationImprovementPlanArtifactId,
    }),
    status,
    providerType: "codex",
    payloadKind: "codex_task",
    sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
    sourceGenerationImprovementPlanId: plan.generationImprovementPlanId,
    sourceGenerationImprovementPlanArtifactId: input.sourceGenerationImprovementPlanArtifactId,
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
      sourceGenerationImprovementPlanId: plan.generationImprovementPlanId,
      sourceGenerationImprovementPlanArtifactId: input.sourceGenerationImprovementPlanArtifactId,
      sourceGenerationImprovementPlanStatus: plan.status,
      sourceGenerationImprovementPlanContractVersion: plan.contractVersion,
      sourceWebsiteDesignBriefId: wgp.sourceWebsiteDesignBriefId,
      sourceDigitalBusinessTwinId: wgp.lineage.sourceDigitalBusinessTwinId,
      sourceBusinessAlignmentId: wgp.lineage.sourceBusinessAlignmentId,
      evidenceRefs: uniqueEvidenceRefs(wgp.lineage.evidenceRefs),
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: input.sourceWebsiteGenerationPackageArtifactId,
          sourceKind: "website_generation_package",
          description: "Persisted Website Generation Package preserved in Provider Generation Payload v2.",
        },
        {
          refId: input.sourceGenerationImprovementPlanArtifactId,
          sourceKind: "generation_improvement_plan",
          description: "Persisted Generation Improvement Plan integrated as deterministic regeneration guidance.",
        },
        {
          refId: plan.generationImprovementPlanId,
          sourceKind: "generation_improvement_plan",
          description: "Source Generation Improvement Plan semantic identifier.",
        },
        ...wgp.lineage.upstreamArtifactRefs,
      ]),
      adapterIdentity: adapter,
    },
    serializedWebsiteGenerationPackage: cloneJson(wgp),
    codexTaskEnvelope: codexTaskEnvelope({
      wgp,
      sourceWebsiteGenerationPackageArtifactId: input.sourceWebsiteGenerationPackageArtifactId,
      plan,
      sourceGenerationImprovementPlanArtifactId: input.sourceGenerationImprovementPlanArtifactId,
    }),
    preservedConstraints: cloneJson(wgp.constraints),
    validationExpectations: cloneJson(wgp.validationContract.expectations),
    confidence: cloneJson(wgp.confidence),
    limitations: uniqueSorted([
      ...wgp.limitations,
      ...(wgp.status !== "valid" ? [`SOURCE_WGP_STATUS_NOT_VALID:${wgp.status}`] : []),
      ...(plan.status !== "ready" ? [`SOURCE_IMPROVEMENT_PLAN_STATUS_NOT_READY:${plan.status}`] : []),
      ...sourceValidation.errors.map((error) => `SOURCE_WGP_INVALID: ${error}`),
      ...planValidation.errors.map((error) => `SOURCE_IMPROVEMENT_PLAN_INVALID: ${error}`),
    ]),
    diagnostics: uniqueSorted([
      `PROVIDER_GENERATION_PAYLOAD_V2_RUNTIME_VERSION:${PROVIDER_GENERATION_PAYLOAD_V2_RUNTIME_VERSION}`,
      `PROVIDER_GENERATION_PAYLOAD_STATUS:${status}`,
      "PROVIDER_GENERATION_PAYLOAD_V2_IS_REGENERATION_PLANNING_ONLY",
      "PROVIDER_GENERATION_PAYLOAD_V2_CONTAINS_NO_EXECUTION_RESULT",
      "PROVIDER_GENERATION_PAYLOAD_V2_CONTAINS_NO_GENERATED_WEBSITE",
      "PROVIDER_GENERATION_PAYLOAD_V2_PRESERVES_WGP",
      "PROVIDER_GENERATION_PAYLOAD_V2_INTEGRATES_IMPROVEMENT_PLAN",
    ]),
    safetyClassification: safetyClassification(),
    regenerationGuidance: guidance,
    deltaSummary: summary,
  };

  const safety = verifyProviderGenerationPayloadV2Safety(payload);
  if (!safety.valid) {
    return {
      ...payload,
      status: "invalid",
      limitations: uniqueSorted([
        ...payload.limitations,
        ...safety.errors.map((error) => `PROVIDER_GENERATION_PAYLOAD_V2_SAFETY_FAILED: ${error}`),
      ]),
      diagnostics: uniqueSorted([
        ...payload.diagnostics,
        "PROVIDER_GENERATION_PAYLOAD_V2_ARTIFACT_INVALID",
      ]),
    };
  }

  return {
    ...cloneJson(payload),
    diagnostics: uniqueSorted([
      ...payload.diagnostics,
      "PROVIDER_GENERATION_PAYLOAD_V2_ARTIFACT_VALID",
      "PROVIDER_GENERATION_PAYLOAD_V2_SAFETY_VERIFIED",
    ]),
  };
}
