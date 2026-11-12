import { parse, serialize } from 'parse5'

export type SiteImportContentOptions = {
  omitCookies?: boolean
  omitBackToTop?: boolean
  omitAccessibility?: boolean
  omitSearch?: boolean
  omitForms?: boolean
  lazyLoadImages?: boolean
}

type Node = { nodeName: string; tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: Node[] }

const analytics = /(?:google-analytics\.com|googletagmanager\.com|analytics\.google\.com|connect\.facebook\.net|\bfbq\s*\(|hotjar\.com|clarity\.ms|matomo\.|plausible\.io\/js|\bgtag\s*\(|\bga\s*\()/i
export const isTrackingReference = (value: string | null | undefined): boolean => analytics.test(String(value ?? ''))
const cookieUi = /(?:cookie[-_ ]?(?:banner|consent|notice|settings|popup)|(?:onetrust|cookiebot))/i
const backToTop = /(?:back[-_ ]?to[-_ ]?top|scroll[-_ ]?to[-_ ]?top|to[-_ ]?top)/i
const accessibilityUi = /(?:accessibility[-_ ]?(?:widget|toolbar|menu)|userway|accessibe|yaccessibility)/i
const searchUi = /(?:search[-_ ]?(?:form|widget|box|toggle|icon)|(?:^|\s)search(?:\s|$))/i

function attr(node: Node, name: string): string {
  return node.attrs?.find((entry) => entry.name.toLowerCase() === name)?.value ?? ''
}

function hasSearchInput(node: Node): boolean {
  if (node.tagName === 'input' && (attr(node, 'type').toLowerCase() === 'search' || /^(?:s|q|query|search)$/i.test(attr(node, 'name')))) return true
  return node.childNodes?.some(hasSearchInput) ?? false
}

function stripNodes(parent: Node, options: SiteImportContentOptions): void {
  if (!parent.childNodes) return
  parent.childNodes = parent.childNodes.filter((node) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    const source = `${attr(node, 'src')} ${attr(node, 'href')}`
    const name = `${attr(node, 'id')} ${attr(node, 'class')} ${attr(node, 'aria-label')} ${attr(node, 'role')} ${source}`
    if (tag === 'script' && (analytics.test(source) || analytics.test(node.childNodes?.map((child) => (child as Node & { value?: string }).value ?? '').join('') ?? ''))) return false
    if (['iframe', 'img', 'link'].includes(tag) && analytics.test(source)) return false
    if (options.omitCookies && cookieUi.test(name)) return false
    if (options.omitBackToTop && backToTop.test(name)) return false
    if (options.omitAccessibility && accessibilityUi.test(name)) return false
    if (options.omitSearch && (searchUi.test(name) || (tag === 'form' && hasSearchInput(node)))) return false
    if (options.omitForms && tag === 'form') return false
    if (options.lazyLoadImages === false && (tag === 'img' || tag === 'iframe')) {
      node.attrs = node.attrs?.filter((entry) => !(entry.name.toLowerCase() === 'loading' && entry.value.toLowerCase() === 'lazy'))
    }
    stripNodes(node, options)
    return true
  })
}

export function cleanImportedHtml(html: string, options: SiteImportContentOptions = {}): string {
  if (!analytics.test(html) &&
    !(options.omitCookies && cookieUi.test(html)) &&
    !(options.omitBackToTop && backToTop.test(html)) &&
    !(options.omitAccessibility && accessibilityUi.test(html)) &&
    !(options.omitSearch && searchUi.test(html)) &&
    !(options.omitForms && /<form\b/i.test(html)) &&
    options.lazyLoadImages !== false) return html
  const document = parse(html) as Node
  stripNodes(document, options)
  return serialize(document as any)
}
