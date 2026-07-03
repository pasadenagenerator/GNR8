/**
 * Phase MVP-1F Website Generation Package deterministic runtime.
 *
 * Projects a persisted Website Design Brief into a provider-neutral generation
 * contract. This builder is pure and local: no AI, prompts, provider payloads,
 * generation, implementation planning, UI, API, publishing, schema, workers,
 * or external services.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION,
  WEBSITE_GENERATION_VALIDATION_AREAS,
  validateWebsiteGenerationPackage,
  type WebsiteGenerationAudience,
  type WebsiteGenerationBusinessContext,
  type WebsiteGenerationConfidence,
  type WebsiteGenerationConstraint,
  type WebsiteGenerationContentRequirement,
  type WebsiteGenerationMessage,
  type WebsiteGenerationNavigationContract,
  type WebsiteGenerationObjective,
  type WebsiteGenerationPackageArtifact,
  type WebsiteGenerationPackageStatus,
  type WebsiteGenerationPageContract,
  type WebsiteGenerationSectionContract,
  type WebsiteGenerationSourceRefs,
  type WebsiteGenerationValidationArea,
  type WebsiteGenerationValidationContract,
  type WebsiteGenerationValidationExpectation,
} from "./website-generation-package-contract";
import {
  validateWebsiteDesignBrief,
  type WebsiteDesignBriefArtifact,
  type WebsiteDesignBriefConfidence,
  type WebsiteDesignBriefSection,
  type WebsiteDesignBriefSectionId,
  type WebsiteDesignBriefSectionItem,
} from "./website-design-brief-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION = "MVP-1F" as const;

export type WebsiteGenerationPackageBuilderInput = {
  websiteDesignBrief: WebsiteDesignBriefArtifact;
  createdAt?: string;
};

type JourneyStep = {
  journeyStepId: string;
  sequence: number;
  intent: string;
  sourceKnowledgeItemIds: string[];
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

function confidence(
  level: WebsiteGenerationConfidence["level"],
  reasons: string[],
): WebsiteGenerationConfidence {
  return {
    level,
    reasons: uniqueSorted(reasons),
  };
}

function lowestConfidence(
  values: WebsiteDesignBriefConfidence[],
  fallback: WebsiteDesignBriefConfidence,
): WebsiteGenerationConfidence {
  if (values.some((value) => value.level === "LOW")) return confidence("LOW", values.flatMap((value) => value.reasons));
  if (values.some((value) => value.level === "MEDIUM")) return confidence("MEDIUM", values.flatMap((value) => value.reasons));
  if (values.length > 0) return confidence("HIGH", values.flatMap((value) => value.reasons));
  return confidence(fallback.level, fallback.reasons);
}

function itemHash(input: unknown): string {
  return sha256Hex(stableStringify(input)).slice(0, 24);
}

function websiteGenerationPackageId(wdb: WebsiteDesignBriefArtifact): string {
  return `website-generation-package:${sha256Hex(stableStringify({
    websiteDesignBriefId: wdb.websiteDesignBriefId,
    contractVersion: wdb.contractVersion,
  })).slice(0, 32)}`;
}

function sectionById(
  wdb: WebsiteDesignBriefArtifact,
  sectionId: WebsiteDesignBriefSectionId,
): WebsiteDesignBriefSection | null {
  return wdb.sections.find((section) => section.sectionId === sectionId) ?? null;
}

function sectionsById(
  wdb: WebsiteDesignBriefArtifact,
  sectionIds: WebsiteDesignBriefSectionId[],
): WebsiteDesignBriefSection[] {
  return sectionIds.flatMap((sectionId) => {
    const section = sectionById(wdb, sectionId);
    return section ? [section] : [];
  });
}

function itemIdentifier(item: WebsiteDesignBriefSectionItem): string {
  if (item.itemType === "website_objective") return item.objectiveId;
  if (item.itemType === "audience_experience") return item.audienceExperienceId;
  if (item.itemType === "website_message") return item.messageId;
  if (item.itemType === "website_journey") return item.journeyId;
  if (item.itemType === "website_constraint") return item.constraintId;
  return item.textItemId;
}

function itemStatement(item: WebsiteDesignBriefSectionItem): string {
  if (item.itemType === "audience_experience") return item.audienceStatement;
  if (item.itemType === "website_journey") return item.steps.map((step) => step.intent).join(" ");
  return item.statement;
}

function itemRefs(
  sectionId: WebsiteDesignBriefSectionId,
  items: WebsiteDesignBriefSectionItem[],
): WebsiteGenerationSourceRefs {
  return {
    sourceWebsiteDesignBriefSectionIds: [sectionId],
    sourceWebsiteDesignBriefItemIds: items.map(itemIdentifier).sort(),
    sourceKnowledgeItemIds: uniqueSorted(items.flatMap((item) => item.sourceKnowledgeItemIds)),
    sourceMissingKnowledgeIds: uniqueSorted(items.flatMap((item) => item.sourceMissingKnowledgeIds)),
    evidenceRefs: uniqueEvidenceRefs(items.flatMap((item) => item.evidenceRefs)),
  };
}

function sourceRefsForSections(sections: WebsiteDesignBriefSection[]): WebsiteGenerationSourceRefs {
  const items = sections.flatMap((section) => section.items);
  return {
    sourceWebsiteDesignBriefSectionIds: sections.map((section) => section.sectionId).sort(),
    sourceWebsiteDesignBriefItemIds: items.map(itemIdentifier).sort(),
    sourceKnowledgeItemIds: uniqueSorted(items.flatMap((item) => item.sourceKnowledgeItemIds)),
    sourceMissingKnowledgeIds: uniqueSorted(items.flatMap((item) => item.sourceMissingKnowledgeIds)),
    evidenceRefs: uniqueEvidenceRefs(items.flatMap((item) => item.evidenceRefs)),
  };
}

function sourceStatus(input: {
  wdb: WebsiteDesignBriefArtifact;
  wdbValid: boolean;
}): WebsiteGenerationPackageStatus {
  if (!input.wdbValid || input.wdb.status === "invalid") return "invalid";
  if (input.wdb.status === "stale") return "stale";
  if (input.wdb.status === "blocked") return "blocked";
  if (input.wdb.status === "draft" || input.wdb.status === "partial") return "partial";
  return "valid";
}

function businessContext(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationBusinessContext {
  const sections = sectionsById(wdb, ["executive_summary", "website_purpose", "information_priorities"]);
  const refs = sourceRefsForSections(sections);
  const statements = sections.flatMap((section) => section.items.map(itemStatement));
  return {
    contextId: `wgp-business-context:${itemHash(refs.sourceWebsiteDesignBriefItemIds)}`,
    statement: statements.length > 0
      ? `The generation system must preserve this business context: ${statements.join(" ")}`
      : "The generation system must preserve business context once Website Design Brief context is clarified.",
    ...refs,
    confidence: lowestConfidence(sections.map((section) => section.confidence), wdb.confidence),
    limitations: uniqueSorted(sections.flatMap((section) => section.limitations)),
    diagnostics: uniqueSorted([
      "WGP_BUSINESS_CONTEXT_FROM_WDB_CONTEXT_SECTIONS",
      ...sections.flatMap((section) => section.diagnostics),
    ]),
  };
}

function generationObjectives(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationObjective[] {
  const section = sectionById(wdb, "website_objectives");
  if (!section) return [];
  return section.items.map((item) => ({
    objectiveId: `wgp-objective:${itemHash(itemIdentifier(item))}`,
    statement: itemStatement(item),
    acceptanceIntent: "The generated website proposal must visibly support this Website Design Brief objective.",
    ...itemRefs(section.sectionId, [item]),
    confidence: item.confidence,
    limitations: uniqueSorted(item.limitations),
    diagnostics: uniqueSorted([...item.diagnostics, "WGP_OBJECTIVE_FROM_WDB_OBJECTIVE"]),
  }));
}

function audience(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationAudience[] {
  const section = sectionById(wdb, "target_audience");
  if (!section) return [];
  const audienceItems = section.items.map((item) => ({
    audienceId: `wgp-audience:${itemHash(itemIdentifier(item))}`,
    audienceStatement: item.itemType === "audience_experience" ? item.audienceStatement : itemStatement(item),
    experienceRequirement: item.itemType === "audience_experience"
      ? item.experienceIntent
      : "The generated website proposal must preserve audience uncertainty and avoid inventing audience facts.",
    ...itemRefs(section.sectionId, [item]),
    confidence: item.confidence,
    limitations: uniqueSorted(item.limitations),
    diagnostics: uniqueSorted([...item.diagnostics, "WGP_AUDIENCE_FROM_WDB_AUDIENCE_EXPERIENCE"]),
  }));
  const missingAudienceSection = sectionById(wdb, "missing_knowledge");
  const missingAudienceItems = (missingAudienceSection?.items ?? []).filter((item) =>
    item.sourceMissingKnowledgeIds.some((id) => id.includes("audience")) ||
    itemStatement(item).toLowerCase().includes("audience"));
  return [
    ...audienceItems,
    ...missingAudienceItems.map((item) => ({
      audienceId: `wgp-audience-missing:${itemHash(itemIdentifier(item))}`,
      audienceStatement: itemStatement(item),
      experienceRequirement: "The generated website proposal must preserve audience uncertainty and avoid inventing audience facts.",
      ...itemRefs("missing_knowledge", [item]),
      confidence: item.confidence,
      limitations: uniqueSorted(item.limitations),
      diagnostics: uniqueSorted([...item.diagnostics, "WGP_AUDIENCE_MISSING_KNOWLEDGE_FROM_WDB"]),
    })),
  ];
}

function messages(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationMessage[] {
  const messageSections = sectionsById(wdb, ["core_messages", "brand_expression", "trust_strategy"]);
  const values: WebsiteGenerationMessage[] = [];
  for (const section of messageSections) {
    for (const item of section.items) {
      const role = item.itemType === "website_message" ? item.role : section.sectionId === "brand_expression" ? "brand" : section.sectionId === "trust_strategy" ? "trust" : "supporting";
      values.push({
        messageId: `wgp-message:${role}:${itemHash({ sectionId: section.sectionId, itemId: itemIdentifier(item) })}`,
        role,
        statement: itemStatement(item),
        requiredCoverage: "The generated website proposal must communicate this message clearly enough to support downstream compliance review.",
        ...itemRefs(section.sectionId, [item]),
        confidence: item.confidence,
        limitations: uniqueSorted(item.limitations),
        diagnostics: uniqueSorted([...item.diagnostics, "WGP_MESSAGE_FROM_WDB_MESSAGE"]),
      });
    }
  }
  return values;
}

function journeySteps(wdb: WebsiteDesignBriefArtifact): JourneyStep[] {
  const section = sectionById(wdb, "website_journey");
  const item = section?.items.find((candidate) => candidate.itemType === "website_journey");
  if (!item || item.itemType !== "website_journey") {
    return [{
      journeyStepId: "wgp-journey-step:entry",
      sequence: 1,
      intent: "The generated website proposal must support a coherent visitor journey once Website Design Brief journey knowledge is clarified.",
      sourceKnowledgeItemIds: [],
    }];
  }
  return item.steps.slice().sort((left, right) => left.sequence - right.sequence);
}

function navigationContract(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationNavigationContract {
  const section = sectionById(wdb, "website_journey");
  const steps = journeySteps(wdb);
  return {
    navigationContractId: `wgp-navigation:${itemHash({
      sourceWebsiteDesignBriefId: wdb.websiteDesignBriefId,
      steps: steps.map((step) => step.journeyStepId),
    })}`,
    purpose: "Navigation must make the Website Design Brief journey understandable and complete without prescribing implementation.",
    requiredDestinations: steps.map((step) => ({
      destinationId: `wgp-navigation-destination:${itemHash(step.journeyStepId)}`,
      label: step.intent.split(" ").slice(0, 5).join(" "),
      intent: step.intent,
      sourceJourneyStepIds: [step.journeyStepId],
      sourceWebsiteDesignBriefSectionIds: ["website_journey"],
    })),
    confidence: section?.confidence ?? wdb.confidence,
    limitations: uniqueSorted(section?.limitations ?? ["WGP_NAVIGATION_SOURCE_JOURNEY_MISSING"]),
    diagnostics: uniqueSorted([
      "WGP_NAVIGATION_CONTRACT_FROM_WDB_JOURNEY",
      ...(section?.diagnostics ?? []),
    ]),
  };
}

function pageRole(sequence: number): WebsiteGenerationPageContract["pageRole"] {
  if (sequence === 1) return "entry";
  if (sequence === 2) return "offer";
  if (sequence === 3) return "trust";
  if (sequence === 4) return "action";
  return "supporting";
}

function pageTitle(sequence: number): string {
  if (sequence === 1) return "Entry Experience";
  if (sequence === 2) return "Offer Understanding";
  if (sequence === 3) return "Trust Building";
  if (sequence === 4) return "Action Readiness";
  return `Supporting Experience ${sequence}`;
}

function pageContracts(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationPageContract[] {
  const journeySection = sectionById(wdb, "website_journey");
  const steps = journeySteps(wdb);
  return steps.map((step) => ({
    pageContractId: `wgp-page:${itemHash(step.journeyStepId)}`,
    pageRole: pageRole(step.sequence),
    title: pageTitle(step.sequence),
    intent: step.intent,
    requiredSectionContractIds: [],
    sourceJourneyStepIds: [step.journeyStepId],
    sourceWebsiteDesignBriefSectionIds: ["website_journey"],
    sourceWebsiteDesignBriefItemIds: journeySection?.items.map(itemIdentifier).sort() ?? [],
    sourceKnowledgeItemIds: uniqueSorted(step.sourceKnowledgeItemIds),
    sourceMissingKnowledgeIds: [],
    evidenceRefs: uniqueEvidenceRefs(journeySection?.items.flatMap((item) => item.evidenceRefs) ?? []),
    confidence: journeySection?.confidence ?? wdb.confidence,
    limitations: uniqueSorted(journeySection?.limitations ?? []),
    diagnostics: uniqueSorted([
      "WGP_PAGE_CONTRACT_FROM_WDB_JOURNEY_STEP",
      ...(journeySection?.diagnostics ?? []),
    ]),
  }));
}

function contentRequirementType(sectionId: WebsiteDesignBriefSectionId): WebsiteGenerationContentRequirement["requirementType"] {
  if (sectionId === "executive_summary" || sectionId === "website_purpose") return "business_context";
  if (sectionId === "website_objectives") return "objective";
  if (sectionId === "target_audience") return "audience";
  if (sectionId === "core_messages") return "message";
  if (sectionId === "brand_expression") return "brand";
  if (sectionId === "information_priorities") return "information";
  if (sectionId === "website_journey") return "journey";
  if (sectionId === "trust_strategy") return "trust";
  if (sectionId === "accessibility_goals") return "accessibility";
  if (sectionId === "seo_intent") return "seo";
  if (sectionId === "experience_constraints") return "constraint";
  if (sectionId === "missing_knowledge") return "missing_knowledge";
  return "limitation";
}

function contentRequirements(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationContentRequirement[] {
  const requirementSections = wdb.sections.filter((section) =>
    section.sectionId !== "diagnostics" && section.sectionId !== "confidence" && section.sectionId !== "recommendations");
  const values: WebsiteGenerationContentRequirement[] = [];
  for (const section of requirementSections) {
    for (const item of section.items) {
      values.push({
        contentRequirementId: `wgp-content:${itemHash({
          sectionId: section.sectionId,
          itemId: itemIdentifier(item),
        })}`,
        requirementType: contentRequirementType(section.sectionId),
        statement: itemStatement(item),
        coverageExpectation: "The generated website proposal must cover this requirement or preserve it as an explicit limitation.",
        ...itemRefs(section.sectionId, [item]),
        confidence: item.confidence,
        limitations: uniqueSorted(item.limitations),
        diagnostics: uniqueSorted([...item.diagnostics, `WGP_CONTENT_REQUIREMENT_FROM_WDB_SECTION:${section.sectionId}`]),
      });
    }
  }
  return values;
}

function sectionRole(sectionId: WebsiteDesignBriefSectionId): WebsiteGenerationSectionContract["role"] {
  if (sectionId === "executive_summary" || sectionId === "website_purpose" || sectionId === "website_objectives") return "positioning";
  if (sectionId === "target_audience") return "audience";
  if (sectionId === "core_messages") return "message";
  if (sectionId === "brand_expression") return "brand";
  if (sectionId === "information_priorities") return "information";
  if (sectionId === "website_journey") return "journey";
  if (sectionId === "trust_strategy") return "trust";
  if (sectionId === "accessibility_goals") return "accessibility";
  if (sectionId === "seo_intent") return "seo";
  if (sectionId === "experience_constraints") return "constraint";
  return "limitation";
}

function sectionPageId(sectionId: WebsiteDesignBriefSectionId, pages: WebsiteGenerationPageContract[]): string {
  const entry = pages.find((page) => page.pageRole === "entry") ?? pages[0]!;
  const offer = pages.find((page) => page.pageRole === "offer") ?? entry;
  const trust = pages.find((page) => page.pageRole === "trust") ?? entry;
  const action = pages.find((page) => page.pageRole === "action") ?? entry;
  if (
    sectionId === "executive_summary" ||
    sectionId === "website_purpose" ||
    sectionId === "website_objectives" ||
    sectionId === "target_audience" ||
    sectionId === "core_messages" ||
    sectionId === "brand_expression"
  ) return entry.pageContractId;
  if (sectionId === "information_priorities") return offer.pageContractId;
  if (sectionId === "trust_strategy") return trust.pageContractId;
  if (sectionId === "website_journey" || sectionId === "accessibility_goals" || sectionId === "seo_intent" || sectionId === "experience_constraints") {
    return action.pageContractId;
  }
  return action.pageContractId;
}

function sectionContracts(input: {
  wdb: WebsiteDesignBriefArtifact;
  pages: WebsiteGenerationPageContract[];
  requirements: WebsiteGenerationContentRequirement[];
}): WebsiteGenerationSectionContract[] {
  const contractSections = input.wdb.sections.filter((section) =>
    section.sectionId !== "diagnostics" && section.sectionId !== "confidence" && section.sectionId !== "recommendations");
  return contractSections.map((section) => {
    const pageContractId = sectionPageId(section.sectionId, input.pages);
    const refs = sourceRefsForSections([section]);
    return {
      sectionContractId: `wgp-section:${itemHash(section.sectionId)}`,
      pageContractId,
      role: sectionRole(section.sectionId),
      intent: section.intent,
      requiredContentRequirementIds: input.requirements
        .filter((requirement) => requirement.sourceWebsiteDesignBriefSectionIds.includes(section.sectionId))
        .map((requirement) => requirement.contentRequirementId)
        .sort(),
      ...refs,
      confidence: section.confidence,
      limitations: uniqueSorted(section.limitations),
      diagnostics: uniqueSorted([...section.diagnostics, `WGP_SECTION_CONTRACT_FROM_WDB_SECTION:${section.sectionId}`]),
    };
  });
}

function attachSectionsToPages(input: {
  pages: WebsiteGenerationPageContract[];
  sections: WebsiteGenerationSectionContract[];
}): WebsiteGenerationPageContract[] {
  return input.pages.map((page) => ({
    ...page,
    requiredSectionContractIds: input.sections
      .filter((section) => section.pageContractId === page.pageContractId)
      .map((section) => section.sectionContractId)
      .sort(),
  }));
}

function constraints(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationConstraint[] {
  const sections = sectionsById(wdb, ["experience_constraints", "missing_knowledge", "limitations"]);
  const values: WebsiteGenerationConstraint[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const severity = item.itemType === "website_constraint" ? item.severity : section.sectionId === "experience_constraints" ? "required" : "limitation";
      values.push({
        constraintId: `wgp-constraint:${itemHash({
          sectionId: section.sectionId,
          itemId: itemIdentifier(item),
        })}`,
        severity,
        statement: itemStatement(item),
        preservationExpectation: "The generated website proposal must preserve this constraint and must not resolve missing knowledge by invention.",
        ...itemRefs(section.sectionId, [item]),
        confidence: item.confidence,
        limitations: uniqueSorted(item.limitations),
        diagnostics: uniqueSorted([...item.diagnostics, "WGP_CONSTRAINT_FROM_WDB_CONSTRAINT_OR_LIMITATION"]),
      });
    }
  }
  return values;
}

const VALIDATION_EXPECTATION_COPY: Record<WebsiteGenerationValidationArea, {
  statement: string;
  sourceSections: WebsiteDesignBriefSectionId[];
  requiredEvidence: string[];
}> = {
  business_positioning: {
    statement: "Confirm that the generated proposal preserves the business positioning from the Website Design Brief.",
    sourceSections: ["executive_summary", "website_purpose", "website_objectives"],
    requiredEvidence: ["business context is visible", "website objectives are supported"],
  },
  audience_representation: {
    statement: "Confirm that the generated proposal represents the intended audience without inventing missing audience knowledge.",
    sourceSections: ["target_audience"],
    requiredEvidence: ["audience relevance is visible", "missing audience knowledge remains explicit when present"],
  },
  message_coverage: {
    statement: "Confirm that required core, brand, supporting, and trust messages are covered.",
    sourceSections: ["core_messages", "brand_expression", "trust_strategy"],
    requiredEvidence: ["required messages are present", "message roles remain distinguishable"],
  },
  brand_consistency: {
    statement: "Confirm that brand expression follows the Website Design Brief.",
    sourceSections: ["brand_expression"],
    requiredEvidence: ["brand expression is represented", "brand limitations are preserved"],
  },
  navigation_completeness: {
    statement: "Confirm that navigation supports all required journey destinations.",
    sourceSections: ["website_journey"],
    requiredEvidence: ["all journey destinations are reachable in the proposal", "navigation intent remains understandable"],
  },
  journey_completeness: {
    statement: "Confirm that the full Website Design Brief journey is represented.",
    sourceSections: ["website_journey"],
    requiredEvidence: ["recognize, understand, trust, and act intents are covered when present"],
  },
  trust_signal_coverage: {
    statement: "Confirm that trust strategy and trust messages are covered.",
    sourceSections: ["trust_strategy", "core_messages"],
    requiredEvidence: ["trust cues are present", "trust uncertainty is not overclaimed"],
  },
  accessibility_expectations: {
    statement: "Confirm that accessibility expectations are preserved as experience obligations.",
    sourceSections: ["accessibility_goals"],
    requiredEvidence: ["understandable experience", "navigable experience", "inclusive audience support"],
  },
  seo_intent: {
    statement: "Confirm that search intent is represented from business meaning without technical prescription.",
    sourceSections: ["seo_intent"],
    requiredEvidence: ["business identity is discoverable", "offer and audience relevance are discoverable"],
  },
  constraint_preservation: {
    statement: "Confirm that experience constraints, missing knowledge, and limitations are preserved.",
    sourceSections: ["experience_constraints", "missing_knowledge", "limitations"],
    requiredEvidence: ["constraints are not contradicted", "missing knowledge is not filled by inference"],
  },
};

function validationContract(wdb: WebsiteDesignBriefArtifact): WebsiteGenerationValidationContract {
  const expectations: WebsiteGenerationValidationExpectation[] = WEBSITE_GENERATION_VALIDATION_AREAS.map((area) => {
    const copy = VALIDATION_EXPECTATION_COPY[area];
    const sections = sectionsById(wdb, copy.sourceSections);
    return {
      expectationId: `wgp-validation:${area}`,
      area,
      statement: copy.statement,
      sourceWebsiteDesignBriefSectionIds: copy.sourceSections,
      requiredEvidence: copy.requiredEvidence,
      confidence: lowestConfidence(sections.map((section) => section.confidence), wdb.confidence),
      limitations: uniqueSorted(sections.flatMap((section) => section.limitations)),
      diagnostics: uniqueSorted([
        `WGP_VALIDATION_EXPECTATION:${area}`,
        ...sections.flatMap((section) => section.diagnostics),
      ]),
    };
  });
  return {
    validationContractId: `wgp-validation-contract:${itemHash(wdb.websiteDesignBriefId)}`,
    expectations,
    limitations: uniqueSorted(expectations.flatMap((expectation) => expectation.limitations)),
    diagnostics: uniqueSorted([
      "WGP_VALIDATION_CONTRACT_CREATED",
      ...expectations.flatMap((expectation) => expectation.diagnostics),
    ]),
  };
}

export function buildWebsiteGenerationPackage(input: WebsiteGenerationPackageBuilderInput): WebsiteGenerationPackageArtifact {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const wdb = input.websiteDesignBrief;
  const wdbValidation = validateWebsiteDesignBrief(wdb);
  const status = sourceStatus({ wdb, wdbValid: wdbValidation.valid });
  const baseConfidence = confidence(wdb.confidence.level, [
    ...wdb.confidence.reasons,
    "website_generation_package_projected_from_website_design_brief",
  ]);

  const context = businessContext(wdb);
  const objectives = generationObjectives(wdb);
  const audienceRequirements = audience(wdb);
  const requiredMessages = messages(wdb);
  const navigation = navigationContract(wdb);
  const initialPages = pageContracts(wdb);
  const requirements = contentRequirements(wdb);
  const generatedSectionContracts = sectionContracts({
    wdb,
    pages: initialPages,
    requirements,
  });
  const pages = attachSectionsToPages({
    pages: initialPages,
    sections: generatedSectionContracts,
  });
  const generatedConstraints = constraints(wdb);
  const generatedValidationContract = validationContract(wdb);

  const artifact: WebsiteGenerationPackageArtifact = {
    websiteGenerationPackageId: websiteGenerationPackageId(wdb),
    status,
    siteVersionId: wdb.siteVersionId,
    dryRunId: wdb.dryRunId,
    sourceWebsiteDesignBriefId: wdb.websiteDesignBriefId,
    createdAt,
    contractVersion: WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION,
    lineage: {
      siteVersionId: wdb.siteVersionId,
      dryRunId: wdb.dryRunId,
      sourceWebsiteDesignBriefId: wdb.websiteDesignBriefId,
      sourceWebsiteDesignBriefStatus: wdb.status,
      sourceWebsiteDesignBriefContractVersion: wdb.contractVersion,
      sourceDigitalBusinessTwinId: wdb.sourceDigitalBusinessTwinId,
      sourceBusinessAlignmentId: wdb.sourceBusinessAlignmentId,
      evidenceRefs: uniqueEvidenceRefs(wdb.lineage.evidenceRefs),
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: wdb.websiteDesignBriefId,
          sourceKind: "website_design_brief",
          description: "Website Design Brief projected into Website Generation Package MVP-1F.",
        },
        ...wdb.lineage.upstreamArtifactRefs,
      ]),
    },
    businessContext: context,
    generationObjectives: objectives,
    audience: audienceRequirements,
    messages: requiredMessages,
    navigationContract: navigation,
    pageContracts: pages,
    sectionContracts: generatedSectionContracts,
    contentRequirements: requirements,
    constraints: generatedConstraints,
    validationContract: generatedValidationContract,
    confidence: baseConfidence,
    limitations: uniqueSorted([
      ...wdb.limitations,
      ...context.limitations,
      ...objectives.flatMap((objective) => objective.limitations),
      ...audienceRequirements.flatMap((audienceRequirement) => audienceRequirement.limitations),
      ...requiredMessages.flatMap((message) => message.limitations),
      ...navigation.limitations,
      ...generatedConstraints.flatMap((constraint) => constraint.limitations),
      ...(wdb.status !== "valid" ? [`SOURCE_WDB_STATUS_NOT_VALID:${wdb.status}`] : []),
      ...wdbValidation.errors.map((error) => `SOURCE_WDB_INVALID: ${error}`),
    ]),
    diagnostics: uniqueSorted([
      `WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION:${WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION}`,
      `WEBSITE_GENERATION_PACKAGE_STATUS:${status}`,
      "WEBSITE_GENERATION_PACKAGE_IS_PROVIDER_NEUTRAL_CONTRACT",
      "WEBSITE_GENERATION_PACKAGE_CONTAINS_NO_PROMPT_OR_GENERATED_WEBSITE",
    ]),
  };

  const validation = validateWebsiteGenerationPackage({
    artifact,
    sourceWebsiteDesignBrief: wdb,
  });
  if (!validation.valid) {
    return {
      ...artifact,
      status: "invalid",
      limitations: uniqueSorted([
        ...artifact.limitations,
        ...validation.errors.map((error) => `WEBSITE_GENERATION_PACKAGE_CONTRACT_VALIDATION_FAILED: ${error}`),
      ]),
      diagnostics: uniqueSorted([
        ...artifact.diagnostics,
        "WEBSITE_GENERATION_PACKAGE_ARTIFACT_INVALID",
      ]),
    };
  }

  return {
    ...cloneJson(artifact),
    diagnostics: uniqueSorted([
      ...artifact.diagnostics,
      "WEBSITE_GENERATION_PACKAGE_ARTIFACT_VALID",
    ]),
  };
}
