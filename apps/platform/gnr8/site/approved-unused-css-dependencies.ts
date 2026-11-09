// CHS owner approved omitting these four upstream-404 map icons on 2026-11-09.
// Consumers must also prove that the retained HTML cannot match their CSS rules.
const CHS_UNUSED_MAP_ICON_NAMES = [
  'geocoder.png',
  'layers-2x.png',
  'layers.png',
  'throbber.gif',
] as const

export function approvedUnusedCssDependencies(sourceUrl: string, ownershipSiteId: string | undefined): string[] {
  if (ownershipSiteId !== '9ff5613e-1625-43f1-844e-c5c91a813d4f') return []
  let source: URL
  try {
    source = new URL(sourceUrl)
    if (source.hostname.replace(/^www\./, '') !== 'chs.si') return []
  } catch { return [] }
  return CHS_UNUSED_MAP_ICON_NAMES.flatMap((name) => [
    `https://site-assets.cdnmns.com/4461fb153de0bd0ff5b12a5c05bd5a61/css/images/${name}`,
    new URL(`/assets/stylesheet/images/${name}`, source).toString(),
  ])
}
