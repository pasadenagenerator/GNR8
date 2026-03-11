import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "./migration-review-logic";
import { buildTransformationPlan } from "./transformation-planner";

function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

function page(sections: Array<{ type: string; props?: Record<string, unknown> }>): Gnr8Page {
  return {
    id: "page_test",
    slug: "test",
    title: "Test",
    sections: sections.map((s, i) => ({ id: `s_${i + 1}`, type: s.type, props: s.props })),
  };
}

function prompts(plan: ReturnType<typeof buildTransformationPlan>): Set<string> {
  return new Set(plan.steps.map((s) => s.actionPrompt));
}

// Scenario A — clean SaaS page
{
  const p = page([
    { type: "navbar.basic" },
    { type: "hero.split", props: { headline: "Ship faster", subheadline: "A platform for teams" } },
    { type: "logo.cloud", props: { logos: ["acme", "beta"] } },
    { type: "pricing.basic", props: { plans: [{ name: "Starter", price: "$9" }] } },
    { type: "faq.basic", props: { items: [{ question: "Q1", answer: "A1" }] } },
    { type: "cta.simple", props: { headline: "Try it", buttonLabel: "Start", buttonHref: "/signup" } },
    { type: "footer.basic" },
  ]);
  const review = buildMigrationReviewSummary(p);
  const plan = buildTransformationPlan({ page: p, review });
  assert(plan.strategy === "incremental", "scenario_a.strategy");
  assert(plan.priority === "low", "scenario_a.priority");
  assert(plan.steps.filter((s) => s.kind === "cleanup" || s.kind === "merge").length === 0, "scenario_a.no_cleanup");
  assert(plan.steps.length <= 2, "scenario_a.steps_at_most_2");
}

// Scenario B — mixed page with layout issues
{
  const p = page([
    { type: "hero.split", props: { headline: "Headline", subheadline: "Sub" } },
    { type: "pricing.basic", props: { plans: [{ name: "Starter", price: "$9" }] } },
    { type: "navbar.basic" },
    { type: "faq.basic", props: { items: [{ question: "Q1", answer: "A1" }] } },
    { type: "footer.basic" },
    { type: "cta.simple", props: { headline: "Try it", buttonLabel: "Start", buttonHref: "/signup" } },
  ]);
  const review = buildMigrationReviewSummary(p);
  const plan = buildTransformationPlan({ page: p, review });
  const pset = prompts(plan);
  assert(plan.strategy === "structural", "scenario_b.strategy");
  assert(plan.priority === "medium" || plan.priority === "high", "scenario_b.priority");
  assert(pset.has("Move navbar to the top"), "scenario_b.move_navbar");
  assert(pset.has("Move CTA below FAQ"), "scenario_b.move_cta");
  assert(pset.has("Move footer to the bottom"), "scenario_b.move_footer");
}

// Scenario C — legacy-heavy unclear page
{
  const p = page([
    { type: "legacy.html", props: { html: "<p>legacy</p>".repeat(200) } },
    { type: "legacy.html", props: { html: "<p>legacy2</p>".repeat(200) } },
    { type: "legacy.html", props: { html: "<p>legacy3</p>".repeat(200) } },
  ]);
  const review = buildMigrationReviewSummary(p);
  const plan = buildTransformationPlan({ page: p, review });
  assert(plan.strategy === "full-rebuild" || plan.strategy === "structural", "scenario_c.strategy");
  assert(plan.priority === "high", "scenario_c.priority");
  assert(plan.steps.some((s) => s.kind === "redesign" || s.kind === "replace-section"), "scenario_c.has_structural_steps");
}

// Scenario D — duplicate-heavy page (cleanup before additions)
{
  const pricingProps = { plans: [{ name: "Starter", price: "$9" }, { name: "Pro", price: "$29" }] };
  const p = page([
    { type: "navbar.basic" },
    { type: "hero.split", props: { headline: "Ship faster", subheadline: "A platform" } },
    { type: "pricing.basic", props: pricingProps },
    { type: "pricing.basic", props: pricingProps },
    { type: "footer.basic" },
  ]);
  const review = buildMigrationReviewSummary(p);
  const plan = buildTransformationPlan({ page: p, review });
  const removeIdx = plan.steps.findIndex((s) => s.actionPrompt === "Remove duplicate pricing section");
  assert(removeIdx !== -1, "scenario_d.has_duplicate_cleanup");

  const firstAddIdx = plan.steps.findIndex((s) => s.kind === "add-section" || s.kind === "replace-section");
  if (firstAddIdx !== -1) {
    assert(removeIdx < firstAddIdx, "scenario_d.cleanup_before_additions");
  }
}

if (typeof process !== "undefined" && process.argv?.[1] && process.argv[1].includes("transformation-planner.scenarios")) {
  // eslint-disable-next-line no-console
  console.log("[transformation-planner] scenarios: OK");
}

