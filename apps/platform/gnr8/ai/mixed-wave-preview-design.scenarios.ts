import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan, type StrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import type { StrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";

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

function buildDesignBaseline(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages?: string[];
}): {
  strategicSemanticPlan: StrategicSemanticPlan;
  mixedWaveExecutionDesign: ReturnType<typeof buildMixedWaveExecutionDesign>["mixedWaveExecutionDesign"];
} {
  const unresolvedPages = input.unresolvedPages ?? [];
  const pages = input.resolvedPages.map((p) => ({ slug: p.slug, page: p.page }));

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

  const { mixedWaveExecutionDesign } = buildMixedWaveExecutionDesign({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
    strategicSemanticExecutionReadiness,
    strategicSemanticReasoning,
  });

  return { strategicSemanticPlan, mixedWaveExecutionDesign };
}

// Scenario A — semantic-only style wave
{
  const resolvedPages = [
    page({
      slug: "/semantic",
      sections: [
        { type: "navbar.basic" },
        { type: "hero.split", props: { headline: "", subheadline: "" } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "", ctaLabel: "" }] } },
        { type: "feature.grid", props: { items: [{ title: "", text: "" }] } },
        { type: "footer.basic" },
      ],
    }),
  ];

  const { mixedWaveExecutionDesign, strategicSemanticPlan } = buildDesignBaseline({ resolvedPages });

  const strategicExecutionOrchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "semantic-first",
    waves: [
      {
        id: "wave-semantic-only",
        label: "Wave X — Semantic",
        purpose: "semantic improvement",
        readiness: "ready",
        stepIds: ["step-semantic"],
        targetPages: ["/semantic"],
        rationale: [],
      },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: [],
    summary: "",
    notes: [],
  };

  const overridePlan: StrategicSemanticPlan = {
    ...strategicSemanticPlan,
    steps: [
      {
        id: "step-semantic",
        type: "page-semantic-improvement",
        title: "Semantic improvements",
        description: "Semantic improvements",
        priority: "medium",
        targetPages: ["/semantic"],
        targetSuggestions: ["Improve hero clarity"],
        rationale: [],
      },
    ],
  };

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: resolvedPages,
    resolvedPages,
    unresolvedPages: [],
    strategicExecutionOrchestration,
    strategicSemanticPlan: overridePlan,
    mixedWaveExecutionDesign,
  });

  assert(mixedWavePreviewDesign.wavePreviews.length === 1, "Scenario A: one wave preview");
  assert(mixedWavePreviewDesign.wavePreviews[0]!.semanticActionClasses.includes("content-improvement"), "Scenario A: semantic class detected");
  assert(mixedWavePreviewDesign.wavePreviews[0]!.expectedSemanticEffects.length > 0, "Scenario A: semantic effects present");
  assert(mixedWavePreviewDesign.wavePreviews[0]!.expectedStructuralEffects.length === 0, "Scenario A: no structural effects");
}

// Scenario B — stabilization wave with cleanup/merge/normalize only
{
  const resolvedPages = [
    page({
      slug: "/stabilize",
      sections: [
        { type: "navbar.basic" },
        { type: "hero.split", props: { headline: "Hello", subheadline: "World" } },
        { type: "cta.simple", props: { headline: "Go", subheadline: "Now", buttonLabel: "Click" } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "Ok", ctaLabel: "Buy" }] } },
        { type: "faq.basic", props: { items: [{ question: "Q1", answer: "A1" }] } },
        { type: "faq.basic", props: { items: [{ question: "Q1", answer: "A1" }] } },
        { type: "feature.grid", props: { items: [{ title: "T", text: "X" }] } },
        { type: "footer.basic" },
      ],
    }),
  ];

  const { mixedWaveExecutionDesign, strategicSemanticPlan } = buildDesignBaseline({ resolvedPages });

  const strategicExecutionOrchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "stabilize-first",
    waves: [
      {
        id: "wave-stabilization",
        label: "Wave 1 — Stabilization",
        purpose: "stabilization",
        readiness: "review-needed",
        stepIds: ["step-coverage"],
        targetPages: ["/stabilize"],
        rationale: [],
      },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: [],
    summary: "",
    notes: [],
  };

  const overridePlan: StrategicSemanticPlan = {
    ...strategicSemanticPlan,
    steps: [
      {
        id: "step-coverage",
        type: "site-coverage",
        title: "Coverage stabilization",
        description: "Coverage stabilization",
        priority: "high",
        targetPages: ["/stabilize"],
        targetSuggestions: [],
        rationale: [],
      },
    ],
  };

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: resolvedPages,
    resolvedPages,
    unresolvedPages: [],
    strategicExecutionOrchestration,
    strategicSemanticPlan: overridePlan,
    mixedWaveExecutionDesign,
  });

  const wave = mixedWavePreviewDesign.wavePreviews[0]!;
  assert(wave.structuralActionClasses.includes("merge"), "Scenario B: merge detected");
  assert(wave.structuralActionClasses.includes("cleanup") || wave.structuralActionClasses.includes("normalize"), "Scenario B: structural classes present");
  assert(wave.semanticActionClasses.length === 0, "Scenario B: semantic classes absent");
  assert(wave.mixedEligibility !== "not-eligible", "Scenario B: not blocked by default");
}

