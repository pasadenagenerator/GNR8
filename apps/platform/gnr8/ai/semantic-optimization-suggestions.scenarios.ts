import type { Gnr8Page } from "@/gnr8/types/page";
import { buildSemanticOptimizationSuggestions } from "./semantic-optimization-suggestions";

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

function hasSuggestion(suggestions: string[], expected: string): boolean {
  return suggestions.includes(expected);
}

// Scenario A — weak hero
{
  const p = page([{ type: "hero.split", props: { headline: "Hi", subheadline: "   " } }]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(hasSuggestion(suggestions, "Improve hero clarity"), "scenario_a.hero");
}

// Scenario B — weak CTA
{
  const p = page([{ type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click here" } }]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(hasSuggestion(suggestions, "Improve CTA clarity"), "scenario_b.cta");
}

// Scenario C — incomplete FAQ
{
  const p = page([{ type: "faq.basic", props: { items: [{ question: "What is this?", answer: "" }] } }]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(hasSuggestion(suggestions, "Normalize FAQ content"), "scenario_c.faq");
}

// Scenario D — incomplete pricing
{
  const p = page([{ type: "pricing.basic", props: { plans: [{ name: "Starter" }, { name: "Pro", description: "", ctaLabel: "" }] } }]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(hasSuggestion(suggestions, "Complete pricing content"), "scenario_d.pricing");
}

// Scenario E — incomplete feature grid
{
  const p = page([{ type: "feature.grid", props: { items: [{ title: "Fast setup", text: "" }] } }]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(hasSuggestion(suggestions, "Complete feature grid content"), "scenario_e.feature_grid");
}

// Scenario F — already semantically healthy page
{
  const p = page([
    { type: "hero.split", props: { headline: "Ship faster", subheadline: "A platform that helps teams deliver." } },
    { type: "cta.simple", props: { headline: "Ready to start?", subheadline: "Create an account in minutes.", buttonLabel: "Get started", buttonHref: "/signup" } },
    { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "You sign up and follow the setup steps to get started quickly." }] } },
    { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals getting started.", ctaLabel: "Start free" }] } },
    { type: "feature.grid", props: { items: [{ title: "Fast", text: "Set up in minutes with a guided onboarding flow." }] } },
  ]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(suggestions.length === 0, "scenario_f.empty");
}

// Deterministic ordering and dedupe
{
  const p = page([
    { type: "feature.grid", props: { items: [{ title: "TBD", text: "TBD" }] } },
    { type: "hero.split", props: { headline: "Hi", subheadline: "" } },
    { type: "cta.simple", props: { headline: "", subheadline: "", buttonLabel: "Click here" } },
    { type: "faq.basic", props: { items: [{ question: "todo", answer: "todo" }] } },
    { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "", ctaLabel: "" }] } },
  ]);
  const suggestions = buildSemanticOptimizationSuggestions(p);
  assert(
    suggestions.join("|") ===
      [
        "Improve hero clarity",
        "Improve CTA clarity",
        "Normalize FAQ content",
        "Complete pricing content",
        "Complete feature grid content",
      ].join("|"),
    "scenario_ordering",
  );
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].includes("semantic-optimization-suggestions.scenarios")
) {
  // eslint-disable-next-line no-console
  console.log("[semantic-optimization-suggestions] scenarios: OK");
}

