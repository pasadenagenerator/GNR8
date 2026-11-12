import type { ComputedStyleSample } from '@/gnr8/import-rendered-capture'
import type { StyleSignalModel } from '@/gnr8/style-signals/style-signal-model'
import type { UrlImportFetchManifestEntry } from '@/gnr8/validation/runtime/url-single-page-import'

export type BrandStyleKit = {
  format: 'gnr8-brand-style-kit:v1'
  status: 'candidate_requires_review'
  sourceUrl: string
  evidence: { styleSource: StyleSignalModel['sourceMode']; computedSampleCount: number }
  logos: Array<{ sourceUrl: string; localPath: string }>
  colors: { primary: string | null; secondary: string | null; cta: string | null; neutrals: string[] }
  typography: { headingFamily: string | null; bodyFamily: string | null; headingSize: string | null; bodySize: string | null }
  button: { background: string | null; color: string | null; radius: string | null; paddingBlock: string | null; paddingInline: string | null }
  spacing: { section: string | null }
  animation: { status: 'not_sampled' }
}

const color = (value: string | null | undefined): string | null => {
  const text = String(value ?? '').trim()
  return /^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i.test(text) ? text : null
}
const length = (value: string | null | undefined): string | null => {
  const text = String(value ?? '').trim()
  return /^(?:0|\d+(?:\.\d+)?(?:px|rem|em))$/i.test(text) ? text : null
}
const family = (value: string | null | undefined): string | null => {
  const text = String(value ?? '').trim()
  return text && !/[;{}<>\n\r]/.test(text) ? text : null
}

export function buildBrandStyleKit(input: {
  sourceUrl: string
  signals: StyleSignalModel
  samples: ComputedStyleSample[]
  assets: UrlImportFetchManifestEntry[]
}): BrandStyleKit {
  const sample = (target: ComputedStyleSample['target']) => input.samples.find((item) => item.target === target)?.styles
  const button = sample('primary_cta')
  const hero = sample('hero')
  const root = sample('root')
  const logos = input.assets.filter((asset) => asset.assetKind === 'image' && asset.fetchStatus === 'fetched' && asset.resolvedUrl && asset.localPath &&
    /(?:^|[\/_-])logo(?:[\/_\-.]|$)/i.test(`${asset.rawRef} ${asset.resolvedUrl}`))
    .map((asset) => ({ sourceUrl: asset.resolvedUrl!, localPath: asset.localPath! }))
  return {
    format: 'gnr8-brand-style-kit:v1', status: 'candidate_requires_review', sourceUrl: input.sourceUrl,
    evidence: { styleSource: input.signals.sourceMode, computedSampleCount: input.samples.length },
    logos: [...new Map(logos.map((logo) => [logo.localPath, logo])).values()],
    colors: {
      primary: color(input.signals.colors.primaryAccent),
      secondary: color(input.signals.colors.secondaryAccent),
      cta: color(input.signals.colors.ctaColorHint) ?? color(button?.backgroundColor),
      neutrals: input.signals.colors.neutralPalette.map(color).filter((value): value is string => Boolean(value)),
    },
    typography: {
      headingFamily: family(input.signals.typography.headingFontFamily),
      bodyFamily: family(input.signals.typography.bodyFontFamily),
      headingSize: length(sample('h1')?.fontSize),
      bodySize: length(sample('body_text')?.fontSize),
    },
    button: {
      background: color(button?.backgroundColor), color: color(button?.color),
      radius: length(button?.borderRadius), paddingBlock: length(button?.paddingTop), paddingInline: length(button?.paddingLeft),
    },
    spacing: { section: length(hero?.paddingTop) ?? length(root?.paddingTop) },
    animation: { status: 'not_sampled' },
  }
}

export function brandStyleKitCss(kit: BrandStyleKit): string {
  const declarations: Array<[string, string | null]> = [
    ['--brand-500', kit.colors.primary],
    ['--brand-secondary', kit.colors.secondary],
    ['--brand-cta', kit.colors.cta],
    ['--primary-family', kit.typography.bodyFamily],
    ['--secondary-family', kit.typography.headingFamily],
    ['--brand-heading-size', kit.typography.headingSize],
    ['--brand-body-size', kit.typography.bodySize],
    ['--brand-button-bg', kit.button.background],
    ['--brand-button-color', kit.button.color],
    ['--brand-button-radius', kit.button.radius],
    ['--brand-button-padding-block', kit.button.paddingBlock],
    ['--brand-button-padding-inline', kit.button.paddingInline],
    ['--brand-section-space', kit.spacing.section],
  ]
  return `/* GNR8 candidate. Review before applying in Astro/Lumos. */\n:root {\n${declarations.filter(([, value]) => value).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`
}
