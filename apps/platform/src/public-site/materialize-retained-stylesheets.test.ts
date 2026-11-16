import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeRetainedStylesheets} from './materialize-retained-stylesheets';
test('retained loader stylesheet becomes a static link before its cascade target',()=>{
 const html=`<html><head><style id="style_site">body{color:green}</style><script>var l=document.createElement('link');l.rel='stylesheet';var h=document.getElementById('style_site');h.parentNode.insertBefore(l,h);l.href='/assets/user-style.css?123';</script></head><body>Preserved</body></html>`;
 const result=materializeRetainedStylesheets(html,new Set(['assets/user-style.css']));
 assert.ok(result.indexOf('<link')<result.indexOf('<style'));
 assert.match(result,/href="\/assets\/user-style.css\?123"/);
 assert.match(result,/Preserved/);
 assert.equal(materializeRetainedStylesheets(result,new Set(['assets/user-style.css'])),result);
 assert.equal(materializeRetainedStylesheets(html,new Set()),html);
});
