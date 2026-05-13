import { getRawImportedSiteArtifact, getRawTemplateSiteAsset, resolveDomainSiteVersionForHost } from './gnr8/runtime/runtime-store'

function extractRefs(html: string) {
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  const cssHrefs = linkTags.map((node) => node.match(/href=(['"])(.*?)\1/i)?.[2] ?? null).filter((v): v is string => Boolean(v)).filter((href) => /\.css(\?|#|$)/i.test(href))
  const scripts = [...html.matchAll(/<script\b[^>]*src=(['"])(.*?)\1[^>]*>/gi)].map((m) => m[2])
  const bodyClass = (html.match(/<body\b[^>]*class=(['"])(.*?)\1/i)?.[2] ?? null)
  const htmlClass = (html.match(/<html\b[^>]*class=(['"])(.*?)\1/i)?.[2] ?? null)
  const scrollIconNode = html.match(/<a\b[^>]*data-req=(['"])scrollTop\1[^>]*>/i)?.[0] ?? null
  return { cssHrefs, scripts, bodyClass, htmlClass, scrollIconNode }
}

async function inspectHost(host: string, label: string) {
  const resolved = await resolveDomainSiteVersionForHost({ host })
  if (resolved.outcome !== 'domain_hit') {
    console.log(JSON.stringify({ label, host, error: 'domain_not_hit', resolved }, null, 2))
    return
  }
  const siteVersionId = resolved.siteVersionId
  const artifact = await getRawImportedSiteArtifact(siteVersionId)
  if (!artifact) {
    console.log(JSON.stringify({ label, host, siteVersionId, error: 'raw_imported_artifact_missing' }, null, 2))
    return
  }
  const entry = await getRawTemplateSiteAsset({ siteVersionId, artifactId: artifact.id, filePath: artifact.entryHtmlPath })
  const html = entry?.bytes?.toString('utf8') ?? ''
  const refs = extractRefs(html)

  const styleAssetChecks: Array<{href:string, normalized:string|null, exists:boolean}> = []
  for (const href of refs.cssHrefs) {
    const normalized = href.replace(/^\/+/, '').split(/[?#]/,1)[0] || null
    if (!normalized) {
      styleAssetChecks.push({ href, normalized, exists: false })
      continue
    }
    const row = await getRawTemplateSiteAsset({ siteVersionId, artifactId: artifact.id, filePath: normalized })
    styleAssetChecks.push({ href, normalized, exists: Boolean(row) })
  }

  const summary = {
    label,
    host,
    siteId: resolved.siteId,
    siteVersionId,
    artifactId: artifact.id,
    entryHtmlPath: artifact.entryHtmlPath,
    assetBasePath: artifact.assetBasePath,
    fileMapCount: Object.keys(artifact.fileMap).length,
    refs,
    styleAssetChecks,
  }
  console.log(JSON.stringify(summary, null, 2))
}

async function main() {
  await inspectHost(process.argv[2] ?? 'maver.app.pasadenagenerator.com', 'maver')
  await inspectHost(process.argv[3] ?? 'roboplast.app.pasadenagenerator.com', 'roboplast')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
