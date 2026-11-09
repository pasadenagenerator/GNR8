import { parse, type DefaultTreeAdapterMap } from "parse5";
import { createHash } from "node:crypto";
import { createAstroStaticSiteSourceSnapshot } from "../output-adapters/astro-static-site-workspace-preparation";
import { StackiDraftError, parseStackiRecord, type StackiDraftFile, type StackiDraftRecord, type StackiDraftScope } from "./stacki-draft-contract";
import { requireSupportedStackiStyleEdit, type StackiStyleWarning } from './stacki-style-edit';

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

/** A deliberately narrow contract, not a source-to-canonical importer. */
export const STACKI_CANONICAL_RELATION = "source-edited-canonical-not-synchronized:v1" as const;

/**
 * Validate against the independently loaded, verified generator source. Only
 * static text, image selection and bounded layout CSS may change. Routes, executable source, native
 * contact attributes, navigation, dependencies and retained asset bytes remain
 * authoritative. The caller must never execute an unvalidated checkpoint.
 */
export function selectStackiCandidateSource(input: {
  checkpoint: StackiDraftRecord;
  scope: StackiDraftScope;
  expectedRevision: number;
  expectedSha256: string;
  baseline: StackiDraftFile[];
  sourcePaths: string[];
  ownedImagePaths: string[];
}) {
  const checkpoint = parseStackiRecord(input.checkpoint, input.scope, input.expectedRevision);
  if (checkpoint.sha256 !== input.expectedSha256) fail("STACKI_CANDIDATE_SELECTION_STALE");
  const saved = new Map(checkpoint.files.filter(f => !f.path.startsWith(".studio-state/")).map(f => [f.path, f]));
  const baseline = new Map(input.baseline.filter(f => !f.path.startsWith(".studio-state/")).map(f => [f.path, f]));
  if ([...baseline.keys()].some(path => !saved.has(path)))
    fail("STACKI_CANDIDATE_FILE_SET_UNSUPPORTED");
  const images = new Set(input.ownedImagePaths);
  const mirrors = new Map<string, StackiDraftFile>();
  const uploadedImages: Record<string, { sha256: string; mediaType: string }> = {};
  for (const [path, file] of saved) {
    const bytes = Buffer.from(file.base64, "base64");
    const mediaType = stackiImageMediaType(path, bytes);
    if (baseline.has(path) && (!path.startsWith('public/') || path.startsWith('public/api/') || !mediaType)) continue;
    const sourceImage = /^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|svg)$/i.test(path) && mediaType;
    if ((!path.startsWith("public/") && !sourceImage) || path.startsWith("public/api/") || !mediaType)
      fail("STACKI_CANDIDATE_FILE_SET_UNSUPPORTED");
    const publicPath = sourceImage ? path : path.slice(7);
    if (sourceImage) {
      const mirror = saved.get('public/' + path);
      if (mirror && mirror.base64 !== file.base64) fail("STACKI_CANDIDATE_FILE_SET_UNSUPPORTED");
      mirrors.set('public/' + path, file);
    }
    uploadedImages[publicPath] = { sha256: createHash("sha256").update(bytes).digest("hex"), mediaType };
    images.add('/' + publicPath);
  }
  const changes: { path: string; kind: "text" | "image" | "announcement-removal" | "style" | "image-layout"; before: string; after: string }[] = [];
  const styleWarnings:Array<StackiStyleWarning&{path:string}>=[];
  for (const [path, original] of baseline) {
    const edited = saved.get(path)!;
    if (edited.base64 === original.base64) continue;
    if (!/^src\/pages\/(?:[A-Za-z0-9_@+-]+\/)*index\.astro$/.test(path))
      fail("STACKI_CANDIDATE_CODE_OR_ASSET_CHANGE_UNSUPPORTED");
    const before = Buffer.from(original.base64, "base64").toString("utf8");
    const afterBytes = Buffer.from(edited.base64, "base64");
    const after = afterBytes.toString("utf8");
    if (!Buffer.from(after).equals(afterBytes)) fail("STACKI_CANDIDATE_SOURCE_INVALID");
    // Parsing HTML is not an Astro parser. Keep every byte outside explicitly
    // recognized text/attribute spans identical, including frontmatter/comments.
    const edits: { start: number; end: number; value: string }[] = [];
    const a = parse(before, { sourceCodeLocationInfo: true });
    const b = parse(after, { sourceCodeLocationInfo: true });
    const selectors=new Set<string>();
    function collect(node:Node){
      if('tagName' in node)for(const attr of node.attrs){
        if(attr.name==='id')selectors.add('#'+attr.value);
        if(attr.name==='class')attr.value.split(/\s+/).filter(Boolean).forEach(value=>selectors.add('.'+value));
      }
      if('childNodes' in node)node.childNodes.forEach(collect);
    }
    collect(a);
    compare(a, b, false);
    let reconstructed = before;
    for (const edit of edits.sort((a, b) => b.start - a.start))
      reconstructed = reconstructed.slice(0, edit.start) + edit.value + reconstructed.slice(edit.end);
    if (reconstructed !== after) fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");

    function compare(a: Node, b: Node, protectedText: boolean) {
      if (a.nodeName !== b.nodeName) fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");
      if (a.nodeName === "#text" && b.nodeName === "#text") {
        const aa = a as DefaultTreeAdapterMap["textNode"], bb = b as DefaultTreeAdapterMap["textNode"];
        if (aa.value !== bb.value) {
          if (protectedText || !aa.sourceCodeLocation || !bb.sourceCodeLocation)
            fail("STACKI_CANDIDATE_CODE_OR_ASSET_CHANGE_UNSUPPORTED");
          const value = after.slice(bb.sourceCodeLocation.startOffset, bb.sourceCodeLocation.endOffset);
          if (/[{}]/.test(value) || /[{}]/.test(aa.value)) fail("STACKI_CANDIDATE_EXPRESSION_UNSUPPORTED");
          edits.push({ start: aa.sourceCodeLocation.startOffset, end: aa.sourceCodeLocation.endOffset, value });
          changes.push({ path, kind: "text", before: aa.value, after: bb.value });
        }
        return;
      }
      if ("tagName" in a && "tagName" in b) {
        const aa = a as Element, bb = b as Element;
        const removed=aa.attrs.filter(attr=>!bb.attrs.some(other=>other.name===attr.name));
        for(const attr of removed){
          // Studio drops fixed image dimensions when switching to CSS sizing.
          // Preserve the image, source, alt text and every non-layout attribute.
          if(protectedText||aa.tagName!=='img'||!['width','height'].includes(attr.name)||
            !/^\d{1,5}$/.test(attr.value)||Number(attr.value)<1||Number(attr.value)>10000)
            fail('STACKI_CANDIDATE_ATTRIBUTE_UNSUPPORTED');
          const location=aa.sourceCodeLocation?.attrs?.[attr.name];
          if(!location)fail('STACKI_CANDIDATE_SOURCE_INVALID');
          edits.push({start:location.startOffset,end:location.endOffset,value:''});
          changes.push({path,kind:'image-layout',before:before.slice(location.startOffset,location.endOffset),after:''});
        }
        const attributes=aa.attrs.filter(attr=>!removed.includes(attr));
        if (aa.namespaceURI !== bb.namespaceURI || attributes.length !== bb.attrs.length)
          fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");
        for (let i = 0; i < attributes.length; i++) {
          const x = attributes[i]!, y = bb.attrs[i]!;
          if (x.name !== y.name || x.namespace !== y.namespace || x.prefix !== y.prefix)
            fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");
          if (x.value === y.value) continue;
          if (aa.tagName !== "img" || !["src", "alt"].includes(x.name) || /[{}]/.test(y.value))
            fail("STACKI_CANDIDATE_ATTRIBUTE_UNSUPPORTED");
          if (x.name === "src" && !images.has(y.value)) fail("STACKI_CANDIDATE_IMAGE_UNSUPPORTED");
          if (x.name === "src" && aa.attrs.some(attr => attr.name === "srcset"))
            fail("STACKI_CANDIDATE_RESPONSIVE_IMAGE_UNSUPPORTED");
          const oldLocation = aa.sourceCodeLocation?.attrs?.[x.name];
          const newLocation = bb.sourceCodeLocation?.attrs?.[y.name];
          if (!oldLocation || !newLocation) fail("STACKI_CANDIDATE_SOURCE_INVALID");
          const value = after.slice(newLocation.startOffset, newLocation.endOffset);
          // Entity-encoded braces can become Astro expressions after rewriting.
          if (/[{}]/.test(value)) fail("STACKI_CANDIDATE_EXPRESSION_UNSUPPORTED");
          edits.push({ start: oldLocation.startOffset, end: oldLocation.endOffset, value });
          changes.push({ path, kind: x.name === "src" ? "image" : "text", before: x.value, after: y.value });
        }
        if(aa.tagName==='style'&&!protectedText){
          const x=aa.sourceCodeLocation,y=bb.sourceCodeLocation;
          if(!x?.startTag||!x.endTag||!y?.startTag||!y.endTag)fail('STACKI_CANDIDATE_SOURCE_INVALID');
          const originalStyle=before.slice(x.startTag.endOffset,x.endTag.startOffset);
          const editedStyle=after.slice(y.startTag.endOffset,y.endTag.startOffset);
          if(originalStyle!==editedStyle){
            if(aa.namespaceURI!=='http://www.w3.org/1999/xhtml'||aa.attrs.some(attr=>!['is:global','id'].includes(attr.name)))
              fail('STACKI_CANDIDATE_STYLE_CHANGE_UNSUPPORTED');
            styleWarnings.push(...requireSupportedStackiStyleEdit(originalStyle,editedStyle,selectors).map(w=>({...w,path})));
            edits.push({start:x.startTag.endOffset,end:x.endTag.startOffset,value:editedStyle});
            changes.push({path,kind:'style',before:originalStyle,after:editedStyle});
          }
          return;
        }
        protectedText ||= ["script", "style", "template", "textarea"].includes(aa.tagName);
      }
      const ac = "childNodes" in a ? a.childNodes : [];
      const bc = "childNodes" in b ? b.childNodes : [];
      let next=0;
      for(const child of ac){
        if(!protectedText && removableAnnouncement(child) && !removableAnnouncement(bc[next])){
          const location=child.sourceCodeLocation;
          if(!location)fail("STACKI_CANDIDATE_SOURCE_INVALID");
          edits.push({start:location.startOffset,end:location.endOffset,value:""});
          changes.push({path,kind:"announcement-removal",before:before.slice(location.startOffset,location.endOffset),after:""});
          continue;
        }
        if(!bc[next])fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");
        compare(child,bc[next++]!,protectedText);
      }
      if(next!==bc.length)fail("STACKI_CANDIDATE_SOURCE_STRUCTURE_UNSUPPORTED");
    }
  }
  if (!input.sourcePaths.length || new Set(input.sourcePaths).size !== input.sourcePaths.length ||
    input.sourcePaths.some(path => !saved.has(path) || path.startsWith(".studio-state/")))
    fail("STACKI_CANDIDATE_SOURCE_INVALID");
  if ([...baseline.keys()].some(path => path.startsWith("src/") && !input.sourcePaths.includes(path)))
    fail("STACKI_CANDIDATE_SOURCE_INVALID");
  // Asset mirrors and editor metadata are not generator source. They were
  // checked above; serving continues through the original owned asset resolver.
  const paths = [...new Set([...input.sourcePaths, ...[...mirrors.values()].map(file=>file.path), ...Object.keys(uploadedImages).map(path => 'public/' + path)])];
  const files = paths.map(path => ({ path, body: Buffer.from((saved.get(path) ?? mirrors.get(path))!.base64, "base64") }));
  return {
    files,
    uploadedImages,
    sourceSnapshot: createAstroStaticSiteSourceSnapshot(files),
    binding: { scope: checkpoint.scope, revision: checkpoint.revision, sha256: checkpoint.sha256,
      canonicalRelation: STACKI_CANONICAL_RELATION },
    changes,
    styleWarnings,
  };
}

