import type { Gnr8Page } from "@/gnr8/types/page";
import type { StrategicExecutionOrchestration } from "./strategic-execution-orchestrator";
import { buildSiteSemanticConsistency } from "./site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "./site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "./strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "./strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "./strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "./strategic-semantic-reasoning";
import { buildOrchestrationPreview } from "./orchestration-preview";

function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

function page(input: {
  slug: string;
  sections: Array<{ type: string; props?: Record<string, unknown> }>;
}): { slug: string; page: Gnr8Page } {
  return {
    slug: input.slug,
    page: {
      id: `page_${input.slug.replace(/[^a-z0-9]/gi, "_")}`,
      slug: input.slug,
      title: "Test",
      sections: input.sections.map((s, i) => ({ id: `s_${i + 1}`, type: s.type, props: s.props })),
    },
  };
}

function buildOrchestration(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages?: string[];
  pagesInput?: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
}) {
  const unresolvedPages = input.unresolvedPages ?? [];
  const pages =
    input.pagesInput ??
    input.resolvedPages.map((p) => ({
      slug: p.slug,
      page: p.page,
    }));

  const siteSemanticIntelligence = buildSiteSemanticIntelligence({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
  });

  const siteSemanticConsistency = buildSiteSemanticConsistency({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
  });

  const strategicSemanticReasoning = buildStrategicSemanticReasoning({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
  });

  const strategicSemanticPlan = buildStrategicSemanticPlan({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
  });

  const strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
    strategicSemanticPlan,
  });

  const strategicExecutionOrchestration = buildStrategicExecutionOrchestration({
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticPlan,
    strategicSemanticExecutionReadiness,
  });

  return { strategicExecutionOrchestration, unresolvedPages };
}

// Scenario A — blocked orchestration
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "", subheadline: "" } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "", ctaLabel: "" }] } },
        { type: "feature.grid", props: { items: [{ title: "", text: "" }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "", subheadline: "" } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "", ctaLabel: "" }] } },
        { type: "feature.grid", props: { items: [{ title: "", text: "" }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration, unresolvedPages } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "blocked", "Scenario A: orchestrationMode=blocked");

  const { orchestrationPreview } = buildOrchestrationPreview({ strategicExecutionOrchestration, unresolvedPages });
  assert(orchestrationPreview.overallPreviewStatus === "blocked", "Scenario A: overallPreviewStatus=blocked");
  assert(orchestrationPreview.firstRecommendedWaveId === null, "Scenario A: firstRecommendedWaveId=null");
  assert(orchestrationPreview.pilotCandidateWaveIds.length === 0, "Scenario A: no pilot candidates");
  assert(orchestrationPreview.blockedWaveIds.length > 0, "Scenario A: blocked waves present");
}

