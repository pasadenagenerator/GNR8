import fs from "node:fs/promises";
import path from "node:path";
import { createImportManifest } from "@/gnr8/import/import-manifest";
import { importStaticSite } from "@/gnr8/import/runtime/import-static-site";
import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { InMemoryTwinStore } from "@/gnr8/runtime/twin/twin-store";
import { createTwinOverview } from "@/gnr8/runtime/twin/twin-viewer";

const DEFAULT_IMPORT_SNAPSHOTS_ROOT = path.resolve(
  process.cwd(),
  "apps/platform/gnr8/validation/.out/url-import-snapshots",
);
const DEFAULT_BETA_RUNS_ROOT = path.resolve(process.cwd(), "apps/platform/gnr8/validation/beta-runs");

function countSemanticSections(html: string): number {
  const matches = html.match(/<(section|main|article|nav|aside)\b/gi);
  return matches ? matches.length : 0;
}

function extractDetectedTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return "unknown";
  const title = titleMatch[1]?.replace(/\s+/g, " ").trim();
  return title && title.length > 0 ? title : "unknown";
}

function toSourceEvidenceSummary(input: {
  importManifest: ReturnType<typeof createImportManifest>;
  importOutput: Awaited<ReturnType<typeof importStaticSite>>;
}) {
  const pageCount = input.importManifest.dom.documentCount;
  const sectionCount = input.importOutput.rawDomSnapshot.documents.reduce(
    (sum, document) => sum + countSemanticSections(document.text),
    0,
  );
  const assetCount = input.importManifest.assets.totalAssets;
  const detectedTitle = extractDetectedTitle(input.importOutput.rawDomSnapshot.documents[0]?.text ?? "");
  const detectedHomepagePath = input.importManifest.entryHtmlPath ?? "unknown";

  return {
    pageCount,
    sectionCount,
    assetCount,
    detectedTitle,
    detectedHomepagePath,
    providerStateSummary: "preview/runtime-only",
  } as const;
}

function toTwinIdentityFromImport(input: {
  sourceId: string;
  inputSpecSha256: string;
  inputContentSha256: string;
  requestId: string;
}) {
  const shortSpecHash = input.inputSpecSha256.slice(0, 12);
  const shortContentHash = input.inputContentSha256.slice(0, 12);

  return {
    siteId: `site_${input.sourceId}_${shortSpecHash}`,
    siteVersionId: `site_version_${input.sourceId}_${shortContentHash}`,
    workspaceId: "workspace_website_os_runtime_overview",
    sourceImportId: `import_${input.sourceId}_${shortSpecHash}`,
    requestId: input.requestId,
  };
}

type ImportedSnapshotSelection = {
  snapshotId: string;
  snapshotRootDirAbs: string;
  source: "stable_validation_artifact" | "latest_imported_snapshot";
};

