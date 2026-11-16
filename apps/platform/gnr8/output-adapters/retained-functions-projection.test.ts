import assert from 'node:assert/strict';
import test from 'node:test';
import {parse,serialize} from 'parse5';
import {omitApprovedBackgroundImages,retainedSearchIndex} from './retained-function-projection';

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
