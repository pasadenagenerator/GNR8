import { parse, parseFragment, type DefaultTreeAdapterMap } from 'parse5'

export const CONTACT_ACTION = '/api/gnr8/runtime/contact'
export const CONTACT_LIMITS = { name: 120, email: 254, phone: 40, message: 5000 } as const
export type ContactField = keyof typeof CONTACT_LIMITS
export type ContactSchema = { fields: ContactField[]; required: ContactField[] }
type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
export const contactElements = (n: Node): Element[] => ('childNodes' in n ? n.childNodes : []).flatMap(c => [...('tagName' in c ? [c] : []), ...contactElements(c)])
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value ?? ''
const has = (n: Element, key: string) => n.attrs.some(a => a.name === key)
const set = (n: Element, name: string, value: string) => { n.attrs = n.attrs.filter(a => a.name !== name); n.attrs.push({name,value}) }
const remove = (n: Element) => { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(c => c !== n) }
const append = (n: Element, html: string) => { for (const child of parseFragment(html).childNodes) { child.parentNode = n; n.childNodes.push(child) } }
const fieldMap: Record<string, ContactField> = { 'your-name': 'name', 'your-email': 'email', 'your-phone': 'phone', 'your-message': 'message' }
const wpHidden = new Set(['_wpcf7', '_wpcf7_version', '_wpcf7_locale', '_wpcf7_unit_tag', '_wpcf7_container_post'])

/** Intentionally narrow: ordinary CF7 contact only. Inspect everything before
 * mutating; subject, consent, files, bookings, newsletter and unknown fields fail. */
export function replaceSupportedContactForm(form: Element, pagePath: string): boolean {
  if (!attr(form,'class').split(/\s+/).includes('wpcf7-form') || attr(form,'method').toLowerCase() !== 'post') return false
  const nodes = contactElements(form)
  if (nodes.some(n => ['form','iframe','object','embed','script','select','button'].includes(n.tagName))) return false
  if ([form,...nodes].some(n => n.attrs.some(a => /^on/i.test(a.name) || ['form','formaction','formtarget','formmethod','formenctype','formnovalidate'].includes(a.name)))) return false
  const controls = nodes.filter(n => ['input','textarea'].includes(n.tagName))
  const fields: Array<{node: Element; field: ContactField; required: boolean}> = []
  let submits = 0
  for (const node of controls) {
    const type = attr(node,'type') || 'text', name = attr(node,'name')
    if (node.tagName === 'input' && type === 'hidden' && wpHidden.has(name)) continue
    if (node.tagName === 'input' && type === 'submit' && !name) { submits++; continue }
    const field = Object.hasOwn(fieldMap,name) ? fieldMap[name] : undefined
    if (!field || has(node,'disabled') || has(node,'readonly') || fields.some(f => f.field === field)) return false
    if (field === 'message' ? node.tagName !== 'textarea' : node.tagName !== 'input' || type !== (field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text')) return false
    // A phone is supported only when optional. No implicit changes to source obligations.
    const required = has(node,'required') || attr(node,'aria-required') === 'true' || attr(node,'class').split(/\s+/).includes('wpcf7-validates-as-required')
    if (field === 'phone' && required) return false
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
    if (field !== 'message') set(node,'autocomplete',field === 'phone' ? 'tel' : field)
  }
  for (const node of nodes.filter(n => attr(n,'class').split(/\s+/).includes('wpcf7-response-output'))) remove(node)
  append(form,'<div hidden aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="requestId" value=""><p data-gnr8-contact-status role="status" aria-live="polite"></p>')
  return true
}

/** Read server-owned generated HTML, never schema or destination from a POST. */
export function readContactSchema(html: string): ContactSchema | null {
  const forms = contactElements(parse(html)).filter(n => n.tagName === 'form' && attr(n,'data-gnr8-contact') === 'v1')
  if (forms.length !== 1) return null
  const controls = contactElements(forms[0]!).filter(n => ['input','textarea'].includes(n.tagName) && Object.hasOwn(CONTACT_LIMITS,attr(n,'name')))
  const fields = controls.map(n => attr(n,'name') as ContactField), required = controls.filter(n => has(n,'required')).map(n => attr(n,'name') as ContactField)
  if (new Set(fields).size !== fields.length || !['name','email','message'].every(field => fields.includes(field as ContactField)) || !required.includes('name') || !required.includes('email') || required.includes('phone')) return null
  return { fields, required }
}