// Scenario C — wave containing add-section / replace-section / redesign implications
{
  const resolvedPages = [
    page({
      slug: "/later",
      sections: [
        { type: "legacy.html", props: { html: "<div>legacy</div>" } },
        { type: "hero.split", props: { headline: "", subheadline: "" } },
      ],
    }),
  ];

  const { mixedWaveExecutionDesign, strategicSemanticPlan } = buildDesignBaseline({ resolvedPages });

  const strategicExecutionOrchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "stabilize-first",
    waves: [
      {
        id: "wave-later-implications",
        label: "Wave X — Implications",
        purpose: "stabilization",
        readiness: "review-needed",
        stepIds: ["step-coverage-2"],
        targetPages: ["/later"],
        rationale: [],
      },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: [],
    summary: "",
    notes: [],
  };

  const overridePlan: StrategicSemanticPlan = {
    ...strategicSemanticPlan,
    steps: [
      {
        id: "step-coverage-2",
        type: "site-coverage",
        title: "Coverage stabilization",
        description: "Coverage stabilization",
        priority: "high",
        targetPages: ["/later"],
        targetSuggestions: [],
        rationale: [],
      },
    ],
  };

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: resolvedPages,
    resolvedPages,
    unresolvedPages: [],
    strategicExecutionOrchestration,
    strategicSemanticPlan: overridePlan,
    mixedWaveExecutionDesign,
  });

  const wave = mixedWavePreviewDesign.wavePreviews[0]!;
  assert(wave.structuralActionClasses.includes("add-section"), "Scenario C: add-section detected");
  assert(wave.structuralActionClasses.includes("replace-section"), "Scenario C: replace-section detected");
  assert(wave.blockedStructuralClasses.length > 0, "Scenario C: blocked structural classes populated");
  assert(wave.expectedStructuralEffects.some((e) => e.includes("later mixed phase") || e.includes("advisory")), "Scenario C: effects explain status");
}

// Scenario D — unresolved-heavy input
{
  const resolvedPages = [
    page({
      slug: "/ok",
      sections: [{ type: "hero.split", props: { headline: "Ok", subheadline: "Ok" } }],
    }),
  ];

  const { mixedWaveExecutionDesign, strategicSemanticPlan } = buildDesignBaseline({
    resolvedPages,
    unresolvedPages: ["/missing-1", "/missing-2", "/missing-3"],
  });

  const strategicExecutionOrchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "semantic-first",
    waves: [
      {
        id: "wave-unresolved",
        label: "Wave X — Unresolved",
        purpose: "semantic improvement",
        readiness: "review-needed",
        stepIds: ["step-semantic-2"],
        targetPages: ["/ok", "/missing-1", "/missing-2"],
        rationale: [],
      },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: [],
    summary: "",
    notes: [],
  };

  const overridePlan: StrategicSemanticPlan = {
    ...strategicSemanticPlan,
    steps: [
      {
        id: "step-semantic-2",
        type: "page-semantic-improvement",
        title: "Semantic improvements",
        description: "Semantic improvements",
        priority: "medium",
        targetPages: ["/ok", "/missing-1", "/missing-2"],
        targetSuggestions: ["Improve hero clarity"],
        rationale: [],
      },
    ],
  };

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: [{ slug: "/ok", page: resolvedPages[0]!.page }, { slug: "/missing-1" }, { slug: "/missing-2" }],
    resolvedPages,
    unresolvedPages: ["/missing-1", "/missing-2", "/missing-3"],
    strategicExecutionOrchestration,
    strategicSemanticPlan: overridePlan,
    mixedWaveExecutionDesign,
  });

  const wave = mixedWavePreviewDesign.wavePreviews[0]!;
  assert(wave.blockedTargetPages.includes("/missing-1"), "Scenario D: missing-1 blocked");
  assert(mixedWavePreviewDesign.notes.some((n) => n.toLowerCase().includes("unresolved pages")), "Scenario D: notes mention unresolved");
}

// Scenario E — waveId omitted (all waves in order)
{
  const resolvedPages = [
    page({ slug: "/a", sections: [{ type: "hero.split", props: { headline: "A", subheadline: "A" } }] }),
    page({ slug: "/b", sections: [{ type: "hero.split", props: { headline: "B", subheadline: "B" } }] }),
  ];

  const { mixedWaveExecutionDesign, strategicSemanticPlan } = buildDesignBaseline({ resolvedPages });

  const strategicExecutionOrchestration: StrategicExecutionOrchestration = {
    orchestrationMode: "phased",
    rolloutStrategy: "semantic-first",
    waves: [
      { id: "w1", label: "W1", purpose: "semantic improvement", readiness: "ready", stepIds: ["s1"], targetPages: ["/a"], rationale: [] },
      { id: "w2", label: "W2", purpose: "stabilization", readiness: "review-needed", stepIds: ["s2"], targetPages: ["/b"], rationale: [] },
    ],
    deferredStepIds: [],
    blockedStepIds: [],
    executionCandidates: [],
    reviewRequiredPages: [],
    summary: "",
    notes: [],
  };

  const overridePlan: StrategicSemanticPlan = {
    ...strategicSemanticPlan,
    steps: [
      {
        id: "s1",
        type: "page-semantic-improvement",
        title: "Semantic improvements",
        description: "Semantic improvements",
        priority: "medium",
        targetPages: ["/a"],
        targetSuggestions: ["Improve hero clarity"],
        rationale: [],
      },
      {
        id: "s2",
        type: "site-coverage",
        title: "Coverage stabilization",
        description: "Coverage stabilization",
        priority: "high",
        targetPages: ["/b"],
        targetSuggestions: [],
        rationale: [],
      },
    ],
  };

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: resolvedPages,
    resolvedPages,
    unresolvedPages: [],
    strategicExecutionOrchestration,
    strategicSemanticPlan: overridePlan,
    mixedWaveExecutionDesign,
  });

  assert(mixedWavePreviewDesign.wavePreviews.map((w) => w.waveId).join(",") === "w1,w2", "Scenario E: stable order preserved");
}

