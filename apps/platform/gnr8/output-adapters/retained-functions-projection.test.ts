import assert from 'node:assert/strict';
import test from 'node:test';
import {parse,serialize} from 'parse5';
import {omitApprovedBackgroundImages,retainedSearchIndex,projectRetainedFunctions} from './retained-function-projection';

test('consent metadata never moves captured head styles into the body on reparse',()=>{
 const document=parse('<html><head><script data-sck_unlock="profiling" data-blocked="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script><link rel="stylesheet" href="/reset.css"><style>body{font-family:Roboto}</style></head><body><div id="Top_bar"></div><script>var mfn = {};</script><div id="SCK"><button class="SCK_Accept"></button><button class="SCK_Close"></button><button class="SCK_Open"></button></div></body></html>');
 assert.deepEqual(projectRetainedFunctions(document),[]);
 const html=serialize(parse(serialize(document)));
 assert.match(html,/<head><link rel="stylesheet" href="\/reset.css"><style>body\{font-family:Roboto\}<\/style><\/head>/);
 assert.match(html,/<body>[\s\S]*<span hidden="" data-gnr8-consent-tag="G-ABC123"><\/span>/);
});

test('explicit missing-background decisions preserve nodes, other images, text and functions',()=>{
 const url='http://example.com/obsolete.jpg';
 const document=parse(`<!doctype html><html><head><style>.one{background-image:url('${url}'),url('/retained.jpg')}</style></head><body><div style="background:url(${url}) center / cover;min-height:40px"><h1>Keep this page</h1><form><input name="message"></form><img src="/retained.jpg"></div><div style="background-image:url('http://example.com/other.jpg')"></div></body></html>`);
 omitApprovedBackgroundImages(document,[url]);const html=serialize(document);
 assert.doesNotMatch(html,/obsolete.jpg/);assert.match(html,/background-image:none,url\('\/retained.jpg'\)/);
 assert.match(html,/min-height:40px/);assert.match(html,/<h1>Keep this page<\/h1>/);assert.match(html,/<form>/);assert.match(html,/other.jpg/);assert.match(html,/<img src="\/retained.jpg">/);
});
test('search index is literal data in Astro and decodes to the exact route content',()=>{
 const markup=retainedSearchIndex([{path:'/',title:'Home',bodyHtml:'<p>Some {text} &amp; words</p><script>doNotIndex()</script>'}]);
 assert.doesNotMatch(markup,/[{}]/);assert.doesNotMatch(markup,/doNotIndex/);
 assert.match(markup,/&#123;/);
});
