import { createHash } from 'node:crypto'
import { parse, parseFragment, serializeOuter, type DefaultTreeAdapterMap } from 'parse5'

export const CONTACT_ACTION = '/api/gnr8/runtime/contact'
export const CONTACT_LIMITS = { name: 120, email: 254, phone: 40, subject: 200, message: 5000 } as const
export type ContactField = keyof typeof CONTACT_LIMITS
export type ContactAcceptance = {
  version: 'cf7-required-permission-v1'; value: 'accepted'; statement: string
  statementSha256: string; formSha256: string; formVersion: string
}
export type ContactSchema = { fields: ContactField[]; required: ContactField[]; acceptance?: ContactAcceptance }
type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
export const contactElements = (n: Node): Element[] => ('childNodes' in n ? n.childNodes : []).flatMap(c => [...('tagName' in c ? [c] : []), ...contactElements(c)])
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value ?? ''
const has = (n: Element, key: string) => n.attrs.some(a => a.name === key)
const set = (n: Element, name: string, value: string) => { n.attrs = n.attrs.filter(a => a.name !== name); n.attrs.push({name,value}) }
const remove = (n: Element) => { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(c => c !== n) }
const append = (n: Element, html: string) => { for (const child of parseFragment(html).childNodes) { child.parentNode = n; n.childNodes.push(child) } }
const fieldMap: Record<string, ContactField> = { 'your-name': 'name', 'your-email': 'email', 'your-phone': 'phone', 'your-subject': 'subject', 'your-message': 'message' }
const wpHidden = new Set(['_wpcf7', '_wpcf7_version', '_wpcf7_locale', '_wpcf7_unit_tag', '_wpcf7_container_post'])

const text = (n: Node): string => 'value' in n ? n.value : 'childNodes' in n ? n.childNodes.map(text).join('') : ''
const cls = (n: Node | null, name: string): n is Element => !!n && 'tagName' in n && attr(n,'class').split(/\s+/).includes(name)
const sha = (value: string) => createHash('sha256').update(value,'utf8').digest('hex')

/** Stable through Astro's scope attributes/indentation, but sensitive to the whole
 * form (including explanatory copy). A stale browser cannot affirm new copy. */
function contactFormVersion(form: Element): string {
  const clone = parseFragment(serializeOuter(form))
  const nodes = contactElements(clone)
  for (const node of nodes) {
    node.attrs = node.attrs.filter(a => !/^data-astro-cid-[a-z0-9]+$/.test(a.name))
    if (!['textarea','pre','code'].includes(node.tagName)) node.childNodes = node.childNodes.filter(n => n.nodeName !== '#text' || !!text(n).trim())
    if (node.tagName === 'input' && attr(node,'name') === 'formVersion') remove(node)
  }
  return sha(serializeOuter(nodes.find(n => n.tagName === 'form')!))
}

/** Observed CF7 required permission checkbox, not arbitrary checkbox support.
 * Its original name and full wrapper shape are part of this supported format.
 * Legal text is read verbatim from the source, never a site-specific constant. */
function permissionStatement(node: Element, generated: boolean): string | null {
  if (node.tagName !== 'input' || attr(node,'type') !== 'checkbox' ||
    attr(node,'name') !== (generated ? 'acceptance' : 'dovoljenje[]') ||
    ['checked','disabled','readonly'].some(key => has(node,key))) return null
  const label = node.parentNode
  if (!label || !('tagName' in label) || label.tagName !== 'label') return null
  if (label.childNodes.some(n => n.nodeName === '#text' && text(n).trim())) return null
  const children = label.childNodes.filter((n): n is Element => 'tagName' in n)
  if (children.length !== 2 || children[0] !== node || !cls(children[1]!, 'wpcf7-list-item-label') ||
    children[1]!.childNodes.some(n => n.nodeName !== '#text')) return null
  const item = label.parentNode
  if (!cls(item,'wpcf7-list-item') || !cls(item,'first') || !cls(item,'last')) return null
  const group = item.parentNode
  if (!cls(group,'wpcf7-checkbox') || !cls(group,'wpcf7-validates-as-required')) return null
  const wrap = group.parentNode
  if (!cls(wrap,'wpcf7-form-control-wrap') || !cls(wrap,'dovoljenje') ||
    contactElements(wrap).filter(n => ['input','textarea','select','button'].includes(n.tagName)).length !== 1) return null
  const statement = text(children[1]!)
  if (!statement.trim() || statement.length > 2000 || /[\x00-\x1f\x7f]/.test(statement)) return null
  if (generated ? attr(node,'value') !== 'accepted' || !has(node,'required') || attr(node,'data-gnr8-acceptance') !== 'cf7-required-permission-v1' : attr(node,'value') !== statement) return null
  return statement
}

/** Intentionally narrow: ordinary CF7 contact only. Inspect everything before
 * mutating; only the proven single required CF7 permission structure is accepted. */
