import { brandValueError } from './brand-guide-values';
/** User decisions are separate from immutable capture evidence and never imply capture completeness. */
export const BRAND_FIELDS = {
  logo: 'Logotip (pot shranjene datoteke)', logoPosition: 'Položaj logotipa',
  background: 'Ozadje', text: 'Osnovno besedilo', accent: 'Poudarek znamke',
  fontFamily: 'Osnovna pisava', fontSize: 'Velikost besedila', fontWeight: 'Debelina besedila', lineHeight: 'Višina vrstice',
  headingFamily: 'Pisava naslova', headingSize: 'Velikost naslova', headingWeight: 'Debelina naslova', headingLineHeight: 'Višina vrstice naslova',
  spacing: 'Razmaki', contentWidth: 'Širina vsebine', border: 'Robovi', radius: 'Zaobljenost', shadow: 'Senca',
  buttonBackground: 'Ozadje gumba', buttonText: 'Besedilo gumba', buttonPadding: 'Odmik gumba', breakpoints: 'Odzivno obnašanje',
} as const;
export type BrandKey = keyof typeof BRAND_FIELDS;
export type BrandObservation = { id: string; route: string | null; file: string; selector: string; property: string; value: string; context: string; kind: 'computed' | 'declaration' | 'element' };
export type BrandProposal = { value: string; evidence: string[]; reason: string };
export type BrandDecision = { value: string; confirmed: boolean };
export type BrandGuide = {
  kind: 'brand_style_guide_v1'; siteVersionId: string; artifactId: string;
  fontFaces?: Array<{family:string;weight:string;style:string;path:string;file:string;previewUrl?:string}>;
  logoOptions?: Array<{path:string;previewUrl:string}>;
  observations: BrandObservation[]; proposals: Partial<Record<BrandKey, BrandProposal>>;
  decisions: Partial<Record<BrandKey, BrandDecision>>; revision: number; savedAt: string | null;
  limitations: string[];
};
export type BrandSaved = Pick<BrandGuide, 'kind' | 'siteVersionId' | 'artifactId' | 'decisions' | 'revision' | 'savedAt'> & { savedBy: string };
export function parseBrandDecisions(value: unknown, validateValues = true): BrandGuide['decisions'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('422|Neveljavne vrednosti vodiča.');
  const result: BrandGuide['decisions'] = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!Object.hasOwn(BRAND_FIELDS, key) || !entry || typeof entry !== 'object' || Array.isArray(entry)) throw Error('422|Neznano polje vodiča.');
    const d = entry as Record<string, unknown>;
    if (Object.keys(d).some(k => !['value', 'confirmed'].includes(k)) || typeof d.value !== 'string' || d.value.length > 500 || typeof d.confirmed !== 'boolean' || /[<>\x00-\x08]/.test(d.value)) throw Error('422|Neveljavna vrednost vodiča.');
    const problem=brandValueError(key as BrandKey,d.value);
    if(validateValues && problem)throw Error(`422|${BRAND_FIELDS[key as BrandKey]}: ${problem}`);
    if(d.confirmed && !d.value.trim()) throw Error('422|Prazne vrednosti ni mogoče potrditi.');
    result[key as BrandKey] = { value: d.value.trim(), confirmed: d.confirmed };
  }
  return result;
}
export function applySavedBrand(guide: BrandGuide, saved: unknown): BrandGuide {
  if (!saved || typeof saved !== 'object') return guide;
  const s = saved as BrandSaved;
  if(s.kind !== guide.kind || s.siteVersionId !== guide.siteVersionId || s.artifactId !== guide.artifactId) throw Error('409|Shranjeni vodič pripada drugemu vhodu.');
  if(!Number.isSafeInteger(s.revision) || s.revision < 1 || typeof s.savedAt !== 'string') throw Error('409|Shranjeni vodič ni veljaven.');
  const decisions=parseBrandDecisions(s.decisions,false);
  const invalid=Object.entries(decisions).filter(([key,d])=>brandValueError(key as BrandKey,d!.value));
  for(const [key,d] of invalid)decisions[key as BrandKey]={...d!,confirmed:false};
  return { ...guide, decisions, revision:s.revision, savedAt:s.savedAt, limitations:[...guide.limitations,...invalid.map(([key])=>`${BRAND_FIELDS[key as BrandKey]}: starejša neveljavna vrednost ostaja osnutek za popravek, ne potrjen token.`)] };
}
