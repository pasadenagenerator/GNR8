import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceRetainedGalleries, RETAINED_GALLERY_SCRIPT } from './retained-gallery';

const root='/api/gnr8/runtime/preview-assets/site/version/';
const paths=new Set(['uploads/first.webp','uploads/second.webp']);
const input=(extra='')=>`<!doctype html><html lang="sl"><body><h1>Boats</h1><div id="photos" class="module gallery" data-req="gallery,lightbox" data-settings="view=normal,imagecols=5,imagecols-md=4,imagecols-sm=3,margin=2"><div class="slides"><div class="slide"><ul class="pics">${[...paths].map((path,i)=>`<li><a href="${root}${path}"><span><img src="${root}${path}" alt="Boat ${i+1}"></span><span class="caption">Caption ${i+1}</span></a></li>`).join('')}${extra}</ul></div></div></div><p>Photo credit</p></body></html>`;
const enhance=(html:string)=>enhanceRetainedGalleries({html,siteId:'site',siteVersionId:'version',fileMapPaths:paths});

test('retained gallery preserves every image, caption, source order and responsive settings',()=>{
 const html=enhance(input());
 assert.equal((html.match(/data-gallery-image /g)||[]).length,2);
 assert.ok(html.indexOf('first.webp')<html.indexOf('second.webp'));
 for(const value of ['Boat 1','Boat 2','Caption 1','Caption 2','Photo credit','--gallery-cols:5','--gallery-cols-md:4','--gallery-cols-sm:3','data-close-label="Zapri"'])assert.ok(html.includes(value));
 assert.ok(html.includes(RETAINED_GALLERY_SCRIPT));
 assert.ok(!html.includes('data-req="gallery,lightbox"'));
 assert.equal(enhance(html),html);
});

test('unsupported media, missing assets and foreign versions remain intact',()=>{
 for(const html of [input('<li><video src="video.mp4"></video></li>'),input().replaceAll('uploads/first.webp','uploads/missing.webp'),input().replaceAll('/site/version/','/site/foreign/'),input().replace('view=normal','view=slider')])assert.equal(enhance(html),html);
});