export function replaceSupportedContactForm(form: Element, pagePath: string): boolean {
  if (!attr(form,'class').split(/\s+/).includes('wpcf7-form') || attr(form,'method').toLowerCase() !== 'post') return false
  const nodes = contactElements(form)
  if (nodes.some(n => ['form','iframe','object','embed','script','select','button'].includes(n.tagName))) return false
  if ([form,...nodes].some(n => n.attrs.some(a => /^on/i.test(a.name) || ['form','formaction','formtarget','formmethod','formenctype','formnovalidate'].includes(a.name)))) return false
  const controls = nodes.filter(n => ['input','textarea'].includes(n.tagName))
  const fields: Array<{node: Element; field: ContactField; required: boolean}> = []
  let submits = 0
  let permission: Element | null = null
  const names = new Set<string>()
  for (const node of controls) {
    const type = attr(node,'type') || 'text', name = attr(node,'name')
    if (name && names.has(name)) return false
    names.add(name)
    if (type === 'checkbox') {
      if (permission || !permissionStatement(node,false)) return false
      permission = node
      continue
    }
    if (node.tagName === 'input' && type === 'hidden' && wpHidden.has(name)) continue
    if (node.tagName === 'input' && type === 'submit' && !name) { submits++; continue }
    const field = Object.hasOwn(fieldMap,name) ? fieldMap[name] : undefined
    if (!field || has(node,'disabled') || has(node,'readonly') || fields.some(f => f.field === field)) return false
    if (field === 'message' ? node.tagName !== 'textarea' : node.tagName !== 'input' || type !== (field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text')) return false
    // Phone and subject are supported only when optional; source obligations stay intact.
    const required = has(node,'required') || attr(node,'aria-required') === 'true' || attr(node,'class').split(/\s+/).includes('wpcf7-validates-as-required')
    if ((field === 'phone' || field === 'subject') && required) return false
    const hasLabel = nodes.some(n => n.tagName === 'label' && ((attr(n,'for') && attr(n,'for') === attr(node,'id')) || contactElements(n).includes(node)))
    if (!hasLabel && !attr(node,'aria-label') && !attr(node,'placeholder')) return false
    fields.push({node,field,required})
  }
  if (submits !== 1 || !['name','email','message'].every(key => fields.some(f => f.field === key)) || !fields.filter(f => ['name','email'].includes(f.field)).every(f => f.required)) return false
  form.attrs = form.attrs.filter(a => !['novalidate','action','target','enctype','data-status'].includes(a.name))
  set(form,'action',`${CONTACT_ACTION}?path=${encodeURIComponent(pagePath)}`)
  set(form,'data-gnr8-contact','v1')
  for (const node of controls) {
    if (attr(node,'type') === 'hidden') remove(node)
    node.attrs = node.attrs.filter(a => !['formaction','formtarget','formmethod','formenctype','formnovalidate'].includes(a.name))
  }
  for (const {node,field,required} of fields) {
    set(node,'name',field); set(node,'maxlength',String(CONTACT_LIMITS[field]))
    if (!attr(node,'aria-label') && attr(node,'placeholder')) set(node,'aria-label',attr(node,'placeholder'))
    if (required) set(node,'required','')
    if (field !== 'message' && field !== 'subject') set(node,'autocomplete',field === 'phone' ? 'tel' : field)
  }
  if (permission) {
    set(permission,'name','acceptance'); set(permission,'value','accepted'); set(permission,'required','')
    set(permission,'aria-required','true'); set(permission,'data-gnr8-acceptance','cf7-required-permission-v1')
  }
  for (const node of nodes.filter(n => attr(n,'class').split(/\s+/).includes('wpcf7-response-output'))) remove(node)
  append(form,'<div hidden aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="requestId" value=""><p data-gnr8-contact-status role="status" aria-live="polite"></p>')
  if (permission) append(form,`<input type="hidden" name="formVersion" value="${contactFormVersion(form)}">`)
  return true
}

/** Read server-owned generated HTML, never schema or destination from a POST. */
export function readContactSchema(html: string): ContactSchema | null {
  const forms = contactElements(parse(html)).filter(n => n.tagName === 'form' && attr(n,'data-gnr8-contact') === 'v1')
  if (forms.length !== 1) return null
  const allControls = contactElements(forms[0]!).filter(n => ['input','textarea','select','button'].includes(n.tagName))
  const names = allControls.map(n => attr(n,'name')).filter(Boolean)
  if (new Set(names).size !== names.length || names.some(name => !Object.hasOwn(CONTACT_LIMITS,name) && !['acceptance','website','requestId','formVersion'].includes(name))) return null
  const permissions = allControls.filter(n => attr(n,'name') === 'acceptance' || attr(n,'type') === 'checkbox')
  if (permissions.length > 1) return null
  const statement = permissions.length ? permissionStatement(permissions[0]!,true) : null
  if (permissions.length && !statement) return null
  const versionControl = allControls.find(n => attr(n,'name') === 'formVersion')
  const formVersion = statement ? contactFormVersion(forms[0]!) : undefined
  if (statement ? !versionControl || attr(versionControl,'type') !== 'hidden' || attr(versionControl,'value') !== formVersion : !!versionControl) return null
  const controls = allControls.filter(n => ['input','textarea'].includes(n.tagName) && Object.hasOwn(CONTACT_LIMITS,attr(n,'name')))
  if (controls.some(n => attr(n,'name') === 'message' ? n.tagName !== 'textarea' : n.tagName !== 'input' || (attr(n,'type') || 'text') !== (attr(n,'name') === 'email' ? 'email' : attr(n,'name') === 'phone' ? 'tel' : 'text'))) return null
  const fields = controls.map(n => attr(n,'name') as ContactField), required = controls.filter(n => has(n,'required')).map(n => attr(n,'name') as ContactField)
  if (new Set(fields).size !== fields.length || !['name','email','message'].every(field => fields.includes(field as ContactField)) || !required.includes('name') || !required.includes('email') || required.includes('phone') || required.includes('subject')) return null
  return { fields, required, ...(statement ? {acceptance:{version:'cf7-required-permission-v1' as const,value:'accepted' as const,statement,statementSha256:sha(statement),formSha256:sha(serializeOuter(forms[0]!)),formVersion:formVersion!}} : {}) }
}
