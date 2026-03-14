import type { Gnr8Page } from "@/gnr8/types/page";
import { buildStrategicWaveExecutionPreviewSimulation } from "./strategic-wave-preview-simulation";

function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

function page(input: {
  slug: string;
  sections: Array<{ type: string; props?: Record<string, unknown> }>;
}): Gnr8Page {
  return {
    id: `page_${input.slug.replace(/[^a-z0-9]/gi, "_")}`,
    slug: input.slug,
    title: "Test",
    sections: input.sections.map((s, i) => ({ id: `s_${i + 1}`, type: s.type, props: s.props })),
  };
}

function bySlug(out: ReturnType<typeof buildStrategicWaveExecutionPreviewSimulation>) {
  const map = new Map(out.simulatedResults.map((r) => [r.slug, r]));
  return (slug: string) => map.get(slug);
}

const targetedSuggestions = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
];

// Scenario A — fully executable wave
{
  const p1 = page({
    slug: "/a1",
    sections: [{ type: "hero.split", props: { headline: "Welcome", subheadline: "A product teams love." } }],
  });
  const p2 = page({
    slug: "/a2",
    sections: [
      { type: "cta.simple", props: { headline: "Ready to start?", subheadline: "Create an account in minutes.", buttonLabel: "Learn more" } },
    ],
  });

  const sim = buildStrategicWaveExecutionPreviewSimulation({
    waveId: "wave_a",
    targetedPages: [p1.slug, p2.slug],
    targetedSuggestions,
    pageBySlug: new Map([
      [p1.slug, p1],
      [p2.slug, p2],
    ]),
  });

  const get = bySlug(sim);
  const r1 = get("/a1");
  const r2 = get("/a2");
  assert(r1?.status === "would-execute", "scenario_a.status_a1");
  assert(r2?.status === "would-execute", "scenario_a.status_a2");
  assert((r1?.simulatedImpact.expectedDelta ?? 0) > 0, "scenario_a.delta_positive_a1");
  assert((r2?.simulatedImpact.expectedDelta ?? 0) > 0, "scenario_a.delta_positive_a2");
  assert(sim.summary === "Semantic wave would improve structured content across selected pages.", "scenario_a.summary");
}

// Scenario B — mixed readiness (one blocked, one executable)
{
  const blocked = page({
    slug: "/b1",
    sections: [{ type: "legacy.html", props: { html: "<div>legacy</div>" } }],
  });
  const exec = page({
    slug: "/b2",
    sections: [{ type: "hero.split", props: { headline: "Welcome", subheadline: "A product teams love." } }],
  });

  const sim = buildStrategicWaveExecutionPreviewSimulation({
    waveId: "wave_b",
    targetedPages: [blocked.slug, exec.slug],
    targetedSuggestions,
    pageBySlug: new Map([
      [blocked.slug, blocked],
      [exec.slug, exec],
    ]),
  });

  const get = bySlug(sim);
  assert(get("/b1")?.status === "blocked", "scenario_b.blocked");
  assert(get("/b2")?.status === "would-execute", "scenario_b.executable");
  assert(sim.notes.some((n) => n.toLowerCase().includes("blocked pages exist")), "scenario_b.notes_blocked");
  assert(sim.summary.includes("would improve"), "scenario_b.summary_partial");
}

// Scenario C — no remaining suggestions (already optimized)
{
  const healthy = page({
    slug: "/c",
    sections: [
      { type: "hero.split", props: { headline: "Ship faster", subheadline: "A platform that helps teams deliver." } },
      { type: "cta.simple", props: { headline: "Ready to start?", subheadline: "Create an account in minutes.", buttonLabel: "Get started", buttonHref: "/signup" } },
      { type: "faq.basic", props: { items: [{ question: "How does it work?", answer: "You sign up and follow the setup steps to get started quickly." }] } },
      { type: "pricing.basic", props: { plans: [{ name: "Starter", description: "For individuals getting started.", ctaLabel: "Start free" }] } },
      { type: "feature.grid", props: { items: [{ title: "Fast", text: "Set up in minutes with a guided onboarding flow." }] } },
    ],
  });

  const sim = buildStrategicWaveExecutionPreviewSimulation({
    waveId: "wave_c",
    targetedPages: [healthy.slug],
    targetedSuggestions,
    pageBySlug: new Map([[healthy.slug, healthy]]),
  });

  const r = bySlug(sim)("/c");
  assert(r?.status === "would-skip", "scenario_c.status_skip");
  assert((r?.simulatedImpact.expectedDelta ?? 1) === 0, "scenario_c.delta_zero");
  assert(sim.summary === "No semantic improvements applicable for this wave.", "scenario_c.summary");
}

// Scenario D — weak baseline (medium confidence, multiple weaknesses -> larger expectedDelta)
{
  const weak = page({
    slug: "/d",
    sections: [
      { type: "hero.split", props: { headline: "Welcome", subheadline: "A product teams love." } },
      { type: "cta.simple", props: { headline: "Ready to start?", subheadline: "Create an account in minutes.", buttonLabel: "Learn more" } },
    ],
  });

  const sim = buildStrategicWaveExecutionPreviewSimulation({
    waveId: "wave_d",
    targetedPages: [weak.slug],
    targetedSuggestions,
    pageBySlug: new Map([[weak.slug, weak]]),
  });

  const r = bySlug(sim)("/d");
  assert(r?.status === "would-execute", "scenario_d.actionable");
  assert((r?.simulatedImpact.expectedDelta ?? 0) >= 10, "scenario_d.delta_large");
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].includes("strategic-wave-preview-simulation.scenarios")
) {
  // eslint-disable-next-line no-console
  console.log("[strategic-wave-preview-simulation] scenarios: OK");
}
