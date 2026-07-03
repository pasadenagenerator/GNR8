/**
 * Phase MVP-1E Website Design Brief deterministic runtime.
 *
 * Projects an aligned Digital Business Twin into website experience intent.
 * This builder is pure and local: no AI, prompts, providers, generation,
 * implementation planning, UI, API, publishing, or external services.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION,
  WEBSITE_DESIGN_BRIEF_SECTION_IDS,
  validateWebsiteDesignBrief,
  type AudienceExperience,
  type WebsiteConstraint,
  type WebsiteDesignBriefArtifact,
  type WebsiteDesignBriefConfidence,
  type WebsiteDesignBriefSection,
  type WebsiteDesignBriefSectionId,
  type WebsiteDesignBriefSectionItem,
  type WebsiteDesignBriefStatus,
  type WebsiteDesignBriefTextItem,
  type WebsiteJourney,
  type WebsiteMessage,
  type WebsiteObjective,
} from "./website-design-brief-contract";
import type { BusinessAlignmentArtifact } from "./business-alignment-contract";
import {
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinKnowledgeItem,
  type DigitalBusinessTwinMissingKnowledge,
} from "./digital-business-twin-contract";
import { validateBusinessAlignment } from "./business-alignment-contract";

export const WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION = "MVP-1E" as const;

export type WebsiteDesignBriefBuilderInput = {
  alignedDigitalBusinessTwin: DigitalBusinessTwinArtifact;
  businessAlignment: BusinessAlignmentArtifact;
  createdAt?: string;
};

type DomainProjection = {
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
};

const SECTION_TITLES: Record<WebsiteDesignBriefSectionId, string> = {
  executive_summary: "Executive Summary",
  website_purpose: "Website Purpose",
  website_objectives: "Website Objectives",
  target_audience: "Target Audience",
  core_messages: "Core Messages",
  brand_expression: "Brand Expression",
  information_priorities: "Information Priorities",
  website_journey: "Website Journey",
  trust_strategy: "Trust Strategy",
  accessibility_goals: "Accessibility Goals",
  seo_intent: "SEO Intent",
  experience_constraints: "Experience Constraints",
  missing_knowledge: "Missing Knowledge",
  recommendations: "Recommendations",
  confidence: "Confidence",
  limitations: "Limitations",
  diagnostics: "Diagnostics",
};

const SECTION_INTENTS: Record<WebsiteDesignBriefSectionId, string> = {
  executive_summary: "Summarize the intended website experience from the aligned business understanding.",
  website_purpose: "Define what the website should represent for the business.",
  website_objectives: "Transform business goals into website-level objectives.",
  target_audience: "Describe the audience experience the website should support.",
  core_messages: "Identify the messages the website should communicate.",
  brand_expression: "Project brand knowledge into experience tone and expression.",
  information_priorities: "Prioritize business information users should understand.",
  website_journey: "Describe the intended user journey in business terms.",
  trust_strategy: "Describe how the website should make the business easier to trust.",
  accessibility_goals: "State inclusive experience goals without implementation prescription.",
  seo_intent: "State search intent from business meaning without keyword or technical instructions.",
  experience_constraints: "Carry business constraints that should shape the experience.",
  missing_knowledge: "Preserve unresolved business knowledge before downstream planning.",
  recommendations: "Recommend business-experience clarification steps before downstream planning.",
  confidence: "Explain confidence inherited from the aligned Digital Business Twin.",
  limitations: "List known limitations that constrain the brief.",
  diagnostics: "Record deterministic runtime diagnostics.",
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
  level: WebsiteDesignBriefConfidence["level"],
  reasons: string[],
): WebsiteDesignBriefConfidence {
  return {
    level,
    reasons: uniqueSorted(reasons),
  };
}

function lowestConfidence(
  values: WebsiteDesignBriefConfidence[],
  fallback: WebsiteDesignBriefConfidence,
): WebsiteDesignBriefConfidence {
  if (values.some((value) => value.level === "LOW")) {
    return confidence("LOW", values.flatMap((value) => value.reasons));
  }
  if (values.some((value) => value.level === "MEDIUM")) {
    return confidence("MEDIUM", values.flatMap((value) => value.reasons));
  }
  if (values.length > 0) return confidence("HIGH", values.flatMap((value) => value.reasons));
  return fallback;
}

function websiteDesignBriefId(input: {
  digitalBusinessTwinId: string;
  businessAlignmentId: string;
}): string {
  return `website-design-brief:${sha256Hex(stableStringify(input)).slice(0, 32)}`;
}

function itemHash(input: unknown): string {
  return sha256Hex(stableStringify(input)).slice(0, 24);
}

function domainProjection(
  dbt: DigitalBusinessTwinArtifact,
  domain: DigitalBusinessTwinDomain,
): DomainProjection {
  return {
    knowledgeItems: dbt.knowledgeItems
      .filter((item) => item.domain === domain)
      .slice()
      .sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId)),
    missingKnowledge: dbt.missingKnowledge
      .filter((item) => item.domain === domain)
      .slice()
      .sort((left, right) => left.missingKnowledgeId.localeCompare(right.missingKnowledgeId)),
  };
}

function sourceRefs(items: DigitalBusinessTwinKnowledgeItem[], missing: DigitalBusinessTwinMissingKnowledge[]) {
  return {
    sourceKnowledgeItemIds: items.map((item) => item.knowledgeItemId).sort(),
    sourceMissingKnowledgeIds: missing.map((item) => item.missingKnowledgeId).sort(),
    evidenceRefs: uniqueEvidenceRefs(items.flatMap((item) => item.evidenceRefs)),
  };
}

function textItem(input: {
  sectionId: WebsiteDesignBriefSectionId;
  statement: string;
  knowledgeItems?: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge?: DigitalBusinessTwinMissingKnowledge[];
  confidence: WebsiteDesignBriefConfidence;
  limitations?: string[];
  diagnostics: string[];
}): WebsiteDesignBriefTextItem {
  const knowledgeItems = input.knowledgeItems ?? [];
  const missingKnowledge = input.missingKnowledge ?? [];
  return {
    itemType: "text",
    textItemId: `wdb-text:${input.sectionId}:${itemHash({
      statement: input.statement,
      sourceKnowledgeItemIds: knowledgeItems.map((item) => item.knowledgeItemId),
      sourceMissingKnowledgeIds: missingKnowledge.map((item) => item.missingKnowledgeId),
    })}`,
    statement: input.statement,
    ...sourceRefs(knowledgeItems, missingKnowledge),
    confidence: input.confidence,
    limitations: uniqueSorted(input.limitations ?? []),
    diagnostics: uniqueSorted(input.diagnostics),
  };
}

function objectiveItem(item: DigitalBusinessTwinKnowledgeItem): WebsiteObjective {
  return {
    itemType: "website_objective",
    objectiveId: `wdb-objective:${itemHash(item.knowledgeItemId)}`,
    statement: `The website should support this business goal: ${item.statement}`,
    rationale: "Business goals become website objectives so visitors understand and can act on the business intent.",
    ...sourceRefs([item], []),
    confidence: item.confidence,
    limitations: uniqueSorted(item.limitations),
    diagnostics: uniqueSorted([...item.diagnostics, "WDB_TRANSFORM_GOAL_TO_WEBSITE_OBJECTIVE"]),
  };
}

function audienceExperienceItem(item: DigitalBusinessTwinKnowledgeItem): AudienceExperience {
  return {
    itemType: "audience_experience",
    audienceExperienceId: `wdb-audience:${itemHash(item.knowledgeItemId)}`,
    audienceStatement: item.statement,
    experienceIntent: "The website should help this audience quickly recognize relevance, understand the offer, and know the next business action available.",
    ...sourceRefs([item], []),
    confidence: item.confidence,
    limitations: uniqueSorted(item.limitations),
    diagnostics: uniqueSorted([...item.diagnostics, "WDB_TRANSFORM_AUDIENCE_TO_AUDIENCE_EXPERIENCE"]),
  };
}

function messageItem(input: {
  item: DigitalBusinessTwinKnowledgeItem;
  role: WebsiteMessage["role"];
  diagnostic: string;
}): WebsiteMessage {
  return {
    itemType: "website_message",
    messageId: `wdb-message:${input.role}:${itemHash(input.item.knowledgeItemId)}`,
    role: input.role,
    statement: input.item.statement,
    ...sourceRefs([input.item], []),
    confidence: input.item.confidence,
    limitations: uniqueSorted(input.item.limitations),
    diagnostics: uniqueSorted([...input.item.diagnostics, input.diagnostic]),
  };
}

function constraintItem(input: {
  item?: DigitalBusinessTwinKnowledgeItem;
  missing?: DigitalBusinessTwinMissingKnowledge;
  statement: string;
  severity: WebsiteConstraint["severity"];
  confidence: WebsiteDesignBriefConfidence;
  limitations?: string[];
  diagnostics: string[];
}): WebsiteConstraint {
  const items = input.item ? [input.item] : [];
  const missing = input.missing ? [input.missing] : [];
  return {
    itemType: "website_constraint",
    constraintId: `wdb-constraint:${itemHash({
      statement: input.statement,
      itemId: input.item?.knowledgeItemId,
      missingId: input.missing?.missingKnowledgeId,
    })}`,
    severity: input.severity,
    statement: input.statement,
    ...sourceRefs(items, missing),
    confidence: input.confidence,
    limitations: uniqueSorted(input.limitations ?? input.item?.limitations ?? []),
    diagnostics: uniqueSorted(input.diagnostics),
  };
}

function journeyItem(input: {
  identity: DomainProjection;
  offerings: DomainProjection;
  audience: DomainProjection;
  trust: DomainProjection;
  digitalPresence: DomainProjection;
  fallbackConfidence: WebsiteDesignBriefConfidence;
}): WebsiteJourney {
  const steps = [
    {
      journeyStepId: "wdb-journey-step:recognize",
      sequence: 1,
      intent: input.audience.knowledgeItems.length > 0
        ? "Visitors should recognize that the website is relevant to their needs."
        : "Visitors should be able to determine whether the business is relevant, once audience knowledge is clarified.",
      sourceKnowledgeItemIds: input.audience.knowledgeItems.map((item) => item.knowledgeItemId).sort(),
    },
    {
      journeyStepId: "wdb-journey-step:understand",
      sequence: 2,
      intent: input.offerings.knowledgeItems.length > 0
        ? "Visitors should understand what the business offers and why it matters."
        : "Visitors should understand the offer once offering knowledge is clarified.",
      sourceKnowledgeItemIds: input.offerings.knowledgeItems.map((item) => item.knowledgeItemId).sort(),
    },
    {
      journeyStepId: "wdb-journey-step:trust",
      sequence: 3,
      intent: input.trust.knowledgeItems.length > 0
        ? "Visitors should find business proof that reduces uncertainty."
        : "Visitors should find trust cues once trust knowledge is clarified.",
      sourceKnowledgeItemIds: input.trust.knowledgeItems.map((item) => item.knowledgeItemId).sort(),
    },
    {
      journeyStepId: "wdb-journey-step:act",
      sequence: 4,
      intent: input.digitalPresence.knowledgeItems.length > 0
        ? "Visitors should understand the most appropriate next business action."
        : "Visitors should understand the next business action once digital presence knowledge is clarified.",
      sourceKnowledgeItemIds: input.digitalPresence.knowledgeItems.map((item) => item.knowledgeItemId).sort(),
    },
  ];
  const knowledgeItems = [
    ...input.identity.knowledgeItems,
    ...input.offerings.knowledgeItems,
    ...input.audience.knowledgeItems,
    ...input.trust.knowledgeItems,
    ...input.digitalPresence.knowledgeItems,
  ];
  const missingKnowledge = [
    ...input.identity.missingKnowledge,
    ...input.offerings.missingKnowledge,
    ...input.audience.missingKnowledge,
    ...input.trust.missingKnowledge,
    ...input.digitalPresence.missingKnowledge,
  ];
  return {
    itemType: "website_journey",
    journeyId: `wdb-journey:${itemHash({
      knowledgeItemIds: knowledgeItems.map((item) => item.knowledgeItemId),
      missingKnowledgeIds: missingKnowledge.map((item) => item.missingKnowledgeId),
    })}`,
    steps,
    ...sourceRefs(knowledgeItems, missingKnowledge),
    confidence: lowestConfidence(knowledgeItems.map((item) => item.confidence), input.fallbackConfidence),
    limitations: uniqueSorted(knowledgeItems.flatMap((item) => item.limitations)),
    diagnostics: ["WDB_TRANSFORM_BUSINESS_KNOWLEDGE_TO_WEBSITE_JOURNEY"],
  };
}

function section(input: {
  sectionId: WebsiteDesignBriefSectionId;
  items: WebsiteDesignBriefSectionItem[];
  fallbackConfidence: WebsiteDesignBriefConfidence;
  limitations?: string[];
  diagnostics?: string[];
}): WebsiteDesignBriefSection {
  return {
    sectionId: input.sectionId,
    title: SECTION_TITLES[input.sectionId],
    intent: SECTION_INTENTS[input.sectionId],
    items: input.items,
    confidence: lowestConfidence(input.items.map((item) => item.confidence), input.fallbackConfidence),
    limitations: uniqueSorted([
      ...(input.limitations ?? []),
      ...input.items.flatMap((item) => item.limitations),
    ]),
    diagnostics: uniqueSorted([
      `WDB_SECTION:${input.sectionId}`,
      ...(input.diagnostics ?? []),
      ...input.items.flatMap((item) => item.diagnostics),
    ]),
  };
}

function sourceStatus(input: {
  dbt: DigitalBusinessTwinArtifact;
  alignment: BusinessAlignmentArtifact;
  dbtValid: boolean;
  alignmentValid: boolean;
}): WebsiteDesignBriefStatus {
  if (!input.dbtValid || !input.alignmentValid || input.dbt.status === "invalid" || input.alignment.status === "invalid") {
    return "invalid";
  }
  if (input.dbt.status === "stale" || input.alignment.status === "stale") return "stale";
  if (input.dbt.status === "blocked" || input.alignment.status === "blocked") return "blocked";
  if (
    input.dbt.status !== "aligned" &&
    input.dbt.status !== "confirmed"
  ) {
    return "partial";
  }
  if (input.dbt.missingKnowledge.length > 0) return "partial";
  return "valid";
}

function fallbackStatement(sectionId: WebsiteDesignBriefSectionId, confidenceValue: WebsiteDesignBriefConfidence) {
  return textItem({
    sectionId,
    statement: "No aligned Digital Business Twin knowledge is available for this section.",
    confidence: confidenceValue,
    limitations: [`WDB_SECTION_SOURCE_KNOWLEDGE_MISSING:${sectionId}`],
    diagnostics: [`WDB_SECTION_FALLBACK:${sectionId}`],
  });
}

export function buildWebsiteDesignBrief(input: WebsiteDesignBriefBuilderInput): WebsiteDesignBriefArtifact {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const dbt = input.alignedDigitalBusinessTwin;
  const alignment = input.businessAlignment;
  const dbtValidation = validateDigitalBusinessTwinArtifact(dbt);
  const alignmentValidation = validateBusinessAlignment(alignment);
  const status = sourceStatus({
    dbt,
    alignment,
    dbtValid: dbtValidation.valid,
    alignmentValid: alignmentValidation.valid,
  });
  const baseConfidence = confidence(dbt.confidence.level, [
    ...dbt.confidence.reasons,
    "website_design_brief_projected_from_aligned_dbt",
  ]);

  const identity = domainProjection(dbt, "business_identity");
  const offerings = domainProjection(dbt, "offerings");
  const audience = domainProjection(dbt, "audience");
  const brand = domainProjection(dbt, "brand");
  const digitalPresence = domainProjection(dbt, "digital_presence");
  const goals = domainProjection(dbt, "goals");
  const trust = domainProjection(dbt, "trust");
  const content = domainProjection(dbt, "content");
  const constraints = domainProjection(dbt, "constraints");
  const allMissing = dbt.missingKnowledge.slice().sort((left, right) =>
    left.missingKnowledgeId.localeCompare(right.missingKnowledgeId));
  const coreMessageItems = [
    ...identity.knowledgeItems.map((item) => messageItem({
      item,
      role: "primary" as const,
      diagnostic: "WDB_TRANSFORM_BUSINESS_IDENTITY_TO_CORE_MESSAGE",
    })),
    ...offerings.knowledgeItems.map((item) => messageItem({
      item,
      role: "supporting" as const,
      diagnostic: "WDB_TRANSFORM_OFFERING_TO_CORE_MESSAGE",
    })),
    ...trust.knowledgeItems.map((item) => messageItem({
      item,
      role: "trust" as const,
      diagnostic: "WDB_TRANSFORM_TRUST_TO_CORE_MESSAGE",
    })),
  ];
  const recommendationItems = [
    ...digitalPresence.knowledgeItems.map((item) => textItem({
      sectionId: "recommendations",
      statement: `Use this digital presence understanding as experience guidance: ${item.statement}`,
      knowledgeItems: [item],
      confidence: item.confidence,
      limitations: item.limitations,
      diagnostics: ["WDB_TRANSFORM_DIGITAL_PRESENCE_TO_EXPERIENCE_RECOMMENDATION"],
    })),
    ...allMissing.map((missing) => textItem({
      sectionId: "recommendations",
      statement: `Resolve this business knowledge before downstream planning: ${missing.reason}`,
      missingKnowledge: [missing],
      confidence: confidence("LOW", ["missing_knowledge_requires_resolution"]),
      limitations: [missing.reason],
      diagnostics: ["WDB_RECOMMENDATION_FROM_MISSING_KNOWLEDGE"],
    })),
  ];

  const sections: WebsiteDesignBriefSection[] = [
    section({
      sectionId: "executive_summary",
      fallbackConfidence: baseConfidence,
      items: [
        textItem({
          sectionId: "executive_summary",
          statement: identity.knowledgeItems.length > 0
            ? `The website should represent the business through this aligned understanding: ${identity.knowledgeItems.map((item) => item.statement).join(" ")}`
            : "The website should represent the business once business identity knowledge is clarified.",
          knowledgeItems: identity.knowledgeItems,
          missingKnowledge: identity.missingKnowledge,
          confidence: lowestConfidence(identity.knowledgeItems.map((item) => item.confidence), baseConfidence),
          limitations: identity.missingKnowledge.map((missing) => missing.reason),
          diagnostics: ["WDB_EXECUTIVE_SUMMARY_FROM_BUSINESS_IDENTITY"],
        }),
      ],
    }),
    section({
      sectionId: "website_purpose",
      fallbackConfidence: baseConfidence,
      items: [
        textItem({
          sectionId: "website_purpose",
          statement: "The website should act as the business experience projection of the aligned Digital Business Twin.",
          knowledgeItems: [...identity.knowledgeItems, ...goals.knowledgeItems],
          missingKnowledge: [...identity.missingKnowledge, ...goals.missingKnowledge],
          confidence: lowestConfidence([...identity.knowledgeItems, ...goals.knowledgeItems].map((item) => item.confidence), baseConfidence),
          limitations: [...identity.missingKnowledge, ...goals.missingKnowledge].map((missing) => missing.reason),
          diagnostics: ["WDB_PURPOSE_FROM_ALIGNED_DBT"],
        }),
      ],
    }),
    section({
      sectionId: "website_objectives",
      fallbackConfidence: baseConfidence,
      items: goals.knowledgeItems.length > 0
        ? goals.knowledgeItems.map(objectiveItem)
        : [fallbackStatement("website_objectives", baseConfidence)],
    }),
    section({
      sectionId: "target_audience",
      fallbackConfidence: baseConfidence,
      items: audience.knowledgeItems.length > 0
        ? audience.knowledgeItems.map(audienceExperienceItem)
        : [fallbackStatement("target_audience", baseConfidence)],
    }),
    section({
      sectionId: "core_messages",
      fallbackConfidence: baseConfidence,
      items: coreMessageItems.length > 0 ? coreMessageItems : [fallbackStatement("core_messages", baseConfidence)],
    }),
    section({
      sectionId: "brand_expression",
      fallbackConfidence: baseConfidence,
      items: brand.knowledgeItems.length > 0
        ? brand.knowledgeItems.map((item) => messageItem({
            item,
            role: "brand",
            diagnostic: "WDB_TRANSFORM_BRAND_TO_BRAND_EXPRESSION",
          }))
        : [fallbackStatement("brand_expression", baseConfidence)],
    }),
    section({
      sectionId: "information_priorities",
      fallbackConfidence: baseConfidence,
      items: [...offerings.knowledgeItems, ...content.knowledgeItems].length > 0
        ? [...offerings.knowledgeItems, ...content.knowledgeItems].map((item) => textItem({
            sectionId: "information_priorities",
            statement: `Prioritize this business information for visitor understanding: ${item.statement}`,
            knowledgeItems: [item],
            confidence: item.confidence,
            limitations: item.limitations,
            diagnostics: ["WDB_TRANSFORM_OFFERINGS_AND_CONTENT_TO_INFORMATION_PRIORITIES"],
          }))
        : [fallbackStatement("information_priorities", baseConfidence)],
    }),
    section({
      sectionId: "website_journey",
      fallbackConfidence: baseConfidence,
      items: [journeyItem({ identity, offerings, audience, trust, digitalPresence, fallbackConfidence: baseConfidence })],
    }),
    section({
      sectionId: "trust_strategy",
      fallbackConfidence: baseConfidence,
      items: trust.knowledgeItems.length > 0
        ? trust.knowledgeItems.map((item) => messageItem({
            item,
            role: "trust",
            diagnostic: "WDB_TRANSFORM_TRUST_TO_TRUST_STRATEGY",
          }))
        : [fallbackStatement("trust_strategy", baseConfidence)],
    }),
    section({
      sectionId: "accessibility_goals",
      fallbackConfidence: baseConfidence,
      items: [textItem({
        sectionId: "accessibility_goals",
        statement: "The website experience should be understandable, navigable, and inclusive for the target audience.",
        knowledgeItems: audience.knowledgeItems,
        missingKnowledge: audience.missingKnowledge,
        confidence: lowestConfidence(audience.knowledgeItems.map((item) => item.confidence), baseConfidence),
        limitations: audience.missingKnowledge.map((missing) => missing.reason),
        diagnostics: ["WDB_ACCESSIBILITY_GOAL_FROM_AUDIENCE_EXPERIENCE"],
      })],
    }),
    section({
      sectionId: "seo_intent",
      fallbackConfidence: baseConfidence,
      items: [textItem({
        sectionId: "seo_intent",
        statement: "The website should express the business identity, offerings, audience relevance, and trust signals clearly enough to support discoverability.",
        knowledgeItems: [...identity.knowledgeItems, ...offerings.knowledgeItems, ...audience.knowledgeItems, ...trust.knowledgeItems],
        missingKnowledge: [...identity.missingKnowledge, ...offerings.missingKnowledge, ...audience.missingKnowledge, ...trust.missingKnowledge],
        confidence: lowestConfidence([
          ...identity.knowledgeItems,
          ...offerings.knowledgeItems,
          ...audience.knowledgeItems,
          ...trust.knowledgeItems,
        ].map((item) => item.confidence), baseConfidence),
        limitations: [
          ...identity.missingKnowledge,
          ...offerings.missingKnowledge,
          ...audience.missingKnowledge,
          ...trust.missingKnowledge,
        ].map((missing) => missing.reason),
        diagnostics: ["WDB_SEO_INTENT_FROM_BUSINESS_MEANING"],
      })],
    }),
    section({
      sectionId: "experience_constraints",
      fallbackConfidence: baseConfidence,
      items: constraints.knowledgeItems.length > 0
        ? constraints.knowledgeItems.map((item) => constraintItem({
            item,
            statement: item.statement,
            severity: "required",
            confidence: item.confidence,
            diagnostics: uniqueSorted([...item.diagnostics, "WDB_TRANSFORM_CONSTRAINTS_TO_EXPERIENCE_CONSTRAINTS"]),
          }))
        : [fallbackStatement("experience_constraints", baseConfidence)],
    }),
    section({
      sectionId: "missing_knowledge",
      fallbackConfidence: baseConfidence,
      items: allMissing.length > 0
        ? allMissing.map((missing) => constraintItem({
            missing,
            statement: missing.reason,
            severity: "limitation",
            confidence: confidence("LOW", ["missing_knowledge_preserved_from_aligned_dbt"]),
            diagnostics: uniqueSorted([...missing.diagnostics, "WDB_MISSING_KNOWLEDGE_PRESERVED"]),
          }))
        : [textItem({
            sectionId: "missing_knowledge",
            statement: "No missing Digital Business Twin knowledge is recorded for this Website Design Brief.",
            confidence: baseConfidence,
            diagnostics: ["WDB_NO_MISSING_KNOWLEDGE_RECORDED"],
          })],
    }),
    section({
      sectionId: "recommendations",
      fallbackConfidence: baseConfidence,
      items: recommendationItems.length > 0 ? recommendationItems : [fallbackStatement("recommendations", baseConfidence)],
    }),
    section({
      sectionId: "confidence",
      fallbackConfidence: baseConfidence,
      items: [textItem({
        sectionId: "confidence",
        statement: `Website Design Brief confidence is ${baseConfidence.level} because it inherits the aligned Digital Business Twin confidence.`,
        confidence: baseConfidence,
        limitations: dbt.confidence.level === "LOW" ? ["SOURCE_DBT_CONFIDENCE_LOW"] : [],
        diagnostics: ["WDB_CONFIDENCE_PROPAGATED_FROM_ALIGNED_DBT"],
      })],
    }),
    section({
      sectionId: "limitations",
      fallbackConfidence: baseConfidence,
      items: dbt.limitations.length > 0
        ? dbt.limitations.map((limitation) => textItem({
            sectionId: "limitations",
            statement: limitation,
            confidence: baseConfidence,
            limitations: [limitation],
            diagnostics: ["WDB_LIMITATION_PROPAGATED_FROM_ALIGNED_DBT"],
          }))
        : [textItem({
            sectionId: "limitations",
            statement: "No additional aligned Digital Business Twin limitations are recorded.",
            confidence: baseConfidence,
            diagnostics: ["WDB_NO_ADDITIONAL_LIMITATIONS_RECORDED"],
          })],
    }),
    section({
      sectionId: "diagnostics",
      fallbackConfidence: baseConfidence,
      items: [
        textItem({
          sectionId: "diagnostics",
          statement: `Runtime version ${WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION} projected the Website Design Brief from aligned Digital Business Twin ${dbt.digitalBusinessTwinId}.`,
          confidence: baseConfidence,
          diagnostics: ["WDB_RUNTIME_DIAGNOSTIC_RECORDED"],
        }),
      ],
    }),
  ];

  const artifact: WebsiteDesignBriefArtifact = {
    websiteDesignBriefId: websiteDesignBriefId({
      digitalBusinessTwinId: dbt.digitalBusinessTwinId,
      businessAlignmentId: alignment.businessAlignmentId,
    }),
    status,
    siteVersionId: dbt.siteVersionId,
    dryRunId: dbt.dryRunId,
    sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
    sourceBusinessAlignmentId: alignment.businessAlignmentId,
    createdAt,
    contractVersion: WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION,
    lineage: {
      siteVersionId: dbt.siteVersionId,
      dryRunId: dbt.dryRunId,
      sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
      sourceDigitalBusinessTwinStatus: dbt.status,
      sourceDigitalBusinessTwinContractVersion: dbt.contractVersion,
      sourceBusinessAlignmentId: alignment.businessAlignmentId,
      sourceBusinessAlignmentStatus: alignment.status,
      sourceBusinessAlignmentContractVersion: alignment.contractVersion,
      businessAlignmentOutputDigitalBusinessTwinId: alignment.lineage.outputDigitalBusinessTwinId,
      evidenceRefs: uniqueEvidenceRefs([...dbt.lineage.evidenceRefs, ...alignment.lineage.evidenceRefs]),
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: dbt.digitalBusinessTwinId,
          sourceKind: "digital_business_twin",
          description: "Aligned Digital Business Twin projected into Website Design Brief MVP-1E.",
        },
        {
          refId: alignment.businessAlignmentId,
          sourceKind: "business_alignment",
          description: "Business Alignment lineage authorizing the aligned DBT used by the Website Design Brief.",
        },
        ...dbt.lineage.upstreamArtifactRefs,
        ...alignment.lineage.upstreamArtifactRefs,
      ]),
    },
    sections,
    confidence: baseConfidence,
    limitations: uniqueSorted([
      ...dbt.limitations,
      ...alignment.limitations,
      ...(dbt.status !== "aligned" && dbt.status !== "confirmed"
        ? [`SOURCE_DBT_STATUS_NOT_ALIGNED:${dbt.status}`]
        : []),
      ...dbtValidation.errors.map((error) => `SOURCE_DBT_INVALID: ${error}`),
      ...alignmentValidation.errors.map((error) => `SOURCE_BUSINESS_ALIGNMENT_INVALID: ${error}`),
    ]),
    diagnostics: uniqueSorted([
      `WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION:${WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION}`,
      `WEBSITE_DESIGN_BRIEF_STATUS:${status}`,
      `WEBSITE_DESIGN_BRIEF_SECTION_COUNT:${WEBSITE_DESIGN_BRIEF_SECTION_IDS.length}`,
      "WEBSITE_DESIGN_BRIEF_IS_EXPERIENCE_PROJECTION",
      "WEBSITE_DESIGN_BRIEF_CONTAINS_WEBSITE_INTENT_ONLY",
    ]),
  };

  const validation = validateWebsiteDesignBrief({
    artifact,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessAlignment: alignment,
  });
  if (!validation.valid) {
    return {
      ...artifact,
      status: "invalid",
      limitations: uniqueSorted([
        ...artifact.limitations,
        ...validation.errors.map((error) => `WEBSITE_DESIGN_BRIEF_CONTRACT_VALIDATION_FAILED: ${error}`),
      ]),
      diagnostics: uniqueSorted([
        ...artifact.diagnostics,
        "WEBSITE_DESIGN_BRIEF_ARTIFACT_INVALID",
      ]),
    };
  }

  return {
    ...cloneJson(artifact),
    diagnostics: uniqueSorted([
      ...artifact.diagnostics,
      "WEBSITE_DESIGN_BRIEF_ARTIFACT_VALID",
    ]),
  };
}
