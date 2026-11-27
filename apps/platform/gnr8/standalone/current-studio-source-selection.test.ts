import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCurrentStudioSourceSelection, requireReviewedGeneratedStudioSource } from './current-confirmed-import';
import { publicationSelectionForArtifact, type PublicationSelection } from './publication-contract';
import type { GeneratedOutputReviewModel } from '../output-adapters/generated-output-publication-composition';
import type { GeneratedOutputReviewRecord } from '../output-adapters/generated-output-eligibility';

const id=(n:number)=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const sha=(letter:string)=>letter.repeat(64);
const input={selection:{kind:'generated-source',scope:{agencyId:id(1),clientId:id(2),siteId:id(3),siteVersionId:id(4)},sha256:sha('a')},
 artifactId:id(5),artifactSha256:sha('b')} as PublicationSelection;
const model={siteVersionId:id(4),artifactId:id(5),artifactBundleSha256:sha('b'),candidateId:'astro_candidate_33333333333343338333333333333333',
 candidateContentSha256:sha('c'),contentManifestSha256:sha('d'),outputPaths:['/','/apple'],
 sourceCapture:{siteVersionId:id(6)},decision:{technical:{status:'PASS',evidenceSha256:sha('e')},review:{status:'APPROVED'}}} as GeneratedOutputReviewModel;
const review={decision:'APPROVED',artifactId:id(5),artifactBundleSha256:sha('b'),candidateId:model.candidateId,
 candidateContentSha256:sha('c'),contentManifestSha256:sha('d'),technicalEvaluationSha256:sha('e'),reviewSha256:sha('f')} as GeneratedOutputReviewRecord;

test('Studio accepts the exact approved generated candidate without certifying the original capture',()=>{
 assert.deepEqual(requireReviewedGeneratedStudioSource(input,model,review),{
  confirmationSha256:sha('f'),artifactVersionId:id(4),captureVersionId:id(6),routes:['/','/apple']});
});

test('Studio rejects missing or changed generated-candidate approval',()=>{
 assert.throws(()=>requireReviewedGeneratedStudioSource(input,model,null),/confirmation_stale/);
 assert.throws(()=>requireReviewedGeneratedStudioSource(input,model,{...review,technicalEvaluationSha256:sha('0')}),/confirmation_stale/);
 assert.throws(()=>requireReviewedGeneratedStudioSource(input,{...model,decision:{...model.decision,technical:{...model.decision.technical,status:'BLOCKED'}}},review),/confirmation_stale/);
 assert.throws(()=>requireReviewedGeneratedStudioSource(input,{...model,outputPaths:['/','/']},review),/confirmation_stale/);
});

test('Studio reads the selected candidate and its current review before preparing source',async()=>{
 const scope=input.selection.scope;
 const artifact={id:id(5),bundleSha256:sha('b'),manifest:{generatedOutputSourceWorkspace:{adapterId:'astro-static-site',files:[],assetEvidence:[]}}};
 const selected=publicationSelectionForArtifact(scope,artifact);
 const calls:string[]=[];
 const deps={source:async()=>{calls.push('source');return {artifact} as any;},
  model:async()=>{calls.push('model');return model;},
  review:async()=>{calls.push('review');return review;}};
 const result=await requireCurrentStudioSourceSelection({} as any,selected,deps);
 assert.deepEqual(calls,['source','model','review']);
 assert.equal(result.confirmationSha256,review.reviewSha256);
 assert.deepEqual(result.routes,['/','/apple']);
 await assert.rejects(requireCurrentStudioSourceSelection({} as any,
  {...selected,artifactSha256:sha('0')},deps),/source_stale/);
});
