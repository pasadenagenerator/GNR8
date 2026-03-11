import type { Gnr8Page } from "@/gnr8/types/page";
import { classifyPageIntent } from "./page-intent-classifier.js";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function page(sections: Array<{ type: string; props?: Record<string, unknown> }>): Gnr8Page {
  return {
    id: "page_test",
    slug: "test",
    title: "Test",
    sections: sections.map((s, i) => ({ id: `s_${i + 1}`, type: s.type, props: s.props })),
  };
}

// Scenario 1: navbar + hero + feature + pricing + faq + footer → saas_homepage
{
  const p = page([
    { type: "navbar.basic" },
    { type: "hero.split", props: { headline: "Ship faster with GNR8", subheadline: "A platform for teams" } },
    { type: "feature.grid", props: { items: [{ title: "Fast" }, { title: "Secure" }] } },
    { type: "pricing.basic", props: { plans: [{ name: "Starter", price: "$9" }, { name: "Pro", price: "$29" }] } },
    { type: "faq.basic", props: { items: [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }] } },
    { type: "footer.basic" },
  ]);
  assertEqual(classifyPageIntent(p).intent, "saas_homepage", "scenario_1");
}

// Scenario 2: hero + cta + feature + logo + footer → marketing_landing
{
  const p = page([
    { type: "hero.split", props: { headline: "Meet Acme", subheadline: "The best way to do X" } },
    { type: "cta.simple", props: { headline: "Try it", buttonLabel: "Start", buttonHref: "/signup" } },
    { type: "feature.grid", props: { items: [{ title: "One" }, { title: "Two" }] } },
    { type: "logo.cloud", props: { logos: ["acme", "beta"] } },
    { type: "footer.basic" },
  ]);
  assertEqual(classifyPageIntent(p).intent, "marketing_landing", "scenario_2");
}

// Scenario 3: mostly legacy.html → blog_article OR documentation
// (depending on hero/CTA presence)
{
  const blog = page([
    { type: "hero.split", props: { headline: "How we built it", subheadline: "Lessons learned" } },
    { type: "legacy.html", props: { html: "<p>content</p>".repeat(200) } },
    { type: "legacy.html", props: { html: "<p>more</p>".repeat(200) } },
    { type: "footer.basic" },
  ]);
  assertEqual(classifyPageIntent(blog).intent, "blog_article", "scenario_3_blog");

  const docs = page([
    { type: "navbar.basic" },
    { type: "legacy.html", props: { html: "<h1>Docs</h1>" + "<p>x</p>".repeat(400) } },
    { type: "legacy.html", props: { html: "<p>y</p>".repeat(400) } },
    { type: "legacy.html", props: { html: "<p>z</p>".repeat(400) } },
    { type: "cta.simple", props: { headline: "Get started", buttonLabel: "Install", buttonHref: "/install" } },
    { type: "footer.basic" },
  ]);
  assertEqual(classifyPageIntent(docs).intent, "documentation", "scenario_3_docs");
}

// Scenario 4: feature grids only → ecommerce_listing
{
  const p = page([
    { type: "feature.grid", props: { items: [{ title: "Product A" }, { title: "Product B" }, { title: "Product C" }] } },
  ]);
  assertEqual(classifyPageIntent(p).intent, "ecommerce_listing", "scenario_4");
}

// Scenario 5: hero + CTA only → product_page
{
  const p = page([
    { type: "hero.split", props: { headline: "Acme Widget", subheadline: "A better widget" } },
    { type: "cta.simple", props: { headline: "Buy now", buttonLabel: "Purchase", buttonHref: "/buy" } },
  ]);
  assertEqual(classifyPageIntent(p).intent, "product_page", "scenario_5");
}

// When executed directly (after TS transpilation), print a compact success marker.
// This file is intentionally not imported in app runtime; it exists as a deterministic scenario check.
if (typeof process !== "undefined" && process.argv?.[1] && process.argv[1].includes("page-intent-classifier.scenarios")) {
  // eslint-disable-next-line no-console
  console.log("[page-intent-classifier] scenarios: OK");
}