// Scenario B — phased orchestration with one ready wave
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster with clarity", subheadline: "Move from idea to production with structured pages." } },
        { type: "cta.simple", props: { headline: "Start today", subheadline: "Create an account in minutes.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes, the same input yields the same output." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections with stable semantics." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "No credit card required.", buttonLabel: "Create account" } },
        { type: "faq.basic", props: { items: [{ question: "Can I review changes?", answer: "Yes, review gates are supported." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "For teams.", ctaLabel: "Upgrade" }] } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "Modern templates", subheadline: "Consistent structure site-wide." } },
        { type: "cta.simple", props: { headline: "Try it", subheadline: "No credit card.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "What does it do?", answer: "Improves semantic quality across pages." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "For growing orgs.", ctaLabel: "Contact sales" }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration, unresolvedPages } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "phased", "Scenario B: orchestrationMode=phased");

  const { orchestrationPreview } = buildOrchestrationPreview({ strategicExecutionOrchestration, unresolvedPages });
  assert(orchestrationPreview.overallPreviewStatus === "pilot-ready", "Scenario B: overallPreviewStatus=pilot-ready");
  assert(!!orchestrationPreview.firstRecommendedWaveId, "Scenario B: firstRecommendedWaveId populated");
  assert(
    orchestrationPreview.pilotCandidateWaveIds.includes(orchestrationPreview.firstRecommendedWaveId!),
    "Scenario B: pilotCandidateWaveIds includes first ready wave",
  );
}

// Scenario C — phased orchestration with no ready waves (preview layer must handle deterministically)
{
  const orchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "stabilize-first",
    waves: [
      {
        id: "wave-stabilization",
        label: "Wave 1 — Stabilization",
        purpose: "stabilization",
        readiness: "review-needed",
        stepIds: ["site-coverage-hero"],
        targetPages: ["/a", "/b"],
        rationale: ["Coverage-related semantic gaps should be addressed before broader execution."],
      },
      {
        id: "wave-consistency-normalization",
        label: "Wave 3 — Consistency Normalization",
        purpose: "consistency normalization",
        readiness: "review-needed",
        stepIds: ["site-consistency-hero"],
        targetPages: ["/a", "/b"],
        rationale: ["Cross-page consistency should be normalized after core page improvements."],
      },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: ["/a", "/b"],
    summary: "Synthetic orchestration for preview scenario coverage.",
    notes: ["Synthetic orchestration only; no changes are applied."],
  };

  const { orchestrationPreview } = buildOrchestrationPreview({ strategicExecutionOrchestration: orchestration, unresolvedPages: [] });
  assert(orchestrationPreview.overallPreviewStatus === "review-needed", "Scenario C: overallPreviewStatus=review-needed");
  assert(orchestrationPreview.pilotCandidateWaveIds.length === 0, "Scenario C: no pilot candidates");
  assert(orchestrationPreview.wavePreviews.every((w) => !!w.reviewRisk), "Scenario C: reviewRisk populated on review-needed waves");
}

// Scenario D — guided orchestration
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster with clarity", subheadline: "Move from idea to production with structured pages." } },
        { type: "cta.simple", props: { headline: "Start today", subheadline: "Create an account in minutes.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "Sign up and edit structured sections." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
        { type: "feature.grid", props: { items: [{ title: "Fast setup", text: "Onboard in minutes." }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections with stable semantics." } },
        { type: "cta.simple", props: { headline: "Try it", subheadline: "No credit card.", buttonLabel: "Create account" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes, the same input yields the same output." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "For teams.", ctaLabel: "Upgrade" }] } },
        { type: "feature.grid", props: { items: [{ title: "Reliable", text: "Same input, same output." }] } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "Modern templates", subheadline: "Consistent structure site-wide." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "No credit card required.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "Can I customize?", answer: "Yes, structured props are editable." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "For growing orgs.", ctaLabel: "Contact sales" }] } },
        { type: "feature.grid", props: { items: [{ title: "Composable", text: "Mix and match sections." }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration, unresolvedPages } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "guided", "Scenario D: orchestrationMode=guided");

  const { orchestrationPreview } = buildOrchestrationPreview({ strategicExecutionOrchestration, unresolvedPages });
  assert(orchestrationPreview.overallPreviewStatus === "guided-ready", "Scenario D: overallPreviewStatus=guided-ready");
  assert(orchestrationPreview.summary.toLowerCase().includes("guided"), "Scenario D: summary references guided rollout");
}

// Scenario E — unresolved pages
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster with clarity", subheadline: "Move from idea to production with structured pages." } },
        { type: "cta.simple", props: { headline: "Start today", subheadline: "Create an account in minutes.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes, the same input yields the same output." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
      ],
    }),
  ];

  const pagesInput: Array<{ slug: string } | { slug: string; page: Gnr8Page }> = [
    { slug: "/a", page: resolvedPages[0].page },
    { slug: "/unresolved" },
  ];

  const { strategicExecutionOrchestration } = buildOrchestration({
    resolvedPages,
    unresolvedPages: ["/unresolved"],
    pagesInput,
  });

  const { orchestrationPreview } = buildOrchestrationPreview({
    strategicExecutionOrchestration,
    unresolvedPages: ["/unresolved"],
  });

  assert(
    orchestrationPreview.notes.some((n) => n.toLowerCase().includes("unresolved pages")),
    "Scenario E: notes mention unresolved pages",
  );
}

