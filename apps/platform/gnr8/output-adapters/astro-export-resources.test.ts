import test from 'node:test';
import assert from 'node:assert/strict';
import policy from './lumos-reviewed-export.json';
import {exportMediaType,validateExportPath,validateExportSvg,validateReviewedDescriptors,validateReviewedExport,REVIEWED_LUMOS_SOURCE,maskReviewedText,digest} from './astro-export-resources';
const descriptors=()=>policy.files.map(f=>({...f,mediaType:exportMediaType(f.path)}));
test('reviewed descriptor set retains all paths, including aliases',()=>{
  const files=descriptors();validateReviewedDescriptors(files,REVIEWED_LUMOS_SOURCE);
  assert.equal(files.length,22);assert.equal(new Set(files.map(f=>f.path)).size,22);
  assert.ok(files.some((f,i)=>files.some((g,j)=>i!==j&&g.sha256===f.sha256)));
});
test('missing files, changed hashes/MIME/source, duplicate paths and traversal fail closed',()=>{
  for(const mutate of [(f:any[])=>f.pop(),(f:any[])=>f[0].sha256='0'.repeat(64),(f:any[])=>f[0].mediaType='text/html',(f:any[])=>f[0].path='../escape.svg',(f:any[])=>f[0]=f[1]]) {
    const files=descriptors();mutate(files);assert.throws(()=>validateReviewedDescriptors(files,REVIEWED_LUMOS_SOURCE));
  }
  assert.throws(()=>validateReviewedDescriptors(descriptors(),'not-a-source-hash'));
  assert.throws(()=>validateReviewedExport(descriptors().map(f=>({...f,base64:'YWJj'})),REVIEWED_LUMOS_SOURCE));
});
test('SVG executable content and external references are rejected',()=>{
  validateExportSvg('<svg><path d="M0 0"/></svg>');
  for(const svg of ['<svg><script>alert(1)</script></svg>','<svg onload="alert(1)"/>','<svg><foreignObject><p>html</p></foreignObject></svg>','<!DOCTYPE svg><svg/>','<svg><path fill="url(https://evil.invalid)"/></svg>'])assert.throws(()=>validateExportSvg(svg));
});
test('resource paths reject ambiguous or encoded traversal',()=>{
  for(const path of ['../x','/x','x//y','x/./y','x/%2e%2e/y','x\\y','x?y','#x',''])assert.throws(()=>validateExportPath(path));
});

test('text-only shape keeps executable source, expressions, attributes and styles immutable',()=>{
 const source='---\nimport Heading from "./Heading.astro";\n---\n<Heading>Hello</Heading><script>const x="Hello";</script>';
 const signature=(s:string)=>digest(maskReviewedText(s,true));
 assert.equal(signature(source),signature(source.replace('>Hello<','>New heading<')));
 for(const changed of [source.replace('./Heading.astro','./Other.astro'),source.replace('const x="Hello"','fetch("/secret")'),source.replace('>Hello<','>{process.env.SECRET}<'),source.replace('<Heading>','<Heading onclick="run()">'),source+'<style>body{display:none}</style>'])assert.notEqual(signature(source),signature(changed));
});
test('new source descriptors may change HTML bytes only, never CSS or assets',()=>{
 const files=descriptors();const html=files.find(f=>f.path==='index.html')!;html.sha256='1'.repeat(64);html.sizeBytes+=10;
 validateReviewedDescriptors(files,'2'.repeat(64));
 assert.throws(()=>validateReviewedDescriptors(files,REVIEWED_LUMOS_SOURCE));
 const css=files.find(f=>f.path.endsWith('.css'))!;css.sha256='3'.repeat(64);
 assert.throws(()=>validateReviewedDescriptors(files,'2'.repeat(64)));
});
