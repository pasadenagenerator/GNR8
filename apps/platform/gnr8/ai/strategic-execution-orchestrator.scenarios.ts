import type { Gnr8Page } from "@/gnr8/types/page";
import { buildSiteSemanticConsistency } from "./site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "./site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "./strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "./strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "./strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "./strategic-semantic-reasoning";

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

  return {
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
    strategicSemanticPlan,
    strategicSemanticExecutionReadiness,
    strategicExecutionOrchestration,
  };
}

// Scenario A — blocked site
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
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "", subheadline: "" } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "", ctaLabel: "" }] } },
        { type: "feature.grid", props: { items: [{ title: "", text: "" }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "blocked", "Scenario A: orchestrationMode=blocked");
  assert(
    strategicExecutionOrchestration.waves.every((w) => w.readiness !== "ready"),
    "Scenario A: no ready waves",
  );
  assert(strategicExecutionOrchestration.executionCandidates.length === 0, "Scenario A: no executionCandidates");
}

// Scenario B — phased site
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "Sign up." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "For teams.", ctaLabel: "Upgrade" }] } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "Modern templates", subheadline: "Consistent structure site-wide." } },
        { type: "cta.simple", props: { headline: "Try it", subheadline: "No credit card.", buttonLabel: "Create account" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "", ctaLabel: "" }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "phased", "Scenario B: orchestrationMode=phased");
  assert(strategicExecutionOrchestration.waves.length >= 2, "Scenario B: at least 2 waves");
  assert(strategicExecutionOrchestration.deferredStepIds.length > 0, "Scenario B: deferredStepIds populated");
  assert(strategicExecutionOrchestration.executionCandidates.length > 0, "Scenario B: executionCandidates populated");
  assert(strategicExecutionOrchestration.reviewRequiredPages.length > 0, "Scenario B: reviewRequiredPages populated");
}

// Scenario C — guided site
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "Create an account.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "Sign up." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
        { type: "feature.grid", props: { items: [{ title: "Fast setup", text: "Onboard in minutes." }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections." } },
        { type: "cta.simple", props: { headline: "Try it", subheadline: "No credit card.", buttonLabel: "Create account" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "For teams.", ctaLabel: "Upgrade" }] } },
        { type: "feature.grid", props: { items: [{ title: "Reliable", text: "Same input, same output." }] } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "Modern templates", subheadline: "Consistent structure site-wide." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "Can I customize?", answer: "Yes." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "For growing orgs.", ctaLabel: "Contact sales" }] } },
        { type: "feature.grid", props: { items: [{ title: "Composable", text: "Mix and match sections." }] } },
      ],
    }),
  ];

  const { strategicExecutionOrchestration } = buildOrchestration({ resolvedPages });
  assert(strategicExecutionOrchestration.orchestrationMode === "guided", "Scenario C: orchestrationMode=guided");
  assert(strategicExecutionOrchestration.waves.length >= 2, "Scenario C: at least 2 waves");
  assert(
    strategicExecutionOrchestration.waves.some((w) => w.readiness === "ready"),
    "Scenario C: at least one ready wave",
  );
  assert(strategicExecutionOrchestration.executionCandidates.length > 0, "Scenario C: executionCandidates populated");
}

// Scenario D — coverage-heavy plan
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [{ type: "hero.split", props: { headline: "Hi", subheadline: "" } }],
    }),
    page({
      slug: "/b",
      sections: [{ type: "cta.simple", props: { headline: "Go", subheadline: "", buttonLabel: "Start" } }],
    }),
    page({
      slug: "/c",
      sections: [{ type: "pricing.basic", props: { plans: [{ name: "Starter", description: "", ctaLabel: "" }] } }],
    }),
  ];

  const { strategicSemanticPlan, strategicExecutionOrchestration } = buildOrchestration({ resolvedPages });
  const coverageStepIds = strategicSemanticPlan.steps.filter((s) => s.type === "site-coverage").map((s) => s.id);
  assert(coverageStepIds.length > 0, "Scenario D: coverage steps exist");

  const stabilization = strategicExecutionOrchestration.waves.find((w) => w.id === "wave-stabilization");
  assert(!!stabilization, "Scenario D: stabilization wave exists");

  const stabilizationStepSet = new Set(stabilization?.stepIds ?? []);
  for (const id of coverageStepIds) {
    assert(stabilizationStepSet.has(id), "Scenario D: coverage step assigned to stabilization wave");
  }
}

// Scenario E — unresolved slugs
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "Create an account.", buttonLabel: "Start free" } },
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

  assert(
    strategicExecutionOrchestration.notes.some((n) => n.toLowerCase().includes("unresolved pages")),
    "Scenario E: notes mention unresolved pages",
  );
}

