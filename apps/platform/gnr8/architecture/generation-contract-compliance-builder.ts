/**
 * Phase MVP-1K-4 deterministic Generation Contract Compliance builder.
 *
 * Compares only WebsiteGenerationPackageArtifact and ObservedWebsiteModelArtifact.
 * No AI, provider calls, generation, report writing, approval, publishing,
 * API/UI/worker behavior, or runtime mutation occurs here.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION,
  validateGenerationContractCompliance,
  type ComplianceCategory,
  type ComplianceCategoryResult,
  type ComplianceConfidence,
  type ComplianceDeviation,
  type ComplianceEvidence,
  type ComplianceFinding,
  type ComplianceLimitation,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
  type ComplianceValidationResult,
} from "./generation-contract-compliance-contract";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationConstraint,
  type WebsiteGenerationContentRequirement,
  type WebsiteGenerationMessage,
  type WebsiteGenerationObjective,
  type WebsiteGenerationPackageArtifact,
  type WebsiteGenerationPageContract,
  type WebsiteGenerationSectionContract,
} from "./website-generation-package-contract";
import {
  validateObservedWebsiteModel,
  type ObservedAsset,
  type ObservedConstraint,
  type ObservedMessage,
  type ObservedNavigation,
  type ObservedPage,
  type ObservedSection,
  type ObservedTechnicalSignal,
  type ObservedWebsiteModelArtifact,
} from "./observed-website-model-contract";

export const GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION = "MVP-1K-4" as const;

export type GenerationContractComplianceBuildInput = {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  observedWebsiteModel: ObservedWebsiteModelArtifact;
  createdAt?: string;
};

export class GenerationContractComplianceBuildValidationError extends Error {
  readonly validation: ComplianceValidationResult;

  constructor(validation: ComplianceValidationResult) {
    super("Generation Contract Compliance build input is invalid.");
    this.name = "GenerationContractComplianceBuildValidationError";
    this.validation = validation;
  }
}

type SourceRecord =
  | { kind: "observed_page"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_navigation"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_section"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_message"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_asset"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_constraint"; id: string; text: string; observedEvidenceRefIds: string[] }
  | { kind: "observed_technical_signal"; id: string; text: string; observedEvidenceRefIds: string[] };

type Evaluation = {
  category: ComplianceCategory;
  sourceRequirementId: string;
  statement: string;
  result: "fulfilled" | "partial" | "deviation";
  evidence: ComplianceEvidence[];
  limitation?: ComplianceLimitation;
  deviationDescription?: string;
  severity?: ComplianceDeviation["severity"];
  diagnostics: string[];
};

type CategoryInput = {
  category: ComplianceCategory;
  sourceRequirementIds: string[];
  findings: ComplianceFinding[];
  deviations: ComplianceDeviation[];
  limitations: ComplianceLimitation[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const value of values) byKey.set(key(value), value);
  return [...byKey.values()].sort((left, right) => key(left).localeCompare(key(right)));
}

function itemHash(input: unknown): string {
  return sha256Hex(stableStringify(input)).slice(0, 24);
}

function complianceId(input: {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  observedWebsiteModel: ObservedWebsiteModelArtifact;
}): string {
  return `generation-contract-compliance:${sha256Hex(stableStringify({
    sourceWebsiteGenerationPackageId: input.websiteGenerationPackage.websiteGenerationPackageId,
    sourceObservedWebsiteModelId: input.observedWebsiteModel.observedWebsiteModelId,
    contractVersion: GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function evidenceId(input: unknown): string {
  return `gcc-evidence:${itemHash(input)}`;
}

function findingId(input: unknown): string {
  return `gcc-finding:${itemHash(input)}`;
}

function deviationId(input: unknown): string {
  return `gcc-deviation:${itemHash(input)}`;
}

function limitationId(input: unknown): string {
  return `gcc-limitation:${itemHash(input)}`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string): string[] {
  return uniqueSorted(normalizeText(value).split(" ").filter((token) => token.length >= 3));
}

function textCoverage(needle: string, haystack: string): boolean {
  const normalizedNeedle = normalizeText(needle);
  const normalizedHaystack = normalizeText(haystack);
  if (!normalizedNeedle) return false;
  if (normalizedHaystack.includes(normalizedNeedle)) return true;
  const needleTokens = tokens(needle);
  if (needleTokens.length === 0) return false;
  const haystackTokens = new Set(tokens(haystack));
  const covered = needleTokens.filter((token) => haystackTokens.has(token)).length;
  return covered / needleTokens.length >= 0.7;
}

function observedEvidenceRefIds(model: ObservedWebsiteModelArtifact, ids: string[]): string[] {
  return uniqueSorted(ids.filter((id) =>
    model.evidence.some((evidence) => evidence.observedEvidenceId === id)));
}

function sourceRecords(model: ObservedWebsiteModelArtifact): SourceRecord[] {
  const pageText = (page: ObservedPage) => [page.routePath, page.title].filter(Boolean).join(" ");
  const navigationText = (item: ObservedNavigation) => [item.label, item.href].filter(Boolean).join(" ");
  const sectionText = (section: ObservedSection) =>
    [section.routePath, section.sectionType, section.label, section.contentSummary].filter(Boolean).join(" ");
  const messageText = (message: ObservedMessage) => [message.routePath, message.textSummary].filter(Boolean).join(" ");
  const assetText = (asset: ObservedAsset) => [asset.path, asset.assetKind, asset.contentType].filter(Boolean).join(" ");
  const constraintText = (constraint: ObservedConstraint) => constraint.statement;
  const signalText = (signal: ObservedTechnicalSignal) => [signal.signalType, signal.value].join(" ");

  return [
    ...model.pages.map((page): SourceRecord => ({
      kind: "observed_page",
      id: page.observedPageId,
      text: pageText(page),
      observedEvidenceRefIds: observedEvidenceRefIds(model, page.evidenceRefIds),
    })),
    ...model.navigation.map((item): SourceRecord => ({
      kind: "observed_navigation",
      id: item.observedNavigationId,
      text: navigationText(item),
      observedEvidenceRefIds: observedEvidenceRefIds(model, item.evidenceRefIds),
    })),
    ...model.sections.map((section): SourceRecord => ({
      kind: "observed_section",
      id: section.observedSectionId,
      text: sectionText(section),
      observedEvidenceRefIds: observedEvidenceRefIds(model, section.evidenceRefIds),
    })),
    ...model.messages.map((message): SourceRecord => ({
      kind: "observed_message",
      id: message.observedMessageId,
      text: messageText(message),
      observedEvidenceRefIds: observedEvidenceRefIds(model, message.evidenceRefIds),
    })),
    ...model.assets.map((asset): SourceRecord => ({
      kind: "observed_asset",
      id: asset.observedAssetId,
      text: assetText(asset),
      observedEvidenceRefIds: observedEvidenceRefIds(model, asset.evidenceRefIds),
    })),
    ...model.constraints.map((constraint): SourceRecord => ({
      kind: "observed_constraint",
      id: constraint.observedConstraintId,
      text: constraintText(constraint),
      observedEvidenceRefIds: observedEvidenceRefIds(model, constraint.evidenceRefIds),
    })),
    ...model.technicalSignals.map((signal): SourceRecord => ({
      kind: "observed_technical_signal",
      id: signal.observedTechnicalSignalId,
      text: signalText(signal),
      observedEvidenceRefIds: observedEvidenceRefIds(model, signal.evidenceRefIds),
    })),
  ];
}

function inventoryEvidence(input: {
  category: ComplianceCategory;
  model: ObservedWebsiteModelArtifact;
  description: string;
}): ComplianceEvidence {
  return {
    complianceEvidenceId: evidenceId({
      category: input.category,
      sourceKind: "observed_website_model",
      sourceId: input.model.observedWebsiteModelId,
      description: input.description,
    }),
    category: input.category,
    sourceKind: "observed_website_model",
    sourceId: input.model.observedWebsiteModelId,
    observedEvidenceRefIds: input.model.evidence.map((evidence) => evidence.observedEvidenceId).sort(),
    description: input.description,
  };
}

function recordEvidence(category: ComplianceCategory, record: SourceRecord, requirementId: string): ComplianceEvidence {
  return {
    complianceEvidenceId: evidenceId({
      category,
      sourceKind: record.kind,
      sourceId: record.id,
      requirementId,
      observedText: record.text,
    }),
    category,
    sourceKind: record.kind,
    sourceId: record.id,
    observedEvidenceRefIds: record.observedEvidenceRefIds,
    description: `Observed ${record.kind} metadata used for ${category}.`,
    observedText: record.text,
  };
}

function limitation(input: {
  category: ComplianceCategory;
  sourceRequirementId?: string;
  severity?: ComplianceLimitation["severity"];
  message: string;
}): ComplianceLimitation {
  return {
    limitationId: limitationId(input),
    category: input.category,
    ...(input.sourceRequirementId ? { sourceRequirementId: input.sourceRequirementId } : {}),
    severity: input.severity ?? "warning",
    message: input.message,
  };
}

function evaluatePresence(input: {
  category: ComplianceCategory;
  sourceRequirementId: string;
  statement: string;
  records: SourceRecord[];
  fallbackEvidence: ComplianceEvidence;
  missingMessage: string;
  diagnostics: string[];
  severity?: ComplianceDeviation["severity"];
}): Evaluation {
  const match = input.records.find((record) => textCoverage(input.statement, record.text));
  if (match) {
    return {
      category: input.category,
      sourceRequirementId: input.sourceRequirementId,
      statement: input.statement,
      result: "fulfilled",
      evidence: [recordEvidence(input.category, match, input.sourceRequirementId)],
      diagnostics: [...input.diagnostics, "GENERATION_CONTRACT_COMPLIANCE_OBSERVABLE_MATCH"],
    };
  }
  return {
    category: input.category,
    sourceRequirementId: input.sourceRequirementId,
    statement: input.statement,
    result: "deviation",
    evidence: [input.fallbackEvidence],
    limitation: limitation({
      category: input.category,
      sourceRequirementId: input.sourceRequirementId,
      message: input.missingMessage,
    }),
    deviationDescription: input.missingMessage,
    severity: input.severity ?? "required",
    diagnostics: [...input.diagnostics, "GENERATION_CONTRACT_COMPLIANCE_REQUIRED_OBSERVATION_MISSING"],
  };
}

function evaluateOptionalObservable(input: {
  category: ComplianceCategory;
  sourceRequirementId: string;
  statement: string;
  records: SourceRecord[];
  fallbackEvidence: ComplianceEvidence;
  missingMessage: string;
  diagnostics: string[];
}): Evaluation {
  const match = input.records.find((record) => textCoverage(input.statement, record.text));
  if (match) {
    return {
      category: input.category,
      sourceRequirementId: input.sourceRequirementId,
      statement: input.statement,
      result: "fulfilled",
      evidence: [recordEvidence(input.category, match, input.sourceRequirementId)],
      diagnostics: [...input.diagnostics, "GENERATION_CONTRACT_COMPLIANCE_OBSERVABLE_MATCH"],
    };
  }
  return {
    category: input.category,
    sourceRequirementId: input.sourceRequirementId,
    statement: input.statement,
    result: "partial",
    evidence: [input.fallbackEvidence],
    limitation: limitation({
      category: input.category,
      sourceRequirementId: input.sourceRequirementId,
      severity: "info",
      message: input.missingMessage,
    }),
    diagnostics: [...input.diagnostics, "GENERATION_CONTRACT_COMPLIANCE_OPTIONAL_OBSERVATION_MISSING"],
  };
}

function applyEvaluations(evaluations: Evaluation[]): {
  findings: ComplianceFinding[];
  deviations: ComplianceDeviation[];
  evidence: ComplianceEvidence[];
  limitations: ComplianceLimitation[];
} {
  const findings: ComplianceFinding[] = [];
  const deviations: ComplianceDeviation[] = [];
  const evidence = uniqueBy(evaluations.flatMap((item) => item.evidence), (item) => item.complianceEvidenceId);
  const limitations = uniqueBy(evaluations.flatMap((item) => item.limitation ? [item.limitation] : []), (item) => item.limitationId);
  for (const evaluation of evaluations) {
    const id = findingId({
      category: evaluation.category,
      sourceRequirementId: evaluation.sourceRequirementId,
      result: evaluation.result,
    });
    findings.push({
      findingId: id,
      category: evaluation.category,
      sourceRequirementId: evaluation.sourceRequirementId,
      result: evaluation.result,
      statement: evaluation.statement,
      evidenceIds: evaluation.evidence.map((item) => item.complianceEvidenceId).sort(),
      diagnostics: uniqueSorted(evaluation.diagnostics),
    });
    if (evaluation.result === "deviation") {
      deviations.push({
        deviationId: deviationId({ findingId: id, sourceRequirementId: evaluation.sourceRequirementId }),
        category: evaluation.category,
        findingId: id,
        sourceRequirementId: evaluation.sourceRequirementId,
        severity: evaluation.severity ?? "required",
        description: evaluation.deviationDescription ?? evaluation.statement,
        evidenceIds: evaluation.evidence.map((item) => item.complianceEvidenceId).sort(),
      });
    }
  }
  return {
    findings: uniqueBy(findings, (item) => item.findingId),
    deviations: uniqueBy(deviations, (item) => item.deviationId),
    evidence,
    limitations,
  };
}

function categoryResult(input: CategoryInput): ComplianceCategoryResult {
  const status: GenerationContractComplianceStatus = input.deviations.length > 0
    ? "non_compliant"
    : input.limitations.some((item) => item.severity === "blocked")
      ? "blocked"
      : input.findings.length === 0
        ? "incomplete"
        : input.limitations.length > 0 || input.findings.some((finding) => finding.result === "partial")
          ? "partial"
          : "compliant";
  const confidence: ComplianceConfidence = {
    level: status === "compliant" ? "HIGH" : status === "non_compliant" ? "MEDIUM" : "LOW",
    reasons: uniqueSorted([
      `category_status:${status}`,
      input.findings.length > 0 ? "observable_findings_present" : "no_observable_findings",
      input.limitations.length > 0 ? "limitations_present" : "no_category_limitations",
    ]),
  };
  return {
    category: input.category,
    status,
    sourceRequirementIds: uniqueSorted(input.sourceRequirementIds),
    findingIds: input.findings.map((finding) => finding.findingId).sort(),
    deviationIds: input.deviations.map((deviation) => deviation.deviationId).sort(),
    limitationIds: input.limitations.map((item) => item.limitationId).sort(),
    confidence,
    diagnostics: uniqueSorted([
      `GENERATION_CONTRACT_COMPLIANCE_CATEGORY:${input.category}`,
      `GENERATION_CONTRACT_COMPLIANCE_CATEGORY_STATUS:${status}`,
    ]),
  };
}

function buildCategory(input: {
  category: ComplianceCategory;
  requirements: {
    sourceRequirementId: string;
    statement: string;
    records: SourceRecord[];
    missingMessage: string;
    diagnostics: string[];
    optional?: boolean;
    severity?: ComplianceDeviation["severity"];
  }[];
  model: ObservedWebsiteModelArtifact;
}): {
  categoryResult: ComplianceCategoryResult;
  findings: ComplianceFinding[];
  deviations: ComplianceDeviation[];
  evidence: ComplianceEvidence[];
  limitations: ComplianceLimitation[];
} {
  const fallbackEvidence = inventoryEvidence({
    category: input.category,
    model: input.model,
    description: `Observed Website Model inventory evidence for ${input.category}.`,
  });
  const evaluations = input.requirements.map((requirement) =>
    requirement.optional
      ? evaluateOptionalObservable({ ...requirement, category: input.category, fallbackEvidence })
      : evaluatePresence({ ...requirement, category: input.category, fallbackEvidence }));
  const values = applyEvaluations(evaluations);
  return {
    ...values,
    evidence: uniqueBy([...values.evidence, fallbackEvidence], (item) => item.complianceEvidenceId),
    categoryResult: categoryResult({
      category: input.category,
      sourceRequirementIds: input.requirements.map((requirement) => requirement.sourceRequirementId),
      findings: values.findings,
      deviations: values.deviations,
      limitations: values.limitations,
    }),
  };
}

function objectiveRequirements(
  objectives: WebsiteGenerationObjective[],
  records: SourceRecord[],
  model: ObservedWebsiteModelArtifact,
) {
  return buildCategory({
    category: "objectives_represented",
    model,
    requirements: objectives.map((objective) => ({
      sourceRequirementId: objective.objectiveId,
      statement: objective.statement,
      records,
      missingMessage: `Website objective was not observable: ${objective.statement}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_OBJECTIVE_COMPARISON"],
    })),
  });
}

function navigationRequirements(wgp: WebsiteGenerationPackageArtifact, records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  return buildCategory({
    category: "navigation_obligations",
    model,
    requirements: wgp.navigationContract.requiredDestinations.map((destination) => ({
      sourceRequirementId: destination.destinationId,
      statement: `${destination.label} ${destination.intent}`,
      records,
      missingMessage: `Required navigation destination was not observable: ${destination.label}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_NAVIGATION_COMPARISON"],
    })),
  });
}

function pageRequirements(pages: WebsiteGenerationPageContract[], records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  return buildCategory({
    category: "page_obligations",
    model,
    requirements: pages.map((page) => ({
      sourceRequirementId: page.pageContractId,
      statement: `${page.title} ${page.intent}`,
      records,
      missingMessage: `Required page obligation was not observable: ${page.title}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_PAGE_COMPARISON"],
    })),
  });
}

function sectionRequirements(sections: WebsiteGenerationSectionContract[], records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  return buildCategory({
    category: "section_obligations",
    model,
    requirements: sections.map((section) => ({
      sourceRequirementId: section.sectionContractId,
      statement: `${section.role} ${section.intent}`,
      records,
      missingMessage: `Required section obligation was not observable: ${section.sectionContractId}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_SECTION_COMPARISON"],
    })),
  });
}

function messageRequirements(messages: WebsiteGenerationMessage[], records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  return buildCategory({
    category: "message_coverage",
    model,
    requirements: messages.map((message) => ({
      sourceRequirementId: message.messageId,
      statement: message.statement,
      records,
      missingMessage: `Required message was not observable: ${message.statement}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_MESSAGE_COMPARISON"],
    })),
  });
}

function assetPresenceRequirements(model: ObservedWebsiteModelArtifact, assetRecords: SourceRecord[]) {
  return buildCategory({
    category: "asset_presence",
    model,
    requirements: [{
      sourceRequirementId: "observed_asset_inventory",
      statement: "observable website assets or output files are present",
      records: assetRecords,
      missingMessage: "Observed Website Model did not include observable assets or file inventory.",
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_ASSET_PRESENCE_COMPARISON"],
      optional: false,
    }],
  });
}

function trustRequirements(wgp: WebsiteGenerationPackageArtifact, records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  const trustMessages = wgp.messages.filter((message) => message.role === "trust");
  const trustRequirements = wgp.contentRequirements.filter((requirement) => requirement.requirementType === "trust");
  return buildCategory({
    category: "trust_signal_presence",
    model,
    requirements: [...trustMessages, ...trustRequirements].map((item) => ({
      sourceRequirementId: "messageId" in item ? item.messageId : item.contentRequirementId,
      statement: item.statement,
      records,
      missingMessage: `Required trust signal was not observable: ${item.statement}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_TRUST_SIGNAL_COMPARISON"],
      optional: false,
    })),
  });
}

function constraintRequirements(constraints: WebsiteGenerationConstraint[], records: SourceRecord[], model: ObservedWebsiteModelArtifact) {
  const fallbackEvidence = inventoryEvidence({
    category: "constraints_preserved",
    model,
    description: "Observed Website Model inventory evidence for constraints_preserved.",
  });
  const evaluations = constraints.map((constraint): Evaluation => {
    const normalizedRecord = (record: SourceRecord) => normalizeText(record.text);
    const normalizedStatement = normalizeText(constraint.statement);
    const normalizedId = normalizeText(constraint.constraintId);
    const violation = records.find((record) =>
      normalizedRecord(record).includes(`violated ${normalizedStatement}`) ||
      normalizedRecord(record).includes(`contradicts ${normalizedStatement}`) ||
      normalizedRecord(record).includes(`violated ${normalizedId}`));
    if (violation) {
      return {
        category: "constraints_preserved",
        sourceRequirementId: constraint.constraintId,
        statement: constraint.statement,
        result: "deviation",
        evidence: [recordEvidence("constraints_preserved", violation, constraint.constraintId)],
        deviationDescription: `Observed constraint metadata contradicts required constraint: ${constraint.statement}`,
        severity: constraint.severity,
        diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_CONSTRAINT_VIOLATION_OBSERVED"],
      };
    }
    return evaluatePresence({
      category: "constraints_preserved",
      sourceRequirementId: constraint.constraintId,
      statement: constraint.statement,
      records,
      fallbackEvidence,
      missingMessage: `Required constraint preservation was not observable: ${constraint.statement}`,
      diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_CONSTRAINT_COMPARISON"],
      severity: constraint.severity,
    });
  });
  const values = applyEvaluations(evaluations);
  return {
    ...values,
    evidence: uniqueBy([...values.evidence, fallbackEvidence], (item) => item.complianceEvidenceId),
    categoryResult: categoryResult({
      category: "constraints_preserved",
      sourceRequirementIds: constraints.map((constraint) => constraint.constraintId),
      findings: values.findings,
      deviations: values.deviations,
      limitations: values.limitations,
    }),
  };
}

function typedRequirements(input: {
  category: ComplianceCategory;
  requirementType: WebsiteGenerationContentRequirement["requirementType"];
  requirements: WebsiteGenerationContentRequirement[];
  records: SourceRecord[];
  model: ObservedWebsiteModelArtifact;
  missingPrefix: string;
  diagnostic: string;
}) {
  return buildCategory({
    category: input.category,
    model: input.model,
    requirements: input.requirements
      .filter((requirement) => requirement.requirementType === input.requirementType)
      .map((requirement) => ({
        sourceRequirementId: requirement.contentRequirementId,
        statement: requirement.statement,
        records: input.records,
        missingMessage: `${input.missingPrefix}: ${requirement.statement}`,
        diagnostics: [input.diagnostic],
        optional: true,
      })),
  });
}

function mergeStatuses(results: ComplianceCategoryResult[]): GenerationContractComplianceStatus {
  if (results.some((result) => result.status === "blocked")) return "blocked";
  if (results.some((result) => result.status === "non_compliant")) return "non_compliant";
  if (results.some((result) => result.status === "partial")) return "partial";
  if (results.some((result) => result.status === "incomplete")) return "incomplete";
  return "compliant";
}

function confidence(status: GenerationContractComplianceStatus, limitations: ComplianceLimitation[]): ComplianceConfidence {
  return {
    level: status === "compliant" ? "HIGH" : status === "non_compliant" ? "MEDIUM" : "LOW",
    reasons: uniqueSorted([
      `generation_contract_compliance_status:${status}`,
      limitations.length > 0 ? "limitations_present" : "no_limitations",
      "deterministic_observed_website_model_comparison",
    ]),
  };
}

function validateSources(input: GenerationContractComplianceBuildInput): ComplianceValidationResult {
  const wgpValidation = validateWebsiteGenerationPackage(input.websiteGenerationPackage);
  const observedValidation = validateObservedWebsiteModel(input.observedWebsiteModel);
  const errors = [
    ...wgpValidation.errors.map((error) => `websiteGenerationPackage.${error}`),
    ...observedValidation.errors.map((error) => `observedWebsiteModel.${error}`),
  ];
  if (input.websiteGenerationPackage.siteVersionId !== input.observedWebsiteModel.siteVersionId) {
    errors.push("websiteGenerationPackage.siteVersionId must match observedWebsiteModel.siteVersionId");
  }
  if (input.websiteGenerationPackage.dryRunId !== input.observedWebsiteModel.dryRunId) {
    errors.push("websiteGenerationPackage.dryRunId must match observedWebsiteModel.dryRunId");
  }
  if (
    input.observedWebsiteModel.sourceWebsiteGenerationPackageId !==
    input.websiteGenerationPackage.websiteGenerationPackageId
  ) {
    errors.push("observedWebsiteModel.sourceWebsiteGenerationPackageId must match websiteGenerationPackage.websiteGenerationPackageId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...wgpValidation.warnings, ...observedValidation.warnings],
  };
}

export function buildGenerationContractCompliance(
  input: GenerationContractComplianceBuildInput,
): GenerationContractComplianceArtifact {
  const sourceValidation = validateSources(input);
  if (!sourceValidation.valid) throw new GenerationContractComplianceBuildValidationError(sourceValidation);

  const wgp = input.websiteGenerationPackage;
  const model = input.observedWebsiteModel;
  const createdAt = input.createdAt ?? model.createdAt;
  const records = sourceRecords(model);
  const contentRecords = records.filter((record) =>
    record.kind === "observed_page" ||
    record.kind === "observed_section" ||
    record.kind === "observed_message" ||
    record.kind === "observed_technical_signal");
  const navigationRecords = records.filter((record) => record.kind === "observed_navigation");
  const sectionRecords = records.filter((record) => record.kind === "observed_section" || record.kind === "observed_message");
  const assetRecords = records.filter((record) => record.kind === "observed_asset");
  const constraintRecords = records.filter((record) =>
    record.kind === "observed_constraint" || record.kind === "observed_message" || record.kind === "observed_section");

  const categories = [
    objectiveRequirements(wgp.generationObjectives, contentRecords, model),
    navigationRequirements(wgp, navigationRecords, model),
    pageRequirements(wgp.pageContracts, contentRecords, model),
    sectionRequirements(wgp.sectionContracts, sectionRecords, model),
    messageRequirements(wgp.messages, contentRecords, model),
    assetPresenceRequirements(model, assetRecords),
    trustRequirements(wgp, contentRecords, model),
    constraintRequirements(wgp.constraints, constraintRecords, model),
    typedRequirements({
      category: "accessibility_expectations_observable",
      requirementType: "accessibility",
      requirements: wgp.contentRequirements,
      records: records.filter((record) =>
        record.kind === "observed_message" ||
        record.kind === "observed_technical_signal"),
      model,
      missingPrefix: "Accessibility expectation could not be confirmed from observable metadata",
      diagnostic: "GENERATION_CONTRACT_COMPLIANCE_ACCESSIBILITY_COMPARISON",
    }),
    typedRequirements({
      category: "seo_expectations_observable",
      requirementType: "seo",
      requirements: wgp.contentRequirements,
      records: records.filter((record) =>
        record.kind === "observed_page" ||
        record.kind === "observed_message" ||
        record.kind === "observed_technical_signal"),
      model,
      missingPrefix: "SEO expectation could not be confirmed from observable metadata",
      diagnostic: "GENERATION_CONTRACT_COMPLIANCE_SEO_COMPARISON",
    }),
  ];

  const categoryResults = categories.map((category) => category.categoryResult);
  const findings = uniqueBy(categories.flatMap((category) => category.findings), (item) => item.findingId);
  const deviations = uniqueBy(categories.flatMap((category) => category.deviations), (item) => item.deviationId);
  const evidence = uniqueBy(categories.flatMap((category) => category.evidence), (item) => item.complianceEvidenceId);
  const limitations = uniqueBy([
    ...categories.flatMap((category) => category.limitations),
    ...model.limitations.map((item) => limitation({
      category: "asset_presence",
      severity: item.severity,
      message: `Observed Website Model limitation preserved: ${item.message}`,
    })),
  ], (item) => item.limitationId);
  const sourceStatus: GenerationContractComplianceStatus =
    wgp.status === "stale" || model.status === "stale"
      ? "stale"
      : wgp.status === "invalid" || model.status === "invalid"
        ? "invalid"
        : wgp.status === "blocked" || model.status === "blocked"
          ? "blocked"
          : mergeStatuses(categoryResults);
  const artifact: GenerationContractComplianceArtifact = {
    generationContractComplianceId: complianceId({
      websiteGenerationPackage: wgp,
      observedWebsiteModel: model,
    }),
    status: sourceStatus,
    siteVersionId: wgp.siteVersionId,
    dryRunId: wgp.dryRunId,
    sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
    sourceObservedWebsiteModelId: model.observedWebsiteModelId,
    createdAt,
    contractVersion: GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION,
    lineage: {
      siteVersionId: wgp.siteVersionId,
      dryRunId: wgp.dryRunId,
      sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
      sourceWebsiteGenerationPackageStatus: wgp.status,
      sourceWebsiteGenerationPackageContractVersion: wgp.contractVersion,
      sourceObservedWebsiteModelId: model.observedWebsiteModelId,
      sourceObservedWebsiteModelStatus: model.status,
      sourceObservedWebsiteModelContractVersion: model.contractVersion,
      upstreamArtifactRefs: uniqueBy([
        {
          observedEvidenceId: `gcc-source-wgp:${itemHash(wgp.websiteGenerationPackageId)}`,
          sourceKind: "limitation",
          refId: wgp.websiteGenerationPackageId,
          description: "Source Website Generation Package compared by Generation Contract Compliance.",
        },
        {
          observedEvidenceId: `gcc-source-owm:${itemHash(model.observedWebsiteModelId)}`,
          sourceKind: "limitation",
          refId: model.observedWebsiteModelId,
          description: "Source Observed Website Model compared by Generation Contract Compliance.",
        },
        ...model.lineage.upstreamArtifactRefs,
      ], (item) => item.observedEvidenceId),
    },
    categoryResults,
    findings,
    deviations,
    evidence,
    limitations,
    confidence: confidence(sourceStatus, limitations),
    diagnostics: uniqueSorted([
      `GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION:${GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION}`,
      `GENERATION_CONTRACT_COMPLIANCE_STATUS:${sourceStatus}`,
      "GENERATION_CONTRACT_COMPLIANCE_COMPARE_ONLY",
      "GENERATION_CONTRACT_COMPLIANCE_NO_REPORT_APPROVAL_OR_PUBLISHING",
      "GENERATION_CONTRACT_COMPLIANCE_NO_PROVIDER_OR_AI_EXECUTION",
      "GENERATION_CONTRACT_COMPLIANCE_NO_RUNTIME_MUTATION",
    ]),
  };

  const validation = validateGenerationContractCompliance({
    artifact,
    sourceWebsiteGenerationPackage: wgp,
    sourceObservedWebsiteModel: model,
  });
  if (!validation.valid) throw new GenerationContractComplianceBuildValidationError(validation);
  return cloneJson(artifact);
}
