import assert from "node:assert/strict";
import test from "node:test";

import { validateMigrationOutputIntegrity } from "@/gnr8/runtime/migration-output-integrity";

const validInput = {
  siteId: "site_123",
  sourceUrl: "https://example.com",
  actor: "migration:test",
  pages: [
    {
      pageId: "page_1",
      path: "/",
      title: "Home",
      structureModel: {
        sections: [{ id: "hero", type: "hero.split", order: 0 }],
      },
      contentModel: {
        sectionProps: {
          hero: { headline: "Hello" },
        },
      },
      styleTokens: {
        "color.background": "#fff",
        "color.text": "#111",
        "spacing.section": "48px",
      },
      assetGraph: [],
      semanticSignals: [{ label: "migration.initial", confidence: 0.8, source: "migration" as const }],
      source: "migration" as const,
      actor: "migration:test",
    },
  ],
};

test("migration-output-integrity accepts render-complete canonical output", () => {
  const result = validateMigrationOutputIntegrity(validInput);
  assert.equal(result.ok, true);
});

test("migration-output-integrity blocks runtime HTML blobs", () => {
  const result = validateMigrationOutputIntegrity({
    ...validInput,
    pages: [
      {
        ...validInput.pages[0],
        contentModel: {
          sectionProps: {
            hero: {
              html: "<div>bad authoritative blob</div>",
            },
          },
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.code === "AUTHORITATIVE_RUNTIME_HTML_FORBIDDEN"));
});
