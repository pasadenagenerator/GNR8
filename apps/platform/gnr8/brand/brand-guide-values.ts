import type { BrandKey } from './brand-guide';

// Deliberately bounded editable token grammar. Captured evidence remains verbatim.
const colors=new Set('transparent black silver gray grey white maroon red purple fuchsia green lime olive yellow navy blue teal aqua orange rebeccapurple pink brown coral gold indigo violet cyan magenta darkgreen darkblue darkred lightgray lightgrey'.split(' '));
export function isBrandColor(value:string):boolean {
  const v=value.trim().toLowerCase();
  if(colors.has(v)||/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v))return true;
  const m=/^(rgb|rgba|hsl|hsla)\(([^()]+)\)$/.exec(v);if(!m)return false;
  const parts=m[2].split(',').map(s=>s.trim());if(parts.length!==(m[1].endsWith('a')?4:3))return false;
  const range=(s:string,max:number)=>/^(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(s)&&Number(s.replace('%',''))<=(s.endsWith('%')?100:max);
  if(parts.length===4&&!range(parts[3],1))return false;
  return m[1].startsWith('rgb')?parts.slice(0,3).every(s=>range(s,255)&&s.endsWith('%')===parts[0].endsWith('%')):
    /^\d+(?:\.\d+)?(?:deg)?$/.test(parts[0])&&Number(parts[0].replace('deg',''))<=360&&parts.slice(1,3).every(s=>s.endsWith('%')&&range(s,100));
}
function length(v:string,positive=false){const m=/^(\d+(?:\.\d+)?|\.\d+)(px|rem|em|%|vw|vh|svh|dvh)?$/.exec(v);return !!m&&Number(m[1])<=10000&&(!positive||Number(m[1])>0)&&(Number(m[1])===0||!!m[2]);}
function lengths(v:string,max=4){const parts=v.split(/\s+/);return parts.length<=max&&parts.every(p=>length(p));}
export function brandValueError(key:BrandKey,value:string):string|null {
  const v=value.trim();if(!v)return null; // unknown is permitted, confirmation checks nonempty separately
  let valid=false,hint='';
  switch(key){
    case 'background':case 'text':case 'accent':case 'buttonBackground':case 'buttonText':
      valid=isBrandColor(v);hint='Uporabite barvo HEX (npr. #0d8f35), rgb/rgba, hsl/hsla ali osnovno angleško ime barve.';break;
    case 'fontSize':case 'headingSize':case 'contentWidth':valid=length(v,true);hint='Vnesite pozitivno mero z enoto, npr. 17px, 1.25rem ali 90%.';break;
    case 'fontWeight':case 'headingWeight':valid=/^(normal|bold|[1-9]\d{0,2}|1000)$/.test(v);hint='Vnesite debelino 1–1000, normal ali bold.';break;
    case 'lineHeight':case 'headingLineHeight':valid=v==='normal'||length(v,true)||(/^(\d+(?:\.\d+)?|\.\d+)$/.test(v)&&Number(v)>0&&Number(v)<=10);hint='Vnesite normal, pozitivno mero ali razmerje, npr. 1.4.';break;
    case 'spacing':case 'radius':case 'buttonPadding':valid=lengths(v);hint='Vnesite od ene do štirih nenegativnih mer, npr. 12px 20px.';break;
    case 'fontFamily':case 'headingFamily':valid=v.length<=120&&v.split(',').every(s=>/^(?:[\p{L}_][\p{L}\p{N}_ -]*|"[\p{L}\p{N}_ -]+"|'[\p{L}\p{N}_ -]+')$/u.test(s.trim()));hint='Vnesite ime pisave ali seznam imen, npr. Barlow, sans-serif.';break;
    case 'border':{const m=/^(\S+)\s+(solid|dashed|dotted|double)\s+(.+)$/.exec(v);valid=v==='none'||!!m&&!m[1].endsWith('%')&&length(m[1])&&isBrandColor(m[3]);hint='Vnesite none ali npr. 1px solid #cccccc. Širina roba ne sme biti v odstotkih.';break;}
    case 'shadow':{const m=/^(?:inset\s+)?((?:-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)?\s+){2,4})(.+)$/.exec(v);valid=v==='none'||!!m&&isBrandColor(m[2])&&m[1].trim().split(/\s+/).every((p,i)=>length(i<2?p.replace(/^-/,''):p));hint='Vnesite none ali eno senco, npr. 0 2px 8px #00000033.';break;}
    case 'breakpoints':valid=v.split(',').every(s=>length(s.trim(),true)&&/px$|rem$|em$/.test(s.trim()));hint='Vnesite širine, ločene z vejico, npr. 600px, 1200px. Opis odzivnega obnašanja ostaja v dokazilih.';break;
    case 'logoPosition':valid=['levo','sredina','desno','zgoraj levo','zgoraj sredina','zgoraj desno','left','center','right'].includes(v.toLowerCase());hint='Vnesite levo, sredina, desno, zgoraj levo, zgoraj sredina ali zgoraj desno.';break;
    case 'logo':valid=!/^[\/]|[?#\\:]/.test(v)&&!v.split('/').some(p=>p==='..'||p==='.')&&/\.(png|jpe?g|webp|svg|gif|avif)$/i.test(v);hint='Izberite relativno pot shranjene slike logotipa.';break;
  }
  return valid?null:hint;
}