function fail(code: string): never { throw new StackiDraftError(422, code); }

export function stackiImageMediaType(path: string, bytes: Buffer): string | null {
  if (/\.png$/i.test(path) && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (/\.jpe?g$/i.test(path) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (/\.webp$/i.test(path) && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP') return 'image/webp';
  if (/\.svg$/i.test(path) && /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(bytes.toString()) &&
    !/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|javascript:|\/\/)/i.test(bytes.toString())) return 'image/svg+xml';
  return null;
}

/** Only the generated, non-form announcement may be removed. Never treat a
 * general div, navigation, form or executable subtree as editable content. */
function removableAnnouncement(node:Node|undefined):boolean {
  if(!node || !("tagName" in node) || node.tagName!=="div" ||
      !node.attrs.some(a=>a.name==="data-gnr8-announcement"&&a.value==="v1") ||
      !node.attrs.some(a=>a.name==="class"&&a.value.split(/\s+/).includes("promomessage")))return false;
  function safe(child:Node):boolean {
    if("tagName" in child && (!["div","button","h1","h2","h3","p","a","span","strong","em","br"].includes(child.tagName)||
        child.attrs.some(a=>a.name.startsWith("on")||a.name==="data-gnr8-contact")))return false;
    return !("childNodes" in child)||child.childNodes.every(safe);
  }
  return safe(node);
}
