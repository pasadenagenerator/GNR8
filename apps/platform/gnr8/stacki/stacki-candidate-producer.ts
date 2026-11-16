import { isReviewedLumosTextSource } from "../output-adapters/astro-export-resources";
import { convertAstroExportToInternalPreviewCandidate } from "../output-adapters/astro-static-site-internal-preview-bridge";
import { createSourceBackedAstroCandidateProducer, type ChsSourceBackedAstroCandidateProducerDependencies } from "../output-adapters/chs-astro-candidate-producer";
import { prepareAstroStaticSiteSourceWorkspace } from "../output-adapters/astro-static-site-workspace-preparation";
import { selectStackiCandidateSource } from "./stacki-candidate-source";
import { parse, type DefaultTreeAdapterMap } from 'parse5';

export const STACKI_CANDIDATE_PRODUCER = "stacki_saved_source_build_export_bridge";

/** Reuses the production build/export/inspection/cleanup path, replacing only
 * source preparation. No call to the original-page generator is made here. */
export function createStackiCandidateProducer(
  input: Parameters<typeof selectStackiCandidateSource>[0],
  dependencies: Pick<ChsSourceBackedAstroCandidateProducerDependencies, "ownedAssetFingerprints" | "ownedStylesheetEvidence"> &
    Partial<Pick<ChsSourceBackedAstroCandidateProducerDependencies, "runBuildExport" | "inspectExport" | "convertExport" | "now">>,
) {
  const selected = selectStackiCandidateSource(input);
  const reviewedTextSource=isReviewedLumosTextSource(selected.files);
  const packageFile=selected.files.find(f=>f.path==='package.json');
  if(packageFile && JSON.parse(packageFile.body.toString('utf8')).name==='lumos-for-astro' && !reviewedTextSource)throw new Error('Unreviewed Lumos executable source');
  const inputId = `stacki:${selected.binding.scope.siteVersionId}:${selected.binding.revision}:${selected.binding.sha256}`;
  const stylesheets = new Set<string>();
  function visit(node: DefaultTreeAdapterMap['node']) {
    if ('tagName' in node && node.tagName === 'link' && node.attrs.some(a => a.name === 'rel' && a.value.split(/\s+/).includes('stylesheet'))) {
      const href = node.attrs.find(a => a.name === 'href')?.value;
      if (href) stylesheets.add(href);
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  }
  selected.files.filter(file => file.path.endsWith('.astro')).forEach(file => visit(parse(file.body.toString('utf8'))));
  const producer = createSourceBackedAstroCandidateProducer({
    ...dependencies,
    ...(reviewedTextSource ? {convertExport:(conversion:Parameters<typeof convertAstroExportToInternalPreviewCandidate>[0])=>(dependencies.convertExport ?? convertAstroExportToInternalPreviewCandidate)({...conversion,reviewedSourceFiles:selected.files})} : {}),
    producerKind: STACKI_CANDIDATE_PRODUCER,
    producerVersion: "v1",
    inputId,
    embeddedImageFiles: selected.uploadedImages,
    verification: { expectedContent: [], expectedThemeToken: null, expectedStylesheetReferences: [...stylesheets],
      ...(selected.files.some(file => file.path.startsWith("src/") && file.path.endsWith(".css")) ? {
        compiledStylesheetSource: { sourcePaths: selected.files.map(file => file.path), aggregateSha256: selected.sourceSnapshot.aggregateSha256 },
      } : {}),
    },
    prepareWorkspace: async ({ workspaceRoot }) => prepareAstroStaticSiteSourceWorkspace({ files: selected.files, workspaceRoot }),
  });
  return { selected, producer, inputId };
}
