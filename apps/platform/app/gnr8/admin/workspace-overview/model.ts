import { createImportManifest } from "@/gnr8/import/import-manifest";
import { importStaticSite } from "@/gnr8/import/runtime/import-static-site";
import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { InMemoryTwinStore } from "@/gnr8/runtime/twin/twin-store";
import { createTwinOverview } from "@/gnr8/runtime/twin/twin-viewer";
import { readValidationFixtureSpec, validationFixtureDirAbs } from "@/gnr8/validation/runtime/fixture-spec";

export const WORKSPACE_OVERVIEW_FIXTURE_ID = "real-site-01" as const;

function toTwinIdentityFromImport(input: {
  fixtureId: string;
  inputSpecSha256: string;
  inputContentSha256: string;
  requestId: string;
}) {
  const shortSpecHash = input.inputSpecSha256.slice(0, 12);
  const shortContentHash = input.inputContentSha256.slice(0, 12);

  return {
    siteId: `site_${input.fixtureId}_${shortSpecHash}`,
    siteVersionId: `site_version_${input.fixtureId}_${shortContentHash}`,
    workspaceId: "workspace_website_os_runtime_overview",
    sourceImportId: `import_${input.fixtureId}_${shortSpecHash}`,
    requestId: input.requestId,
  };
}

export async function buildWorkspaceOverviewModel() {
  const fixture = readValidationFixtureSpec(WORKSPACE_OVERVIEW_FIXTURE_ID);
  const fixtureRootDirAbs = validationFixtureDirAbs(WORKSPACE_OVERVIEW_FIXTURE_ID);
  const requestId = `workspace-overview-${WORKSPACE_OVERVIEW_FIXTURE_ID}`;

  const importOutput = await importStaticSite({
    rootDir: fixtureRootDirAbs,
    requestId,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: fixture.entryHtmlPath,
      ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
    },
  });

  const importManifest = createImportManifest(importOutput);
  const twinIdentity = toTwinIdentityFromImport({
    fixtureId: fixture.fixtureId,
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
    fixtureId: fixture.fixtureId,
    overview,
    diagnostics,
  };
}
