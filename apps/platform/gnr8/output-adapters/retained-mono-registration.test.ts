import assert from 'node:assert/strict';
import test from 'node:test';
import {parse,serialize} from 'parse5';
import {projectMonoControls} from './retained-mono-projection';
import {validateSelfContainedAstroProductionPayload} from './astro-production-candidate-record';

test('retained Wistia click-to-load output passes the actual production registration guard',()=>{
 const document=parse('<!DOCTYPE html><html><head></head><body><div><iframe src="about:blank" data-src-original="//fast.wistia.com/embed/iframe/wryeoslue5" width="560" height="315" allowfullscreen></iframe></div></body></html>');
 projectMonoControls(document,true,'https://www.pasadenagenerator.com/dodatno/navodila-v2');
 const html=serialize(document);
 assert.doesNotMatch(html,/<iframe\b/);
 assert.match(html,/data-gnr8-video-width="560"/);
 assert.match(html,/data-gnr8-video-height="315"/);
 assert.match(html,/data-gnr8-play-video/);
 assert.match(html,/https:\/\/fast.wistia.com\/embed\/iframe\/wryeoslue5/);
 validateSelfContainedAstroProductionPayload({html,compiledTokenStyles:''});
});
test('unrecognized embedded applications still fail registration',()=>{
 assert.throws(()=>validateSelfContainedAstroProductionPayload({html:'<!DOCTYPE html><html><head></head><body><iframe src="https://untrusted.example/"></iframe></body></html>',compiledTokenStyles:''}),/embedded application/);
});

test('owned video controller creates the frame only after a validated play click',async()=>{
 const {runInNewContext}=await import('node:vm');
 const {RETAINED_MONO_CONTROLS_SCRIPT}=await import('../../src/public-site/retained-mono-controls');
 let click:(event:unknown)=>void=()=>{};
 const created:Array<any>=[];
 const attrs:Record<string,string>={'data-gnr8-video-src':'https://fast.wistia.com/embed/iframe/wryeoslue5','data-gnr8-video-width':'560','data-gnr8-video-height':'315',title:'Video navodila'};
 const placeholder={getAttribute:(key:string)=>attrs[key],replaceWith:(node:unknown)=>{assert.equal(node,created[0]);}};
 const play={closest:()=>({querySelector:()=>placeholder}),setAttribute:()=>{}};
 class Element {closest(selector:string){return selector.includes('play-video')?play:null;}}
 runInNewContext(RETAINED_MONO_CONTROLS_SCRIPT,{Element,document:{addEventListener:(_type:string,handler:typeof click)=>{click=handler;},createElement:(tag:string)=>{const node={tag,attrs:{} as Record<string,string>,style:{cssText:''},setAttribute(key:string,value:string){this.attrs[key]=value;}};created.push(node);return node;}}});
 assert.equal(created.length,0);
 click({target:new Element()});assert.equal(created.length,1);assert.equal(created[0].tag,'iframe');assert.equal(created[0].attrs.width,'560');assert.equal(created[0].attrs.height,'315');assert.equal(created[0].attrs.src,attrs['data-gnr8-video-src']);
 attrs['data-gnr8-video-src']='https://untrusted.example/video';click({target:new Element()});assert.equal(created.length,1);
});
