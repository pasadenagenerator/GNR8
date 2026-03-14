import type { Gnr8Page } from "@/gnr8/types/page";
import { buildSiteSemanticConsistency } from "./site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "./site-semantic-intelligence";
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

function buildPlan(input: {
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

  return buildStrategicSemanticPlan({
    pages,
    resolvedPages: input.resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
  });
}

// Scenario A — low health site
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

  const plan = buildPlan({ resolvedPages });
  assert(plan.planPriority === "high", "Scenario A: planPriority should be high");
  assert(plan.planMode === "stabilize", "Scenario A: planMode should be stabilize");
  assert(plan.steps.length > 0, "Scenario A: should emit steps");
}

// Scenario B — consistency problems
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "Create an account.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "Sign up." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections." } },
        { type: "cta.simple", props: { headline: "Try it", subheadline: "No credit card.", buttonLabel: "Create account" } },
        { type: "faq.basic", props: { items: [{ question: "Is it deterministic?", answer: "Yes." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "For teams.", ctaLabel: "Upgrade" }] } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "", subheadline: "" } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
        { type: "faq.basic", props: { items: [{ question: "", answer: "" }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "", ctaLabel: "" }] } },
      ],
    }),
  ];

  const plan = buildPlan({ resolvedPages });
  assert(plan.planMode === "standardize" || plan.focusArea === "consistency", "Scenario B: should standardize consistency");
  assert(
    plan.steps.some((s) => s.type === "site-consistency"),
    "Scenario B: should include at least one site-consistency step",
  );
}

// Scenario C — automation-ready site
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
        { type: "cta.simple", props: { headline: "See templates", subheadline: "Browse options.", buttonLabel: "View templates" } },
        { type: "faq.basic", props: { items: [{ question: "Can I customize?", answer: "Yes." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "For growing orgs.", ctaLabel: "Contact sales" }] } },
        { type: "feature.grid", props: { items: [{ title: "Composable", text: "Mix and match sections." }] } },
      ],
    }),
  ];

  const plan = buildPlan({ resolvedPages });
  assert(plan.planMode === "prepare-automation" || plan.focusArea === "automation-readiness", "Scenario C: prepare automation");
  assert(plan.steps.length <= 2, "Scenario C: plan should be minimal");
}

// Scenario D — clustered CTA weakness
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections." } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
      ],
    }),
    page({
      slug: "/c",
      sections: [
        { type: "hero.split", props: { headline: "Modern templates", subheadline: "Consistent structure site-wide." } },
        { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click" } },
      ],
    }),
  ];

  const plan = buildPlan({ resolvedPages });
  const ctaStep = plan.steps.find((s) => s.type === "page-semantic-improvement" && s.targetSuggestions.includes("Improve CTA clarity"));
  assert(!!ctaStep, "Scenario D: should include grouped CTA improvement step");
  assert((ctaStep?.targetPages ?? []).join(",") === "/a,/b,/c", "Scenario D: targetPages should be stable slug order");
}

// Scenario E — unresolved slugs
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [{ type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } }],
    }),
  ];

  const pagesInput = [{ slug: "/a", page: resolvedPages[0].page }, { slug: "/missing" }, { slug: "/also-missing" }];
  const plan = buildPlan({ resolvedPages, unresolvedPages: ["/missing", "/also-missing"], pagesInput });
  assert(plan.notes.some((n) => n.toLowerCase().includes("unresolved pages")), "Scenario E: should include unresolved note");
}

