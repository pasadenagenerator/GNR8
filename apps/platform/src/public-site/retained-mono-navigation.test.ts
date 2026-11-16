import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreRetainedMonoNavigation} from './retained-mono-navigation';
import {parse} from 'parse5';
test('Mono disclosures retain destinations and flag identities without captured handlers',()=>{
 const html='<html><head></head><body><nav class="module nav" data-settings="verticalNav-md=true" aria-label="Navigacija"><ul><li><a href="/en">English</a></li><li><a href="#gallery">Gallery</a></li></ul></nav><div id="locale" class="module locale" data-req="locale"><ul><li class="active"><a href="/" onclick="untrusted()"><i class="localeIcon svg-si"></i><span>Slovenščina</span></a></li><li><a href="/it">Italiano</a></li></ul></div></body></html>';
 const result=restoreRetainedMonoNavigation(html);
 assert.match(result,/data-mono-mobile/);assert.match(result,/<details id="locale" data-gnr8-mono-locale>/);
 assert.match(result,/href="\/it">Italiano/);assert.match(result,/href="#gallery">Gallery/);
 assert.match(result,/class="localeIcon svg-si"/);assert.ok(!result.includes('untrusted()'));
 const elements=(node:any):any[]=>('childNodes' in node?node.childNodes:[]).flatMap((child:any)=>[child,...elements(child)]);
 const legacyTargets=elements(parse(result)).filter(node=>node.tagName==='nav'&&node.attrs.some((a:any)=>a.name==='class'&&a.value.split(/\s+/).includes('module')&&a.value.split(/\s+/).includes('nav')));
 assert.equal(legacyTargets.length,0,'Mono initializer must not own native navigation or hide desktop links after resizing');
 assert.equal(restoreRetainedMonoNavigation(result),result);
});
test('unrecognized nested navigation remains unchanged',()=>{
 const html='<nav class="module nav" data-settings="verticalNav-md=true"><ul><li><a href="/">Home</a><ul><li><a href="/nested">Nested</a></li></ul></li></ul></nav>';
 assert.equal(restoreRetainedMonoNavigation(html),html);
});
