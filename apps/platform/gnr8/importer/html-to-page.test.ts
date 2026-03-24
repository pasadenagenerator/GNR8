import assert from "node:assert/strict";
import test from "node:test";

import { fixtureHeavyNavHtml } from "@/gnr8/migration/layout-graph/layout-graph-test-fixtures";

import { importHtmlToPage } from "./html-to-page";

test("importHtmlToPage routes snapshot through layout graph before semantic detection", () => {
  const page = importHtmlToPage({
    slug: "/",
    html: fixtureHeavyNavHtml,
  });

  assert.ok(page.sections.length >= 2);
  const hero = page.sections.find((s) => s.type === "hero.split");
  assert.ok(hero, "hero should be detected from the actual hero block");
  assert.notEqual((hero?.props as { headline?: string } | undefined)?.headline, "Menu");
});
