import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { isContactEmail } from '@gnr8/runtime-contracts';

export type ContactSuggestion = { recipient: string; sourceUrl: string; evidence: 'public-mailto' | 'public-contact-text' | 'form-mailto'; formId?: string };
export type ContactSuggestionModel = { sourceTarget: string; suggestions: ContactSuggestion[] };
type Node = DefaultTreeAdapterMap['node'];

/** Public evidence only. No input values, placeholders, scripts, or inferred domain addresses. */
export function findContactSuggestions(pages: Array<{ sourceUrl: string; html: string }>): ContactSuggestion[] {
  const result: ContactSuggestion[] = [];
  for (const page of pages) {
    let source: URL;
    try { source = new URL(page.sourceUrl); } catch { continue; }
    if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) continue;
    const contactPage = /(?:^|\/)(?:contact|kontakt|contact-us)(?:\/|\.|$)/i.test(source.pathname);
    function add(value: string, evidence: ContactSuggestion['evidence'], formId?: string) {
      const recipient = value.trim();
      if (!isContactEmail(recipient)) return;
      if (!result.some(x => x.recipient === recipient && x.sourceUrl === page.sourceUrl && x.evidence === evidence))
        result.push({ recipient, sourceUrl: page.sourceUrl, evidence, ...(formId ? { formId } : {}) });
    }
    function visit(node: Node, formId?: string, besideForm = false, insideForm = false) {
      if ('tagName' in node) {
        const attrs = Object.fromEntries(node.attrs.map(a => [a.name, a.value]));
        if (['script','style','template','input','textarea','select','option','noscript'].includes(node.tagName) || 'hidden' in attrs || attrs['aria-hidden'] === 'true') return;
        if (['section', 'div', 'aside'].includes(node.tagName) && node.childNodes.some(child => 'tagName' in child && child.tagName === 'form')) besideForm = true;
        if (node.tagName === 'form') { insideForm = true; formId = attrs.id || attrs.name || undefined; }
        const mailto = node.tagName === 'a' ? attrs.href : node.tagName === 'form' ? attrs.action : undefined;
        if (mailto?.toLowerCase().startsWith('mailto:')) {
          try { add(decodeURIComponent(mailto.slice(7).split('?')[0]), node.tagName === 'form' ? 'form-mailto' : 'public-mailto', formId); } catch { /* Invalid URI is not evidence. */ }
        }
      }
      if (node.nodeName === '#text' && (contactPage || insideForm || (besideForm && /(?:contact|kontakt|e-?mail|e-?pošta)\s*:/i.test((node as DefaultTreeAdapterMap['textNode']).value)))) {
        for (const value of (node as DefaultTreeAdapterMap['textNode']).value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) add(value, 'public-contact-text', formId);
      }
      if ('childNodes' in node) for (const child of node.childNodes) visit(child, formId, besideForm, insideForm);
    }
    visit(parse(page.html));
  }
  return result;
}
