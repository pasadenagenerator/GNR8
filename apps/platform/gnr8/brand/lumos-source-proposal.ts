import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { posix } from 'node:path';
import { createHash } from 'node:crypto';
import { parseBrandDecisions, type BrandSaved, type BrandKey } from './brand-guide';
import { LUMOS_COMPONENT_FILES } from './lumos-components';
import type { Gnr8OutputAdapterFileManifest } from '../output-adapters/output-adapter-contract';

export type LumosBrandReference = { siteVersionId: string; artifactId: string; revision: number };

export function parseLumosBrandReference(value: unknown): LumosBrandReference {
  const ref = value as LumosBrandReference;
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) ||
      Object.keys(ref).sort().join() !== 'artifactId,revision,siteVersionId' ||
      ![ref.siteVersionId, ref.artifactId].every(id => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) ||
      !Number.isSafeInteger(ref.revision) || ref.revision < 1) throw Error('422|LUMOS_BRAND_REFERENCE_INVALID');
  return { siteVersionId: ref.siteVersionId, artifactId: ref.artifactId, revision: ref.revision };
}

/** Bind a proposal to the saved guide, never to browser-supplied CSS or another capture. */
export function requireLumosBrand(saved: unknown, reference: LumosBrandReference): BrandSaved {
  const guide = saved as BrandSaved | undefined;
  if (!guide || guide.kind !== 'brand_style_guide_v1' || guide.siteVersionId !== reference.siteVersionId ||
      guide.artifactId !== reference.artifactId || guide.revision !== reference.revision ||
      !Number.isSafeInteger(guide.revision) || guide.revision < 1)
    throw Error('409|LUMOS_BRAND_CHANGED');
  return { ...guide, decisions: parseBrandDecisions(guide.decisions) };
}

/** Operates after the normal import capability/asset gates. No route, link,
 * image, script, layout container or source capture is removed or rewritten. */
export function createLumosSourceProposal(project: Gnr8OutputAdapterFileManifest, guide: BrandSaved) {
  const decisions = parseBrandDecisions(guide.decisions);
  const rules: Array<[string, Partial<Record<BrandKey, string>>]> = [
    ['body', { background: 'background-color', text: 'color', fontFamily: 'font-family',
      fontSize: 'font-size', fontWeight: 'font-weight', lineHeight: 'line-height' }],
    ['.heading', { headingFamily: 'font-family', headingWeight: 'font-weight', headingLineHeight: 'line-height' }],
    ['h1.heading', { headingSize: 'font-size' }],
    ['button, [role="button"]', { buttonBackground: 'background-color', buttonText: 'color', buttonPadding: 'padding', radius: 'border-radius' }],
  ];
  const applied = new Set<BrandKey>();
  const css = rules.map(([selector, fields]) => {
    const declarations = Object.entries(fields).flatMap(([field, property]) => {
      const key = field as BrandKey, decision = decisions[key];
      if (!decision?.confirmed || !decision.value) return [];
      applied.add(key);
      return [`  ${property}: ${decision.value};`];
    });
    return declarations.length ? `${selector} {\n${declarations.join('\n')}\n}` : '';
  }).filter(Boolean).join('\n');
  const binding = { format: 'gnr8-lumos-brand:v1', lumos: '1.0.1',
    upstreamCommit: '968d013064bd9b3f1b7a73afec7abe9925ac9560',
    siteVersionId: guide.siteVersionId, artifactId: guide.artifactId, revision: guide.revision,
    decisions, appliedFields: [...applied].sort(),
    unappliedFields: Object.keys(decisions).filter(key => !applied.has(key as BrandKey)).sort() };
  const sha256 = createHash('sha256').update(JSON.stringify(binding)).digest('hex');
  const files = project.files.map(file => {
    if (!file.path.startsWith('src/pages/') || !file.path.endsWith('.astro')) return file;
    if (file.contents.startsWith('---')) throw Error('LUMOS_SOURCE_ALREADY_HAS_FRONTMATTER');
    const edits: Array<{ start: number; end: number; value: string }> = [];
    function visit(node: DefaultTreeAdapterMap['node']) {
      if ('tagName' in node) {
        if (['script', 'style', 'template', 'textarea', 'svg', 'form'].includes(node.tagName)) return;
        const location = node.sourceCodeLocation;
        const component = /^h[1-6]$/.test(node.tagName) ? 'LumosHeading' : node.tagName === 'p' ? 'LumosParagraph' : null;
        // Reserved component props and parser-repaired tags remain literal HTML.
        if (component && location?.startTag && location.endTag &&
            !node.attrs.some(attr => ['tag', 'variant', 'render', 'maxwidth', 'slot'].includes(attr.name))) {
          edits.push({ start: location.startTag.startOffset + 1,
            end: location.startTag.startOffset + 1 + node.tagName.length,
            value: `${component} tag="${node.tagName}" variant="inherit"` });
          edits.push({ start: location.endTag.startOffset + 2,
            end: location.endTag.startOffset + 2 + node.tagName.length, value: component });
        }
      }
      if ('childNodes' in node) node.childNodes.forEach(visit);
    }
    visit(parse(file.contents, { sourceCodeLocationInfo: true }));
    let contents = file.contents;
    for (const edit of edits.sort((a, b) => b.start - a.start))
      contents = contents.slice(0, edit.start) + edit.value + contents.slice(edit.end);
    const relative = posix.relative(posix.dirname(file.path), 'src/gnr8-lumos');
    contents = `---\nimport LumosHeading from ${JSON.stringify(relative + '/Heading.astro')};\nimport LumosParagraph from ${JSON.stringify(relative + '/Paragraph.astro')};\nimport ${JSON.stringify(relative + '/brand.css')};\n---\n` + contents;
    return { ...file, contents };
  });
  for (const [path, contents] of Object.entries(LUMOS_COMPONENT_FILES)) {
    if (files.some(file => file.path === path)) throw Error('LUMOS_SOURCE_PATH_CONFLICT');
    files.push({ path, contents, role: 'source' });
  }
  files.push({ path: 'src/gnr8-lumos/brand.css', role: 'style', contents: css + '\n' },
    { path: 'src/gnr8-lumos/brand-guide.json', role: 'manifest', contents: JSON.stringify({ ...binding, sha256 }, null, 2) + '\n' });
  return { files, binding: { ...binding, sha256 } };
}
