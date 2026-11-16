import type { BrandGuide, BrandKey } from './brand-guide';
/** Only explicitly edited fields override latest values. Other people's changes survive. */
export function rebaseBrandDraft(draft:BrandGuide,latest:BrandGuide,edited:BrandKey[]):BrandGuide {
  if(draft.siteVersionId!==latest.siteVersionId||draft.artifactId!==latest.artifactId)throw Error('Vhod se je spremenil. Osnutek ohranite in odprite vodič za prvotni vhod.');
  const decisions={...latest.decisions};
  for(const key of edited){const decision=draft.decisions[key];if(decision)decisions[key]={...decision};}
  return {...latest,decisions};
}
