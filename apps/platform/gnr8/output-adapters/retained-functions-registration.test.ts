import assert from 'node:assert/strict';
import test from 'node:test';
import { RETAINED_THEME_CONTROLS_SCRIPT } from '../../src/public-site/retained-theme-controls';
import { validateSelfContainedAstroProductionPayload as validate } from './astro-production-candidate-record';
const search='<form method="get" action="/" data-gnr8-search="v1"><input type="text" name="s"><input type="submit" value="Search"></form>';
const map='<iframe src="about:blank" data-gnr8-consent-map="https://www.google.com/maps/embed?pb=retained"></iframe>';
const controller=`<script data-gnr8-preview-runtime="retained-theme-controls">${RETAINED_THEME_CONTROLS_SCRIPT}</script>`;
const check=(body:string)=>validate({html:`<!doctype html><html><head></head><body>${body}</body></html>`,compiledTokenStyles:''});
test('retained search and consent-gated maps pass actual registration with the exact owned controller',()=>{
 check(search+map+controller);
});
test('markers alone cannot authorize forms, maps or changed controllers',()=>{
 for(const body of [search,map,search+controller.replace('const root=', 'const unexpected='),search.replace('action="/"','action="https://foreign.invalid/"')+controller,map.replace('www.google.com','foreign.invalid')+controller,map.replace('src="about:blank"','src="https://www.google.com/maps/embed"')+controller,search+search+controller,search.replace('<input type="submit"','<input formaction="https://foreign.invalid" type="submit"')+controller])assert.throws(()=>check(body));
});

test('retained document metadata cannot become an executable resource link',()=>{
 check('<link rel="alternate" type="application/rss+xml" href="https://example.com/feed/">');
 check('<link rel="shortcut icon" href="/api/gnr8/runtime/preview-assets/site/version/icon.png">');
 for(const markup of ['<link rel="alternate stylesheet" href="https://example.com/script.css">','<link rel="alternate" href="javascript:alert(1)">','<link rel="preload" as="script" href="https://example.com/script.js">','<link rel="icon" href="https://example.com/icon.png">'])assert.throws(()=>check(markup));
});
