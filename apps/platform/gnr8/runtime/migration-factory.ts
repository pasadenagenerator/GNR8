import type { Gnr8Page } from "@/gnr8/types/page";

import { deterministicId, normalizePagePath } from "@/gnr8/runtime/deterministic";
import { validateMigrationOutputIntegrity } from "@/gnr8/runtime/migration-output-integrity";
import { createSiteVersionFromMigration } from "@/gnr8/runtime/runtime-store";
import { RENDERER_COMPATIBILITY_VERSION } from "@/gnr8/runtime/types";

function baselineStyleTokens(): Record<string, string> {
  return {
    "color.background": "#ffffff",
    "color.text": "#111111",
    "spacing.section": "48px",
  };
}

function resolveSiteId(sourceUrl: string, pagePath: string): string {
  const testPrefix = String(process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX ?? "").trim();
  const seed = sourceUrl || pagePath;
  if (testPrefix) return deterministicId(testPrefix, seed);
  return deterministicId("site", seed);
}

export function buildCanonicalMigrationInput(input: { sourceUrl: string; page: Gnr8Page; actor: string }) {
  const sourceUrl = String(input.sourceUrl ?? "").trim();
  const pagePath = normalizePagePath(input.page.slug || "/");
  const siteId = resolveSiteId(sourceUrl, pagePath);
  const pageId = deterministicId("page", `${siteId}:${pagePath}`);

  const sections = Array.isArray(input.page.sections) ? input.page.sections : [];

  const candidate = {
    siteId,
    sourceUrl,
    actor: input.actor,
    pages: [
      {
        pageId,
        path: pagePath,
        title: input.page.title ?? null,
        structureModel: {
          sections: sections.map((section, index) => ({
            id: String(section.id ?? `section-${index + 1}`),
            type: String(section.type ?? "legacy.html"),
            order: index,
          })),
        },
        contentModel: {
          sectionProps: Object.fromEntries(
            sections.map((section, index) => [
              String(section.id ?? `section-${index + 1}`),
              typeof section.props === "object" && section.props ? section.props : {},
            ]),
          ),
        },
        styleTokens: baselineStyleTokens(),
        assetGraph: [],
        semanticSignals: [
          {
            label: "migration.initial",
            confidence: 0.7,
            source: "migration" as const,
          },
        ],
        source: "migration" as const,
        actor: input.actor,
      },
    ],
  };

  const integrity = validateMigrationOutputIntegrity(candidate);
  if (!integrity.ok) {
    const message = integrity.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; ");
    throw new Error(`migration-output-integrity failed: ${message}`);
  }

  return candidate;
}

export async function migrateImportedPageToCanonicalDraft(input: { sourceUrl: string; page: Gnr8Page; actor: string }) {
  const canonicalInput = buildCanonicalMigrationInput(input);
  return createSiteVersionFromMigration({
    ...canonicalInput,
    rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
  });
}
