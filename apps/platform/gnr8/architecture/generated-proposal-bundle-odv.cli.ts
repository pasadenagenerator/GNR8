import {
  buildGeneratedProposalBundleArtifactFromDirectory,
  loadGeneratedProposalBundleByIteration,
  persistGeneratedProposalBundle,
  resolveGeneratedProposalBundleAsset,
  type GeneratedProposalBundleIteration,
} from "./generated-proposal-bundle-persistence";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const DRY_RUN_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l";

const BUNDLES: Array<{
  iteration: GeneratedProposalBundleIteration;
  rootDirectory: string;
  generatedWebsiteProposalId: string;
  generatedWebsiteProposalArtifactId: string;
  outputBundleId: string;
}> = [
  {
    iteration: 1,
    rootDirectory: "ODV_GENERATED_PROPOSAL_001",
    generatedWebsiteProposalId: "generated-website-proposal:ODV_GENERATED_PROPOSAL_001",
    generatedWebsiteProposalArtifactId: "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3",
    outputBundleId: "ODV_GENERATED_PROPOSAL_001",
  },
  {
    iteration: 2,
    rootDirectory: "ODV_GENERATED_PROPOSAL_002",
    generatedWebsiteProposalId: "generated-website-proposal:ODV_GENERATED_PROPOSAL_002",
    generatedWebsiteProposalArtifactId: "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
    outputBundleId: "ODV_GENERATED_PROPOSAL_002",
  },
];

async function main() {
  const importedAt = new Date().toISOString();
  const results = [];
  for (const bundle of BUNDLES) {
    const artifact = await buildGeneratedProposalBundleArtifactFromDirectory({
      rootDirectory: bundle.rootDirectory,
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      iteration: bundle.iteration,
      generatedWebsiteProposalId: bundle.generatedWebsiteProposalId,
      generatedWebsiteProposalArtifactId: bundle.generatedWebsiteProposalArtifactId,
      outputBundleId: bundle.outputBundleId,
      bundleLabel: bundle.outputBundleId,
      sourceStorageReference: `repo://${bundle.rootDirectory}`,
      importedAt,
    });
    const reference = await persistGeneratedProposalBundle({
      siteVersionId: SITE_VERSION_ID,
      artifact,
    });
    const reloaded = await loadGeneratedProposalBundleByIteration({
      siteVersionId: SITE_VERSION_ID,
      iteration: bundle.iteration,
    });
    if (!reloaded) throw new Error(`Generated Proposal Bundle reload failed for iteration ${bundle.iteration}`);
    const entry = resolveGeneratedProposalBundleAsset({ artifact: reloaded });
    const css = resolveGeneratedProposalBundleAsset({ artifact: reloaded, assetPathSegments: ["source", "styles.css"] });
    const js = resolveGeneratedProposalBundleAsset({ artifact: reloaded, assetPathSegments: ["source", "script.js"] });
    results.push({
      iteration: bundle.iteration,
      artifactId: reference.artifactId,
      outputBundleId: reference.outputBundleId,
      bundleSha256: reference.bundleSha256,
      assetCount: reference.assetCount,
      byteSize: reference.byteSize,
      entry: entry.relativePath,
      css: css.relativePath,
      js: js.relativePath,
      previewSource: "persisted_generated_proposal_bundle",
    });
  }
  console.log(JSON.stringify({ ok: true, siteVersionId: SITE_VERSION_ID, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
