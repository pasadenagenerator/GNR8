import test from 'node:test';
import assert from 'node:assert/strict';
import { createLumosSourceProposal, requireLumosBrand } from './lumos-source-proposal';
import type { BrandSaved } from './brand-guide';
import { createStackiRecord } from '../stacki/stacki-draft-contract';
import { selectStackiCandidateSource } from '../stacki/stacki-candidate-source';

const guide: BrandSaved = { kind: 'brand_style_guide_v1', siteVersionId: 'source-version',
  artifactId: 'raw-artifact', revision: 2, savedAt: '2026-11-16T00:00:00Z', savedBy: 'actor',
  decisions: { text: { value: '#123456', confirmed: true }, background: { value: '#ffffff', confirmed: false } } };

test('all routes use pinned Lumos components while retaining content, navigation and owned controls', () => {
  const html = '<html><head><title>Example</title></head><body><h1 class="hero">A &amp; B</h1><p>Text <a href="/about">About</a></p><img src="/asset.png"><script is:inline>const html = "<p>untouched</p>";</script></body></html>';
  const project = { files: ['src/pages/index.astro', 'src/pages/about/index.astro'].map(path => ({ path, role: 'source' as const, contents: html })) };
  const result = createLumosSourceProposal(project, guide);
  assert.equal(project.files[0].contents, html);
  for (const page of result.files.filter(file => file.path.startsWith('src/pages/'))) {
    assert.match(page.contents, /<LumosHeading tag="h1" variant="inherit" class="hero">A &amp; B<\/LumosHeading>/);
    assert.match(page.contents, /<a href="\/about">About<\/a>/);
    assert.match(page.contents, /<img src="\/asset.png">/);
    assert.match(page.contents, /const html = "<p>untouched<\/p>";/);
  }
  assert.match(result.files[1].contents, /\.\.\/\.\.\/gnr8-lumos\/Heading.astro/);
  const css = result.files.find(file => file.path.endsWith('brand.css'))!.contents;
  assert.match(css, /color: #123456/);
  assert.doesNotMatch(css, /background/);
  assert.equal(result.binding.revision, 2);
  assert.deepEqual(result.binding.unappliedFields, ['background']);
  assert.equal(createLumosSourceProposal(project, guide).binding.sha256, result.binding.sha256);
});

test('stale or foreign brand references fail before preparing source', () => {
  const reference = { siteVersionId: guide.siteVersionId, artifactId: guide.artifactId, revision: guide.revision };
  assert.equal(requireLumosBrand(guide, reference).revision, 2);
  for (const override of [{ revision: 1 }, { artifactId: 'other' }, { siteVersionId: 'other' }])
    assert.throws(() => requireLumosBrand(guide, { ...reference, ...override }), /LUMOS_BRAND_CHANGED/);
  assert.throws(() => createLumosSourceProposal({ files: [] }, { ...guide,
    decisions: { text: { value: 'red; } body { display:none', confirmed: true } } }));
});

test('Lumos source and guide survive the existing Stacki checkpoint and edited-source validator', () => {
  const project = createLumosSourceProposal({files:[
    {path:'package.json',role:'config',contents:'{"private":true,"dependencies":{"astro":"7.4.4"}}'},
    {path:'astro.config.mjs',role:'config',contents:'export default {}'},
    {path:'src/pages/index.astro',role:'source',contents:'<html><head><title>Example</title></head><body><h1>Original title</h1><p>Retained paragraph</p></body></html>'},
  ]},guide);
  const baseline = project.files.map(file=>({path:file.path,base64:Buffer.from(file.contents).toString('base64')}));
  const files=baseline.map(file=>file.path==='src/pages/index.astro'?{...file,
    base64:Buffer.from(Buffer.from(file.base64,'base64').toString().replace('Original title','Edited title')).toString('base64')}:file);
  const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',
    siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
  const checkpoint=createStackiRecord(scope,'10000000-0000-4000-8000-000000000005',{expectedRevision:0,files});
  const selected=selectStackiCandidateSource({checkpoint,scope,expectedRevision:1,expectedSha256:checkpoint.sha256,
    baseline,sourcePaths:project.files.map(file=>file.path),ownedImagePaths:[]});
  assert.match(selected.files.find(file=>file.path==='src/pages/index.astro')!.body.toString(),/Edited title/);
  assert.equal(selected.files.find(file=>file.path==='src/gnr8-lumos/brand-guide.json')!.body.toString(),
    project.files.find(file=>file.path==='src/gnr8-lumos/brand-guide.json')!.contents);
});


test('Lumos leaves signed native-contact markup unchanged',()=>{
 const form='<form data-gnr8-contact="v1"><p>Required consent text</p><input name="formVersion" value="signed-version"></form>';
 const result=createLumosSourceProposal({files:[{path:'src/pages/index.astro',role:'source',contents:'<html><body><h1>Title</h1>'+form+'</body></html>'}]},guide);
 assert.ok(result.files[0].contents.includes(form));
 assert.match(result.files[0].contents,/<LumosHeading/);
});
