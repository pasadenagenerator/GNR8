import type { Gnr8Page } from "@/gnr8/types/page";
import { buildSiteSemanticIntelligence } from "./site-semantic-intelligence";

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

// Scenario A — strong site
{
  const resolvedPages = [
    page({
      slug: "/a",
      sections: [
        { type: "hero.split", props: { headline: "Ship faster", subheadline: "Move from idea to production." } },
        { type: "cta.simple", props: { headline: "Get started", subheadline: "Create an account.", buttonLabel: "Start free" } },
        { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "Sign up and follow the steps." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals.", ctaLabel: "Start free" }] } },
        { type: "feature.grid", props: { items: [{ title: "Fast setup", text: "Onboard in minutes." }] } },
      ],
    }),
    page({
      slug: "/b",
      sections: [
        { type: "hero.split", props: { headline: "Build better pages", subheadline: "Structured sections, deterministic signals." } },
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
        { type: "faq.basic", props: { items: [{ question: "Can I customize?", answer: "Yes, with structured props." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Business", description: "For growing orgs.", ctaLabel: "Contact sales" }] } },
        { type: "feature.grid", props: { items: [{ title: "Composable", text: "Mix and match sections." }] } },
      ],
    }),
    page({
      slug: "/d",
      sections: [
        { type: "hero.split", props: { headline: "Semantic health", subheadline: "Know where to improve." } },
        { type: "cta.simple", props: { headline: "Run analysis", subheadline: "See coverage.", buttonLabel: "Analyze" } },
        { type: "faq.basic", props: { items: [{ question: "Does it score pages?", answer: "It aggregates existing signals." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "Baseline plan.", ctaLabel: "Start free" }] } },
        { type: "feature.grid", props: { items: [{ title: "Coverage", text: "Section presence across pages." }] } },
      ],
    }),
    page({
      slug: "/e",
      sections: [
        { type: "hero.split", props: { headline: "Automation-ready", subheadline: "Reduce manual work." } },
        { type: "cta.simple", props: { headline: "Enable", subheadline: "Proceed safely.", buttonLabel: "Enable automation" } },
        { type: "faq.basic", props: { items: [{ question: "Is it safe?", answer: "It depends on readiness." }] } },
        { type: "pricing.basic", props: { plans: [{ name: "Pro", description: "Advanced features.", ctaLabel: "Upgrade" }] } },
        { type: "feature.grid", props: { items: [{ title: "Stable", text: "Deterministic decisions." }] } },
      ],
    }),
  ];

  const site = buildSiteSemanticIntelligence({
    pages: resolvedPages.map((p) => ({ slug: p.slug, page: p.page })),
    resolvedPages,
    unresolvedPages: [],
  });

  assert(site.semanticHealthLabel === "high", "scenario_a.health_high");
  assert(site.semanticAutomationReadiness.label === "automation-candidate", "scenario_a.automation_candidate");
}

// Scenario B — clustered CTA weakness
{
  const resolvedPages = [
    page({ slug: "/cta-1", sections: [{ type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click here" } }] }),
    page({ slug: "/cta-2", sections: [{ type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Learn more" } }] }),
    page({ slug: "/cta-3", sections: [{ type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Submit" } }] }),
  ];

  const site = buildSiteSemanticIntelligence({
    pages: resolvedPages.map((p) => ({ slug: p.slug, page: p.page })),
    resolvedPages,
    unresolvedPages: [],
  });

  assert(site.semanticWeaknessClusters.includes("Improve CTA clarity"), "scenario_b.cta_cluster");
  assert(site.semanticSuggestionSummary.improveCTA === 3, "scenario_b.cta_count");
}

// Scenario C — bottleneck page
{
  const resolvedPages = [
    page({ slug: "/ok", sections: [{ type: "hero.split", props: { headline: "Hello", subheadline: "World" } }] }),
    page({ slug: "/bottleneck", sections: [{ type: "legacy.html", props: { html: "<div/>" } }] }),
  ];

  const site = buildSiteSemanticIntelligence({
    pages: resolvedPages.map((p) => ({ slug: p.slug, page: p.page })),
    resolvedPages,
    unresolvedPages: [],
  });

  assert(site.semanticBottleneckPages.includes("/bottleneck"), "scenario_c.bottleneck_included");
}

// Scenario D — missing pricing
{
  const resolvedPages = [
    page({ slug: "/p1", sections: [{ type: "hero.split", props: { headline: "One", subheadline: "Two" } }] }),
    page({ slug: "/p2", sections: [{ type: "hero.split", props: { headline: "Three", subheadline: "Four" } }] }),
    page({ slug: "/p3", sections: [{ type: "cta.simple", props: { headline: "A", subheadline: "B", buttonLabel: "Go" } }] }),
    page({ slug: "/p4", sections: [{ type: "faq.basic", props: { items: [{ question: "Q", answer: "A" }] } }] }),
  ];

  const site = buildSiteSemanticIntelligence({
    pages: resolvedPages.map((p) => ({ slug: p.slug, page: p.page })),
    resolvedPages,
    unresolvedPages: [],
  });

  assert(site.semanticCoverage.pricingCoverage === 0, "scenario_d.pricing_coverage");
  assert(site.recommendations.includes("Complete pricing messaging before scaling."), "scenario_d.pricing_rec");
}

// Scenario E — unresolved slugs
{
  const resolvedPages = [page({ slug: "/resolved", sections: [{ type: "hero.split", props: { headline: "X", subheadline: "Y" } }] })];

  const site = buildSiteSemanticIntelligence({
    pages: [{ slug: "/resolved", page: resolvedPages[0]!.page }, { slug: "/missing-1" }, { slug: "/missing-2" }],
    resolvedPages,
    unresolvedPages: ["/missing-1", "/missing-2"],
  });

  assert(site.notes.some((n) => n.includes("Unresolved pages:")), "scenario_e.notes_mentions_unresolved");
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].includes("site-semantic-intelligence.scenarios")
) {
  // eslint-disable-next-line no-console
  console.log("[site-semantic-intelligence] scenarios: OK");
}