export async function resolveImportedSnapshot(input?: {
  snapshotsRootDirAbs?: string;
  betaRunsRootDirAbs?: string;
}): Promise<ImportedSnapshotSelection | null> {
  const snapshotsRootDirAbs = input?.snapshotsRootDirAbs ?? DEFAULT_IMPORT_SNAPSHOTS_ROOT;
  const betaRunsRootDirAbs = input?.betaRunsRootDirAbs ?? DEFAULT_BETA_RUNS_ROOT;

  const stableSnapshotId = await (async () => {
    try {
      const betaRunDirs = await fs.readdir(betaRunsRootDirAbs, { withFileTypes: true });
      for (const dirent of betaRunDirs) {
        if (!dirent.isDirectory()) continue;
        const summaryPath = path.join(betaRunsRootDirAbs, dirent.name, "beta-migration-summary.json");
        try {
          const parsed = JSON.parse(await fs.readFile(summaryPath, "utf8")) as {
            previewStatus?: string;
            simulationStatus?: string;
            snapshotKey?: string;
          };
          const snapshotKey = String(parsed.snapshotKey ?? "").trim();
          if (snapshotKey.startsWith("imported-url-site-") && parsed.previewStatus === "passed" && parsed.simulationStatus === "executed") {
            return snapshotKey;
          }
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  if (stableSnapshotId) {
    const stableRoot = path.join(snapshotsRootDirAbs, stableSnapshotId);
    try {
      await fs.access(path.join(stableRoot, "index.html"));
      return {
        snapshotId: stableSnapshotId,
        snapshotRootDirAbs: stableRoot,
        source: "stable_validation_artifact",
      };
    } catch {
      // fall through to latest snapshot fallback
    }
  }

  try {
    const dirEntries = await fs.readdir(snapshotsRootDirAbs, { withFileTypes: true });
    const snapshots = await Promise.all(
      dirEntries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("imported-url-site-"))
        .map(async (entry) => {
          const snapshotRootDirAbs = path.join(snapshotsRootDirAbs, entry.name);
          const stat = await fs.stat(snapshotRootDirAbs);
          return { snapshotId: entry.name, snapshotRootDirAbs, mtimeMs: stat.mtimeMs };
        }),
    );
    const sortedByNewest = snapshots.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const snapshot of sortedByNewest) {
      try {
        await fs.access(path.join(snapshot.snapshotRootDirAbs, "index.html"));
        return {
          snapshotId: snapshot.snapshotId,
          snapshotRootDirAbs: snapshot.snapshotRootDirAbs,
          source: "latest_imported_snapshot",
        };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function buildWorkspaceOverviewModel(input?: {
  snapshotsRootDirAbs?: string;
  betaRunsRootDirAbs?: string;
}) {
  const selectedSnapshot = await resolveImportedSnapshot(input);

  if (!selectedSnapshot) {
    const nowIso = new Date().toISOString();
    return {
      sourceId: null,
      sourcePath: null,
      sourceKind: "missing_imported_snapshot" as const,
      overview: {
        twinId: "twin_missing_import",
        siteId: "site_missing_import",
        siteVersionId: "site_version_missing_import",
        workspaceId: "workspace_website_os_runtime_overview",
        environmentScope: "preview",
        status: "failed" as const,
        contentSummary: "No imported site available.",
        designSummary: "No imported site available.",
        experienceSummary: "No imported site available.",
        governanceSummary: "No imported site available.",
        operationalSummary: "No imported site available.",
        lastUpdated: nowIso,
        diagnostics: [],
      },
      diagnostics: ["WORKSPACE_OVERVIEW_NO_IMPORTED_SITE_AVAILABLE"],
    };
  }

  const requestId = `workspace-overview-${selectedSnapshot.snapshotId}`;

  const importOutput = await importStaticSite({
    rootDir: selectedSnapshot.snapshotRootDirAbs,
    requestId,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "index.html",
      assetsDirPath: "assets",
    },
  });

  const importManifest = createImportManifest(importOutput);
  const twinIdentity = toTwinIdentityFromImport({
    sourceId: selectedSnapshot.snapshotId,
    inputSpecSha256: importManifest.fingerprints.inputSpecSha256,
    inputContentSha256: importManifest.fingerprints.inputContentSha256,
    requestId,
  });

  const twin = buildWebsiteDigitalTwin({
    siteId: twinIdentity.siteId,
    siteVersionId: twinIdentity.siteVersionId,
    workspaceId: twinIdentity.workspaceId,
    environmentScope: "preview",
    sourceImportId: twinIdentity.sourceImportId,
    sourceModels: ["import_manifest", "raw_dom_snapshot", "asset_registry", "import_diagnostics"],
    sourceEvidenceSummary: toSourceEvidenceSummary({
      importManifest,
      importOutput,
    }),
    generatedBy: "workspace_overview_runtime_v0",
  });

  const store = new InMemoryTwinStore();
  store.saveTwin(twin);

  const storedTwin = store.getTwinBySiteVersion(twinIdentity.siteVersionId);
  if (!storedTwin) {
    throw new Error("WORKSPACE_OVERVIEW_RUNTIME_INVARIANT: stored twin missing for site version");
  }

  const overview = createTwinOverview(storedTwin);
  const diagnostics = [...storedTwin.diagnostics, ...storedTwin.metadata.diagnostics, ...store.diagnostics, ...overview.diagnostics];

  return {
    sourceId: selectedSnapshot.snapshotId,
    sourcePath: selectedSnapshot.snapshotRootDirAbs,
    sourceKind: selectedSnapshot.source,
    overview,
    diagnostics,
  };
}
