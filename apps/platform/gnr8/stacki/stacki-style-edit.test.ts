import assert from 'node:assert/strict';
import test from 'node:test';
import {requireSupportedStackiStyleEdit as check} from './stacki-style-edit';
const selectors=new Set(['.container','.module','.navcontainer','.col','#hero']);
test('layout edits preserve ordered rules, existing assets, media conditions and legacy CSS',()=>{
 const before='.container{display:flex;width:100%;background-image:url(/owned.png)}@media(max-width:600px){.col{padding-left:15px;padding-right:15px;margin-top:0px}}';
 const after='.container{display:flex;width:80%;background-image:url(/owned.png);left:0;right:0;top:0}@media(max-width:600px){.col{padding-inline:15px;margin-top:0px;width:100%}}.module{max-width:40%;padding-top:10px;padding-bottom:0rem}.navcontainer{width:66.666%;top:0;bottom:0}';
 assert.doesNotThrow(()=>check(before,after,selectors));
});
test('CSS changes cannot introduce requests, executable expressions, selectors or dependency changes',()=>{
 const before='.container{display:flex;width:100%;background-image:url(/owned.png)}';
 for(const after of [
  before.replace('100%','url(https://attacker.invalid/x)'),before.replace('100%','expression(alert(1))'),
  before.replace('100%','var(--untrusted)'),before.replace('/owned.png','https://attacker.invalid/image'),
  before+'@import "https://attacker.invalid/css";',before+'@font-face{src:url(/other.woff)}',
  before.replace('.container','.container:hover'),
  before+'input[value^="secret"]{width:50%}',before+'.module{background:url(/other)}',
  before.replace('100%','100%!important'),
  before.replace('100%','1e999px'),before.replace('100%','calc(100% - 1px)'),
  before.replace('width:100%','behavior:url(/x.htc)'),
  before.replace('width:100%','--x:100%'),
 ])assert.throws(()=>check(before,after,selectors),/STYLE_CHANGE_UNSUPPORTED/);
 assert.throws(()=>check('@media(max-width:600px){.col{width:50%}}','@media(min-width:600px){.col{width:50%}}',selectors),/STYLE_CHANGE_UNSUPPORTED/);
});
test('untouched legacy CSS is retained, but duplicate fallback values cannot authorize new unsafe declarations',()=>{
 const before='.container{width:expression(old());padding:0}';
 assert.doesNotThrow(()=>check(before,before+'.module{width:50%}',selectors));
 assert.throws(()=>check(before,'.container{width:expression(old());width:expression(old());padding:0}',selectors),/STYLE_CHANGE_UNSUPPORTED/);
});

test('decimal-comma values are preserved with an explicit ignored-value warning, never normalized',()=>{
 assert.deepEqual(check('.navcontainer{width:100%}','.navcontainer{width:66,666%}',selectors),[{code:'ignored_decimal_comma',property:'width',value:'66,666%'}]);
});

test('new simple selectors without a matching element stay inert and are reported',()=>{
 assert.deepEqual(check('','.unknown{width:50%}',selectors),[{code:'unmatched_selector',selector:'.unknown'}]);
});
