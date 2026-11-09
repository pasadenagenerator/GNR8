import postcss, { type ChildNode, type Container, type Declaration, type Rule } from 'postcss';
import { StackiDraftError } from './stacki-draft-contract';

// This is the bounded layout surface already emitted by the editor, not a CSS
// execution allowlist. Existing unrelated CSS must remain byte-identical.
const properties=new Set([
 'width','height','min-width','max-width','min-height','max-height','top','right','bottom','left',
 ...['margin','padding'].flatMap(p=>[p,...['top','right','bottom','left','inline','block','inline-start','inline-end','block-start','block-end'].map(side=>`${p}-${side}`)]),
]);
export type StackiStyleWarning={code:'ignored_decimal_comma';property:string;value:string}|{code:'unmatched_selector';selector:string};
function reject():never { throw new StackiDraftError(422,'STACKI_CANDIDATE_STYLE_CHANGE_UNSUPPORTED'); }
function declaration(node:ChildNode):node is Declaration { return node.type==='decl'&&properties.has(node.prop); }
function validValue(decl:Declaration,warnings:StackiStyleWarning[]) {
 // No functions, custom properties, escapes, URLs, strings, or !important
 // changes. Decimal-comma dimensions are inert invalid CSS. Preserve the
 // user's bytes and report that the browser ignores them; never normalize.
 const count=/^(margin|padding)$/.test(decl.prop)?4:/^(margin|padding)-(inline|block)$/.test(decl.prop)?2:1;
 const parts=decl.value.trim().split(/\s+/);
 if(parts.length>count||decl.important)reject();
 for(const value of parts){
  if(['inherit','initial','unset'].includes(value))continue;
  if(value==='auto'&&!decl.prop.startsWith('padding'))continue;
  const match=/^(-?(?:\d+(?:[.,]\d+)?|\.\d+))(px|rem|em|%|vw|vh)?$/.exec(value);
  const number=match?Number(match[1]!.replace(',','.')):NaN;
  if(!match||Math.abs(number)>10000||(!match[2]&&number!==0)||
    (number<0&&!/^(margin|top$|right$|bottom$|left$)/.test(decl.prop)))reject();
  if(value.includes(','))warnings.push({code:'ignored_decimal_comma',property:decl.prop,value:decl.value});
 }
}

/** Compare ordered rules, preserving media conditions and every non-layout
 * declaration. New rules may only target a simple class/id; an unmatched
 * selector is reported as inert on this page. Never repairs saved source. */
export function requireSupportedStackiStyleEdit(before:string,after:string,selectors:ReadonlySet<string>):StackiStyleWarning[] {
 const warnings:StackiStyleWarning[]=[];
 let original,edited;
 try { original=postcss.parse(before);edited=postcss.parse(after); } catch { reject(); }
 function rule(a:Rule|null,b:Rule){
  if(a&&a.selector!==b.selector)reject();
  if(!a&&!/^[.#][A-Za-z_][A-Za-z0-9_-]*$/.test(b.selector))reject();
  if(!a&&!selectors.has(b.selector))warnings.push({code:'unmatched_selector',selector:b.selector});
  const fixed=(r:Rule|null)=>(r?.nodes??[]).filter(n=>!declaration(n)).map(n=>n.toString());
  if(JSON.stringify(fixed(a))!==JSON.stringify(fixed(b)))reject();
  if(!a&&!b.nodes.length)reject();
  // Preserve existing unsupported/legacy values only when unchanged. This is
  // a multiset so duplicate fallback declarations cannot conceal a new value.
  const unchanged=(a?.nodes??[]).filter(declaration).map(n=>n.toString());
  for(const n of b.nodes.filter(declaration)){
   const index=unchanged.indexOf(n.toString());
   if(index>=0)unchanged.splice(index,1);else validValue(n,warnings);
  }
 }
 function container(a:Container,b:Container){
  if(!a.nodes||!b.nodes||a.nodes.length>b.nodes.length)reject();
  for(let i=0;i<b.nodes.length;i++){
   const x=a.nodes[i],y=b.nodes[i]!;
   if(x?.toString()===y.toString())continue;
   if(!x){if(y.type!=='rule')reject();rule(null,y);continue;}
   if(x.type==='rule'&&y.type==='rule'){rule(x,y);continue;}
   if(x.type==='atrule'&&y.type==='atrule'&&x.name==='media'&&y.name===x.name&&x.params===y.params){container(x,y);continue;}
   reject();
  }
 }
 container(original!,edited!);
 return warnings;
}
