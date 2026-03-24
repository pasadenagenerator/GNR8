import assert from "node:assert/strict";
import test from "node:test";

import {
  fixtureHeavyNavHtml,
  fixtureMaverHtml,
  fixtureSimpleLandingHtml,
} from "@/gnr8/migration/layout-graph/layout-graph-test-fixtures";

import { importHtmlToPage } from "./html-to-page";

type LayoutStructuralMeta = {
  intent?: string;
};

function sectionIntent(section: { props?: Record<string, unknown> }): string | null {
  const raw = section.props?.layoutStructural;
  if (!raw || typeof raw !== "object") return null;
  return (raw as LayoutStructuralMeta).intent ?? null;
}

test("importHtmlToPage routes snapshot through layout graph before semantic detection", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureHeavyNavHtml,
  });

  assert.ok(page.sections.length >= 2);
  const hero = page.sections.find((section) => section.type === "hero.split");
  assert.ok(hero, "hero should be detected from the actual hero block");
  assert.notEqual((hero?.props as { headline?: string } | undefined)?.headline, "Menu");
});

test("canonical section order follows layout graph order", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureSimpleLandingHtml,
  });

  const intents = page.sections
    .map((section) => sectionIntent(section))
    .filter((intent): intent is string => typeof intent === "string");

  assert.ok(intents.length >= 5, "expected structural intents on imported sections");

  const expectedOrder = ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"];
  let cursor = -1;
  for (const expected of expectedOrder) {
    const next = intents.findIndex((intent, idx) => idx > cursor && intent === expected);
    assert.ok(next !== -1, `expected intent '${expected}' in canonical order`);
    cursor = next;
  }
});

test("hero/nav/footer are emitted as distinct canonical sections", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureSimpleLandingHtml,
  });

  const navIndex = page.sections.findIndex((section) => section.type === "navbar.basic");
  const heroIndex = page.sections.findIndex((section) => section.type === "hero.split");
  const footerIndex = page.sections.findIndex((section) => section.type === "footer.basic");

  assert.ok(navIndex >= 0, "nav section should exist");
  assert.ok(heroIndex >= 0, "hero section should exist");
  assert.ok(footerIndex >= 0, "footer section should exist");
  assert.ok(navIndex < heroIndex, "nav should be before hero");
  assert.ok(heroIndex < footerIndex, "hero should be before footer");
});

test("gallery and form/contact regions survive in canonical structure", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureSimpleLandingHtml,
  });

  const intents = new Set(page.sections.map((section) => sectionIntent(section)).filter(Boolean));

  assert.ok(intents.has("gallery_media"), "gallery/media region should survive into canonical metadata");
  assert.ok(intents.has("form_contact"), "form/contact region should survive into canonical metadata");
});

test("maver fixture now preserves richer canonical structure and avoids single legacy collapse", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureMaverHtml,
  });

  assert.ok(page.sections.length >= 5, "maver fixture should produce multiple canonical sections");

  const legacyCount = page.sections.filter((section) => section.type === "legacy.html").length;
  assert.ok(legacyCount < page.sections.length, "not all sections should collapse to legacy.html");

  const intents = new Set(page.sections.map((section) => sectionIntent(section)).filter(Boolean));
  assert.ok(intents.has("gallery_media"), "maver output should retain gallery/media region intent");
  assert.ok(intents.has("form_contact"), "maver output should retain form/contact region intent");
});
